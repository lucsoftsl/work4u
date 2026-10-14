import { describe, expect, it, vi } from "vitest";
import { isValidElement, type ReactElement } from "react";
import en from "@/locales/en.json";

class NotFound extends Error {}
vi.mock("next/navigation", () => ({ notFound: () => { throw new NotFound(); } }));
vi.mock("@/components/layout/SiteShell", () => ({ SiteShell: () => null }));
vi.mock("@/app/globals.css", () => ({}));

import PublicRootLayout, { dynamicParams, generateStaticParams } from "./layout";

const shellProps = async (lang: string) => {
  const el = await PublicRootLayout({ children: null, params: Promise.resolve({ lang }) });
  expect(isValidElement(el)).toBe(true);
  return (el as ReactElement<{ lang: string; initialLocale: string; initialDictionary?: Record<string, string> }>).props;
};

describe("public root layout", () => {
  it("only en, ro and es exist; anything else is a 404", async () => {
    expect(generateStaticParams()).toEqual([{ lang: "en" }, { lang: "ro" }, { lang: "es" }]);
    expect(dynamicParams).toBe(false);
    await expect(shellProps("fr")).rejects.toBeInstanceOf(NotFound);
    await expect(shellProps("xx")).rejects.toBeInstanceOf(NotFound);
  });
  it("<html lang> is the URL language, set on the server", async () => {
    expect((await shellProps("en")).lang).toBe("en");
    expect((await shellProps("ro")).lang).toBe("ro");
    expect((await shellProps("es")).lang).toBe("es");
  });
  it("English ships no extra dictionary (it is bundled); ro / es pass only their own, without admin / B2B-app strings", async () => {
    expect((await shellProps("en")).initialDictionary).toBeUndefined();
    const ro = (await shellProps("ro")).initialDictionary!;
    expect(ro["nav.findJobs"]).toBeTruthy();
    expect(ro["nav.findJobs"]).not.toBe((en as Record<string, string>)["nav.findJobs"]);
    expect(Object.keys(ro).some((k) => k.startsWith("admin") || k.startsWith("b2b."))).toBe(false);
  });
});
