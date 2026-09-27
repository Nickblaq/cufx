import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import { Readable } from "node:stream";
import { readJobStatus, jobOutputPath, jobOutputFileExistsSync } from "@/lib/jobs";

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
  const nodeStream = fs.createReadStream(filePath);
  const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream;

  return new NextResponse(webStream, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": String(stat.size),
      "Content-Disposition": `attachment; filename="${encodeURIComponent(status.filename)}"`,
    },
  });
}
