import { env } from "@/lib/server/bindings/index.ts";
import {
  MAX_UPLOAD_BYTES,
  createUploadName,
  extForContentType,
  uploadR2Key,
} from "@/lib/server/uploads.ts";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "A file field named 'file' is required." }, { status: 400 });
  }

  const ext = extForContentType(file.type);
  if (!ext) {
    return Response.json(
      { error: "Only PNG, JPEG, GIF, WebP, and AVIF images are supported." },
      { status: 415 },
    );
  }
  if (file.size === 0) {
    return Response.json({ error: "The file is empty." }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return Response.json({ error: "Images must be 10 MB or smaller." }, { status: 413 });
  }

  const name = createUploadName(ext);
  await env.MEMOS_BUCKET.put(uploadR2Key(name), await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
  });

  return Response.json({ url: `/api/uploads/${name}` }, { status: 201 });
}
