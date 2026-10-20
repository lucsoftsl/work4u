"use client";

import { useEffect, useRef } from "react";
import type { StepKey } from "./Stepper";

/** Heading id of each step component (UploadStep, MapStep, PreviewStep, ConfirmStep, ResultStep). */
export const STEP_HEADING: Record<StepKey, string> = { upload: "upload-h", map: "map-h", preview: "prev-h", confirm: "confirm-h", result: "res-h" };

/**
 * After a step change the button that was pressed has unmounted and focus would fall to <body>: move it to the new step's heading
 * (made focusable with tabindex=-1). Not on the first render, so opening the page keeps the normal focus order.
 */
export function useStepFocus(step: StepKey) {
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const el = document.getElementById(STEP_HEADING[step]);
    if (!el) return;
    if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
    el.focus();
  }, [step]);
}
