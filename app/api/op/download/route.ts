import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import { Readable } from "node:stream";
import { readJobStatus, jobOutputPath, jobOutputFileExistsSync } from "@/lib/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  mp4: "video/mp4",
  m4v: "video/mp4",
  webm: "video/webm",
  mkv: "video/x-matroska",
  mov: "video/quicktime",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  opus: "audio/opus",
  flac: "audio/flac",
  wav: "audio/wav",
  srt: "application/x-subrip",
  vtt: "text/vtt",
  json: "application/json",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

function rfc5987(s: string) {
  return encodeURIComponent(s).replace(/['()*]/g, (c) =>
    "%" + c.charCodeAt(0).toString(16).toUpperCase()
  );
}

export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get("jobId");
  if (!jobId) {
    return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
  }

  const status = await readJobStatus(jobId);
  if (!status || status.status !== "done" || !status.filename) {
    return NextResponse.json({ error: "Job not finished" }, { status: 409 });
  }

  if (!jobOutputFileExistsSync(jobId, status.filename)) {
    return NextResponse.json({ error: "Output file missing" }, { status: 404 });
  }

  const filePath = jobOutputPath(jobId, status.filename);
  const stat = fs.statSync(filePath);
  const ext = status.filename.split(".").pop()?.toLowerCase() ?? "";
  const contentType = MIME[ext] ?? "application/octet-stream";

  // ASCII-safe fallback for old clients; UTF-8 form for everyone else.
  const fallback = status.filename.replace(/["\\\r\n]/g, "_");

  const nodeStream = fs.createReadStream(filePath);
  const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream;

  return new NextResponse(webStream, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(stat.size),
      "Content-Disposition":
        `attachment; filename="${fallback}"; filename*=UTF-8''${rfc5987(status.filename)}`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
