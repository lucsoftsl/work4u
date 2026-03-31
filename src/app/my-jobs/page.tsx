"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import Footer from "@/components/Footer";
import { JobCard } from "@/components/JobCard";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/lib/i18n";
import type { Job } from "@/api/types";

export default function MyJobsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, firebaseToken } = useAuth();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id || !firebaseToken) {
      router.push('/signin');
      return;
    }

    const loadMyJobs = async () => {
      try {
        setLoading(true);
        setError(null);
        setJobs(await api.getMyJobs(user.id, firebaseToken));
      } catch (err) {
        console.error('Failed to load jobs:', err);
        setError('Failed to load your jobs. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    void loadMyJobs();
  }, [user?.id, firebaseToken, router]);

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="surface-card overflow-hidden p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-brand">
                <ArrowLeft className="h-4 w-4" />
                Back to dashboard
              </Link>
              <h1 className="mt-4 section-heading">{t('myJobs.title')}</h1>
              <p className="mt-3 text-sm leading-6 text-ink-muted">
                Review the jobs you have published and jump back into any active posting.
              </p>
            </div>
            <Link href="/post-job" className="primary-cta">
              <Plus className="mr-2 h-4 w-4" />
              {t('myJobs.postNew')}
            </Link>
          </div>
        </section>

        <div className="mt-8">
          {loading ? (
            <div className="surface-panel p-10 text-center text-ink-muted">{t('myJobs.loading')}</div>
          ) : error ? (
            <div className="surface-panel p-10 text-center">
              <p className="text-sm font-semibold text-red-600">{error}</p>
              <button onClick={() => window.location.reload()} className="primary-cta mt-4">
                {t('myJobs.tryAgain')}
              </button>
            </div>
          ) : jobs.length === 0 ? (
            <div className="surface-panel p-10 text-center">
              <p className="text-base font-semibold text-ink">{t('myJobs.noJobs')}</p>
              <p className="mt-2 text-sm text-ink-muted">Create your first posting to start receiving applicants.</p>
              <Link href="/post-job" className="primary-cta mt-5 inline-flex">
                {t('myJobs.postFirst')}
              </Link>
            </div>
          ) : (
            <div>
              <p className="mb-5 text-sm text-ink-muted">
                {t('myJobs.activeJobs')} <span className="font-bold text-ink">{jobs.length}</span>
              </p>
              <div className="grid gap-5">
                {jobs.map((job) => (
                  <div key={job.id} className="space-y-3">
                    <JobCard job={job} />
                    <div className="flex flex-wrap gap-3">
                      <Link href={`/jobs/${job.id}`} className="secondary-cta">
                        {t('myJobs.view')}
                      </Link>
                      <Link href={`/jobs/${job.id}/edit`} className="secondary-cta">
                        {t('myJobs.edit')}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
