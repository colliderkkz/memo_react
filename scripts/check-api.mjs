// API 冒烟矩阵：node scripts/check-api.mjs  （需要 dev server 在 :3000 运行）
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.SMOKE_BASE ?? "http://localhost:3000";
const PNG_1PX =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

async function json(method, url, body, expectStatus) {
  const res = await fetch(BASE + url, {
    method,
    ...(body !== undefined
      ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
      : {}),
  });
  if (expectStatus != null) assert.equal(res.status, expectStatus, `${method} ${url} status`);
  return { res, data: res.status === 204 ? null : await res.json().catch(() => null) };
}

// 1) empty-ish list
const list0 = await json("GET", "/api/memos", undefined, 200);
assert.ok(Array.isArray(list0.data.memos), "list shape");

// 2) create
const created = await json(
  "POST",
  "/api/memos",
  { content: "smoke test memo #smoketag\n\nbody line", visibility: "public", tags: ["smoketag"] },
  201,
);
const id = created.data.memo.id;
assert.equal(created.data.memo.tags[0], "smoketag");
console.log("created memo", id);

// 3) get single + r2 file exists
const got = await json("GET", `/api/memos/${id}`, undefined, 200);
assert.ok(got.data.memo.content.includes("smoke test memo"));
const r2File = path.join("data", "r2", got.data.memo.r2Key.replaceAll("/", path.sep));
assert.ok(fs.existsSync(r2File), "r2 body file exists");

// 4) patch pinned/favorite/visibility
const patched = await json("PATCH", `/api/memos/${id}`, { pinned: true, favorite: true }, 200);
assert.equal(patched.data.memo.pinned, true);
assert.equal(patched.data.memo.favorite, true);

// 5) tags list + rename + body rewrite
const tags1 = await json("GET", "/api/tags", undefined, 200);
assert.ok(tags1.data.tags.some((t) => t.name === "smoketag"), "tag listed");
const renamed = await json("PATCH", "/api/tags/smoketag", { name: "renamedtag" }, 200);
assert.equal(renamed.data.updated >= 1, true, "rename updated >=1");
const afterRename = await json("GET", `/api/memos/${id}`, undefined, 200);
assert.ok(afterRename.data.memo.content.includes("#renamedtag"), "body hashtag rewritten");
assert.ok(!fs.readFileSync(r2File, "utf8").includes("#smoketag"), "r2 file rewritten");

// 6) uploads
const form = new FormData();
form.append(
  "file",
  new File([Buffer.from(PNG_1PX, "base64")], "px.png", { type: "image/png" }),
);
const upRes = await fetch(BASE + "/api/uploads", { method: "POST", body: form });
assert.equal(upRes.status, 201);
const { url: uploadUrl } = await upRes.json();
const upGet = await fetch(BASE + uploadUrl);
assert.equal(upGet.status, 200);
assert.equal(upGet.headers.get("content-type"), "image/png");
assert.equal(Buffer.from(await upGet.arrayBuffer()).toString("base64"), PNG_1PX);
// reject wrong type
const badForm = new FormData();
badForm.append("file", new File(["hello"], "x.txt", { type: "text/plain" }));
assert.equal((await fetch(BASE + "/api/uploads", { method: "POST", body: badForm })).status, 415);

// 7) quote
await json("PUT", "/api/settings/quote", { text: "stay hungry" }, 200);
assert.equal((await json("GET", "/api/settings/quote", undefined, 200)).data.text, "stay hungry");
await json("DELETE", "/api/settings/quote", undefined, 200);
assert.equal((await json("GET", "/api/settings/quote", undefined, 200)).data.text, null);

// 8) profile + avatar（先保存原名字，测完恢复，避免污染真实数据）
const originalProfile = (await json("GET", "/api/profile", undefined, 200)).data.name;
await json("PUT", "/api/profile", { name: "Smoke Owner" }, 200);
const prof = await json("GET", "/api/profile", undefined, 200);
assert.equal(prof.data.name, "Smoke Owner");
assert.equal(prof.data.avatarUrl, null);
const avForm = new FormData();
avForm.append("file", new File([Buffer.from(PNG_1PX, "base64")], "a.png", { type: "image/png" }));
assert.equal((await fetch(BASE + "/api/profile/avatar", { method: "POST", body: avForm })).status, 201);
const avGet = await fetch(BASE + "/api/profile/avatar");
assert.equal(avGet.status, 200);
assert.equal(avGet.headers.get("content-type"), "image/png");
assert.equal((await json("GET", "/api/profile", undefined, 200)).data.avatarUrl, "/api/profile/avatar");
assert.equal((await fetch(BASE + "/api/profile/avatar", { method: "DELETE" })).status, 200);
assert.equal((await fetch(BASE + "/api/profile/avatar")).status, 404);

// 9) OG image (svg + png)
const svg = await fetch(BASE + `/api/memos/${id}/og?format=svg`);
assert.equal(svg.status, 200);
const svgText = await svg.text();
assert.ok(svgText.includes("<svg"), "og svg");
const png = await fetch(BASE + `/api/memos/${id}/og`);
assert.equal(png.status, 200);
const pngBytes = Buffer.from(await png.arrayBuffer());
assert.equal(pngBytes.subarray(0, 4).toString("hex"), "89504e47", "og png magic");
// warm cache hit
const png2 = await fetch(BASE + `/api/memos/${id}/og`);
assert.equal(png2.status, 200);

// 10) discovery feeds
const rss = await fetch(BASE + "/rss.xml");
assert.equal(rss.status, 200);
assert.ok((await rss.text()).includes("<rss"), "rss");
const sitemap = await fetch(BASE + "/sitemap.xml");
assert.ok((await sitemap.text()).includes("/memo/"), "sitemap contains memo url");
assert.equal((await fetch(BASE + "/robots.txt")).status, 200);
assert.equal((await fetch(BASE + "/llms.txt")).status, 404, "llms.txt removed");

// 11) favicon redirect
const fav = await fetch(BASE + "/favicon.ico", { redirect: "manual" });
assert.ok([301, 308].includes(fav.status), `favicon redirect got ${fav.status}`);

// 12) memo share page (SSR shell will 404 until Phase F; API-level check only)
// 13) delete memo → r2 file + og cache gone
await json("DELETE", `/api/memos/${id}`, undefined, 204);
assert.equal((await fetch(BASE + `/api/memos/${id}`)).status, 404);
assert.ok(!fs.existsSync(r2File), "r2 body deleted");
assert.ok(!fs.existsSync(r2File + ".meta.json"), "sidecar deleted");

// 14) delete tag cleanup
const removed = await json("DELETE", "/api/tags/renamedtag", undefined, 200);
assert.ok(removed.data.updated >= 0);

// 15) restore original profile name
await json("PUT", "/api/profile", { name: originalProfile }, 200);

console.log("API smoke matrix OK");
