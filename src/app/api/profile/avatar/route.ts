import { env } from "@/lib/server/bindings/index.ts";
import { AVATAR_R2_KEY } from "@/lib/server/profile.ts";
import { MAX_AVATAR_BYTES, extForContentType } from "@/lib/server/uploads.ts";

export const dynamic = "force-dynamic";

export async function GET() {
  const object = await env.MEMOS_BUCKET.get(AVATAR_R2_KEY);
  if (!object) {
    return Response.json({ error: "Avatar not set." }, { status: 404 });
  }

  return new Response(object.body, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType ?? "image/png",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "A file field named 'file' is required." }, { status: 400 });
  }
  if (!extForContentType(file.type)) {
    return Response.json(
      { error: "Only PNG, JPEG, GIF, WebP, and AVIF images are supported." },
      { status: 415 },
    );
  }
  if (file.size === 0 || file.size > MAX_AVATAR_BYTES) {
    return Response.json({ error: "头像需要是 5MB 以内的图片。" }, { status: 413 });
  }

  await env.MEMOS_BUCKET.put(AVATAR_R2_KEY, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
  });
  return Response.json({ url: "/api/profile/avatar" }, { status: 201 });
}

export async function DELETE() {
  await env.MEMOS_BUCKET.delete(AVATAR_R2_KEY);
  return Response.json({ ok: true });
}
