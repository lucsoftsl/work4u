"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { JobCard } from "@/components/JobCard";
import { Sliders, ChevronLeft, ChevronRight, Briefcase } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { getCategoriesWithTranslations } from "@/lib/category-utils";
import { api } from "@/lib/api";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import type { Job } from "@/api/types";

const JOBS_PER_PAGE = 8;

export default function JobsPageContent() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [sortBy, setSortBy] = useState<"newest" | "budget" | "applicants">("newest");
    const [showFilters, setShowFilters] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [showAllCategories, setShowAllCategories] = useState(false);

    useEffect(() => {
        const loadJobs = async () => {
            try {
                const keywords = searchParams.get("keywords");
                const location = searchParams.get("location");
                const category = searchParams.get("category");

                if (keywords || location) {
                    // Use search endpoint if search params exist
                    const data = await api.searchJobs({
                        keywords: keywords || undefined,
                        location: location || undefined,
                    });
                    setJobs(data);
                } else if (category) {
                    // Use listJobs with category filter
                    const data = await api.listJobs({
                        category: category,
                    });
                    setJobs(data);
                } else {
                    // Otherwise list all jobs
                    const data = await api.listJobs();
                    setJobs(data);
                }
            } catch (error) {
                console.error("Failed to load jobs:", error);
                setJobs([]);
            } finally {
                setLoading(false);
            }
        };

        loadJobs();
    }, [searchParams]);

    const filteredJobs = selectedCategories.length > 0
        ? jobs.filter((job) => selectedCategories.includes(job.category.toLowerCase()))
        : jobs;

    const sortedJobs = [...filteredJobs].sort((a, b) => {
        if (sortBy === "budget") return b.budget - a.budget;
        if (sortBy === "applicants") return b.applicants - a.applicants;
        return 0;
    });

    // Pagination logic
    const totalPages = Math.ceil(sortedJobs.length / JOBS_PER_PAGE);
    const startIndex = (currentPage - 1) * JOBS_PER_PAGE;
    const paginatedJobs = sortedJobs.slice(startIndex, startIndex + JOBS_PER_PAGE);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [selectedCategories, sortBy]);

    const handleCategoryChange = (categoryId: string) => {
        setSelectedCategories((prev) =>
            prev.includes(categoryId)
                ? prev.filter((id) => id !== categoryId)
                : [...prev, categoryId]
        );
    };

    const allCategories = getCategoriesWithTranslations(t);
    const displayedCategories = showAllCategories
        ? allCategories
        : allCategories.slice(0, 5);

    return (
        <>
            {/* Header */}
            <div className="border-b border-gray-200">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('jobs.title')}</h1>
                            <p className="text-gray-600">{sortedJobs.length} {t('jobs.opportunitiesAvailable')}</p>
                        </div>
                        {user && (
                            <Link href="/my-jobs">
                                <Button variant="outline" className="flex items-center gap-2">
                                    <Briefcase size={18} />
                                    <span className="hidden sm:inline">{t('myJobs.title')}</span>
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid lg:grid-cols-4 gap-8">
                    {/* Sidebar Filters */}
                    <aside className="lg:col-span-1">
                        <div className="sticky top-20">
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className="lg:hidden flex items-center gap-2 w-full py-3 px-4 bg-gray-50 rounded-lg mb-4"
                            >
                                <Sliders size={20} />
                                {t('jobs.filters')}
                            </button>

                            <div className={`${showFilters ? "block" : "hidden"} lg:block space-y-6`}>
                                {/* Category Filter */}
                                <div>
                                    <h3 className="font-bold text-gray-900 mb-4">{t('jobs.category')}</h3>
                                    <div className="space-y-2">
                                        {displayedCategories.map((cat) => (
                                            <label key={cat.id} className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    name="category"
                                                    value={cat.id}
                                                    checked={selectedCategories.includes(cat.id)}
                                                    onChange={() => handleCategoryChange(cat.id)}
                                                    className="w-4 h-4 rounded"
                                                />
                                                <span className="text-gray-700 text-sm">{cat.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                    {allCategories.length > 5 && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full mt-3 text-xs"
                                            onClick={() => setShowAllCategories(!showAllCategories)}
                                        >
                                            {showAllCategories ? "Show Less" : "Show More"}
                                        </Button>
                                    )}
                                    {selectedCategories.length > 0 && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full mt-2 text-xs"
                                            onClick={() => setSelectedCategories([])}
                                        >
                                            Clear Categories
                                        </Button>
                                    )}
                                </div>

                                {/* Budget Filter */}
                                <div>
                                    <h3 className="font-bold text-gray-900 mb-4">{t('jobs.budgetType')}</h3>
                                    <div className="space-y-2">
                                        {["Fixed Price", "Hourly", "Both"].map((type) => (
                                            <label key={type} className="flex items-center gap-2 cursor-pointer">
                                                <input type="checkbox" className="w-4 h-4" />
                                                <span className="text-gray-700">{type}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <Button
                                    className="w-full"
                                    variant="outline"
                                    onClick={() => setSelectedCategories([])}
                                >
                                    {t('jobs.clearFilters')}
                                </Button>
                            </div>
                        </div>
                    </aside>

                    {/* Main Content */}
                    <div className="lg:col-span-3">
                        {/* Sort Options */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <span className="text-gray-600">{t('jobs.sortBy')}</span>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as "newest" | "budget" | "applicants")}
                                    className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                                >
                                    <option value="newest">{t('jobs.sort.newest')}</option>
                                    <option value="budget">{t('jobs.sort.budget')}</option>
                                    <option value="applicants">{t('jobs.sort.applicants')}</option>
                                </select>
                            </div>
                        </div>

                        {/* Jobs Grid */}
                        {loading ? (
                            <div className="text-center py-12">
                                <p className="text-gray-600">{t('jobs.title')}...</p>
                            </div>
                        ) : paginatedJobs.length > 0 ? (
                            <>
                                <div className="grid gap-6">
                                    {paginatedJobs.map((job) => (
                                        <JobCard key={job.id} job={job} />
                                    ))}
                                </div>

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                                        {/* Mobile-friendly page info */}
                                        <div className="text-center text-sm text-gray-600">
                                            {t('jobs.opportunitiesAvailable')}: {sortedJobs.length} | {t('jobs.title')}: {currentPage} / {totalPages}
                                        </div>

                                        {/* Pagination controls */}
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                                disabled={currentPage === 1}
                                                className="flex items-center gap-1"
                                            >
                                                <ChevronLeft size={16} />
                                                <span className="hidden sm:inline">Previous</span>
                                            </Button>

                                            {/* Page numbers */}
                                            <div className="flex items-center gap-1">
                                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                                                    // Show only relevant pages on mobile
                                                    const showPage = totalPages <= 5 ||
                                                        page === 1 ||
                                                        page === totalPages ||
                                                        Math.abs(page - currentPage) <= 1;

                                                    if (!showPage && page !== 2 && page !== totalPages - 1) return null;

                                                    return (
                                                        <Button
                                                            key={page}
                                                            variant={page === currentPage ? "default" : "outline"}
                                                            size="sm"
                                                            onClick={() => setCurrentPage(page)}
                                                            className="w-8 h-8 p-0 text-xs sm:text-sm"
                                                        >
                                                            {page}
                                                        </Button>
                                                    );
                                                })}
                                            </div>

                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                                disabled={currentPage === totalPages}
                                                className="flex items-center gap-1"
                                            >
                                                <span className="hidden sm:inline">Next</span>
                                                <ChevronRight size={16} />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-center py-12">
                                <p className="text-gray-600 mb-4">{t('jobs.noJobs')}</p>
                                <Button onClick={() => setSelectedCategories([])}>{t('jobs.clearFilters')}</Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
