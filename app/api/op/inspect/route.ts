// app/api/op/inspect/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runPythonJSON } from "@/lib/jobs";
import type { MediaFormat, MediaInfo, Subtitle } from "@/lib/op/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({ url: z.string().url() });

/* ─── raw yt-dlp info -> MediaInfo ─────────────────────────────────────── */

type RawFormat = {
  format_id?: string;
  ext?: string;
  format_note?: string;
  filesize?: number;
  filesize_approx?: number;
  vcodec?: string;
  acodec?: string;
  height?: number;
  abr?: number;
};

type RawInfo = {
  id?: string;
  title?: string;
  uploader?: string;
  channel?: string;
  duration?: number;
  view_count?: number;
  upload_date?: string;
  thumbnail?: string;
  formats?: RawFormat[];
  subtitles?: Record<string, unknown>;
  automatic_captions?: Record<string, unknown>;
  error?: string;
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

function mapFormats(formats: RawFormat[] = []): MediaFormat[] {
  return formats
    .filter((f) => f.format_id)
    .slice(-24)
    .reverse()
    .map((f) => {
      const isVideo = !!f.vcodec && f.vcodec !== "none";
      const label = isVideo
        ? `${f.height ?? "?"}p · ${(f.vcodec || "").split(".")[0]}`
        : `${f.abr ? Math.round(f.abr) + "kbps" : "audio"} · ${(f.acodec || "").split(".")[0]}`;
      return {
        id: f.format_id!,
        label,
        ext: f.ext ?? "—",
        size: fmtBytes(f.filesize ?? f.filesize_approx),
        note: f.format_note ?? (isVideo ? "video" : "audio"),
      };
    });
}

function mapSubtitles(
  manual: Record<string, unknown> = {},
  auto: Record<string, unknown> = {}
): Subtitle[] {
  const out: Subtitle[] = [];
  for (const lang of Object.keys(manual)) out.push({ lang, label: lang, auto: false });
  for (const lang of Object.keys(auto)) {
    if (!manual[lang]) out.push({ lang, label: lang, auto: true });
  }
  return out;
}

function detectKind(info: RawInfo): "audio" | "video" {
  return (info.formats ?? []).some((f) => f.vcodec && f.vcodec !== "none")
    ? "video"
    : "audio";
}

/* ─── handler ──────────────────────────────────────────────────────────── */

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "A valid URL is required" },
      { status: 400 }
    );
  }

  try {
    const raw = await runPythonJSON<RawInfo>("ytdlp_resolve.py", [parsed.data.url]);

    if (raw.error) {
      return NextResponse.json({ ok: false, error: raw.error }, { status: 502 });
    }
    if (!raw.id) {
      return NextResponse.json(
        { ok: false, error: "Extractor returned no media id" },
        { status: 502 }
      );
    }

    const info: MediaInfo = {
      url: parsed.data.url,
      kind: detectKind(raw),
      id: raw.id,
      title: raw.title ?? "Untitled",
      uploader: raw.uploader ?? raw.channel ?? "Unknown",
      duration: fmtDuration(raw.duration),
      views: fmtViews(raw.view_count),
      uploadedAt: fmtDate(raw.upload_date),
      thumbnail: raw.thumbnail ?? "",
      formats: mapFormats(raw.formats),
      subtitles: mapSubtitles(raw.subtitles, raw.automatic_captions),
    };

    return NextResponse.json({ ok: true, info });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Inspection failed";
    console.error("[op/inspect]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
