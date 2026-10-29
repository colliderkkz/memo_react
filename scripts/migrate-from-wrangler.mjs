// 一次性数据迁移：apps/memos/.wrangler/state/v3（miniflare D1/R2/KV）→ data/（db.sqlite + r2/）
// 用法（项目根目录，dev server 必须停止）：
//   node scripts/migrate-from-wrangler.mjs --dry-run   # 只打印将要迁移的内容
//   node scripts/migrate-from-wrangler.mjs             # 目标库已有备忘录时拒绝执行
//   node scripts/migrate-from-wrangler.mjs --force     # 清空目标后重灌
// 原始 .wrangler/state 全程只读（先复制副本再打开），迁移后可继续用旧应用回滚。
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const assert = {
  ok(cond, msg) {
    if (!cond) throw new Error("校验失败: " + msg);
  },
  equal(a, b, msg) {
    if (a !== b) throw new Error(`校验失败: ${msg} (${a} !== ${b})`);
  },
};

const STATE = path.resolve("apps/memos/.wrangler/state/v3");
const dryRun = process.argv.includes("--dry-run");
const force = process.argv.includes("--force");

if (!fs.existsSync(STATE)) {
  console.error(`找不到旧数据目录：${STATE}\n（请在项目根目录运行，且 apps/memos/.wrangler/state 仍存在）`);
  process.exit(1);
}

// ---- 打开源库（复制 .sqlite + -wal + -shm 三件套到临时目录后打开，绝不直开原文件） ----
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "memos-migrate-"));
const handles = [];

function findSqlite(dir) {
  const file = fs
    .readdirSync(dir)
    .find((f) => f.endsWith(".sqlite") && f !== "metadata.sqlite" && !f.includes("-shm") && !f.includes("-wal"));
  if (!file) throw new Error(`no sqlite file in ${dir}`);
  return path.join(dir, file);
}

function openCopy(srcFile) {
  const dst = path.join(tmp, path.basename(path.dirname(path.dirname(srcFile))) + "-" + path.basename(srcFile));
  for (const suf of ["", "-wal", "-shm"]) {
    if (fs.existsSync(srcFile + suf)) fs.copyFileSync(srcFile + suf, dst + suf);
  }
  const db = new DatabaseSync(dst);
  handles.push(db);
  return db;
}

const d1Src = openCopy(findSqlite(path.join(STATE, "d1/miniflare-D1DatabaseObject")));
const r2Src = openCopy(findSqlite(path.join(STATE, "r2/miniflare-R2BucketObject")));
const kvSrc = openCopy(findSqlite(path.join(STATE, "kv/miniflare-KVNamespaceObject")));

