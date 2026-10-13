import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReviewQueueView } from "./ReviewQueueView";
import { listReviewQueue } from "@/b2b/api/review";

const state = vi.hoisted(() => ({ search: "", replace: vi.fn(), close: true }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: state.replace }), usePathname: () => "/ops/org/review", useSearchParams: () => new URLSearchParams(state.search) }));
vi.mock("@/lib/i18n", () => ({ useTranslation: () => ({ t: (_key: string, fallback: string) => fallback }) }));
vi.mock("@/components/ui/Toast", () => ({ useToast: () => ({ push: vi.fn() }) }));
vi.mock("@/b2b/context/OrgContext", () => ({ useOrg: () => ({ orgId: "org", can: () => state.close, me: { org: { timezone: "UTC" } } }) }));
vi.mock("@/b2b/api/review", async (original) => ({ ...await original<typeof import("@/b2b/api/review")>(), listReviewQueue: vi.fn() }));

afterEach(() => { cleanup(); vi.clearAllMocks(); state.search = ""; state.close = true; });
const mount = () => {
  vi.mocked(listReviewQueue).mockResolvedValue({ items: [], total: 80, limit: 25, offset: 25, hasMore: true, nextOffset: 50, nextCursor: "cursor+/=" });
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><ReviewQueueView /></QueryClientProvider>);
};

describe("review queue navigation", () => {
  it("requests a cursor page and uses the returned cursor for Next", async () => {
    state.search = "page=2&dir=desc&cursor=current";
    mount();
    await waitFor(() => expect(listReviewQueue).toHaveBeenCalledWith("org", "desc", { limit: 25, offset: 25, cursor: "current" }, expect.any(AbortSignal)));
    fireEvent.click(await screen.findByRole("button", { name: "Next" }));
    expect(state.replace).toHaveBeenCalledWith("/ops/org/review?dir=desc&page=3&cursor=cursor%2B%2F%3D", { scroll: false });
    fireEvent.click(screen.getByRole("button", { name: "Oldest first" }));
    expect(state.replace).toHaveBeenLastCalledWith("/ops/org/review", { scroll: false });
  });
  it("uses an offset for Previous instead of reusing the forward cursor", async () => {
    state.search = "page=3&dir=desc&cursor=current";
    mount();
    fireEvent.click(await screen.findByRole("button", { name: "Previous" }));
    expect(state.replace).toHaveBeenCalledWith("/ops/org/review?dir=desc&page=2", { scroll: false });
  });
});
