'use client';

import Link from "@/components/LocaleLink";
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { ArrowRight, Globe } from 'lucide-react';
import { useTranslation, type Locale } from '@/lib/i18n';
import { useLanguageSwitch } from '@/hooks/useLanguageSwitch';
import { BrandMark } from '@/components/BrandMark';
import { useMenuKeys } from '@/hooks/useMenuKeys';
import { isChromeless } from '@/components/shell/nav-config';
import { BRAND } from '@/lib/seo/site';

function LanguageMenu() {
    const { t, locale } = useTranslation();
    const switchLanguage = useLanguageSwitch();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const listId = useId();
    const onListKeys = useMenuKeys(open, () => setOpen(false), listRef, triggerRef);

    useEffect(() => {
        if (!open) return;
        const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
        const onClick = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
        };
        document.addEventListener('keydown', onKey);
        document.addEventListener('mousedown', onClick);
        return () => {
            document.removeEventListener('keydown', onKey);
            document.removeEventListener('mousedown', onClick);
        };
    }, [open]);

    const languages: { code: Locale; label: string }[] = [
        { code: 'en', label: t('footer.english') },
        { code: 'es', label: t('footer.spanish') },
        { code: 'fr', label: t('footer.french') },
        { code: 'hu', label: t('footer.hungarian') },
        { code: 'ro', label: t('footer.romanian') },
    ];
    const current = languages.find((l) => l.code === locale)?.label ?? locale.toUpperCase();

    return (
        <div ref={ref} className="relative">
            <button
                ref={triggerRef}
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={listId}
                aria-label={`${t('footer.language')}: ${current}`}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-control border border-line-strong bg-surface px-3 text-label text-ink hover:bg-sunken"
            >
                <Globe className="h-4 w-4" aria-hidden="true" />
                {current}
            </button>
            {open ? (
                <ul ref={listRef} onKeyDown={onListKeys} id={listId} role="listbox" aria-label={t('footer.language')} className="absolute bottom-full left-0 z-50 mb-2 w-48 rounded-card border border-line bg-surface p-1.5 shadow-raised">
                    {languages.map((lang) => (
                        <li key={lang.code} role="option" aria-selected={locale === lang.code}>
                            <button
                                type="button"
                                onClick={() => {
                                    switchLanguage(lang.code);
                                    setOpen(false);
                                }}
                                className={`flex min-h-[44px] w-full items-center rounded-control px-3 text-left text-label ${
                                    locale === lang.code ? 'bg-primary-soft text-primary' : 'text-ink hover:bg-sunken'
                                }`}
                            >
                                {lang.label}
                            </button>
                        </li>
                    ))}
                </ul>
            ) : null}
        </div>
    );
}

export default function Footer() {
    const pathname = usePathname();
    const { t } = useTranslation();

    if (isChromeless(pathname)) return null;

    const links = [
        { href: '/how-it-works', label: t('footer.howItWorks') },
        { href: '/how-it-works#safety', label: t('footer.safetyTips') },
        { href: '/contact', label: t('footer.help') },
        { href: '/blog', label: t('footer.blog') },
        { href: '/terms', label: t('footer.terms') },
        { href: '/privacy', label: t('footer.privacy') },
    ];

    return (
        <footer className="mt-auto border-t border-line bg-sunken">
            <div className="mx-auto flex max-w-content flex-col gap-6 px-4 py-8 md:px-6 lg:flex-row lg:items-center lg:justify-between">
                <BrandMark size="sm" />
                <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-1">
                    {links.map((link) => (
                        <Link key={link.href} href={link.href} className="inline-flex min-h-[44px] items-center text-label font-normal text-ink-muted hover:text-ink">
                            {link.label}
                        </Link>
                    ))}
                    <Link href="/business" className="inline-flex min-h-[44px] items-center gap-1 text-label text-primary hover:text-primary-strong">
                        {t('footer.forCompanies')}
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                </nav>
                <div className="flex flex-wrap items-center gap-4">
                    <LanguageMenu />
                    <p className="text-caption text-ink-muted">© {new Date().getFullYear()} {BRAND}. {t('footer.allRightsReserved')}</p>
                </div>
            </div>
        </footer>
    );
}
