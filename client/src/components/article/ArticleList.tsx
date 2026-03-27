import { useRef, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils";
import type { FeedItemWithState } from "../../../../shared/types";

interface ArticleListProps {
  items: FeedItemWithState[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  viewMode: "expanded" | "headlines";
}

export function ArticleList({
  items,
  selectedIndex,
  onSelect,
  viewMode,
}: ArticleListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => (viewMode === "expanded" ? 120 : 44),
    overscan: 10,
  });

  // Auto-scroll to keep selected item visible
  useEffect(() => {
    virtualizer.scrollToIndex(selectedIndex, { align: "auto" });
  }, [selectedIndex, virtualizer]);

  if (items.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        No items to show. Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs mx-1">r</kbd> to refresh feeds.
      </div>
    );
  }

  return (
    <div ref={parentRef} className="flex-1 overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const item = items[virtualItem.index];
          return (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              {viewMode === "headlines" ? (
                <HeadlineRow
                  item={item}
                  isSelected={virtualItem.index === selectedIndex}
                  onClick={() => onSelect(virtualItem.index)}
                />
              ) : (
                <ExpandedArticle
                  item={item}
                  isSelected={virtualItem.index === selectedIndex}
                  onClick={() => onSelect(virtualItem.index)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HeadlineRow({
  item,
  isSelected,
  onClick,
}: {
  item: FeedItemWithState;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-2.5 flex items-center gap-3 border-b border-border hover:bg-accent/50 transition-colors",
        isSelected && "bg-accent ring-1 ring-primary/20",
        item.isRead && "opacity-50"
      )}
    >
      <TriageIndicator item={item} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              "text-sm truncate",
              !item.isRead && "font-semibold"
            )}
          >
            {item.title || "Untitled"}
          </span>
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {item.feedTitle}
          </span>
        </div>
      </div>
      <time className="text-xs text-muted-foreground flex-shrink-0">
        {item.publishedAt ? formatRelativeDate(item.publishedAt) : ""}
      </time>
    </button>
  );
}

function ExpandedArticle({
  item,
  isSelected,
  onClick,
}: {
  item: FeedItemWithState;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <article
      onClick={onClick}
      className={cn(
        "px-6 py-4 border-b border-border cursor-pointer hover:bg-accent/30 transition-colors",
        isSelected && "bg-accent/50 ring-1 ring-primary/20",
        item.isRead && "opacity-50"
      )}
    >
      <header className="mb-1.5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <TriageIndicator item={item} />
          {item.feedIconUrl && (
            <img src={item.feedIconUrl} alt="" className="w-4 h-4 rounded-sm" />
          )}
          <span className="font-medium">{item.feedTitle}</span>
          {item.author && (
            <>
              <span>/</span>
              <span>{item.author}</span>
            </>
          )}
          {item.publishedAt && (
            <>
              <span>·</span>
              <time>{formatRelativeDate(item.publishedAt)}</time>
            </>
          )}
          {item.wordCount && (
            <>
              <span>·</span>
              <span>{Math.ceil(item.wordCount / 250)} min</span>
            </>
          )}
        </div>
        <h2
          className={cn(
            "text-base leading-tight",
            !item.isRead && "font-semibold"
          )}
        >
          {item.title || "Untitled"}
        </h2>
      </header>
      {item.summary && (
        <p className="text-sm text-muted-foreground line-clamp-2">
          {stripHtml(item.summary)}
        </p>
      )}
    </article>
  );
}

function TriageIndicator({ item }: { item: FeedItemWithState }) {
  if (item.isStarred) return <span className="text-yellow-500 text-xs flex-shrink-0">★</span>;
  if (item.isPinned) return <span className="text-blue-500 text-xs flex-shrink-0">📌</span>;
  if (item.triageAction === "queue") return <span className="text-green-500 text-xs flex-shrink-0">◆</span>;
  if (!item.isRead) return <span className="text-primary text-xs flex-shrink-0">●</span>;
  return <span className="text-xs flex-shrink-0 opacity-0">●</span>;
}

function formatRelativeDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffH = diffMs / (1000 * 60 * 60);

  if (diffH < 0) return "Just now";
  if (diffH < 1) return `${Math.max(1, Math.round(diffMs / (1000 * 60)))}m`;
  if (diffH < 24) return `${Math.round(diffH)}h`;
  if (diffH < 48) return "1d";
  if (diffH < 168) return `${Math.round(diffH / 24)}d`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&[^;]+;/g, " ").trim();
}
