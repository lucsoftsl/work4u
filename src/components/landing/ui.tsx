import { MapPin, Search, SlidersHorizontal, Star, BadgeCheck, Share2, Mail } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export function DesktopCategoryCard({
  icon: Icon,
  name,
  count,
  onClick,
}: {
  icon: LucideIcon;
  name: string;
  count: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl border border-outline bg-white p-5 text-left transition hover:border-brand/50 hover:shadow-soft"
    >
      <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#dbe8ef] text-brand">
        <Icon className="h-4 w-4" />
      </span>
      <h3 className="font-display text-lg font-bold leading-tight text-ink">{name}</h3>
      <p className="mt-1 text-sm text-ink-muted">{count}</p>
    </button>
  );
}

export function ProfessionalCard({
  name,
  title,
  rating,
  distance,
  tags,
  jobsCompleted,
  responsiveness,
  communication,
  cta,
  verified,
}: {
  name: string;
  title: string;
  rating: string;
  distance: string;
  tags: string[];
  jobsCompleted: number;
  responsiveness: number;
  communication: number;
  cta: string;
  verified: string;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-outline bg-white shadow-soft">
      <div className="relative h-40 bg-gradient-to-r from-orange-400 to-orange-300">
        <span className="absolute right-3 top-3 rounded-md bg-white px-2 py-1 text-[10px] font-bold text-orange-500">{verified}</span>
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-display text-xl font-black text-ink">{name}</h3>
            <p className="text-sm text-ink-muted">{title}</p>
          </div>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-ink-muted">
            <Star className="h-3.5 w-3.5 fill-accent text-accent" /> {rating}
          </span>
        </div>

        <p className="mt-3 inline-flex items-center gap-1 text-xs text-ink-subtle">
          <MapPin className="h-3 w-3" /> {distance}
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span key={tag} className="rounded bg-[#e9f0f5] px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-[#4a6c84]">
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-4 space-y-2 border-t border-outline pt-4 text-[10px]">
          <Metric label="JOBS COMPLETED" value={jobsCompleted} color="bg-brand" />
          <Metric label="RESPONSIVENESS" value={responsiveness} color="bg-amber-500" />
          <Metric label="COMMUNICATION" value={communication} color="bg-emerald-500" />
        </div>

        <button className="mt-4 w-full rounded-xl bg-brand py-2.5 text-sm font-bold text-white">{cta}</button>
      </div>
    </article>
  );
}

