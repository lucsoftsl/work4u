/** Something that contains an email address (the API used to send login emails as names; a cached or older response still might). */
export const isEmailLike = (value: string): boolean => /\S+@\S+\.\S+/.test(value);

/**
 * The name to show for a person. A missing, blank or email-like name becomes the translated fallback ("Team member"):
 * an email is never shown as a person's name, and never used as a client-side fallback either.
 */
export function personName(name: string | null | undefined, fallback: string): string {
  const v = (name ?? "").trim();
  return v && !isEmailLike(v) ? v : fallback;
}

/** First letter of a real name for avatars; null (show an icon) when there is no real name. Never taken from an email. */
export function personInitial(name: string | null | undefined): string | null {
  const v = (name ?? "").trim();
  return v && !isEmailLike(v) ? v[0].toUpperCase() : null;
}

/** Sort key that keeps unnamed people together at the end. */
export const personSortKey = (name: string | null | undefined): string => {
  const v = (name ?? "").trim();
  return v && !isEmailLike(v) ? v.toLocaleLowerCase() : "￿";
};

/** Why a name a person typed for themselves is not acceptable (required, and never an email address); null = fine. */
export function personNameProblem(name: string): "required" | "email" | null {
  const v = name.trim();
  if (!v) return "required";
  return isEmailLike(v) ? "email" : null;
}
