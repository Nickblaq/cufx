// lib/ff/status.ts
import "server-only";
import { readJobStatus } from "@/lib/jobs";

export type FfJobStatus = "queued" | "running" | "completed" | "failed";

export type FfJobProgress = {
  jobId: string;
  status: FfJobStatus;
  percent: number;
  step?: string;
  stepIndex?: number;
  totalSteps?: number;
  log?: string;
  error?: string;
  outputs?: { name: string; url: string; sizeBytes?: number }[];
};

function mapStatus(raw: string | undefined): FfJobStatus {
  if (!raw) return "queued";
  if (raw === "done") return "completed";
  if (raw === "error") return "failed";
  if (raw === "starting") return "queued";
  return "running";
}

export async function getFfJobProgress(
  jobId: string
): Promise<FfJobProgress | null> {
  const raw = await readJobStatus(jobId);
  if (!raw) return { jobId, status: "queued", percent: 0, step: "Starting" };

  const status = mapStatus(raw.status);
  const outputs = (raw as unknown as { outputs?: { name: string; sizeBytes?: number }[] }).outputs ?? [];

  return {
    jobId,
    status,
    percent: status === "completed" ? 100 : Number(raw.progress) || 0,
    step: raw.status,
    stepIndex: (raw as unknown as { stepIndex?: number }).stepIndex,
    totalSteps: (raw as unknown as { totalSteps?: number }).totalSteps,
    log: (raw as unknown as { log?: string }).log,
    error: raw.error ?? undefined,
    outputs: outputs.map((o) => ({
      name: o.name,
      sizeBytes: o.sizeBytes,
      url: `/api/ff/download?jobId=${encodeURIComponent(jobId)}`,
    })),
  };
}
