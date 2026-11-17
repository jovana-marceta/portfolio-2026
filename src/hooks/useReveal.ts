import { useEffect } from "react";

/**
 * Global reveal-on-scroll: adds `.is-in` to every `.rv` / `.rv-mask` element the first time
 * it enters the viewport. A MutationObserver picks up elements rendered later (e.g. blog posts).
 */
export function useRevealObserver() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    const seen = new WeakSet<Element>();
    const scan = (root: ParentNode) =>
      root.querySelectorAll(".rv:not(.is-in), .rv-mask:not(.is-in)").forEach((el) => {
        if (!seen.has(el)) { seen.add(el); io.observe(el); }
      });
    scan(document);
    const mo = new MutationObserver(() => scan(document));
    mo.observe(document.body, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); };
  }, []);
}
