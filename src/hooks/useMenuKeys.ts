"use client";

import { useCallback, useEffect, type KeyboardEvent, type RefObject } from "react";

const ITEM = '[role="menuitem"], a[href], button:not([disabled])';

/**
 * Keyboard behaviour for disclosure menus (WAI-ARIA menu button pattern):
 * opening focuses the first item; ArrowUp/Down, Home/End move; Escape closes and returns focus to
 * the trigger; Tab closes the menu. Pass the menu container and trigger refs.
 */
export function useMenuKeys(
  open: boolean,
  close: () => void,
  menuRef: RefObject<HTMLElement | null>,
  triggerRef: RefObject<HTMLElement | null>
) {
  useEffect(() => {
    if (!open) return;
    const first = menuRef.current?.querySelector<HTMLElement>(ITEM);
    first?.focus();
  }, [open, menuRef]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>(ITEM) ?? []);
      if (items.length === 0) return;
      const index = items.indexOf(document.activeElement as HTMLElement);
      const focusAt = (i: number) => {
        event.preventDefault();
        items[(i + items.length) % items.length].focus();
      };
      switch (event.key) {
        case "ArrowDown":
          focusAt(index + 1);
          break;
        case "ArrowUp":
          focusAt(index <= 0 ? items.length - 1 : index - 1);
          break;
        case "Home":
          focusAt(0);
          break;
        case "End":
          focusAt(items.length - 1);
          break;
        case "Escape":
          event.preventDefault();
          close();
          triggerRef.current?.focus();
          break;
        case "Tab":
          close();
          break;
      }
    },
    [menuRef, triggerRef, close]
  );

  return onKeyDown;
}
