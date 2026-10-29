import type { MemoCache } from "@/lib/server/bindings/types.ts";
export const PROFILE_KEY = "settings:profile";
export const AVATAR_R2_KEY = "profile/avatar";
export const DEFAULT_PROFILE_NAME = "Owner";

export async function getProfileName(cache: MemoCache): Promise<string> {
  const raw = await cache.get(PROFILE_KEY).catch(() => null);
  if (!raw) return DEFAULT_PROFILE_NAME;
  try {
    const parsed = JSON.parse(raw) as { name?: unknown };
    return typeof parsed.name === "string" && parsed.name.trim()
      ? parsed.name
      : DEFAULT_PROFILE_NAME;
  } catch {
    return DEFAULT_PROFILE_NAME;
  }
}

export async function setProfileName(cache: MemoCache, name: string): Promise<void> {
  await cache.put(PROFILE_KEY, JSON.stringify({ name }));
}
