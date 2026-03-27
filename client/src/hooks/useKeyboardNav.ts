import { useEffect, useCallback } from "react";

interface KeyboardNavOptions {
  onNext: () => void;
  onPrev: () => void;
  onOpen: () => void;
  onStar: () => void;
  onMarkRead: () => void;
  onMarkAllRead: () => void;
  onSearch: () => void;
  onOpenOriginal: () => void;
}

export function useKeyboardNav(options: KeyboardNavOptions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't capture when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case "j":
          e.preventDefault();
          options.onNext();
          break;
        case "k":
          e.preventDefault();
          options.onPrev();
          break;
        case "o":
        case "Enter":
          e.preventDefault();
          options.onOpen();
          break;
        case "s":
          e.preventDefault();
          options.onStar();
          break;
        case "m":
          e.preventDefault();
          options.onMarkRead();
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
      }
    },
    [options]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
