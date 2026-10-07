// app/api/op/job/[jobId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getJob } from "@/lib/op/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const job = getJob(jobId);
  if (!job) {
    return NextResponse.json(
      { ok: false, error: "Job not found" },
      { status: 404 }
    );
  }
  return NextResponse.json({ ok: true, job });
}
