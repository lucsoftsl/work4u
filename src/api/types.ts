export type JobBudgetType = "FIXED" | "HOURLY";
export type JobStatus = "VERIFIED" | "DELETED" | "DEFAULT";

export type JobLifecycleStatus = "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "DISPUTED";
export type JobPaymentMethod = "CASH" | "BANK_TRANSFER";
export type JobWorkStage = "HIRED" | "EN_ROUTE" | "STARTED" | "AWAITING_REVIEW";
export type JobModerationStatus = "NONE" | "FLAGGED" | "VIOLATION";

export type Job = {
  id: string;
  title: string;
  category: string;
  description: string;
  budget: number;
  budgetType: JobBudgetType;
  budgetCurrency: string;
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  remote: boolean;
  applicants: number;
  createdByUserId: string;
  status: JobStatus;
  boosted: boolean;
  boostedAt: string | null;
  expiresAt: string | null;
  lifecycleStatus: JobLifecycleStatus;
  hiredWorkerId: string | null;
  completedAt: string | null;
  workStage: JobWorkStage;
  enRouteAt: string | null;
  startedAt: string | null;
  awaitingReviewAt: string | null;
  paymentMethod: JobPaymentMethod | null;
  paymentMarkedPaidAt: string | null;
  paymentConfirmedAt: string | null;
  moderationStatus: JobModerationStatus;
  moderationNote: string | null;
  scheduledDeletionAt: string | null;
  dateTimeCreated: string;
  dateTimeUpdated: string;
  createdBy: {
    userId: string;
    name: string;
    image?: string | null;
    rating: number;
    reviews: number;
  };
};

export type CreateJobPayload = Omit<Job, "id" | "applicants" | "status" | "dateTimeCreated" | "dateTimeUpdated" | "createdByUserId" | "createdBy" | "lifecycleStatus" | "hiredWorkerId" | "completedAt" | "workStage" | "enRouteAt" | "startedAt" | "awaitingReviewAt" | "paymentMethod" | "paymentMarkedPaidAt" | "paymentConfirmedAt" | "moderationStatus" | "moderationNote" | "scheduledDeletionAt">;

export type UpdateJobPayload = Partial<Omit<Job, "id" | "createdByUserId" | "createdBy" | "dateTimeCreated" | "dateTimeUpdated">>;

export type ApplicationStatus = "PENDING" | "VIEWED" | "SHORTLISTED" | "REJECTED" | "ACCEPTED" | "WITHDRAWN";

export type Application = {
  id: string;
  jobId: string;
  applicantId: string;
  coverLetter: string | null;
  proposedRate: number | null;
  proposedDuration: string | null;
  status: ApplicationStatus;
  dateTimeCreated: string;
  dateTimeUpdated: string;
  applicant?: {
    userId: string;
    name: string;
    image: string | null;
    rating: number;
    reviews: number;
  };
};

export type MyApplication = {
  id: string;
  jobId: string;
  applicantId: string;
  coverLetter: string | null;
  proposedRate: number | null;
  proposedDuration: string | null;
  status: ApplicationStatus;
  dateTimeCreated: string;
  dateTimeUpdated: string;
  job: {
    id: string;
    title: string;
    category: string;
    budget: number;
    budgetType: JobBudgetType;
    budgetCurrency: string;
    lifecycleStatus: JobLifecycleStatus;
  };
};

export type CreateApplicationPayload = {
  coverLetter?: string;
  proposedRate?: number;
  proposedDuration?: string;
};

export type ListingPricingModel = "HOURLY" | "FIXED";
export type ListingAvailability = "AVAILABLE" | "BUSY" | "PAUSED";
export type ListingStatus = "ACTIVE" | "DELETED";

export type WorkerListing = {
  id: string;
  workerId: string;
  title: string;
  category: string;
  description: string;
  pricingModel: ListingPricingModel;
  rate: number;
  rateCurrency: string;
  serviceRadiusKm: number | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  availability: ListingAvailability;
  status: ListingStatus;
  imageUrl: string | null;
  dateTimeCreated: string;
  dateTimeUpdated: string;
  worker?: {
    userId: string;
    name: string;
    image: string | null;
    phoneNumber: string | null;
    rating: number;
    reviews: number;
  };
};

export type NearbyWorkerListing = WorkerListing & { distanceKm: number };

export type CreateListingPayload = {
  title: string;
  category: string;
  description: string;
  pricingModel: ListingPricingModel;
  rate: number;
  rateCurrency: string;
  serviceRadiusKm?: number | null;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  availability?: ListingAvailability;
  imageUrl?: string | null;
};

export type UpdateListingPayload = Partial<CreateListingPayload> & { status?: ListingStatus };

export type JobChecklistItem = {
  id: string;
  jobId: string;
  text: string;
  isDone: boolean;
  createdByUserId: string;
  sortOrder: number;
  dateTimeCreated: string;
  dateTimeUpdated: string;
};

export type Review = {
  id: string;
  userId: string;
  ratingCount: number;
  review: string | null;
  dateTimeCreated: string;
  dateTimeUpdated: string;
  createdByUserId: string;
  status: "VERIFIED" | "DELETED" | "DEFAULT";
  jobId: string | null;
  createdBy: {
    userId: string;
    name: string;
    image: string | null;
  };
};

