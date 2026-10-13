import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { JobCard } from "./JobCard";
import type { Job } from "@/b2b/api/types";
vi.mock("@/lib/i18n", () => ({ useTranslation: () => ({ t: (_key: string, fallback: string) => fallback }) }));
afterEach(cleanup);
describe("dispatch status labels", () => {
  for (const [status, label] of [["SCHEDULED", "Scheduled"], ["DISPATCHED", "Team dispatched"], ["BLOCKED", "Blocked"]] as const) {
    it(`shows visible ${label} text on a compact card`, () => {
      render(<JobCard job={{ id: "j", reference: "JOB-1", title: "Repair", status } as Job} orgId="org" timezone="UTC" draggable={false} />);
      expect(screen.getByText(label).className).not.toContain("sr-only");
    });
  }
});
