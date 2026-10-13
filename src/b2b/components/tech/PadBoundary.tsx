"use client";

import { Component, type ReactNode } from "react";

/** If the signature pad code can't be loaded (offline, first visit), the screen keeps working and the name alone is used. */
export class PadBoundary extends Component<{ children: ReactNode; fallback: ReactNode; onFail: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFail(); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

/** Warm the lazy chunks while there is a connection so they are cached before the technician needs them offline. */
export function preloadSignaturePad() {
  void import("@/b2b/components/tech/SignaturePad").catch(() => undefined);
  void import("signature_pad").catch(() => undefined);
}
