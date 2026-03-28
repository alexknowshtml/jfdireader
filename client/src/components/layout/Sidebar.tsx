import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useRef, useCallback } from "react";
import { hapticMedium } from "@/lib/haptics";

interface SidebarFeed {
  id: number;
  title: string | null;
  iconUrl: string | null;
  unreadCount: number;
}

interface SidebarFolder {
  id: number;
  name: string;
  feeds: SidebarFeed[];
}

interface SidebarProps {
  folders: SidebarFolder[];
  unfiledFeeds: SidebarFeed[];
  selectedFeedId: number | null;
  selectedView: string;
  onSelectFeed: (feedId: number | null) => void;
  onSelectView: (view: string) => void;
  onFeedSettings: (feedId: number) => void;
  onImportOpml: () => void;
  totalUnread: number;
  totalQueued: number;
}

export function Sidebar({
  folders,
  unfiledFeeds,
  selectedFeedId,
  selectedView,
  onSelectFeed,
  onSelectView,
  totalUnread,
  totalQueued,
  onFeedSettings,
  onImportOpml,
}: SidebarProps) {
  return (
    <div className="w-64 border-r border-sidebar-border bg-sidebar flex flex-col h-full flex-shrink-0 rounded-tr-2xl overflow-hidden">
      <div className="p-4 pt-[max(1rem,env(safe-area-inset-top))] font-semibold text-lg tracking-tight">
        JFDI Reader
      </div>
      <Separator />
      <ScrollArea className="flex-1">
        <div className="p-2">
          {/* Inbox (untriaged) */}
          <button
            onClick={() => {
              onSelectFeed(null);
              onSelectView("unread");
            }}
            className={cn(
              "w-full text-left px-3 py-2 rounded-md text-sm flex justify-between items-center hover:bg-accent",
              selectedFeedId === null &&
                selectedView === "unread" &&
                "bg-accent font-medium"
            )}
          >
            <span>Inbox</span>
            {totalUnread > 0 && (
              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                {totalUnread}
              </span>
            )}
          </button>

          {/* Queue */}
          <button
            onClick={() => {
              onSelectFeed(null);
              onSelectView("queue");
            }}
            className={cn(
              "w-full text-left px-3 py-2 rounded-md text-sm flex justify-between items-center hover:bg-accent",
              selectedView === "queue" && "bg-accent font-medium"
            )}
          >
            <span>◆ Reading Queue</span>
            {totalQueued > 0 && (
              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                {totalQueued}
              </span>
            )}
          </button>

          {/* Starred */}
          <button
            onClick={() => {
              onSelectFeed(null);
              onSelectView("starred");
            }}
            className={cn(
              "w-full text-left px-3 py-2 rounded-md text-sm hover:bg-accent",
              selectedView === "starred" && "bg-accent font-medium"
            )}
          >
            ★ Starred
          </button>

          {/* All items */}
          <button
            onClick={() => {
              onSelectFeed(null);
              onSelectView("all");
            }}
            className={cn(
              "w-full text-left px-3 py-2 rounded-md text-sm hover:bg-accent",
              selectedFeedId === null &&
                selectedView === "all" &&
                "bg-accent font-medium"
            )}
          >
            All items
          </button>

          <Separator className="my-2" />

          {/* Folders */}
          {folders.map((folder) => (
            <div key={folder.id} className="mb-1">
              <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {folder.name}
              </div>
              {folder.feeds.map((feed) => (
                <FeedItem
                  key={feed.id}
                  feed={feed}
                  isSelected={selectedFeedId === feed.id}
                  onSelect={() => {
                    onSelectFeed(feed.id);
                  }}
                  onSettings={() => onFeedSettings(feed.id)}
                />
              ))}
            </div>
          ))}

          {/* Unfiled feeds */}
          {unfiledFeeds.length > 0 && (
            <>
              {folders.length > 0 && <Separator className="my-2" />}
              {unfiledFeeds.map((feed) => (
                <FeedItem
                  key={feed.id}
                  feed={feed}
                  isSelected={selectedFeedId === feed.id}
                  onSelect={() => {
                    onSelectFeed(feed.id);
                  }}
                  onSettings={() => onFeedSettings(feed.id)}
                />
              ))}
            </>
          )}

          <Separator className="my-2" />

          {/* Import OPML */}
          <button
            onClick={onImportOpml}
            className="w-full text-left px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent flex items-center gap-2"
          >
            <span className="text-base leading-none">+</span> Import OPML
          </button>
        </div>
      </ScrollArea>
    </div>
  );
}

function FeedItem({
  feed,
  isSelected,
  onSelect,
  onSettings,
}: {
  feed: SidebarFeed;
  isSelected: boolean;
  onSelect: () => void;
  onSettings: () => void;
}) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  const startPress = useCallback(() => {
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      hapticMedium();
      onSettings();
    }, 500);
  }, [onSettings]);

  const endPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleClick = useCallback(() => {
    if (!didLongPress.current) {
      onSelect();
    }
  }, [onSelect]);

  return (
    <div
      className={cn(
        "group w-full text-left px-3 py-1.5 rounded-md text-sm flex justify-between items-center hover:bg-accent cursor-pointer select-none",
        isSelected && "bg-accent font-medium"
      )}
      onClick={handleClick}
      onTouchStart={startPress}
      onTouchEnd={endPress}
      onTouchCancel={endPress}
      onMouseDown={startPress}
      onMouseUp={endPress}
      onMouseLeave={endPress}
    >
      <span className="flex items-center gap-2 truncate">
        {feed.iconUrl ? (
          <img
            src={feed.iconUrl}
            alt=""
            className="w-4 h-4 rounded-sm"
          />
        ) : (
          <div className="w-4 h-4 rounded-sm bg-muted flex-shrink-0" />
        )}
        <span className="truncate">{feed.title || "Untitled"}</span>
      </span>
      <span className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); onSettings(); }}
          className="hidden md:block opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground w-5 text-center text-xs"
          title="Feed settings"
        >
          ⚙
        </button>
        {feed.unreadCount > 0 && (
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full flex-shrink-0 min-w-[1.5rem] text-center">
            {feed.unreadCount}
          </span>
        )}
      </span>
    </div>
  );
}
