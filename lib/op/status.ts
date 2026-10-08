// lib/op/status.ts
import "server-only";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { readJobStatus, jobDirs, jobOutputPath, readJobMeta } from "@/lib/jobs";
import { ingestFile } from "@/lib/catalog/store";

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

/** Job ids whose outputs have already been pushed into the catalog. */
const registeredJobs = new Set<string>();

/**
 * The download half of the shared catalog: when a yt-dlp job finishes, its
 * outputs stop being "files in a job folder" and become catalog objects with
 * origin "download" plus the source URL as provenance. Idempotent — the
 * content hash de-duplicates, so re-registering (or a process restart) is free.
 */
export async function registerJobOutputs(
  jobId: string,
  outputs: { name: string }[]
): Promise<void> {
  if (registeredJobs.has(jobId) || outputs.length === 0) return;
  registeredJobs.add(jobId);

  const meta = await readJobMeta(jobId);
  const url = typeof meta?.url === "string" ? meta.url : null;
  const mode = typeof meta?.mode === "string" ? meta.mode : null;

  for (const o of outputs) {
    try {
      await ingestFile({
        path: jobOutputPath(jobId, o.name),
        name: o.name,
        origin: "download",
        url,
        provider: providerOf(url),
        tool: "yt-dlp",
        meta: { jobId, mode },
      });
    } catch (err) {
      // Never let catalog bookkeeping fail the job the user is watching.
      // eslint-disable-next-line no-console
      console.error(`[catalog] register ${o.name} for job ${jobId} failed:`, err);
    }
  }
}

function providerOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
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
    const outputs = await listOutputs(jobId);
    progress.outputs = outputs;
    if (status === "completed") {
      // Fire-and-forget: registration must not block the poll response, and
      // dedupe guarantees it converges even if this request is retried.
      void registerJobOutputs(jobId, outputs);
    }
  }

  return progress;
}
