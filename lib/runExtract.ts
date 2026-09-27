import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * Runs python/extract_info.py against a URL and returns its parsed JSON.
 * The script always exits 0 and encodes success/failure in the JSON body,
 * so there's no exit-code edge case to recover from here.
 */
export async function extractInfo(url: string): Promise<unknown> {
  const scriptPath = path.join(process.cwd(), "python", "extract_info.py");
  const pythonModulesPath = path.join(process.cwd(), "python-modules");

  const { stdout } = await execFileAsync("python3", [scriptPath, url], {
    maxBuffer: 1024 * 1024 * 32,
    env: {
      ...process.env,
      PYTHONPATH: pythonModulesPath,
    },
  });

  return JSON.parse(stdout);
}
