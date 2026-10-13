import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { B2bError } from "@/b2b/api/client";
import { listNotifications } from "@/b2b/api/endpoints";
import { NotificationsView } from "./NotificationsView";
vi.mock("@/lib/i18n", () => ({ useTranslation: () => ({ t: (_key: string, fallback: string) => fallback }) }));
vi.mock("@/b2b/context/OrgContext", () => ({ useOrg: () => ({ orgId: "org" }) }));
vi.mock("next/navigation", () => ({ usePathname: () => "/ops/org/notifications", useRouter: () => ({ replace: vi.fn() }), useSearchParams: () => new URLSearchParams() }));
vi.mock("./useNotificationActions", () => ({ useNotificationActions: () => ({ markOne: { mutate: vi.fn() }, markAll: { mutate: vi.fn(), isPending: false, isError: false } }) }));
vi.mock("@/b2b/api/endpoints", async (original) => ({ ...await original<typeof import("@/b2b/api/endpoints")>(), listNotifications: vi.fn() }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe("NotificationsView heading", () => {
 it("keeps an h1 and the unavailable state when the API is MIGRATION_PENDING", async () => {
  vi.mocked(listNotifications).mockRejectedValue(new B2bError(503, "MIGRATION_PENDING", "pending"));
  render(<QueryClientProvider client={new QueryClient()}><NotificationsView /></QueryClientProvider>);
  await screen.findByText("Notifications aren't available yet");
  expect(screen.getByRole("heading", { level: 1, name: "Notifications" })).toBeTruthy();
 });
});
