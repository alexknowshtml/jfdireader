interface ShortcutsHelpProps {
  open: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { section: "Navigation", keys: [
    { key: "j / ↓", action: "Next item" },
    { key: "k / ↑", action: "Previous item" },
    { key: "Enter", action: "Open / read now" },
    { key: "Esc", action: "Close reading pane" },
  ]},
  { section: "Triage", keys: [
    { key: "s", action: "Skip (mark read)" },
    { key: "q", action: "Queue for later" },
    { key: "p", action: "Pin to top of queue" },
    { key: "Shift+A", action: "Mark all read" },
  ]},
  { section: "Actions", keys: [
    { key: "f", action: "Star / favorite" },
    { key: "v", action: "Open original in browser" },
    { key: "r", action: "Refresh feeds" },
    { key: "/", action: "Search" },
    { key: "?", action: "Show this help" },
  ]},
];

export function ShortcutsHelp({ open, onClose }: ShortcutsHelpProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-popover border rounded-lg shadow-lg p-6 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-4">Keyboard Shortcuts</h2>
        {SHORTCUTS.map((section) => (
          <div key={section.section} className="mb-4">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              {section.section}
            </h3>
            <div className="space-y-1">
              {section.keys.map(({ key, action }) => (
                <div key={key} className="flex justify-between text-sm">
                  <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">
                    {key}
                  </kbd>
                  <span className="text-muted-foreground">{action}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
        <p className="text-xs text-muted-foreground mt-4">
          Press <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Esc</kbd> to close
        </p>
      </div>
    </div>
  );
}
