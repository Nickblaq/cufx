// lib/op/jobs.ts
import "server-only";
import { spawn } from "node:child_process";
import { mkdir, readdir, stat, rm } from "node:fs/promises";
import path from "node:path";
import { buildArgv, type OperationPayload } from "./translate";
import type { JobProgress } from "./types";

type InternalJob = JobProgress & {
  url: string;
  dir: string;
  startedAt: number;
};

const JOBS = new Map<string, InternalJob>();
const PUBLIC_ROOT = path.join(process.cwd(), "public", "jobs");

const PROGRESS_RE = /\[download\]\s+([\d.]+)%/;
const POSTPROC_RE = /^\[([A-Za-z]+)\]/;

/* ------------------------------- lifecycle ------------------------------- */

export function getJob(jobId: string): JobProgress | null {
  const j = JOBS.get(jobId);
  if (!j) return null;
  const { url, dir, startedAt, ...rest } = j;
  return rest;
}

export async function startJob(
  url: string,
  operations: OperationPayload[]
): Promise<string> {
  const jobId = `job_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const dir = path.join(PUBLIC_ROOT, jobId);
  await mkdir(dir, { recursive: true });

  const job: InternalJob = {
    jobId,
    status: "queued",
    percent: 0,
    step: "Queued",
    stepIndex: 0,
    totalSteps: Math.max(operations.length, 1),
    log: "",
    url,
    dir,
    startedAt: Date.now(),
  };
  JOBS.set(jobId, job);

  // Fire and forget — caller gets the id immediately.
  void runYtDlp(job, operations).catch((e) => {
    console.error(`[op/jobs] job ${jobId} crashed:`, e);
  });

  return jobId;
}

/* -------------------------------- runner --------------------------------- */

async function runYtDlp(job: InternalJob, operations: OperationPayload[]) {
  const opArgs = buildArgv(operations);

  const argv = [
    "--no-warnings",
    "--no-playlist",
    "--newline",              // one line per progress update
    "--progress",
    "-P", job.dir,            // output dir
    "-o", "%(title)s [%(id)s].%(ext)s",
    ...opArgs,
    job.url,
  ];

  job.status = "running";
  job.step = "Starting";

  const proc = spawn("yt-dlp", argv);

  const appendLog = (chunk: string) => {
    job.log = ((job.log ?? "") + chunk).slice(-8000);
  };

  proc.stdout.on("data", (d) => {
    const text = d.toString();
    appendLog(text);

    for (const line of text.split("\n")) {
      const m = PROGRESS_RE.exec(line);
      if (m) {
        job.percent = Math.min(99, parseFloat(m[1]));
        job.step = "Downloading";
        continue;
      }
      const pp = POSTPROC_RE.exec(line);
      if (pp) {
        job.step = pp[1];
        // Post-processing spans the final stretch; approximate.
        if (job.percent < 90) job.percent = 90;
      }
    }
  });

  proc.stderr.on("data", (d) => appendLog(d.toString()));

  proc.on("error", async (e: NodeJS.ErrnoException) => {
    job.status = "failed";
    job.error =
      e.code === "ENOENT"
        ? "yt-dlp is not installed on the server"
        : e.message;
  });

  proc.on("close", async (code) => {
    if (job.status === "failed") return;

    if (code !== 0) {
      job.status = "failed";
      job.error = `yt-dlp exited with code ${code}`;
      return;
    }

    try {
      const outputs = await collectOutputs(job.dir, job.jobId);
      job.outputs = outputs;
      job.percent = 100;
      job.status = "completed";
      job.step = "Done";

      // Schedule cleanup 6 h from now.
      setTimeout(() => {
        rm(job.dir, { recursive: true, force: true }).catch(() => {});
        JOBS.delete(job.jobId);
      }, 6 * 60 * 60 * 1000);
    } catch (e) {
      job.status = "failed";
      job.error = e instanceof Error ? e.message : "Failed to collect outputs";
    }
  });
}

/* ------------------------------- outputs --------------------------------- */

async function collectOutputs(dir: string, jobId: string) {
  const entries = await readdir(dir);
  const out: { name: string; url: string; sizeBytes?: number }[] = [];

  for (const name of entries) {
    const full = path.join(dir, name);
    const st = await stat(full).catch(() => null);
    if (!st || !st.isFile()) continue;
    out.push({
      name,
      url: `/jobs/${jobId}/${encodeURIComponent(name)}`,
      sizeBytes: st.size,
    });
  }
  return out;
}
