// app/api/op/run/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { startJob } from "@/lib/op/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OperationSchema = z.object({
  id: z.string(),
  params: z.record(z.string(), z.unknown()).default({}),
});

const BodySchema = z.object({
  url: z.string().url(),
  operations: z.array(OperationSchema).min(1),
});

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
      { ok: false, error: "Invalid run payload", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const jobId = await startJob(parsed.data.url, parsed.data.operations);
    return NextResponse.json({ ok: true, jobId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to start job";
    console.error("[op/run]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
