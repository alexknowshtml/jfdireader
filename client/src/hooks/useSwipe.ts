import { useRef, useCallback } from "react";
import { hapticLight } from "@/lib/haptics";

const THRESHOLD = 80; // px before action triggers
const DISMISS_VELOCITY = 0.5; // px/ms — fast swipe triggers even below threshold

interface SwipeHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
}

interface UseSwipeOptions {
  onSwipeRight?: () => void; // archive
  onSwipeLeft?: () => void;  // queue
  ref: React.RefObject<HTMLDivElement | null>;
  onDirectionChange?: (dir: "left" | "right" | null) => void;
  noTranslate?: boolean; // skip transform — only track direction + fire callbacks
}

export function useSwipe({ onSwipeRight, onSwipeLeft, ref, onDirectionChange, noTranslate }: UseSwipeOptions): SwipeHandlers {
  const startX = useRef(0);
  const startY = useRef(0);
  const startTime = useRef(0);
  const currentX = useRef(0);
  const locked = useRef(false);       // locked to horizontal swipe
  const dismissed = useRef(false);     // vertical scroll detected, ignore
  const triggered = useRef(false);     // haptic already fired at threshold

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    startX.current = touch.clientX;
    startY.current = touch.clientY;
    startTime.current = Date.now();
    currentX.current = 0;
    locked.current = false;
    dismissed.current = false;
    triggered.current = false;

    if (!noTranslate && ref.current) {
      ref.current.style.transition = "none";
      ref.current.style.transform = "";
      ref.current.style.opacity = "";
    }
    onDirectionChange?.(null);
  }, [ref, onDirectionChange]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (dismissed.current) return;

    const touch = e.touches[0];
    const dx = touch.clientX - startX.current;
    const dy = touch.clientY - startY.current;

    // First significant movement: decide if this is horizontal or vertical
    if (!locked.current && !dismissed.current) {
      const adx = Math.abs(dx);
      const ady = Math.abs(dy);
      if (adx + ady > 10) {
        if (ady > adx) {
          // Vertical scroll — abandon swipe
          dismissed.current = true;
          return;
        }
        locked.current = true;
      } else {
        return; // too small to decide
      }
    }

    currentX.current = dx;
    onDirectionChange?.(dx > 0 ? "right" : "left");

    // Resist overswipe with diminishing returns past threshold
    const capped = Math.sign(dx) * Math.min(Math.abs(dx), THRESHOLD * 2.5);

    if (!noTranslate && ref.current) {
      ref.current.style.transform = `translateX(${capped}px)`;
    }

    // Haptic feedback at threshold crossing
    if (!triggered.current && Math.abs(dx) >= THRESHOLD) {
      triggered.current = true;
      hapticLight();
    }
  }, [ref, onDirectionChange]);

  const onTouchEnd = useCallback(() => {
    if (dismissed.current || !locked.current) {
      // Reset position if we never locked
      if (!noTranslate && ref.current) {
        ref.current.style.transition = "transform 200ms ease-out";
        ref.current.style.transform = "";
      }
      onDirectionChange?.(null);
      return;
    }

    const dx = currentX.current;
    const elapsed = Date.now() - startTime.current;
    const velocity = Math.abs(dx) / elapsed;
    const pastThreshold = Math.abs(dx) >= THRESHOLD || velocity >= DISMISS_VELOCITY;

    if (pastThreshold && dx > 0 && onSwipeRight) {
      if (!noTranslate && ref.current) {
        ref.current.style.transition = "transform 200ms ease-out, opacity 150ms ease-out";
        ref.current.style.transform = "translateX(100%)";
        ref.current.style.opacity = "0";
      }
      onDirectionChange?.(null);
      if (noTranslate) { onSwipeRight(); } else { setTimeout(onSwipeRight, 150); }
    } else if (pastThreshold && dx < 0 && onSwipeLeft) {
      if (!noTranslate && ref.current) {
        ref.current.style.transition = "transform 200ms ease-out, opacity 150ms ease-out";
        ref.current.style.transform = "translateX(-100%)";
        ref.current.style.opacity = "0";
      }
      onDirectionChange?.(null);
      if (noTranslate) { onSwipeLeft(); } else { setTimeout(onSwipeLeft, 150); }
    } else {
      // Snap back
      if (!noTranslate && ref.current) {
        ref.current.style.transition = "transform 200ms ease-out";
        ref.current.style.transform = "";
      }
      onDirectionChange?.(null);
    }
  }, [onSwipeRight, onSwipeLeft, ref, onDirectionChange]);

  return { onTouchStart, onTouchMove, onTouchEnd };
}
