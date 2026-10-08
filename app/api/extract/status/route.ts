import { NextRequest, NextResponse } from "next/server";
import { callJobStatus } from "@/lib/jobs";

export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get("jobId");
  if (!jobId) {
    return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
  }

  const status = await readJobStatus(jobId);
  if (!status) {
    return NextResponse.json({ status: "starting", progress: 0 });
  }
  return NextResponse.json(status);
}
