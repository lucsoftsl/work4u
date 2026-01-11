import { CATEGORIES } from "@/data/categories";
import type { TranslationKey } from "./i18n";

/**
 * Get the translated name of a category
 * @param categoryId - The ID of the category
 * @param t - Translation function from useTranslation hook
 * @returns The translated category name
 */
export function getCategoryName(
    categoryId: string,
    t: (key: TranslationKey | string) => string
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
