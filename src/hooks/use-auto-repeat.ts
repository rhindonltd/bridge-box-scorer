"use client";

import { useEffect, useRef } from "react";

/**
 * Press-and-hold auto-repeat for stepper buttons.
 *
 * `start(action)` runs `action` once immediately, then — after an initial
 * 400ms hold — repeats it on an accelerating interval (starting at 300ms and
 * speeding up by 30ms per tick, down to a 60ms floor). `stop` cancels both the
 * pending hold and the running repeat. Pending timers are also cleared on
 * unmount.
 *
 * The stepper components own their own DOM/events (mouse vs. pointer) and just
 * wire their button handlers to `start`/`stop`; only this repeat timing is
 * shared.
 */
export function useAutoRepeat(): {
  start: (action: () => void) => void;
  stop: () => void;
} {
  const holdRef = useRef<NodeJS.Timeout | null>(null);
  const repeatRef = useRef<NodeJS.Timeout | null>(null);

  const stop = () => {
    if (holdRef.current) clearTimeout(holdRef.current);
    if (repeatRef.current) clearTimeout(repeatRef.current);
    holdRef.current = null;
    repeatRef.current = null;
  };

  const start = (action: () => void) => {
    action(); // immediate
    let speed = 300;
    holdRef.current = setTimeout(() => {
      const tick = () => {
        action();
        speed = Math.max(60, speed - 30);
        repeatRef.current = setTimeout(tick, speed);
      };
      tick();
    }, 400);
  };

  // Cancel any pending timers if the component unmounts mid-press.
  useEffect(() => stop, []);

  return { start, stop };
}
