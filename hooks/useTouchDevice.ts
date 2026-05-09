"use client";

import { useState } from "react";

/**
 * Returns `true` when the primary input is a coarse touch pointer
 * (phone / tablet) — i.e. the device cannot hover.
 *
 * Uses a lazy `useState` initializer so the value is correct on the first
 * client render (no useEffect flicker), and always `false` on the server
 * (safe for SSR / Next.js).
 *
 * The result is stable for the component's lifetime — media-query changes
 * mid-session (e.g. attaching a mouse) are intentionally not reacted to,
 * as they're rare and the UX difference is negligible.
 */
export function useTouchDevice(): boolean {
  const [isTouch] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    // `hover: none` + `pointer: coarse` is the most reliable combo for
    // "this device primarily uses touch, not a mouse".
    return window.matchMedia("(hover: none) and (pointer: coarse)").matches;
  });
  return isTouch;
}
