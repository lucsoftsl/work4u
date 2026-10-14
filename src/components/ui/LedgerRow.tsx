import Link from "@/components/LocaleLink";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface LedgerRowProps {
  /** Detail page; the whole row is one link via the title (stretched link), inner controls stay separate. */
  href: string;
  title: string;
  /** Category chip / posted time line above the title. */
  eyebrow?: ReactNode;
  /** Location, applicants, poster trust… */
  meta?: ReactNode;
  /** Right column: usually a <MoneyPlate/>. On mobile it sits beside the title. */
  aside?: ReactNode;
  /** Owner / worker action row (buttons and links); rendered above the stretched link. */
  actions?: ReactNode;
  /** Heading level of the title: h2 under a page H1, h3 under a section H2 (default). */
  headingLevel?: "h2" | "h3";
  className?: string;
}

export function LedgerRow({ href, title, eyebrow, meta, aside, actions, headingLevel = "h3", className }: LedgerRowProps) {
  const Heading = headingLevel;
  return (
    <article
      className={cn(
        "relative rounded-card border border-line bg-surface p-4 transition-[box-shadow,border-color] duration-fast ease-out md:p-6",
        "hover:border-line-strong hover:shadow-stamp focus-within:border-line-strong",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3 md:gap-6">
        <div className="min-w-0 flex-1">
          {eyebrow ? <div className="mb-1.5 flex flex-wrap items-center gap-2 text-caption text-ink-muted">{eyebrow}</div> : null}
          <Heading className="line-clamp-2 break-words font-display text-[1.0625rem] font-semibold leading-snug text-ink md:text-h3">
            <Link
              href={href}
              className="rounded-control after:absolute after:inset-0 after:content-[''] focus-visible:shadow-focus"
            >
              {title}
            </Link>
          </Heading>
          {meta ? <div className="mt-2 space-y-1 text-label font-normal text-ink-muted">{meta}</div> : null}
        </div>
        {aside ? <div className="shrink-0">{aside}</div> : null}
      </div>
      {actions ? <div className="relative z-10 mt-4 flex flex-wrap gap-2">{actions}</div> : null}
    </article>
  );
}
