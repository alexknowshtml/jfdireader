import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

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
  selectedView: "all" | "starred";
  onSelectFeed: (feedId: number | null) => void;
  onSelectView: (view: "all" | "starred") => void;
  totalUnread: number;
}

export function Sidebar({
  folders,
  unfiledFeeds,
  selectedFeedId,
  selectedView,
  onSelectFeed,
  onSelectView,
  totalUnread,
}: SidebarProps) {
  return (
    <div className="w-64 border-r bg-sidebar flex flex-col h-full">
      <div className="p-4 font-semibold text-lg tracking-tight">
        Goodreader
      </div>
      <Separator />
      <ScrollArea className="flex-1">
        <div className="p-2">
          {/* All items */}
          <button
            onClick={() => {
              onSelectFeed(null);
              onSelectView("all");
            }}
            className={cn(
              "w-full text-left px-3 py-2 rounded-md text-sm flex justify-between items-center hover:bg-accent",
              selectedFeedId === null &&
                selectedView === "all" &&
                "bg-accent font-medium"
            )}
          >
            <span>All items</span>
            {totalUnread > 0 && (
              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                {totalUnread}
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
            Starred
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
                    onSelectView("all");
                  }}
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
                    onSelectView("all");
                  }}
                />
              ))}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function FeedItem({
  feed,
  isSelected,
  onSelect,
}: {
  feed: SidebarFeed;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full text-left px-3 py-1.5 rounded-md text-sm flex justify-between items-center hover:bg-accent",
        isSelected && "bg-accent font-medium"
      )}
    >
      <span className="flex items-center gap-2 truncate">
        {feed.iconUrl ? (
          <img
            src={feed.iconUrl}
            alt=""
            className="w-4 h-4 rounded-sm"
          />
        ) : (
          <div className="w-4 h-4 rounded-sm bg-muted" />
        )}
        <span className="truncate">{feed.title || "Untitled"}</span>
      </span>
      {feed.unreadCount > 0 && (
        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full ml-2 flex-shrink-0">
          {feed.unreadCount}
        </span>
      )}
    </button>
  );
}
