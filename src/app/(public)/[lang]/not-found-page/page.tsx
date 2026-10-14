import type { Metadata } from "next";
import NotFound from "../not-found";
import { getServerT } from "@/lib/i18n-server";
import { NOINDEX } from "@/lib/seo/metadata";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const t = await getServerT(lang);
  return { title: t("errors.notFoundTitle"), ...NOINDEX };
}

// Unknown URLs are rewritten here by the proxy (src/proxy.ts) with status 404. This is a normal page, not notFound(): inside this route
// group notFound() falls back to Next's empty error shell, while a page renders the real header, h1, message and links on the server.
export default function NotFoundPage() {
  return <NotFound />;
}
