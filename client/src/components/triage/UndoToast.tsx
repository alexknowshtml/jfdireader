import { useEffect, useRef } from "react";

interface UndoToastProps {
  message: string | null;
  onUndo: () => void;
  onDismiss: () => void;
}

const AUTO_DISMISS_MS = 4000;

export function UndoToast({ message, onUndo, onDismiss }: UndoToastProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!message) return;

    // Reset timer on every new message
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(onDismiss, AUTO_DISMISS_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="flex items-center gap-3 bg-foreground text-background rounded-lg px-4 py-2.5 shadow-lg text-sm">
        <span>{message}</span>
        <button
          onClick={() => {
            onUndo();
            onDismiss();
          }}
          className="font-semibold text-primary-foreground bg-white/20 hover:bg-white/30 rounded px-2.5 py-1 transition-colors"
        >
          Undo
        </button>
      </div>
    </div>
  );
}
