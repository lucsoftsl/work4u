import type { Job } from "@/api/types";
import type { JobCardJob } from "@/components/JobCard";
import type { PublicJob } from "./public-api";

/** List card seed from the public API. No applicant count or poster trust data: those arrive with the client refresh. */
export function toJobCard(j: PublicJob): JobCardJob {
  return {
    id: j.id, canonicalPath: j.canonicalPath, title: j.title, category: j.category,
    budget: j.budget, budgetType: j.budgetType, budgetCurrency: j.budgetCurrency,
    location: j.location, remote: j.remote, dateTimeCreated: j.createdAt, lifecycleStatus: "OPEN",
    employerName: j.employerName ?? undefined,
  };
}

/** A `Job` built from public data so the detail page can render on the server. `isSeed` marks fields we do not know yet. */
export type JobSeed = Job & { isSeed?: true };

export function toJobSeed(j: PublicJob): JobSeed {
  return {
    id: j.id, title: j.title, category: j.category, description: j.description ?? j.summary ?? "",
    budget: j.budget, budgetType: j.budgetType, budgetCurrency: j.budgetCurrency, location: j.location, remote: j.remote,
    applicants: 0, createdByUserId: "", status: "VERIFIED", boosted: false, boostedAt: null, expiresAt: j.validThrough,
    lifecycleStatus: "OPEN", hiredWorkerId: null, completedAt: null, workStage: "HIRED", enRouteAt: null, startedAt: null, awaitingReviewAt: null,
    paymentMethod: null, paymentMarkedPaidAt: null, paymentConfirmedAt: null, moderationStatus: "NONE", moderationNote: null, scheduledDeletionAt: null,
    dateTimeCreated: j.createdAt, dateTimeUpdated: j.updatedAt,
    createdBy: { userId: "", name: j.employerName ?? "", image: null, rating: 0, reviews: 0 },
    isSeed: true,
  };
}

import type { ListingPricingModel, WorkerListing } from "@/api/types";
import type { PublicWorker } from "./public-api";

/** Public worker → the listing shape the profile page renders. No phone, no location, no coordinates: the public API has none. */
export function toWorkerSeedListings(w: PublicWorker): WorkerListing[] {
  return (w.listings ?? []).map((l) => ({
    id: l.id, workerId: w.id, title: l.title, category: l.category, description: l.description,
    pricingModel: (l.pricingModel === "FIXED" ? "FIXED" : "HOURLY") as ListingPricingModel,
    rate: l.rate ?? 0, rateCurrency: l.rateCurrency ?? "",
    serviceRadiusKm: l.serviceRadiusKm, location: null, latitude: null, longitude: null,
    availability: l.availability === "BUSY" || l.availability === "PAUSED" ? l.availability : "AVAILABLE",
    status: "ACTIVE", imageUrl: l.imageUrl, dateTimeCreated: l.updatedAt, dateTimeUpdated: l.updatedAt,
    worker: { userId: w.id, name: w.name, image: w.photoUrl, phoneNumber: null, rating: w.rating ?? 0, reviews: w.reviewCount },
  }));
}
