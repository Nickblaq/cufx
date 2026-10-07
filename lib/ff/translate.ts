// lib/ff/translate.ts
import "server-only";

export type OperationPayload = { id: string; params: Record<string, unknown> };

export type ResolvedInput = {
  role: string;
  path: string;
  kind: "video" | "audio" | "image";
  name: string;
};

export type FfmpegPass = { name: string; args: string[] };

export type TranslatedJob = {
  passes: FfmpegPass[];
  outputName: string;
};

/* --------------------------------- helpers -------------------------------- */

const s = (v: unknown, d = "") => (v == null ? d : String(v));
const n = (v: unknown, d = 0) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : d;
};
const b = (v: unknown) => v === true || v === "true" || v === "on";
const arr = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);

function parseTime(input: string): number {
  const str = input.trim();
  if (!str) return 0;
  if (str.includes(":")) {
    const parts = str.split(":").map((p) => parseFloat(p));
    if (parts.some(Number.isNaN)) return 0;
    return parts.reduce((acc, x) => acc * 60 + x, 0);
  }
  const v = parseFloat(str);
  return Number.isNaN(v) ? 0 : v;
}

function sanitizeBase(name: string): string {
  const base = name.replace(/\.[^.]+$/, "");
  return base.replace(/[^\w.\- ]+/g, "_").slice(0, 120) || "output";
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

/* ------------------------------ accumulator ------------------------------- */

type State = {
  vf: string[];              // video filters (-vf)
  af: string[];              // audio filters (-af)
  inArgs: string[];          // args before -i (input-level, e.g. -ss)
  extraInputs: string[];     // additional -i entries
  outArgs: string[];         // args before output file
  vCodec: string | null;
  aCodec: string | null;
  crf: number | null;
  preset: string | null;
  ext: string;
  pass2: FfmpegPass[];       // operations that require a follow-up pass (stabilize)
  subtitleInput: string | null;
  outputNameHint: string | null;
};

function newState(): State {
  return {
    vf: [],
    af: [],
    inArgs: [],
    extraInputs: [],
    outArgs: [],
    vCodec: null,
    aCodec: null,
    crf: null,
    preset: null,
    ext: "",
    pass2: [],
    subtitleInput: null,
    outputNameHint: null,
  };
}

/* ---------------------------- op translation ------------------------------ */

function applyOperation(
  st: State,
  op: OperationPayload,
  input: ResolvedInput,
  outputDir: string
): void {
  const p = op.params ?? {};

  switch (op.id) {
    /* ── Tier 1 ─────────────────────────────────────────────────────── */

    case "convert": {
      const fmt = s(p.format, "mp4");
      st.ext = fmt;
      const vc = s(p.videoCodec, "libx264").trim();
      const ac = s(p.audioCodec, "aac").trim();
      st.vCodec = vc || null;
      st.aCodec = ac || null;
      if (vc === "libx264" || vc === "libx265") st.crf = 23;
      break;
    }

    case "trim": {
      const start = s(p.start, "").trim();
      const end = s(p.end, "").trim();
      const mode = s(p.mode, "reencode");
      if (start) st.inArgs.push("-ss", String(parseTime(start)));
      if (end) st.inArgs.push("-to", String(parseTime(end)));
      if (mode === "copy") {
        st.vCodec = "copy";
        st.aCodec = "copy";
      }
      break;
    }

    case "extract-audio": {
      const fmt = s(p.format, "mp3");
      st.ext = fmt;
      st.vCodec = null;
      st.aCodec =
        fmt === "aac" ? "aac" :
        fmt === "opus" ? "libopus" :
        fmt === "mp3" ? "libmp3lame" :
        fmt;
      if (s(p.bitrate)) st.outArgs.push("-b:a", s(p.bitrate));
      st.outArgs.push("-vn");
      break;
    }

    case "video-only": {
      st.aCodec = null;
      st.outArgs.push("-an");
      break;
    }

    case "to-gif": {
      st.ext = "gif";
      const start = parseTime(s(p.start, "0"));
      const dur = n(p.duration, 3);
      const fps = n(p.fps, 12);
      const w = n(p.width, 480);
      if (start > 0) st.inArgs.push("-ss", String(start));
      st.inArgs.push("-t", String(dur));
      st.vf.push(`fps=${fps}`, `scale=${w}:-1:flags=lanczos`);
      // split into two passes for a proper palette — do a simple single pass here
      st.vCodec = null;
      st.aCodec = null;
      st.outArgs.push("-an");
      break;
    }

    case "thumbnail": {
      const at = parseTime(s(p.at, "5"));
      const fmt = s(p.format, "jpg");
      st.ext = fmt;
      st.inArgs.push("-ss", String(at), "-frames:v", "1");
      st.vCodec = null;
      st.aCodec = null;
      st.outArgs.push("-an");
      break;
    }

    case "concat": {
      // Multi-input not yet supported by the UI; treat as a passthrough
      // re-encode so the pipeline doesn't fail.
      const mode = s(p.mode, "reencode");
      if (mode === "copy") {
        st.vCodec = "copy";
        st.aCodec = "copy";
      }
      break;
    }

    case "inspect": {
      // No-op — analysis only. The output is a re-encoded copy.
      break;
    }

    /* ── Tier 2 ─────────────────────────────────────────────────────── */

    case "scale": {
      const w = n(p.width, 1280);
      const h = n(p.height, 720);
      const scaler = s(p.scaler, "lanczos");
      const preserve = b(p.preserveAspect ?? true);
      // if preserving, use -1 on the axis the user didn't lock; simpler: keep both
      st.vf.push(`scale=${w}:${preserve ? -1 : h}:flags=${scaler}`);
      break;
    }

    case "fps": {
      st.vf.push(`fps=${n(p.fps, 30)}`);
      break;
    }

    case "crop": {
      const w = n(p.w, 1280);
      const h = n(p.h, 720);
      const x = n(p.x, 0);
      const y = n(p.y, 0);
      st.vf.push(`crop=${w}:${h}:${x}:${y}`);
      break;
    }

    case "rotate": {
      const dir = s(p.dir, "90cw");
      const map: Record<string, string> = {
        "90cw": "transpose=1",
        "90ccw": "transpose=2",
        "180": "transpose=2,transpose=2",
        hflip: "hflip",
        vflip: "vflip",
      };
      const f = map[dir];
      if (f) st.vf.push(f);
      break;
    }

    case "pad": {
      const w = n(p.w, 1920);
      const h = n(p.h, 1080);
      const x = n(p.x, 0);
      const y = n(p.y, 0);
      const color = s(p.color, "black");
      st.vf.push(`pad=${w}:${h}:${x}:${y}:${color}`);
      break;
    }

    case "volume": {
      const gain = n(p.gain, 0);
      st.af.push(`volume=${gain}dB`);
      break;
    }

    case "metadata": {
      const title = s(p.title);
      const artist = s(p.artist);
      const lang = s(p.language);
      if (title) st.outArgs.push("-metadata", `title=${title}`);
      if (artist) st.outArgs.push("-metadata", `artist=${artist}`);
      if (lang) st.outArgs.push("-metadata", `language=${lang}`);
      break;
    }

    case "speed": {
      const factor = n(p.factor, 1);
      if (factor === 1) break;
      const keepPitch = b(p.keepPitch ?? true);
      st.vf.push(`setpts=${(1 / factor).toFixed(6)}*PTS`);
      if (keepPitch) {
        st.af.push(buildAtempo(factor));
      } else {
        // Not preserving pitch: resample rate to shift pitch with the speed.
        st.af.push(`asetrate=48000*${factor},aresample=48000`);
      }
      break;
    }

    /* ── Tier 3 ─────────────────────────────────────────────────────── */

    case "denoise": {
      const strength = s(p.strength, "medium");
      const algo = s(p.algo, "hqdn3d");
      if (algo === "hqdn3d") {
        const luma = strength === "light" ? "2:1:2:1" : strength === "strong" ? "8:5:8:5" : "4:3:4:3";
        st.vf.push(`hqdn3d=${luma}`);
      } else if (algo === "nlmeans") {
        st.vf.push(`nlmeans=s=${strength === "strong" ? 8 : strength === "light" ? 3 : 5}`);
      } else {
        // bm3d is not a standard ffmpeg filter; fall back to nlmeans
        st.vf.push("nlmeans=s=5");
      }
      break;
    }

    case "sharpen": {
      const amount = n(p.amount, 1);
      const size = n(p.size, 5);
      st.vf.push(`unsharp=${amount}:${size}`);
      break;
    }

    case "blur": {
      const radius = n(p.radius, 5);
      const type = s(p.type, "gblur");
      if (type === "boxblur") st.vf.push(`boxblur=${radius}:1`);
      else if (type === "bilateral") st.vf.push(`bilateral=sigmaS=${radius}`);
      else st.vf.push(`gblur=sigma=${radius}`);
      break;
    }

    case "chromakey": {
      const color = s(p.color, "#00FF00").replace("#", "0x");
      const sim = n(p.similarity, 0.3);
      const blend = n(p.blend, 0.1);
      st.vf.push(`chromakey=${color}:${sim}:${blend}`);
      break;
    }

    case "overlay": {
      // Overlay requires a second input; without one we no-op so the
      // pipeline doesn't crash.
      break;
    }

    case "hdr-to-sdr": {
      const algo = s(p.algo, "hable");
      const peak = n(p.peak, 100);
      st.vf.push(
        `zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=tonemap=${algo}:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p`
      );
      void peak;
      break;
    }

    /* ── Tier 4 ─────────────────────────────────────────────────────── */

    case "loudnorm": {
      const target = s(p.target, "-16");
      const tp = n(p.truePeak, -2);
      const lra = n(p.lra, 7);
      st.af.push(`loudnorm=I=${target}:TP=${tp}:LRA=${lra}`);
      break;
    }

    case "compressor": {
      const th = n(p.threshold, -20);
      const ratio = n(p.ratio, 2);
      const att = n(p.attack, 20);
      const rel = n(p.release, 250);
      st.af.push(`acompressor=threshold=${th}dB:ratio=${ratio}:attack=${att}:release=${rel}`);
      break;
    }

    case "eq": {
      const freq = n(p.freq, 1000);
      const gain = n(p.gain, 0);
      const q = n(p.q, 1);
      st.af.push(`equalizer=f=${freq}:t=q:w=${q}:g=${gain}`);
      break;
    }

    case "noise-reduce": {
      const reduction = n(p.reduction, 12);
      st.af.push(`afftdn=nr=${reduction}`);
      break;
    }

    case "de-ess": {
      const intensity = n(p.intensity, 0.5);
      st.af.push(`deesser=i=${intensity}`);
      break;
    }

    /* ── Tier 5 ─────────────────────────────────────────────────────── */

    case "youtube-preset": {
      const res = s(p.resolution, "1080p");
      const heightMap: Record<string, number> = {
        "720p": 720, "1080p": 1080, "1440p": 1440, "4k": 2160,
      };
      st.vf.push(`scale=-2:${heightMap[res] ?? 1080}`);
      st.vCodec = "libx264";
      st.aCodec = "aac";
      st.crf = n(p.crf, 18);
      st.preset = "medium";
      st.ext = "mp4";
      st.outArgs.push("-b:a", s(p.audioBitrate, "192k"));
      st.outArgs.push("-movflags", "+faststart");
      break;
    }

    case "social-vertical": {
      st.vf.push("crop=ih*9/16:ih", "scale=1080:1920");
      st.af.push("loudnorm=I=-16:TP=-2:LRA=7");
      st.ext = "mp4";
      break;
    }

    case "web-optimized": {
      st.vf.push("scale=-2:720");
      st.vCodec = "libx264";
      st.aCodec = "aac";
      st.crf = n(p.crf, 23);
      st.preset = "fast";
      st.ext = "mp4";
      st.outArgs.push("-movflags", "+faststart");
      break;
    }

    case "stabilize": {
      const shakiness = n(p.shakiness, 5);
      const smoothing = n(p.smoothing, 10);
      const zoom = n(p.zoom, 0);
      const trfPath = `${outputDir}/stabilize.trf`;

      // Pass 1: detect
      st.pass2.push({
        name: "stabilize detect",
        args: [
          "-i", input.path,
          "-vf", `vidstabdetect=shakiness=${shakiness}:result=${trfPath}`,
          "-f", "null", "-",
        ],
      });
      // Pass 2 is the current pass; use the trf file as filter
      st.vf.push(`vidstabtransform=input=${trfPath}:smoothing=${smoothing}:zoom=${zoom}`);
      break;
    }

    /* ── Tier 6 ─────────────────────────────────────────────────────── */

    case "subtitle-embed": {
      // Requires a subtitle file — no-op if not provided.
      break;
    }

    case "hardsub": {
      // Requires a subtitle file — no-op if not provided.
      break;
    }

    case "subtitle-extract": {
      const fmt = s(p.format, "srt");
      st.ext = fmt;
      st.vCodec = null;
      st.aCodec = null;
      st.outArgs.push("-map", "0:s:0");
      break;
    }

    case "bitstream-filter": {
      const f = s(p.filter, "h264_mp4toannexb");
      st.outArgs.push("-bsf:v", f);
      break;
    }

    default:
      // Unknown op — skip silently.
      break;
  }
}

/* --------------------------------- public -------------------------------- */

export function translateOperations(
  input: ResolvedInput,
  operations: OperationPayload[],
  outputDir: string
): TranslatedJob {
  const st = newState();

  for (const op of operations) {
    applyOperation(st, op, input, outputDir);
  }

  // Choose a sensible output extension if none was set.
  if (!st.ext) {
    if (input.kind === "audio") st.ext = "mp3";
    else if (input.kind === "image") st.ext = "png";
    else st.ext = "mp4";
  }

  const base = sanitizeBase(input.name);
  const outputName = `${base}.${st.ext}`;
  const outputPath = `${outputDir}/${outputName}`;

  // ---- final (production) pass ----
  const finalArgs: string[] = ["-i", input.path];
  for (const extra of st.extraInputs) finalArgs.push("-i", extra);
  finalArgs.push(...st.inArgs);
  if (st.vf.length) finalArgs.push("-vf", st.vf.join(","));
  if (st.af.length) finalArgs.push("-af", st.af.join(","));
  if (st.vCodec) finalArgs.push("-c:v", st.vCodec);
  if (st.aCodec) finalArgs.push("-c:a", st.aCodec);
  if (st.crf !== null) finalArgs.push("-crf", String(st.crf));
  if (st.preset) finalArgs.push("-preset", st.preset);
  finalArgs.push(...st.outArgs, outputPath);

  const passes: FfmpegPass[] = [...st.pass2, { name: "encode", args: finalArgs }];

  return { passes, outputName };
}
