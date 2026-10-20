import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import ro from "@/locales/ro.json";
import es from "@/locales/es.json";

const nav = vi.hoisted(() => ({ path: "/ops/o/jobs" }));
const lang = vi.hoisted(() => ({ dict: {} as Record<string, string>, locale: "en" }));
vi.mock("@/lib/i18n", () => ({ useTranslation: () => ({ locale: lang.locale, t: (k: string, f?: string) => lang.dict[k] ?? f ?? k }) }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.path }));
import { RouteTitle, buildTitle } from "./RouteTitle";
import { setTitleState } from "@/b2b/lib/title-store";

const tIn = (d: Record<string, string>) => (k: string, f: string) => d[k] ?? f;
afterEach(() => { lang.dict = {}; lang.locale = "en"; nav.path = "/ops/o/jobs"; });

describe("buildTitle", () => {
  it("names a section in the language", () => {
    expect(buildTitle("/ops/o/settings/team", {}, tIn(ro as Record<string, string>))).toBe("Echipă și angajați · Work4U");
    expect(buildTitle("/ops/o/review", {}, tIn(ro as Record<string, string>))).toBe("Coadă de verificare · Work4U");
    expect(buildTitle("/ops/o/notifications", {}, tIn(es as Record<string, string>))).toBe("Notificaciones · Work4U");
  });
  it("puts the job reference and the open tab in a job title", () => {
    const t = tIn(ro as Record<string, string>);
    expect(buildTitle("/ops/o/jobs/j1", { jobRef: "JOB-1003", tab: "schedule" }, t)).toBe("Lucrarea JOB-1003 · Program și echipă · Work4U");
    expect(buildTitle("/ops/o/jobs/j1", { jobRef: "JOB-1003", tab: "files" }, t)).toBe("Lucrarea JOB-1003 · Fișiere · Work4U");
    expect(buildTitle("/ops/o/jobs/j1", {}, t)).toBe("Lucrare · Work4U");
  });
  it("the technician job has no tab and the field brand", () => {
    expect(buildTitle("/tech/o/jobs/j1", { jobRef: "JOB-9", tab: "files" }, (_k, f) => f)).toBe("Job JOB-9 · Work4U Field");
  });
  it("a 404 is named whatever the address was", () => {
    expect(buildTitle("/ops/o/whatever", { notFound: true }, tIn(ro as Record<string, string>))).toBe("Pagina nu a fost găsită · Work4U");
    expect(buildTitle("/ops/o/whatever", {}, (_k, f) => f)).toBeNull();
  });
});

describe("RouteTitle", () => {
  it("sets the title, follows the tab, and puts it back if Next changes it", async () => {
    lang.dict = ro as Record<string, string>; lang.locale = "ro";
    nav.path = "/ops/o/jobs/j1";
    const { unmount } = render(<RouteTitle />);
    let release = () => {};
    act(() => { release = setTitleState({ jobRef: "JOB-1003", tab: "timeline" }); });
    expect(document.title).toBe("Lucrarea JOB-1003 · Cronologie · Work4U");
    act(() => { release(); release = setTitleState({ jobRef: "JOB-1003", tab: "files" }); });
    expect(document.title).toBe("Lucrarea JOB-1003 · Fișiere · Work4U");
    // Next writes its own metadata title after a client navigation
    document.title = "Jobs | Operations · Work4U Ops";
    await new Promise((r) => setTimeout(r, 20));
    expect(document.title).toBe("Lucrarea JOB-1003 · Fișiere · Work4U");
    release();
    unmount();
  });
});
