import { useRef, useCallback, useState } from "react";
import { hapticMedium } from "@/lib/haptics";

const PULL_THRESHOLD = 60; // px to trigger refresh
const MAX_PULL = 100; // max visual pull distance

interface PullToRefreshState {
  pulling: boolean;
  pullDistance: number;
  refreshing: boolean;
}

interface PullToRefreshHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
}

export function usePullToRefresh(
  scrollRef: React.RefObject<HTMLElement | null>,
  onRefresh: () => Promise<void>
): { state: PullToRefreshState; handlers: PullToRefreshHandlers } {
  const startY = useRef(0);
  const pulling = useRef(false);
  const triggered = useRef(false);
  const [state, setState] = useState<PullToRefreshState>({
    pulling: false,
    pullDistance: 0,
    refreshing: false,
  });

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    // Only start pull if scrolled to top
    if (scrollRef.current && scrollRef.current.scrollTop <= 0) {
      startY.current = e.touches[0].clientY;
      pulling.current = true;
      triggered.current = false;
    }
  }, [scrollRef]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling.current || state.refreshing) return;

    const dy = e.touches[0].clientY - startY.current;

    // Only pull down, not up
    if (dy <= 0) {
      if (state.pullDistance > 0) {
        setState((s) => ({ ...s, pulling: false, pullDistance: 0 }));
      }
      return;
    }

    // Diminishing returns resistance
    const distance = Math.min(dy * 0.5, MAX_PULL);
    setState((s) => ({ ...s, pulling: true, pullDistance: distance }));

    // Haptic at threshold
    if (!triggered.current && distance >= PULL_THRESHOLD) {
      triggered.current = true;
      hapticMedium();
    }
  }, [scrollRef, state.refreshing, state.pullDistance]);

  const onTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;

    if (state.pullDistance >= PULL_THRESHOLD && !state.refreshing) {
      setState({ pulling: false, pullDistance: PULL_THRESHOLD, refreshing: true });
      try {
        await onRefresh();
      } finally {
        setState({ pulling: false, pullDistance: 0, refreshing: false });
      }
    } else {
      setState({ pulling: false, pullDistance: 0, refreshing: false });
    }
  }, [state.pullDistance, state.refreshing, onRefresh]);

  return {
    state,
    handlers: { onTouchStart, onTouchMove, onTouchEnd },
  };
}
