import { deleteMemoOgImagesKv } from "@/lib/server/og/cache.ts";
import type { MemoCache } from "@/lib/server/bindings/types.ts";

export async function invalidateMemoOgCache(cache: MemoCache, id: string): Promise<void> {
  await deleteMemoOgImagesKv(cache, id);
}
