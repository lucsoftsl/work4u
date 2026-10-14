import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { cleanup, render } from "@testing-library/react";
import { FeaturedHelperCard } from "./ui";

vi.mock("@/lib/i18n", () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock("next/link", () => ({ default: ({ href, children, ...r }: { href: string; children: React.ReactNode }) => <a href={href} {...r}>{children}</a> }));

const viewport = (desktop: boolean) =>
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: desktop && query === "(min-width: 768px)", addEventListener: () => undefined, removeEventListener: () => undefined }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("home hero image (mobile: a hero image must never be requested on phones)", () => {
  it("the server HTML has no <img>, <picture>, <source> or image URL at all: nothing for a phone to download or preload", () => {
    const html = renderToString(<FeaturedHelperCard imageUrl="/assets/welcome1.png" helper={undefined} />);
    expect(html).not.toMatch(/<img|<picture|<source|welcome1|_next\/image/);
    expect(html).toContain("aspect-[4/3]"); // the box is reserved, so adding the image later cannot shift the layout
  });
  it("a phone-width viewport never creates the <img>, even after hydration", () => {
    viewport(false);
    const { container } = render(<FeaturedHelperCard imageUrl="/assets/welcome1.png" helper={undefined} />);
    expect(container.querySelector("img, picture")).toBeNull();
  });
  it(">= 768px adds the optimised /_next/image variants after hydration, with explicit size, no high-priority hint", () => {
    viewport(true);
    const { container } = render(<FeaturedHelperCard imageUrl="/assets/welcome1.png" helper={undefined} />);
    const img = container.querySelector("img")!;
    expect(img.getAttribute("srcset")).toMatch(/_next\/image\?url=%2Fassets%2Fwelcome1\.png/);
    expect(img.getAttribute("width")).toBe("640");
    expect(img.getAttribute("height")).toBe("480");
    expect(img.getAttribute("fetchpriority")).toBeNull();
  });
});
