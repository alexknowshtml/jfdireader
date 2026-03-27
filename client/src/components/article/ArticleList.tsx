import { useRef } from "react";
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
    estimateSize: () => (viewMode === "expanded" ? 300 : 48),
    overscan: 5,
  });

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
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualItem.size}px`,
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
        isSelected && "bg-accent",
        item.isRead && "opacity-60"
      )}
    >
      {item.isStarred && (
        <span className="text-yellow-500 flex-shrink-0">★</span>
      )}
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
        {item.publishedAt
          ? new Date(item.publishedAt).toLocaleDateString()
          : ""}
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
        isSelected && "bg-accent/50",
        item.isRead && "opacity-70"
      )}
    >
      <header className="mb-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          {item.feedIconUrl && (
            <img src={item.feedIconUrl} alt="" className="w-4 h-4 rounded-sm" />
          )}
          <span>{item.feedTitle}</span>
          {item.author && (
            <>
              <span>/</span>
              <span>{item.author}</span>
            </>
          )}
          {item.publishedAt && (
            <>
              <span>·</span>
              <time>{new Date(item.publishedAt).toLocaleDateString()}</time>
            </>
          )}
          {item.isStarred && <span className="text-yellow-500">★</span>}
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
        <p className="text-sm text-muted-foreground line-clamp-3">
          {item.summary}
        </p>
      )}
    </article>
  );
}
