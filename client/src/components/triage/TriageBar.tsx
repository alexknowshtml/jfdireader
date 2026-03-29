interface TriageBarProps {
  isStarred: boolean;
  isPinned: boolean;
  onArchive: () => void;
  onQueue: () => void;
  onPin: () => void;
  onStar: () => void;
}

export function TriageBar({
  isStarred,
  isPinned,
  onArchive,
  onQueue,
  onPin,
  onStar,
}: TriageBarProps) {
  return (
    <div
      className="flex-shrink-0 bg-card border-t border-border"
      style={{ boxShadow: '0 -8px 24px rgba(0,0,0,0.15), 0 -2px 8px rgba(0,0,0,0.08)' }}
    >
      <div className="flex items-center justify-between px-4 gap-1 pt-2.5 pb-3">
        <button
          onClick={onStar}
          className={`text-xs px-3 py-2 rounded-md hover:bg-accent ${isStarred ? "text-yellow-500" : "text-muted-foreground"}`}
        >
          {isStarred ? "★" : "☆"}
        </button>
        <button
          onClick={onPin}
          className={`text-xs px-3 py-2 rounded-md hover:bg-accent ${isPinned ? "text-purple-400" : "text-muted-foreground"}`}
        >
          📌
        </button>
        <button
          onClick={onArchive}
          className="text-xs px-3 py-2 rounded-md text-muted-foreground hover:bg-accent"
        >
          Archive
        </button>
        <button
          onClick={onQueue}
          className="text-xs px-3 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Queue
        </button>
      </div>
      <div className="safe-area-bottom" />
    </div>
  );
}
