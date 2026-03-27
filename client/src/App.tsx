import { useState, useCallback } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/Sidebar";
import { ArticleList } from "@/components/article/ArticleList";
import { useKeyboardNav } from "@/hooks/useKeyboardNav";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandItem,
} from "@/components/ui/command";
import type { FeedItemWithState } from "../../shared/types";

const queryClient = new QueryClient();

// Demo data for initial UI
const DEMO_ITEMS: FeedItemWithState[] = [
  {
    id: 1,
    feedId: 1,
    guid: "1",
    url: "https://example.com/welcome",
    title: "Welcome to JFDI Reader",
    author: "JFDI Reader",
    content: "<p>Your modern RSS reader is ready. Add feeds to get started.</p>",
    summary:
      "Your modern RSS reader is ready. Subscribe to your first feed to start reading.",
    publishedAt: new Date().toISOString(),
    fetchedAt: new Date().toISOString(),
    thumbnailUrl: null,
    wordCount: 15,
    engagementTier: "unseen",
    triageAction: null,
    isRead: false,
    isStarred: false,
    isPinned: false,
    queuedAt: null,
    feedTitle: "Getting Started",
    feedIconUrl: null,
  },
];

function ReaderApp() {
  const [selectedFeedId, setSelectedFeedId] = useState<number | null>(null);
  const [selectedView, setSelectedView] = useState<"all" | "starred">("all");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"expanded" | "headlines">(
    "expanded"
  );
  const [searchOpen, setSearchOpen] = useState(false);
  const items = DEMO_ITEMS;

  const next = useCallback(() => {
    setSelectedIndex((i) => Math.min(i + 1, items.length - 1));
  }, [items.length]);

  const prev = useCallback(() => {
    setSelectedIndex((i) => Math.max(i - 1, 0));
  }, []);

  useKeyboardNav({
    onNext: next,
    onPrev: prev,
    onOpen: () =>
      setViewMode((m) => (m === "expanded" ? "headlines" : "expanded")),
    onStar: () => {},
    onMarkRead: () => {},
    onMarkAllRead: () => {},
    onSearch: () => setSearchOpen(true),
    onOpenOriginal: () => {
      const item = items[selectedIndex];
      if (item?.url) window.open(item.url, "_blank");
    },
  });

  return (
    <div className="flex h-screen">
      <Sidebar
        folders={[]}
        unfiledFeeds={[
          { id: 1, title: "Getting Started", iconUrl: null, unreadCount: 1 },
        ]}
        selectedFeedId={selectedFeedId}
        selectedView={selectedView}
        onSelectFeed={setSelectedFeedId}
        onSelectView={setSelectedView}
        totalUnread={1}
      />

      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="h-12 border-b flex items-center px-4 gap-3">
          <button
            onClick={() => setViewMode("expanded")}
            className={`text-xs px-2 py-1 rounded ${
              viewMode === "expanded"
                ? "bg-accent font-medium"
                : "text-muted-foreground"
            }`}
          >
            Expanded
          </button>
          <button
            onClick={() => setViewMode("headlines")}
            className={`text-xs px-2 py-1 rounded ${
              viewMode === "headlines"
                ? "bg-accent font-medium"
                : "text-muted-foreground"
            }`}
          >
            Headlines
          </button>
          <div className="flex-1" />
          <span className="text-xs text-muted-foreground">
            Press{" "}
            <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">?</kbd>{" "}
            for shortcuts
          </span>
        </div>

        {/* Article list */}
        <ArticleList
          items={items}
          selectedIndex={selectedIndex}
          onSelect={setSelectedIndex}
          viewMode={viewMode}
        />
      </div>

      {/* Command palette (search) */}
      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput placeholder="Search articles..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {items.map((item) => (
            <CommandItem key={item.id} value={item.title || ""}>
              {item.title}
            </CommandItem>
          ))}
        </CommandList>
      </CommandDialog>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ReaderApp />
    </QueryClientProvider>
  );
}
