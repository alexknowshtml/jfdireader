import { useState, useCallback, useEffect, useRef } from "react";
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/Sidebar";
import { ArticleList } from "@/components/article/ArticleList";
import { ReadingPane } from "@/components/article/ReadingPane";
import { TriageBar } from "@/components/triage/TriageBar";
import { ShortcutsHelp } from "@/components/triage/ShortcutsHelp";
import { useKeyboardNav } from "@/hooks/useKeyboardNav";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandItem,
} from "@/components/ui/command";
import * as api from "@/lib/api";
import type { FeedItemWithState } from "../../shared/types";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: true },
  },
});

type ViewMode = "triage" | "reading";
type SidebarView = "all" | "unread" | "starred" | "queue";

function ReaderApp() {
  const qc = useQueryClient();
  const [selectedFeedId, setSelectedFeedId] = useState<number | null>(null);
  const [sidebarView, setSidebarView] = useState<SidebarView>("unread");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("triage");
  const [searchOpen, setSearchOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const lastAction = useRef<{ itemId: number; action: string } | null>(null);

  // Fetch feeds for sidebar
  const { data: feeds = [] } = useQuery({
    queryKey: ["feeds"],
    queryFn: api.getFeeds,
  });

  // Fetch items based on current view
  const { data: items = [], isLoading } = useQuery({
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

  // Reset selection when view changes
  useEffect(() => {
    setSelectedIndex(0);
    setViewMode("triage");
  }, [selectedFeedId, sidebarView]);

  // Invalidate and advance after triage action
  const afterTriage = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["items"] });
    qc.invalidateQueries({ queryKey: ["feeds"] });
    // Don't advance index - the item will disappear from the unread list
    // and the next item will slide into this position
  }, [qc]);

  const handleSkip = useCallback(async () => {
    if (!currentItem) return;
    lastAction.current = { itemId: currentItem.id, action: "skip" };
    await api.triageItem(currentItem.id, "skip");
    afterTriage();
  }, [currentItem, afterTriage]);

  const handleReadNow = useCallback(() => {
    if (!currentItem) return;
    lastAction.current = { itemId: currentItem.id, action: "read_now" };
    setViewMode("reading");
    api.triageItem(currentItem.id, "read_now");
    api.markRead(currentItem.id, true);
  }, [currentItem]);

  const handleQueue = useCallback(async () => {
    if (!currentItem) return;
    lastAction.current = { itemId: currentItem.id, action: "queue" };
    await api.triageItem(currentItem.id, "queue");
    afterTriage();
  }, [currentItem, afterTriage]);

  const handlePin = useCallback(async () => {
    if (!currentItem) return;
    lastAction.current = { itemId: currentItem.id, action: "pin" };
    await api.triageItem(currentItem.id, "pin");
    afterTriage();
  }, [currentItem, afterTriage]);

  const handleUndo = useCallback(async () => {
    if (!lastAction.current) return;
    await api.undoTriage(lastAction.current.itemId);
    lastAction.current = null;
    afterTriage();
  }, [afterTriage]);

  const handleStar = useCallback(async () => {
    if (!currentItem) return;
    await api.starItem(currentItem.id, !currentItem.isStarred);
    qc.invalidateQueries({ queryKey: ["items"] });
  }, [currentItem, qc]);

  const handleMarkAllRead = useCallback(async () => {
    await api.markAllRead(selectedFeedId ?? undefined);
    afterTriage();
  }, [selectedFeedId, afterTriage]);

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
    onSkip: handleSkip,
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
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar
        folders={[]}
        unfiledFeeds={unfiledFeeds}
        selectedFeedId={selectedFeedId}
        selectedView={sidebarView === "starred" ? "starred" : "all"}
        onSelectFeed={(id) => {
          setSelectedFeedId(id);
          setSidebarView("unread");
        }}
        onSelectView={(v) => {
          setSelectedFeedId(null);
          setSidebarView(v as SidebarView);
        }}
        totalUnread={totalUnread}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="h-12 border-b flex items-center px-4 gap-3 flex-shrink-0">
          <ViewButton label="Unread" active={sidebarView === "unread"} onClick={() => setSidebarView("unread")} />
          <ViewButton label="All" active={sidebarView === "all"} onClick={() => setSidebarView("all")} />
          <ViewButton label="Starred" active={sidebarView === "starred"} onClick={() => setSidebarView("starred")} />
          <ViewButton label="Queue" active={sidebarView === "queue"} onClick={() => setSidebarView("queue")} />
          <div className="flex-1" />
          {isLoading && (
            <span className="text-xs text-muted-foreground">Loading...</span>
          )}
          <span className="text-xs text-muted-foreground">
            {items.length} items
          </span>
          <span className="text-xs text-muted-foreground">
            <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">?</kbd>{" "}
            shortcuts
          </span>
        </div>

        {/* Main content area */}
        {viewMode === "reading" && currentItem ? (
          <ReadingPane item={currentItem} onClose={() => setViewMode("triage")} />
        ) : (
          <ArticleList
            items={items}
            selectedIndex={selectedIndex}
            onSelect={(i) => setSelectedIndex(i)}
            viewMode="expanded"
          />
        )}

        {/* Triage bar */}
        {viewMode === "triage" && currentItem && (
          <TriageBar
            itemTitle={currentItem.title}
            isStarred={currentItem.isStarred}
            onSkip={handleSkip}
            onQueue={handleQueue}
            onPin={handlePin}
            onStar={handleStar}
          />
        )}
      </div>

      {/* Command palette (search) */}
      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput placeholder="Search articles..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {items.map((item) => (
            <CommandItem
              key={item.id}
              value={item.title || ""}
              onSelect={() => {
                const idx = items.findIndex((i) => i.id === item.id);
                if (idx >= 0) setSelectedIndex(idx);
                setSearchOpen(false);
              }}
            >
              <span className="text-xs text-muted-foreground mr-2">
                {item.feedTitle}
              </span>
              {item.title}
            </CommandItem>
          ))}
        </CommandList>
      </CommandDialog>

      {/* Shortcuts help */}
      <ShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}

function ViewButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-2 py-1 rounded ${
        active ? "bg-accent font-medium" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
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
