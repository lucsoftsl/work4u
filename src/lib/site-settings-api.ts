import type { ContactInfo, UpdateContactInfoPayload } from "@/api/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function handle<T>(response: Response, fallbackError: string): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || fallbackError);
  }
  return response.json();
}

export const siteSettingsApi = {
  async getContactInfo(): Promise<ContactInfo> {
    const response = await fetch(`${API_BASE_URL}/api/site/contact`);
    return handle(response, "Failed to load contact info");
  },

  async adminUpsertContactInfo(payload: UpdateContactInfoPayload, token: string): Promise<ContactInfo> {
    const response = await fetch(`${API_BASE_URL}/api/admin/site/contact`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    return handle(response, "Failed to update contact info");
  },
};
