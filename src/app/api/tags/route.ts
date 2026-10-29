import { env } from "@/lib/server/bindings/index.ts";
import { listTagCounts } from "@/lib/server/memos/index.ts";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ tags: await listTagCounts(env.DB) });
}
