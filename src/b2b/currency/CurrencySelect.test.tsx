import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import axe from "axe-core";
import ro from "@/locales/ro.json";
import en from "@/locales/en.json";
import type { CurrencyInfo } from "./search";

const lang = vi.hoisted(() => ({ dict: {} as Record<string, string>, locale: "en" }));
vi.mock("@/lib/i18n", () => ({ useTranslation: () => ({ locale: lang.locale, t: (k: string, f?: string) => lang.dict[k] ?? f ?? k }) }));
const list = vi.hoisted(() => ({ value: { items: [] as CurrencyInfo[], status: "ready" as "ready" | "loading" | "error", refetch: vi.fn() } }));
vi.mock("./useCurrencies", () => ({ useCurrencies: () => list.value }));
import { CurrencySelect } from "./CurrencySelect";

const c = (code: string, name: string, symbol = code, popular = false, minorUnits = 2): CurrencyInfo => ({ code, name, symbol, minorUnits, popular });
const EN_LIST = [c("EUR", "Euro", "€", true), c("USD", "US Dollar", "$", true), c("RON", "Romanian Leu", "RON", true), c("AUD", "Australian Dollar", "A$"), c("JPY", "Japanese Yen", "¥", false, 0), c("MDL", "Moldovan Leu")];
const RO_LIST = [c("EUR", "euro", "€", true), c("RON", "leu românesc", "RON", true), c("MDL", "leu moldovenesc"), c("JPY", "yen japonez", "¥", false, 0)];

afterEach(() => { cleanup(); lang.dict = {}; lang.locale = "en"; list.value = { items: EN_LIST, status: "ready", refetch: vi.fn() }; });

function Harness({ initial = "EUR", onChange = () => {}, ...rest }: { initial?: string; onChange?: (v: string) => void } & Partial<React.ComponentProps<typeof CurrencySelect>>) {
  const [v, setV] = useState(initial);
  return <CurrencySelect label="Currency" value={v} onChange={(x) => { setV(x); onChange(x); }} {...rest} />;
}
const box = () => screen.getByRole("combobox", { name: "Currency" }) as HTMLInputElement;
const options = () => screen.queryAllByRole("option").map((o) => o.textContent);

