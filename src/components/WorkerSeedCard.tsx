"use client";

import Image from "next/image";
import Link from "@/components/LocaleLink";
import { Star } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { getCategoryName } from "@/lib/category-utils";
import type { PublicWorker } from "@/lib/seo/public-api";

/** Server-rendered directory entry (public API data only: name, photo, rating, service categories). */
export function WorkerSeedCard({ worker }: { worker: PublicWorker }) {
  const { t } = useTranslation();
  const rated = (worker.rating ?? 0) > 0 && worker.reviewCount > 0;
  return (
    <Link href={`/workers/${worker.canonicalPath}`} className="flex items-center gap-4 rounded-card border border-line bg-surface p-4 transition hover:border-primary/35 md:p-5">
      {worker.photoUrl ? (
        <Image src={worker.photoUrl} alt="" width={56} height={56} style={{ width: 56, height: 56 }} className="shrink-0 rounded-full border border-line object-cover" />
      ) : (
        <span aria-hidden="true" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary-soft font-display text-h3 text-primary">
          {worker.name.charAt(0).toUpperCase()}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <h2 className="break-words font-display text-h3 text-ink">{worker.name}</h2>
        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-label font-normal text-ink-muted">
          {rated ? (
            <span className="inline-flex items-center gap-1.5">
              <Star className="h-4 w-4 fill-money text-money" aria-hidden="true" />
              <span className="font-bold tabular text-ink">{(worker.rating ?? 0).toFixed(1)}</span>
              <span className="tabular">({worker.reviewCount})</span>
            </span>
          ) : (
            <span className="rounded-control bg-info-soft px-2 text-caption font-bold text-info">{t("workers.newOnWork4u")}</span>
          )}
          {worker.categories.slice(0, 3).map((c) => (
            <span key={c} className="rounded-control bg-primary-soft px-2 text-caption font-bold text-primary">{getCategoryName(c, t)}</span>
          ))}
        </span>
      </span>
    </Link>
  );
}
