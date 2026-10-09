// lib/catalog/engines.ts
//
// Job construction for the shared operation catalog. The old /op and /yt pages
// each carried their own translate module; this is the single place that turns
// an operation + params (+ the previous step's object) into something runnable.
//
// Two engines:
//   • ffmpeg — one or more argument passes for a single operation
//   • ytdlp  — a merged options blob for the python yt-dlp bridge
//
// Pure string/number work only: no `server-only`, no Node builtins, so the
// client can type-check against the same shapes the runner uses.

import type { MediaKind } from "./types";
import { getOperation, type FormValues } from "./operations";

/* ------------------------------- shared util ------------------------------ */

const s = (v: unknown, d = ""): string => (v == null ? d : String(v));
const n = (v: unknown, d = 0): number => {
  const x = Number(v);
  return Number.isFinite(x) ? x : d;
};
const b = (v: unknown): boolean => v === true || v === "true" || v === "on";
const arr = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);

function parseTime(input: string): number {
  const str = input.trim().replace(/^\*/, "");
  if (!str) return 0;
  if (str.includes(":")) {
    const parts = str.split(":").map((p) => parseFloat(p));
    if (parts.some(Number.isNaN)) return 0;
    return parts.reduce((acc, x) => acc * 60 + x, 0);
  }
  const v = parseFloat(str);
  return Number.isNaN(v) ? 0 : v;
}

function parseSection(section: string): [number, number] | null {
  const m = section.match(/^\*?\s*([\d:.]+)\s*-\s*([\d:.]+)\s*$/);
  if (!m) return null;
  const start = parseTime(m[1]);
  const end = parseTime(m[2]);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  return [start, end];
}

function sanitizeBase(name: string): string {
  const base = name.replace(/\.[^.]+$/, "");
  return base.replace(/[^\w.\- ]+/g, "_").slice(0, 100) || "output";
}

/** atempo only accepts 0.5–2.0, so chain for larger/smaller factors. */
function buildAtempo(factor: number): string {
  const parts: string[] = [];
  let f = factor;
  while (f > 2) {
    parts.push("atempo=2.0");
    f /= 2;
  }
  while (f < 0.5) {
    parts.push("atempo=0.5");
    f /= 0.5;
  }
  parts.push(`atempo=${f.toFixed(4)}`);
  return parts.join(",");
}

/* --------------------------------- ffmpeg --------------------------------- */

export type FfmpegPass = { name: string; args: string[] };

export type FfmpegStep = {
  engine: "ffmpeg";
  /** Absolute path the final pass writes to. */
  outputPath: string;
  /** Basename of the output, for the catalog record. */
  outputName: string;
  /** Lowercase file extension chosen for the output. */
  ext: string;
  passes: FfmpegPass[];
};

const VIDEO_EXT: Record<string, string> = {
  mp4: "mp4",
  mkv: "mkv",
  webm: "webm",
  mov: "mov",
};

const AUDIO_CODEC: Record<string, string> = {
  mp3: "libmp3lame",
  aac: "aac",
  wav: "pcm_s16le",
  flac: "flac",
  opus: "libopus",
};

/**
 * Build the ffmpeg invocation(s) for a single operation step.
 *
 * `inputPath` is the staged path to the previous step's object (or the source
 * object). `outBase` is a filename stem the runner guarantees is unique within
 * the job, so intermediate objects never collide.
 */
