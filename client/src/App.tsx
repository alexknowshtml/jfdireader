import { useState, useCallback, useEffect, useRef } from "react";
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/Sidebar";
import { ArticleList } from "@/components/article/ArticleList";
import { ReadingPane } from "@/components/article/ReadingPane";
import { TriageBar } from "@/components/triage/TriageBar";
import { ShortcutsHelp } from "@/components/triage/ShortcutsHelp";
import { FeedSettingsModal } from "@/components/feed/FeedSettingsModal";
import { OpmlImportModal } from "@/components/feed/OpmlImportModal";
import { UndoToast } from "@/components/triage/UndoToast";
import { useKeyboardNav } from "@/hooks/useKeyboardNav";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandItem,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import * as api from "@/lib/api";
import { hapticLight } from "@/lib/haptics";
import type { FeedItemWithState } from "../../shared/types";

// Simple localStorage cache for instant loads
const CACHE_KEY = "jfdi-reader-cache";
const CACHE_MAX_AGE = 5 * 60 * 1000; // 5 minutes

function loadCache(): Record<string, any> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > CACHE_MAX_AGE) return {};
    return data || {};
  } catch { return {}; }
}

function saveCache(key: string, data: any) {
  try {
    const existing = loadCache();
    existing[key] = data;
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data: existing, timestamp: Date.now() }));
  } catch { /* quota exceeded, ignore */ }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
    },
  },
});

// Hydrate from localStorage cache on startup
const cached = loadCache();
for (const [keyStr, data] of Object.entries(cached)) {
  try {
    const queryKey = JSON.parse(keyStr);
    queryClient.setQueryData(queryKey, data);
  } catch { /* bad key, skip */ }
}

// Persist query results to localStorage
queryClient.getQueryCache().subscribe((event) => {
  if (event.type === "updated" && event.action.type === "success") {
    const key = JSON.stringify(event.query.queryKey);
    saveCache(key, event.query.state.data);
  }
});

type ViewMode = "triage" | "reading";
type SidebarView = "all" | "unread" | "starred" | "queue";

// Parse URL hash for persisted state: #view/feedId/itemId or #read/itemId
function parseHash(): { view?: SidebarView; feedId?: number | null; itemId?: number; mode?: ViewMode } {
  const hash = window.location.hash.slice(1);
  if (!hash) return {};
  const parts = hash.split("/");
  if (parts[0] === "read" && parts[1]) {
    return { mode: "reading", itemId: parseInt(parts[1]) };
  }
  const view = (["unread", "all", "starred", "queue"].includes(parts[0]) ? parts[0] : undefined) as SidebarView | undefined;
  const feedId = parts[1] ? parseInt(parts[1]) : null;
  return { view, feedId };
}

