import type { CompanySettings, SettingsPatch } from "./api";
import { compactPhone, isPlausiblePhone } from "@/lib/b2b-phone";

export interface ProfileForm {
  name: string; legalName: string; taxId: string; country: string; phone: string; timezone: string; locale: string;
  addressLine: string; city: string; postalCode: string;
}
export type ProfileErrors = Partial<Record<keyof ProfileForm, string>>;

export const LOGO_MAX_BYTES = 2 * 1024 * 1024;
export const LOGO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export function settingsToForm(s: CompanySettings): ProfileForm {
  return {
    name: s.name, legalName: s.legalName ?? "", taxId: s.taxId ?? "", country: s.country ?? "", phone: s.phone ?? "", timezone: s.timezone,
    locale: s.locale ?? "", addressLine: s.addressLine ?? "", city: s.city ?? "", postalCode: s.postalCode ?? "",
  };
}

const LIMITS: Partial<Record<keyof ProfileForm, number>> = { name: 120, legalName: 200, taxId: 40, addressLine: 200, city: 100, postalCode: 20 };

/** Client-side checks; the API validates again. Messages are returned as keys so the caller can translate. */
export function validateProfile(f: ProfileForm): ProfileErrors {
  const errors: ProfileErrors = {};
  if (f.name.trim().length < 2) errors.name = "required";
  for (const [k, max] of Object.entries(LIMITS) as Array<[keyof ProfileForm, number]>) if (f[k].trim().length > max) errors[k] = "tooLong";
  if (!isPlausiblePhone(f.phone, f.country)) errors.phone = "phone";
  if (f.country && !/^[A-Za-z]{2}$/.test(f.country)) errors.country = "country";
  return errors;
}

/** Only the fields that changed; an emptied optional field is sent as null (clears it). Phone is normalised to E.164 characters. */
export function profilePatch(initial: ProfileForm, next: ProfileForm): SettingsPatch {
  const patch: Record<string, string | null> = {};
  (Object.keys(next) as Array<keyof ProfileForm>).forEach((k) => {
    let a = next[k].trim();
    if (k === "phone") a = compactPhone(a);
    if (k === "country") a = a.toUpperCase();
    if (a === initial[k].trim()) return;
    const required = k === "name" || k === "timezone";
    patch[k] = a === "" && !required ? null : a;
  });
  return patch as SettingsPatch;
}

export const isDirty = (initial: ProfileForm, next: ProfileForm) => Object.keys(profilePatch(initial, next)).length > 0;

/** null = acceptable, otherwise why the logo file is refused before any upload. */
export function logoProblem(file: { type: string; size: number }): "type" | "size" | null {
  if (!(LOGO_TYPES as readonly string[]).includes(file.type)) return "type";
  return file.size > LOGO_MAX_BYTES ? "size" : null;
}
