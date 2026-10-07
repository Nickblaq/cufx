// app/api/op/job/[jobId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getOpJobProgress } from "@/lib/op/status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  try {
    const job = await getOpJobProgress(jobId);
    if (!job) {
      return NextResponse.json(
        { ok: false, error: "Job not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true, job });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to read job";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
