import { parseFeed } from "feedsmith";
import { db, schema } from "../db";
import { eq, sql } from "drizzle-orm";

interface FetchResult {
  feedId: number;
  title?: string;
  description?: string;
  siteUrl?: string;
  items: ParsedItem[];
  notModified: boolean;
}

interface ParsedItem {
  guid: string;
  url?: string;
  title?: string;
  author?: string;
  content?: string;
  summary?: string;
  publishedAt?: string;
  thumbnailUrl?: string;
}

/**
 * Fetch a feed URL with conditional GET support (ETag/Last-Modified).
 * Returns parsed items ready for storage.
 */
export async function fetchFeed(feed: {
  id: number;
  url: string;
  etag: string | null;
  lastModified: string | null;
}): Promise<FetchResult> {
  const headers: Record<string, string> = {
    "User-Agent": "JFDI Reader/0.1 (+https://jfdi.bot/reader)",
    Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, application/json",
  };

  if (feed.etag) headers["If-None-Match"] = feed.etag;
  if (feed.lastModified) headers["If-Modified-Since"] = feed.lastModified;

  const response = await fetch(feed.url, { headers, signal: AbortSignal.timeout(15000) });

  if (response.status === 304) {
    return { feedId: feed.id, items: [], notModified: true };
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const body = await response.text();
  const { format, feed: parsed } = parseFeed(body);

  // Normalize across RSS/Atom/RDF/JSON formats
  const items = normalizeItems(format, parsed);
  const meta = normalizeMeta(format, parsed);

  // Update feed metadata + caching headers
  const newEtag = response.headers.get("etag");
  const newLastModified = response.headers.get("last-modified");

  await db
    .update(schema.feeds)
    .set({
      title: meta.title || undefined,
      description: meta.description || undefined,
      siteUrl: meta.siteUrl || undefined,
      etag: newEtag,
      lastModified: newLastModified,
      lastFetchedAt: new Date().toISOString(),
      lastPublishedAt: meta.lastPublishedAt || undefined,
      errorCount: 0,
      lastError: null,
    })
    .where(eq(schema.feeds.id, feed.id));

  return { feedId: feed.id, items, notModified: false, ...meta };
}

function normalizeMeta(format: string, parsed: any): {
  title?: string;
  description?: string;
  siteUrl?: string;
  lastPublishedAt?: string;
} {
  if (format === "json") {
    return {
      title: parsed.title,
      description: parsed.description,
      siteUrl: parsed.home_page_url,
    };
  }
  // RSS, Atom, RDF - feedsmith puts metadata directly on the feed object
  return {
    title: parsed.title,
    description: parsed.description || parsed.subtitle,
    siteUrl: typeof parsed.link === "string" ? parsed.link : parsed.link?.href,
    lastPublishedAt: parsed.pubDate || parsed.lastBuildDate || parsed.updated,
  };
}

function normalizeItems(format: string, parsed: any): ParsedItem[] {
  let rawItems: any[];

  if (format === "json") {
    rawItems = parsed.items || [];
  } else if (format === "rss") {
    // feedsmith puts RSS items directly on feed.items
    rawItems = parsed.items || [];
  } else if (format === "atom") {
    rawItems = parsed.entries || [];
  } else if (format === "rdf") {
    rawItems = parsed.items || [];
  } else {
    rawItems = [];
  }

  return rawItems.map((item: any) => normalizeItem(format, item)).filter(Boolean);
}

function normalizeItem(format: string, item: any): ParsedItem | null {
  if (format === "json") {
    return {
      guid: item.id || item.url || "",
      url: item.url || item.external_url,
      title: item.title,
      author: item.authors?.[0]?.name,
      content: item.content_html || item.content_text,
      summary: item.summary,
      publishedAt: item.date_published,
      thumbnailUrl: item.image,
    };
  }

  // RSS - feedsmith shapes:
  // guid: { value, isPermaLink } or string
  // content: { encoded } (from content:encoded)
  // dc: { creator } (from dc:creator)
  // media: { contents: [{ url }] } (from media:content)
  if (format === "rss") {
    const guid = typeof item.guid === "object" ? item.guid?.value : item.guid;
    return {
      guid: guid || item.link || "",
      url: item.link,
      title: item.title,
      author: item.author || item.dc?.creator,
      content: item.content?.encoded || item.description,
      summary: item.description,
      publishedAt: item.pubDate,
      thumbnailUrl: item.enclosure?.url || item.media?.contents?.[0]?.url,
    };
  }

  // Atom
  if (format === "atom") {
    const link = Array.isArray(item.links)
      ? item.links.find((l: any) => l.rel === "alternate")?.href || item.links[0]?.href
      : item.link?.href || item.link;

    return {
      guid: item.id || link || "",
      url: link,
      title: item.title,
      author: item.authors?.[0]?.name || item.author?.name,
      content: item.content?.value || (typeof item.content === "string" ? item.content : undefined),
      summary: item.summary?.value || (typeof item.summary === "string" ? item.summary : undefined),
      publishedAt: item.published || item.updated,
      thumbnailUrl: item.links?.find((l: any) => l.rel === "enclosure")?.href,
    };
  }

  // RDF
  return {
    guid: item.link || item.dc?.identifier || "",
    url: item.link,
    title: item.title,
    author: item.dc?.creator,
    content: item.content?.encoded || item.description,
    summary: item.description,
    publishedAt: item.dc?.date,
  };
}

/**
 * Ingest parsed items into the database, skipping duplicates by guid.
 * Returns count of new items inserted.
 */
export async function ingestItems(feedId: number, items: ParsedItem[]): Promise<number> {
  let inserted = 0;

  for (const item of items) {
    if (!item.guid) continue;

    const wordCount = item.content
      ? item.content.replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length
      : null;

    try {
      await db
        .insert(schema.items)
        .values({
          feedId,
          guid: item.guid,
          url: item.url || null,
          title: item.title || null,
          author: item.author || null,
          content: item.content || null,
          summary: item.summary || null,
          publishedAt: item.publishedAt || null,
          fetchedAt: new Date().toISOString(),
          thumbnailUrl: item.thumbnailUrl || null,
          wordCount,
        })
        .onConflictDoNothing();

      inserted++;
    } catch (e: any) {
      // Unique constraint - item already exists, skip
      if (e.message?.includes("UNIQUE constraint")) continue;
      throw e;
    }
  }

  return inserted;
}

/**
 * Record a fetch error for a feed, incrementing error count.
 */
export async function recordFeedError(feedId: number, error: string): Promise<void> {
  await db
    .update(schema.feeds)
    .set({
      lastFetchedAt: new Date().toISOString(),
      errorCount: sql`${schema.feeds.errorCount} + 1`,
      lastError: error.slice(0, 500),
    })
    .where(eq(schema.feeds.id, feedId));
}
