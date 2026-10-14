"use client";

import Link from "@/components/LocaleLink";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface BackLinkProps {
    href: string;
    label: string;
    className?: string;
}

/** "← Back to …" link to the page one level up, placed above a page title. */
export function BackLink({ href, label, className }: BackLinkProps) {
    return (
        <Link
            href={href}
            className={cn(
                "-ml-1 inline-flex min-h-[44px] items-center gap-2 rounded-control px-1 text-label text-primary hover:underline",
                className
            )}
        >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {label}
        </Link>
    );
}

/** For public pages: one level up is the dashboard when signed in, otherwise the home page. */
export function HomeBackLink({ className }: { className?: string }) {
    const { t } = useTranslation();
    const { isAuthenticated } = useAuth();
    return isAuthenticated ? (
        <BackLink href="/dashboard" label={t("nav.backToDashboard")} className={className} />
    ) : (
        <BackLink href="/" label={t("nav.backToHome", "Back to home")} className={className} />
    );
}
