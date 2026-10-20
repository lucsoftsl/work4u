import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import en from "@/locales/en.json";
import ro from "@/locales/ro.json";
import es from "@/locales/es.json";
import { JOB_STATUS_META, TEAM_STATUS_LABEL } from "./status";
import { jobStatusKey, jobStatusLabel, teamStatusKey, teamStatusLabel } from "./status-label";

const dict = (d: unknown) => d as Record<string, string>;
const union = (name: string, file: string): string[] => {
  const src = fs.readFileSync(path.join(__dirname, "..", "api", file), "utf8");
  const m = new RegExp(`export type ${name} =([^;]+);`).exec(src);
  return [...(m?.[1] ?? "").matchAll(/"([A-Z_]+)"/g)].map((x) => x[1]);
};

// The lists come from the type declarations themselves, so a status added to the API types without a label fails here.
const JOB = union("JobStatus", "types.ts");
const TEAM = union("TeamStatus", "types.ts");

describe("every status has a label key in en / ro / es", () => {
  it("reads the enums (this guard cannot pass by finding nothing)", () => {
    expect(JOB.length).toBeGreaterThanOrEqual(15);
    expect(JOB).toContain("EN_ROUTE");
    expect(TEAM).toEqual(expect.arrayContaining(["AVAILABLE", "TRAVELLING", "OFFLINE"]));
  });
  it("the in-code fallback table covers every status too", () => {
    expect(Object.keys(JOB_STATUS_META).sort()).toEqual([...JOB].sort());
    expect(Object.keys(TEAM_STATUS_LABEL).sort()).toEqual([...TEAM].sort());
  });
  it.each([["en", en], ["ro", ro], ["es", es]])("%s: job and team status keys exist and are not empty", (_name, d) => {
    const missing = [...JOB.map(jobStatusKey), ...TEAM.map(teamStatusKey)].filter((k) => !dict(d)[k]?.trim());
    expect(missing).toEqual([]);
  });
  it("English equals the in-code fallback (the locale test's rule)", () => {
    for (const s of JOB) expect(dict(en)[jobStatusKey(s)]).toBe(JOB_STATUS_META[s as keyof typeof JOB_STATUS_META].label);
    for (const s of TEAM) expect(dict(en)[teamStatusKey(s)]).toBe(TEAM_STATUS_LABEL[s as keyof typeof TEAM_STATUS_LABEL]);
  });
  it("Romanian and Spanish are really translated (not the English word) for the field statuses", () => {
    for (const s of ["EN_ROUTE", "ON_SITE", "IN_PROGRESS", "COMPLETED", "SCHEDULED", "CANCELLED"]) {
      expect(dict(ro)[jobStatusKey(s)], `ro ${s}`).not.toBe(dict(en)[jobStatusKey(s)]);
      expect(dict(es)[jobStatusKey(s)], `es ${s}`).not.toBe(dict(en)[jobStatusKey(s)]);
    }
  });
});

describe("jobStatusLabel / teamStatusLabel", () => {
  const tRo = (k: string, f: string) => dict(ro)[k] ?? f;
  it("uses the language's name, the English one without a translator", () => {
    expect(jobStatusLabel(tRo, "EN_ROUTE")).toBe("În drum");
    expect(jobStatusLabel((_k, f) => f, "EN_ROUTE")).toBe("En route");
    expect(teamStatusLabel(tRo, "TRAVELLING")).toBe("În deplasare");
  });
  it("an unknown status from a newer API is shown readable, never as a raw code", () => {
    expect(jobStatusLabel(tRo, "WAITING_FOR_CLIENT")).toBe("waiting for client");
  });
});
