import { describe, expect, it } from "vitest";
import { resolveLogoUrl } from "./logo";

describe("resolveLogoUrl", () => {
  it("uses an absolute URL as is", () => {
    expect(resolveLogoUrl("https://api.example.test/api/b2b/files/download?token=abc", "http://x")).toBe("https://api.example.test/api/b2b/files/download?token=abc");
  });
  it("prefixes the API base only for relative paths (older responses)", () => {
    expect(resolveLogoUrl("/api/b2b/files/download?token=abc", "http://localhost:3001/")).toBe("http://localhost:3001/api/b2b/files/download?token=abc");
  });
  it("nothing for empty values", () => {
    expect(resolveLogoUrl(null)).toBeNull();
    expect(resolveLogoUrl("")).toBeNull();
  });
});
