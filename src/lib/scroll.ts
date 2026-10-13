/**
 * Brings a list back to its start after paging: scrolls `target` to the top of
 * the viewport (smoothly, unless the user prefers reduced motion) and moves
 * focus to `focusTarget` so keyboard and screen-reader users land there too.
 * `target` should carry a scroll-margin so it clears the sticky header.
 */
export function scrollToListStart(target: HTMLElement | null, focusTarget: HTMLElement | null = target): void {
  if (!target) return;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
  focusTarget?.focus({ preventScroll: true });
}
