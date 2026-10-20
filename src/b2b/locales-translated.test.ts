import { describe, expect, it } from "vitest";
import en from "@/locales/en.json";
import ro from "@/locales/ro.json";
import es from "@/locales/es.json";

// A key that exists in the English file but reads exactly the same in Romanian or Spanish is almost always a row nobody translated
// (the screen then shows English in that language). Words that really are the same in the language are listed here.
// The check looks at every word of two or more letters (an earlier version skipped words under four letters, which let "Low" and "End" through).
// Each entry says why the same text is right in that language.
const SAME_IN_LANGUAGE: Record<string, Record<string, string>> = {
  ro: {
    "Offline": "loanword (as used in the app)", "Online": "loanword", "Live": "loanword", "Urgent": "same word", "Normal": "same word",
    "Conflict": "same word", "Conflict {ref}": "same word", "Conflict: {message}": "same word", "Contact": "same word", "Client": "same word",
    "client": "same word", "{n} client": "same word", "Cost": "same word", "Total": "same word", "Info": "loanword", "Email": "common usage",
    "Logo": "same word", "Marketplace": "product name", "SLA": "acronym", "OK": "acronym", "ID {id}": "acronym", "© {year} work4u": "brand",
  },
  es: {
    "Normal": "same word", "Total": "same word", "Info": "loanword", "Roles": "same word", "Legal": "same word", "Error": "same word",
    "{n} error": "same word", "Marketplace": "product name", "SLA": "acronym", "OK": "acronym", "ID {id}": "acronym", "© {year} work4u": "brand",
  },
};

describe("B2B rows are translated in Romanian and Spanish", () => {
  it.each(["ro", "es"] as const)("%s: no b2b.* text is still the English one", (lang) => {
    const dict = (lang === "ro" ? ro : es) as Record<string, string>;
    const allowed = new Set(Object.keys(SAME_IN_LANGUAGE[lang]));
    const stale = Object.entries(en as Record<string, string>)
      .filter(([k, v]) => k.startsWith("b2b.") && /[A-Za-z]{2,}/.test(v.replace(/\{[^}]+\}/g, "")) && dict[k] === v && !allowed.has(v))
      .map(([k, v]) => `${k} = ${v.slice(0, 70)}`);
    expect(stale, "translate these rows in " + lang + ".json (or list the word in SAME_IN_LANGUAGE)").toEqual([]);
  });
  it.each(["ro", "es"] as const)("%s: every b2b.* key of English exists", (lang) => {
    const dict = (lang === "ro" ? ro : es) as Record<string, string>;
    expect(Object.keys(en).filter((k) => k.startsWith("b2b.") && !(k in dict))).toEqual([]);
  });
});
