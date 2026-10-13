import type { PartInput } from "@/b2b/api/endpoints";

export const PART_LIMITS = { name: 120, sku: 60, unit: 12, note: 300, maxQuantity: 9999 } as const;
export const PART_UNITS = ["pcs", "m", "kg", "L", "set"] as const;

/** Client-generated id so a part can be edited or removed before it ever reaches the server. */
export function newPartId(): string {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  const hex = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  return `${hex(8)}-${hex(4)}-4${hex(3)}-a${hex(3)}-${hex(12)}`;
}

export type PartErrors = Partial<Record<"name" | "quantity" | "sku" | "unit" | "note", "name" | "qty" | "long">>;

/** Same rules as the API: name 1-120, quantity > 0 (≤ 9999, ≤ 2 decimals), sku ≤ 60, unit ≤ 12, note ≤ 300. */
export function validatePart(v: { name: string; quantity: string; sku?: string; unit?: string; note?: string }): { errors: PartErrors; value: PartInput | null } {
  const errors: PartErrors = {};
  const name = v.name.trim();
  if (!name) errors.name = "name";
  else if (name.length > PART_LIMITS.name) errors.name = "long";
  const qty = Number(v.quantity.replace(",", "."));
  if (!v.quantity.trim() || !Number.isFinite(qty) || qty <= 0 || qty > PART_LIMITS.maxQuantity || Math.round(qty * 100) / 100 !== qty) errors.quantity = "qty";
  if ((v.sku ?? "").trim().length > PART_LIMITS.sku) errors.sku = "long";
  if ((v.unit ?? "").trim().length > PART_LIMITS.unit) errors.unit = "long";
  if ((v.note ?? "").trim().length > PART_LIMITS.note) errors.note = "long";
  if (Object.keys(errors).length) return { errors, value: null };
  return { errors, value: { name, quantity: qty, sku: v.sku?.trim() || null, unit: v.unit?.trim() || null, note: v.note?.trim() || null } };
}

/** Sum used quantity per part name+unit for read-only summaries. */
export function totalsByName(parts: ReadonlyArray<{ name: string; unit: string | null; quantity: number }>): Array<{ name: string; unit: string | null; quantity: number }> {
  const map = new Map<string, { name: string; unit: string | null; quantity: number }>();
  for (const p of parts) {
    const key = `${p.name.trim().toLowerCase()}|${p.unit ?? ""}`;
    const cur = map.get(key);
    map.set(key, cur ? { ...cur, quantity: Math.round((cur.quantity + p.quantity) * 100) / 100 } : { name: p.name, unit: p.unit, quantity: p.quantity });
  }
  return [...map.values()];
}
