import { useState, useEffect } from "react";
import { getItemContent } from "@/lib/api";
import type { FeedItemWithState } from "../../../../shared/types";

interface ReadingPaneProps {
  item: FeedItemWithState;
  onClose: () => void;
}

export function ReadingPane({ item }: ReadingPaneProps) {
  const [content, setContent] = useState<string | null>(item.content || null);

  // Fetch full content on demand if not already loaded
  useEffect(() => {
    if (!item.content) {
      getItemContent(item.id).then((data) => {
        setContent(data.content || data.summary || null);
      });
    } else {
      setContent(item.content);
    }
  }, [item.id, item.content]);
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
            prose-img:rounded-lg prose-pre:bg-muted
            prose-p:my-2 prose-p:leading-relaxed
            [&_p:empty]:hidden [&_p_br:only-child]:hidden
            [&_br+br]:hidden"
          dangerouslySetInnerHTML={{
            __html: cleanContent(content || item.summary || "<p>Loading...</p>"),
          }}
        />

        {/* Bottom spacer so content doesn't get hidden behind the bar */}
        <div className="h-16" />
      </div>
    </div>
  );
}

/**
 * Clean up common RSS content issues:
 * - Empty paragraphs with just <br> tags
 * - Consecutive <br> tags creating excessive whitespace
 * - Non-breaking spaces used as spacers
 * - Empty paragraphs
 */
function cleanContent(html: string): string {
  return html
    // Remove <p> tags that only contain <br> and/or whitespace
    .replace(/<p[^>]*>\s*(<br\s*\/?>[\s\n]*)+\s*<\/p>/gi, "")
    // Remove empty <p> tags
    .replace(/<p[^>]*>\s*<\/p>/gi, "")
    // Collapse 3+ consecutive <br> into 2
    .replace(/(<br\s*\/?>[\s\n]*){3,}/gi, "<br><br>")
    // Remove leading/trailing <br> inside <p> tags
    .replace(/<p([^>]*)>\s*<br\s*\/?>\s*/gi, "<p$1>")
    .replace(/\s*<br\s*\/?>\s*<\/p>/gi, "</p>")
    // Replace &nbsp; sequences used as spacers
    .replace(/(&nbsp;\s*){3,}/g, " ");
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
