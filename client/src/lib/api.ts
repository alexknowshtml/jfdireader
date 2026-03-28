import type { FeedItemWithState, FeedWithUnread } from "../../../shared/types";

const API_BASE = "/api";

async function fetchJSON<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...opts?.headers },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// Feeds
export async function getFeeds(): Promise<FeedWithUnread[]> {
  return fetchJSON("/feeds");
}

export async function refreshFeed(id: number) {
  return fetchJSON(`/feeds/${id}/refresh`, { method: "POST" });
}

export async function pollAllFeeds() {
  return fetchJSON("/feeds/poll", { method: "POST" });
}

export async function getFeed(id: number) {
  return fetchJSON<any>(`/feeds/${id}`);
}

export async function updateFeed(id: number, data: { title?: string; pollIntervalMinutes?: number }) {
  return fetchJSON<any>(`/feeds/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteFeed(id: number) {
  return fetchJSON(`/feeds/${id}`, { method: "DELETE" });
}

// Items
export async function getItems(params: {
  feedId?: number | null;
  starred?: boolean;
  unread?: boolean;
  queued?: boolean;
  limit?: number;
  offset?: number;
}): Promise<FeedItemWithState[]> {
  const searchParams = new URLSearchParams();
  if (params.feedId) searchParams.set("feedId", String(params.feedId));
  if (params.starred) searchParams.set("starred", "true");
  if (params.unread) searchParams.set("unread", "true");
  if (params.queued) searchParams.set("queued", "true");
  if (params.limit) searchParams.set("limit", String(params.limit));
  if (params.offset) searchParams.set("offset", String(params.offset));
  return fetchJSON(`/items?${searchParams}`);
}

export async function getQueue(): Promise<FeedItemWithState[]> {
  return fetchJSON("/items/queue");
}

// Get item content (for reading mode - fetched on demand)
export async function getItemContent(id: number): Promise<{ content: string | null; summary: string | null }> {
  return fetchJSON(`/items/${id}`);
}

// Triage actions
export async function triageItem(id: number, action: "archive" | "read_now" | "queue" | "pin") {
  return fetchJSON(`/items/${id}/triage`, {
    method: "PATCH",
    body: JSON.stringify({ action }),
  });
}

export async function undoTriage(id: number) {
  return fetchJSON(`/items/${id}/undo`, { method: "PATCH" });
}

export async function markRead(id: number, isRead: boolean) {
  return fetchJSON(`/items/${id}/read`, {
    method: "PATCH",
    body: JSON.stringify({ isRead }),
  });
}

export async function starItem(id: number, isStarred: boolean) {
  return fetchJSON(`/items/${id}/star`, {
    method: "PATCH",
    body: JSON.stringify({ isStarred }),
  });
}

export async function markAllRead(feedId?: number) {
  return fetchJSON("/items/mark-all-read", {
    method: "POST",
    body: JSON.stringify({ feedId }),
  });
}

export async function recordSignal(id: number, signal: {
  scrollDepth?: number;
  dwellTimeSeconds?: number;
  isCompleted?: boolean;
}) {
  return fetchJSON(`/items/${id}/signal`, {
    method: "PATCH",
    body: JSON.stringify(signal),
  });
}
