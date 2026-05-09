"use client";

import { useCallback, useRef, useState } from "react";

const LONG_PRESS_MS      = 600; // ms to hold before firing
const MOVE_THRESHOLD_PX  = 8;  // px of movement that cancels the press

export interface LongPressHandlers {
  onTouchStart:  (e: React.TouchEvent) => void;
  onTouchEnd:    () => void;
  onTouchMove:   (e: React.TouchEvent) => void;
  onTouchCancel: () => void;
  /** Prevents browser native context-menu on long-press (mobile Safari/Chrome) */
  onContextMenu: (e: React.MouseEvent) => void;
}

export interface UseLongPressReturn {
  handlers:   LongPressHandlers;
  /** True while the user is actively holding down (before threshold fires). */
  isPressing: boolean;
}

/**
 * Detects a long-press gesture on touch devices.
 *
 * - Fires `onLongPress` after `LONG_PRESS_MS` of continuous touch.
 * - Cancels if the finger moves more than `MOVE_THRESHOLD_PX` (scroll guard).
 * - Triggers a short haptic pulse via `navigator.vibrate` when it fires.
 * - Suppresses the browser's native context menu on long-press.
 *
 * Only attach the returned `handlers` when on a touch device —
 * see `useTouchDevice` for detection.
 */
export function useLongPress(onLongPress: () => void): UseLongPressReturn {
  const [isPressing, setIsPressing] = useState(false);
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startXY    = useRef<{ x: number; y: number } | null>(null);
  const didFire    = useRef(false);

  const cancelTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsPressing(false);
    startXY.current = null;
  }, []);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const t = e.touches[0];
      startXY.current = { x: t.clientX, y: t.clientY };
      didFire.current = false;
      setIsPressing(true);

      timerRef.current = setTimeout(() => {
        didFire.current = true;
        setIsPressing(false);
        onLongPress();
        // Short haptic pulse — ignored on devices that don't support it.
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(12);
        }
      }, LONG_PRESS_MS);
    },
    [onLongPress],
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!startXY.current) return;
      const t  = e.touches[0];
      const dx = t.clientX - startXY.current.x;
      const dy = t.clientY - startXY.current.y;
      if (Math.hypot(dx, dy) > MOVE_THRESHOLD_PX) cancelTimer();
    },
    [cancelTimer],
  );

  const onContextMenu = useCallback((e: React.MouseEvent) => {
    // Suppress native context menu that fires after a long-press on mobile.
    if (didFire.current) e.preventDefault();
  }, []);

  return {
    handlers: {
      onTouchStart,
      onTouchEnd:    cancelTimer,
      onTouchMove,
      onTouchCancel: cancelTimer,
      onContextMenu,
    },
    isPressing,
  };
}
