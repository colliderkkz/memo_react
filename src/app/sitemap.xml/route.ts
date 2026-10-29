import { env } from "@/lib/server/bindings/index.ts";
import {
  DISCOVERY_MEMO_LIMIT,
  createSitemap,
  discoveryResponse,
  siteOrigin,
} from "@/lib/server/discovery/index.ts";
import { listPublicMemos } from "@/lib/server/memos/index.ts";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const memos = await listPublicMemos(env.DB, DISCOVERY_MEMO_LIMIT);
  return discoveryResponse(
    createSitemap(memos, siteOrigin(new URL(request.url))),
    "application/xml; charset=utf-8",
  );
}
