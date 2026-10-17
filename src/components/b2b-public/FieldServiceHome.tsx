import type { ReactNode } from "react";
import {
  AlertTriangle, ArrowRight, CalendarClock, Check, ClipboardCheck, ClipboardList, CloudOff, Crown, Headset, PenLine, RefreshCw,
  Route, ShieldCheck, Smartphone, Truck, UserCog, Users, Wrench, type LucideIcon,
} from "lucide-react";
import { b2bLocalizedPath } from "@/lib/i18n-routing";
import { B2B_DEMO_PATH, b2bSignInPath } from "@/lib/b2b-paths";
import { buttonClasses } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type T = (key: string, fallback?: string) => string;

const FAQ_KEYS = [1, 2, 3, 4, 5, 6] as const;

/** FAQ pairs shared by the page and its FAQPage JSON-LD, so the markup always matches the visible text. */
export function faqPairs(t: T): Array<{ question: string; answer: string }> {
  return FAQ_KEYS.map((n) => {
    const [question, answer] = t(`b2b.mkt.faq.${n}`, "").split(" / ");
    return { question: question ?? "", answer: answer ?? "" };
  });
}

const CONTAINER = "mx-auto w-full max-w-content px-[var(--gutter)]";
const h2 = "font-display text-h2 text-ink";
const iconChip = "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary";

/** "Title / body" pair stored in one translation string, split on the first " / ". */
function pair(t: T, key: string, fallback: string): [string, string] {
  const [a, ...rest] = t(key, fallback).split(" / ");
  return [a, rest.join(" / ")];
}

/** The hero headline is two sentences; the second is set in the brand colour, like the marketplace hero. */
function splitHeadline(text: string): [string, string] {
  const at = text.indexOf(". ");
  return at < 0 ? [text, ""] : [text.slice(0, at + 1), text.slice(at + 2)];
}

/* ------------------------------------------------------------------ */
/* Product mockups: drawn UI, labelled as one image each                */
/* ------------------------------------------------------------------ */

/** App-window frame around a mockup; the whole thing is one image for assistive tech (`alt`). */
function Window({ title, alt, children, className }: { title: string; alt: string; children: ReactNode; className?: string }) {
  return (
    <figure role="img" aria-label={alt} className={cn("overflow-hidden rounded-card border border-line bg-surface shadow-raised", className)}>
      <div aria-hidden="true" className="flex items-center gap-2 border-b border-line bg-canvas px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
        <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
        <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
        <span className="ml-2 text-micro uppercase text-ink-muted">{title}</span>
      </div>
      <div aria-hidden="true" className="p-3 md:p-4">{children}</div>
    </figure>
  );
}

type Tone = "planned" | "dispatched" | "done" | "conflict";
const TONE: Record<Tone, { bar: string; pill: string; label: string }> = {
  planned: { bar: "border-l-line-strong", pill: "bg-sunken text-ink-muted", label: "Planned" },
  dispatched: { bar: "border-l-info", pill: "bg-info-soft text-info", label: "Dispatched" },
  done: { bar: "border-l-success", pill: "bg-success-soft text-success", label: "Done" },
  conflict: { bar: "border-l-ember-text", pill: "bg-ember-soft text-ember-text", label: "Overlap" },
};

function JobCard({ id, time, who, tone }: { id: string; time: string; who: string; tone: Tone }) {
  const s = TONE[tone];
  return (
    <div className={cn("rounded-control border border-line border-l-4 bg-surface px-2.5 py-2 shadow-stamp", s.bar)}>
      <div className="flex flex-wrap items-center justify-between gap-x-2">
        <span className="whitespace-nowrap text-caption font-bold text-ink">{id}</span>
        <span className="whitespace-nowrap text-caption tabular text-ink-muted">{time}</span>
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-bold", s.pill)}>
          {tone === "conflict" ? <AlertTriangle className="h-3 w-3" /> : null}
          {s.label}
        </span>
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary-soft text-[0.625rem] font-bold text-primary">{who}</span>
      </div>
    </div>
  );
}