function Metric({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[10px] font-bold uppercase text-[#5c6d86]">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-[#e3ebf0]">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export function FeaturedJobCard({
  type,
  typeClass,
  budget,
  title,
  location,
  action,
}: {
  type: string;
  typeClass: string;
  budget: string;
  title: string;
  location: string;
  action: string;
}) {
  return (
    <article className="flex h-[224px] flex-col rounded-2xl border border-outline bg-white p-5 shadow-soft">
      <div className="mb-3 flex items-center justify-between">
        <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${typeClass}`}>{type}</span>
        <span className="text-xl font-black text-brand">{budget}</span>
      </div>
      <h3 className="font-display text-xl font-bold text-ink">{title}</h3>
      <p className="mt-2 inline-flex items-center gap-1 text-xs text-ink-subtle">
        <MapPin className="h-3 w-3" /> {location}
      </p>
      <button className="mt-auto w-full rounded-xl bg-brand py-2.5 text-sm font-bold text-white">{action}</button>
    </article>
  );
}

export function FooterColumn({ title, links }: { title: string; links: Array<{ label: string; href: string }> }) {
  return (
    <div>
      <h4 className="text-xs font-extrabold uppercase tracking-[0.18em] text-ink">{title}</h4>
      <ul className="mt-4 space-y-3 text-sm text-ink-muted">
        {links.map((link) => (
          <li key={`${link.label}-${link.href}`}>
            <a href={link.href} className="transition hover:text-brand">{link.label}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MobileCategoryCard({
  icon: Icon,
  name,
  onClick,
}: {
  icon: LucideIcon;
  name: string;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="min-w-[78px] text-center">
      <span className="mx-auto mb-2 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#dce5eb] text-brand">
        <Icon className="h-6 w-6" />
      </span>
      <p className="text-[0.95rem] font-medium text-ink">{name}</p>
    </button>
  );
}

export function HeroSearch({
  value,
  onChange,
  placeholder,
  onSubmit,
  filterLabel,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  onSubmit: () => void;
  filterLabel: string;
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="mt-6 flex items-center rounded-full bg-white px-3 py-2 shadow-soft"
    >
      <Search className="ml-2 h-5 w-5 text-[#96a3b8]" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full border-none bg-transparent px-3 text-[0.95rem] text-ink outline-none placeholder:text-[#77839a]"
      />
      <button
        type="submit"
        aria-label={filterLabel}
        className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand text-white"
      >
        <SlidersHorizontal className="h-5 w-5" />
      </button>
    </form>
  );
}

export function TopProCard({
  name,
  rating,
  reviews,
  jobsCompleted,
  jobsCompletedPct,
  responsiveness,
  responsivenessPct,
  distance,
  jobsCompletedTitle,
  responsivenessTitle,
  ctaLabel,
}: {
  name: string;
  rating: string;
  reviews: string;
  jobsCompleted: string;
  jobsCompletedPct: number;
  responsiveness: string;
  responsivenessPct: number;
  distance: string;
  jobsCompletedTitle: string;
  responsivenessTitle: string;
  ctaLabel: string;
}) {
  return (
    <article className="min-w-[290px] rounded-[1.7rem] bg-white p-5 shadow-soft">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-slate-200 text-sm font-black text-slate-700">A</span>
        <div>
          <h3 className="text-[1.35rem] font-black leading-none text-ink">{name}</h3>
          <p className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-slate-600">
            <Star className="h-3.5 w-3.5 fill-[#ffb648] text-[#ffb648]" /> {rating} ({reviews})
          </p>
        </div>
        <BadgeCheck className="ml-auto h-5 w-5 text-[#3b82f6]" />
      </div>

      <div className="mt-5 space-y-3">
        <div>
          <div className="mb-1 flex items-center justify-between text-[0.72rem] font-bold uppercase text-[#5c6d86]">
            <span>{jobsCompletedTitle}</span>
            <span className="text-brand">{jobsCompleted}</span>
          </div>
          <div className="h-1.5 rounded-full bg-[#e3ebf0]">
            <div className="h-1.5 rounded-full bg-brand" style={{ width: `${jobsCompletedPct}%` }} />
          </div>
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between text-[0.72rem] font-bold uppercase text-[#5c6d86]">
            <span>{responsivenessTitle}</span>
            <span className="text-[#f59e0b]">{responsiveness}</span>
          </div>
          <div className="h-1.5 rounded-full bg-[#e3ebf0]">
            <div className="h-1.5 rounded-full bg-[#f59e0b]" style={{ width: `${responsivenessPct}%` }} />
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <p className="inline-flex items-center gap-1 text-sm text-[#8a98ad]">
          <MapPin className="h-3.5 w-3.5" /> {distance}
        </p>
        <button className="rounded-full bg-[#e5eef4] px-5 py-2 text-[0.9rem] font-semibold text-brand">{ctaLabel}</button>
      </div>
    </article>
  );
}

export function ActiveJobCard({
  title,
  budget,
  location,
  tag,
  tagClass,
  applicants,
  action,
}: {
  title: string;
  budget: string;
  location: string;
  tag: string;
  tagClass: string;
  applicants: string;
  action: string;
}) {
  return (
    <article className="rounded-[1.7rem] bg-white p-5 shadow-soft">
      <div className="flex items-start gap-4">
        <span className="inline-block h-16 w-16 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-[1.2rem] font-black leading-tight text-ink">{title}</h3>
            <span className="text-[1.35rem] font-black leading-none text-[#f59e0b]">{budget}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[0.85rem] text-[#8a98ad]">
              <MapPin className="h-3.5 w-3.5" /> {location}
            </span>
            <span className={`rounded-full px-3 py-1 text-[0.8rem] font-semibold ${tagClass}`}>{tag}</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-[0.85rem] text-[#8a98ad]">{applicants}</p>
            <button className="rounded-full bg-brand px-5 py-2 text-sm font-bold text-white">{action}</button>
          </div>
        </div>
      </div>
    </article>
  );
}

export function FooterActions() {
  return (
    <div className="mt-5 flex items-center justify-center gap-6">
      <button className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-panel text-ink-subtle" aria-label="share">
        <Share2 className="h-4 w-4" />
      </button>
      <button className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-panel text-ink-subtle" aria-label="contact">
        <Mail className="h-4 w-4" />
      </button>
    </div>
  );
}

export function MobileNavItem({
  label,
  icon: Icon,
  badge,
  active = false,
}: {
  label: string;
  icon: LucideIcon;
  badge?: string;
  active?: boolean;
}) {
  return (
    <button className={`relative flex flex-col items-center gap-1 ${active ? "text-brand" : "text-ink-subtle"}`}>
      <Icon className="h-5 w-5" />
      <span className="text-[11px] font-bold">{label}</span>
      {badge ? (
        <span className="absolute -right-2 -top-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-white">
          {badge}
        </span>
      ) : null}
    </button>
  );
}
