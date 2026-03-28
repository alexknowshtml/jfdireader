// Shared types between server and client

export type EngagementTier = "unseen" | "seen" | "decided" | "consumed" | "acted_on";
export type TriageAction = "archive" | "read_now" | "queue" | "pin";
export type DigestMode = "realtime" | "daily" | "filtered";

export interface Feed {
  id: number;
  url: string;
  title: string | null;
  description: string | null;
  siteUrl: string | null;
  iconUrl: string | null;
  etag: string | null;
  lastModified: string | null;
  lastFetchedAt: string | null;
  lastPublishedAt: string | null;
  pollIntervalMinutes: number;
  errorCount: number;
  lastError: string | null;
  createdAt: string;
}

export interface FeedItem {
  id: number;
  feedId: number;
  guid: string;
  url: string | null;
  title: string | null;
  author: string | null;
  content: string | null;
  summary: string | null;
  publishedAt: string | null;
  fetchedAt: string;
  thumbnailUrl: string | null;
  wordCount: number | null;
}

export interface ItemState {
  itemId: number;
  engagementTier: EngagementTier;
  triageAction: TriageAction | null;
  triageAt: string | null;
  queuedAt: string | null;
  isPinned: boolean;
  pinnedAt: string | null;
  queuePosition: number | null;
  isRead: boolean;
  isStarred: boolean;
  readAt: string | null;
  starredAt: string | null;
  scrollDepth: number | null;
  dwellTimeSeconds: number | null;
  isCompleted: boolean;
  sharedAt: string | null;
  sentAt: string | null;
  savedAt: string | null;
  fueledAt: string | null;
}

export interface FeedSettings {
  feedId: number;
  relevanceBlurbsEnabled: boolean;
  digestMode: DigestMode;
  autoMarkReadDays: number | null;
}

export interface Folder {
  id: number;
  name: string;
  parentId: number | null;
  sortOrder: number;
}

export interface Tag {
  id: number;
  name: string;
}

export interface FeedWithUnread extends Feed {
  unreadCount: number;
  folderId: number | null;
}

export interface FeedItemWithState extends FeedItem {
  engagementTier: EngagementTier;
  triageAction: TriageAction | null;
  isRead: boolean;
  isStarred: boolean;
  isPinned: boolean;
  queuedAt: string | null;
  feedTitle: string | null;
  feedIconUrl: string | null;
}
