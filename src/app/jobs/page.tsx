"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { JobCard } from "@/components/JobCard";
import Footer from "@/components/Footer";
import { Sliders } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

const allJobs = [
  {
    id: "1",
    title: "Website Design for E-commerce Store",
    category: "Design",
    description: "Need a modern, responsive website design for our online store",
    budget: 800,
    budgetType: "FIXED" as const,
    location: "Remote",
    remote: true,
    applicants: 12,
    poster: {
      name: "Sarah Johnson",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
      rating: 4.8,
      reviews: 24,
    },
  },
  {
    id: "2",
    title: "Mobile App Development - iOS",
    category: "Development",
    description: "Build a native iOS app for our fitness tracking platform",
    budget: 5000,
    budgetType: "FIXED" as const,
    location: "Remote",
    remote: true,
    applicants: 8,
    poster: {
      name: "Tech Startup Inc",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Tech",
      rating: 4.9,
      reviews: 18,
    },
  },
  {
    id: "3",
    title: "Content Writing - Blog Posts",
    category: "Writing",
    description: "Write 10 SEO-optimized blog posts about digital marketing",
    budget: 25,
    budgetType: "HOURLY" as const,
    location: "Remote",
    remote: true,
    applicants: 24,
    poster: {
      name: "Marketing Agency",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Marketing",
      rating: 4.7,
      reviews: 31,
    },
  },
  {
    id: "4",
    title: "Logo Design - Tech Company",
    category: "Design",
    description: "Create a unique and modern logo for our software startup",
    budget: 500,
    budgetType: "FIXED" as const,
    location: "Remote",
    remote: true,
    applicants: 18,
    poster: {
      name: "Creative Director",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Creative",
      rating: 4.6,
      reviews: 15,
    },
  },
  {
    id: "5",
    title: "React Developer Needed",
    category: "Development",
    description: "Build React components for our dashboard application",
    budget: 50,
    budgetType: "HOURLY" as const,
    location: "Remote",
    remote: true,
    applicants: 31,
    poster: {
      name: "Startup Hub",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Hub",
      rating: 4.9,
      reviews: 42,
    },
  },
  {
    id: "6",
    title: "Social Media Manager",
    category: "Marketing",
    description: "Manage social media accounts and create content calendars",
    budget: 30,
    budgetType: "HOURLY" as const,
    location: "Remote",
    remote: true,
    applicants: 16,
    poster: {
      name: "Fashion Brand",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Fashion",
      rating: 4.7,
      reviews: 22,
    },
  },
];

export default function JobsPage() {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"newest" | "budget" | "applicants">("newest");
  const [showFilters, setShowFilters] = useState(false);

  const filteredJobs = selectedCategory
    ? allJobs.filter((job) => job.category.toLowerCase() === selectedCategory.toLowerCase())
    : allJobs;

  const sortedJobs = [...filteredJobs].sort((a, b) => {
    if (sortBy === "budget") return b.budget - a.budget;
    if (sortBy === "applicants") return b.applicants - a.applicants;
    return 0;
  });

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('jobs.title')}</h1>
          <p className="text-gray-600">{sortedJobs.length} {t('jobs.opportunitiesAvailable')}</p>
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
                    {["Development", "Design", "Writing", "Marketing", "Other"].map((cat) => (
                      <label key={cat} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="category"
                          value={cat}
                          checked={selectedCategory === cat}
                          onChange={(e) => setSelectedCategory(e.target.checked ? cat : null)}
                          className="w-4 h-4"
                        />
                        <span className="text-gray-700">{cat}</span>
                      </label>
                    ))}
                  </div>
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

                <Button className="w-full" variant="outline">
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
            {sortedJobs.length > 0 ? (
              <div className="grid gap-6">
                {sortedJobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-600 mb-4">{t('jobs.noJobs')}</p>
                <Button onClick={() => setSelectedCategory(null)}>{t('jobs.clearFilters')}</Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
