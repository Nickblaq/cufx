// app/api/op/run/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createJob, startPythonDownload, writeJobMeta } from "@/lib/jobs";
import { translateOperations } from "@/lib/op/translate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OperationSchema = z.object({
  id: z.string().min(1),
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
    const options = translateOperations(parsed.data.url, parsed.data.operations);
    const jobId = await createJob();
    // Remember the source so completed outputs can be registered in the
    // shared catalog with their provenance intact (see lib/op/status.ts).
    await writeJobMeta(jobId, {
      kind: "op",
      url: parsed.data.url,
      mode: options.mode,
      operations: parsed.data.operations.map((o) => o.id),
    });
    startPythonDownload(jobId, JSON.stringify(options));
    return NextResponse.json({ ok: true, jobId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to start job";
    console.error("[op/run]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
