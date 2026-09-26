import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * Runs a Python script from /python and parses its stdout as JSON.
 * The script must print exactly one JSON object to stdout.
 */
export async function callPython<T = unknown>(
  scriptName: string,
  args: string[] = []
): Promise<T> {
  const scriptPath = path.join(process.cwd(), "python", scriptName);
  const { stdout } = await execFileAsync("python3", [scriptPath, ...args]);
  return JSON.parse(stdout) as T;
}
