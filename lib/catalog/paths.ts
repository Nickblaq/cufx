// lib/catalog/paths.ts
import "server-only";
import path from "node:path";

/**
 * One durable location for everything the catalog owns:
 *   - catalog.db         the SQLite index
 *   - blobs/<aa>/<hash>  the content-addressed bytes
 *
 * Defaults to .cufx-data at the project root (gitignored). Set CUFX_DATA_DIR
 * to point at a mounted volume in production.
 */
export const DATA_DIR =
  process.env.CUFX_DATA_DIR && process.env.CUFX_DATA_DIR.trim()
    ? process.env.CUFX_DATA_DIR.trim()
    : path.join(process.cwd(), ".cufx-data");

export const CATALOG_DB_PATH = path.join(DATA_DIR, "catalog.db");
export const BLOBS_DIR = path.join(DATA_DIR, "blobs");

export function blobRelPath(hash: string, ext: string): string {
  return path.join("blobs", hash.slice(0, 2), ext ? `${hash}.${ext}` : hash);
}

export function resolveBlob(relPath: string): string {
  return path.join(DATA_DIR, relPath);
}
