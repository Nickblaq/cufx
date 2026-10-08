// lib/catalog/db.ts
import "server-only";
import fs from "node:fs";
import Database from "better-sqlite3";
import { CATALOG_DB_PATH } from "./paths";
import { CATALOG_DIR } from "@/lib/tmp";

export type CatalogDb = Database.Database;

// Cache the connection across HMR reloads in dev so we don't open a new
// handle (and re-run migrations) on every module reload.
const globalForDb = globalThis as unknown as { __cufxCatalogDb?: CatalogDb };

const MIGRATIONS: string[] = [
  // v1 — the catalog itself.
  `
  CREATE TABLE objects (
    id               TEXT PRIMARY KEY,
    hash             TEXT NOT NULL UNIQUE,
    name             TEXT NOT NULL,
    kind             TEXT NOT NULL,
    mime             TEXT,
    ext              TEXT NOT NULL DEFAULT '',
    size_bytes       INTEGER NOT NULL,
    duration_seconds REAL,
    width            INTEGER,
    height           INTEGER,
    origin           TEXT NOT NULL,
    url              TEXT,
    provider         TEXT,
    tool             TEXT,
    meta_json        TEXT NOT NULL DEFAULT '{}',
    blob_path        TEXT NOT NULL,
    created_at       INTEGER NOT NULL,
    updated_at       INTEGER NOT NULL
  );
  CREATE INDEX idx_objects_kind ON objects(kind);
  CREATE INDEX idx_objects_origin ON objects(origin);
  CREATE INDEX idx_objects_created ON objects(created_at DESC);

  CREATE TABLE edges (
    child_id  TEXT NOT NULL,
    parent_id TEXT NOT NULL,
    relation  TEXT NOT NULL DEFAULT 'derived_from',
    PRIMARY KEY (child_id, parent_id, relation)
  );
  CREATE INDEX idx_edges_parent ON edges(parent_id);
  `,
];

export function getCatalogDb(): CatalogDb {
  if (globalForDb.__cufxCatalogDb) return globalForDb.__cufxCatalogDb;

  fs.mkdirSync(CATALOG_DIR, { recursive: true });
  const db = new Database(CATALOG_DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);

  globalForDb.__cufxCatalogDb = db;
  return db;
}

function migrate(db: CatalogDb): void {
  const current = db.pragma("user_version", { simple: true }) as number;
  for (let v = current; v < MIGRATIONS.length; v++) {
    const run = db.transaction(() => {
      db.exec(MIGRATIONS[v]);
      db.pragma(`user_version = ${v + 1}`);
    });
    run();
  }
}
