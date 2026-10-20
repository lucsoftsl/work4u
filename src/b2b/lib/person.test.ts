import { describe, expect, it } from "vitest";
import { isEmailLike, personInitial, personName, personNameProblem, personSortKey } from "./person";

describe("person names (ticket d886968d: never show an email as a name)", () => {
  it("shows a real name, trimmed", () => {
    expect(personName("  Ana Pop ", "Team member")).toBe("Ana Pop");
  });
  it("uses the translated fallback for null, empty or blank names", () => {
    for (const v of [null, undefined, "", "   "]) expect(personName(v, "Team member"), String(v)).toBe("Team member");
  });
  it("never shows an email, even if an older API or cache still sends one as the name", () => {
    expect(personName("ana.pop@hotel-marina.es", "Membru al echipei")).toBe("Membru al echipei");
    expect(personName("Ana <ana@x.es>", "Team member")).toBe("Team member");
    expect(isEmailLike("ana@x.es")).toBe(true);
    expect(isEmailLike("Ana Pop")).toBe(false);
  });
  it("initials come from a real name only, never from an email", () => {
    expect(personInitial("ana pop")).toBe("A");
    expect(personInitial("ana@x.es")).toBeNull();
    expect(personInitial(null)).toBeNull();
    expect(personInitial("  ")).toBeNull();
  });
  it("a name typed by the person is required and cannot be an email", () => {
    expect(personNameProblem("")).toBe("required");
    expect(personNameProblem("ana@x.es")).toBe("email");
    expect(personNameProblem(" Ana ")).toBeNull();
  });
});

describe("personSortKey", () => {
  it("puts unnamed people last", () => {
    expect(["b", null, "a@x.es", "A"].map((n) => personSortKey(n)).sort()).toEqual(["a", "b", "\uffff", "\uffff"]);
  });
});
