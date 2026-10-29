import { stripHashtags } from "@/lib/utils/tags.ts";
import type { Memo, TagCount } from "@/lib/types.ts";
import { invalidateMemoOgCache } from "./cache";
import {
  deleteMemoRow,
  findMemoRow,
  insertMemoRow,
  listMemoIdsByTag,
  memoFromRow,
  queryTagCounts,
  updateMemoRow,
} from "./repository";
import { deleteMemoBody, readMemoBody, writeMemoBody } from "./storage";
import type { CreateMemoInput, UpdateMemoInput } from "./types";
import { MemoError } from "./types";
import { buildMemoR2Key, createMemoId, normalizeTags } from "./utils";
import type { MemoDatabase, MemoBucket, MemoCache } from "@/lib/server/bindings/types.ts";

export async function getMemo(d1: MemoDatabase, bucket: MemoBucket, id: string): Promise<Memo | null> {
  const row = await findMemoRow(d1, id);
  if (!row) return null;

  const memo = memoFromRow(row);
  memo.content = (await readMemoBody(bucket, row.r2Key)) ?? memo.content;
  return memo;
}

export async function listTagCounts(d1: MemoDatabase, publicOnly = false): Promise<TagCount[]> {
  return queryTagCounts(d1, publicOnly);
}

export async function createMemo(
  d1: MemoDatabase,
  bucket: MemoBucket,
  input: CreateMemoInput,
): Promise<Memo> {
  const now = new Date();
  const id = createMemoId(now);
  const tags = input.tags.length ? input.tags : normalizeTags(input.content);
  const r2Key = buildMemoR2Key(id, now);
  const content = input.content.trim();
  const nowIso = now.toISOString();

  await writeMemoBody(bucket, r2Key, content);
  await insertMemoRow(d1, {
    id,
    r2Key,
    tagsJson: tags,
    excerpt: content,
    createdAt: nowIso,
    updatedAt: nowIso,
    visibility: input.visibility,
    pinned: false,
    favorite: input.favorite,
    archived: false,
  });
  return {
    id,
    r2Key,
    content,
    tags,
    createdAt: nowIso,
    updatedAt: nowIso,
    visibility: input.visibility,
    pinned: false,
    favorite: input.favorite,
    archived: false,
  };
}

export async function updateMemo(
  d1: MemoDatabase,
  bucket: MemoBucket,
  cache: MemoCache,
  id: string,
  input: UpdateMemoInput,
): Promise<Memo> {
  const existing = await findMemoRow(d1, id);
  if (!existing) throw new MemoError("not_found", `Memo not found: ${id}`);

  const affectsOgImage = input.content !== undefined || input.tags !== undefined;
  if (affectsOgImage) await invalidateMemoOgCache(cache, id);
  const values: Parameters<typeof updateMemoRow>[2] = {};

  if (input.content !== undefined) {
    const content = input.content.trim();
    await writeMemoBody(bucket, existing.r2Key, content);
    values.excerpt = content;
    values.tagsJson = input.tags?.length ? input.tags : normalizeTags(content);
  } else if (input.tags !== undefined) {
    values.tagsJson = input.tags;
    const storedBody = await readMemoBody(bucket, existing.r2Key);
    if (storedBody !== null) {
      let body = stripHashtags(storedBody).trimEnd();
      if (input.tags.length > 0) {
        body += `\n\n${input.tags.map((tag) => `#${tag}`).join(" ")}`;
      }
      await writeMemoBody(bucket, existing.r2Key, body);
      values.excerpt = body;
    }
  }

  if (input.visibility !== undefined) values.visibility = input.visibility;
  if (input.pinned !== undefined) values.pinned = input.pinned;
  if (input.favorite !== undefined) values.favorite = input.favorite;
  if (input.archived !== undefined) values.archived = input.archived;
  values.updatedAt = new Date().toISOString();

  const updated = await updateMemoRow(d1, id, values);
  return memoFromRow(updated);
}

export async function deleteMemo(
  d1: MemoDatabase,
  bucket: MemoBucket,
  cache: MemoCache,
  id: string,
): Promise<void> {
  const existing = await findMemoRow(d1, id);
  if (!existing) throw new MemoError("not_found", `Memo not found: ${id}`);

  await invalidateMemoOgCache(cache, id);
  await deleteMemoRow(d1, id);
  await deleteMemoBody(bucket, existing.r2Key);
}

async function rewriteTagOnMemos(
  d1: MemoDatabase,
  bucket: MemoBucket,
  cache: MemoCache,
  tag: string,
  rewrite: (tags: string[]) => string[],
): Promise<number> {
  const ids = await listMemoIdsByTag(d1, tag);
  let updated = 0;
  for (const id of ids) {
    const row = await findMemoRow(d1, id);
    if (!row) continue;
    const nextTags = [...new Set(rewrite(row.tagsJson))];
    if (nextTags.join("\0") === row.tagsJson.join("\0")) continue;
    await updateMemo(d1, bucket, cache, id, { tags: nextTags });
    updated += 1;
  }
  return updated;
}

export async function renameTag(
  d1: MemoDatabase,
  bucket: MemoBucket,
  cache: MemoCache,
  from: string,
  to: string,
): Promise<number> {
  return rewriteTagOnMemos(d1, bucket, cache, from, (tags) =>
    tags.map((tag) => (tag.toLowerCase() === from.toLowerCase() ? to : tag)),
  );
}

export async function removeTag(
  d1: MemoDatabase,
  bucket: MemoBucket,
  cache: MemoCache,
  name: string,
): Promise<number> {
  return rewriteTagOnMemos(d1, bucket, cache, name, (tags) =>
    tags.filter((tag) => tag.toLowerCase() !== name.toLowerCase()),
  );
}
