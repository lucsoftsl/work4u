'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation, type Locale } from '@/lib/i18n';
import { useState } from 'react';

export default function Footer() {
    const pathname = usePathname();
    const { t, locale, setLocale } = useTranslation();
    const [showLanguageMenu, setShowLanguageMenu] = useState(false);

    // Same exclusion list as AppHeader: the homepage has its own bespoke
    // footer already, and auth/immersive-map screens render chromeless.
    if (
        pathname === '/' ||
        pathname.startsWith('/signup') ||
        pathname.startsWith('/signin') ||
        pathname.endsWith('/nearby-pros')
    ) {
        return null;
    }

    const languages: { code: Locale; label: string }[] = [
        { code: 'en', label: t('footer.english') },
        { code: 'es', label: t('footer.spanish') },
        { code: 'fr', label: t('footer.french') },
        { code: 'hu', label: t('footer.hungarian') },
        { code: 'ro', label: t('footer.romanian') },
    ];

    const handleLanguageChange = (newLocale: Locale) => {
        setLocale(newLocale);
        setShowLanguageMenu(false);
    };

    return (
        <footer className="bg-gray-900 text-gray-100 py-12">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                    <div>
                        <h3 className="text-white font-semibold mb-4">Work4U</h3>
                        <p className="text-sm text-muted-foreground">
                            {t('footer.tagline')}
                        </p>
                    </div>
                    <div>
                        <h4 className="text-white font-semibold mb-4">{t('footer.forWorkers')}</h4>
                        <ul className="space-y-2 text-sm">
                            <li><Link href="/jobs" className="text-muted-foreground hover:text-white transition-colors">{t('footer.browseJobs')}</Link></li>
                            <li><Link href="/how-it-works" className="text-muted-foreground hover:text-white transition-colors">{t('footer.howItWorks')}</Link></li>
                            <li><Link href="/how-it-works" className="text-muted-foreground hover:text-white transition-colors">{t('footer.safetyTips')}</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-white font-semibold mb-4">{t('footer.forEmployers')}</h4>
                        <ul className="space-y-2 text-sm">
                            <li><Link href="/post-job" className="text-muted-foreground hover:text-white transition-colors">{t('footer.postJob')}</Link></li>
                            <li><Link href="/workers" className="text-muted-foreground hover:text-white transition-colors">{t('footer.findTalent')}</Link></li>
                            <li><Link href="/pricing" className="text-muted-foreground hover:text-white transition-colors">{t('footer.pricing')}</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-white font-semibold mb-4">{t('footer.company')}</h4>
                        <ul className="space-y-2 text-sm">
                            <li><Link href="/how-it-works" className="text-muted-foreground hover:text-white transition-colors">{t('footer.about')}</Link></li>
                            <li><Link href="/blog" className="text-muted-foreground hover:text-white transition-colors">{t('footer.blog')}</Link></li>
                            <li><Link href="/contact" className="text-muted-foreground hover:text-white transition-colors">{t('footer.contact')}</Link></li>
                            <li><Link href="/terms" className="text-muted-foreground hover:text-white transition-colors">{t('footer.terms')}</Link></li>
                            <li><Link href="/privacy" className="text-muted-foreground hover:text-white transition-colors">{t('footer.privacy')}</Link></li>
                        </ul>
                    </div>
                </div>

                {/* Language Selector & Copyright */}
                <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} Work4U. {t('footer.allRightsReserved')}</p>

                    {/* Language Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                            className="flex items-center gap-2 px-3 py-2 rounded-md border border-gray-700 hover:border-gray-600 text-gray-300 hover:text-white transition-colors text-sm"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 00.948-.684l1.498-4.493a1 1 0 011.502-.684l1.498 4.493a1 1 0 00.948.684H19a2 2 0 012 2v2.5M3 15a2 2 0 012-2h3.28a1 1 0 00.948-.684l1.498-4.493a1 1 0 011.502-.684l1.498 4.493a1 1 0 00.948.684H19a2 2 0 012 2V17M17 18a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            {t('footer.language')}
                            <svg className={`w-4 h-4 transition-transform ${showLanguageMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                            </svg>
                        </button>

                        {showLanguageMenu && (
                            <div className="absolute bottom-full mb-2 right-0 w-48 rounded-md shadow-lg bg-gray-800 border border-gray-700 py-2 z-10">
                                {languages.map((lang) => (
                                    <button
                                        key={lang.code}
                                        onClick={() => handleLanguageChange(lang.code)}
                                        className={`w-full text-left px-4 py-2 text-sm transition-colors ${locale === lang.code
                                                ? 'bg-blue-600 text-white'
                                                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span>{lang.label}</span>
                                            {locale === lang.code && (
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </footer>
    );
}
