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

// pip installs here via `pip install -r requirements.txt --target ./python-modules` at build time.
const PYTHON_MODULES_PATH = path.join(process.cwd(), "python-modules");

function pythonEnv() {
  return {
    ...process.env,
    PYTHONPATH: PYTHON_MODULES_PATH,
  };
}

export function callJobDirs(jobId: string) {
  const dir = path.join(JOBS_ROOT, jobId);
  return {
    dir,
    statusFile: path.join(dir, "status.json"),
    outputDir: path.join(dir, "output"),
  };
}

export async function callCreateJob(): Promise<string> {
  const jobId = randomUUID();
  const { dir, outputDir } = jobDirs(jobId);
  await fs_promises.mkdir(outputDir, { recursive: true });
  return jobId;
}

/** Runs a short-lived python script and returns its single JSON stdout blob. */
export async function callPythonJSON<T = unknown>(
  scriptName: string,
  args: string[]
): Promise<T> {
  const scriptPath = path.join(process.cwd(), "python", scriptName);
  try {
    const { stdout } = await execFileAsync("python3", [scriptPath, ...args], {
      maxBuffer: 1024 * 1024 * 32,
      env: pythonEnv(),
    });
    return JSON.parse(stdout) as T;
  } catch (err: any) {
    // yt-dlp scripts intentionally print a structured {type:"error", ...}
    // blob to stdout and exit(1) on failure. A non-zero exit code makes
    // execFile reject the promise no matter what was printed — so recover
    // the JSON from the rejected error before treating this as a real crash.
    if (err?.stdout) {
      try {
        return JSON.parse(err.stdout) as T;
      } catch {
        // stdout wasn't JSON either — fall through to the real error below
      }
    }
    const stderr = err?.stderr ? `\n${err.stderr}` : "";
    throw new Error(`${scriptName} failed: ${err?.message ?? "unknown error"}${stderr}`);
  }
}


/**
 * Fires off a long-running python download in the background (does not
 * await completion) and returns immediately. Progress is polled by reading
 * the status file the script writes to, not by watching stdout.
 */
export function CallStartDownload(jobId: string, optionsJson: string) {
  const { statusFile, outputDir } = jobDirs(jobId);
  const scriptPath = path.join(process.cwd(), "python", "ytdlp_download.py");

  const child = spawn("python3", [scriptPath, statusFile, outputDir, optionsJson], {
    stdio: ["ignore", "ignore", "pipe"],
    env: pythonEnv(),
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

export async function callJobStatus(jobId: string): Promise<JobStatus | null> {
  const { statusFile } = jobDirs(jobId);
  try {
    const raw = await fs_promises.readFile(statusFile, "utf8");
    return JSON.parse(raw) as JobStatus;
  } catch {
    return null; // not started writing yet
  }
}

export function callJobOutputPath(jobId: string, filename: string) {
  const { outputDir } = jobDirs(jobId);
  return path.join(outputDir, filename);
}

export function callJobOutputFileExistsSync(jobId: string, filename: string) {
  return fs.existsSync(jobOutputPath(jobId, filename));
}
