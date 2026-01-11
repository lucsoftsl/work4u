export type JobBudgetType = "FIXED" | "HOURLY";
export type JobStatus = "VERIFIED" | "DELETED" | "DEFAULT";

export type Job = {
  id: string;
  title: string;
  category: string;
  description: string;
  budget: number;
  budgetType: JobBudgetType;
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
    id: "550e8400-e29b-41d4-a716-446655440001",
    title: "Furniture Mounting & Assembly",
    category: "carpentry",
    description: "Need to mount shelves and assemble furniture in my apartment",
    budget: 50,
    budgetType: "HOURLY",
    location: "Barcelona, Spain",
    remote: false,
    applicants: 12,
    createdByUserId: "user-001",
    status: "VERIFIED",
    createdBy: {
      userId: "user-001",
      name: "Sarah Johnson",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
      rating: 4.8,
      reviews: 24,
    },
    dateTimeCreated: "2025-12-15T10:30:00Z",
    dateTimeUpdated: "2026-01-08T14:20:00Z",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440002",
    title: "Interior Painting - Living Room",
    category: "painting",
    description: "Paint my living room walls with high-quality materials",
    budget: 500,
    budgetType: "FIXED",
    location: "Madrid, Spain",
    remote: false,
    applicants: 8,
    createdByUserId: "user-002",
    status: "VERIFIED",
    createdBy: {
      userId: "user-002",
      name: "Tech Startup Inc",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Tech",
      rating: 4.9,
      reviews: 18,
    },
    dateTimeCreated: "2025-12-20T09:15:00Z",
    dateTimeUpdated: "2026-01-07T16:45:00Z",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440003",
    title: "House Cleaning Service",
    category: "cleaning",
    description: "Professional house cleaning - weekly sessions needed",
    budget: 40,
    budgetType: "HOURLY",
    location: "Valencia, Spain",
    remote: false,
    applicants: 24,
    createdByUserId: "user-003",
    status: "VERIFIED",
    createdBy: {
      userId: "user-003",
      name: "Marketing Agency",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Marketing",
      rating: 4.7,
      reviews: 31,
    },
    dateTimeCreated: "2025-12-10T11:45:00Z",
    dateTimeUpdated: "2026-01-09T13:30:00Z",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440004",
    title: "Plumbing Repair - Leaky Faucet",
    category: "plumbing",
    description: "Fix a leaky kitchen faucet and check pipes",
    budget: 75,
    budgetType: "HOURLY",
    location: "Bilbao, Spain",
    remote: false,
    applicants: 5,
    createdByUserId: "user-004",
    status: "VERIFIED",
    createdBy: {
      userId: "user-004",
      name: "John Smith",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=John",
      rating: 4.6,
      reviews: 12,
    },
    dateTimeCreated: "2025-12-22T08:20:00Z",
    dateTimeUpdated: "2026-01-06T10:15:00Z",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440005",
    title: "Electrical Outlet Installation",
    category: "electrical",
    description: "Install new electrical outlets and light fixtures",
    budget: 80,
    budgetType: "HOURLY",
    location: "Seville, Spain",
    remote: false,
    applicants: 9,
    createdByUserId: "user-005",
    status: "VERIFIED",
    createdBy: {
      userId: "user-005",
      name: "Emma Davis",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emma",
      rating: 4.7,
      reviews: 19,
    },
    dateTimeCreated: "2025-12-18T15:50:00Z",
    dateTimeUpdated: "2026-01-05T11:25:00Z",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440006",
    title: "Landscaping & Garden Design",
    category: "landscaping",
    description: "Design and landscape my backyard garden area",
    budget: 600,
    budgetType: "FIXED",
    location: "Barcelona, Spain",
    remote: false,
    applicants: 7,
    createdByUserId: "user-006",
    status: "VERIFIED",
    createdBy: {
      userId: "user-006",
      name: "Michael Brown",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Michael",
      rating: 4.5,
      reviews: 14,
    },
    dateTimeCreated: "2025-12-12T12:10:00Z",
    dateTimeUpdated: "2026-01-04T09:40:00Z",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440007",
    title: "Pet Sitting & Dog Walking",
    category: "pet-care",
    description: "Daily dog walking and pet sitting services",
    budget: 30,
    budgetType: "HOURLY",
    location: "Madrid, Spain",
    remote: false,
    applicants: 18,
    createdByUserId: "user-007",
    status: "VERIFIED",
    createdBy: {
      userId: "user-007",
      name: "Lisa Anderson",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Lisa",
      rating: 4.9,
      reviews: 28,
    },
    dateTimeCreated: "2025-12-25T07:30:00Z",
    dateTimeUpdated: "2026-01-08T15:50:00Z",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440008",
    title: "Car Detailing & Washing",
    category: "car-wash",
    description: "Professional car washing and interior detailing",
    budget: 80,
    budgetType: "FIXED",
    location: "Valencia, Spain",
    remote: false,
    applicants: 11,
    createdByUserId: "user-008",
    status: "VERIFIED",
    createdBy: {
      userId: "user-008",
      name: "David Wilson",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=David",
      rating: 4.8,
      reviews: 22,
    },
    dateTimeCreated: "2025-12-14T13:55:00Z",
    dateTimeUpdated: "2026-01-03T12:20:00Z",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440009",
    title: "Tutoring - Math & Science",
    category: "tutoring",
    description: "Math and science tutoring for high school students",
    budget: 45,
    budgetType: "HOURLY",
    location: "Bilbao, Spain",
    remote: true,
    applicants: 14,
    createdByUserId: "user-009",
    status: "VERIFIED",
    createdBy: {
      userId: "user-009",
      name: "Jessica Martinez",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jessica",
      rating: 4.7,
      reviews: 17,
    },
    dateTimeCreated: "2025-12-19T10:05:00Z",
    dateTimeUpdated: "2026-01-02T14:35:00Z",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440010",
    title: "General Handyman Repairs",
    category: "handyman",
    description: "Various household repairs and maintenance tasks",
    budget: 55,
    budgetType: "HOURLY",
    location: "Seville, Spain",
    remote: false,
    applicants: 6,
    createdByUserId: "user-010",
    status: "VERIFIED",
    createdBy: {
      userId: "user-010",
      name: "Robert Taylor",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Robert",
      rating: 4.4,
      reviews: 11,
    },
    dateTimeCreated: "2025-12-21T14:40:00Z",
    dateTimeUpdated: "2026-01-01T16:10:00Z",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440011",
    title: "Kitchen Cabinet Installation",
    category: "carpentry",
    description: "Install custom kitchen cabinets and countertops",
    budget: 1200,
    budgetType: "FIXED",
    location: "Barcelona, Spain",
    remote: false,
    applicants: 4,
    createdByUserId: "user-011",
    status: "VERIFIED",
    createdBy: {
      userId: "user-011",
      name: "Patricia Lee",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Patricia",
      rating: 4.9,
      reviews: 26,
    },
    dateTimeCreated: "2025-12-16T09:25:00Z",
    dateTimeUpdated: "2025-12-31T11:45:00Z",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440012",
    title: "Home Deep Cleaning",
    category: "cleaning",
    description: "Thorough deep cleaning of entire house",
    budget: 350,
    budgetType: "FIXED",
    location: "Madrid, Spain",
    remote: false,
    applicants: 16,
    createdByUserId: "user-012",
    status: "VERIFIED",
    createdBy: {
      userId: "user-012",
      name: "Teresa Garcia",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Teresa",
      rating: 4.8,
      reviews: 30,
    },
    dateTimeCreated: "2025-12-11T16:15:00Z",
    dateTimeUpdated: "2025-12-30T13:50:00Z",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440013",
    title: "Fence Repair & Installation",
    category: "construction",
    description: "Build new wooden fence around property",
    budget: 800,
    budgetType: "FIXED",
    location: "Valencia, Spain",
    remote: false,
    applicants: 3,
    createdByUserId: "user-013",
    status: "VERIFIED",
    createdBy: {
      userId: "user-013",
      name: "Carlos Rodriguez",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Carlos",
      rating: 4.6,
      reviews: 13,
    },
    dateTimeCreated: "2025-12-24T11:35:00Z",
    dateTimeUpdated: "2025-12-29T10:20:00Z",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440014",
    title: "Hair Styling & Salon",
    category: "hairstyle",
    description: "Professional haircut and styling services",
    budget: 50,
    budgetType: "FIXED",
    location: "Bilbao, Spain",
    remote: false,
    applicants: 22,
    createdByUserId: "user-014",
    status: "VERIFIED",
    createdBy: {
      userId: "user-014",
      name: "Rosa Fernandez",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rosa",
      rating: 4.9,
      reviews: 35,
    },
    dateTimeCreated: "2025-12-13T13:20:00Z",
    dateTimeUpdated: "2025-12-28T15:05:00Z",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440015",
    title: "Childcare & Babysitting",
    category: "childcare",
    description: "Experienced childcare and babysitting services",
    budget: 35,
    budgetType: "HOURLY",
    location: "Seville, Spain",
    remote: false,
    applicants: 19,
    createdByUserId: "user-015",
    status: "VERIFIED",
    createdBy: {
      userId: "user-015",
      name: "Maria Sanchez",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Maria",
      rating: 4.8,
      reviews: 27,
    },
    dateTimeCreated: "2025-12-23T10:50:00Z",
    dateTimeUpdated: "2025-12-27T12:30:00Z",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440016",
    title: "IT Support & Computer Repair",
    category: "it-support",
    description: "Computer repair, setup, and technical support",
    budget: 60,
    budgetType: "HOURLY",
    location: "Barcelona, Spain",
    remote: true,
    applicants: 10,
    createdByUserId: "user-016",
    status: "VERIFIED",
    createdBy: {
      userId: "user-016",
      name: "Luis Moreno",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Luis",
      rating: 4.7,
      reviews: 16,
    },
    dateTimeCreated: "2025-12-17T15:30:00Z",
    dateTimeUpdated: "2025-12-26T14:15:00Z",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440017",
    title: "Flooring Installation",
    category: "flooring",
    description: "Install hardwood, laminate, or tile flooring",
    budget: 2000,
    budgetType: "FIXED",
    location: "Madrid, Spain",
    remote: false,
    applicants: 2,
    createdByUserId: "user-017",
    status: "VERIFIED",
    createdBy: {
      userId: "user-017",
      name: "Antonio Ruiz",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Antonio",
      rating: 4.8,
      reviews: 21,
    },
    dateTimeCreated: "2025-12-09T08:45:00Z",
    dateTimeUpdated: "2025-12-25T09:50:00Z",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440018",
    title: "Personal Training Sessions",
    category: "personal-training",
    description: "One-on-one fitness training and coaching",
    budget: 65,
    budgetType: "HOURLY",
    location: "Valencia, Spain",
    remote: false,
    applicants: 13,
    createdByUserId: "user-018",
    status: "VERIFIED",
    createdBy: {
      userId: "user-018",
      name: "Ana Lopez",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ana",
      rating: 4.7,
      reviews: 18,
    },
    dateTimeCreated: "2025-12-26T12:00:00Z",
    dateTimeUpdated: "2025-12-24T11:25:00Z",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440019",
    title: "Event Setup & Coordination",
    category: "event-setup",
    description: "Plan and setup for small party or event",
    budget: 300,
    budgetType: "FIXED",
    location: "Bilbao, Spain",
    remote: false,
    applicants: 8,
    createdByUserId: "user-019",
    status: "VERIFIED",
    createdBy: {
      userId: "user-019",
      name: "Carmen Diaz",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Carmen",
      rating: 4.6,
      reviews: 14,
    },
    dateTimeCreated: "2025-12-27T14:30:00Z",
    dateTimeUpdated: "2025-12-23T10:05:00Z",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440020",
    title: "Cooking & Meal Preparation",
    category: "cooking",
    description: "Prepare healthy meals for the week",
    budget: 200,
    budgetType: "FIXED",
    location: "Seville, Spain",
    remote: false,
    applicants: 7,
    createdByUserId: "user-020",
    status: "VERIFIED",
    createdBy: {
      userId: "user-020",
      name: "Francisco Vega",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Francisco",
      rating: 4.8,
      reviews: 20,
    },
    dateTimeCreated: "2025-12-28T09:15:00Z",
    dateTimeUpdated: "2025-12-22T13:40:00Z",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440021",
    title: "Appliance Repair",
    category: "appliance-repair",
    description: "Repair and maintenance for kitchen appliances",
    budget: 70,
    budgetType: "HOURLY",
    location: "Barcelona, Spain",
    remote: false,
    applicants: 5,
    createdByUserId: "user-021",
    status: "VERIFIED",
    createdBy: {
      userId: "user-021",
      name: "Miguel Angel",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Miguel",
      rating: 4.5,
      reviews: 12,
    },
    dateTimeCreated: "2025-12-29T10:40:00Z",
    dateTimeUpdated: "2025-12-21T08:55:00Z",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440022",
    title: "Roof Repair & Maintenance",
    category: "roofing",
    description: "Inspect and repair roof damage",
    budget: 150,
    budgetType: "HOURLY",
    location: "Madrid, Spain",
    remote: false,
    applicants: 2,
    createdByUserId: "user-022",
    status: "VERIFIED",
    createdBy: {
      userId: "user-022",
      name: "Vicente Romero",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Vicente",
      rating: 4.7,
      reviews: 15,
    },
    dateTimeCreated: "2025-12-30T15:20:00Z",
    dateTimeUpdated: "2025-12-20T12:30:00Z",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440023",
    title: "Photography & Photo Editing",
    category: "photography",
    description: "Professional event and portrait photography",
    budget: 400,
    budgetType: "FIXED",
    location: "Valencia, Spain",
    remote: false,
    applicants: 11,
    createdByUserId: "user-023",
    status: "VERIFIED",
    createdBy: {
      userId: "user-023",
      name: "Sofia Castillo",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sofia",
      rating: 4.9,
      reviews: 25,
    },
    dateTimeCreated: "2025-12-31T11:50:00Z",
    dateTimeUpdated: "2025-12-19T14:15:00Z",
  },
];

const mockApplications: Application[] = [];

const wait = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

const generateUUID = (): string => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const mockApi = {
  async listJobs(): Promise<Job[]> {
    await wait();
    return mockJobs;
  },

  async getJob(id: string): Promise<Job | undefined> {
    await wait();
    return mockJobs.find((job) => job.id === id);
  },

  async createJob(payload: CreateJobPayload, createdByUserId: string): Promise<Job> {
    await wait();
    const now = new Date().toISOString();
    const newJob: Job = {
      ...payload,
      id: generateUUID(),
      createdByUserId,
      applicants: 0,
      status: "DEFAULT",
      dateTimeCreated: now,
      dateTimeUpdated: now,
      createdBy: {
        userId: "",
        name: "",
        image: undefined,
        rating: 0,
        reviews: 0
      }
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
