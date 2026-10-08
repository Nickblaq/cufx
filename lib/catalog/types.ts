// lib/catalog/types.ts
//
// The one data model every tool in cufx operates on. A "media object" is any
// piece of media the system has ever touched — user upload, downloaded media,
// or a processor byproduct — and it is a first-class citizen in a single
// shared catalog.
//
// `origin` records *how* the object entered the system, but nothing downstream
// branches on it: given a MediaObject, any tool can read from it and produce a
// new MediaObject that points back at it via `parents`.

export type MediaKind = "video" | "audio" | "image" | "subtitle" | "other";

/** How an object entered the catalog. */
export type ObjectOrigin = "upload" | "download" | "derived";

export type MediaObject = {
  /** Stable catalog id. */
  id: string;
  /** sha256 of the bytes — the identity key used for de-duplication. */
  hash: string;
  /** Display filename (extension included). */
  name: string;
  kind: MediaKind;
  mime: string | null;
  ext: string;
  sizeBytes: number;
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
  origin: ObjectOrigin;
  /** Source URL when the object was pulled from the internet. */
  url: string | null;
  /** Extractor/provider, e.g. "youtube". */
  provider: string | null;
  /** Tool that produced a derived object, e.g. "ffmpeg". */
  tool: string | null;
  /** Catalog ids of the objects this one was derived from. */
  parents: string[];
  /** Free-form extra metadata (probe results, extractor info, run params). */
  meta: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
};

/** Internal record — adds the on-disk location, never sent to clients. */
export type StoredMediaObject = MediaObject & { blobPath: string };

export type IngestInput = {
  data: Buffer;
  name: string;
  mime?: string | null;
  origin: ObjectOrigin;
  /** Override kind inference when the caller already knows. */
  kind?: MediaKind;
  durationSeconds?: number | null;
  width?: number | null;
  height?: number | null;
  url?: string | null;
  provider?: string | null;
  tool?: string | null;
  /** Parent object ids this object was derived from. */
  parents?: string[];
  meta?: Record<string, unknown>;
};

export type IngestFileInput = Omit<IngestInput, "data"> & {
  /** Absolute path to the source file; it is streamed, not buffered. */
  path: string;
};

export type CatalogFilter = {
  kind?: MediaKind;
  origin?: ObjectOrigin;
  /** Case-insensitive substring match against the object name. */
  search?: string;
  limit?: number;
};
