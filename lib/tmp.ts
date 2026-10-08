// lib/tmp.ts
//
// Where this app keeps temporary files, and how long they live.
//
// Everything cufx writes to disk is disposable: uploads, downloaded media and
// anything a job derives from them are deleted once they have been idle for
// MEDIA_TTL_MS (see lib/cleanup.ts). Because nothing here is durable there is
// nothing to configure — no data directory, no mounted volume, and no
// environment variable decides where any of it goes.
import "server-only";
import os from "node:os";
import path from "node:path";
import { readdir, rm, stat } from "node:fs/promises";

/** One root for every file cufx owns. */
export const TEMP_ROOT = path.join(os.tmpdir(), "cufx");

/** SQLite index + content-addressed blobs — the shared catalog. */
export const CATALOG_DIR = path.join(TEMP_ROOT, "catalog");

/** One directory per job, holding its status file and its files. */
export const JOBS_DIR = path.join(TEMP_ROOT, "jobs");

/** Temporary media is deleted once it has been idle for this long. */
export const MEDIA_TTL_MS = 15 * 60 * 1000;

/**
 * The newest modification time found anywhere inside `target`, in ms.
 *
 * Age is measured from the newest write rather than from creation so that work
 * in progress protects itself: a job still downloading or encoding keeps
 * rewriting its status file and its output, so its directory stays young and is
 * never deleted out from under it.
 */
export async function newestMtimeMs(target: string): Promise<number> {
  const info = await stat(target).catch(() => null);
  if (!info) return 0;
  if (!info.isDirectory()) return info.mtimeMs;

  let newest = info.mtimeMs;
  for (const entry of await readdir(target).catch(() => [])) {
    newest = Math.max(newest, await newestMtimeMs(path.join(target, entry)));
  }
  return newest;
}

/** Deletes every entry directly inside `dir` that has been idle since `cutoff`. */
export async function removeExpiredChildren(dir: string, cutoff: number): Promise<void> {
  for (const entry of await readdir(dir).catch(() => [])) {
    const target = path.join(dir, entry);
    if ((await newestMtimeMs(target)) < cutoff) {
      await rm(target, { recursive: true, force: true }).catch(() => {});
    }
  }
}
