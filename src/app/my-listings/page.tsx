"use client";
import { currentPath, signInPath } from "@/lib/auth-redirect";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Wrench } from "lucide-react";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/http";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/lib/i18n";
import { WorkerListingCard } from "@/components/WorkerListingCard";
import { buttonClasses } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/QueryState";
import { useToast } from "@/components/ui/Toast";
import type { ListingAvailability, WorkerListing } from "@/api/types";

export default function MyListingsPage() {
  const router = useRouter();
  const { user, firebaseToken, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const toast = useToast();

  const [listings, setListings] = useState<WorkerListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<WorkerListing | null>(null);
  const [removing, setRemoving] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id || !firebaseToken) return;
    try {
      setLoading(true);
      setError(null);
      setListings(await api.getMyListings(user.id, firebaseToken));
    } catch (err) {
      console.error("Failed to load listings:", err);
      setError(t("myListings.errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [user?.id, firebaseToken, t]);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.id || !firebaseToken) {
      router.push(signInPath(currentPath()));
      return;
    }
    void load();
  }, [user?.id, firebaseToken, authLoading, router, load]);

  async function handleAvailabilityChange(listingId: string, availability: ListingAvailability) {
    if (!firebaseToken) return;
    setUpdatingId(listingId);
    setRowError(null);
    try {
      const updated = await api.updateListing(listingId, { availability }, firebaseToken);
      setListings((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    } catch (err) {
      console.error("Failed to update availability:", err);
      setRowError({ id: listingId, message: errorMessage(err, t("myListings.availabilityError")) });
    } finally {
      setUpdatingId(null);
    }
  }

  async function confirmRemoval() {
    if (!firebaseToken || !pendingRemoval) return;
    const target = pendingRemoval;
    setRemoving(true);
    try {
      await api.deleteListing(target.id, firebaseToken);
      setListings((prev) => prev.filter((l) => l.id !== target.id));
      setPendingRemoval(null);
    } catch (err) {
      console.error("Failed to delete listing:", err);
      setPendingRemoval(null);
      toast.push({ tone: "error", message: errorMessage(err, t("myListings.deleteError")) });
    } finally {
      setRemoving(false);
    }
  }

  const postServiceLink = (
    <Link href="/post-service" className={buttonClasses("primary")}>
      <Plus className="h-4 w-4" aria-hidden="true" />
      {t("myListings.postService")}
    </Link>
  );

  return (
    <div className="mx-auto w-full max-w-content px-[var(--gutter)] py-6 md:py-10">
      <Link href="/dashboard" className={buttonClasses("ghost", "sm", "-ml-3")}>
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t("nav.backToDashboard")}
      </Link>

      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-h1 text-ink">{t("myListings.title")}</h1>
          <p className="mt-2 max-w-2xl text-body text-ink-muted">{t("myListings.subtitle")}</p>
        </div>
        {listings.length > 0 ? postServiceLink : null}
      </div>

      <div className="mt-8" aria-live="polite">
        {loading ? (
          <ListSkeleton rows={3} label={t("myListings.loading")} />
        ) : error ? (
          <ErrorState message={error} onRetry={() => void load()} />
        ) : listings.length === 0 ? (
          <EmptyState
            icon={Wrench}
            title={t("myListings.emptyTitle")}
            description={t("myListings.emptyDesc")}
            action={
              <Link href="/post-service" className={buttonClasses("primary")}>
                {t("myListings.postFirst")}
              </Link>
            }
          />
        ) : (
          <ul className="space-y-3 md:space-y-4">
            {listings.map((listing) => (
              <li key={listing.id}>
                <WorkerListingCard
                  headingLevel="h2"
                  listing={listing}
                  owner={{
                    updating: updatingId === listing.id,
                    error: rowError?.id === listing.id ? rowError.message : null,
                    onAvailabilityChange: (next) => void handleAvailabilityChange(listing.id, next),
                    onRemove: () => setPendingRemoval(listing),
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={pendingRemoval !== null}
        tone="destructive"
        title={t("myListings.confirmRemoveTitle")}
        description={pendingRemoval ? `${pendingRemoval.title}. ${t("myListings.confirmDelete")}` : undefined}
        confirmLabel={t("myListings.removeService")}
        loading={removing}
        onConfirm={() => void confirmRemoval()}
        onCancel={() => setPendingRemoval(null)}
      />
    </div>
  );
}
