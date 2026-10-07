// lib/op/inspect.ts
import "server-only";
import { spawn } from "node:child_process";
import type { MediaInfo, MediaFormat, Subtitle } from "./types";

type YtFormat = {
  format_id?: string;
  ext?: string;
  format_note?: string;
  filesize?: number;
  filesize_approx?: number;
  vcodec?: string;
  acodec?: string;
  height?: number;
  abr?: number;
  vbr?: number;
  tbr?: number;
};

type YtSub = { ext?: string };

type YtInfo = {
  id?: string;
  title?: string;
  uploader?: string;
  channel?: string;
  duration?: number;
  view_count?: number;
  upload_date?: string;
  thumbnail?: string;
  formats?: YtFormat[];
  subtitles?: Record<string, YtSub[]>;
  automatic_captions?: Record<string, YtSub[]>;
};

function fmtDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return "--:--";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

function fmtViews(n?: number): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

function fmtDate(yyyymmdd?: string): string {
  if (!yyyymmdd || yyyymmdd.length !== 8) return "—";
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

function fmtBytes(n?: number): string {
  if (!n) return "—";
  const u = ["B", "KB", "MB", "GB"];
  let v = n, i = 0;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return v.toFixed(1) + " " + u[i];
}

function mapFormats(formats: YtFormat[] = []): MediaFormat[] {
  return formats
    .filter((f) => f.format_id)
    .slice(-24) // keep the tail — yt-dlp lists worst → best
    .reverse()
    .map((f) => {
      const isVideo = f.vcodec && f.vcodec !== "none";
      const label = isVideo
        ? `${f.height ?? "?"}p · ${(f.vcodec || "").split(".")[0]}`
        : `${f.abr ? Math.round(f.abr) + "kbps" : "audio"} · ${(f.acodec || "").split(".")[0]}`;
      const size = f.filesize ?? f.filesize_approx;
      return {
        id: f.format_id!,
        label,
        ext: f.ext ?? "—",
        size: fmtBytes(size),
        note: f.format_note ?? (isVideo ? "video" : "audio"),
      };
    });
}

function mapSubtitles(
  manual: Record<string, YtSub[]> = {},
  auto: Record<string, YtSub[]> = {}
): Subtitle[] {
  const out: Subtitle[] = [];
  for (const lang of Object.keys(manual)) {
    out.push({ lang, label: lang, auto: false });
  }
  for (const lang of Object.keys(auto)) {
    if (!manual[lang]) out.push({ lang, label: lang, auto: true });
  }
  return out;
}

function detectKind(info: YtInfo): "audio" | "video" {
  const hasVideo = (info.formats ?? []).some(
    (f) => f.vcodec && f.vcodec !== "none"
  );
  return hasVideo ? "video" : "audio";
}

export async function inspectUrl(url: string): Promise<MediaInfo> {
  const raw = await runYtDlpJson(url);
  const info = JSON.parse(raw) as YtInfo;

  if (!info.id) throw new Error("Extractor returned no media id");

  return {
    url,
    kind: detectKind(info),
    id: info.id,
    title: info.title ?? "Untitled",
    uploader: info.uploader ?? info.channel ?? "Unknown",
    duration: fmtDuration(info.duration),
    views: fmtViews(info.view_count),
    uploadedAt: fmtDate(info.upload_date),
    thumbnail: info.thumbnail ?? "",
    formats: mapFormats(info.formats),
    subtitles: mapSubtitles(info.subtitles, info.automatic_captions),
  };
}

function runYtDlpJson(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn("yt-dlp", [
      "--no-warnings",
      "--skip-download",
      "--no-playlist",
      "-J",
      url,
    ]);

    let out = "";
    let err = "";

    proc.stdout.on("data", (d) => { out += d.toString(); });
    proc.stderr.on("data", (d) => { err += d.toString(); });

    proc.on("error", (e: NodeJS.ErrnoException) => {
      if (e.code === "ENOENT") {
        reject(new Error("yt-dlp is not installed on the server"));
      } else {
        reject(e);
      }
    });

    proc.on("close", (code) => {
      if (code === 0) resolve(out);
      else reject(new Error(err.trim() || `yt-dlp exited with code ${code}`));
    });

    // 60 s cap — some sites hang.
    const t = setTimeout(() => {
      proc.kill("SIGKILL");
      reject(new Error("Inspection timed out"));
    }, 60_000);
    proc.on("close", () => clearTimeout(t));
  });
}
