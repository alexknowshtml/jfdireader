import { useEffect, useCallback } from "react";

interface KeyboardNavOptions {
  onNext: () => void;
  onPrev: () => void;
  onOpen: () => void;          // Enter - read now / toggle reading pane
  onSkip: () => void;          // s - skip (mark read, advance)
  onQueue: () => void;         // q - queue for later
  onPin: () => void;           // p - pin to top of queue
  onStar: () => void;          // f - favorite/star toggle
  onMarkAllRead: () => void;   // Shift+A - mark all read
  onSearch: () => void;        // / - open search
  onOpenOriginal: () => void;  // v - open in browser
  onRefresh: () => void;       // r - refresh feeds
  onHelp: () => void;          // ? - show shortcuts
  enabled?: boolean;
}

export function useKeyboardNav(options: KeyboardNavOptions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (options.enabled === false) return;

      // Don't capture when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case "j":
        case "ArrowDown":
          e.preventDefault();
          options.onNext();
          break;
        case "k":
        case "ArrowUp":
          e.preventDefault();
          options.onPrev();
          break;
        case "Enter":
          e.preventDefault();
          options.onOpen();
          break;
        case "s":
          e.preventDefault();
          options.onSkip();
          break;
        case "q":
          e.preventDefault();
          options.onQueue();
          break;
        case "p":
          e.preventDefault();
          options.onPin();
          break;
        case "f":
          e.preventDefault();
          options.onStar();
          break;
        case "A":
          if (e.shiftKey) {
            e.preventDefault();
            options.onMarkAllRead();
          }
          break;
        case "/":
          e.preventDefault();
          options.onSearch();
          break;
        case "v":
          e.preventDefault();
          options.onOpenOriginal();
          break;
        case "r":
          e.preventDefault();
          options.onRefresh();
          break;
        case "?":
          e.preventDefault();
          options.onHelp();
          break;
        case "Escape":
          e.preventDefault();
          options.onOpen(); // close reading pane
          break;
      }
    },
    [options]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
