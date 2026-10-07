// lib/op/translate.ts
import "server-only";

export type OperationPayload = { id: string; params: Record<string, unknown> };

/** Extended options blob handed to ytdlp_download.py. */
export type PythonJobOptions = {
  url: string;
  mode: "video" | "audio";
  // format selection
  height?: number;
  container?: string;
  formatSelector?: string;
  codecSort?: string;
  maxFilesize?: string;
  // audio
  audioFormat?: string;
  audioQuality?: string;
  // files / naming
  outputTemplate?: string;
  restrictFilenames?: boolean;
  downloadArchive?: string;
  // network
  rateLimit?: string;
  concurrentFragments?: number;
  proxy?: string;
  // auth
  cookieBrowser?: string;
  cookieProfile?: string;
  cookieFile?: string;
  // subs
  subsOn?: boolean;
  subLangs?: string[];
  embedSubs?: boolean;
  // metadata
  embedThumb?: boolean;
  embedMeta?: boolean;
  saveChapters?: boolean;
  writeThumbnail?: boolean;
  writeAllThumbnails?: boolean;
  thumbnailFormat?: string;
  writeInfoJson?: boolean;
  writeComments?: boolean;
  // expert
  extractorArgs?: Record<string, string>;
  splitChapters?: boolean;
  sponsorblockMarkCategories?: string[];
  sponsorblockRemoveCategories?: string[];
  // clip
  clipOn?: boolean;
  clipStart?: number;
  clipEnd?: number;
};

const asStr = (v: unknown, fallback = "") => (v == null ? fallback : String(v));
const asBool = (v: unknown) => v === true || v === "true" || v === "on";
const asArr = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);

/** Parse "1:23" or "83.4" or "*00:30-01:30" into seconds. */
function parseTimecode(input: string): number | null {
  const s = input.trim().replace(/^\*/, "");
  if (!s) return null;
  if (s.includes(":")) {
    const parts = s.split(":").map((p) => parseFloat(p));
    if (parts.some((n) => Number.isNaN(n))) return null;
    return parts.reduce((acc, n) => acc * 60 + n, 0);
  }
  const n = parseFloat(s);
  return Number.isNaN(n) ? null : n;
}

/** "*00:30-01:30" or "*30-90" -> [start, end] in seconds, or null. */
function parseSection(section: string): [number, number] | null {
  const m = section.match(/^\*?\s*([\d:.]+)\s*-\s*([\d:.]+)\s*$/);
  if (!m) return null;
  const start = parseTimecode(m[1]);
  const end = parseTimecode(m[2]);
  if (start == null || end == null) return null;
  return [start, end];
}

/**
 * Fold a pipeline of operations into a single PythonJobOptions blob.
 * Operations are processed in order; later operations override earlier ones
 * for scalar fields, while list-shaped fields (subs, sponsorblock categories)
 * accumulate.
 */
