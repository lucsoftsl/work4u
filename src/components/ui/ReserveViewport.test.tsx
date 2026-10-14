import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import JobsLayout from "@/app/(public)/[lang]/jobs/layout";
import BlogLayout from "@/app/(public)/[lang]/blog/layout";
import WorkersLayout from "@/app/(public)/[lang]/workers/layout";

describe("streamed sections reserve the viewport (footer must not paint above the arriving list)", () => {
  for (const [name, Layout] of [["jobs", JobsLayout], ["blog", BlogLayout], ["workers", WorkersLayout]] as const) {
    it(`/${name} (list and detail pages) are wrapped with a viewport-high minimum`, () => {
      const html = renderToString(<Layout><p>child</p></Layout>);
      expect(html).toContain("data-reserve-viewport");
      expect(html).toContain("min-h-[calc(100svh-3.5rem)]");
      expect(html).toContain("md:min-h-[calc(100svh-var(--header-h))]");
      expect(html).toContain("<p>child</p>");
    });
  }
});
