// Shared types between server and client

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
  isRead: boolean;
  isStarred: boolean;
  readAt: string | null;
  starredAt: string | null;
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
  isRead: boolean;
  isStarred: boolean;
  feedTitle: string | null;
  feedIconUrl: string | null;
}
