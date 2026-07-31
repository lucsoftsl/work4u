import type {
  AddRosterWorkerPayload,
  Company,
  CreateCompanyPayload,
  CreateShiftPayload,
  RosterWorker,
  Shift,
  UpdateShiftPayload,
} from "@/api/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function handle<T>(response: Response, fallbackError: string): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || fallbackError);
  }
  return response.json();
}

export const companiesApi = {
  async createCompany(payload: CreateCompanyPayload, token: string): Promise<Company> {
    const response = await fetch(`${API_BASE_URL}/api/companies`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    return handle(response, "Failed to create company");
  },

  async getMyCompany(token: string): Promise<Company | null> {
    const response = await fetch(`${API_BASE_URL}/api/companies/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.status === 404) return null;
    return handle(response, "Failed to fetch company");
  },

  async listRoster(companyId: string, token: string): Promise<RosterWorker[]> {
    const response = await fetch(`${API_BASE_URL}/api/companies/${companyId}/roster`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return handle(response, "Failed to fetch roster");
  },

  async addRosterWorker(companyId: string, payload: AddRosterWorkerPayload, token: string): Promise<RosterWorker> {
    const response = await fetch(`${API_BASE_URL}/api/companies/${companyId}/roster`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    return handle(response, "Failed to add worker to roster");
  },

  async removeRosterWorker(companyId: string, workerId: string, token: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/companies/${companyId}/roster/${workerId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    await handle(response, "Failed to remove worker from roster");
  },

  async createShift(companyId: string, payload: CreateShiftPayload, token: string): Promise<Shift[]> {
    const response = await fetch(`${API_BASE_URL}/api/companies/${companyId}/shifts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    return handle(response, "Failed to schedule shift");
  },

  async listShifts(companyId: string, from: string, to: string, token: string): Promise<Shift[]> {
    const params = new URLSearchParams({ from, to });
    const response = await fetch(`${API_BASE_URL}/api/companies/${companyId}/shifts?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return handle(response, "Failed to fetch shifts");
  },

  async updateShift(companyId: string, jobId: string, payload: UpdateShiftPayload, token: string): Promise<Shift> {
    const response = await fetch(`${API_BASE_URL}/api/companies/${companyId}/shifts/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    return handle(response, "Failed to update shift");
  },
};
