"use client";

import { useEffect, useState } from "react";
import { Mail, Phone, Users } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { DemoRequestsApiError, getDemoRequests, type DemoRequest } from "@/lib/demo-requests-api";

const MESSAGE_PREVIEW = 140;

type State = { kind: "loading" } | { kind: "ready"; rows: DemoRequest[] } | { kind: "error"; migrationPending: boolean };

function RequestRow({ r }: { r: DemoRequest }) {
  const { t, locale } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const long = (r.message?.length ?? 0) > MESSAGE_PREVIEW;
  const message = r.message && long && !expanded ? `${r.message.slice(0, MESSAGE_PREVIEW).trimEnd()}…` : r.message;
  const date = r.createdAt && !Number.isNaN(Date.parse(r.createdAt)) ? new Date(r.createdAt).toLocaleString(locale) : "";
  return (
    <li className="py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="font-semibold text-ink">{r.company || "—"}<span className="font-normal text-ink-muted"> · {r.name}</span></p>
        <p className="text-xs text-ink-muted">{date}{r.locale ? ` · ${r.locale.toUpperCase()}` : ""}</p>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {r.email ? <a href={`mailto:${r.email}`} className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline"><Mail className="h-3.5 w-3.5" aria-hidden="true" />{r.email}</a> : null}
        {r.phone ? <a href={`tel:${r.phone}`} className="inline-flex items-center gap-1.5 text-ink hover:underline"><Phone className="h-3.5 w-3.5" aria-hidden="true" />{r.phone}</a> : null}
        {r.teamSize ? <span className="inline-flex items-center gap-1.5 text-ink-muted"><Users className="h-3.5 w-3.5" aria-hidden="true" />{t("admin.business.teamSize", "Team size")}: {r.teamSize}</span> : null}
      </div>
      {message ? (
        <p className="mt-2 whitespace-pre-line text-sm text-ink">
          {message}
          {long ? (
            <button type="button" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded} className="ml-2 text-sm font-semibold text-primary hover:underline">
              {expanded ? t("admin.business.showLess", "Show less") : t("admin.business.showMore", "Show more")}
            </button>
          ) : null}
        </p>
      ) : null}
    </li>
  );
}

/** Leads from the "Request a demo" form on /field-service/demo, newest first. */
export function DemoRequestsInbox({ token }: { token: string }) {
  const { t } = useTranslation();
  const [state, setState] = useState<State>({ kind: "loading" });

  const [attempt, setAttempt] = useState(0);

  // Only async updates in the effect (the first render is already "loading"); Retry resets to loading and bumps `attempt`.
  useEffect(() => {
    let active = true;
    getDemoRequests(token)
      .then((rows) => { if (active) setState({ kind: "ready", rows }); })
      .catch((err: unknown) => { if (active) setState({ kind: "error", migrationPending: err instanceof DemoRequestsApiError && err.migrationPending }); });
    return () => { active = false; };
  }, [token, attempt]);
  const retry = () => { setState({ kind: "loading" }); setAttempt((n) => n + 1); };

  if (state.kind === "loading") return <p role="status" className="text-ink-muted">{t("common.loading", "Loading…")}</p>;
  if (state.kind === "error") {
    return state.migrationPending ? (
      <p role="note" className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
        {t("admin.business.migrationPending", "Run migration 0014_demo_requests on the API to start collecting requests.")}
      </p>
    ) : (
      <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
        <span>{t("admin.business.loadError", "Couldn't load demo requests.")}</span>
        <Button onClick={retry}>{t("adminSettings.retry", "Retry")}</Button>
      </div>
    );
  }
  if (state.rows.length === 0) return <p className="text-sm text-ink-muted">{t("admin.business.empty", "No demo requests yet. They appear here when someone sends the form on the field-service demo page.")}</p>;
  return <ul className="divide-y divide-line">{state.rows.map((r) => <RequestRow key={r.id} r={r} />)}</ul>;
}