export function buildFfmpegStep(
  opId: string,
  params: FormValues,
  input: { path: string; kind: MediaKind; name: string },
  outBase: string
): FfmpegStep {
  const p = params ?? {};
  const vf: string[] = [];
  const af: string[] = [];
  const inArgs: string[] = []; // before -i
  const outArgs: string[] = []; // after filters/codecs, before output
  const pre: FfmpegPass[] = [];
  let vCodec: string | null = null;
  let aCodec: string | null = null;
  let crf: number | null = null;
  let preset: string | null = null;
  let ext =
    input.kind === "audio" ? "m4a" : input.kind === "image" ? "png" : "mp4";

  switch (opId) {
    case "convert": {
      const fmt = s(p.format, "mp4");
      ext = fmt;
      const vc = s(p.videoCodec, "libx264").trim();
      const ac = s(p.audioCodec, "aac").trim();
      vCodec = vc || null;
      aCodec = ac || null;
      if (vc === "libx264" || vc === "libx265") crf = 23;
      break;
    }
    case "trim": {
      const start = s(p.start, "").trim();
      const end = s(p.end, "").trim();
      if (start) inArgs.push("-ss", String(parseTime(start)));
      if (end) inArgs.push("-to", String(parseTime(end)));
      if (s(p.mode, "reencode") === "copy") {
        vCodec = "copy";
        aCodec = "copy";
      }
      ext = extensionOf(input.name) || ext;
      break;
    }
    case "extract-audio": {
      const fmt = s(p.format, "mp3");
      ext = fmt;
      aCodec = AUDIO_CODEC[fmt] ?? fmt;
      vCodec = null;
      outArgs.push("-vn");
      if (s(p.bitrate)) outArgs.push("-b:a", s(p.bitrate));
      break;
    }
    case "video-only": {
      aCodec = null;
      outArgs.push("-an");
      ext = extensionOf(input.name) || ext;
      break;
    }
    case "to-gif": {
      ext = "gif";
      const start = parseTime(s(p.start, "0"));
      const dur = n(p.duration, 3);
      const fps = n(p.fps, 12);
      const w = n(p.width, 480);
      if (start > 0) inArgs.push("-ss", String(start));
      inArgs.push("-t", String(dur));
      vf.push(`fps=${fps}`, `scale=${w}:-1:flags=lanczos`);
      vCodec = null;
      aCodec = null;
      outArgs.push("-an");
      break;
    }
    case "thumbnail": {
      ext = s(p.format, "jpg");
      inArgs.push("-ss", String(parseTime(s(p.at, "5"))), "-frames:v", "1");
      vCodec = null;
      aCodec = null;
      outArgs.push("-an");
      break;
    }
    case "scale": {
      const w = n(p.width, 1280);
      const h = n(p.height, 720);
      const scaler = s(p.scaler, "lanczos");
      if (b(p.preserveAspect ?? true)) vf.push(`scale=${w}:-2:flags=${scaler}`);
      else vf.push(`scale=${w}:${h}:flags=${scaler}`);
      ext = extensionOf(input.name) || ext;
      break;
    }
    case "fps": {
      vf.push(`fps=${n(p.fps, 30)}`);
      ext = extensionOf(input.name) || ext;
      break;
    }
    case "crop": {
      vf.push(`crop=${n(p.w, 1280)}:${n(p.h, 720)}:${n(p.x, 0)}:${n(p.y, 0)}`);
      ext = extensionOf(input.name) || ext;
      break;
    }
    case "rotate": {
      const map: Record<string, string> = {
        "90cw": "transpose=1",
        "90ccw": "transpose=2",
        "180": "transpose=2,transpose=2",
        hflip: "hflip",
        vflip: "vflip",
      };
      const f = map[s(p.dir, "90cw")];
      if (f) vf.push(f);
      ext = extensionOf(input.name) || ext;
      break;
    }
    case "pad": {
      vf.push(
        `pad=${n(p.w, 1920)}:${n(p.h, 1080)}:${n(p.x, 0)}:${n(p.y, 0)}:${s(p.color, "black")}`
      );
      ext = extensionOf(input.name) || ext;
      break;
    }
    case "speed": {
      const factor = n(p.factor, 1);
      if (factor !== 1) {
        vf.push(`setpts=${(1 / factor).toFixed(6)}*PTS`);
        if (b(p.keepPitch ?? true)) af.push(buildAtempo(factor));
        else af.push(`asetrate=48000*${factor},aresample=48000`);
      }
      ext = extensionOf(input.name) || ext;
      break;
    }
    case "denoise": {
      const strength = s(p.strength, "medium");
      const luma =
        strength === "light" ? "2:1:2:1" : strength === "strong" ? "8:5:8:5" : "4:3:4:3";
      vf.push(`hqdn3d=${luma}`);
      ext = extensionOf(input.name) || ext;
      break;
    }
    case "sharpen": {
      vf.push(`unsharp=${n(p.amount, 1)}:${n(p.size, 5)}`);
      ext = extensionOf(input.name) || ext;
      break;
    }
    case "blur": {
      const radius = n(p.radius, 5);
      const type = s(p.type, "gblur");
      if (type === "boxblur") vf.push(`boxblur=${radius}:1`);
      else if (type === "bilateral") vf.push(`bilateral=sigmaS=${radius}`);
      else vf.push(`gblur=sigma=${radius}`);
      ext = extensionOf(input.name) || ext;
      break;
    }
    case "chromakey": {
      const color = s(p.color, "#00FF00").replace("#", "0x");
      vf.push(`chromakey=${color}:${n(p.similarity, 0.3)}:${n(p.blend, 0.1)}`);
      ext = "mov";
      break;
    }
    case "hdr-to-sdr": {
      const algo = s(p.algo, "hable");
      vf.push(
        `zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=tonemap=${algo}:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p`
      );
      break;
    }
    case "volume": {
      af.push(`volume=${n(p.gain, 0)}dB`);
      ext = extensionOf(input.name) || ext;
      break;
    }
    case "loudnorm": {
      af.push(
        `loudnorm=I=${s(p.target, "-16")}:TP=${n(p.truePeak, -2)}:LRA=${n(p.lra, 7)}`
      );
      ext = extensionOf(input.name) || ext;
      break;
    }
    case "compressor": {
      af.push(
        `acompressor=threshold=${n(p.threshold, -20)}dB:ratio=${n(p.ratio, 2)}:attack=${n(p.attack, 20)}:release=${n(p.release, 250)}`
      );
      ext = extensionOf(input.name) || ext;
      break;
    }
    case "eq": {
      af.push(
        `equalizer=f=${n(p.freq, 1000)}:t=q:w=${n(p.q, 1)}:g=${n(p.gain, 0)}`
      );
      ext = extensionOf(input.name) || ext;
      break;
    }
    case "noise-reduce": {
      af.push(`afftdn=nr=${n(p.reduction, 12)}`);
      ext = extensionOf(input.name) || ext;
      break;
    }
    case "youtube-preset": {
      const heightMap: Record<string, number> = {
        "720p": 720,
        "1080p": 1080,
        "1440p": 1440,
        "4k": 2160,
      };
      vf.push(`scale=-2:${heightMap[s(p.resolution, "1080p")] ?? 1080}`);
      vCodec = "libx264";
      aCodec = "aac";
      crf = n(p.crf, 18);
      preset = "medium";
      ext = "mp4";
      outArgs.push("-b:a", s(p.audioBitrate, "192k"), "-movflags", "+faststart");
      break;
    }
    case "social-vertical": {
      vf.push("crop=ih*9/16:ih", "scale=1080:1920");
      af.push("loudnorm=I=-16:TP=-2:LRA=7");
      vCodec = "libx264";
      aCodec = "aac";
      crf = 20;
      ext = "mp4";
      outArgs.push("-movflags", "+faststart");
      break;
    }
    case "web-optimized": {
      vf.push("scale=-2:720");
      vCodec = "libx264";
      aCodec = "aac";
      crf = n(p.crf, 23);
      preset = "fast";
      ext = "mp4";
      outArgs.push("-movflags", "+faststart");
      break;
    }
    case "stabilize": {
      const trf = `${outBase}.trf`;
      pre.push({
        name: "stabilize detect",
        args: [
          "-i",
          input.path,
          "-vf",
          `vidstabdetect=shakiness=${n(p.shakiness, 5)}:result=${trf}`,
          "-f",
          "null",
          "-",
        ],
      });
      vf.push(
        `vidstabtransform=input=${trf}:smoothing=${n(p.smoothing, 10)}:zoom=0`
      );
      ext = extensionOf(input.name) || ext;
      break;
    }
    case "subtitle-extract": {
      ext = s(p.format, "srt");
      vCodec = null;
      aCodec = null;
      outArgs.push("-map", "0:s:0");
      break;
    }
    case "bitstream-filter": {
      outArgs.push("-bsf:v", s(p.filter, "h264_mp4toannexb"));
      ext = extensionOf(input.name) || ext;
      break;
    }
    case "metadata": {
      if (s(p.title)) outArgs.push("-metadata", `title=${s(p.title)}`);
      if (s(p.artist)) outArgs.push("-metadata", `artist=${s(p.artist)}`);
      if (s(p.language)) outArgs.push("-metadata", `language=${s(p.language)}`);
      ext = extensionOf(input.name) || ext;
      break;
    }
    default:
      // Unknown / not an ffmpeg operation: copy through unchanged.
      outArgs.push("-c", "copy");
      ext = extensionOf(input.name) || ext;
      break;
  }

  const outputPath = `${outBase}.${ext}`;
  const outputName = outputPath.split(/[\\/]/).pop() ?? outputPath;
  const args: string[] = ["-i", input.path];
  args.push(...inArgs);
  if (vf.length) args.push("-vf", vf.join(","));
  if (af.length) args.push("-af", af.join(","));
  if (vCodec) args.push("-c:v", vCodec);
  if (aCodec) args.push("-c:a", aCodec);
  if (crf !== null) args.push("-crf", String(crf));
  if (preset) args.push("-preset", preset);
  args.push(...outArgs, outputPath);

  return {
    engine: "ffmpeg",
    outputPath,
    outputName,
    ext,
    passes: [...pre, { name: opId, args }],
  };
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
}

