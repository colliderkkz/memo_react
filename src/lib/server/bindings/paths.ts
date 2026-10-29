import path from "node:path";

/**
 * All runtime data lives under one directory (default: <project root>/data).
 * Override with MEMOS_DATA_DIR for scratch runs / tests.
 */
export const DATA_DIR: string = process.env.MEMOS_DATA_DIR
  ? path.resolve(process.env.MEMOS_DATA_DIR)
  : path.resolve(process.cwd(), "data");

export const DB_PATH: string = path.join(DATA_DIR, "db.sqlite");
export const R2_DIR: string = path.join(DATA_DIR, "r2");
export const MIGRATIONS_DIR: string = path.resolve(process.cwd(), "migrations");
