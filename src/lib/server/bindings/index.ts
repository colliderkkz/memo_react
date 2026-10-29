import { openDatabase } from "./db.ts";
import { SqliteKV } from "./kv.ts";
import { DB_PATH, MIGRATIONS_DIR, R2_DIR } from "./paths.ts";
import { FileSystemBucket } from "./r2.ts";
import type { MemoEnv } from "./types.ts";

const GLOBAL_KEY = Symbol.for("my-memos:env");

function createEnv(): MemoEnv {
  const DB = openDatabase(DB_PATH, MIGRATIONS_DIR);
  return {
    DB,
    MEMOS_BUCKET: new FileSystemBucket(R2_DIR),
    MEMOS_CACHE: new SqliteKV(DB),
  };
}

/** Lazy singleton (globalThis-guarded so dev hot reload never re-opens handles). */
export function getEnv(): MemoEnv {
  const holder = globalThis as unknown as Record<symbol, MemoEnv | undefined>;
  let env = holder[GLOBAL_KEY];
  if (!env) {
    env = createEnv();
    holder[GLOBAL_KEY] = env;
  }
  return env;
}

/**
 * Drop-in replacement for the old `import { env } from "cloudflare:workers"`:
 * property access is resolved lazily so merely importing this module never
 * touches the database.
 */
export const env: MemoEnv = new Proxy({} as MemoEnv, {
  get(_target, prop: string) {
    return getEnv()[prop as keyof MemoEnv];
  },
});
