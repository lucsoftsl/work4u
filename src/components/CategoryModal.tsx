"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/lib/i18n";
import { getCategoriesWithTranslations } from "@/lib/category-utils";
import { useRouter } from "next/navigation";

interface CategoryModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CategoryModal({ isOpen, onClose }: CategoryModalProps) {
    const { t } = useTranslation();
    const router = useRouter();
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const categories = getCategoriesWithTranslations(t);

    const handleCategoryClick = async (categoryId: string) => {
        setSelectedCategory(categoryId);
        setIsLoading(true);

        // Navigate to jobs page with category filter
        router.push(`/jobs?category=${categoryId}`);

        // Close modal after navigation
        setTimeout(() => {
            onClose();
            setSelectedCategory(null);
            setIsLoading(false);
        }, 300);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-foreground">{t('home.browseCategory')}</h2>
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground transition"
                        aria-label="Close modal"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Categories Grid */}
                <div className="p-6">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {categories.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => handleCategoryClick(cat.id)}
                                disabled={isLoading && selectedCategory === cat.id}
                                className={`p-4 text-center rounded-lg border-2 transition ${selectedCategory === cat.id
                                        ? "border-blue-500 bg-primary/10"
                                        : "border-border hover:border-primary hover:bg-primary/10"
                                    } disabled:opacity-50`}
                            >
                                <div className="text-4xl mb-3">{cat.icon}</div>
                                <p className="font-medium text-foreground text-sm line-clamp-2">
                                    {cat.name}
                                </p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-border px-6 py-4 bg-muted flex justify-end">
                    <Button variant="outline" onClick={onClose}>
                        {t('common.close') || 'Close'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
