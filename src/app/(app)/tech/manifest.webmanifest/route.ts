// Web app manifest for the technician field app (installable from /tech).
export const dynamic = "force-static";

export function GET() {
  const manifest = {
    name: "work4u Field",
    short_name: "Field",
    description: "Today's jobs, offline-ready, for field technicians.",
    start_url: "/tech",
    scope: "/tech",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F4F5F7",
    theme_color: "#1B1F24",
    icons: [
      { src: "/tech/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/tech/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/tech/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
  return new Response(JSON.stringify(manifest), { headers: { "Content-Type": "application/manifest+json" } });
}
