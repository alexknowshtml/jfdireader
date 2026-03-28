import { useRef, useEffect, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useSwipe } from "@/hooks/useSwipe";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { cn } from "@/lib/utils";
import type { FeedItemWithState } from "../../../../shared/types";

interface ArticleListProps {
  items: FeedItemWithState[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onArchive?: (index: number) => void;
  onQueue?: (index: number) => void;
  onRefresh?: () => Promise<void>;
  viewMode: "expanded" | "headlines";
  isLoading?: boolean;
}

export function ArticleList({
  items,
  selectedIndex,
  onSelect,
  onArchive,
  onQueue,
  onRefresh,
  viewMode,
  isLoading,
}: ArticleListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const { state: pullState, handlers: pullHandlers } = usePullToRefresh(
    parentRef,
    onRefresh || (async () => {})
  );

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
        {isLoading ? (
          <div className="animate-spin w-5 h-5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full" />
        ) : (
          <>No items to show. Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs mx-1">r</kbd> to refresh feeds.</>
        )}
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="flex-1 overflow-auto"
      {...(onRefresh ? pullHandlers : {})}
    >
      {/* Pull-to-refresh indicator */}
      {(pullState.pulling || pullState.refreshing) && (
        <div
          className="flex items-center justify-center overflow-hidden transition-[height] duration-200"
          style={{ height: pullState.pullDistance }}
        >
          {pullState.refreshing ? (
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg
              className={cn(
                "w-5 h-5 text-muted-foreground transition-transform duration-200",
                pullState.pullDistance >= 60 && "text-primary rotate-180"
              )}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 5v14M5 12l7-7 7 7" />
            </svg>
          )}
        </div>
      )}
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
          paddingBottom: "4rem",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const item = items[virtualItem.index];
          const idx = virtualItem.index;
          return (
            <div
              key={virtualItem.key}
              data-index={idx}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <SwipeableRow
                key={item.id}
                onSwipeRight={onArchive ? () => onArchive(idx) : undefined}
                onSwipeLeft={onQueue ? () => onQueue(idx) : undefined}
              >
                {viewMode === "headlines" ? (
                  <HeadlineRow
                    item={item}
                    isSelected={idx === selectedIndex}
                    onClick={() => onSelect(idx)}
                  />
                ) : (
                  <ExpandedArticle
                    item={item}
                    isSelected={idx === selectedIndex}
                    onClick={() => onSelect(idx)}
                  />
                )}
              </SwipeableRow>
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

function SwipeableRow({
  onSwipeRight,
  onSwipeLeft,
  children,
}: {
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  children: React.ReactNode;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [direction, setDirection] = useState<"left" | "right" | null>(null);

  const swipe = useSwipe({
    onSwipeRight,
    onSwipeLeft,
    ref: contentRef,
    onDirectionChange: setDirection,
  });

  return (
    <div className="relative overflow-hidden">
      {/* Archive reveal (swipe right) */}
      {direction === "right" && (
        <div className="absolute inset-0 flex items-center justify-start px-6 bg-emerald-500 text-white text-sm font-semibold">
          Archive →
        </div>
      )}
      {/* Queue reveal (swipe left) */}
      {direction === "left" && (
        <div className="absolute inset-0 flex items-center justify-end px-6 bg-purple-600 text-white text-sm font-semibold">
          ← Queue
        </div>
      )}
      {/* Swipeable content */}
      <div
        ref={contentRef}
        className="relative bg-background"
        {...swipe}
      >
        {children}
      </div>
    </div>
  );
}

function TriageIndicator({ item }: { item: FeedItemWithState }) {
  if (item.isStarred) return <span className="text-yellow-500 text-xs flex-shrink-0">★</span>;
  if (item.isPinned) return <span className="text-purple-400 text-xs flex-shrink-0">📌</span>;
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
