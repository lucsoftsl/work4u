"use client";

import Image from "next/image";
import Link from "@/components/LocaleLink";
import { Newspaper } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

export interface ArticleCardData {
  /** `{slug}-{id}` from the public API. */
  canonicalPath: string;
  title: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  publishedAt: string;
}

/** Fixed time zone + the app locale (English on the server render) so server and client markup match. */
export function formatPublishedDate(iso: string, locale: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(t);
}

export function ArticleCard({ article, priority = false }: { article: ArticleCardData; priority?: boolean }) {
  const { t, locale } = useTranslation();

  return (
    <Link href={`/blog/${article.canonicalPath}`} className="block">
      <article className="rounded-card border border-line bg-surface h-full overflow-hidden transition hover:-translate-y-0.5 hover:border-primary/35">
        <div className="relative aspect-[16/9] w-full bg-primary-soft">
          {article.coverImageUrl ? (
            <Image
              src={article.coverImageUrl}
              alt={article.title}
              fill
              unoptimized
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              loading={priority ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : "auto"}
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-primary/40">
              <Newspaper className="h-10 w-10" aria-hidden="true" />
            </div>
          )}
        </div>
        <div className="p-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink-subtle">
            <time dateTime={article.publishedAt}>{formatPublishedDate(article.publishedAt, locale)}</time>
          </p>
          <h2 className="mt-2 text-lg font-black leading-tight text-ink">{article.title}</h2>
          {article.excerpt && (
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-ink-muted">{article.excerpt}</p>
          )}
          <span className="mt-4 inline-block text-sm font-semibold text-primary">{t("blog.readMore")} →</span>
        </div>
      </article>
    </Link>
  );
}
