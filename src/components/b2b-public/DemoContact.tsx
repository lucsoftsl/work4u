"use client";

import { useEffect, useState } from "react";
import { Mail, MapPin, Phone } from "lucide-react";
import { siteSettingsApi } from "@/lib/site-settings-api";
import type { ContactInfo } from "@/api/types";

interface Labels { title: string; phone: string; email: string; address: string }

/**
 * "Prefer to talk?" panel next to the demo form: the company's published contact details (Admin → Business, same source as the
 * marketplace contact page). Nothing published, or the API down: the panel is left out, the form alone is enough.
 */
export function DemoContact({ labels }: { labels: Labels }) {
  const [info, setInfo] = useState<ContactInfo | null>(null);

  useEffect(() => {
    let active = true;
    siteSettingsApi.getContactInfo().then((data) => { if (active) setInfo(data); }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  if (!(info?.phone || info?.email || info?.address)) return null;
  const row = "flex min-h-[56px] items-center gap-3 rounded-control px-2 text-ink transition-colors duration-fast hover:bg-sunken";
  const chip = "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary";
  return (
    <section aria-labelledby="demo-contact" className="rounded-card border border-line bg-surface p-5">
      <h2 id="demo-contact" className="px-2 font-display text-h3 text-ink">{labels.title}</h2>
      <ul className="mt-2">
        {info.phone ? <li><a href={`tel:${info.phone}`} className={row}><span className={chip}><Phone className="h-4 w-4" aria-hidden="true" /></span><span><span className="block text-caption text-ink-muted">{labels.phone}</span>{info.phone}</span></a></li> : null}
        {info.email ? <li><a href={`mailto:${info.email}`} className={row}><span className={chip}><Mail className="h-4 w-4" aria-hidden="true" /></span><span className="min-w-0"><span className="block text-caption text-ink-muted">{labels.email}</span><span className="block truncate">{info.email}</span></span></a></li> : null}
        {info.address ? <li className={row}><span className={chip}><MapPin className="h-4 w-4" aria-hidden="true" /></span><span><span className="block text-caption text-ink-muted">{labels.address}</span>{info.address}</span></li> : null}
      </ul>
    </section>
  );
}
