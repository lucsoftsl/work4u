import { ImageResponse } from "next/og";
import { BRAND, TAGLINE } from "@/lib/seo/site";

// Default share image for every page without its own (jobs, articles and profiles can set theirs).
export const alt = `${BRAND}: ${TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "#F7F3EA", color: "#1B1F24" }}>
        <div style={{ fontSize: 120, fontWeight: 800, letterSpacing: -2 }}>{BRAND}</div>
        <div style={{ fontSize: 48, marginTop: 16, color: "#4A4F57" }}>{TAGLINE}</div>
      </div>
    ),
    size,
  );
}
