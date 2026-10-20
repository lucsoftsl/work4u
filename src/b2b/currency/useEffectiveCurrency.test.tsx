import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const api = vi.hoisted(() => ({ getPreferences: vi.fn(), patchPreferences: vi.fn() }));
vi.mock("./api", async (orig) => ({ ...(await orig<typeof import("./api")>()), getPreferences: api.getPreferences, patchPreferences: api.patchPreferences }));
const org = vi.hoisted(() => ({ value: null as null | { orgId: string; me?: unknown } }));
vi.mock("@/b2b/context/OrgContext", () => ({ useOrgOptional: () => org.value }));
import { useEffectiveCurrency } from "./useEffectiveCurrency";

const wrap = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return { qc, wrapper: ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider> };
};
const me = (o: Record<string, unknown>, preferredCurrency: string | null = null) => ({ org: { id: "o", ...o }, preferredCurrency });

beforeEach(() => { api.getPreferences.mockReset(); api.patchPreferences.mockReset(); org.value = null; });

describe("useEffectiveCurrency: company, then the user's remembered currency, then EUR", () => {
  it("company currency chosen: it wins over the user's preference", async () => {
    api.getPreferences.mockResolvedValue({ preferredCurrency: "USD", defaultCurrency: "USD" });
    org.value = { orgId: "o", me: me({ currency: "RON", currencyIsSet: true, effectiveCurrency: "RON" }, "USD") };
    const { result } = renderHook(() => useEffectiveCurrency(), { wrapper: wrap().wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current).toMatchObject({ currency: "RON", companyCurrency: "RON", isSet: true });
  });
  it("company not chosen, user remembered one: that one", async () => {
    api.getPreferences.mockResolvedValue({ preferredCurrency: "GBP", defaultCurrency: "GBP" });
    org.value = { orgId: "o", me: me({ currency: null, currencyIsSet: false, effectiveCurrency: "GBP" }, "GBP") };
    const { result } = renderHook(() => useEffectiveCurrency(), { wrapper: wrap().wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current).toMatchObject({ currency: "GBP", companyCurrency: null, isSet: false, preferred: "GBP" });
  });
  it("neither: EUR", async () => {
    api.getPreferences.mockResolvedValue({ preferredCurrency: null, defaultCurrency: "EUR" });
    org.value = { orgId: "o", me: me({ currency: null, currencyIsSet: false, effectiveCurrency: "EUR" }) };
    const { result } = renderHook(() => useEffectiveCurrency(), { wrapper: wrap().wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.currency).toBe("EUR");
    expect(result.current.isSet).toBe(false);
  });
  it("outside a company (sign-up): the preference endpoint alone", async () => {
    api.getPreferences.mockResolvedValue({ preferredCurrency: "CHF", defaultCurrency: "CHF" });
    const { result } = renderHook(() => useEffectiveCurrency(), { wrapper: wrap().wrapper });
    await waitFor(() => expect(result.current.currency).toBe("CHF"));
    expect(result.current.isSet).toBe(false);
  });
  it("while the answer is still loading it is EUR, never a company default", () => {
    api.getPreferences.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useEffectiveCurrency(), { wrapper: wrap().wrapper });
    expect(result.current.currency).toBe("EUR");
    expect(result.current.loading).toBe(true);
  });
  it("remember() saves the pick for every other selector", async () => {
    api.getPreferences.mockResolvedValue({ preferredCurrency: null, defaultCurrency: "EUR" });
    api.patchPreferences.mockResolvedValue({ preferredCurrency: "USD", defaultCurrency: "USD" });
    const { result } = renderHook(() => useEffectiveCurrency(), { wrapper: wrap().wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.remember("USD"));
    expect(api.patchPreferences).toHaveBeenCalledWith("USD");
    await waitFor(() => expect(result.current.currency).toBe("USD"));
  });
  it("remember() of what is already remembered does not call the API again", async () => {
    api.getPreferences.mockResolvedValue({ preferredCurrency: "USD", defaultCurrency: "USD" });
    const { result } = renderHook(() => useEffectiveCurrency(), { wrapper: wrap().wrapper });
    await waitFor(() => expect(result.current.preferred).toBe("USD"));
    act(() => result.current.remember("USD"));
    expect(api.patchPreferences).not.toHaveBeenCalled();
  });
  it("a failed save is not an error for the user: the pick still shows", async () => {
    api.getPreferences.mockResolvedValue({ preferredCurrency: null, defaultCurrency: "EUR" });
    api.patchPreferences.mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => useEffectiveCurrency(), { wrapper: wrap().wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.remember("PLN"));
    await waitFor(() => expect(result.current.currency).toBe("PLN"));
  });
});
