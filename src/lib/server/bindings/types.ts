import type { DatabaseSync } from "node:sqlite";

/** Raw node:sqlite handle threaded through the server layer (was D1Database). */
export type MemoDatabase = DatabaseSync;

export interface BucketObject {
  key: string;
  /** Raw bytes; Uint8Array<ArrayBuffer> is directly Response-constructible. */
  body: Uint8Array<ArrayBuffer>;
  text(): Promise<string>;
  arrayBuffer(): Promise<ArrayBuffer>;
  httpMetadata?: { contentType?: string };
}

/** Minimal structural replacement for the R2Bucket surface the app uses. */
export interface MemoBucket {
  get(key: string): Promise<BucketObject | null>;
  put(
    key: string,
    value: string | ArrayBuffer | ArrayBufferView,
    opts?: { httpMetadata?: { contentType?: string } },
  ): Promise<void>;
  delete(key: string): Promise<void>;
  head(key: string): Promise<{ key: string; size: number } | null>;
}

export interface KVListPage {
  keys: { name: string }[];
  list_complete: boolean;
  cursor?: string;
}

/** Minimal structural replacement for the KVNamespace surface the app uses. */
export interface MemoCache {
  get(key: string): Promise<string | null>;
  get(key: string, type: "arrayBuffer"): Promise<ArrayBuffer | null>;
  put(
    key: string,
    value: string | ArrayBuffer | ArrayBufferView,
    opts?: { expirationTtl?: number },
  ): Promise<void>;
  delete(key: string): Promise<void>;
  list(opts?: { prefix?: string; cursor?: string; limit?: number }): Promise<KVListPage>;
}

export interface MemoEnv {
  DB: MemoDatabase;
  MEMOS_BUCKET: MemoBucket;
  MEMOS_CACHE: MemoCache;
}
