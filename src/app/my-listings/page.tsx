"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/lib/i18n";
import { getCategoryName } from "@/lib/category-utils";
import type { ListingAvailability, WorkerListing } from "@/api/types";

const AVAILABILITY_STYLES: Record<ListingAvailability, string> = {
  AVAILABLE: "bg-green-50 text-green-700",
  BUSY: "bg-amber-50 text-amber-700",
  PAUSED: "bg-muted text-ink-subtle",
};

const AVAILABILITY_LABEL_KEYS: Record<ListingAvailability, string> = {
  AVAILABLE: "workers.availableNow",
  BUSY: "workers.busy",
  PAUSED: "workers.paused",
};

const SET_AVAILABILITY_KEYS: Record<ListingAvailability, string> = {
  AVAILABLE: "myListings.setAvailable",
  BUSY: "myListings.setBusy",
  PAUSED: "myListings.setPaused",
};

export default function MyListingsPage() {
  const router = useRouter();
  const { user, firebaseToken, loading: authLoading } = useAuth();
  const { t } = useTranslation();

  const [listings, setListings] = useState<WorkerListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.id || !firebaseToken) {
      router.push("/signin");
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.getMyListings(user.id, firebaseToken);
        setListings(data);
      } catch (err) {
        console.error("Failed to load listings:", err);
        setError(t("myListings.errorLoad"));
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [user?.id, firebaseToken, authLoading, router, t]);

  async function handleAvailabilityChange(listingId: string, availability: ListingAvailability) {
    if (!firebaseToken) return;
    setUpdatingId(listingId);
    try {
      const updated = await api.updateListing(listingId, { availability }, firebaseToken);
      setListings((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    } catch (err) {
      console.error("Failed to update availability:", err);
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDelete(listingId: string) {
    if (!firebaseToken) return;
    const confirmed = window.confirm(t("myListings.confirmDelete"));
    if (!confirmed) return;

    try {
      await api.deleteListing(listingId, firebaseToken);
      setListings((prev) => prev.filter((l) => l.id !== listingId));
    } catch (err) {
      console.error("Failed to delete listing:", err);
      alert(t("myListings.deleteError"));
    }
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="surface-card overflow-hidden p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-brand">
                <ArrowLeft className="h-4 w-4" />
                {t("nav.backToDashboard")}
              </Link>
              <h1 className="mt-4 section-heading">{t("myListings.title")}</h1>
              <p className="mt-3 text-sm leading-6 text-ink-muted">
                {t("myListings.subtitle")}
              </p>
            </div>
            <Link href="/post-service" className="primary-cta">
              <Plus className="mr-2 h-4 w-4" />
              {t("myListings.postService")}
            </Link>
          </div>
        </section>

        <div className="mt-8">
          {loading ? (
            <div className="surface-panel p-10 text-center text-ink-muted">{t("myListings.loading")}</div>
          ) : error ? (
            <div className="surface-panel p-10 text-center">
              <p className="text-sm font-semibold text-red-600">{error}</p>
            </div>
          ) : listings.length === 0 ? (
            <div className="surface-panel p-10 text-center">
              <p className="text-base font-semibold text-ink">{t("myListings.emptyTitle")}</p>
              <p className="mt-2 text-sm text-ink-muted">{t("myListings.emptyDesc")}</p>
              <Link href="/post-service" className="primary-cta mt-5 inline-flex">
                {t("myListings.postFirst")}
              </Link>
            </div>
          ) : (
            <div className="grid gap-4">
              {listings.map((listing) => (
                <div key={listing.id} className="surface-card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
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
                        <span className="inline-flex items-center rounded-full bg-brand-soft px-3 py-1 text-xs font-bold uppercase text-brand">
                          {getCategoryName(listing.category, t)}
                        </span>
                        <h2 className="mt-2 text-lg font-bold text-ink">{listing.title}</h2>
                        <p className="mt-1 text-sm text-ink-muted">
                          {listing.rateCurrency} {listing.rate.toLocaleString()}
                          {listing.pricingModel === "HOURLY" ? t("jobDetail.hourly") : ` ${t("jobDetail.fixed")}`}
                          {listing.serviceRadiusKm ? ` · ${listing.serviceRadiusKm}km ${t("workers.radius")}` : ""}
                        </p>
                      </div>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${AVAILABILITY_STYLES[listing.availability]}`}>
                      {t(AVAILABILITY_LABEL_KEYS[listing.availability])}
                    </span>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-ink-muted line-clamp-2">{listing.description}</p>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <Link href={`/workers/${listing.workerId}`} className="secondary-cta">
                      {t("myListings.viewPublicProfile")}
                    </Link>
                    {(["AVAILABLE", "BUSY", "PAUSED"] as ListingAvailability[])
                      .filter((option) => option !== listing.availability)
                      .map((option) => (
                        <button
                          key={option}
                          onClick={() => handleAvailabilityChange(listing.id, option)}
                          disabled={updatingId === listing.id}
                          className="secondary-cta px-4 py-2 text-xs"
                        >
                          {t(SET_AVAILABILITY_KEYS[option])}
                        </button>
                      ))}
                    <button
                      onClick={() => handleDelete(listing.id)}
                      className="secondary-cta px-4 py-2 text-xs text-red-600"
                    >
                      {t("myListings.remove")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