function BoardMockup({ title, alt }: { title: string; alt: string }) {
  const cols: Array<{ name: string; load: number; jobs: Array<Parameters<typeof JobCard>[0]> }> = [
    { name: "Unassigned", load: 0, jobs: [{ id: "JOB-1001", time: "08:30", who: "—", tone: "planned" }, { id: "JOB-1007", time: "13:00", who: "—", tone: "planned" }] },
    { name: "Team A", load: 70, jobs: [{ id: "JOB-1011", time: "08:30", who: "AM", tone: "dispatched" }, { id: "JOB-1014", time: "11:00", who: "AM", tone: "done" }] },
    { name: "Team B", load: 95, jobs: [{ id: "JOB-1021", time: "08:30", who: "RS", tone: "dispatched" }, { id: "JOB-1048", time: "09:00", who: "RS", tone: "conflict" }] },
  ];
  return (
    <Window title={title} alt={alt}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {cols.map((c, i) => (
          <div key={c.name} className={cn("space-y-2 rounded-control bg-sunken p-2", i === 0 && "hidden sm:block")}>
            <div className="flex items-center justify-between">
              <span className="text-caption font-bold text-ink">{c.name}</span>
              {c.load ? <span className="text-[0.6875rem] tabular text-ink-muted">{c.load}%</span> : null}
            </div>
            {c.load ? (
              <div className="h-1 overflow-hidden rounded-full bg-line">
                <div className={cn("h-full rounded-full", c.load > 90 ? "bg-ember-text" : "bg-primary")} style={{ width: `${c.load}%` }} />
              </div>
            ) : <div className="h-1" />}
            {c.jobs.map((j) => <JobCard key={j.id} {...j} />)}
          </div>
        ))}
      </div>
    </Window>
  );
}

function PhoneMockup({ alt, className }: { alt: string; className?: string }) {
  const steps = [["Check the boiler pressure", true], ["Photos of the valve", true], ["Customer signature", false]] as const;
  return (
    <figure role="img" aria-label={alt} className={cn("w-[15.5rem] rounded-[2rem] border border-line-strong bg-ink p-2 shadow-raised", className)}>
      <div aria-hidden="true" className="overflow-hidden rounded-[1.6rem] bg-surface">
        <div className="flex items-center justify-between bg-primary px-4 pb-3 pt-4 text-on-fill">
          <div>
            <p className="text-[0.6875rem] font-bold uppercase tracking-wide opacity-80">In progress</p>
            <p className="font-display text-body font-bold">JOB-1051</p>
          </div>
          <span className="rounded-full bg-on-fill/15 px-2 py-1 text-caption font-bold tabular">1:12:05</span>
        </div>
        <ul className="space-y-1.5 p-3">
          {steps.map(([label, done]) => (
            <li key={label} className="flex items-center gap-2 rounded-control border border-line px-2.5 py-2 text-caption text-ink">
              <span className={cn("inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full", done ? "bg-primary text-on-fill" : "border border-line-strong")}>
                {done ? <Check className="h-3 w-3" /> : null}
              </span>
              <span className={done ? "text-ink-muted line-through" : ""}>{label}</span>
            </li>
          ))}
        </ul>
        <div className="px-3 pb-4">
          <div className="flex min-h-[40px] items-center justify-center gap-1.5 rounded-control bg-primary text-caption font-bold text-on-fill">
            <Check className="h-4 w-4" /> Complete job
          </div>
        </div>
      </div>
    </figure>
  );
}

function ConflictMockup({ title, alt }: { title: string; alt: string }) {
  return (
    <Window title={title} alt={alt}>
      <div className="space-y-2">
        <JobCard id="JOB-1021" time="08:30–09:30" who="RS" tone="dispatched" />
        <div className="rounded-card border border-ember-text/40 bg-ember-soft p-3">
          <p className="flex items-center gap-2 text-caption font-bold text-ember-text"><AlertTriangle className="h-4 w-4" /> JOB-1048 overlaps JOB-1021</p>
          <p className="mt-1 text-caption text-ink-muted">Team B · 09:00–10:30 · 30 min overlap</p>
          <div className="mt-3 flex gap-2">
            <span className="rounded-control bg-surface px-2.5 py-1.5 text-caption font-bold text-ink shadow-stamp">Pick another time</span>
            <span className="rounded-control px-2.5 py-1.5 text-caption font-bold text-ember-text">Override…</span>
          </div>
        </div>
      </div>
    </Window>
  );
}

