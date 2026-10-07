// lib/op/status.ts
import "server-only";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { readJobStatus, jobDirs } from "@/lib/jobs";

export type OpJobStatus = "queued" | "running" | "completed" | "failed";

export type OpJobProgress = {
  jobId: string;
  status: OpJobStatus;
  percent: number;
  step?: string;
  log?: string;
  error?: string;
  outputs?: { name: string; url: string; sizeBytes?: number }[];
};

function mapStatus(raw: string | undefined): OpJobStatus {
  if (!raw) return "queued";
  if (raw === "done") return "completed";
  if (raw === "error") return "failed";
  if (raw === "starting") return "queued";
  // "downloading", "processing", "post-processing (...)" all map to running.
  return "running";
}

async function listOutputs(jobId: string) {
  const { outputDir } = jobDirs(jobId);
  let entries: string[];
  try {
    entries = await readdir(outputDir);
  } catch {
    return [];
  }
  const out: { name: string; url: string; sizeBytes?: number }[] = [];
  for (const name of entries) {
    const full = path.join(outputDir, name);
    const st = await stat(full).catch(() => null);
    if (!st || !st.isFile()) continue;
    out.push({
      name,
      url: `/api/op/download?job=${encodeURIComponent(jobId)}&name=${encodeURIComponent(name)}`,
      sizeBytes: st.size,
    });
  }
  return out;
}

export async function getOpJobProgress(jobId: string): Promise<OpJobProgress | null> {
  const raw = await readJobStatus(jobId);
  if (!raw) {
    // Status file not written yet — the Python process just spawned.
    return { jobId, status: "queued", percent: 0, step: "Starting" };
  }

  const status = mapStatus(raw.status);
  const progress: OpJobProgress = {
    jobId,
    status,
    percent: status === "completed" ? 100 : Number(raw.progress) || 0,
    step: raw.status,
    log: (raw as unknown as { log?: string }).log,
    error: raw.error ?? undefined,
  };

  if (status === "completed" || status === "failed") {
    progress.outputs = await listOutputs(jobId);
  }

  return progress;
}
