import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import en from "@/locales/en.json";

const m = vi.hoisted(() => ({
  effective: "EUR", remember: vi.fn(),
  replace: vi.fn(), push: vi.fn(), user: null as null | { displayName?: string | null; email?: string }, loading: false,
  orgs: vi.fn(), signup: vi.fn(), signInEmail: vi.fn(), createAccount: vi.fn(), google: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: m.replace, push: m.push }), usePathname: () => "/ops/signin" }));
vi.mock("@/lib/i18n", () => ({ useTranslation: () => ({ locale: "en", t: (k: string, f?: string) => (en as Record<string, string>)[k] ?? f ?? k }) }));
vi.mock("@/b2b/currency/useEffectiveCurrency", () => ({ useEffectiveCurrency: () => ({ currency: m.effective, companyCurrency: null, isSet: false, preferred: null, loading: false, remember: m.remember, refreshCompany: vi.fn() }) }));
vi.mock("@/b2b/currency/useCurrencies", () => ({
  useCurrencies: () => ({ status: "ready", refetch: vi.fn(), items: [
    { code: "EUR", name: "Euro", symbol: "€", minorUnits: 2, popular: true }, { code: "USD", name: "US Dollar", symbol: "$", minorUnits: 2, popular: true },
    { code: "RON", name: "Romanian Leu", symbol: "RON", minorUnits: 2, popular: true },
  ] }),
}));
vi.mock("@/context/AuthContext", () => ({ useAuth: () => ({ user: m.user, loading: m.loading }) }));
vi.mock("@/b2b/api/endpoints", async (o) => ({ ...(await o<typeof import("@/b2b/api/endpoints")>()), listMyOrgs: m.orgs, signupCompany: m.signup }));
vi.mock("@/lib/b2b-auth", async (o) => ({ ...(await o<typeof import("@/lib/b2b-auth")>()), b2bSignInWithEmail: m.signInEmail, b2bCreateAccount: m.createAccount, b2bSignInWithGoogle: m.google, b2bSendPasswordReset: vi.fn() }));

import { SignInView } from "./SignInView";
import { StartView } from "./StartView";
import { B2bError } from "@/b2b/api/client";

const open = (url: string) => window.history.replaceState({}, "", url);
const wrap = (ui: React.ReactElement) => render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);
const org = (id: string, landing: string) => ({ id, name: id, timezone: "UTC", memberId: "m", role: { name: "x", template: "ADMIN" }, landing });

