import { cache } from "react";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { env } from "@/lib/server/bindings/index.ts";
import { memoSummary, memoTitle, memoUrl, siteOrigin } from "@/lib/server/discovery/index.ts";
import { getMemo } from "@/lib/server/memos/index.ts";
import { SITE_NAME } from "@/lib/site.ts";
import { MarkdownContent } from "@/components/MarkdownContent.tsx";
import { MemoShareRedirect } from "./memo-share.tsx";

export const dynamic = "force-dynamic";

type RouteProps = { params: Promise<{ id: string }> };

async function requestOrigin(): Promise<URL> {
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const proto = headersList.get("x-forwarded-proto") ?? "http";
  return siteOrigin(new URL(`${proto}://${host}`));
}

const loadMemo = cache(async (id: string) => getMemo(env.DB, env.MEMOS_BUCKET, id));

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { id } = await params;
  const memo = await loadMemo(id);
  if (!memo) return {};

  if (memo.visibility === "private" || memo.archived) {
    return { robots: { index: false, follow: false } };
  }

  const origin = await requestOrigin();
  const canonical = memoUrl(origin, id);
  const description = memoSummary(memo.content);
  const title = memoTitle(memo.content);
  const imageVersion = encodeURIComponent(memo.updatedAt);
  const ogImage = new URL(`/api/memos/${id}/og?v=${imageVersion}`, origin).href;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "article",
      publishedTime: memo.createdAt,
      modifiedTime: memo.updatedAt,
      tags: memo.tags,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function MemoPage({ params }: RouteProps) {
  const { id } = await params;
  const memo = await loadMemo(id);
  if (!memo) notFound();

  const isPublic = memo.visibility === "public" && !memo.archived;
  const origin = await requestOrigin();
  const canonical = memoUrl(origin, id);
  const title = memoTitle(memo.content);
  const description = memoSummary(memo.content);
  const imageVersion = encodeURIComponent(memo.updatedAt);
  const ogImage = new URL(`/api/memos/${id}/og?v=${imageVersion}`, origin).href;

  const jsonLd = isPublic
    ? {
        "@context": "https://schema.org",
        "@type": "SocialMediaPosting",
        headline: title,
        description,
        url: canonical,
        mainEntityOfPage: canonical,
        datePublished: memo.createdAt,
        dateModified: memo.updatedAt,
        keywords: memo.tags,
        image: ogImage,
        articleBody: memo.content,
        isPartOf: { "@type": "WebSite", name: SITE_NAME, url: new URL("/", origin).href },
      }
    : null;

  return (
    <>
      {jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replaceAll("<", "\\u003c"),
          }}
        />
      ) : null}

      <main className="mx-auto max-w-2xl px-4 py-10">
        <article>
          <header className="mb-4 text-sm text-muted-foreground">
            <time dateTime={memo.createdAt}>{memo.createdAt.slice(0, 10)}</time>
            {memo.tags.length > 0 ? (
              <ul className="mt-1 flex flex-wrap gap-2" aria-label="Tags">
                {memo.tags.map((tag) => (
                  <li key={tag}>
                    <a href={`/?tags=${encodeURIComponent(tag)}`}>#{tag}</a>
                  </li>
                ))}
              </ul>
            ) : null}
          </header>
          <MarkdownContent content={memo.content} stripTags />
        </article>
        <nav className="mt-8 text-sm">
          <a href="/">← My Memos</a>
        </nav>
      </main>

      <MemoShareRedirect id={memo.id} />
    </>
  );
}
