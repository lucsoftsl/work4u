import { describe, expect, it } from "vitest";
import ro from "@/locales/ro.json";
import es from "@/locales/es.json";
import { blockedReason } from "./transitions";
import { transitionDone, transitionVerb } from "./transition-text";

const T = (d: unknown) => (k: string, f: string) => (d as Record<string, string>)[k] ?? f;
const en = (_k: string, f: string) => f;

describe("status move wording", () => {
  it("English is what it always was", () => {
    expect(transitionVerb(en, "EN_ROUTE")).toBe("Move to En route");
    expect(transitionVerb(en, "DISPATCHED")).toBe("Move to Team dispatched");
    expect(transitionVerb(en, "CANCELLED")).toBe("Cancel job");
    expect(transitionVerb(en, "BLOCKED")).toBe("Mark blocked");
    expect(transitionDone(en, "JOB-1001", "ON_SITE")).toBe("JOB-1001 is now On site");
  });
  it("Romanian: the status name is the Romanian one, in a Romanian sentence", () => {
    expect(transitionVerb(T(ro), "EN_ROUTE")).toBe("Treci la „În drum”");
    expect(transitionVerb(T(ro), "IN_PROGRESS")).toBe("Treci la „În lucru”");
    expect(transitionVerb(T(ro), "CANCELLED")).toBe("Anulează lucrarea");
    expect(transitionDone(T(ro), "JOB-1001", "ON_SITE")).toBe("JOB-1001 este acum „La fața locului”");
  });
  it("Spanish likewise", () => {
    expect(transitionVerb(T(es), "EN_ROUTE")).toBe("Pasar a «En camino»");
    expect(transitionDone(T(es), "JOB-1001", "COMPLETED")).toBe("JOB-1001 está ahora «Completado»");
  });
  it("the reasons a move is not offered are translated too", () => {
    expect(blockedReason({ status: "READY_TO_SCHEDULE" } as never, "SCHEDULED", T(ro))).toBe("Stabilește mai întâi o fereastră de timp");
    expect(blockedReason({ status: "READY_TO_SCHEDULE", scheduledStart: "a", scheduledEnd: "b" } as never, "SCHEDULED", T(es))).toBe("Asigna primero un equipo o técnico");
    expect(blockedReason({ status: "READY_TO_SCHEDULE" } as never, "SCHEDULED")).toBe("Set a time window first");
  });
});
