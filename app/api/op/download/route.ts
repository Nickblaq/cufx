import { NextRequest, NextResponse } from "next/server";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { jobOutputPath } from "@/lib/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  mp4: "video/mp4",
  m4v: "video/mp4",
  webm: "video/webm",
  mkv: "video/x-matroska",
  mov: "video/quicktime",
  avi: "video/x-msvideo",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  aac: "audio/aac",
  opus: "audio/opus",
  ogg: "audio/ogg",
  flac: "audio/flac",
  wav: "audio/wav",
  srt: "application/x-subrip",
  vtt: "text/vtt",
  ass: "text/x-ssa",
  json: "application/json",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/** RFC 5987 encoding for the filename* parameter. */
function rfc5987(s: string): string {
  return encodeURIComponent(s).replace(
    /['()*]/g,
    (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase()
  );
}

export async function GET(req: NextRequest) {
  const job = req.nextUrl.searchParams.get("job");
  const name = req.nextUrl.searchParams.get("name");

  if (!job || !name) {
    return new NextResponse("Missing job or name", { status: 400 });
  }

  // Reject anything that could escape the job's output dir.
  if (
    name.includes("/") ||
    name.includes("\\") ||
    name.includes("..") ||
    job.includes("/") ||
    job.includes("..")
  ) {
    return new NextResponse("Invalid filename", { status: 400 });
  }

  const fullPath = jobOutputPath(job, name);
  const st = await stat(fullPath).catch(() => null);
  if (!st || !st.isFile()) {
    return new NextResponse("Not found", { status: 404 });
  }

  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const contentType = MIME[ext] ?? "application/octet-stream";

  // Two-tier filename: ASCII fallback + UTF-8 for modern browsers. Quotes and
  // control chars get stripped from the fallback so the header can't be
  // broken by a filename like `"foo".mp4`.
  const fallback = name.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
  const disposition =
    `attachment; filename="${fallback}"; filename*=UTF-8''${rfc5987(name)}`;

  const stream = createReadStream(fullPath);
  const webStream = Readable.toWeb(stream) as unknown as ReadableStream;

  return new NextResponse(webStream, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(st.size),
      "Content-Disposition": disposition,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
