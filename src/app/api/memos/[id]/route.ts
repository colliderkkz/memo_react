import { env } from "@/lib/server/bindings/index.ts";
import { MemoError, deleteMemo, getMemo, updateMemo } from "@/lib/server/memos/index.ts";
import type { UpdateMemoInput } from "@/lib/server/memos/types.ts";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateMemoSchema = z.object({
  content: z.string().trim().min(1).optional(),
  visibility: z.enum(["public", "private"]).optional(),
  tags: z.array(z.string()).optional(),
  pinned: z.boolean().optional(),
  favorite: z.boolean().optional(),
  archived: z.boolean().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const memo = await getMemo(env.DB, env.MEMOS_BUCKET, id);
  return memo
    ? Response.json({ memo })
    : Response.json({ error: "Memo not found." }, { status: 404 });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;

  const result = updateMemoSchema.safeParse(await request.json());

  if (!result.success) {
    const fields = new Set(result.error.issues.map((issue) => issue.path[0]));

    if (fields.has("content")) {
      return Response.json({ error: "Memo content cannot be empty." }, { status: 400 });
    }

    if (fields.has("visibility")) {
      return Response.json({ error: "Memo visibility is invalid." }, { status: 400 });
    }

    if (fields.has("tags")) {
      return Response.json({ error: "Memo tags are invalid." }, { status: 400 });
    }

    return Response.json({ error: "Memo update payload is invalid." }, { status: 400 });
  }

  const input: UpdateMemoInput = result.data;

  try {
    const memo = await updateMemo(env.DB, env.MEMOS_BUCKET, env.MEMOS_CACHE, id, input);
    return Response.json({ memo });
  } catch (error) {
    if (!(error instanceof MemoError)) throw error;
    return Response.json({ error: error.message }, { status: 404 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id } = await params;

  try {
    await deleteMemo(env.DB, env.MEMOS_BUCKET, env.MEMOS_CACHE, id);
    return new Response(null, { status: 204 });
  } catch (error) {
    if (!(error instanceof MemoError)) throw error;
    return Response.json({ error: error.message }, { status: 404 });
  }
}