export type CreateReviewPayload = {
  userId: string;
  ratingCount: number;
  review?: string;
  jobId?: string;
};

export type ReportReason =
  | "NO_SHOW"
  | "INAPPROPRIATE_BEHAVIOR"
  | "SCAM_OR_FRAUD"
  | "POOR_QUALITY_WORK"
  | "PAYMENT_DISPUTE"
  | "FAKE_LISTING"
  | "OTHER";

export type ReportStatus = "OPEN" | "REVIEWING" | "RESOLVED" | "DISMISSED";

export type Report = {
  id: string;
  reporterId: string;
  reportedUserId: string;
  jobId: string | null;
  reason: ReportReason;
  description: string | null;
  status: ReportStatus;
  resolvedByAdminId: string | null;
  resolutionNotes: string | null;
  dateTimeCreated: string;
  dateTimeUpdated: string;
  reporter?: { userId: string; name: string };
  reportedUser?: { userId: string; name: string };
};

export type CreateReportPayload = {
  reportedUserId: string;
  jobId?: string;
  reason: ReportReason;
  description?: string;
};

export type ResolveReportPayload = {
  status: "RESOLVED" | "DISMISSED";
  resolutionNotes?: string;
  revertJobLifecycleStatus?: "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
};

export type ReferralStatus = "PENDING" | "COMPLETED";

export type Referral = {
  id: string;
  referrerUserId: string;
  referredUserId: string;
  referralCode: string;
  status: ReferralStatus;
  completedAt: string | null;
  dateTimeCreated: string;
  dateTimeUpdated: string;
  referredUser: { userId: string; name: string; photoUrl: string | null };
};

export type MyReferralsResponse = {
  referralCode: string;
  referredBy: { userId: string; name: string } | null;
  stats: { totalReferred: number; completed: number; pending: number };
  referrals: Referral[];
};

export type CompanyStatus = "ACTIVE" | "SUSPENDED";
export type RecurrenceRule = "NONE" | "DAILY" | "WEEKLY" | "BIWEEKLY" | "MONTHLY";

export type Company = {
  id: string;
  ownerUserId: string;
  name: string;
  industry: string | null;
  logoUrl: string | null;
  status: CompanyStatus;
  dateTimeCreated: string;
  dateTimeUpdated: string;
};

export type CreateCompanyPayload = {
  name: string;
  industry?: string;
  logoUrl?: string;
};

export type RosterWorker = {
  id: string;
  companyId: string;
  workerId: string;
  note: string | null;
  dateTimeCreated: string;
  worker: { userId: string; name: string; photoUrl: string | null; rating: number; reviews: number };
};

export type AddRosterWorkerPayload = {
  workerId: string;
  note?: string;
};

export type Shift = {
  id: string;
  companyId: string;
  title: string;
  category: string;
  description: string;
  location: string;
  budget: number;
  budgetType: "FIXED" | "HOURLY";
  budgetCurrency: string;
  lifecycleStatus: string;
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
  recurrenceRule: RecurrenceRule;
  recurrenceParentId: string | null;
  hiredWorkerId: string | null;
  completedAt: string | null;
  paymentMethod: string | null;
  paymentMarkedPaidAt: string | null;
  paymentConfirmedAt: string | null;
  dateTimeCreated: string;
  worker: { userId: string; name: string; photoUrl: string | null } | null;
};

export type CreateShiftPayload = {
  title: string;
  category: string;
  description?: string;
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  workerId: string;
  budget: number;
  budgetType: "FIXED" | "HOURLY";
  budgetCurrency?: string;
  scheduledStartAt: string;
  scheduledEndAt: string;
  recurrenceRule?: RecurrenceRule;
  recurrenceCount?: number;
};

export type UpdateShiftPayload = {
  scheduledStartAt?: string;
  scheduledEndAt?: string;
  workerId?: string;
  lifecycleStatus?: "CANCELLED";
};

export type JobWorkPhotoRole = "WORKER" | "REQUESTOR";

export type JobWorkPhoto = {
  id: string;
  jobId: string;
  uploadedByUserId: string;
  role: JobWorkPhotoRole;
  imageUrl: string;
  caption: string | null;
  dateTimeCreated: string;
  uploadedBy: { userId: string; name: string };
};

export type Article = {
  id: string;
  title: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  coverImageDeleteUrl: string | null;
  bodyHtml: string | null;
  isPublished: boolean;
  visibleFrom: string | null;
  visibleTo: string | null;
  displayOrder: number | null;
  dateTimeCreated: string;
  dateTimeUpdated: string;
};

export type CreateArticlePayload = {
  title: string;
  excerpt?: string | null;
  coverImageUrl?: string | null;
  coverImageDeleteUrl?: string | null;
  bodyHtml?: string | null;
  isPublished?: boolean;
  visibleFrom?: string | null;
  visibleTo?: string | null;
  displayOrder?: number | null;
};

export type UpdateArticlePayload = Partial<CreateArticlePayload>;

export type ContactInfo = {
  phone: string | null;
  email: string | null;
  address: string | null;
  dateTimeUpdated: string | null;
};

export type UpdateContactInfoPayload = {
  phone?: string | null;
  email?: string | null;
  address?: string | null;
};
