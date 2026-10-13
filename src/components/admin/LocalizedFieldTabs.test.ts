import { describe, expect, it } from 'vitest';

import { LOCALES } from '@/lib/i18n';
import {
    emptyLocalizedText,
    firstIncompleteLocale,
    isLocaleComplete,
    nativeLanguageName,
    withAllLocales,
} from './LocalizedFieldTabs';

const fields = [{ key: 'name', label: 'Name' }, { key: 'description', label: 'Description' }];
const filled = (text: string) => Object.fromEntries(LOCALES.map((locale) => [locale, text]));

describe('localized text helpers', () => {
    it('creates an empty entry for every available language', () => {
        expect(Object.keys(emptyLocalizedText())).toEqual(LOCALES);
    });

    it('adds the languages an older en/es/fr record is missing, keeping existing text', () => {
        const result = withAllLocales({ en: 'First job', es: 'Primer trabajo', fr: 'Premier job' });
        expect(result.en).toBe('First job');
        expect(Object.keys(result).sort()).toEqual([...LOCALES].sort());
    });

    it('treats whitespace-only text as missing', () => {
        const values = { name: { ...filled('x'), hu: '  ' }, description: filled('y') };
        expect(isLocaleComplete(fields, values, 'hu')).toBe(false);
        expect(isLocaleComplete(fields, values, 'en')).toBe(true);
    });

    it('finds the first language with a gap in any field, or null when all are filled', () => {
        expect(firstIncompleteLocale(fields, { name: filled('x'), description: { ...filled('y'), ro: '' } })).toBe('ro');
        expect(firstIncompleteLocale(fields, { name: filled('x'), description: filled('y') })).toBeNull();
    });

    it('names each language in itself', () => {
        expect(nativeLanguageName('fr')).toBe('Français');
        expect(nativeLanguageName('hu')).toBe('Magyar');
    });
});