describe("CurrencySelect: ARIA combobox", () => {
  it("is a labelled combobox that shows the chosen currency as 'EUR · Euro (€)'", () => {
    list.value = { items: EN_LIST, status: "ready", refetch: vi.fn() };
    render(<Harness />);
    expect(box().value).toBe("EUR · Euro (€)");
    expect(box().getAttribute("aria-expanded")).toBe("false");
    expect(box().getAttribute("aria-autocomplete")).toBe("list");
    expect(box().getAttribute("aria-controls")).toBeTruthy();
  });
  it("opens with the arrow key, popular first and then A to Z, and tells the screen reader how many", () => {
    list.value = { items: EN_LIST, status: "ready", refetch: vi.fn() };
    render(<Harness />);
    fireEvent.keyDown(box(), { key: "ArrowDown" });
    expect(box().getAttribute("aria-expanded")).toBe("true");
    expect(options()).toEqual(["EUR · Euro (€)", "USD · US Dollar ($)", "RON · Romanian Leu", "AUD · Australian Dollar (A$)", "JPY · Japanese Yen (¥)", "MDL · Moldovan Leu"]);
    const groups = screen.getAllByRole("group").map((g) => g.getAttribute("aria-label"));
    expect(groups).toEqual(["Popular", "All currencies"]);
    expect(screen.getByRole("status").textContent).toBe("6 currencies available");
    // the current one is the selected option and the active one
    expect(screen.getByRole("option", { name: /^EUR/ }).getAttribute("aria-selected")).toBe("true");
    expect(box().getAttribute("aria-activedescendant")).toBe(screen.getByRole("option", { name: /^EUR/ }).id);
  });
  it("arrow keys move the active option, Home and End jump, Enter selects and closes with focus kept on the input", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    box().focus();
    fireEvent.keyDown(box(), { key: "ArrowDown" });
    fireEvent.keyDown(box(), { key: "ArrowDown" });
    expect(box().getAttribute("aria-activedescendant")).toBe(screen.getByRole("option", { name: /^USD/ }).id);
    fireEvent.keyDown(box(), { key: "End" });
    expect(box().getAttribute("aria-activedescendant")).toBe(screen.getByRole("option", { name: /^MDL/ }).id);
    fireEvent.keyDown(box(), { key: "Home" });
    fireEvent.keyDown(box(), { key: "ArrowUp" });
    expect(box().getAttribute("aria-activedescendant")).toBe(screen.getByRole("option", { name: /^MDL/ }).id);
    fireEvent.keyDown(box(), { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("MDL");
    expect(box().getAttribute("aria-expanded")).toBe("false");
    expect(box().value).toBe("MDL · Moldovan Leu");
    expect(document.activeElement).toBe(box());
  });
  it("Escape closes without changing and puts the text back", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    box().focus();
    fireEvent.change(box(), { target: { value: "yen" } });
    expect(box().getAttribute("aria-expanded")).toBe("true");
    fireEvent.keyDown(box(), { key: "Escape" });
    expect(box().getAttribute("aria-expanded")).toBe("false");
    expect(box().value).toBe("EUR · Euro (€)");
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("CurrencySelect: type to filter", () => {
  it("by code", () => {
    render(<Harness />);
    box().focus();
    fireEvent.change(box(), { target: { value: "jp" } });
    expect(options()).toEqual(["JPY · Japanese Yen (¥)"]);
  });
  it("by the localized name, in Romanian, without accents", () => {
    lang.locale = "ro"; lang.dict = ro as Record<string, string>;
    list.value = { items: RO_LIST, status: "ready", refetch: vi.fn() };
    render(<Harness initial="EUR" />);
    box().focus();
    fireEvent.change(box(), { target: { value: "romanesc" } });
    expect(options()).toEqual(["RON · leu românesc"]);
    fireEvent.change(box(), { target: { value: "leu" } });
    expect(options()).toEqual(["RON · leu românesc", "MDL · leu moldovenesc"]);
  });
  it("Enter picks the first match when none is highlighted yet", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    box().focus();
    fireEvent.change(box(), { target: { value: "dollar" } });
    fireEvent.keyDown(box(), { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("USD");
  });
  it("says so when nothing matches, and Enter does nothing", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    box().focus();
    fireEvent.change(box(), { target: { value: "zzz" } });
    expect(options()).toEqual([]);
    expect(screen.getByRole("status").textContent).toMatch(/No currency matches/);
    fireEvent.keyDown(box(), { key: "Enter" });
    expect(onChange).not.toHaveBeenCalled();
  });
  it("a click on an option selects it", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    fireEvent.keyDown(box(), { key: "ArrowDown" });
    fireEvent.click(screen.getByRole("option", { name: /^AUD/ }));
    expect(onChange).toHaveBeenCalledWith("AUD");
  });
  it("blur closes and discards what was typed", () => {
    render(<Harness />);
    box().focus();
    fireEvent.change(box(), { target: { value: "yen" } });
    fireEvent.blur(box());
    expect(box().getAttribute("aria-expanded")).toBe("false");
    expect(box().value).toBe("EUR · Euro (€)");
  });
});

describe("CurrencySelect: states", () => {
  it("shows the chosen currency even before the list has loaded, and says it is loading", () => {
    list.value = { items: [], status: "loading", refetch: vi.fn() };
    render(<Harness initial="CHF" />);
    expect(box().value).toBe("CHF");
    fireEvent.keyDown(box(), { key: "ArrowDown" });
    expect(screen.getByRole("status").textContent).toBe("Loading currencies…");
  });
  it("on error keeps the common currencies usable and offers a retry", () => {
    const refetch = vi.fn();
    list.value = { items: EN_LIST.slice(0, 3), status: "error", refetch };
    render(<Harness />);
    expect(screen.getByRole("alert").textContent).toMatch(/Couldn't load the full currency list/);
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(refetch).toHaveBeenCalled();
    fireEvent.keyDown(box(), { key: "ArrowDown" });
    expect(options()).toHaveLength(3);
  });
  it("a value that is not in the list is still shown and selectable", () => {
    render(<Harness initial="XOF" />);
    expect(box().value).toBe("XOF");
  });
  it("disabled and read-only cannot be opened", () => {
    render(<Harness disabled />);
    fireEvent.keyDown(box(), { key: "ArrowDown" });
    expect(box().getAttribute("aria-expanded")).toBe("false");
    expect(box().disabled).toBe(true);
  });
  it("locked: stays focusable (an error can point at it) but cannot be opened or typed into", () => {
    const onChange = vi.fn();
    render(<Harness locked onChange={onChange} />);
    box().focus();
    expect(document.activeElement).toBe(box());
    expect(box().getAttribute("aria-disabled")).toBe("true");
    fireEvent.keyDown(box(), { key: "ArrowDown" });
    fireEvent.change(box(), { target: { value: "yen" } });
    fireEvent.click(box());
    expect(box().getAttribute("aria-expanded")).toBe("false");
    expect(onChange).not.toHaveBeenCalled();
  });
  it("shows an error and a hint, both described for the screen reader", () => {
    render(<Harness error="Choose a currency from the list." hint="Sets the company currency." />);
    const described = box().getAttribute("aria-describedby")!.split(" ").map((id) => document.getElementById(id)?.textContent);
    expect(described).toContain("Choose a currency from the list.");
    expect(described).toContain("Sets the company currency.");
    expect(box().getAttribute("aria-invalid")).toBe("true");
  });
  it("the input and the options meet the 44px touch target", () => {
    render(<Harness />);
    fireEvent.keyDown(box(), { key: "ArrowDown" });
    expect(box().className).toContain("min-h-[44px]");
    expect(screen.getAllByRole("option")[0].className).toContain("min-h-[44px]");
  });
  it("fits 320 to 1440 px: full width of its column, long localized names wrap, the list scrolls inside itself", () => {
    list.value = { items: [...EN_LIST, c("XCD", "Dolar al Teritoriului Insulelor din Caraibele de Est (monedă comună)", "EC$")], status: "ready", refetch: vi.fn() };
    render(<Harness />);
    fireEvent.keyDown(box(), { key: "ArrowDown" });
    const listbox = screen.getByRole("listbox");
    expect(listbox.className).toContain("w-full");
    expect(listbox.className).toContain("max-h-72");
    expect(listbox.className).toContain("overflow-y-auto");
    expect(box().className).toContain("w-full");
    expect(box().className).toContain("text-base"); // 16 px on phones: no zoom on focus
    const long = screen.getByRole("option", { name: /^XCD/ });
    expect(long.firstElementChild?.className).toContain("break-words");
  });
  it("uses Spanish/Romanian strings from the dictionary", () => {
    lang.locale = "ro"; lang.dict = ro as Record<string, string>;
    list.value = { items: RO_LIST, status: "ready", refetch: vi.fn() };
    render(<Harness />);
    fireEvent.keyDown(box(), { key: "ArrowDown" });
    expect(screen.getAllByRole("group").map((g) => g.getAttribute("aria-label"))).toEqual([ro["b2b.currency.popular"], ro["b2b.currency.all"]]);
    expect(en["b2b.currency.popular" as keyof typeof en]).toBe("Popular");
  });
});

describe("CurrencySelect: accessibility", () => {
  it("has no axe violations closed or open", async () => {
    const { container } = render(<Harness hint="Sets the company currency." />);
    const run = async () => (await axe.run(container, { rules: { "color-contrast": { enabled: false } } })).violations.map((v) => `${v.id}: ${v.nodes[0]?.html.slice(0, 80)}`);
    expect(await run()).toEqual([]);
    fireEvent.keyDown(box(), { key: "ArrowDown" });
    expect(await run()).toEqual([]);
  });
});
