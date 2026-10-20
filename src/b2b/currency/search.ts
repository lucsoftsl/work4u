// Pure helpers of the currency dropdown: how a currency reads, how a typed query finds it, and how the list is grouped.

export interface CurrencyInfo { code: string; name: string; symbol: string; minorUnits: number; popular: boolean }
export interface CurrencyGroup { id: "popular" | "all" | "results"; items: CurrencyInfo[] }

/** "EUR · Euro (€)"; the symbol is left out when it is just the code again. */
export function currencyLabel(c: Pick<CurrencyInfo, "code" | "name" | "symbol">): string {
  if (!c.name) return c.code;
  return c.symbol && c.symbol !== c.code ? `${c.code} · ${c.name} (${c.symbol})` : `${c.code} · ${c.name}`;
}

/** Lower case, no accents: "Românesc" -> "romanesc". */
const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Rank of one currency for a query (lower = better), or null when it does not match. Code first, then the start of the name, then a word, then anywhere. */
function rank(c: CurrencyInfo, q: string): number | null {
  const code = c.code.toLowerCase();
  const name = fold(c.name);
  if (code === q) return 0;
  if (code.startsWith(q)) return 1;
  if (name.startsWith(q)) return 2;
  if (name.split(/[\s\-–,/()]+/).some((w) => w.startsWith(q))) return 3;
  if (code.includes(q)) return 4;
  if (name.includes(q)) return 5;
  return null;
}

/** The currencies matching `query` (by code or localized name), best match first; ties keep the list order. */
export function searchCurrencies(items: readonly CurrencyInfo[], query: string): CurrencyInfo[] {
  const q = fold(query);
  if (!q) return [...items];
  return items
    .map((c, i) => ({ c, i, r: rank(c, q) }))
    .filter((x): x is { c: CurrencyInfo; i: number; r: number } => x.r !== null)
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .map((x) => x.c);
}

/** No query: "popular" (in the API's order) then "all" (the rest, A to Z). A query: a single "results" group. */
export function groupCurrencies(items: readonly CurrencyInfo[], query: string): CurrencyGroup[] {
  if (fold(query)) {
    const found = searchCurrencies(items, query);
    return found.length ? [{ id: "results", items: found }] : [];
  }
  const popular = items.filter((c) => c.popular);
  const rest = items.filter((c) => !c.popular);
  return [...(popular.length ? [{ id: "popular" as const, items: popular }] : []), ...(rest.length ? [{ id: "all" as const, items: rest }] : [])];
}
