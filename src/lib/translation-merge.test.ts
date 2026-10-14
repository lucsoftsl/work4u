import { describe, expect, it } from "vitest";
import { describeMerge, mergeTranslations } from "../../scripts/translation-merge-lib.mjs";

describe("translation merge (build sync)", () => {
  const local = { "a.keep": "local only", "a.same": "same", "a.change": "old", "a.blank": "real text", "b2b.invite.title": "Invitation" };
  const db = { "a.same": "same", "a.change": "new from DB", "a.blank": "   ", "a.new": "added by admin" };

  it("DB values override existing keys and new DB keys are added", () => {
    const r = mergeTranslations(local, db);
    expect(r.merged["a.change"]).toBe("new from DB");
    expect(r.merged["a.new"]).toBe("added by admin");
    expect(r.changed).toEqual(["a.change"]);
    expect(r.added).toEqual(["a.new"]);
  });
  it("never removes a key that only exists locally, and reports those keys", () => {
    const r = mergeTranslations(local, db);
    expect(r.merged["b2b.invite.title"]).toBe("Invitation");
    expect(r.merged["a.keep"]).toBe("local only");
    expect(r.localOnly).toEqual(["a.blank", "a.keep", "b2b.invite.title"].filter((k) => !(k in db)));
    for (const k of Object.keys(local)) expect(r.merged).toHaveProperty(k);
  });
  it("a blank DB value never overwrites a real local string", () => {
    const r = mergeTranslations(local, db);
    expect(r.merged["a.blank"]).toBe("real text");
    expect(r.ignoredBlank).toEqual(["a.blank"]);
  });
  it("an empty or partial DB answer cannot shrink the file", () => {
    expect(Object.keys(mergeTranslations(local, {}).merged).sort()).toEqual(Object.keys(local).sort());
  });
  it("keeps keys sorted and ignores non-string DB values", () => {
    const r = mergeTranslations({ b: "1", a: "2" }, { c: 3 as unknown as string });
    expect(Object.keys(r.merged)).toEqual(["a", "b"]);
  });
  it("describes what changed for the build log", () => {
    const text = describeMerge("fr", mergeTranslations(local, db));
    expect(text).toContain("fr.json: +1 added, 1 changed from DB");
    expect(text).toContain("added: a.new");
  });
});
