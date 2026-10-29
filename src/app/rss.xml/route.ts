import { env } from "@/lib/server/bindings/index.ts";
import {
  DISCOVERY_MEMO_LIMIT,
  createRssFeed,
  discoveryResponse,
  siteOrigin,
} from "@/lib/server/discovery/index.ts";
import { listPublicMemos } from "@/lib/server/memos/index.ts";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const memos = await listPublicMemos(env.DB, DISCOVERY_MEMO_LIMIT);
  return discoveryResponse(
    createRssFeed(memos, siteOrigin(new URL(request.url))),
    "application/rss+xml; charset=utf-8",
  );
}
