// lib/ff/assets.ts
//
// Upload storage now lives in the shared catalog. An uploaded file is just a
// MediaObject with origin "upload": the bytes are content-addressed once, and
// every tool (ffmpeg pipelines here, the catalog browser, future tools) sees
// the same object. `loadAsset` rehydrates the shape the ffmpeg translator
// expects from that record.
import "server-only";
import fs from "node:fs";
import { execFile } from "node:child_process";
import {
  ingestObject,
  getStoredObject,
  objectFilePath,
  setObjectDuration,
} from "@/lib/catalog/store";
import type { MediaKind } from "@/lib/catalog/types";

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

function clampKind(kind: MediaKind): AssetKind {
  return kind === "audio" || kind === "image" ? kind : "video";
}

function formatDuration(seconds: number | null | undefined): string | undefined {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return undefined;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

function probeDurationSeconds(filePath: string): Promise<number | null> {
  return new Promise((resolve) => {
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
        if (err) return resolve(null);
        const secs = parseFloat(stdout.toString().trim());
        resolve(Number.isFinite(secs) && secs > 0 ? secs : null);
      }
    );
  });
}

export async function saveAsset(
  fileBuffer: Buffer,
  originalName: string,
  mime: string
): Promise<StoredAsset> {
  const safe = originalName.replace(/[^\w.\- ]+/g, "_").slice(0, 180) || "upload";

  const object = await ingestObject({
    data: fileBuffer,
    name: safe,
    mime: mime || null,
    origin: "upload",
    tool: "upload",
  });

  let duration = object.durationSeconds;
  if (duration == null) {
    const filePath = objectFilePath(object.id);
    if (filePath) {
      const secs = await probeDurationSeconds(filePath);
      if (secs != null) {
        setObjectDuration(object.id, secs);
        duration = secs;
      }
    }
  }

  return {
    id: object.id,
    name: object.name,
    kind: clampKind(object.kind),
    sizeBytes: object.sizeBytes,
    path: objectFilePath(object.id) ?? "",
    duration: formatDuration(duration),
  };
}

export async function loadAsset(id: string): Promise<StoredAsset | null> {
  const stored = getStoredObject(id);
  if (!stored) return null;

  const filePath = objectFilePath(id);
  if (!filePath || !fs.existsSync(filePath)) return null;

  return {
    id: stored.id,
    name: stored.name,
    kind: clampKind(stored.kind),
    sizeBytes: stored.sizeBytes,
    path: filePath,
    duration: formatDuration(stored.durationSeconds),
  };
}