function ReaderApp() {
  const qc = useQueryClient();
  const initialHash = useRef(parseHash());
  const [selectedFeedId, setSelectedFeedId] = useState<number | null>(initialHash.current.feedId ?? null);
  const [sidebarView, setSidebarView] = useState<SidebarView>(initialHash.current.view || "unread");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>(initialHash.current.mode || "triage");
  const [pendingItemId, setPendingItemId] = useState<number | undefined>(initialHash.current.itemId);
  const [searchOpen, setSearchOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsFeedId, setSettingsFeedId] = useState<number | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const lastAction = useRef<{ itemId: number; action: string; snapshot: FeedItemWithState[] | undefined; queryKey: any[] } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((action: string) => {
    const labels: Record<string, string> = {
      archive: "Archived",
      queue: "Queued",
      read_done: "Read ✓",
      pin: "Pinned",
      unpin: "Unpinned",
    };
    setToastMessage(labels[action] || action);
  }, []);

  // Fetch feeds for sidebar
  const { data: feeds = [] } = useQuery({
    queryKey: ["feeds"],
    queryFn: api.getFeeds,
  });

  // Fetch items based on current view
  const { data: items = [], isFetching } = useQuery({
    queryKey: ["items", selectedFeedId, sidebarView],
    queryFn: () =>
      sidebarView === "queue"
        ? api.getQueue()
        : api.getItems({
            feedId: selectedFeedId,
            starred: sidebarView === "starred" || undefined,
            unread: sidebarView === "unread" || undefined,
            limit: 200,
          }),
  });

  const currentItem: FeedItemWithState | undefined = items[selectedIndex];

  // Resolve pending item ID from URL hash once items load
  useEffect(() => {
    if (pendingItemId && items.length > 0) {
      const idx = items.findIndex((i) => i.id === pendingItemId);
      if (idx >= 0) {
        setSelectedIndex(idx);
      }
      setPendingItemId(undefined);
    }
  }, [pendingItemId, items]);

  // Update URL hash when state changes
  useEffect(() => {
    if (viewMode === "reading" && currentItem) {
      window.location.hash = `read/${currentItem.id}`;
    } else {
      const parts: string[] = [sidebarView];
      if (selectedFeedId) parts.push(String(selectedFeedId));
      window.location.hash = parts.join("/");
    }
  }, [viewMode, currentItem, sidebarView, selectedFeedId]);

  // Reset selection when view changes (but not on initial load)
  const isInitialLoad = useRef(true);
  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }
    setSelectedIndex(0);
    setViewMode("triage");
  }, [selectedFeedId, sidebarView]);

  // Optimistic triage: remove item from cache instantly, roll back on failure
  const optimisticTriage = useCallback((itemId: number, action: string) => {
    const queryKey = ["items", selectedFeedId, sidebarView];
    // Snapshot current cache for rollback
    const previous = qc.getQueryData<FeedItemWithState[]>(queryKey);

    if (action !== "read_now" && action !== "pin") {
      // Optimistically remove from list (archive/queue remove from view, pin stays visible)
      qc.setQueryData<FeedItemWithState[]>(queryKey, (old) =>
        old ? old.filter((item) => item.id !== itemId) : []
      );
    }

    if (action === "pin") {
      // Optimistically mark as pinned without removing
      qc.setQueryData<FeedItemWithState[]>(queryKey, (old) =>
        old?.map((item) => item.id === itemId ? { ...item, isPinned: true } : item) || []
      );
    }

    // Also optimistically decrement feed unread count (not for pin — item stays)
    if (action !== "pin") {
      qc.setQueryData(["feeds"], (old: any) =>
        old?.map((f: any) => {
          const item = previous?.find((i) => i.id === itemId);
          if (item && f.id === item.feedId && f.unreadCount > 0) {
            return { ...f, unreadCount: f.unreadCount - 1 };
          }
          return f;
        })
      );
    }

    return { previous, queryKey };
  }, [qc, selectedFeedId, sidebarView]);

  const rollback = useCallback((ctx: { previous: any; queryKey: any }) => {
    if (ctx.previous) {
      qc.setQueryData(ctx.queryKey, ctx.previous);
    }
    qc.invalidateQueries({ queryKey: ["feeds"] });
  }, [qc]);

  const handleArchive = useCallback(() => {
    if (!currentItem) return;
    hapticLight();
    const ctx = optimisticTriage(currentItem.id, "archive");
    lastAction.current = { itemId: currentItem.id, action: "archive", snapshot: ctx.previous, queryKey: ctx.queryKey };
    api.triageItem(currentItem.id, "archive").then(() => qc.invalidateQueries({ queryKey: ["feeds"] })).catch(() => rollback(ctx));
    showToast("archive");
  }, [currentItem, optimisticTriage, rollback, qc, showToast]);

  const handleReadNow = useCallback(() => {
    if (!currentItem) return;
    const ctx = optimisticTriage(currentItem.id, "read_now");
    lastAction.current = { itemId: currentItem.id, action: "read_now", snapshot: ctx.previous, queryKey: ctx.queryKey };
    setViewMode("reading");
    api.triageItem(currentItem.id, "read_now").then(() => qc.invalidateQueries({ queryKey: ["feeds"] }));
    api.markRead(currentItem.id, true);
  }, [currentItem, optimisticTriage, qc]);

  const handleQueue = useCallback(() => {
    if (!currentItem) return;
    hapticLight();
    const ctx = optimisticTriage(currentItem.id, "queue");
    lastAction.current = { itemId: currentItem.id, action: "queue", snapshot: ctx.previous, queryKey: ctx.queryKey };
    api.triageItem(currentItem.id, "queue").then(() => qc.invalidateQueries({ queryKey: ["feeds"] })).catch(() => rollback(ctx));
    showToast("queue");
  }, [currentItem, optimisticTriage, rollback, qc, showToast]);

  const handlePin = useCallback(async () => {
    if (!currentItem) return;
    hapticLight();
    const newPinned = !currentItem.isPinned;
    // Optimistically toggle pin flag without removing from list
    const queryKey = ["items", selectedFeedId, sidebarView];
    qc.setQueryData<FeedItemWithState[]>(queryKey, (old) =>
      old?.map((item) => item.id === currentItem.id ? { ...item, isPinned: newPinned } : item) || []
    );
    await api.pinItem(currentItem.id, newPinned);
    qc.invalidateQueries({ queryKey: ["items"] });
    showToast(newPinned ? "pin" : "unpin");
  }, [currentItem, qc, showToast, selectedFeedId, sidebarView]);

  const handleUndo = useCallback(() => {
    if (!lastAction.current) return;
    const { snapshot, queryKey } = lastAction.current;
    // Instantly restore the previous list from snapshot
    if (snapshot) {
      qc.setQueryData(queryKey, snapshot);
    }
    // Also bump feed unread counts back up
    qc.invalidateQueries({ queryKey: ["feeds"] });
    // Fire API call in background
    const id = lastAction.current.itemId;
    lastAction.current = null;
    api.undoTriage(id).then(() => qc.invalidateQueries({ queryKey: ["feeds"] }));
  }, [qc]);

  const handleStar = useCallback(async () => {
    if (!currentItem) return;
    hapticLight();
    await api.starItem(currentItem.id, !currentItem.isStarred);
    qc.invalidateQueries({ queryKey: ["items"] });
  }, [currentItem, qc]);

  const handleMarkAllRead = useCallback(async () => {
    await api.markAllRead(selectedFeedId ?? undefined);
    qc.invalidateQueries({ queryKey: ["items"] });
    qc.invalidateQueries({ queryKey: ["feeds"] });
  }, [selectedFeedId, qc]);

  const handleRefresh = useCallback(async () => {
    await api.pollAllFeeds();
    qc.invalidateQueries({ queryKey: ["items"] });
    qc.invalidateQueries({ queryKey: ["feeds"] });
  }, [qc]);

  const next = useCallback(() => {
    setSelectedIndex((i) => Math.min(i + 1, items.length - 1));
  }, [items.length]);

  const prev = useCallback(() => {
    setSelectedIndex((i) => Math.max(i - 1, 0));
  }, []);

  useKeyboardNav({
    onNext: next,
    onPrev: prev,
    onOpen: () => {
      if (viewMode === "reading") {
        setViewMode("triage");
      } else {
        handleReadNow();
      }
    },
    onArchive: handleArchive,
    onQueue: handleQueue,
    onPin: handlePin,
    onStar: handleStar,
    onMarkAllRead: handleMarkAllRead,
    onSearch: () => setSearchOpen(true),
    onOpenOriginal: () => {
      if (currentItem?.url) window.open(currentItem.url, "_blank");
    },
    onRefresh: handleRefresh,
    onUndo: handleUndo,
    onHelp: () => setHelpOpen((h) => !h),
    enabled: !searchOpen && !helpOpen,
  });

  // Build sidebar data
  const unfiledFeeds: any[] = [];
  const totalUnread = feeds.reduce((sum, f) => sum + (f.unreadCount || 0), 0);
  const totalQueued = feeds.reduce((sum, f: any) => sum + (f.queueCount || 0), 0);

  // For now, show all feeds as unfiled (folders need a join query)
  for (const feed of feeds) {
    unfiledFeeds.push({
      id: feed.id,
      title: feed.title,
      iconUrl: feed.iconUrl,
      unreadCount: feed.unreadCount || 0,
    });
  }

  return (
    <div className="flex h-svh bg-background text-foreground">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - always visible on desktop, slide-over on mobile */}
      <div className={`
        fixed left-0 bottom-0 z-50 transition-transform duration-200 ease-in-out md:relative md:translate-x-0 bg-sidebar rounded-tr-2xl overflow-hidden top-[env(safe-area-inset-top)] md:top-0 md:rounded-none
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <Sidebar
          folders={[]}
          unfiledFeeds={unfiledFeeds}
          selectedFeedId={selectedFeedId}
          selectedView={sidebarView === "starred" ? "starred" : "all"}
          onSelectFeed={(id) => {
            setSelectedFeedId(id);
            // Keep current view (inbox/queue/starred) - just add feed filter
            setSidebarOpen(false);
          }}
          onSelectView={(v) => {
            setSelectedFeedId(null);
            setSidebarView(v as SidebarView);
            setSidebarOpen(false);
          }}
          totalUnread={totalUnread}
          totalQueued={totalQueued}
          onFeedSettings={(id) => { setSettingsFeedId(id); setSidebarOpen(false); }}
          onImportOpml={() => { setImportOpen(true); setSidebarOpen(false); }}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Toolbar - with safe area top padding for mobile notch */}
        <div className="border-b flex-shrink-0 pt-[env(safe-area-inset-top)]">
          <div className="h-12 flex items-center px-4 gap-2">
            {/* Mobile hamburger */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-lg px-2 py-1.5 rounded hover:bg-accent"
              aria-label="Open sidebar"
            >
              ☰
            </button>
            <div className="flex gap-1 min-w-0">
              <ViewButton label="Inbox" active={sidebarView === "unread" && !selectedFeedId} onClick={() => { setSidebarView("unread"); setSelectedFeedId(null); setViewMode("triage"); }} count={totalUnread || undefined} />
              <ViewButton label="Queue" active={sidebarView === "queue"} onClick={() => { setSidebarView("queue"); setSelectedFeedId(null); setViewMode("triage"); }} count={totalQueued || undefined} />
              <ViewButton label="Starred" active={sidebarView === "starred"} onClick={() => { setSidebarView("starred"); setSelectedFeedId(null); setViewMode("triage"); }} />
            </div>
            {/* Feed filter chip */}
            {selectedFeedId && (() => {
              const feed = feeds.find(f => f.id === selectedFeedId);
              return feed ? (
                <button
                  onClick={() => setSelectedFeedId(null)}
                  className="text-xs px-2.5 py-1 rounded-full bg-primary text-primary-foreground flex items-center gap-1.5 max-w-[200px] truncate"
                >
                  <span className="truncate">{feed.title}</span>
                  <span className="opacity-70">✕</span>
                </button>
              ) : null;
            })()}
            <div className="flex-1" />
            <button
              onClick={() => setSearchOpen(true)}
              className="text-muted-foreground px-1.5 py-1 rounded hover:bg-accent hover:text-foreground"
              aria-label="Search"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </button>
            <button
              onClick={() => setHelpOpen(true)}
              className="hidden md:block text-xs text-muted-foreground px-1.5 py-1 rounded hover:bg-accent"
            >
              <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">?</kbd>
            </button>
          </div>
        </div>

        {/* Main content area */}
        {viewMode === "reading" && currentItem ? (
          <ReadingPane
            item={currentItem}
            onClose={() => setViewMode("triage")}
            onArchive={handleArchive}
            onQueue={handleQueue}
          />
        ) : (
          <ArticleList
            items={items}
            selectedIndex={selectedIndex}
            onSelect={(i) => {
              setSelectedIndex(i);
              // Click opens reading mode directly
              const item = items[i];
              if (item) {
                const queryKey = ["items", selectedFeedId, sidebarView];
                const snapshot = qc.getQueryData<FeedItemWithState[]>(queryKey);
                lastAction.current = { itemId: item.id, action: "read_now", snapshot, queryKey };
                setViewMode("reading");
                api.triageItem(item.id, "read_now").then(() => qc.invalidateQueries({ queryKey: ["feeds"] }));
                api.markRead(item.id, true);
              }
            }}
            onArchive={(i) => {
              const item = items[i];
              if (!item) return;
              hapticLight();
              const ctx = optimisticTriage(item.id, "archive");
              lastAction.current = { itemId: item.id, action: "archive", snapshot: ctx.previous, queryKey: ctx.queryKey };
              api.triageItem(item.id, "archive").then(() => qc.invalidateQueries({ queryKey: ["feeds"] })).catch(() => rollback(ctx));
              showToast("archive");
            }}
            onQueue={(i) => {
              const item = items[i];
              if (!item) return;
              hapticLight();
              const ctx = optimisticTriage(item.id, "queue");
              lastAction.current = { itemId: item.id, action: "queue", snapshot: ctx.previous, queryKey: ctx.queryKey };
              api.triageItem(item.id, "queue").then(() => qc.invalidateQueries({ queryKey: ["feeds"] })).catch(() => rollback(ctx));
              showToast("queue");
            }}
            onRefresh={handleRefresh}
            viewMode="expanded"
            isLoading={isFetching && items.length === 0}
          />
        )}

        {/* Triage bar */}
        {viewMode === "triage" && currentItem && (
          <TriageBar
            isStarred={currentItem.isStarred}
            isPinned={currentItem.isPinned}
            onArchive={handleArchive}
            onQueue={handleQueue}
            onPin={handlePin}
            onStar={handleStar}
          />
        )}

        {/* Reading mode bar */}
        {viewMode === "reading" && currentItem && (
          <div className="border-t bg-muted/30 flex items-center justify-between px-4 gap-1 flex-shrink-0 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button
              onClick={handleStar}
              className={`text-xs px-3 py-2 rounded-md hover:bg-accent ${currentItem.isStarred ? "text-yellow-500" : "text-muted-foreground"}`}
            >
              {currentItem.isStarred ? "★" : "☆"}
            </button>
            <button
              onClick={handlePin}
              className={`text-xs px-3 py-2 rounded-md hover:bg-accent ${currentItem.isPinned ? "text-purple-400" : "text-muted-foreground"}`}
            >
              📌
            </button>
            <button
              onClick={() => setViewMode("triage")}
              className="text-xs px-3 py-2 rounded-md text-muted-foreground hover:bg-accent"
            >
              ← Back
            </button>
            <button
              onClick={() => {
                // Archive current item and advance to next
                hapticLight();
                const ctx = optimisticTriage(currentItem.id, "archive");
                lastAction.current = { itemId: currentItem.id, action: "archive", snapshot: ctx.previous, queryKey: ctx.queryKey };
                api.triageItem(currentItem.id, "archive").then(() => qc.invalidateQueries({ queryKey: ["feeds"] })).catch(() => rollback(ctx));
                showToast("read_done");
                // Advance to next item (selectedIndex stays the same, list shifts)
                // If no more items, go back to triage view
                if (items.length <= 1) {
                  setViewMode("triage");
                }
              }}
              className="text-xs px-3 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Read ✓
            </button>
          </div>
        )}
      </div>

      {/* Command palette (search) */}
      <SearchPalette
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onSelect={(itemId) => {
          // Navigate to the item in reading mode
          setViewMode("reading");
          setPendingItemId(itemId);
          // Reload items in "all" view to ensure the item is loadable
          setSidebarView("all");
          setSelectedFeedId(null);
          setSearchOpen(false);
        }}
      />

      {/* Shortcuts help */}
      <ShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
      <FeedSettingsModal feedId={settingsFeedId} onClose={() => setSettingsFeedId(null)} />
      <OpmlImportModal open={importOpen} onClose={() => setImportOpen(false)} />
      <UndoToast
        message={toastMessage}
        onUndo={handleUndo}
        onDismiss={() => setToastMessage(null)}
      />
    </div>
  );
}

function SearchPalette({ open, onOpenChange, onSelect }: { open: boolean; onOpenChange: (open: boolean) => void; onSelect: (itemId: number) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<api.SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.searchItems(query);
        setResults(res);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  // Reset on close
  useEffect(() => {
    if (!open) { setQuery(""); setResults([]); }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader className="sr-only">
        <DialogTitle>Search</DialogTitle>
        <DialogDescription>Search all articles</DialogDescription>
      </DialogHeader>
      <DialogContent className="top-[15%] sm:top-1/3 translate-y-0 overflow-hidden rounded-xl! p-0" showCloseButton={false}>
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search all articles..."
            value={query}
            onValueChange={setQuery}
            autoFocus
          />
          <CommandList>
            {!query.trim() && <CommandEmpty>Type to search across all articles.</CommandEmpty>}
            {query.trim() && !searching && results.length === 0 && (
              <CommandEmpty>No results found.</CommandEmpty>
            )}
            {results.map((r) => (
              <CommandItem
                key={r.id}
                value={`${r.id}-${r.title}`}
                onSelect={() => onSelect(r.id)}
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {r.feedTitle}
                    </span>
                    <span className="truncate text-sm">{r.title}</span>
                  </div>
                  {r.snippet && (
                    <span
                      className="text-xs text-muted-foreground line-clamp-1 [&_mark]:bg-yellow-200/60 [&_mark]:text-foreground [&_mark]:rounded-sm"
                      dangerouslySetInnerHTML={{ __html: r.snippet }}
                    />
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

function ViewButton({ label, active, onClick, count }: { label: string; active: boolean; onClick: () => void; count?: number }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-2.5 py-1.5 rounded-md transition-colors ${
        active ? "bg-accent font-medium" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
      }`}
    >
      {label}
      {count !== undefined && (
        <span className="ml-1 text-[10px] opacity-60">{count}</span>
      )}
    </button>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ReaderApp />
    </QueryClientProvider>
  );
}
