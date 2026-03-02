import { describe, it, expect } from "vitest";
import { sanitizeFilename, keyById, groupIds } from "../helpers.js";
import type { RowWithId } from "../helpers.js";

describe("sanitizeFilename", () => {
  it("removes special characters", () => {
    expect(sanitizeFilename("Hello World!@#$%")).toBe("Hello World");
  });

  it("keeps alphanumerics, dashes, dots, underscores, and spaces", () => {
    expect(sanitizeFilename("my-file_v2.0 final")).toBe("my-file_v2.0 final");
  });

  it("returns 'instruction' for empty result", () => {
    expect(sanitizeFilename("!!!")).toBe("instruction");
  });

  it("trims whitespace", () => {
    expect(sanitizeFilename("  hello  ")).toBe("hello");
  });

  it("handles empty string", () => {
    expect(sanitizeFilename("")).toBe("instruction");
  });
});

describe("keyById", () => {
  it("converts array to id-keyed map", () => {
    const rows: RowWithId[] = [
      { id: "a", name: "Alice" },
      { id: "b", name: "Bob" },
    ];
    const result = keyById(rows);
    expect(result).toEqual({
      a: { id: "a", name: "Alice" },
      b: { id: "b", name: "Bob" },
    });
  });

  it("returns empty object for empty array", () => {
    expect(keyById([])).toEqual({});
  });

  it("last row wins on duplicate IDs", () => {
    const rows: RowWithId[] = [
      { id: "a", value: 1 },
      { id: "a", value: 2 },
    ];
    expect(keyById(rows)["a"].value).toBe(2);
  });
});

describe("groupIds", () => {
  it("groups row IDs by foreign key", () => {
    const rows: RowWithId[] = [
      { id: "s1", step_id: "step-a" },
      { id: "s2", step_id: "step-a" },
      { id: "s3", step_id: "step-b" },
    ];
    expect(groupIds(rows, "step_id")).toEqual({
      "step-a": ["s1", "s2"],
      "step-b": ["s3"],
    });
  });

  it("skips rows with falsy foreign key", () => {
    const rows: RowWithId[] = [
      { id: "s1", step_id: "step-a" },
      { id: "s2", step_id: "" },
      { id: "s3", step_id: null as unknown as string },
    ];
    expect(groupIds(rows, "step_id")).toEqual({
      "step-a": ["s1"],
    });
  });

  it("returns empty object for empty array", () => {
    expect(groupIds([], "fk")).toEqual({});
  });
});
