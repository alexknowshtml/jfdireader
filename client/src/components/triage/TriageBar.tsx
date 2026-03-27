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
  isStarred,
  onSkip,
  onQueue,
  onPin,
  onStar,
}: TriageBarProps) {
  return (
    <div className="border-t bg-muted/30 px-4 pt-2.5 pb-14 md:pb-3 flex-shrink-0">
      <div className="flex items-center justify-center gap-2">
        <TriageButton
          label="Skip"
          shortcut="s"
          onClick={onSkip}
          variant="muted"
        />
        <TriageButton
          label="Read Now"
          mobileLabel="Read"
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
    </div>
  );
}

function TriageButton({
  label,
  mobileLabel,
  shortcut,
  onClick,
  variant = "default",
}: {
  label: string;
  mobileLabel?: string;
  shortcut: string;
  onClick: () => void;
  variant?: "default" | "primary" | "muted" | "starred";
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-2 text-xs rounded-md flex items-center gap-1.5 transition-colors",
        variant === "primary" && "bg-primary text-primary-foreground hover:bg-primary/90",
        variant === "default" && "bg-accent hover:bg-accent/80",
        variant === "muted" && "text-muted-foreground hover:bg-accent",
        variant === "starred" && "text-yellow-500 hover:bg-accent"
      )}
    >
      {mobileLabel ? (
        <>
          <span className="md:hidden">{mobileLabel}</span>
          <span className="hidden md:inline">{label}</span>
        </>
      ) : (
        label
      )}
      <kbd className="text-[10px] opacity-60">{shortcut}</kbd>
    </button>
  );
}
