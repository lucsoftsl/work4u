import { describe, expect, it } from "vitest";
import { B2bError } from "@/b2b/api/client";
import type { ImportRow } from "../api";
import { buildImportOptions, buildMapRows, classifyUploadError, commitMode, initialOptionsState, isConfirmTyped, needsTypedConfirm, nextPollDelay, progressPercent, rowKeyValues, setHeaderField, sortPreviewRows, unwrapRows } from "./importLogic";

const fileErr = (status: number, csvCode: string, extra: Record<string, unknown> = {}) =>
  new B2bError(status, "IMPORT_FILE_INVALID", "x", { details: { csvCode, ...extra } });

describe("classifyUploadError", () => {
  it("maps csvCode to a file error", () => {
    expect(classifyUploadError(fileErr(400, "ENCODING_NOT_UTF8"))).toEqual({ kind: "file", code: "ENCODING_NOT_UTF8" });
    expect(classifyUploadError(fileErr(413, "TOO_LARGE"))).toEqual({ kind: "file", code: "TOO_LARGE" });
  });
  it("maps MISSING_COLUMNS to the mapping step data", () => {
    const e = new B2bError(422, "IMPORT_FILE_INVALID", "x", { details: { csvCode: "MISSING_COLUMNS" }, missing: ["name"], headers: ["A"], knownFields: ["name", "email"] });
    expect(classifyUploadError(e)).toEqual({ kind: "missing", missing: ["name"], headers: ["A"], knownFields: ["name", "email"] });
  });
  it("reads missing from details too", () => {
    const e = fileErr(422, "MISSING_COLUMNS", { missing: ["name"], headers: ["A"], knownFields: ["name"] });
    expect(classifyUploadError(e)).toMatchObject({ kind: "missing", missing: ["name"] });
  });
  it("falls back to HTTP status", () => {
    expect(classifyUploadError(new B2bError(415, "IMPORT_FILE_INVALID", "x", {}))).toEqual({ kind: "file", code: "UNSUPPORTED_FILE_TYPE" });
  });
  it("leaves other errors alone", () => {
    expect(classifyUploadError(new Error("x")).kind).toBe("other");
    expect(classifyUploadError(new B2bError(409, "IMPORT_IN_PROGRESS", "x", {})).kind).toBe("other");
  });
});

describe("buildImportOptions", () => {
  it("sends only known, relevant keys for employees", () => {
    const s = { ...initialOptionsState("employees", "ro"), createMissingTeams: true, matchByName: true, encoding: "windows-1250", mapping: { name: "Nume", email: "" } };
    expect(buildImportOptions(s)).toEqual({ defaultCountry: "RO", createMissingTeams: true, encoding: "windows-1250", mapping: { name: "Nume" } });
  });
  it("sends matchByName only for customers and ignores bad country/encoding", () => {
    const s = { ...initialOptionsState("customers", "xyz"), matchByName: true, createMissingSkills: true, encoding: "latin" };
    expect(buildImportOptions(s)).toEqual({ matchByName: true });
  });
});

describe("mapping helpers", () => {
  it("builds rows with matched and skipped", () => {
    expect(buildMapRows(["Nume", "Foo"], { name: "Nume" })).toEqual([
      { header: "Nume", field: "name", status: "matched" },
      { header: "Foo", field: "", status: "skipped" },
    ]);
  });
  it("marks unmapped headers as needing mapping when required fields are missing", () => {
    expect(buildMapRows(["A"], {}, ["name"])[0].status).toBe("needs");
  });
  it("moves a header to another field without duplicates", () => {
    expect(setHeaderField({ name: "A" }, "A", "email")).toEqual({ email: "A" });
    expect(setHeaderField({ name: "A" }, "A", "")).toEqual({});
    expect(setHeaderField({ name: "A" }, "B", "name")).toEqual({ name: "B" });
  });
});

describe("preview and commit rules", () => {
  const row = (n: number, action: ImportRow["action"]): ImportRow => ({ row: n, action, applied: false, match: null, values: null, errors: [], warnings: [] });
  it("puts error rows first and caps", () => {
    const rows = [row(1, "CREATE"), row(2, "ERROR"), row(3, "UPDATE")];
    expect(sortPreviewRows(rows).map((r) => r.row)).toEqual([2, 1, 3]);
    expect(sortPreviewRows(rows, true).map((r) => r.row)).toEqual([2]);
    expect(sortPreviewRows(rows, false, 2)).toHaveLength(2);
  });
  it("decides the commit mode", () => {
    expect(commitMode({ create: 0, update: 0, skip: 2, error: 1, warning: 0 })).toBe("blocked");
    expect(commitMode({ create: 3, update: 0, skip: 0, error: 1, warning: 0 })).toBe("skip");
    expect(commitMode({ create: 3, update: 1, skip: 0, error: 0, warning: 0 })).toBe("all");
  });
  it("requires typed confirmation above 500 rows", () => {
    expect(needsTypedConfirm(500)).toBe(false);
    expect(needsTypedConfirm(501)).toBe(true);
    expect(isConfirmTyped(" import ", "IMPORT")).toBe(true);
    expect(isConfirmTyped("imp", "IMPORT")).toBe(false);
  });
  it("unwraps rows responses", () => {
    expect(unwrapRows([row(1, "SKIP")])).toHaveLength(1);
    expect(unwrapRows({ items: [row(1, "SKIP")] })).toHaveLength(1);
    expect(unwrapRows({ rows: [] })).toHaveLength(0);
  });
  it("summarises values", () => expect(rowKeyValues({ name: "Ana", a: null, o: {}, email: "a@b.c", x: 1, y: 2 })).toBe("Ana · a@b.c · 1"));
});

describe("polling", () => {
  it("polls only while COMMITTING and backs off when hidden", () => {
    expect(nextPollDelay("COMMITTING", false)).toBe(2000);
    expect(nextPollDelay("COMMITTING", true)).toBeGreaterThan(2000);
    expect(nextPollDelay("DONE", false)).toBeNull();
    expect(nextPollDelay("FAILED", false)).toBeNull();
  });
  it("computes progress", () => {
    expect(progressPercent(5, 10)).toBe(50);
    expect(progressPercent(5, 0)).toBe(0);
    expect(progressPercent(20, 10)).toBe(100);
  });
});
