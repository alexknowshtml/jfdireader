import type { FeedItemWithState } from "../../../../shared/types";

interface ReadingPaneProps {
  item: FeedItemWithState;
  onClose: () => void;
}

export function ReadingPane({ item }: ReadingPaneProps) {
  return (
    <div className="flex-1 overflow-auto bg-background">
      <div className="max-w-2xl mx-auto py-8 px-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
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
                <time>{formatDate(item.publishedAt)}</time>
              </>
            )}
            {item.wordCount && (
              <>
                <span>·</span>
                <span>{Math.ceil(item.wordCount / 250)} min read</span>
              </>
            )}
          </div>
          <h1 className="text-2xl font-bold leading-tight mb-2">
            {item.title || "Untitled"}
          </h1>
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              View original →
            </a>
          )}
        </div>

        {/* Content */}
        <div
          className="prose prose-sm dark:prose-invert max-w-none
            prose-headings:font-semibold prose-a:text-primary
            prose-img:rounded-lg prose-pre:bg-muted"
          dangerouslySetInnerHTML={{
            __html: item.content || item.summary || "<p>No content available.</p>",
          }}
        />

        {/* Footer actions hint */}
        <div className="mt-12 pt-4 border-t text-xs text-muted-foreground flex gap-4">
          <span>
            <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">s</kbd> skip
          </span>
          <span>
            <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">q</kbd> queue
          </span>
          <span>
            <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">f</kbd> star
          </span>
          <span>
            <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">v</kbd> original
          </span>
          <span>
            <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Esc</kbd> back
          </span>
        </div>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffH = diffMs / (1000 * 60 * 60);

  if (diffH < 1) return `${Math.round(diffMs / (1000 * 60))}m ago`;
  if (diffH < 24) return `${Math.round(diffH)}h ago`;
  if (diffH < 48) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
