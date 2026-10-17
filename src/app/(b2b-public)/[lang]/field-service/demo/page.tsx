import type { Metadata } from "next";
import { CalendarClock, Check } from "lucide-react";
import { B2bPublicFooter, B2bPublicHeader } from "@/components/b2b-public/B2bPublicChrome";
import { DemoContact } from "@/components/b2b-public/DemoContact";
import { DemoRequestForm } from "@/components/b2b-public/DemoRequestForm";
import { getServerT } from "@/lib/i18n-server";
import { NOINDEX } from "@/lib/seo/metadata";

type Props = { params: Promise<{ lang: string }> };

// A thin lead page: out of the index (the home page carries the SEO), reachable from every "Request a demo" button.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const t = await getServerT(lang);
  return { title: t("b2b.mkt.demo.title", "Request a demo"), ...NOINDEX };
}

export default async function DemoPage({ params }: Props) {
  const { lang } = await params;
  const t = await getServerT(lang);
  const f = (k: string, fb: string) => t(`b2b.mkt.demo.form.${k}`, fb);
  return (
    <>
      <B2bPublicHeader t={t} lang={lang} />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        <div className="mx-auto grid max-w-content gap-10 px-[var(--gutter)] py-10 md:py-16 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-5">
            <p className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-label text-primary">
              <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
              {t("b2b.mkt.demo.kicker", "30-minute walkthrough")}
            </p>
            <h1 className="mt-4 font-display text-h1 text-ink">{t("b2b.mkt.demo.title", "Request a demo")}</h1>
            <p className="mt-3 text-body-lg text-ink-muted">{t("b2b.mkt.demo.lead", "Tell us about your team and we will show you how work4u fits.")}</p>
            <ul className="mt-6 space-y-3">
              {[1, 2, 3].map((n) => (
                <li key={n} className="flex items-start gap-3 text-body text-ink">
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary"><Check className="h-3.5 w-3.5" aria-hidden="true" /></span>
                  {t(`b2b.mkt.demo.point${n}`, ["Your own jobs on the dispatch board", "The technician app, offline included", "Answers on setup, roles and pricing"][n - 1])}
                </li>
              ))}
            </ul>
          </div>
          <div className="lg:col-span-7">
            <DemoRequestForm
              lang={lang}
              labels={{
                name: f("name", "Your name"),
                email: f("email", "Work email"),
                company: f("company", "Company"),
                phone: f("phone", "Phone (optional)"),
                teamSize: f("teamSize", "How many technicians?"),
                teamSizeUnit: f("teamSizeUnit", "people"),
                message: f("message", "What should we cover? (optional)"),
                messageHint: f("messageHint", "For example the kind of jobs you do, or the tools you use today."),
                submit: f("submit", "Request a demo"),
                sending: f("sending", "Sending…"),
                sentTitle: f("sentTitle", "Thanks, we have your request"),
                sentBody: f("sentBody", "We will email you within one working day to find a time."),
                errRequired: f("errRequired", "Fill in this field (at least 2 characters)."),
                errEmail: f("errEmail", "Enter a valid email address."),
                errBusy: f("errBusy", "Too many requests from this connection. Try again in an hour."),
                errGeneric: f("errGeneric", "We couldn't send your request. Try again in a moment."),
                errCheck: f("errCheck", "Check the highlighted fields."),
                privacy: f("privacy", "We only use these details to arrange your demo."),
              }}
            />
            <div className="mt-6">
              <DemoContact labels={{ title: t("b2b.mkt.demo.talk", "Prefer to talk?"), phone: t("b2b.mkt.demo.phone", "Phone"), email: t("b2b.mkt.demo.email", "Email"), address: t("b2b.mkt.demo.address", "Address") }} />
            </div>
          </div>
        </div>
      </main>
      <B2bPublicFooter t={t} lang={lang} languagePath="/field-service/demo" />
    </>
  );
}
