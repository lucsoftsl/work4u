export type Job = {
  id: string;
  title: string;
  category: string;
  description: string;
  budget: number;
  budgetType: "FIXED" | "HOURLY";
  location: string;
  remote: boolean;
  applicants: number;
  poster: {
    name: string;
    image: string;
    rating: number;
    reviews: number;
  };
};

export type CreateJobPayload = Omit<Job, "id" | "applicants">;

export type Application = {
  id: string;
  jobId: string;
  applicantId: string;
  coverLetter?: string;
  proposedRate?: number;
  proposedDuration?: string;
  status: "PENDING" | "VIEWED" | "SHORTLISTED" | "REJECTED" | "ACCEPTED" | "WITHDRAWN";
};

const mockJobs: Job[] = [
  {
    id: "1",
    title: "Website Design for E-commerce Store",
    category: "Design",
    description: "Need a modern, responsive website design for our online store",
    budget: 800,
    budgetType: "FIXED",
    location: "Remote",
    remote: true,
    applicants: 12,
    poster: {
      name: "Sarah Johnson",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
      rating: 4.8,
      reviews: 24,
    },
  },
  {
    id: "2",
    title: "Mobile App Development - iOS",
    category: "Development",
    description: "Build a native iOS app for our fitness tracking platform",
    budget: 5000,
    budgetType: "FIXED",
    location: "Remote",
    remote: true,
    applicants: 8,
    poster: {
      name: "Tech Startup Inc",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Tech",
      rating: 4.9,
      reviews: 18,
    },
  },
  {
    id: "3",
    title: "Content Writing - Blog Posts",
    category: "Writing",
    description: "Write 10 SEO-optimized blog posts about digital marketing",
    budget: 25,
    budgetType: "HOURLY",
    location: "Remote",
    remote: true,
    applicants: 24,
    poster: {
      name: "Marketing Agency",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Marketing",
      rating: 4.7,
      reviews: 31,
    },
  },
];

const mockApplications: Application[] = [];

const wait = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

export const mockApi = {
  async listJobs(): Promise<Job[]> {
    await wait();
    return mockJobs;
  },

  async getJob(id: string): Promise<Job | undefined> {
    await wait();
    return mockJobs.find((job) => job.id === id);
  },

  async createJob(payload: CreateJobPayload): Promise<Job> {
    await wait();
    const newJob: Job = {
      ...payload,
      id: (mockJobs.length + 1).toString(),
      applicants: 0,
    };
    mockJobs.push(newJob);
    return newJob;
  },

  async applyToJob(jobId: string, application: Omit<Application, "id" | "status">): Promise<Application> {
    await wait();
    const newApplication: Application = {
      ...application,
      id: (mockApplications.length + 1).toString(),
      jobId,
      status: "PENDING",
    };
    mockApplications.push(newApplication);
    return newApplication;
  },
};
