import { env } from "@/lib/server/bindings/index.ts";
import { AVATAR_R2_KEY, getProfileName } from "@/lib/server/profile.ts";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

/**
 * Local single-user build: every request is the owner. Mirrors the old
 * hooks.server.ts locals.user (profile name from KV, avatar existence from R2).
 */
export async function getCurrentUser(): Promise<CurrentUser> {
  const [name, avatar] = await Promise.all([
    getProfileName(env.MEMOS_CACHE),
    env.MEMOS_BUCKET.head(AVATAR_R2_KEY).catch(() => null),
  ]);

  return {
    id: "local-owner",
    name,
    email: "owner@local",
    image: avatar ? "/api/profile/avatar" : null,
  };
}
