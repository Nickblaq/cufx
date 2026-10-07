// lib/op/translate.ts
import "server-only";

export type OperationPayload = { id: string; params: Record<string, unknown> };

function asStr(v: unknown, fallback = ""): string {
  return v == null ? fallback : String(v);
}
function asBool(v: unknown): boolean {
  return v === true || v === "true" || v === "on";
}

/**
 * Translate one operation into yt-dlp argv fragments.
 * Order within the array doesn't matter to yt-dlp — it parses flags
 * irrespective of position, with the last `-o` winning.
 */
function translateOne(op: OperationPayload): string[] {
  const p = op.params ?? {};
  switch (op.id) {
    case "quick-best":
      return ["-f", "bv*+ba/b"];

    case "audio-mp3":
      return ["-x", "--audio-format", "mp3", "--audio-quality", asStr(p.quality, "0")];

    case "audio-m4a":
      return ["-x", "--audio-format", "m4a"];

    case "video-mp4":
      return ["-f", "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/b"];

    case "video-webm":
      return ["-f", "bv*[ext=webm]+ba[ext=webm]/b[ext=webm]/b"];

    case "custom-format": {
      const f = asStr(p.format).trim();
      return f ? ["-f", f] : [];
    }

    case "resolution-cap": {
      const h = asStr(p.maxHeight, "1080");
      return ["-f", `bv*[height<=${h}]+ba/b[height<=${h}]/b`];
    }

    case "filesize-cap":
      return ["--max-filesize", `${asStr(p.maxSize, "500")}M`];

    case "codec-pref": {
      const sort: string[] = [];
      const v = asStr(p.vcodec, "any");
      const a = asStr(p.acodec, "any");
      if (v !== "any") sort.push(`vcodec:${v}`);
      if (a !== "any") sort.push(`acodec:${a}`);
      return sort.length ? ["-S", sort.join(",")] : [];
    }

    case "section-download": {
      const section = asStr(p.section).trim();
      if (!section) return [];
      const args = ["--download-sections", section];
      if (asBool(p.forceKeyframes)) args.push("--force-keyframes-at-cuts");
      return args;
    }

    case "rate-limit": {
      const args: string[] = [];
      const rate = asStr(p.rate).trim();
      if (rate) args.push("-r", rate);
      const c = Number(p.concurrent ?? 0);
      if (c > 0) args.push("-N", String(c));
      return args;
    }

    case "output-template": {
      const t = asStr(p.template).trim();
      if (!t) return [];
      const args = ["-o", t];
      if (asBool(p.restrict)) args.push("--restrict-filenames");
      return args;
    }

    case "thumbnail-download": {
      const args = ["--write-thumbnail"];
      if (asBool(p.all)) args.push("--write-all-thumbnails");
      const fmt = asStr(p.format, "jpg");
      if (fmt) args.push("--convert-thumbnails", fmt);
      return args;
    }

    case "info-json": {
      const args = ["--write-info-json"];
      if (asBool(p.comments)) args.push("--write-comments");
      return args;
    }

    case "download-archive":
      return ["--download-archive", asStr(p.archiveFile, "archive.txt")];

    case "cookies-browser": {
      const browser = asStr(p.browser, "chrome");
      const profile = asStr(p.profile).trim();
      return ["--cookies-from-browser", profile ? `${browser}:${profile}` : browser];
    }

    case "cookies-file": {
      const f = asStr(p.cookieFile).trim();
      return f ? ["--cookies", f] : [];
    }

    case "proxy-config": {
      const u = asStr(p.proxy).trim();
      return u ? ["--proxy", u] : [];
    }

    case "sub-download": {
      const langs = asStr(p.langs, "en");
      const fmt = asStr(p.format, "srt");
      const args = ["--write-subs", "--write-auto-subs", "--sub-langs", langs];
      if (fmt && fmt !== "best") args.push("--convert-subs", fmt);
      return args;
    }

    case "embed-subs":
      return ["--embed-subs", "--sub-langs", asStr(p.langs, "en")];

    case "embed-thumbnail":
      return ["--embed-thumbnail"];

    case "embed-metadata": {
      const args = ["--embed-metadata"];
      if (asBool(p.chapters)) args.push("--embed-chapters");
      return args;
    }

    case "sponsorblock-mark": {
      const cats = Array.isArray(p.categories) ? (p.categories as string[]) : [];
      return cats.length ? ["--sponsorblock-mark", cats.join(",")] : [];
    }

    case "sponsorblock-remove": {
      const cats = Array.isArray(p.categories) ? (p.categories as string[]) : [];
      return cats.length ? ["--sponsorblock-remove", cats.join(",")] : [];
    }

    case "extractor-args": {
      const ex = asStr(p.extractor, "youtube");
      const args = asStr(p.args).trim();
      return args ? ["--extractor-args", `${ex}:${args}`] : [];
    }

    case "split-chapters": {
      const t = asStr(p.template).trim();
      return t ? ["--split-chapters", "-o", t] : [];
    }

    /* Chains — expand to their component operations. */
    case "music-pipeline":
      return [
        ...translateOne({ id: "audio-mp3", params: { quality: p.quality } }),
        ...translateOne({ id: "embed-thumbnail", params: {} }),
        ...translateOne({ id: "embed-metadata", params: {} }),
      ];

    case "archive-pipeline":
      return [
        ...translateOne({ id: "quick-best", params: {} }),
        ...translateOne({ id: "sub-download", params: { langs: p.subLangs } }),
        ...translateOne({ id: "thumbnail-download", params: {} }),
        ...translateOne({ id: "info-json", params: {} }),
        ...translateOne({ id: "download-archive", params: { archiveFile: p.archiveFile } }),
      ];

    case "social-clip":
      return [
        ...translateOne({ id: "resolution-cap", params: { maxHeight: "1080" } }),
        ...translateOne({ id: "sub-download", params: { langs: p.subLangs } }),
        ...translateOne({ id: "embed-subs", params: { langs: p.subLangs } }),
      ];

    default:
      return [];
  }
}

export function buildArgv(payload: OperationPayload[]): string[] {
  const args: string[] = [];
  for (const op of payload) {
    args.push(...translateOne(op));
  }
  return args;
}
