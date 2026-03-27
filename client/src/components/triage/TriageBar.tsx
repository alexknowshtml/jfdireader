import { cn } from "@/lib/utils";

interface TriageBarProps {
  itemTitle: string | null;
  isStarred: boolean;
  onSkip: () => void;
  onQueue: () => void;
  onPin: () => void;
  onStar: () => void;
}

export function TriageBar({
  itemTitle,
  isStarred,
  onSkip,
  onQueue,
  onPin,
  onStar,
}: TriageBarProps) {
  return (
    <div className="border-t bg-muted/30 flex items-center px-4 gap-2 pb-[max(env(safe-area-inset-bottom),1.5rem)] min-h-12">
      <span className="text-xs text-muted-foreground truncate flex-1 mr-4">
        {itemTitle || "No item selected"}
      </span>
      <TriageButton
        label="Skip"
        shortcut="s"
        onClick={onSkip}
        variant="muted"
      />
      <TriageButton
        label="Read Now"
        shortcut="↵"
        onClick={() => {}}
        variant="primary"
      />
      <TriageButton
        label="Queue"
        shortcut="q"
        onClick={onQueue}
        variant="default"
      />
      <TriageButton
        label="Pin"
        shortcut="p"
        onClick={onPin}
        variant="default"
      />
      <TriageButton
        label={isStarred ? "★" : "☆"}
        shortcut="f"
        onClick={onStar}
        variant={isStarred ? "starred" : "muted"}
      />
    </div>
  );
}

function TriageButton({
  label,
  shortcut,
  onClick,
  variant = "default",
}: {
  label: string;
  shortcut: string;
  onClick: () => void;
  variant?: "default" | "primary" | "muted" | "starred";
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 text-xs rounded-md flex items-center gap-1.5 transition-colors",
        variant === "primary" && "bg-primary text-primary-foreground hover:bg-primary/90",
        variant === "default" && "bg-accent hover:bg-accent/80",
        variant === "muted" && "text-muted-foreground hover:bg-accent",
        variant === "starred" && "text-yellow-500 hover:bg-accent"
      )}
    >
      {label}
      <kbd className="text-[10px] opacity-60">{shortcut}</kbd>
    </button>
  );
}
