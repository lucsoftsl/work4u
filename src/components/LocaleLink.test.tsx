import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import LocaleLink from "./LocaleLink";

const m = vi.hoisted(() => ({ locale: "en" }));
vi.mock("next/link", () => ({ default: ({ href, children, ...r }: { href: unknown; children: React.ReactNode }) => <a href={typeof href === "string" ? href : JSON.stringify(href)} {...r}>{children}</a> }));
vi.mock("@/lib/i18n", () => ({ useTranslation: () => ({ locale: m.locale }) }));
afterEach(() => { cleanup(); m.locale = "en"; });

const hrefOf = (name: string) => screen.getByRole("link", { name }).getAttribute("href");

describe("LocaleLink (language-aware internal links)", () => {
  it("keeps the visitor's language on public pages, query and hash included", () => {
    m.locale = "ro";
    render(<><LocaleLink href="/jobs?category=x">a</LocaleLink><LocaleLink href="/">home</LocaleLink><LocaleLink href="/blog/tips-1#top">c</LocaleLink></>);
    expect(hrefOf("a")).toBe("/ro/jobs?category=x");
    expect(hrefOf("home")).toBe("/ro");
    expect(hrefOf("c")).toBe("/ro/blog/tips-1#top");
  });
  it("leaves English, private routes, external links and fr/hu alone", () => {
    render(<><LocaleLink href="/jobs">a</LocaleLink><LocaleLink href="/dashboard">b</LocaleLink></>);
    expect(hrefOf("a")).toBe("/jobs");
    cleanup();
    m.locale = "es";
    render(<><LocaleLink href="/dashboard">b</LocaleLink><LocaleLink href="https://example.com/jobs">x</LocaleLink><LocaleLink href="/jobs/1/edit">e</LocaleLink></>);
    expect(hrefOf("b")).toBe("/dashboard");
    expect(hrefOf("x")).toBe("https://example.com/jobs");
    expect(hrefOf("e")).toBe("/jobs/1/edit");
    cleanup();
    m.locale = "fr";
    render(<LocaleLink href="/jobs">a</LocaleLink>);
    expect(hrefOf("a")).toBe("/jobs");
  });
  it("supports object hrefs", () => {
    m.locale = "ro";
    render(<LocaleLink href={{ pathname: "/pricing", query: { a: 1 } }}>p</LocaleLink>);
    expect(JSON.parse(hrefOf("p")!)).toEqual({ pathname: "/ro/pricing", query: { a: 1 } });
  });
});
