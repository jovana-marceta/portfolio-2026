import { useEffect, useRef } from "react";

// One shared scroll/resize listener that runs every subscriber once per animation frame.
type Callback = () => void;
const subscribers = new Set<Callback>();
let queued = false;
let bound = false;

function flush() {
  queued = false;
  subscribers.forEach((fn) => fn());
}
function schedule() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(flush);
}

/** Calls `callback` on scroll and resize (throttled to one call per frame) and once on mount. */
export function useScrollFrame(callback: Callback) {
  const ref = useRef(callback);
  ref.current = callback;

  useEffect(() => {
    const fn = () => ref.current();
    subscribers.add(fn);
    if (!bound) {
      bound = true;
      addEventListener("scroll", schedule, { passive: true });
      addEventListener("resize", schedule);
    }
    schedule();
    return () => { subscribers.delete(fn); };
  }, []);
}

export const requestScrollFrame = schedule;