export function translateOperations(
  url: string,
  ops: OperationPayload[]
): PythonJobOptions {
  const out: PythonJobOptions = { url, mode: "video" };

  for (const op of ops) {
    const p = op.params ?? {};
    switch (op.id) {
      // ── download strategy ────────────────────────────────────────────
      case "quick-best":
        out.mode = "video";
        break;
      case "audio-mp3":
        out.mode = "audio";
        out.audioFormat = "mp3";
        out.audioQuality = asStr(p.quality, "0");
        break;
      case "audio-m4a":
        out.mode = "audio";
        out.audioFormat = "m4a";
        break;
      case "video-mp4":
        out.mode = "video";
        out.container = "mp4";
        break;
      case "video-webm":
        out.mode = "video";
        out.container = "webm";
        break;
      case "custom-format":
        out.formatSelector = asStr(p.format).trim() || undefined;
        break;

      // ── quality / selection ──────────────────────────────────────────
      case "resolution-cap": {
        const h = Number(p.maxHeight);
        if (!Number.isNaN(h) && h > 0) out.height = h;
        break;
      }
      case "filesize-cap": {
        const mb = Number(p.maxSize);
        if (!Number.isNaN(mb) && mb > 0) out.maxFilesize = `${mb}M`;
        break;
      }
      case "codec-pref": {
        const parts: string[] = [];
        if (p.vcodec && p.vcodec !== "any") parts.push(`vcodec:${p.vcodec}`);
        if (p.acodec && p.acodec !== "any") parts.push(`acodec:${p.acodec}`);
        if (parts.length) out.codecSort = parts.join(",");
        break;
      }
      case "section-download": {
        const section = asStr(p.section).trim();
        if (section) {
          const range = parseSection(section);
          if (range) {
            out.clipOn = true;
            out.clipStart = range[0];
            out.clipEnd = range[1];
          }
        }
        break;
      }
      case "rate-limit": {
        const r = asStr(p.rate).trim();
        if (r) out.rateLimit = r;
        const c = Number(p.concurrent);
        if (!Number.isNaN(c) && c > 0) out.concurrentFragments = c;
        break;
      }

      // ── files ────────────────────────────────────────────────────────
      case "output-template": {
        const t = asStr(p.template).trim();
        if (t) out.outputTemplate = t;
        out.restrictFilenames = asBool(p.restrict);
        break;
      }
      case "download-archive":
        out.downloadArchive = asStr(p.archiveFile, "archive.txt");
        break;

      // ── metadata sidecars ────────────────────────────────────────────
      case "thumbnail-download":
        out.writeThumbnail = true;
        out.writeAllThumbnails = asBool(p.all);
        out.thumbnailFormat = asStr(p.format, "jpg");
        break;
      case "info-json":
        out.writeInfoJson = true;
        out.writeComments = asBool(p.comments);
        break;

      // ── auth ─────────────────────────────────────────────────────────
      case "cookies-browser":
        out.cookieBrowser = asStr(p.browser, "chrome");
        if (p.profile) out.cookieProfile = asStr(p.profile);
        break;
      case "cookies-file":
        out.cookieFile = asStr(p.cookieFile).trim() || undefined;
        break;
      case "proxy-config":
        out.proxy = asStr(p.proxy).trim() || undefined;
        break;

      // ── subs ─────────────────────────────────────────────────────────
      case "sub-download": {
        out.subsOn = true;
        const langs = asStr(p.langs, "en")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        if (langs.length) out.subLangs = langs;
        break;
      }
      case "embed-subs":
        out.embedSubs = true;
        if (!out.subsOn) {
          out.subsOn = true;
          out.subLangs = [asStr(p.langs, "en")];
        }
        break;

      // ── embedding ────────────────────────────────────────────────────
      case "embed-thumbnail":
        out.embedThumb = true;
        break;
      case "embed-metadata":
        out.embedMeta = true;
        out.saveChapters = asBool(p.chapters);
        break;

      // ── expert ───────────────────────────────────────────────────────
      case "sponsorblock-mark": {
        const cats = asArr(p.categories);
        if (cats.length) {
          out.sponsorblockMarkCategories = [
            ...(out.sponsorblockMarkCategories ?? []),
            ...cats,
          ];
        }
        break;
      }
      case "sponsorblock-remove": {
        const cats = asArr(p.categories);
        if (cats.length) {
          out.sponsorblockRemoveCategories = [
            ...(out.sponsorblockRemoveCategories ?? []),
            ...cats,
          ];
        }
        break;
      }
      case "extractor-args": {
        const ex = asStr(p.extractor, "youtube");
        const args = asStr(p.args).trim();
        if (args) {
          out.extractorArgs = { ...(out.extractorArgs ?? {}), [ex]: args };
        }
        break;
      }
      case "split-chapters":
        out.splitChapters = true;
        break;

      // ── chains — expand inline ───────────────────────────────────────
      case "music-pipeline": {
        const quality = asStr(p.quality, "320K");
        translateOperations(url, [
          { id: "audio-mp3", params: { quality } },
          { id: "embed-thumbnail", params: {} },
          { id: "embed-metadata", params: { chapters: true } },
        ]);
        // Re-apply onto `out` by recursively folding, but easier: replicate.
        out.mode = "audio";
        out.audioFormat = "mp3";
        out.audioQuality = quality;
        out.embedThumb = true;
        out.embedMeta = true;
        out.saveChapters = true;
        break;
      }
      case "archive-pipeline": {
        out.mode = "video";
        out.subsOn = true;
        out.subLangs = [asStr(p.subLangs, "en")];
        out.writeThumbnail = true;
        out.writeInfoJson = true;
        out.downloadArchive = asStr(p.archiveFile, "archive.txt");
        break;
      }
      case "social-clip": {
        out.mode = "video";
        out.height = 1080;
        out.subsOn = true;
        out.subLangs = [asStr(p.subLangs, "en")];
        out.embedSubs = true;
        break;
      }

      default:
        // Unknown op — ignore rather than reject; the ops list is
        // client-controlled and we'd rather drop an unrecognized step than
        // 500 the whole job.
        break;
    }
  }

  return out;
}
