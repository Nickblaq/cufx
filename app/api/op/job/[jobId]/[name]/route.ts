// app/api/op/file/[jobId]/[name]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { jobOutputPath } from "@/lib/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  mp4: "video/mp4",
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
  ass: "text/x-ssa",
  json: "application/json",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string; name: string }> }
) {
  const { jobId, name } = await params;
  const decoded = decodeURIComponent(name);

  // Guard against path traversal — the resolved path must stay inside the
  // job's output directory.
  if (decoded.includes("/") || decoded.includes("\\") || decoded.includes("..")) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  const fullPath = jobOutputPath(jobId, decoded);
  const st = await stat(fullPath).catch(() => null);
  if (!st || !st.isFile()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ext = decoded.split(".").pop()?.toLowerCase() ?? "";
  const contentType = MIME[ext] ?? "application/octet-stream";

  const stream = createReadStream(fullPath);
  // Node's ReadStream is a valid web ReadableStream source in Next 14+.
  return new NextResponse(stream as unknown as ReadableStream, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(st.size),
      "Content-Disposition": `attachment; filename="${decoded.replace(/"/g, "")}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
