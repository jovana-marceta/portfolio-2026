import { useEffect, useState, type RefObject } from "react";

/** True while (or, with `once`, after) the element is in view. */
export function useInView<T extends Element>(
  ref: RefObject<T | null>,
  { threshold = 0, rootMargin = "0px", once = false }: { threshold?: number; rootMargin?: string; once?: boolean } = {}
) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (entry.isIntersecting && once) io.disconnect();
      },
      { threshold, rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, threshold, rootMargin, once]);
  return inView;
}
