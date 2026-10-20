import { vi } from "vitest";

// Shared mocks for screens that read the currency: `vi.mock("@/b2b/currency/useEffectiveCurrency", () => effectiveMock("RON"))`.

/** A company that has chosen `company`; pass null for a company with none (`pick` is then what the selector would pre-select). */
export const effectiveMock = (company: string | null, effective = company ?? "EUR") => ({
  useEffectiveCurrency: () => ({ currency: effective, companyCurrency: company, isSet: company !== null, preferred: null, loading: false, remember: vi.fn(), refreshCompany: vi.fn() }),
});

const LIST = [
  { code: "EUR", name: "Euro", symbol: "€", minorUnits: 2, popular: true }, { code: "USD", name: "US Dollar", symbol: "$", minorUnits: 2, popular: true },
  { code: "RON", name: "Romanian Leu", symbol: "RON", minorUnits: 2, popular: true }, { code: "JPY", name: "Japanese Yen", symbol: "¥", minorUnits: 0, popular: false },
  { code: "KWD", name: "Kuwaiti Dinar", symbol: "KWD", minorUnits: 3, popular: false },
];
export const currenciesMock = () => ({ useCurrencies: () => ({ items: LIST, status: "ready" as const, refetch: vi.fn() }) });
