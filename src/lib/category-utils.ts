import { CATEGORIES, EXPERIENCE_LEVELS, BUDGET_TYPES, DURATIONS } from "@/data/categories";
import type { TranslationKey } from "./i18n";

/**
 * Get the translated name of a category
 * @param categoryId - The ID of the category
 * @param t - Translation function from useTranslation hook
 * @returns The translated category name
 */
export function getCategoryName(
    categoryId: string,
    t: (key: TranslationKey | string, fallback?: string) => string
): string {
    const category = CATEGORIES.find((cat) => cat.id === categoryId);
    if (!category) return categoryId;
    return t(category.nameKey);
}

/**
 * Get a category object by ID
 * @param categoryId - The ID of the category
 * @returns The category object or undefined
 */
export function getCategory(categoryId: string) {
    return CATEGORIES.find((cat) => cat.id === categoryId);
}

/**
 * Get all categories with their translated names
 * @param t - Translation function from useTranslation hook
 * @returns Array of categories with translated names
 */
export function getCategoriesWithTranslations(
    t: (key: TranslationKey | string) => string
) {
    return CATEGORIES.map((category) => ({
        ...category,
        name: t(category.nameKey),
    }));
}

/**
 * Get the translated label for an experience level, budget type, or
 * duration option value. Falls back to the raw English label if a value
 * doesn't have a matching translation key.
 */
export function getExperienceLevelLabel(
    value: string,
    t: (key: TranslationKey | string, fallback?: string) => string
): string {
    const level = EXPERIENCE_LEVELS.find((l) => l.value === value);
    if (!level) return value;
    return t(`postOptions.experience.${value}`, level.label);
}

export function getBudgetTypeLabel(
    value: string,
    t: (key: TranslationKey | string, fallback?: string) => string
): string {
    const type = BUDGET_TYPES.find((b) => b.value === value);
    if (!type) return value;
    return t(`postOptions.budgetType.${value}`, type.label);
}

export function getDurationLabel(
    value: string,
    t: (key: TranslationKey | string, fallback?: string) => string
): string {
    const duration = DURATIONS.find((d) => d.value === value);
    if (!duration) return value;
    return t(`postOptions.duration.${value}`, duration.label);
}