// R2 blob 文件目录：r2/<bucket-id>/blobs；KV blob 目录：kv/<namespace-id>/blobs
const r2BlobDir = fs
  .readdirSync(path.join(STATE, "r2"), { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== "miniflare-R2BucketObject")
  .map((d) => path.join(STATE, "r2", d.name, "blobs"))
  .find((p) => fs.existsSync(p));
const kvBlobDir = fs
  .readdirSync(path.join(STATE, "kv"), { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== "miniflare-KVNamespaceObject")
  .map((d) => path.join(STATE, "kv", d.name, "blobs"))
  .find((p) => fs.existsSync(p));
if (!r2BlobDir) throw new Error("找不到 R2 blob 目录");

// ---- 读取源数据 ----
const memoRows = d1Src.prepare("SELECT * FROM memos").all();
const r2Rows = r2Src.prepare("SELECT key, blob_id, size, http_metadata FROM _mf_objects").all();
const kvRows = kvSrc.prepare("SELECT key, blob_id, expiration FROM _mf_entries").all();
const now = Date.now();
const kvLive = kvRows.filter((r) => r.expiration == null || Number(r.expiration) > now);
const kvExpired = kvRows.length - kvLive.length;

console.log(
  `源数据：memos ${memoRows.length} 条 | R2 对象 ${r2Rows.length} 个 | KV ${kvLive.length} 条（跳过已过期 ${kvExpired} 条）`,
);
for (const r of r2Rows) console.log(`  r2: ${r.key} (${r.size}B)`);
for (const r of kvLive) console.log(`  kv: ${r.key}`);
if (dryRun) {
  console.log("--dry-run：未写入任何数据。");
  for (const db of handles) db.close();
  fs.rmSync(tmp, { recursive: true, force: true });
  process.exit(0);
}

// ---- 打开目标（bindings 会自动建库+跑迁移） ----
const { getEnv } = await import("../src/lib/server/bindings/index.ts");
const env = getEnv();

const existing = env.DB.prepare("SELECT COUNT(*) AS c FROM memos").get().c;
if (Number(existing) > 0 && !force) {
  console.error(`目标库已有 ${existing} 条备忘录。确认要覆盖请加 --force（会先清空 memos/kv/r2）。`);
  process.exit(1);
}
if (force) {
  env.DB.exec("DELETE FROM memos; DELETE FROM kv;");
  const { DATA_DIR } = await import("../src/lib/server/bindings/paths.ts");
  fs.rmSync(path.join(DATA_DIR, "r2"), { recursive: true, force: true });
  console.log("已清空目标 memos/kv/r2。");
}

// ---- 迁移 memos ----
const insert = env.DB.prepare(
  `INSERT OR REPLACE INTO memos (id, r2_key, tags_json, excerpt, created_at, updated_at, visibility, pinned, favorite, archived)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
);
env.DB.exec("BEGIN");
for (const r of memoRows) {
  insert.run(
    r.id, r.r2_key, r.tags_json, r.excerpt, r.created_at, r.updated_at,
    r.visibility, Number(r.pinned), Number(r.favorite), Number(r.archived),
  );
}
env.DB.exec("COMMIT");

// ---- 迁移 R2 对象（含 contentType sidecar） ----
for (const r of r2Rows) {
  const blobFile = path.join(r2BlobDir, String(r.blob_id));
  if (!fs.existsSync(blobFile)) throw new Error(`R2 blob 缺失：${r.key} → ${blobFile}`);
  const bytes = fs.readFileSync(blobFile);
  let contentType;
  try {
    contentType = JSON.parse(r.http_metadata ?? "{}").contentType;
  } catch {}
  await env.MEMOS_BUCKET.put(
    String(r.key),
    new Uint8Array(bytes),
    contentType ? { httpMetadata: { contentType } } : undefined,
  );
}

// ---- 迁移 KV ----
for (const r of kvLive) {
  if (!kvBlobDir || !r.blob_id) throw new Error(`KV blob 目录缺失，无法迁移 ${r.key}`);
  const blobFile = path.join(kvBlobDir, String(r.blob_id));
  if (!fs.existsSync(blobFile)) throw new Error(`KV blob 缺失：${r.key} → ${blobFile}`);
  const bytes = new Uint8Array(fs.readFileSync(blobFile));
  const ttl =
    r.expiration != null ? Math.max(1, Math.ceil((Number(r.expiration) - Date.now()) / 1000)) : undefined;
  await env.MEMOS_CACHE.put(String(r.key), bytes, ttl ? { expirationTtl: ttl } : undefined);
}

// ---- 校验 ----
const targetCount = Number(env.DB.prepare("SELECT COUNT(*) AS c FROM memos").get().c);
assert.equal(targetCount, memoRows.length, "memos 数量一致");
for (const r of r2Rows) {
  const head = await env.MEMOS_BUCKET.head(String(r.key));
  assert.ok(head, `R2 对象已迁移：${r.key}`);
  assert.equal(head.size, Number(r.size), `R2 大小一致：${r.key}`);
}
for (const r of kvLive) {
  assert.ok((await env.MEMOS_CACHE.get(String(r.key), "arrayBuffer")) !== null, `KV 已迁移：${r.key}`);
}

handles.push(env.DB);
for (const db of handles) {
  try { db.close(); } catch {}
}
fs.rmSync(tmp, { recursive: true, force: true });

console.log(`迁移完成：memos ${targetCount} 条，R2 ${r2Rows.length} 个，KV ${kvLive.length} 条。`);
