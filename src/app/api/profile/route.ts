import { env } from "@/lib/server/bindings/index.ts";
import { AVATAR_R2_KEY, getProfileName, setProfileName } from "@/lib/server/profile.ts";
import { z } from "zod";

export const dynamic = "force-dynamic";

const profileSchema = z.object({ name: z.string().trim().min(1).max(40) });

export async function GET() {
  const name = await getProfileName(env.MEMOS_CACHE);
  const avatar = await env.MEMOS_BUCKET.head(AVATAR_R2_KEY).catch(() => null);
  return Response.json({ name, avatarUrl: avatar ? "/api/profile/avatar" : null });
}

export async function PUT(request: Request) {
  const result = profileSchema.safeParse(await request.json().catch(() => null));
  if (!result.success) {
    return Response.json({ error: "名字需要 1-40 个字符。" }, { status: 400 });
  }

  await setProfileName(env.MEMOS_CACHE, result.data.name);
  return Response.json({ name: result.data.name });
}
