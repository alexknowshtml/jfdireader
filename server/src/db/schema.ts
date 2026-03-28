import { sqliteTable, text, integer, real, uniqueIndex, index } from "drizzle-orm/sqlite-core";

export const feeds = sqliteTable("feeds", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  url: text("url").notNull().unique(),
  title: text("title"),
  description: text("description"),
  siteUrl: text("site_url"),
  iconUrl: text("icon_url"),
  etag: text("etag"),
  lastModified: text("last_modified"),
  lastFetchedAt: text("last_fetched_at"),
  lastPublishedAt: text("last_published_at"),
  pollIntervalMinutes: integer("poll_interval_minutes").default(60),
  errorCount: integer("error_count").default(0),
  lastError: text("last_error"),
  createdAt: text("created_at").notNull(),
  sourceType: text("source_type").default("rss"),  // rss | email
  senderEmail: text("sender_email"),  // for email feeds: the sender's email address
});

export const folders = sqliteTable("folders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  parentId: integer("parent_id").references(() => folders.id),
  sortOrder: integer("sort_order").default(0),
});

export const feedFolders = sqliteTable(
  "feed_folders",
  {
    feedId: integer("feed_id")
      .notNull()
      .references(() => feeds.id),
    folderId: integer("folder_id")
      .notNull()
      .references(() => folders.id),
  },
  (table) => [
    uniqueIndex("feed_folder_idx").on(table.feedId, table.folderId),
  ]
);

export const items = sqliteTable(
  "items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    feedId: integer("feed_id")
      .notNull()
      .references(() => feeds.id),
    guid: text("guid").notNull(),
    url: text("url"),
    title: text("title"),
    author: text("author"),
    content: text("content"),
    summary: text("summary"),
    publishedAt: text("published_at"),
    fetchedAt: text("fetched_at").notNull(),
    thumbnailUrl: text("thumbnail_url"),
    wordCount: integer("word_count"),
  },
  (table) => [
    uniqueIndex("item_feed_guid_idx").on(table.feedId, table.guid),
  ]
);

export const itemState = sqliteTable("item_state", {
  itemId: integer("item_id")
    .primaryKey()
    .references(() => items.id),

  // Engagement tier: unseen | seen | decided | consumed | acted_on
  engagementTier: text("engagement_tier").default("unseen"),

  // Triage action: archive | read_now | queue | pin
  triageAction: text("triage_action"),
  triageAt: text("triage_at"),

  // Reading queue
  queuedAt: text("queued_at"),
  isPinned: integer("is_pinned", { mode: "boolean" }).default(false),
  pinnedAt: text("pinned_at"),
  queuePosition: integer("queue_position"),

  // Legacy compat / convenience
  isRead: integer("is_read", { mode: "boolean" }).default(false),
  isStarred: integer("is_starred", { mode: "boolean" }).default(false),
  readAt: text("read_at"),
  starredAt: text("starred_at"),

  // Implicit signals (populated by client-side analytics)
  scrollDepth: real("scroll_depth"),       // 0.0 - 1.0
  dwellTimeSeconds: integer("dwell_time_seconds"),
  isCompleted: integer("is_completed", { mode: "boolean" }).default(false),

  // Post-read actions
  sharedAt: text("shared_at"),
  sentAt: text("sent_at"),
  savedAt: text("saved_at"),
  fueledAt: text("fueled_at"),
});

export const feedSettings = sqliteTable("feed_settings", {
  feedId: integer("feed_id")
    .primaryKey()
    .references(() => feeds.id),
  relevanceBlurbsEnabled: integer("relevance_blurbs_enabled", { mode: "boolean" }).default(false),
  digestMode: text("digest_mode").default("realtime"),  // realtime | daily | filtered
  autoMarkReadDays: integer("auto_mark_read_days"),
});

export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value"),
});

export const tags = sqliteTable("tags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
});

export const itemTags = sqliteTable(
  "item_tags",
  {
    itemId: integer("item_id")
      .notNull()
      .references(() => items.id),
    tagId: integer("tag_id")
      .notNull()
      .references(() => tags.id),
  },
  (table) => [
    uniqueIndex("item_tag_idx").on(table.itemId, table.tagId),
  ]
);
