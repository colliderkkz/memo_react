import { env } from "@/lib/server/bindings/index.ts";
import {
  createMemo,
  isValidMemoCursor,
  listMemos,
  memoDateSchema,
  memoSearchSchema,
} from "@/lib/server/memos/index.ts";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createMemoSchema = z.object({
  content: z.string().trim().min(1),
  visibility: z.enum(["public", "private"]).default("private"),
  tags: z.array(z.string()).default([]),
  favorite: z.boolean().default(false),
});

const listQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: memoSearchSchema.optional(),
  date: memoDateSchema.optional(),
  tags: z.string().optional(),
  publicOnly: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  archivedOnly: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  favoritesOnly: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  sortByUpdated: z
    .string()
    .optional()
    .transform((v) => v === "true"),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawParams = Object.fromEntries(url.searchParams.entries());
  const queryParams = listQuerySchema.safeParse(rawParams);
  if (!queryParams.success) {
    return Response.json({ error: "Invalid query parameters." }, { status: 400 });
  }

  const {
    cursor,
    limit,
    search,
    date,
    tags,
    publicOnly,
    archivedOnly,
    favoritesOnly,
    sortByUpdated,
  } = queryParams.data;
  if (cursor && !isValidMemoCursor(cursor)) {
    return Response.json({ error: "Invalid cursor." }, { status: 400 });
  }

  const tagList = tags
    ?.split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const memoPage = await listMemos(env.DB, {
    cursor,
    limit,
    search,
    date,
    tags: tagList,
    publicOnly,
    archivedOnly,
    favoritesOnly,
    sortByUpdated,
  });

  return Response.json(memoPage);
}

export async function POST(request: Request) {
  const result = createMemoSchema.safeParse(await request.json());

  if (!result.success) {
    const fields = new Set(result.error.issues.map((issue) => issue.path[0]));

    if (fields.has("content")) {
      return Response.json({ error: "Memo content is required." }, { status: 400 });
    }

    if (fields.has("visibility")) {
      return Response.json({ error: "Memo visibility is invalid." }, { status: 400 });
    }

    return Response.json({ error: "Memo tags are invalid." }, { status: 400 });
  }

  const memo = await createMemo(env.DB, env.MEMOS_BUCKET, result.data);

  return Response.json({ memo }, { status: 201 });
}
