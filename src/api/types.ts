export type JobBudgetType = "FIXED" | "HOURLY";
export type JobStatus = "VERIFIED" | "DELETED" | "DEFAULT";

export type Job = {
  id: string;
  title: string;
  category: string;
  description: string;
  budget: number;
  budgetType: JobBudgetType;
  budgetCurrency: string;
  location: string;
  remote: boolean;
  applicants: number;
  createdByUserId: string;
  status: JobStatus;
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

export type CreateJobPayload = Omit<Job, "id" | "applicants" | "status" | "dateTimeCreated" | "dateTimeUpdated" | "createdByUserId" | "createdBy">;

export type UpdateJobPayload = Partial<Omit<Job, "id" | "createdByUserId" | "createdBy" | "dateTimeCreated" | "dateTimeUpdated">>;

export type Application = {
  id: string;
  jobId: string;
  applicantId: string;
  coverLetter?: string;
  proposedRate?: number;
  proposedDuration?: string;
  status: "PENDING" | "VIEWED" | "SHORTLISTED" | "REJECTED" | "ACCEPTED" | "WITHDRAWN";
};
