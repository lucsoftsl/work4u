import type { Kind } from "./importLogic";

// Target columns per kind (CONTRACT FOR ILKA section 4). Used when the API did not send `knownFields`.
export const EMPLOYEE_FIELDS = ["external_id", "name", "email", "phone", "role", "team", "skills", "member_type", "working_hours", "notify_channel", "invite"] as const;
export const CUSTOMER_FIELDS = ["external_id", "name", "type", "email", "phone", "billing_address", "notes", "tags", "location_label", "address_line", "city", "postal_code", "country", "contact_name", "contact_role", "contact_email", "contact_phone"] as const;

export const defaultFields = (kind: Kind): readonly string[] => (kind === "employees" ? EMPLOYEE_FIELDS : CUSTOMER_FIELDS);
export const fieldLabel = (field: string): string => field.replace(/_/g, " ");
