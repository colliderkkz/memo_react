import { env } from "@/lib/server/bindings/index.ts";
import { removeTag, renameTag } from "@/lib/server/memos/index.ts";
import { z } from "zod";

export const dynamic = "force-dynamic";

// 与正文 #hashtag 的合法字符集保持一致（见 lib/utils/tags.ts 的 HASH_TAG_RE）
const TAG_NAME_RE = /^[\p{L}\p{N}_\-/]+$/u;
const MAX_TAG_LENGTH = 48;

const renameSchema = z.object({ name: z.string().trim().min(1).max(MAX_TAG_LENGTH) });

function normalizeTag(raw: string): string {
  return raw.trim().toLowerCase();
}

function invalidName(name: string): boolean {
  return name.length === 0 || name.length > MAX_TAG_LENGTH || !TAG_NAME_RE.test(name);
}

type RouteContext = { params: Promise<{ name: string[] }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const { name: segments } = await params;
  const from = normalizeTag(segments.join("/"));
  if (invalidName(from)) {
    return Response.json({ error: "Invalid tag name." }, { status: 400 });
  }

  const result = renameSchema.safeParse(await request.json().catch(() => null));
  if (!result.success) {
    return Response.json({ error: "A new tag name is required." }, { status: 400 });
  }

  const to = normalizeTag(result.data.name);
  if (invalidName(to)) {
    return Response.json({ error: "Invalid new tag name." }, { status: 400 });
  }
  if (to === from) {
    return Response.json({ error: "The new name is the same as the old one." }, { status: 400 });
  }

  const updated = await renameTag(env.DB, env.MEMOS_BUCKET, env.MEMOS_CACHE, from, to);
  return Response.json({ from, to, updated });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { name: segments } = await params;
  const name = normalizeTag(segments.join("/"));
  if (invalidName(name)) {
    return Response.json({ error: "Invalid tag name." }, { status: 400 });
  }

  const updated = await removeTag(env.DB, env.MEMOS_BUCKET, env.MEMOS_CACHE, name);
  return Response.json({ name, updated });
}
