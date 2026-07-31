"use client";

import Image from "next/image";
import Link from "next/link";
import { Newspaper } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import type { Article } from "@/api/types";

export function ArticleCard({ article }: { article: Article }) {
  const { t } = useTranslation();

  return (
    <Link href={`/blog/${article.id}`} className="block">
      <article className="surface-panel h-full overflow-hidden transition hover:-translate-y-0.5 hover:border-brand/35">
        <div className="relative aspect-[16/9] w-full bg-[#eff7fa]">
          {article.coverImageUrl ? (
            <Image
              src={article.coverImageUrl}
              alt={article.title}
              fill
              unoptimized
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-brand/40">
              <Newspaper className="h-10 w-10" />
            </div>
          )}
        </div>
        <div className="p-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink-subtle">
            {new Date(article.dateTimeCreated).toLocaleDateString()}
          </p>
          <h3 className="mt-2 text-lg font-black leading-tight text-ink">{article.title}</h3>
          {article.excerpt && (
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-ink-muted">{article.excerpt}</p>
          )}
          <span className="mt-4 inline-block text-sm font-semibold text-brand">{t("blog.readMore")} →</span>
        </div>
      </article>
    </Link>
  );
}
