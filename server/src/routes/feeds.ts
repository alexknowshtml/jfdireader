import { Hono } from "hono";
import { db, schema } from "../db";
import { eq, sql } from "drizzle-orm";

export const feedsRouter = new Hono();

// List all feeds with unread counts
feedsRouter.get("/", async (c) => {
  const result = await db
    .select({
      ...schema.feeds,
      unreadCount: sql<number>`
        (SELECT COUNT(*) FROM items i
         LEFT JOIN item_state s ON s.item_id = i.id
         WHERE i.feed_id = feeds.id AND (s.is_read IS NULL OR s.is_read = 0))
      `.as("unread_count"),
    })
    .from(schema.feeds);

  return c.json(result);
});

// Subscribe to a new feed
feedsRouter.post("/", async (c) => {
  const body = await c.req.json<{ url: string; folderId?: number }>();

  if (!body.url) {
    return c.json({ error: "URL is required" }, 400);
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

  return c.json(feed, 201);
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
  await db.delete(schema.feedFolders).where(eq(schema.feedFolders.feedId, id));
  await db.delete(schema.feeds).where(eq(schema.feeds.id, id));
  return c.json({ ok: true });
});
