import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import fs_promises from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const execFileAsync = promisify(execFile);

// All job state lives under the OS tmp dir, keyed by job id — survives for
// the lifetime of the single Node process (Railway), which is exactly the
// lifetime a "download queue" needs here.
const JOBS_ROOT = path.join(os.tmpdir(), "cufx-jobs");

export function jobDirs(jobId: string) {
  const dir = path.join(JOBS_ROOT, jobId);
  return {
    dir,
    statusFile: path.join(dir, "status.json"),
    outputDir: path.join(dir, "output"),
  };
}

export async function createJob(): Promise<string> {
  const jobId = randomUUID();
  const { dir, outputDir } = jobDirs(jobId);
  await fs_promises.mkdir(outputDir, { recursive: true });
  return jobId;
}

/** Runs a short-lived python script and returns its single JSON stdout blob. */
export async function runPythonJSON<T = unknown>(
  scriptName: string,
  args: string[]
): Promise<T> {
  const scriptPath = path.join(process.cwd(), "python", scriptName);
  const { stdout } = await execFileAsync("python3", [scriptPath, ...args], {
    maxBuffer: 1024 * 1024 * 32,
  });
  return JSON.parse(stdout) as T;
}

/**
 * Fires off a long-running python download in the background (does not
 * await completion) and returns immediately. Progress is polled by reading
 * the status file the script writes to, not by watching stdout.
 */
export function startPythonDownload(jobId: string, optionsJson: string) {
  const { statusFile, outputDir } = jobDirs(jobId);
  const scriptPath = path.join(process.cwd(), "python", "ytdlp_download.py");

  const child = spawn("python3", [scriptPath, statusFile, outputDir, optionsJson], {
    stdio: ["ignore", "ignore", "pipe"],
  });

  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
    if (stderr.length > 8000) stderr = stderr.slice(-8000);
  });
  child.on("exit", (code) => {
    if (code !== 0 && stderr) {
      // eslint-disable-next-line no-console
      console.error(`[job ${jobId}] yt-dlp exited ${code}:\n${stderr}`);
    }
  });

  return child;
}

export type JobStatus = {
  status: string;
  progress: number;
  downloadedBytes?: number;
  totalBytes?: number | null;
  speed?: number | null;
  eta?: number | null;
  error?: string | null;
  filename?: string | null;
};

export async function readJobStatus(jobId: string): Promise<JobStatus | null> {
  const { statusFile } = jobDirs(jobId);
  try {
    const raw = await fs_promises.readFile(statusFile, "utf8");
    return JSON.parse(raw) as JobStatus;
  } catch {
    return null; // not started writing yet
  }
}

export function jobOutputPath(jobId: string, filename: string) {
  const { outputDir } = jobDirs(jobId);
  return path.join(outputDir, filename);
}

export function jobOutputFileExistsSync(jobId: string, filename: string) {
  return fs.existsSync(jobOutputPath(jobId, filename));
}
