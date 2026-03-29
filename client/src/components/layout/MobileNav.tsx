import { cn } from "@/lib/utils";

interface MobileNavProps {
  // List mode
  activeView: string;
  unreadCount: number;
  queueCount: number;
  onSelectView: (view: string) => void;
  onOpenSources: () => void;
  // Reading mode
  isReading: boolean;
  isStarred?: boolean;
  isPinned?: boolean;
  onBack: () => void;
  onStar: () => void;
  onPin: () => void;
  onDone: () => void;
}

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 text-[10px] font-semibold rounded-full bg-primary text-primary-foreground flex items-center justify-center">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function MobileNav({
  activeView,
  unreadCount,
  queueCount,
  onSelectView,
  onOpenSources,
  isReading,
  isStarred = false,
  isPinned = false,
  onBack,
  onStar,
  onPin,
  onDone,
}: MobileNavProps) {
  return (
    <nav
      className="md:hidden flex-shrink-0 bg-card border-t border-border pb-[env(safe-area-inset-bottom,0px)]"
      style={{ boxShadow: '0 -8px 24px rgba(0,0,0,0.15), 0 -2px 8px rgba(0,0,0,0.08)' }}
    >
      <div className="grid grid-cols-4 h-14">
        {isReading ? (
          <>
            {/* Reading mode actions */}
            <NavButton
              icon={<ArrowLeftIcon />}
              label="Back"
              onClick={onBack}
            />
            <NavButton
              icon={<StarIcon filled={isStarred} />}
              label="Star"
              onClick={onStar}
              active={isStarred}
              activeColor="text-yellow-500"
            />
            <NavButton
              icon={<PinIcon active={isPinned} />}
              label="Pin"
              onClick={onPin}
              active={isPinned}
              activeColor="text-purple-400"
            />
            <NavButton
              icon={<CheckIcon />}
              label="Done"
              onClick={onDone}
              active
              activeColor="text-primary"
            />
          </>
        ) : (
          <>
            {/* List mode navigation */}
            <NavButton
              icon={<SourcesIcon />}
              label="Sources"
              onClick={onOpenSources}
            />
            <NavButton
              icon={<QueueIcon />}
              label="Queue"
              onClick={() => onSelectView("queue")}
              active={activeView === "queue"}
              badge={queueCount}
            />
            <NavButton
              icon={<StarIcon filled={activeView === "starred"} />}
              label="Starred"
              onClick={() => onSelectView("starred")}
              active={activeView === "starred"}
            />
            <NavButton
              icon={<InboxIcon />}
              label="Inbox"
              onClick={() => onSelectView("unread")}
              active={activeView === "unread"}
              badge={unreadCount}
            />
          </>
        )}
      </div>
    </nav>
  );
}

function NavButton({
  icon,
  label,
  onClick,
  active = false,
  activeColor,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  activeColor?: string;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 transition-colors relative",
        active
          ? (activeColor || "text-primary")
          : "text-muted-foreground active:text-foreground"
      )}
    >
      <span className="relative">
        {icon}
        {badge !== undefined && <Badge count={badge} />}
      </span>
      <span className="text-xs">{label}</span>
    </button>
  );
}

// SVG Icons (w-5 h-5 to match Andy Core)
function InboxIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
}

function QueueIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
    </svg>
  );
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function SourcesIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}

function PinIcon({ active }: { active: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" x2="12" y1="17" y2="22" />
      <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
