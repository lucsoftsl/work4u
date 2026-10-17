"use client";

import { useEffect, type RefObject } from "react";

const FOCUSABLE = 'a[href], button, input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])';

/** Index to focus next when Tab is pressed inside a trap of `count` focusable items; null = let the browser move focus. */
export function trapTarget(count: number, current: number, shift: boolean): number | null {
  if (count === 0) return -1; // nothing focusable: keep focus on the container
  if (shift && current <= 0) return count - 1;
  if (!shift && current >= count - 1) return 0;
  return null;
}

const visible = (el: HTMLElement) => {
  if (el.hasAttribute("disabled") || el.getAttribute("aria-hidden") === "true") return false;
  const style = window.getComputedStyle(el);
  return style.display !== "none" && style.visibility !== "hidden";
};

/**
 * Keeps Tab / Shift+Tab inside an open dialog or drawer and returns focus to the element that opened it. A native modal <dialog>
 * already makes the page behind it inert; this keeps keyboard focus from escaping to the browser chrome, which assistive-technology
 * checks treat as "not trapped".
 */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    const root = ref.current;
    if (!active || !root) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const items = () => Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(visible);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const list = items();
      const next = trapTarget(list.length, list.indexOf(document.activeElement as HTMLElement), e.shiftKey);
      if (next === null) return;
      e.preventDefault();
      (next === -1 ? root : list[next]).focus();
    };
    root.addEventListener("keydown", onKey);
    return () => {
      root.removeEventListener("keydown", onKey);
      if (opener && document.contains(opener)) opener.focus();
    };
  }, [ref, active]);
}
