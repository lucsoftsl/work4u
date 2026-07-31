"use client";

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { companiesApi } from "@/lib/companies-api";
import { api } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import type { Company, RosterWorker, WorkerListing } from "@/api/types";
import { CalendarClock, Plus, Search, Star, Trash2, User, Users, X } from "lucide-react";

// ---------- shared presentational pieces ----------

function Avatar({
  worker,
  size = 40,
}: {
  worker: { name: string; photoUrl: string | null } | null;
  size?: number;
}) {
  if (!worker) {
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded-full bg-muted text-ink-subtle"
        style={{ width: size, height: size }}
      >
        <User size={size * 0.5} />
      </div>
    );
  }
  if (worker.photoUrl) {
    return (
      <Image
        src={worker.photoUrl}
        alt={worker.name}
        width={size}
        height={size}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand"
      style={{ width: size, height: size }}
    >
      {worker.name.charAt(0).toUpperCase()}
    </div>
  );
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full flex-col rounded-t-3xl bg-card shadow-soft sm:max-w-lg sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between gap-3 border-b border-outline px-5 py-4">
          <h2 className="text-lg font-bold text-ink">{title}</h2>
          <button
            onClick={onClose}
            aria-label={t('roster.close')}
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function EmptyRosterState({ onAdd }: { onAdd: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl border border-outline bg-card px-6 py-16 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-brand">
        <Users size={24} />
      </div>
      <p className="text-sm font-semibold text-ink">{t('roster.emptyTitle')}</p>
      <p className="mx-auto mt-1 max-w-[280px] text-xs text-ink-muted">
        {t('roster.emptyDesc')}
      </p>
      <Button className="mt-5" onClick={onAdd}>
        <Plus size={15} />
        {t('roster.addFirstWorker')}
      </Button>
    </div>
  );
}

function RosterCard({
  entry,
  removing,
  onRemove,
}: {
  entry: RosterWorker;
  removing: boolean;
  onRemove: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-outline bg-card p-5">
      <div className="flex items-start gap-3">
        <Avatar worker={entry.worker} size={48} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{entry.worker.name}</p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-muted">
            <Star size={13} className="fill-[#f5b33f] text-[#f5b33f]" />
            {entry.worker.rating.toFixed(1)} ({entry.worker.reviews} {t('jobDetail.reviews')})
          </p>
        </div>
      </div>

      {entry.note && <p className="rounded-xl bg-muted px-3 py-2 text-xs italic text-ink-subtle">{entry.note}</p>}

      <div className="mt-auto flex gap-2">
        <Button asChild variant="outline" size="sm" className="flex-1">
          <Link href="/business/schedule">
            <CalendarClock size={14} />
            {t('roster.schedule')}
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          disabled={removing}
          className="text-red-600 hover:bg-red-50"
        >
          <Trash2 size={14} />
          {removing ? t('roster.removing') : t('roster.remove')}
        </Button>
      </div>
    </div>
  );
}

// ---------- add worker modal ----------

function AddWorkerModal({
  companyId,
  token,
  existingWorkerIds,
  onClose,
  onAdded,
}: {
  companyId: string;
  token: string;
  existingWorkerIds: Set<string>;
  onClose: () => void;
  onAdded: (worker: RosterWorker) => void;
}) {
  const { t } = useTranslation();
  const [keywords, setKeywords] = useState("");
  const [results, setResults] = useState<WorkerListing[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [addingWorkerId, setAddingWorkerId] = useState<string | null>(null);
  const [addedWorkerIds, setAddedWorkerIds] = useState<Set<string>>(new Set());

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    const trimmed = keywords.trim();
    if (!trimmed) return;
    setSearching(true);
    setSearchError(null);
    setHasSearched(true);
    try {
      const data = await api.searchListings({ keywords: trimmed });
      setResults(data);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : t('roster.searchError'));
    } finally {
      setSearching(false);
    }
  }

  async function handleAdd(listing: WorkerListing) {
    setAddingWorkerId(listing.workerId);
    try {
      const created = await companiesApi.addRosterWorker(companyId, { workerId: listing.workerId }, token);
      setAddedWorkerIds((prev) => new Set(prev).add(listing.workerId));
      onAdded(created);
    } catch (err) {
      alert(err instanceof Error ? err.message : t('roster.addToRosterError'));
    } finally {
      setAddingWorkerId(null);
    }
  }

  return (
    <ModalShell title={t('roster.addModalTitle')} onClose={onClose}>
      <form onSubmit={handleSearch} className="mb-4 flex gap-2">
        <input
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          placeholder={t('roster.searchPlaceholder')}
          className="field-shell w-full"
        />
        <Button type="submit" disabled={searching || !keywords.trim()} aria-label={t('roster.searchAria')}>
          <Search size={15} />
        </Button>
      </form>

      {searching ? (
        <div className="space-y-2">
          <div className="h-16 animate-pulse rounded-2xl bg-muted" />
          <div className="h-16 animate-pulse rounded-2xl bg-muted" />
        </div>
      ) : searchError ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{searchError}</p>
      ) : !hasSearched ? (
        <p className="py-8 text-center text-xs text-ink-subtle">
          {t('roster.searchHint')}
        </p>
      ) : results.length === 0 ? (
        <p className="py-8 text-center text-xs text-ink-subtle">{t('roster.noResultsFor')} &quot;{keywords}&quot;.</p>
      ) : (
        <div className="space-y-2">
          {results.map((listing) => {
            const workerId = listing.workerId;
            const alreadyOnRoster = existingWorkerIds.has(workerId) || addedWorkerIds.has(workerId);
            return (
              <div key={listing.id} className="flex items-center gap-3 rounded-2xl bg-card p-3">
                <Avatar
                  worker={listing.worker ? { name: listing.worker.name, photoUrl: listing.worker.image } : null}
                  size={40}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{listing.worker?.name ?? listing.title}</p>
                  {listing.worker ? (
                    <p className="flex items-center gap-1 truncate text-xs text-ink-muted">
                      <Star size={12} className="shrink-0 fill-[#f5b33f] text-[#f5b33f]" />
                      {listing.worker.rating.toFixed(1)} ({listing.worker.reviews}) · {listing.category}
                    </p>
                  ) : (
                    <p className="truncate text-xs text-ink-muted">{listing.category}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant={alreadyOnRoster ? "outline" : "default"}
                  disabled={alreadyOnRoster || addingWorkerId === workerId}
                  onClick={() => handleAdd(listing)}
                  className="shrink-0"
                >
                  {alreadyOnRoster ? t('roster.added') : addingWorkerId === workerId ? t('roster.adding') : t('roster.add')}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </ModalShell>
  );
}

// ---------- page ----------

export default function BusinessRosterPage() {
  const router = useRouter();
  const { isAuthenticated, firebaseToken, loading: authLoading } = useAuth();
  const { t } = useTranslation();

  const [company, setCompany] = useState<Company | null>(null);
  const [companyLoading, setCompanyLoading] = useState(true);
  const [companyError, setCompanyError] = useState<string | null>(null);

  const [roster, setRoster] = useState<RosterWorker[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push("/signin?redirect=/business/roster");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (authLoading || !isAuthenticated || !firebaseToken) return;
    let cancelled = false;
    setCompanyLoading(true);
    companiesApi
      .getMyCompany(firebaseToken)
      .then((data) => {
        if (cancelled) return;
        if (!data) {
          router.push("/business/dashboard");
          return;
        }
        setCompany(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setCompanyError(err instanceof Error ? err.message : t('roster.loadCompanyError'));
      })
      .finally(() => {
        if (!cancelled) setCompanyLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, firebaseToken, router, t]);

  const loadRoster = useCallback(async (companyId: string, token: string) => {
    setRosterLoading(true);
    setRosterError(null);
    try {
      const data = await companiesApi.listRoster(companyId, token);
      setRoster(data);
    } catch (err) {
      setRosterError(err instanceof Error ? err.message : t('roster.loadRosterError'));
    } finally {
      setRosterLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!company || !firebaseToken) return;
    void loadRoster(company.id, firebaseToken);
  }, [company, firebaseToken, loadRoster]);

  async function handleRemove(entry: RosterWorker) {
    if (!company || !firebaseToken) return;
    if (!window.confirm(`${t('roster.confirmRemovePrefix')} ${entry.worker.name} ${t('roster.confirmRemoveSuffix')}`)) return;
    setRemovingId(entry.workerId);
    try {
      await companiesApi.removeRosterWorker(company.id, entry.workerId, firebaseToken);
      setRoster((prev) => prev.filter((r) => r.workerId !== entry.workerId));
    } catch (err) {
      alert(err instanceof Error ? err.message : t('roster.removeError'));
    } finally {
      setRemovingId(null);
    }
  }

  if (authLoading || !isAuthenticated || companyLoading || !company || !firebaseToken) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-background">
        {companyError ? (
          <p className="text-sm font-medium text-red-600">{companyError}</p>
        ) : (
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-outline"
            style={{ borderTopColor: "hsl(var(--brand))" }}
          />
        )}
      </div>
    );
  }

  const existingWorkerIds = new Set(roster.map((entry) => entry.workerId));

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-4xl px-4 py-8 sm:py-10">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-brand-soft px-4 py-1.5 text-sm font-medium text-brand">
              <Users size={14} />
              {t('roster.yourRoster')}
            </div>
            <h1 className="text-2xl font-bold text-ink sm:text-3xl">{t('roster.trustedWorkers')}</h1>
            <p className="mt-1 max-w-md text-sm text-ink-muted">
              {t('roster.pageSubtitle')}
            </p>
          </div>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus size={15} />
            {t('roster.addWorker')}
          </Button>
        </div>

        {rosterLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-40 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : rosterError ? (
          <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{rosterError}</p>
        ) : roster.length === 0 ? (
          <EmptyRosterState onAdd={() => setShowAddModal(true)} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {roster.map((entry) => (
              <RosterCard
                key={entry.id}
                entry={entry}
                removing={removingId === entry.workerId}
                onRemove={() => handleRemove(entry)}
              />
            ))}
          </div>
        )}
      </main>

      {showAddModal && (
        <AddWorkerModal
          companyId={company.id}
          token={firebaseToken}
          existingWorkerIds={existingWorkerIds}
          onClose={() => setShowAddModal(false)}
          onAdded={(worker) => setRoster((prev) => [...prev, worker])}
        />
      )}
    </div>
  );
}