/* --------------------------------- ytdlp ---------------------------------- */

export type YtdlpOptions = {
  url: string;
  mode: "video" | "audio";
  height?: number;
  container?: string;
  formatSelector?: string;
  maxFilesize?: string;
  audioFormat?: string;
  audioQuality?: string;
  outputTemplate?: string;
  restrictFilenames?: boolean;
  downloadArchive?: string;
  rateLimit?: string;
  concurrentFragments?: number;
  proxy?: string;
  cookieBrowser?: string;
  cookieProfile?: string;
  cookieFile?: string;
  subsOn?: boolean;
  subLangs?: string[];
  embedSubs?: boolean;
  embedThumb?: boolean;
  embedMeta?: boolean;
  saveChapters?: boolean;
  writeThumbnail?: boolean;
  writeInfoJson?: boolean;
  writeComments?: boolean;
  clipOn?: boolean;
  clipStart?: number;
  clipEnd?: number;
  sponsorblockRemoveCategories?: string[];
};

/**
 * Fold every ytdlp operation in a contiguous group into one options blob,
 * processed in order. Later ops override scalar fields; list fields accumulate.
 */
export function buildYtdlpOptions(
  entries: { id: string; params: FormValues }[]
): YtdlpOptions {
  const out: Partial<YtdlpOptions> = { mode: "video" };

  const setMode = (m: "video" | "audio") => {
    out.mode = m;
  };

  for (const entry of entries) {
    const p = entry.params ?? {};
    switch (entry.id) {
      case "quick-best":
        setMode("video");
        break;
      case "audio-mp3":
        setMode("audio");
        out.audioFormat = "mp3";
        out.audioQuality = s(p.quality, "0");
        break;
      case "audio-m4a":
        setMode("audio");
        out.audioFormat = "m4a";
        break;
      case "video-mp4":
        setMode("video");
        out.container = "mp4";
        break;
      case "video-webm":
        setMode("video");
        out.container = "webm";
        break;
      case "custom-format":
        out.formatSelector = s(p.format).trim() || undefined;
        break;
      case "resolution-cap": {
        const h = Number(p.maxHeight);
        if (Number.isFinite(h) && h > 0) out.height = h;
        break;
      }
      case "section-download": {
        const range = parseSection(s(p.section).trim());
        if (range) {
          out.clipOn = true;
          out.clipStart = range[0];
          out.clipEnd = range[1];
        }
        break;
      }
      case "output-template":
        if (s(p.template).trim()) out.outputTemplate = s(p.template).trim();
        out.restrictFilenames = b(p.restrict);
        break;
      case "cookies-browser":
        out.cookieBrowser = s(p.browser, "chrome");
        break;
      case "cookies-file":
        out.cookieFile = s(p.cookieFile).trim() || undefined;
        break;
      case "proxy-config":
        out.proxy = s(p.proxy).trim() || undefined;
        break;
      case "subscribe-download": {
        out.subsOn = true;
        const langs = s(p.langs, "en")
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean);
        if (langs.length) out.subLangs = langs;
        break;
      }
      case "embed-thumbnail":
        out.embedThumb = true;
        out.writeThumbnail = true;
        break;
      case "embed-metadata":
        out.embedMeta = true;
        out.saveChapters = b(p.chapters);
        break;
      case "sponsorblock-remove": {
        const cats = arr(p.categories);
        if (cats.length) {
          out.sponsorblockRemoveCategories = [
            ...(out.sponsorblockRemoveCategories ?? []),
            ...cats,
          ];
        }
        break;
      }
      case "rate-limit": {
        const r = s(p.rate).trim();
        if (r) out.rateLimit = r;
        const c = Number(p.concurrent);
        if (Number.isFinite(c) && c > 0) out.concurrentFragments = c;
        break;
      }
      case "download-archive":
        out.downloadArchive = s(p.archiveFile, "archive.txt");
        break;
      case "info-json":
        out.writeInfoJson = true;
        out.writeComments = b(p.comments);
        break;
      case "music-pipeline":
        setMode("audio");
        out.audioFormat = "mp3";
        out.audioQuality = s(p.quality, "320K");
        out.embedThumb = true;
        out.embedMeta = true;
        out.saveChapters = true;
        break;
      case "archive-pipeline":
        setMode("video");
        out.subsOn = true;
        out.subLangs = [s(p.subLangs, "en")];
        out.writeThumbnail = true;
        out.writeInfoJson = true;
        out.downloadArchive = "archive.txt";
        break;
      case "social-clip":
        setMode("video");
        out.height = 1080;
        out.subsOn = true;
        out.subLangs = [s(p.subLangs, "en")];
        out.embedSubs = true;
        break;
      default:
        // A selector/modifier we don't recognize is skipped rather than
        // failing the whole job.
        break;
    }
  }

  return { url: "", ...out, mode: out.mode ?? "video" } as YtdlpOptions;
}

/* ------------------------------- dispatch --------------------------------- */

export type StepJob =
  | FfmpegStep
  | { engine: "ytdlp"; options: YtdlpOptions };

/**
 * Turn one object-consuming step into a runnable job. URL-consuming steps are
 * merged separately (see buildYtdlpOptions) because several download options
 * fold into a single invocation.
 */
export function buildObjectStep(
  opId: string,
  params: FormValues,
  input: { path: string; kind: MediaKind; name: string },
  outBase: string
): StepJob {
  const op = getOperation(opId);
  if (op?.engine === "ffmpeg") {
    return buildFfmpegStep(opId, params, input, outBase);
  }
  const outputPath = `${outBase}.mp4`;
  return {
    engine: "ffmpeg",
    outputPath,
    outputName: outputPath.split(/[\\/]/).pop() ?? outputPath,
    ext: "mp4",
    passes: [],
  };
}

export { sanitizeBase };
