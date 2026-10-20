// The API checks emails with zod 3 `.email()` (work4u-api: members, clients, contacts). Same pattern here, so a form never
// accepts an address the API then refuses with a bare 400 (c769b0c5). ASCII only: "josé@x.es" and "ana@firmă.ro" are refused.
const API_EMAIL = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9-]*\.)+[A-Z]{2,}$/i;
export const EMAIL_MAX = 255;

export function isValidEmail(value: string): boolean {
  const v = value.trim();
  return v.length > 0 && v.length <= EMAIL_MAX && API_EMAIL.test(v);
}
