import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { JobsTable } from "./JobsTable";
vi.mock("@/lib/i18n", () => ({ useTranslation: () => ({ t: (_key: string, fallback: string) => fallback }) }));
afterEach(cleanup);
const job = { id: "j1", reference: "JOB-1", title: "Fix boiler", status: "NEW", priority: "HIGH", updatedAt: "2026-01-01T00:00:00Z" } as never;
describe("JobsTable semantics", () => {
 it("uses table/row/cell roles without ul/li carrying row roles", () => {
  const { container } = render(<JobsTable orgId="o" items={[job]} tz="UTC" sort="updatedAt" dir="desc" nowMs={0} onSort={() => {}} />);
  expect(container.querySelector("li[role=row], ul[role=rowgroup]")).toBeNull();
  expect(screen.getAllByRole("row").length).toBe(2);
  expect(screen.getAllByRole("rowgroup").length).toBeGreaterThan(0);
  expect(screen.getByRole("cell").querySelector("a")?.getAttribute("href")).toBe("/ops/o/jobs/j1");
 });
});
