import { FIRST_TIME_CURRENCY } from "./fallback";

export interface CurrencySources {
  /** The company's chosen currency (null/undefined: not chosen). */
  company?: string | null;
  /** The last currency this person picked in any selector. */
  preferred?: string | null;
  /** What the API computed (`effectiveCurrency`); used when it is the only thing known. */
  api?: string | null;
}

/**
 * What every currency selector pre-selects. In this order: the company's currency if it was chosen, else the user's remembered one,
 * else EUR. (`api` is the server's own answer to the same question; it only matters when the other two are not known yet.)
 */
export function effectiveCurrency({ company, preferred, api }: CurrencySources): string {
  return company || preferred || api || FIRST_TIME_CURRENCY;
}
