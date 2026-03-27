import { Hono } from "hono";
import { db, schema } from "../db";
import { eq, desc, and, sql, isNull } from "drizzle-orm";

export const itemsRouter = new Hono();

// List items (with filtering)
itemsRouter.get("/", async (c) => {
  const feedId = c.req.query("feedId");
  const starred = c.req.query("starred");
  const unread = c.req.query("unread");
  const queued = c.req.query("queued");
  const limit = parseInt(c.req.query("limit") || "50");
  const offset = parseInt(c.req.query("offset") || "0");

  const includeContent = c.req.query("includeContent") === "true";

  let query = db
    .select({
      id: schema.items.id,
      feedId: schema.items.feedId,
      guid: schema.items.guid,
      url: schema.items.url,
      title: schema.items.title,
      author: schema.items.author,
      // Only include full content when explicitly requested (reading mode)
      ...(includeContent ? { content: schema.items.content } : {}),
      summary: schema.items.summary,
      publishedAt: schema.items.publishedAt,
      fetchedAt: schema.items.fetchedAt,
      thumbnailUrl: schema.items.thumbnailUrl,
      wordCount: schema.items.wordCount,
      engagementTier: sql<string>`COALESCE(${schema.itemState.engagementTier}, 'unseen')`.as("engagement_tier"),
      triageAction: schema.itemState.triageAction,
      isRead: sql<boolean>`COALESCE(${schema.itemState.isRead}, 0)`.as("is_read"),
      isStarred: sql<boolean>`COALESCE(${schema.itemState.isStarred}, 0)`.as("is_starred"),
      isPinned: sql<boolean>`COALESCE(${schema.itemState.isPinned}, 0)`.as("is_pinned"),
      queuedAt: schema.itemState.queuedAt,
      feedTitle: schema.feeds.title,
      feedIconUrl: schema.feeds.iconUrl,
    })
    .from(schema.items)
    .leftJoin(schema.itemState, eq(schema.items.id, schema.itemState.itemId))
    .innerJoin(schema.feeds, eq(schema.items.feedId, schema.feeds.id))
    .orderBy(desc(schema.items.publishedAt))
    .limit(limit)
    .offset(offset)
    .$dynamic();

  // Build conditions array - combined into single WHERE with AND
  const conditions: any[] = [];

  if (feedId) {
    conditions.push(eq(schema.items.feedId, parseInt(feedId)));
  }
  if (starred === "true") {
    conditions.push(eq(schema.itemState.isStarred, true));
  }
  if (unread === "true") {
    // Inbox = untriaged items only (not read, not queued, not skipped)
    conditions.push(
      sql`(${schema.itemState.isRead} IS NULL OR ${schema.itemState.isRead} = 0)
        AND (${schema.itemState.triageAction} IS NULL)`
    );
    // For unread+interleaved, fetch more items so every feed gets representation
    if (!feedId) {
      query = query.limit(1000);
    }
  }
  if (queued === "true") {
    conditions.push(sql`${schema.itemState.triageAction} IN ('queue', 'pin')`);
    query = query.orderBy(
      desc(schema.itemState.isPinned),
      schema.itemState.queuePosition
    );
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  const result = await query;

  // Interleave unread items round-robin across feeds
  // so no single feed dominates the list
  if (unread === "true" && !feedId && queued !== "true") {
    return c.json(interleaveByFeed(result));
  }

  return c.json(result);
});

// Get a single item with full content (for reading mode)
itemsRouter.get("/:id", async (c) => {
  const id = parseInt(c.req.param("id"));
  const [item] = await db
    .select({
      id: schema.items.id,
      content: schema.items.content,
      summary: schema.items.summary,
    })
    .from(schema.items)
    .where(eq(schema.items.id, id));

  if (!item) return c.json({ error: "Not found" }, 404);
  return c.json(item);
});

// Triage an item (skip / read_now / queue / pin)
itemsRouter.patch("/:id/triage", async (c) => {
  const id = parseInt(c.req.param("id"));
  const { action } = await c.req.json<{ action: "skip" | "read_now" | "queue" | "pin" }>();
  const now = new Date().toISOString();

  const tierMap = {
    skip: "decided",
    read_now: "consumed",
    queue: "decided",
    pin: "decided",
  } as const;

  const values: Record<string, unknown> = {
    itemId: id,
    triageAction: action,
    triageAt: now,
    engagementTier: tierMap[action],
  };

  if (action === "skip") {
    values.isRead = true;
    values.readAt = now;
  }
  if (action === "queue" || action === "pin") {
    values.queuedAt = now;
    values.isPinned = action === "pin";
    if (action === "pin") values.pinnedAt = now;
  }

  await db
    .insert(schema.itemState)
    .values(values as typeof schema.itemState.$inferInsert)
    .onConflictDoUpdate({
      target: schema.itemState.itemId,
      set: values,
    });

  return c.json({ ok: true });
});

// Undo triage - reset item to unseen/unread state
itemsRouter.patch("/:id/undo", async (c) => {
  const id = parseInt(c.req.param("id"));

  await db
    .insert(schema.itemState)
    .values({
      itemId: id,
      engagementTier: "unseen",
      triageAction: null,
      triageAt: null,
      isRead: false,
      readAt: null,
      queuedAt: null,
      isPinned: false,
      pinnedAt: null,
      queuePosition: null,
    })
    .onConflictDoUpdate({
      target: schema.itemState.itemId,
      set: {
        engagementTier: "unseen",
        triageAction: null,
        triageAt: null,
        isRead: false,
        readAt: null,
        queuedAt: null,
        isPinned: false,
        pinnedAt: null,
        queuePosition: null,
      },
    });

  return c.json({ ok: true });
});

// Record implicit signals (scroll depth, dwell time)
itemsRouter.patch("/:id/signal", async (c) => {
  const id = parseInt(c.req.param("id"));
  const body = await c.req.json<{
    scrollDepth?: number;
    dwellTimeSeconds?: number;
    isCompleted?: boolean;
  }>();

  const set: Record<string, unknown> = {};
  if (body.scrollDepth !== undefined) set.scrollDepth = body.scrollDepth;
  if (body.dwellTimeSeconds !== undefined) set.dwellTimeSeconds = body.dwellTimeSeconds;
  if (body.isCompleted !== undefined) {
    set.isCompleted = body.isCompleted;
    if (body.isCompleted) set.engagementTier = "consumed";
  }

  await db
    .insert(schema.itemState)
    .values({ itemId: id, ...set } as typeof schema.itemState.$inferInsert)
    .onConflictDoUpdate({
      target: schema.itemState.itemId,
      set,
    });

  return c.json({ ok: true });
});

// Mark item as read/unread (legacy + updates engagement tier)
itemsRouter.patch("/:id/read", async (c) => {
  const id = parseInt(c.req.param("id"));
  const { isRead } = await c.req.json<{ isRead: boolean }>();

  await db
    .insert(schema.itemState)
    .values({
      itemId: id,
      isRead,
      readAt: isRead ? new Date().toISOString() : null,
      engagementTier: isRead ? "consumed" : "seen",
    })
    .onConflictDoUpdate({
      target: schema.itemState.itemId,
      set: {
        isRead,
        readAt: isRead ? new Date().toISOString() : null,
        engagementTier: isRead ? "consumed" : "seen",
      },
    });

  return c.json({ ok: true });
});

// Star/unstar item
itemsRouter.patch("/:id/star", async (c) => {
  const id = parseInt(c.req.param("id"));
  const { isStarred } = await c.req.json<{ isStarred: boolean }>();

  await db
    .insert(schema.itemState)
    .values({
      itemId: id,
      isStarred,
      starredAt: isStarred ? new Date().toISOString() : null,
    })
    .onConflictDoUpdate({
      target: schema.itemState.itemId,
      set: {
        isStarred,
        starredAt: isStarred ? new Date().toISOString() : null,
      },
    });

  return c.json({ ok: true });
});

// Mark all as read (for a feed or all)
itemsRouter.post("/mark-all-read", async (c) => {
  const { feedId } = await c.req.json<{ feedId?: number }>();
  const now = new Date().toISOString();

  if (feedId) {
    await db.run(sql`
      INSERT OR REPLACE INTO item_state (item_id, is_read, read_at, engagement_tier, triage_action, triage_at)
      SELECT i.id, 1, ${now}, 'decided', 'skip', ${now}
      FROM items i
      LEFT JOIN item_state s ON s.item_id = i.id
      WHERE i.feed_id = ${feedId} AND (s.is_read IS NULL OR s.is_read = 0)
    `);
  } else {
    await db.run(sql`
      INSERT OR REPLACE INTO item_state (item_id, is_read, read_at, engagement_tier, triage_action, triage_at)
      SELECT i.id, 1, ${now}, 'decided', 'skip', ${now}
      FROM items i
      LEFT JOIN item_state s ON s.item_id = i.id
      WHERE s.is_read IS NULL OR s.is_read = 0
    `);
  }

  return c.json({ ok: true });
});

// Reading queue endpoint
itemsRouter.get("/queue", async (c) => {
  const result = await db
    .select({
      id: schema.items.id,
      feedId: schema.items.feedId,
      url: schema.items.url,
      title: schema.items.title,
      author: schema.items.author,
      content: schema.items.content,
      summary: schema.items.summary,
      publishedAt: schema.items.publishedAt,
      wordCount: schema.items.wordCount,
      isPinned: schema.itemState.isPinned,
      queuedAt: schema.itemState.queuedAt,
      queuePosition: schema.itemState.queuePosition,
      feedTitle: schema.feeds.title,
      feedIconUrl: schema.feeds.iconUrl,
    })
    .from(schema.items)
    .innerJoin(schema.itemState, eq(schema.items.id, schema.itemState.itemId))
    .innerJoin(schema.feeds, eq(schema.items.feedId, schema.feeds.id))
    .where(sql`${schema.itemState.triageAction} IN ('queue', 'pin') AND ${schema.itemState.isRead} = 0`)
    .orderBy(desc(schema.itemState.isPinned), schema.itemState.queuePosition);

  return c.json(result);
});

/**
 * Interleave items round-robin across feeds.
 * Groups items by feed (preserving per-feed sort order),
 * then deals them out one-at-a-time like a card dealer.
 */
function interleaveByFeed(items: any[]): any[] {
  const feedBuckets = new Map<number, any[]>();
  for (const item of items) {
    const bucket = feedBuckets.get(item.feedId) || [];
    bucket.push(item);
    feedBuckets.set(item.feedId, bucket);
  }

  // Sort feeds by their newest item so feeds with recent content appear first
  const sortedBuckets = [...feedBuckets.values()].sort((a, b) => {
    const aDate = a[0]?.publishedAt || "";
    const bDate = b[0]?.publishedAt || "";
    return bDate > aDate ? 1 : bDate < aDate ? -1 : 0;
  });

  // Round-robin deal
  const result: any[] = [];
  let round = 0;
  let hasMore = true;

  while (hasMore) {
    hasMore = false;
    for (const bucket of sortedBuckets) {
      if (round < bucket.length) {
        result.push(bucket[round]);
        hasMore = true;
      }
    }
    round++;
  }

  return result;
}
