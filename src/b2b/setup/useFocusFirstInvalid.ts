"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * "Focus on the first error": after a failed submit (client check or an API field error), once the error has rendered, move focus to
 * the first field marked aria-invalid inside `ref`. The pressed button keeps focus otherwise and nothing is announced.
 */
export function useFocusFirstInvalid<T extends HTMLElement = HTMLElement>() {
  const ref = useRef<T>(null);
  const [request, setRequest] = useState(0);
  useEffect(() => {
    if (!request) return;
    ref.current?.querySelector<HTMLElement>('[aria-invalid="true"]:not([disabled])')?.focus();
  }, [request]);
  const focusFirstInvalid = useCallback(() => setRequest((n) => n + 1), []);
  return { ref, focusFirstInvalid };
}
