"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, List, Map as MapIcon, SlidersHorizontal } from "lucide-react";
import { NearbyWorkersMap } from "@/components/maps/NearbyWorkersMap";
import { NearbyWorkerCard } from "@/components/NearbyWorkerCard";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/lib/i18n";
import type { Job, NearbyWorkerListing } from "@/api/types";

const RADIUS_OPTIONS_KM = [1, 5, 10, 25, 50];
const DEFAULT_RADIUS_KM = 5;

function RadiusChips({ radiusKm, onChange }: { radiusKm: number; onChange: (km: number) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {RADIUS_OPTIONS_KM.map((km) => (
        <button
          key={km}
          type="button"
          onClick={() => onChange(km)}
          className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
            km === radiusKm ? "bg-brand text-white" : "bg-white text-ink-muted hover:text-ink"
          }`}
        >
          {km}km
        </button>
      ))}
    </div>
  );
}

export default function NearbyProsPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params?.id as string | undefined;
  const { firebaseToken } = useAuth();
  const { t } = useTranslation();

  const [job, setJob] = useState<Job | undefined>();
  const [jobLoading, setJobLoading] = useState(true);
  const [listings, setListings] = useState<NearbyWorkerListing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);
  const [mobileView, setMobileView] = useState<"map" | "list">("map");
  const [activeListingId, setActiveListingId] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    if (!jobId) return;
    api
      .getJob(jobId)
      .then((data) => {
        if (isActive) setJob(data);
      })
      .catch((error) => console.error("Failed to load job", error))
      .finally(() => {
        if (isActive) setJobLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, [jobId]);

  useEffect(() => {
    let isActive = true;

    const load = async () => {
      if (!jobId || !firebaseToken) return;
      setListingsLoading(true);
      try {
        const data = await api.getNearbyWorkers(jobId, { radiusKm }, firebaseToken);
        if (isActive) setListings(data);
      } catch (error) {
        console.error("Failed to load nearby workers", error);
      } finally {
        if (isActive) setListingsLoading(false);
      }
    };

    load();

    return () => {
      isActive = false;
    };
  }, [jobId, radiusKm, firebaseToken]);

  const handleInvite = useCallback(
    (listing: NearbyWorkerListing) => {
      if (!job) return;
      const query = new URLSearchParams({
        userId: listing.workerId,
        jobId: job.id,
        jobTitle: job.title,
        userName: listing.worker?.name || "",
      });
      router.push(`/chat?${query.toString()}`);
    },
    [job, router]
  );

  const center = job?.latitude != null && job?.longitude != null ? { lat: job.latitude, lng: job.longitude } : null;

  if (jobLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#eef1f4]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#eef1f4] px-4 text-center">
        <p className="text-lg font-bold text-ink">{t('jobDetail.jobNotFound')}</p>
        <button type="button" onClick={() => router.push("/my-jobs")} className="primary-cta">
          {t('workers.backToMyJobs')}
        </button>
      </div>
    );
  }

  if (!center) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#eef1f4] px-6 text-center">
        <p className="text-lg font-bold text-ink">{t('nearbyPros.locationErrorTitle')}</p>
        <p className="max-w-sm text-sm text-ink-muted">
          {t('nearbyPros.locationErrorDesc')}
        </p>
        <button type="button" onClick={() => router.push(`/jobs/${job.id}`)} className="primary-cta">
          {t('nearbyPros.backToJob')}
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen w-full overflow-hidden bg-[#eef1f4] lg:h-auto lg:overflow-visible">
      {/* Mobile: full-bleed map + floating chrome + bottom sheet */}
      <div className="relative h-screen lg:hidden">
        <div className={mobileView === "map" ? "absolute inset-0" : "hidden"}>
          <NearbyWorkersMap
            center={center}
            radiusKm={radiusKm}
            listings={listings}
            activeListingId={activeListingId}
            onMarkerClick={setActiveListingId}
            onMarkerHover={setActiveListingId}
          />
        </div>

        <div className="absolute inset-x-0 top-0 z-10 flex flex-col gap-2 p-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push(`/jobs/${job.id}`)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-soft"
            >
              <ArrowLeft className="h-5 w-5 text-ink" />
            </button>
            <div className="flex-1 rounded-full bg-white/95 px-4 py-2 text-sm font-bold text-ink shadow-soft backdrop-blur">
              {t('nearbyPros.titleFor')} {job.title}
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="rounded-full bg-white/95 p-1 shadow-soft backdrop-blur">
              <RadiusChips radiusKm={radiusKm} onChange={setRadiusKm} />
            </div>
            <div className="flex shrink-0 rounded-full bg-white/95 p-1 shadow-soft backdrop-blur">
              <button
                type="button"
                onClick={() => setMobileView("map")}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
                  mobileView === "map" ? "bg-brand text-white" : "text-ink-muted"
                }`}
              >
                <MapIcon className="h-3.5 w-3.5" /> {t('common.map')}
              </button>
              <button
                type="button"
                onClick={() => setMobileView("list")}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
                  mobileView === "list" ? "bg-brand text-white" : "text-ink-muted"
                }`}
              >
                <List className="h-3.5 w-3.5" /> {t('common.list')}
              </button>
            </div>
          </div>
        </div>

        {mobileView === "map" ? (
          <div className="absolute inset-x-0 bottom-0 z-10 max-h-[42vh] overflow-hidden rounded-t-3xl bg-[#eef1f4] pb-4 pt-3 shadow-[0_-12px_30px_rgba(15,23,42,0.12)]">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-outline" />
            {listingsLoading ? (
              <p className="px-4 text-sm text-ink-muted">{t('nearbyPros.finding')}</p>
            ) : listings.length === 0 ? (
              <p className="px-4 text-sm text-ink-muted">{t('nearbyPros.noneFoundWithin')} {radiusKm}km. {t('nearbyPros.tryWiderRadius')}</p>
            ) : (
              <div className="flex gap-3 overflow-x-auto px-4 pb-1">
                {listings.slice(0, 5).map((listing) => (
                  <div key={listing.id} className="w-[280px] shrink-0">
                    <NearbyWorkerCard
                      listing={listing}
                      isActive={listing.id === activeListingId}
                      onHoverChange={setActiveListingId}
                      onInvite={handleInvite}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="absolute inset-0 z-0 overflow-y-auto px-4 pb-6 pt-28">
            {listingsLoading ? (
              <p className="text-sm text-ink-muted">{t('nearbyPros.finding')}</p>
            ) : listings.length === 0 ? (
              <p className="text-sm text-ink-muted">{t('nearbyPros.noneFoundWithin')} {radiusKm}km. {t('nearbyPros.tryWiderRadius')}</p>
            ) : (
              <div className="space-y-3">
                {listings.map((listing) => (
                  <NearbyWorkerCard
                    key={listing.id}
                    listing={listing}
                    isActive={listing.id === activeListingId}
                    onHoverChange={setActiveListingId}
                    onInvite={handleInvite}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Desktop: split list + sticky map */}
      <div className="hidden lg:block">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <button
                type="button"
                onClick={() => router.push(`/jobs/${job.id}`)}
                className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-brand"
              >
                <ArrowLeft className="h-4 w-4" /> {t('nearbyPros.backToJob')}
              </button>
              <h1 className="font-display text-2xl font-black text-ink">{t('nearbyPros.titleFor')} &ldquo;{job.title}&rdquo;</h1>
              <p className="mt-1 text-sm text-ink-muted">
                {listingsLoading
                  ? t('nearbyPros.finding')
                  : `${listings.length} ${listings.length === 1 ? t('nearbyPros.pro') : t('nearbyPros.pros')} ${t('nearbyPros.within')} ${radiusKm}km, ${t('nearbyPros.sortedByDistance')}`}
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-outline bg-white px-3 py-2">
              <SlidersHorizontal className="h-4 w-4 text-ink-muted" />
              <RadiusChips radiusKm={radiusKm} onChange={setRadiusKm} />
            </div>
          </div>

          <div className="grid grid-cols-[minmax(0,45%)_1fr] gap-6">
            <div className="max-h-[calc(100vh-220px)] space-y-3 overflow-y-auto pr-1">
              {listingsLoading ? (
                <p className="text-sm text-ink-muted">{t('nearbyPros.finding')}</p>
              ) : listings.length === 0 ? (
                <p className="text-sm text-ink-muted">{t('nearbyPros.noneFoundWithin')} {radiusKm}km. {t('nearbyPros.tryWiderRadius')}</p>
              ) : (
                listings.map((listing) => (
                  <NearbyWorkerCard
                    key={listing.id}
                    listing={listing}
                    isActive={listing.id === activeListingId}
                    onHoverChange={setActiveListingId}
                    onInvite={handleInvite}
                  />
                ))
              )}
            </div>

            <div className="sticky top-8 h-[calc(100vh-220px)] overflow-hidden rounded-3xl shadow-soft">
              <NearbyWorkersMap
                center={center}
                radiusKm={radiusKm}
                listings={listings}
                activeListingId={activeListingId}
                onMarkerClick={setActiveListingId}
                onMarkerHover={setActiveListingId}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
