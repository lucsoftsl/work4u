"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useTranslation } from "@/lib/i18n";
import { localizedPath } from "@/lib/i18n-routing";

type Props = ComponentProps<typeof Link>;

/**
 * Drop-in replacement for next/link. Public pages keep the visitor's language (`/jobs` → `/ro/jobs`);
 * private routes, external links and English stay as they are (see localizedPath).
 */
export default function LocaleLink({ href, ...rest }: Props) {
  const { locale } = useTranslation();
  if (typeof href === "string") return <Link href={localizedPath(locale, href)} {...rest} />;
  const pathname = href.pathname;
  if (typeof pathname !== "string") return <Link href={href} {...rest} />;
  return <Link href={{ ...href, pathname: localizedPath(locale, pathname) }} {...rest} />;
}