beforeEach(() => { m.user = null; m.loading = false; open("/ops/signin"); });
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("B2B sign-in", () => {
  it("shows the B2B page: one h1, no marketplace links, a link to create a company account", () => {
    wrap(<SignInView />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    const hrefs = screen.getAllByRole("link").map((a) => a.getAttribute("href")!);
    expect(hrefs).toContain("/ops/start");
    // the footer links back to the marketplace index ("work4u home"), but never into marketplace sign-in or its app
    for (const bad of ["/signin", "/signup", "/dashboard", "/jobs", "/workers"]) expect(hrefs, bad).not.toContain(bad);
  });
  it("carries a safe ?redirect= to the start page and ignores a marketplace one", () => {
    open("/ops/signin?redirect=%2Fb2b%2Finvite%2Ftok1");
    wrap(<SignInView />);
    expect(screen.getByRole("link", { name: "Create your company account" }).getAttribute("href")).toBe("/ops/start?redirect=%2Fb2b%2Finvite%2Ftok1");
    cleanup();
    open("/ops/signin?redirect=%2Fdashboard");
    wrap(<SignInView />);
    expect(screen.getByRole("link", { name: "Create your company account" }).getAttribute("href")).toBe("/ops/start");
  });
  it("a signed-in person with one workspace goes to its landing (technician → field app), never /dashboard", async () => {
    m.user = { email: "a@b.co" };
    m.orgs.mockResolvedValue([org("o1", "/tech/o1/today")]);
    wrap(<SignInView />);
    await waitFor(() => expect(m.replace).toHaveBeenCalledWith("/tech/o1/today"));
    expect(m.replace).not.toHaveBeenCalledWith("/dashboard");
  });
  it("an invitation redirect wins; several workspaces → chooser; none → company start", async () => {
    m.user = { email: "a@b.co" };
    open("/ops/signin?redirect=%2Fb2b%2Finvite%2Ftok1");
    m.orgs.mockResolvedValue([org("o1", "/ops/o1/dashboard"), org("o2", "/ops/o2/dashboard")]);
    wrap(<SignInView />);
    await waitFor(() => expect(m.replace).toHaveBeenCalledWith("/b2b/invite/tok1"));
    cleanup(); m.replace.mockClear(); open("/ops/signin");
    wrap(<SignInView />);
    await waitFor(() => expect(m.replace).toHaveBeenCalledWith("/ops"));
    cleanup(); m.replace.mockClear(); m.orgs.mockResolvedValue([]);
    wrap(<SignInView />);
    await waitFor(() => expect(m.replace).toHaveBeenCalledWith("/ops/start"));
  });
  it("wrong credentials show a clear message and focus it; a closed Google popup shows nothing", async () => {
    m.signInEmail.mockRejectedValue(Object.assign(new Error("x"), { code: "auth/invalid-credential" }));
    wrap(<SignInView />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@b.co" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret123" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Sign in" }).at(-1)!);
    expect((await screen.findByRole("alert")).textContent).toMatch(/don't match/);
    m.google.mockRejectedValue(Object.assign(new Error("x"), { code: "auth/popup-closed-by-user" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
    await waitFor(() => expect(m.google).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  });
  it("can't load workspaces after sign-in → retryable error, not a blank page", async () => {
    m.user = { email: "a@b.co" };
    m.orgs.mockRejectedValueOnce(new B2bError(0, "NETWORK", "x")).mockResolvedValue([org("o1", "/ops/o1/dashboard")]);
    wrap(<SignInView />);
    fireEvent.click(await screen.findByRole("button", { name: "Try again" }));
    await waitFor(() => expect(m.replace).toHaveBeenCalledWith("/ops/o1/dashboard"));
  });
});

describe("company start", () => {
  const fill = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

  it("a fresh account: 01 account, then 02 company creates the organisation once (no marketplace sign-up) and continues with the setup steps", async () => {
    wrap(<StartView />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Create your company account");
    m.createAccount.mockImplementation(async () => { m.user = { email: "n@b.co", displayName: "Ana" }; });
    fill("Your name", "Ana"); fill("Email", "n@b.co"); fill("Password", "longenough1");
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() => expect(m.createAccount).toHaveBeenCalledWith("n@b.co", "longenough1", "Ana"));
    cleanup();
    wrap(<StartView />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Tell us about your company");
    m.signup.mockResolvedValue({ org: { id: "org-9", name: "Costa", timezone: "Europe/Madrid", status: "ACTIVE" }, member: { id: "m1", roleId: "r", roleTemplate: "ADMIN" } });
    fill("Company name", "Costa Clima S.L."); fill("Country", "ES"); fill("Company phone (optional)", "+34 600 555 021");
    const submit = screen.getByRole("button", { name: "Create my workspace" });
    fireEvent.click(submit); fireEvent.click(submit); // a double click
    await waitFor(() => expect(m.replace).toHaveBeenCalledWith("/ops/org-9/setup"));
    expect(m.signup).toHaveBeenCalledTimes(1);
    expect(m.signup.mock.calls[0][0]).toMatchObject({ name: "Costa Clima S.L.", country: "ES", phone: "+34 600 555 021", locale: "en" });
  });
  it("the company currency is asked once, with the effective default pre-selected, and sent with the sign-up", async () => {
    m.user = { email: "a@b.co", displayName: "Ana" };
    m.effective = "USD"; // the user's remembered one
    m.signup.mockResolvedValue({ org: { id: "org-1", name: "C", timezone: "UTC", status: "ACTIVE" }, member: { id: "m1", roleId: "r", roleTemplate: "ADMIN" } });
    wrap(<StartView />);
    const box = screen.getByRole("combobox", { name: "Company currency" }) as HTMLInputElement;
    expect(box.value).toBe("USD · US Dollar ($)");
    fill("Company name", "Costa");
    fireEvent.click(screen.getByRole("button", { name: "Create my workspace" }));
    await waitFor(() => expect(m.signup).toHaveBeenCalledWith(expect.objectContaining({ currency: "USD" })));
    m.effective = "EUR";
  });
  it("picking another currency sends that one and remembers it for the next selector", async () => {
    m.user = { email: "a@b.co", displayName: "Ana" };
    m.signup.mockResolvedValue({ org: { id: "org-1", name: "C", timezone: "UTC", status: "ACTIVE" }, member: { id: "m1", roleId: "r", roleTemplate: "ADMIN" } });
    wrap(<StartView />);
    const box = screen.getByRole("combobox", { name: "Company currency" }) as HTMLInputElement;
    expect(box.value).toBe("EUR · Euro (€)");
    fireEvent.focus(box);
    fireEvent.change(box, { target: { value: "romanian" } });
    fireEvent.keyDown(box, { key: "Enter" });
    expect(m.remember).toHaveBeenCalledWith("RON");
    fill("Company name", "Costa");
    fireEvent.click(screen.getByRole("button", { name: "Create my workspace" }));
    await waitFor(() => expect(m.signup).toHaveBeenCalledWith(expect.objectContaining({ currency: "RON" })));
  });
  it("a company phone like '12' is refused on the client before any request; a national number needs a country", async () => {
    m.user = { email: "a@b.co", displayName: "Ana" };
    wrap(<StartView />);
    fill("Company name", "Costa");
    fill("Company phone (optional)", "12");
    fireEvent.click(screen.getByRole("button", { name: "Create my workspace" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/international format/);
    expect(m.signup).not.toHaveBeenCalled();
    fill("Company phone (optional)", "600 555 021");
    fill("Country", "");
    fireEvent.click(screen.getByRole("button", { name: "Create my workspace" }));
    await vi.waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/international format/));
    expect(m.signup).not.toHaveBeenCalled();
  });
  it("'Your name' is required on the company step (labelled, never an email), prefilled from the Google name and sent as adminDisplayName", async () => {
    m.user = { email: "ana@costa.es", displayName: "Ana Pop" };
    m.signup.mockResolvedValue({ org: { id: "org-7", name: "Costa", timezone: "UTC", status: "ACTIVE" }, member: { id: "m1", roleId: "r", roleTemplate: "ADMIN" } });
    wrap(<StartView />);
    const name = screen.getByLabelText("Your name") as HTMLInputElement;
    expect(name.value).toBe("Ana Pop");
    expect(name.required).toBe(true);
    fill("Company name", "Costa");
    fill("Your name", "");
    fireEvent.click(screen.getByRole("button", { name: "Create my workspace" }));
    expect((await screen.findByText("Enter your name.")).id).toBe(name.getAttribute("aria-describedby"));
    expect(name.getAttribute("aria-invalid")).toBe("true");
    expect(document.activeElement).toBe(name); // focus moves to the first error
    fill("Your name", "ana@costa.es");
    fireEvent.click(screen.getByRole("button", { name: "Create my workspace" }));
    expect(await screen.findByText("Enter your name, not an email address.")).toBeTruthy();
    expect(m.signup).not.toHaveBeenCalled();
    fill("Your name", "Ana Pop");
    fireEvent.click(screen.getByRole("button", { name: "Create my workspace" }));
    await waitFor(() => expect(m.signup).toHaveBeenCalledWith(expect.objectContaining({ adminDisplayName: "Ana Pop", name: "Costa" })));
  });
  it("a Google account whose name is an email does not prefill it", () => {
    m.user = { email: "ana@costa.es", displayName: "ana@costa.es" };
    wrap(<StartView />);
    expect((screen.getByLabelText("Your name") as HTMLInputElement).value).toBe("");
  });
  it("maps the API's 400 fields.adminDisplayName to the name field", async () => {
    m.user = { email: "a@b.co", displayName: "Ana" };
    m.signup.mockRejectedValueOnce(new B2bError(400, "VALIDATION_ERROR", "x", { fields: { adminDisplayName: "Enter your name" } }));
    wrap(<StartView />);
    fill("Company name", "Costa");
    fireEvent.click(screen.getByRole("button", { name: "Create my workspace" }));
    expect(await screen.findByText("Enter your name.")).toBeTruthy();
    expect(screen.getByLabelText("Your name").getAttribute("aria-invalid")).toBe("true");
    expect(document.activeElement).toBe(screen.getByLabelText("Your name"));
    expect(m.replace).not.toHaveBeenCalled();
  });
  it("short passwords are refused before any request; an existing account explains itself", async () => {
    wrap(<StartView />);
    fill("Email", "n@b.co"); fill("Password", "short");
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/8 characters/);
    expect(m.createAccount).not.toHaveBeenCalled();
    m.createAccount.mockRejectedValue(Object.assign(new Error("x"), { code: "auth/email-already-in-use" }));
    fill("Password", "longenough1");
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/already exists/));
    for (const a of screen.getAllByRole("link", { name: "Sign in" })) expect(a.getAttribute("href")).toBe("/ops/signin");
  });
  it("API problems on the company step are explained and the form stays usable", async () => {
    m.user = { email: "a@b.co", displayName: "Ana" };
    wrap(<StartView />);
    fill("Company name", "Costa");
    m.signup.mockRejectedValueOnce(new B2bError(409, "EMAIL_IN_USE", "x"));
    fireEvent.click(screen.getByRole("button", { name: "Create my workspace" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/already used by another sign-in/);
    m.signup.mockRejectedValueOnce(new B2bError(400, "VALIDATION_ERROR", "x"));
    fireEvent.click(screen.getByRole("button", { name: "Create my workspace" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/country code/));
    expect(m.replace).not.toHaveBeenCalled();
  });
  it("an employee on the way to an invitation only creates an account (no organisation) and continues to the invitation", async () => {
    open("/ops/start?redirect=%2Fb2b%2Finvite%2Ftok1");
    wrap(<StartView />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Create your account");
    expect(screen.queryByText("Company")).toBeNull();
    cleanup();
    m.user = { email: "e@b.co" };
    m.orgs.mockResolvedValue([]);
    wrap(<StartView />);
    await waitFor(() => expect(m.replace).toHaveBeenCalledWith("/b2b/invite/tok1"));
    expect(m.signup).not.toHaveBeenCalled();
  });
});
