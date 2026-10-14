import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { LANG_COOKIE, LANG_COOKIE_MAX_AGE, decideRoute } from "@/lib/i18n-routing";

// Next.js 16: `proxy` replaces `middleware`. Two jobs:
//  1. Language-prefixed public URLs (rules and tests in lib/i18n-routing.ts).
//  2. Keep signed-in users away from /signin (the old root middleware.ts, merged here so there is a single entry point).
export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  const isAuthed = req.cookies.get("work4u_auth")?.value === "1";
  // /signup is not redirected: signed-in users with unfinished onboarding must be able to resume it.
  if (isAuthed && pathname === "/signin" && !req.nextUrl.searchParams.has("redirect")) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  const decision = decideRoute({ pathname, search, cookieLang: req.cookies.get(LANG_COOKIE)?.value, userAgent: req.headers.get("user-agent") });
  if (decision.action === "next") return NextResponse.next();

  const url = req.nextUrl.clone();
  const [path, query = ""] = decision.to.split("?");
  url.pathname = path;
  url.search = query ? `?${query}` : "";

  // A rewrite's status becomes the response status: that is how the 404 / 503 pages (normal pages with the real layout and server
  // HTML) get their status code, headers included.
  if (decision.action === "rewrite") return NextResponse.rewrite(url, { status: decision.status, headers: decision.headers ? { ...decision.headers } : undefined });

  const response = NextResponse.redirect(url, decision.status);
  if (decision.cookieLang) response.cookies.set(LANG_COOKIE, decision.cookieLang, { path: "/", maxAge: LANG_COOKIE_MAX_AGE, sameSite: "lax" });
  // The redirect depends on a cookie: caches must not serve one visitor's language to another.
  if (decision.status === 307) response.headers.set("Vary", "Cookie");
  return response;
}

export const config = {
  // Everything except Next internals and files with an extension (assets, sitemaps, robots, images, service workers).
  matcher: ["/((?!_next/|api/|.*\\.[a-zA-Z0-9]+$).*)"],
};
