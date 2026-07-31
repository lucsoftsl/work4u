"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

export interface CategoryOption {
    id: string;
    name: string;
    icon?: string;
}

interface CategorySelectorProps {
    value: string;
    onChange: (categoryId: string) => void;
    categories: CategoryOption[];
    placeholder?: string;
}

export function CategorySelector({ value, onChange, categories, placeholder }: CategorySelectorProps) {
    const { t } = useTranslation();
    const resolvedPlaceholder = placeholder ?? t('categorySelector.placeholder');
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const filteredCategories = categories.filter((category) =>
        category.name.toLowerCase().includes(search.toLowerCase())
    );

    const selectedCategory = categories.find((c) => c.id === value);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (id: string) => {
        onChange(id);
        setIsOpen(false);
        setSearch("");
    };

    return (
        <div className="relative w-full" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => {
                    setIsOpen(!isOpen);
                    if (!isOpen) {
                        setTimeout(() => inputRef.current?.focus(), 0);
                    }
                }}
                className="field-shell flex w-full items-center justify-between text-left"
            >
                <span className="flex items-center gap-2 text-ink">
                    {selectedCategory?.icon && <span className="text-base leading-none">{selectedCategory.icon}</span>}
                    <span className={selectedCategory ? "" : "text-ink-subtle"}>
                        {selectedCategory ? selectedCategory.name : resolvedPlaceholder}
                    </span>
                </span>
                <ChevronDown size={18} className={`shrink-0 text-ink-subtle transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {isOpen && (
                <div className="absolute left-0 right-0 top-full z-50 mt-2 min-w-40 overflow-hidden rounded-2xl border border-outline bg-white shadow-soft">
                    <div className="border-b border-outline p-3">
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder={t('categorySelector.searchPlaceholder')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full rounded-xl border border-outline bg-white px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-subtle focus:border-brand focus:ring-2 focus:ring-brand/20"
                        />
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                        {filteredCategories.length > 0 ? (
                            filteredCategories.map((category) => (
                                <button
                                    key={category.id}
                                    type="button"
                                    onClick={() => handleSelect(category.id)}
                                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-brand-soft/60 ${
                                        value === category.id ? "bg-brand-soft" : ""
                                    }`}
                                >
                                    {category.icon && <span className="text-base leading-none">{category.icon}</span>}
                                    <span className="font-medium text-ink">{category.name}</span>
                                </button>
                            ))
                        ) : (
                            <div className="px-4 py-3 text-center text-sm text-ink-subtle">{t('categorySelector.noResults')}</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
