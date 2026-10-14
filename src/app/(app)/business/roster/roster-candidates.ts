import type { WorkerListing } from "@/api/types";

export interface RosterCandidate {
    workerId: string;
    /** The worker's first matching listing; carries the name, photo and rating. */
    listing: WorkerListing;
    /** Distinct categories across all of the worker's matching listings. */
    categories: string[];
}

/** Search returns listings, so a worker with several listings would appear several times; collapse to one row per worker. */
export function groupListingsByWorker(listings: readonly WorkerListing[]): RosterCandidate[] {
    const byWorker = new Map<string, RosterCandidate>();
    for (const listing of listings) {
        const existing = byWorker.get(listing.workerId);
        if (!existing) {
            byWorker.set(listing.workerId, { workerId: listing.workerId, listing, categories: [listing.category] });
        } else if (!existing.categories.includes(listing.category)) {
            byWorker.set(listing.workerId, { ...existing, categories: [...existing.categories, listing.category] });
        }
    }
    return [...byWorker.values()];
}
