import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemberList } from "./MemberList";
import type { Member } from "../api";

vi.mock("@/lib/i18n", () => ({ useTranslation: () => ({ locale: "ro", t: (k: string, f?: string) => (k === "b2b.member.unnamed" ? "Membru al echipei" : f ?? k) }) }));
afterEach(cleanup);
const m = (over: Partial<Member>): Member => ({ id: "m1", displayName: null, workEmail: "ana@costa.es", phone: null, externalId: null, memberType: "EMPLOYEE", status: "ACTIVE", loginStatus: "ACTIVE", role: { id: "r", name: "Tech", template: "TECHNICIAN" }, ...over });

describe("MemberList with nameless people (d886968d)", () => {
  it("shows the translated 'Team member' label, uses it in accessible names, and never shows the email as the name", () => {
    render(<MemberList members={[m({})]} invites={{}} canManage rowCanManage={() => true} selected={new Set()} onToggle={vi.fn()} onOpen={vi.fn()} onAction={vi.fn()} />);
    expect(screen.getAllByRole("button", { name: "Membru al echipei" }).length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("Select Membru al echipei").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Actions for Membru al echipei" }).length).toBeGreaterThan(0);
    // the email still appears, but only in the Contact column, never as a name button
    expect(screen.queryByRole("button", { name: "ana@costa.es" })).toBeNull();
  });
  it("an email that slipped into the name is treated as no name", () => {
    render(<MemberList members={[m({ displayName: "ana@costa.es" })]} invites={{}} canManage={false} rowCanManage={() => false} selected={new Set()} onToggle={vi.fn()} onOpen={vi.fn()} onAction={vi.fn()} />);
    expect(screen.getAllByRole("button", { name: "Membru al echipei" }).length).toBeGreaterThan(0);
  });
});
