// app/api/ff/download/route.ts
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
  avi: "video/x-msvideo",
  gif: "image/gif",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  aac: "audio/aac",
  opus: "audio/opus",
  ogg: "audio/ogg",
  flac: "audio/flac",
  wav: "audio/wav",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  srt: "application/x-subrip",
  vtt: "text/vtt",
  ass: "text/x-ssa",
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
  if (!status || status.status !== "done") {
    return NextResponse.json({ error: "Job not finished" }, { status: 409 });
  }

  const outputs = (status as unknown as { outputs?: { name: string }[] }).outputs ?? [];
  if (outputs.length === 0) {
    return NextResponse.json({ error: "No outputs" }, { status: 404 });
  }

  // The last file written is the one the final pass produced.
  const filename = outputs[outputs.length - 1].name;

  if (!jobOutputFileExistsSync(jobId, filename)) {
    return NextResponse.json({ error: "Output file missing" }, { status: 404 });
  }

  const filePath = jobOutputPath(jobId, filename);
  const stat = fs.statSync(filePath);
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const contentType = MIME[ext] ?? "application/octet-stream";
  const fallback = filename.replace(/["\\\r\n]/g, "_");

  const nodeStream = fs.createReadStream(filePath);
  const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream;

  return new NextResponse(webStream, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(stat.size),
      "Content-Disposition":
        `attachment; filename="${fallback}"; filename*=UTF-8''${rfc5987(filename)}`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
