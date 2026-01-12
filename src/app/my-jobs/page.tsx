"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import Footer from "@/components/Footer";
import { JobCard } from "@/components/JobCard";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/lib/i18n";
import type { Job } from "@/api/types";
import { ArrowLeft, Plus } from "lucide-react";

export default function MyJobsPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const { user, firebaseToken } = useAuth();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user?.id || !firebaseToken) {
            router.push('/');
            return;
        }

        const loadMyJobs = async () => {
            try {
                setLoading(true);
                setError(null);
                const myJobs = await api.getMyJobs(user.id, firebaseToken);
                setJobs(myJobs);
            } catch (err) {
                console.error('Failed to load jobs:', err);
                setError('Failed to load your jobs. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        loadMyJobs();
    }, [user?.id, firebaseToken, router]);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="border-b border-gray-200 bg-white">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="sm" asChild>
                            <Link href="/profile" className="flex items-center gap-2">
                                <ArrowLeft size={16} />
                            </Link>
                        </Button>
                        <h1 className="text-3xl font-bold text-gray-900">{t('myJobs.title')}</h1>
                    </div>
                    <Button asChild>
                        <Link href="/post-job" className="flex items-center gap-2">
                            <Plus size={18} />
                            {t('myJobs.postNew')}
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Content */}
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
                {loading ? (
                    <div className="text-center py-12">
                        <p className="text-gray-600">{t('myJobs.loading')}</p>
                    </div>
                ) : error ? (
                    <div className="text-center py-12">
                        <p className="text-red-600 mb-4">{error}</p>
                        <Button onClick={() => window.location.reload()}>
                            {t('myJobs.tryAgain')}
                        </Button>
                    </div>
                ) : jobs.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-gray-600 mb-4">{t('myJobs.noJobs')}</p>
                        <Button asChild>
                            <Link href="/post-job">{t('myJobs.postFirst')}</Link>
                        </Button>
                    </div>
                ) : (
                    <div>
                        <p className="text-gray-600 mb-6">
                            {t('myJobs.activeJobs')} <span className="font-semibold">{jobs.length}</span> {jobs.length === 1 ? t('myJobs.jobSingular') : t('myJobs.jobPlural')}
                        </p>
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {jobs.map((job) => (
                                <div key={job.id} className="group">
                                    <JobCard job={job} />
                                    <div className="mt-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="outline" size="sm" asChild className="flex-1">
                                            <Link href={`/jobs/${job.id}`}>{t('myJobs.view')}</Link>
                                        </Button>
                                        <Button variant="outline" size="sm" asChild className="flex-1">
                                            <Link href={`/jobs/${job.id}/edit`}>{t('myJobs.edit')}</Link>
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <Footer />
        </div>
    );
}
