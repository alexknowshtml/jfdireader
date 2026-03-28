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
    <div className="border-t bg-muted/30 flex items-center justify-between px-4 gap-1 flex-shrink-0 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
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
  );
}
