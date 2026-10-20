import { describe, expect, it } from "vitest";
import ro from "@/locales/ro.json";
import es from "@/locales/es.json";
import { B2bError } from "@/b2b/api/client";
import { classifyError } from "./classify";
import { plural } from "@/b2b/lib/plural";

const tIn = (d: Record<string, string>) => (k: string, f: string) => d[k] ?? f;

describe("a job that changed while the technician was offline", () => {
  it("names the current status in the technician's language, not 'en route'", () => {
    const err = new B2bError(409, "INVALID_TRANSITION", "x", { currentStatus: "EN_ROUTE" });
    const v = classifyError(err, "Gata.", tIn(ro as Record<string, string>));
    expect(v.kind).toBe("conflict");
    expect(v.message).toContain(`„${(ro as Record<string, string>)["b2b.status.job.EN_ROUTE"]}”`);
    expect(v.message).not.toMatch(/en route/i);
    const w = classifyError(err, "Listo.", tIn(es as Record<string, string>));
    expect(w.message).toContain(`«${(es as Record<string, string>)["b2b.status.job.EN_ROUTE"]}»`);
  });
  it("the draft summary follows Romanian plural rules (1, 2-19, 20+ with 'de')", () => {
    const t = tIn(ro as Record<string, string>);
    const text = { one: "Your notes and {n} photo is saved as a draft.", other: "Your notes and {n} photos are saved as a draft." };
    const s = (n: number) => plural(t, "ro", "b2b.tech.err.draftPhotos", text, n);
    expect(s(1)).toContain("1 fotografie");
    expect(s(3)).toContain("3 fotografii");
    expect(s(20)).toContain("20 de fotografii");
  });
});
