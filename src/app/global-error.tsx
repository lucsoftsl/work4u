"use client";

import { useEffect, type CSSProperties } from "react";

// Replaces the root layout when it crashes, so it cannot rely on the app's CSS, fonts or translations.
// Colours are the design tokens' final hex values; copy is plain English by design.
const page: CSSProperties = {
  margin: 0,
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px",
  background: "#F7F3EA",
  color: "#1C1A17",
  fontFamily: "system-ui, -apple-system, 'Segoe UI', Arial, sans-serif",
  lineHeight: 1.5,
};

const button: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 48,
  padding: "0 20px",
  borderRadius: 4,
  fontSize: 16,
  fontWeight: 700,
  textDecoration: "none",
  cursor: "pointer",
  border: "1px solid #1C1A17",
  fontFamily: "inherit",
};

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Unhandled global error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={page}>
        <main style={{ maxWidth: 480, textAlign: "center" }}>
          <h1 style={{ fontSize: 32, lineHeight: 1.15, margin: "0 0 12px" }}>Something went wrong</h1>
          <p style={{ margin: "0 0 24px", color: "#4F4A42", fontSize: 18 }}>
            We hit an unexpected problem. Please try again, or go back to the home page.
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            <button type="button" onClick={reset} style={{ ...button, background: "#1F5C4A", color: "#FFFFFF", borderColor: "#1F5C4A" }}>
              Try again
            </button>
            {/* A plain anchor on purpose: a full page load resets the broken client state. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" style={{ ...button, background: "#FFFDF8", color: "#1C1A17" }}>
              Go home
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
