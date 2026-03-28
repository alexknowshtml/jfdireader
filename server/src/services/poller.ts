import { db, schema } from "../db";
import { sql, lte } from "drizzle-orm";
import { fetchFeed, ingestItems, recordFeedError } from "./feed-fetcher";

/**
 * Poll all feeds that are due for a refresh.
 * A feed is due when last_fetched_at + poll_interval_minutes < now,
 * or when it has never been fetched.
 */
export async function pollDueFeeds(): Promise<{
  polled: number;
  newItems: number;
  errors: number;
}> {
  const now = new Date().toISOString();

  const dueFeeds = await db
    .select()
    .from(schema.feeds)
    .where(
      sql`(${schema.feeds.lastFetchedAt} IS NULL
        OR datetime(${schema.feeds.lastFetchedAt}, '+' || ${schema.feeds.pollIntervalMinutes} || ' minutes') <= datetime(${now}))
        AND ${schema.feeds.url} NOT LIKE 'email://%'`
    );

  let polled = 0;
  let newItems = 0;
  let errors = 0;

  for (const feed of dueFeeds) {
    try {
      const result = await fetchFeed(feed);
      polled++;

      if (!result.notModified && result.items.length > 0) {
        const count = await ingestItems(feed.id, result.items);
        newItems += count;
      }
    } catch (e: any) {
      errors++;
      await recordFeedError(feed.id, e.message || String(e));
      console.error(`[poll] Error fetching feed ${feed.id} (${feed.url}): ${e.message}`);
    }
  }

  return { polled, newItems, errors };
}

/**
 * Fetch a single feed by ID immediately (for subscribe-and-fetch flow).
 */
export async function pollSingleFeed(feedId: number): Promise<{ newItems: number }> {
  const [feed] = await db
    .select()
    .from(schema.feeds)
    .where(sql`${schema.feeds.id} = ${feedId}`);

  if (!feed) throw new Error(`Feed ${feedId} not found`);
  if (feed.url.startsWith("email://")) return { newItems: 0 };

  const result = await fetchFeed(feed);
  let newItems = 0;

  if (!result.notModified && result.items.length > 0) {
    newItems = await ingestItems(feed.id, result.items);
  }

  return { newItems };
}

let pollInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Start the background polling loop.
 */
export function startPolling(intervalMs: number = 5 * 60 * 1000) {
  if (pollInterval) return;

  console.log(`[poll] Starting feed poller (every ${intervalMs / 1000}s)`);

  // Initial poll on startup
  pollDueFeeds().then((r) => {
    console.log(`[poll] Initial: polled=${r.polled} new=${r.newItems} errors=${r.errors}`);
  });

  pollInterval = setInterval(async () => {
    const r = await pollDueFeeds();
    if (r.polled > 0) {
      console.log(`[poll] Cycle: polled=${r.polled} new=${r.newItems} errors=${r.errors}`);
    }
  }, intervalMs);
}

export function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}
