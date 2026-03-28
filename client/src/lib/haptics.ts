import "ios-vibrator-pro-max";

function vibrate(ms: number): void {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(ms);
    }
  } catch {
    // Vibration unavailable or permission denied — no-op
  }
}

/** Short light tap (10ms) */
export function hapticLight(): void {
  vibrate(10);
}

/** Medium tap (25ms) */
export function hapticMedium(): void {
  vibrate(25);
}

/** Strong tap (50ms) */
export function hapticHeavy(): void {
  vibrate(50);
}
