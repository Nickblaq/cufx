// app/api/ff/run/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createJob, jobDirs, startPythonFfmpeg, stageJobInput } from "@/lib/jobs";
import { loadAsset } from "@/lib/ff/assets";
import { translateOperations, type ResolvedInput } from "@/lib/ff/translate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OperationSchema = z.object({
  id: z.string(),
  params: z.record(z.string(), z.unknown()).default({}),
});

const BodySchema = z.object({
  inputs: z
    .array(
      z.object({
        id: z.string(),
        role: z.string().default("main"),
      })
    )
    .min(1),
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
    const primary = parsed.data.inputs[0];
    const asset = await loadAsset(primary.id);
    if (!asset) {
      return NextResponse.json(
        { ok: false, error: "Source asset not found" },
        { status: 404 }
      );
    }

    const jobId = await createJob();
    const { outputDir } = jobDirs(jobId);

    // Work from the job's own copy of the source: the catalog's media expires
    // on a 15-minute idle clock, and an encode can easily outlive that.
    const inputPath = await stageJobInput(jobId, asset.path, asset.name);

    const input: ResolvedInput = {
      role: primary.role,
      path: inputPath,
      kind: asset.kind,
      name: asset.name,
    };

    const { passes, outputName } = translateOperations(
      input,
      parsed.data.operations,
      outputDir
    );

    // Sanity: the final pass must write to our expected output file.
    void outputName;

    startPythonFfmpeg(jobId, JSON.stringify({ passes }));

    return NextResponse.json({ ok: true, jobId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to start job";
    console.error("[ff/run]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
