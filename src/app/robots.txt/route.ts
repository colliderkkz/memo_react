import {
  createRobotsText,
  discoveryResponse,
  siteOrigin,
} from "@/lib/server/discovery/index.ts";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return discoveryResponse(
    createRobotsText(siteOrigin(new URL(request.url))),
    "text/plain; charset=utf-8",
  );
}
