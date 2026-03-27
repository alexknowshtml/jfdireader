import { Hono } from "hono";
import { db, schema } from "../db";
import { eq, sql } from "drizzle-orm";
import { pollSingleFeed, pollDueFeeds } from "../services/poller";
import { parseOpml } from "feedsmith";

export const feedsRouter = new Hono();

// List all feeds with unread counts
feedsRouter.get("/", async (c) => {
  const result = await db
    .select({
      id: schema.feeds.id,
      url: schema.feeds.url,
      title: schema.feeds.title,
      description: schema.feeds.description,
      siteUrl: schema.feeds.siteUrl,
      iconUrl: schema.feeds.iconUrl,
      lastFetchedAt: schema.feeds.lastFetchedAt,
      lastPublishedAt: schema.feeds.lastPublishedAt,
      pollIntervalMinutes: schema.feeds.pollIntervalMinutes,
      errorCount: schema.feeds.errorCount,
      lastError: schema.feeds.lastError,
      createdAt: schema.feeds.createdAt,
      unreadCount: sql<number>`
        (SELECT COUNT(*) FROM items i
         LEFT JOIN item_state s ON s.item_id = i.id
         WHERE i.feed_id = feeds.id AND (s.is_read IS NULL OR s.is_read = 0))
      `.as("unread_count"),
    })
    .from(schema.feeds);

  return c.json(result);
});

// Subscribe to a new feed (and immediately fetch it)
feedsRouter.post("/", async (c) => {
  const body = await c.req.json<{ url: string; folderId?: number }>();

  if (!body.url) {
    return c.json({ error: "URL is required" }, 400);
  }

  // Check for duplicate
  const [existing] = await db
    .select()
    .from(schema.feeds)
    .where(eq(schema.feeds.url, body.url));

  if (existing) {
    return c.json({ error: "Already subscribed to this feed", feed: existing }, 409);
  }

  const [feed] = await db
    .insert(schema.feeds)
    .values({
      url: body.url,
      createdAt: new Date().toISOString(),
    })
    .returning();

  if (body.folderId) {
    await db.insert(schema.feedFolders).values({
      feedId: feed.id,
      folderId: body.folderId,
    });
  }

  // Fetch immediately in background
  pollSingleFeed(feed.id).catch((e) => {
    console.error(`[feed] Initial fetch failed for ${feed.url}: ${e.message}`);
  });

  return c.json(feed, 201);
});

// OPML import
feedsRouter.post("/import/opml", async (c) => {
  const body = await c.req.text();

  if (!body.trim()) {
    return c.json({ error: "OPML body is required" }, 400);
  }

  const opml = parseOpml(body);
  const outlines = flattenOutlines(opml.body?.outlines || []);
  const results = { imported: 0, skipped: 0, errors: 0 };

  for (const outline of outlines) {
    if (!outline.xmlUrl) continue;

    try {
      const [existing] = await db
        .select()
        .from(schema.feeds)
        .where(eq(schema.feeds.url, outline.xmlUrl));

      if (existing) {
        results.skipped++;
        continue;
      }

      const [feed] = await db
        .insert(schema.feeds)
        .values({
          url: outline.xmlUrl,
          title: outline.title || outline.text || null,
          siteUrl: outline.htmlUrl || null,
          createdAt: new Date().toISOString(),
        })
        .returning();

      results.imported++;

      // Fetch in background
      pollSingleFeed(feed.id).catch(() => {});
    } catch {
      results.errors++;
    }
  }

  return c.json(results);
});

// Trigger a poll of all due feeds
feedsRouter.post("/poll", async (c) => {
  const result = await pollDueFeeds();
  return c.json(result);
});

// Refresh a single feed
feedsRouter.post("/:id/refresh", async (c) => {
  const id = parseInt(c.req.param("id"));
  try {
    const result = await pollSingleFeed(id);
    return c.json(result);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// Get a single feed
feedsRouter.get("/:id", async (c) => {
  const id = parseInt(c.req.param("id"));
  const [feed] = await db
    .select()
    .from(schema.feeds)
    .where(eq(schema.feeds.id, id));

  if (!feed) return c.json({ error: "Feed not found" }, 404);
  return c.json(feed);
});

// Delete a feed (unsubscribe)
feedsRouter.delete("/:id", async (c) => {
  const id = parseInt(c.req.param("id"));
  // Delete items and state first
  await db.run(sql`DELETE FROM item_state WHERE item_id IN (SELECT id FROM items WHERE feed_id = ${id})`);
  await db.run(sql`DELETE FROM item_tags WHERE item_id IN (SELECT id FROM items WHERE feed_id = ${id})`);
  await db.delete(schema.items).where(eq(schema.items.feedId, id));
  await db.delete(schema.feedFolders).where(eq(schema.feedFolders.feedId, id));
  await db.delete(schema.feeds).where(eq(schema.feeds.id, id));
  return c.json({ ok: true });
});

// Flatten OPML outline tree to a flat list of feeds
function flattenOutlines(outlines: any[]): any[] {
  const result: any[] = [];
  for (const outline of outlines) {
    if (outline.xmlUrl) {
      result.push(outline);
    }
    if (outline.outlines) {
      result.push(...flattenOutlines(outline.outlines));
    }
  }
  return result;
}
