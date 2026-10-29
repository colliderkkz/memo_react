import type { DatabaseSync } from "node:sqlite";
import { toBytes } from "./r2.ts";
import type { KVListPage, MemoCache } from "./types.ts";

/**
 * SQLite-backed replacement for the KV namespace (table `kv` in the main
 * database). A file-per-key layout is not viable on Windows because KV keys
 * contain colons (NTFS alternate data streams).
 */
export class SqliteKV implements MemoCache {
  db: DatabaseSync;

  constructor(db: DatabaseSync) {
    this.db = db;
  }

  async get(key: string): Promise<string | null>;
  async get(key: string, type: "arrayBuffer"): Promise<ArrayBuffer | null>;
  async get(key: string, type?: "arrayBuffer"): Promise<string | ArrayBuffer | null> {
    const row = this.db
      .prepare("SELECT value FROM kv WHERE key = ? AND (expires_at IS NULL OR expires_at > ?)")
      .get(key, Date.now()) as { value: Uint8Array } | undefined;
    if (!row) return null;
    const bytes = row.value;
    if (type === "arrayBuffer") {
      return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    }
    return Buffer.from(bytes).toString("utf8");
  }

  async put(
    key: string,
    value: string | ArrayBuffer | ArrayBufferView,
    opts?: { expirationTtl?: number },
  ): Promise<void> {
    const bytes = toBytes(value);
    const expiresAt =
      opts?.expirationTtl != null ? Date.now() + opts.expirationTtl * 1000 : null;
    this.db
      .prepare(
        `INSERT INTO kv (key, value, expires_at) VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, expires_at = excluded.expires_at`,
      )
      .run(key, bytes, expiresAt);
  }

  async delete(key: string): Promise<void> {
    this.db.prepare("DELETE FROM kv WHERE key = ?").run(key);
  }

  async list(opts?: { prefix?: string; cursor?: string; limit?: number }): Promise<KVListPage> {
    const limit = Math.max(1, Math.min(opts?.limit ?? 1000, 1000));
    const escaped = (opts?.prefix ?? "").replace(/[\\%_]/g, (m) => `\\${m}`);
    const cursor = opts?.cursor ?? null;
    const rows = this.db
      .prepare(
        `SELECT key FROM kv
         WHERE (expires_at IS NULL OR expires_at > ?)
           AND key LIKE ? ESCAPE '\\'
           AND (? IS NULL OR key > ?)
         ORDER BY key
         LIMIT ?`,
      )
      .all(Date.now(), `${escaped}%`, cursor, cursor, limit) as { key: string }[];
    const keys = rows.map((row) => ({ name: row.key }));
    return {
      keys,
      list_complete: keys.length < limit,
      ...(keys.length > 0 ? { cursor: keys[keys.length - 1]!.name } : {}),
    };
  }
}
