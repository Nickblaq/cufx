// lib/ff/assets.ts
import "server-only";
import fs_promises from "node:fs/promises";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";

const ASSETS_ROOT = path.join(os.tmpdir(), "cufx-assets");

export type AssetKind = "video" | "audio" | "image";

export type StoredAsset = {
  id: string;
  name: string;
  kind: AssetKind;
  sizeBytes: number;
  path: string;
  duration?: string;
  meta?: string;
};

const META_FILENAME = "asset.json";

function assetDir(id: string) {
  return path.join(ASSETS_ROOT, id);
}

function kindFromMime(mime: string, fallbackName: string): AssetKind {
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("image/")) return "image";
  const ext = fallbackName.split(".").pop()?.toLowerCase() ?? "";
  if (["mp4", "mkv", "webm", "mov", "avi", "m4v"].includes(ext)) return "video";
  if (["mp3", "m4a", "aac", "wav", "flac", "opus", "ogg"].includes(ext)) return "audio";
  if (["jpg", "jpeg", "png", "webp", "gif", "bmp"].includes(ext)) return "image";
  return "video";
}

export async function saveAsset(
  fileBuffer: Buffer,
  originalName: string,
  mime: string
): Promise<StoredAsset> {
  const id = randomUUID();
  const dir = assetDir(id);
  await fs_promises.mkdir(dir, { recursive: true });

  const safe = originalName.replace(/[^\w.\- ]+/g, "_").slice(0, 180) || "upload";
  const filePath = path.join(dir, safe);
  await fs_promises.writeFile(filePath, fileBuffer);

  const kind = kindFromMime(mime, safe);
  const duration = await probeDuration(filePath).catch(() => undefined);

  const asset: StoredAsset = {
    id,
    name: safe,
    kind,
    sizeBytes: fileBuffer.byteLength,
    path: filePath,
    duration,
  };

  await fs_promises.writeFile(
    path.join(dir, META_FILENAME),
    JSON.stringify(asset)
  );

  return asset;
}

export async function loadAsset(id: string): Promise<StoredAsset | null> {
  try {
    const raw = await fs_promises.readFile(
      path.join(assetDir(id), META_FILENAME),
      "utf8"
    );
    const parsed = JSON.parse(raw) as StoredAsset;
    if (!fs.existsSync(parsed.path)) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function probeDuration(filePath: string): Promise<string | undefined> {
  return new Promise((resolve) => {
    const { execFile } = require("node:child_process") as typeof import("node:child_process");
    execFile(
      "ffprobe",
      [
        "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        filePath,
      ],
      { timeout: 15_000 },
      (err, stdout) => {
        if (err) return resolve(undefined);
        const secs = parseFloat(stdout.toString().trim());
        if (!Number.isFinite(secs) || secs <= 0) return resolve(undefined);
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        const s = Math.floor(secs % 60);
        resolve(
          h > 0
            ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
            : `${m}:${String(s).padStart(2, "0")}`
        );
      }
    );
  });
}
