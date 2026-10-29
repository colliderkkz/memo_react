import { env } from "@/lib/server/bindings/index.ts";
import { UPLOAD_NAME_RE, contentTypeForName, uploadR2Key } from "@/lib/server/uploads.ts";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  if (!UPLOAD_NAME_RE.test(name)) {
    return Response.json({ error: "Upload not found." }, { status: 404 });
  }

  const object = await env.MEMOS_BUCKET.get(uploadR2Key(name));
  if (!object) {
    return Response.json({ error: "Upload not found." }, { status: 404 });
  }

  return new Response(object.body, {
    headers: {
      "Content-Type":
        object.httpMetadata?.contentType ?? contentTypeForName(name) ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
