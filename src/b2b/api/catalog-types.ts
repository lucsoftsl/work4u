export interface Skill { id: string; name: string; memberIds: string[] }

export interface OrgMemberRow {
  id: string; displayName: string; workEmail?: string | null; memberType?: string; status?: string;
  role?: { id: string; name: string; template?: string } | null;
}

export type CustomerType = "COMPANY" | "PERSON";

export interface CustomerLocation {
  id: string; label: string; addressLine: string; city?: string | null; postalCode?: string | null; country?: string | null;
  latitude?: number | null; longitude?: number | null; accessInstructions?: string | null; safetyInstructions?: string | null;
}

export interface Customer {
  id: string; name: string; type?: CustomerType; email?: string | null; phone?: string | null;
  billingAddress?: string | null; notes?: string | null;
}

export interface CustomerDetail extends Customer { locations: CustomerLocation[] }

export interface CustomerInput {
  name: string; type: CustomerType; email: string | null; phone: string | null; billingAddress: string | null; notes: string | null;
}

export interface LocationInput {
  label: string; addressLine: string; city: string | null; postalCode: string | null; country: string | null;
  latitude: number | null; longitude: number | null; accessInstructions: string | null; safetyInstructions: string | null;
}
