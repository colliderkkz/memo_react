// 存储层自检脚本：node scripts/check-bindings.mjs
// 在临时目录里跑通 建库迁移 / memos 插入读取 / R2 往返+sidecar+穿越防护 / KV TTL+list 游标。
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "memos-bindings-"));
process.env.MEMOS_DATA_DIR = tmp;

const { getEnv } = await import("../src/lib/server/bindings/index.ts");
const env = getEnv();

// 1) migrations applied
const tables = env.DB.prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
  .all()
  .map((r) => r.name);
for (const t of ["memos", "kv", "_migrations"]) {
  assert.ok(tables.includes(t), `table ${t} exists`);
}

// 2) memo row roundtrip
env.DB.prepare(
  `INSERT INTO memos (id, r2_key, tags_json, excerpt, created_at, updated_at, visibility, pinned, favorite, archived)
   VALUES ('t1', 'memos/2026/01/t1.md', '["a"]', 'hi', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z', 'public', 0, 0, 0)`,
).run();
const row = env.DB.prepare("SELECT id, excerpt FROM memos WHERE id = 't1'").get();
assert.equal(row.excerpt, "hi");

// 3) R2 roundtrip + sidecar + binary + delete + traversal guard
await env.MEMOS_BUCKET.put("memos/2026/01/t1.md", "# hello", {
  httpMetadata: { contentType: "text/markdown; charset=utf-8" },
});
const obj = await env.MEMOS_BUCKET.get("memos/2026/01/t1.md");
assert.equal(await obj.text(), "# hello");
assert.equal(obj.httpMetadata?.contentType, "text/markdown; charset=utf-8");
assert.ok(await env.MEMOS_BUCKET.head("memos/2026/01/t1.md"));

await env.MEMOS_BUCKET.put("uploads/binary.bin", new Uint8Array([1, 2, 3]));
const bin = await env.MEMOS_BUCKET.get("uploads/binary.bin");
assert.deepEqual(Array.from(bin.body), [1, 2, 3]);
assert.equal(bin.httpMetadata, undefined);

await env.MEMOS_BUCKET.delete("memos/2026/01/t1.md");
assert.equal(await env.MEMOS_BUCKET.get("memos/2026/01/t1.md"), null);
assert.equal(await env.MEMOS_BUCKET.head("memos/2026/01/t1.md"), null);

await assert.rejects(() => env.MEMOS_BUCKET.get("../escape.txt"), /Invalid bucket key/);
await assert.rejects(() => env.MEMOS_BUCKET.put("a\\b.txt", "x"), /Invalid bucket key/);

// 4) KV: string + arrayBuffer + TTL + list cursor + delete
await env.MEMOS_CACHE.put("settings:quote", "stay hungry");
assert.equal(await env.MEMOS_CACHE.get("settings:quote"), "stay hungry");

await env.MEMOS_CACHE.put("memo-og:1:now:png", new Uint8Array([0x89, 0x50]).buffer, {
  expirationTtl: 3600,
});
const buf = await env.MEMOS_CACHE.get("memo-og:1:now:png", "arrayBuffer");
assert.deepEqual(Array.from(new Uint8Array(buf)), [0x89, 0x50]);

await env.MEMOS_CACHE.put("expired:key", "gone", { expirationTtl: -1 });
assert.equal(await env.MEMOS_CACHE.get("expired:key"), null);

await env.MEMOS_CACHE.put("memo-og:1:old:png", new Uint8Array([1]).buffer, {
  expirationTtl: 3600,
});
await env.MEMOS_CACHE.put("memo-og:2:x:png", new Uint8Array([2]).buffer, { expirationTtl: 3600 });

const page1 = await env.MEMOS_CACHE.list({ prefix: "memo-og:", limit: 2 });
assert.equal(page1.keys.length, 2);
assert.equal(page1.list_complete, false);
const page2 = await env.MEMOS_CACHE.list({ prefix: "memo-og:", cursor: page1.cursor, limit: 2 });
assert.equal(page2.keys.length, 1);
assert.equal(page2.list_complete, true);

await env.MEMOS_CACHE.delete("settings:quote");
assert.equal(await env.MEMOS_CACHE.get("settings:quote"), null);

env.DB.close();
fs.rmSync(tmp, { recursive: true, force: true });
console.log("bindings OK: migrations, memos roundtrip, R2 (+sidecar/guard), KV (ttl/list-cursor)");
