import { describe, it, expect } from "vitest";
import { parseIconId } from "./catalogIconUtils.js";

// ---------------------------------------------------------------------------
// parseIconId
// ---------------------------------------------------------------------------

describe("parseIconId", () => {
  it("parses a valid catalogName/filename pair", () => {
    expect(parseIconId("MyCatalog/icon.png")).toEqual({
      catalogName: "MyCatalog",
      filename: "icon.png",
    });
  });

  it("returns null for empty string", () => {
    expect(parseIconId("")).toBeNull();
  });

  it("returns null when no slash is present", () => {
    expect(parseIconId("icon.png")).toBeNull();
  });

  it("returns null for leading slash (empty catalog name)", () => {
    expect(parseIconId("/icon.png")).toBeNull();
  });

  it("returns null for trailing slash (empty filename)", () => {
    expect(parseIconId("MyCatalog/")).toBeNull();
  });

  it("rejects path traversal in filename", () => {
    expect(parseIconId("MyCatalog/../secret.png")).toBeNull();
  });

  it("rejects nested slashes in filename", () => {
    expect(parseIconId("MyCatalog/sub/icon.png")).toBeNull();
  });

  it("rejects backslashes in filename", () => {
    expect(parseIconId("MyCatalog/sub\\icon.png")).toBeNull();
  });

  it("rejects backslashes in catalog name", () => {
    expect(parseIconId("My\\Catalog/icon.png")).toBeNull();
  });

  it("rejects path traversal in catalog name", () => {
    expect(parseIconId("../evil/icon.png")).toBeNull();
  });
});