function SplitMockup({ title, alt }: { title: string; alt: string }) {
  return (
    <Window title={title} alt={alt}>
      <div className="grid grid-cols-[2fr_3fr] gap-2">
        <div className="space-y-1.5">
          {[["08:30", "JOB-1051", true], ["11:00", "JOB-1055", false], ["14:30", "JOB-1060", false]].map(([time, id, active]) => (
            <div key={String(id)} className={cn("rounded-control px-2 py-1.5 text-caption", active ? "bg-primary-soft font-bold text-primary" : "bg-sunken text-ink-muted")}>
              <span className="tabular">{time}</span> · {id}
            </div>
          ))}
        </div>
        <div className="rounded-control border border-line p-2.5">
          <p className="text-caption font-bold text-ink">JOB-1051 · Boiler service</p>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {[0, 1, 2].map((n) => <div key={n} className="aspect-square rounded-[6px] bg-gradient-to-br from-sunken to-line" />)}
          </div>
          <p className="mt-2 flex items-center gap-1 text-[0.6875rem] text-ink-muted"><Wrench className="h-3 w-3" /> 2 parts logged</p>
        </div>
      </div>
    </Window>
  );
}

function ReviewMockup({ title, alt }: { title: string; alt: string }) {
  const rows = [["Checklist", "6 / 6"], ["Photos", "4"], ["Parts", "2"], ["Signature", "Signed"]];
  return (
    <Window title={title} alt={alt}>
      <ul className="divide-y divide-line rounded-control border border-line">
        {rows.map(([k, v]) => (
          <li key={k} className="flex items-center justify-between px-3 py-2 text-caption">
            <span className="flex items-center gap-2 text-ink"><span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-success-soft text-success"><Check className="h-3 w-3" /></span>{k}</span>
            <span className="font-bold text-ink-muted">{v}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center justify-end gap-2">
        <span className="rounded-control px-3 py-1.5 text-caption font-bold text-ink-muted">Send back</span>
        <span className="rounded-control bg-primary px-3 py-1.5 text-caption font-bold text-on-fill">Approve</span>
      </div>
    </Window>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */

const STEP_ICONS: LucideIcon[] = [ClipboardList, CalendarClock, Route, Smartphone, ClipboardCheck];
const REL_ICONS: LucideIcon[] = [CloudOff, RefreshCw, Smartphone];
const ROLE_ICONS: Record<string, LucideIcon> = { admin: Crown, ops: UserCog, dispatcher: Headset, lead: Users, tech: Truck };
const FEATURE_ICONS: Record<string, LucideIcon> = { dispatch: Route, tech: Smartphone, review: ShieldCheck };

export function FieldServiceHome({ t, lang }: { t: T; lang: string }) {
  const demo = b2bLocalizedPath(lang, B2B_DEMO_PATH);
  const signIn = b2bSignInPath();
  const [headA, headB] = splitHeadline(t("b2b.mkt.hero.h1", "Dispatch the day. Finish every job with proof."));
  const how = [1, 2, 3, 4, 5].map((n) => ({ n, ...(([title, body]) => ({ title, body }))(pair(t, `b2b.mkt.how.${n}`, "")) }));
  const feats = (["dispatch", "tech", "review"] as const).map((k) => ({
    k,
    kicker: t(`b2b.mkt.feat.${k}.kicker`, k),
    h3: t(`b2b.mkt.feat.${k}.h3`, ""),
    body: t(`b2b.mkt.feat.${k}.body`, ""),
    bullets: [1, 2, 3].map((i) => t(`b2b.mkt.feat.${k}.b${i}`, "")),
  }));
  const rel = [1, 2, 3].map((n) => pair(t, `b2b.mkt.rel.${n}`, ""));
  const roles = (["admin", "ops", "dispatcher", "lead", "tech"] as const).map((k) => ({ k, ...(([name, body]) => ({ name, body }))(pair(t, `b2b.mkt.roles.${k}`, "")) }));
  const faq = faqPairs(t);
  const visual = (k: (typeof feats)[number]["k"], title: string) =>
    k === "dispatch" ? <ConflictMockup title={title} alt={t("b2b.mkt.img.conflict.alt", "")} />
      : k === "tech" ? <SplitMockup title={title} alt={t("b2b.mkt.img.split.alt", "")} />
        : <ReviewMockup title={title} alt={t("b2b.mkt.img.review.alt", "")} />;

  return (
    <div className="bg-canvas text-ink">
      {/* Hero */}
      <section aria-labelledby="mkt-h1" className={cn(CONTAINER, "py-10 md:py-16")}>
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
          <div className="min-w-0 lg:col-span-6">
            <p className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-label text-primary">
              <Wrench className="h-3.5 w-3.5" aria-hidden="true" />
              {t("b2b.mkt.hero.kicker", "Field service management")}
            </p>
            <h1 id="mkt-h1" className="mt-4 font-display text-display text-ink">
              {headA} {headB ? <span className="block text-primary">{headB}</span> : null}
            </h1>
            <p className="mt-5 max-w-xl text-body-lg text-ink-muted">{t("b2b.mkt.hero.sub", "")}</p>
            <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <a href={demo} className={buttonClasses("primary", "lg", "px-6")}>
                {t("b2b.mkt.hero.cta", "Request a demo")}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
              <a href={signIn} className={buttonClasses("secondary", "lg", "px-6")}>{t("b2b.mkt.hero.secondary", "Sign in")}</a>
            </div>
            <ul className="mt-8 flex flex-wrap gap-2">
              {[1, 2, 3].map((i) => (
                <li key={i} className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-label text-ink">
                  <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                  {t(`b2b.mkt.hero.point${i}`, "")}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative min-w-0 lg:col-span-6">
            <div aria-hidden="true" className="absolute -inset-4 -z-0 rounded-sheet bg-primary-soft/60 md:-inset-6" />
            {/* The phone overlaps the board's lower-left (Unassigned) corner, keeping Team B's overlap warning in view. */}
            <div className="relative sm:pb-32 sm:pl-16 xl:pl-20">
              <BoardMockup title={t("b2b.mkt.feat.dispatch.kicker", "Dispatch")} alt={t("b2b.mkt.img.board.alt", "")} />
              <PhoneMockup alt={t("b2b.mkt.img.phone.alt", "")} className="mx-auto mt-6 sm:absolute sm:bottom-0 sm:left-0 sm:mt-0" />
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" aria-labelledby="mkt-how" className="scroll-mt-20 border-t border-line">
        <div className={cn(CONTAINER, "py-12 md:py-20")}>
          <h2 id="mkt-how" className={h2}>{t("b2b.mkt.how.h2", "From request to approved job in five steps")}</h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {how.map((s, i) => {
              const Icon = STEP_ICONS[i];
              return (
                <li key={s.n} className="relative rounded-card border border-line bg-surface p-5 transition-[border-color,box-shadow] duration-fast hover:border-line-strong hover:shadow-stamp">
                  <div className="flex items-center justify-between">
                    <span className={iconChip}><Icon className="h-5 w-5" aria-hidden="true" /></span>
                    <span aria-hidden="true" className="font-display text-h3 tabular text-ink-subtle">{String(s.n).padStart(2, "0")}</span>
                  </div>
                  <h3 className="mt-4 font-display text-h3 text-ink">{s.title}</h3>
                  <p className="mt-1 text-body text-ink-muted">{s.body}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* Features */}
      <section id="features" aria-labelledby="mkt-feat" className="scroll-mt-20 border-t border-line bg-surface">
        <div className={cn(CONTAINER, "py-12 md:py-20")}>
          <h2 id="mkt-feat" className={h2}>{t("b2b.mkt.feat.h2", "What your office and your technicians get")}</h2>
          <div className="mt-10 space-y-16 md:space-y-24">
            {feats.map((f, i) => {
              const Icon = FEATURE_ICONS[f.k];
              return (
                <article key={f.k} className="grid items-center gap-8 lg:grid-cols-12 lg:gap-12">
                  <div className={cn("min-w-0 lg:col-span-6", i % 2 === 1 && "lg:order-2")}>
                    <p className="inline-flex items-center gap-2 text-micro uppercase text-primary">
                      <Icon className="h-4 w-4" aria-hidden="true" />{f.kicker}
                    </p>
                    <h3 className="mt-3 font-display text-h2 text-ink">{f.h3}</h3>
                    <p className="mt-3 max-w-xl text-body-lg text-ink-muted">{f.body}</p>
                    <ul className="mt-6 space-y-3">
                      {f.bullets.map((b) => (
                        <li key={b} className="flex items-start gap-3 text-body text-ink">
                          <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary"><Check className="h-3.5 w-3.5" aria-hidden="true" /></span>
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className={cn("min-w-0 lg:col-span-6", i % 2 === 1 && "lg:order-1")}>
                    <div className="rounded-sheet bg-canvas p-4 md:p-8">{visual(f.k, f.kicker)}</div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Reliability: the one dark band */}
      <section id="reliability" aria-labelledby="mkt-rel" className="scroll-mt-20 border-t border-line">
        <div className={cn(CONTAINER, "py-12 md:py-20")}>
          <div className="grid overflow-hidden rounded-card bg-primary text-on-fill shadow-stamp lg:grid-cols-12">
            <div className="p-6 md:p-10 lg:col-span-7">
              <h2 id="mkt-rel" className="font-display text-h2">{t("b2b.mkt.rel.h2", "Built for the van, not the office")}</h2>
              <p className="mt-3 max-w-xl text-body-lg opacity-90">{t("b2b.mkt.rel.intro", "")}</p>
              <ol className="mt-8 space-y-6">
                {rel.map(([title, body], i) => {
                  const Icon = REL_ICONS[i];
                  return (
                    <li key={title} className="flex gap-4">
                      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-on-fill/15"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                      <div><h3 className="font-display text-h3">{title}</h3><p className="mt-1 text-body opacity-90">{body}</p></div>
                    </li>
                  );
                })}
              </ol>
            </div>
            <div className="flex flex-col justify-center gap-3 bg-primary-strong p-6 md:p-10 lg:col-span-5">
              <div role="img" aria-label={t("b2b.mkt.img.sync.alt", "")} className="rounded-card bg-surface p-4 text-ink shadow-raised">
                <p aria-hidden="true" className="flex items-center gap-2 text-label">
                  <span className="relative inline-flex h-2.5 w-2.5"><span className="absolute inset-0 animate-ping rounded-full bg-warning opacity-60 motion-reduce:animate-none" /><span className="relative h-2.5 w-2.5 rounded-full bg-warning" /></span>
                  {t("b2b.mkt.rel.status", "Offline · 3 changes waiting")}
                </p>
                <ul aria-hidden="true" className="mt-3 space-y-1.5 text-caption text-ink-muted">
                  {["JOB-1051 · checklist", "JOB-1051 · 2 photos", "JOB-1051 · signature"].map((x) => (
                    <li key={x} className="flex items-center justify-between rounded-control bg-sunken px-2.5 py-1.5"><span>{x}</span><RefreshCw className="h-3.5 w-3.5" /></li>
                  ))}
                </ul>
              </div>
              <p className="text-body opacity-90">{t("b2b.mkt.rel.statusNote", "")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Roles */}
      <section id="roles" aria-labelledby="mkt-roles" className="scroll-mt-20 border-t border-line">
        <div className={cn(CONTAINER, "py-12 md:py-20")}>
          <div className="max-w-2xl">
            <h2 id="mkt-roles" className={h2}>{t("b2b.mkt.roles.h2", "The right access for each role")}</h2>
            <p className="mt-3 text-body-lg text-ink-muted">{t("b2b.mkt.roles.intro", "")}</p>
          </div>
          <dl className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {roles.map(({ k, name, body }, i) => {
              const Icon = ROLE_ICONS[k];
              return (
                <div key={k} className={cn("rounded-card border border-line bg-surface p-5", i === 0 && "sm:col-span-2 lg:col-span-1 lg:row-span-2 lg:flex lg:flex-col lg:justify-between lg:bg-primary-soft lg:border-primary/20")}>
                  <div>
                    <span className={iconChip}><Icon className="h-5 w-5" aria-hidden="true" /></span>
                    <dt className="mt-4 font-display text-h3 text-ink">{name}</dt>
                    <dd className="mt-1 text-body text-ink-muted">{body}</dd>
                  </div>
                  {i === 0 ? <p className="mt-6 hidden items-start gap-2 text-caption text-ink-muted lg:flex"><PenLine className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />{t("b2b.mkt.roles.note", "")}</p> : null}
                </div>
              );
            })}
          </dl>
          <p className="mt-4 max-w-2xl text-caption text-ink-muted lg:hidden">{t("b2b.mkt.roles.note", "")}</p>
        </div>
      </section>

      {/* FAQ: answers stay in the DOM (details), matching the FAQPage JSON-LD */}
      <section id="faq" aria-labelledby="mkt-faq" className="scroll-mt-20 border-t border-line bg-surface">
        <div className="mx-auto grid max-w-content gap-8 px-[var(--gutter)] py-12 md:py-20 lg:grid-cols-12">
          <h2 id="mkt-faq" className={cn(h2, "lg:col-span-4")}>{t("b2b.mkt.faq.h2", "Questions, answered")}</h2>
          <div className="space-y-3 lg:col-span-8">
            {faq.map((f, i) => (
              <details key={f.question} open={i === 0} className="group rounded-card border border-line bg-canvas px-5 transition-[border-color] duration-fast open:border-line-strong">
                <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-4 rounded-card text-body font-bold text-ink focus-visible:shadow-focus [&::-webkit-details-marker]:hidden">
                  {f.question}
                  <span aria-hidden="true" className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary transition-transform duration-fast group-open:rotate-45">+</span>
                </summary>
                <p className="pb-5 text-body text-ink-muted">{f.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA: the marketplace's split band */}
      <section aria-labelledby="mkt-final" className="border-t border-line">
        <div className={cn(CONTAINER, "py-12 md:py-16")}>
          <div className="grid gap-4 md:grid-cols-2 md:gap-0 md:overflow-hidden md:rounded-card md:border md:border-line md:shadow-stamp">
            <div className="flex flex-col items-start rounded-card bg-primary p-6 text-on-fill md:rounded-none md:p-10">
              <h2 id="mkt-final" className="font-display text-h2">{t("b2b.mkt.final.h2", "See your own jobs on the board.")}</h2>
              <p className="mt-3 max-w-md text-body opacity-90">{t("b2b.mkt.final.body", "")}</p>
              <a href={demo} className={buttonClasses("secondary", "default", "mt-6 border-surface")}>
                {t("b2b.mkt.final.cta", "Request a demo")}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
            <div className="flex flex-col items-start rounded-card border border-line bg-surface p-6 md:rounded-none md:border-0 md:p-10">
              <h2 className="font-display text-h2 text-ink">{t("b2b.mkt.final.signInTitle", "Already using work4u?")}</h2>
              <p className="mt-3 max-w-md text-body text-ink-muted">{t("b2b.mkt.final.signInBody", "Sign in to open your company's workspace or the technician app.")}</p>
              <a href={signIn} className={buttonClasses("primary", "default", "mt-6")}>
                {t("b2b.mkt.nav.signIn", "Sign in")}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
