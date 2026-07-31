"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, MapPin, MessageCircle, Star } from "lucide-react";
import { ReviewsList } from "@/components/ReviewsList";
import { ReportButton } from "@/components/ReportButton";
import { api } from "@/lib/api";
import { reviewsApi } from "@/lib/reviews-api";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/lib/i18n";
import { getCategoryName } from "@/lib/category-utils";
import type { Review, WorkerListing } from "@/api/types";

export default function WorkerProfilePage() {
  const params = useParams();
  const { user, firebaseToken } = useAuth();
  const { t } = useTranslation();
  const workerId = params?.id as string | undefined;

  const [listings, setListings] = useState<WorkerListing[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workerId) return;
    let isActive = true;

    const load = async () => {
      try {
        setLoading(true);
        const [listingsData, reviewsData] = await Promise.all([
          api.listListings({ workerId }),
          reviewsApi.listReviews({ userId: workerId }).catch(() => []),
        ]);
        if (!isActive) return;
        setListings(listingsData);
        setReviews(reviewsData);
      } catch (error) {
        console.error("Failed to load worker profile:", error);
      } finally {
        if (isActive) setLoading(false);
      }
    };

    void load();

    return () => {
      isActive = false;
    };
  }, [workerId]);

  const worker = listings[0]?.worker;
  const avgRating = worker?.rating ?? 0;
  const reviewCount = worker?.reviews ?? reviews.length;

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="surface-panel h-64 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!worker) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="surface-card p-8 text-center space-y-4 max-w-md w-full">
          <p className="text-2xl font-semibold text-ink">{t('workers.profileNotFound')}</p>
          <p className="text-ink-muted">{t('workers.noServicesYet')}</p>
          <Link href="/workers" className="primary-cta inline-flex">{t('workers.browseServices')}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/workers" className="inline-flex items-center gap-2 text-sm font-semibold text-brand">
          <ArrowLeft className="h-4 w-4" />
          {t('workers.backToServices')}
        </Link>

        <section className="surface-card mt-6 p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              {worker.image ? (
                <Image src={worker.image} alt={worker.name} width={72} height={72} className="h-18 w-18 rounded-full object-cover" />
              ) : (
                <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-brand-soft text-2xl font-black text-brand">
                  {worker.name.charAt(0)}
                </div>
              )}
              <div>
                <h1 className="section-heading">{worker.name}</h1>
                <p className="mt-1 inline-flex items-center gap-1 text-sm text-ink-muted">
                  <Star className="h-4 w-4 fill-[#f5b33f] text-[#f5b33f]" />
                  {avgRating.toFixed(1)} ({reviewCount} {t('jobDetail.reviews')})
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              {worker.phoneNumber && (
                <a
                  href={buildWhatsAppUrl(worker.phoneNumber, `Hi ${worker.name}, I found your profile on work4u`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="primary-cta"
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  {t('workers.chatOnWhatsApp')}
                </a>
              )}
              {user?.id && user.id !== worker.userId && (
                <ReportButton reportedUserId={worker.userId} reportedUserName={worker.name} firebaseToken={firebaseToken} />
              )}
            </div>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-sm font-black uppercase tracking-[0.18em] text-ink-subtle">{t('workers.servicesOffered')}</h2>
          <div className="mt-4 grid gap-5">
            {listings.map((listing) => (
              <div key={listing.id} className="surface-panel p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    {listing.imageUrl && (
                      <Image
                        src={listing.imageUrl}
                        alt={listing.title}
                        width={64}
                        height={64}
                        className="h-16 w-16 shrink-0 rounded-2xl object-cover"
                      />
                    )}
                    <div>
                      <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-brand">
                        {getCategoryName(listing.category, t)}
                      </span>
                      <h3 className="mt-3 text-lg font-bold text-ink">{listing.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-ink-muted">{listing.description}</p>
                      {(listing.location || listing.serviceRadiusKm) && (
                        <p className="mt-3 inline-flex items-center gap-2 text-sm text-ink-muted">
                          <MapPin className="h-4 w-4" />
                          {listing.location || t('jobs.flexibleLocation')}
                          {listing.serviceRadiusKm ? ` · ${listing.serviceRadiusKm}km ${t('workers.radius')}` : ""}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 rounded-[22px] bg-[#eff7fa] px-4 py-3 text-right">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink-subtle">{t('common.rate')}</p>
                    <p className="mt-1 text-lg font-black text-brand">
                      {listing.rateCurrency} {listing.rate.toLocaleString()}{listing.pricingModel === "HOURLY" ? "/hr" : ""}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-sm font-black uppercase tracking-[0.18em] text-ink-subtle">{t('common.reviews')}</h2>
          <div className="mt-4">
            <ReviewsList reviews={reviews} />
          </div>
        </section>
      </div>

    </div>
  );
}
