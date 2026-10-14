import type { NextConfig } from "next";
import { PRIVATE_HEADER_SOURCES } from "./src/lib/seo/private-routes";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*" },
    ],
  },
  async headers() {
    return [
      // Signed-in app, admin, B2B apps, auth pages, invite links: never indexed (header works even for non-HTML responses).
      ...PRIVATE_HEADER_SOURCES.map((source) => ({ source, headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] })),
      // Invite tokens live in the URL: keep them out of Referer headers sent to other sites.
      { source: "/b2b/:path*", headers: [{ key: "Referrer-Policy", value: "no-referrer" }] },
    ];
  },
};

export default nextConfig;
