import { describe, it, expect } from "vitest";
import {
  obfuscateJson,
  deobfuscateJson,
  isObfuscated,
} from "../obfuscation.js";

describe("obfuscation", () => {
  describe("obfuscateJson", () => {
    it("returns an object with marker, version and data fields", () => {
      const result = obfuscateJson('{"hello":"world"}');
      const parsed = JSON.parse(result);
      expect(parsed).toHaveProperty("_", "mvis");
      expect(parsed).toHaveProperty("v", 1);
      expect(parsed).toHaveProperty("d");
      expect(typeof parsed.d).toBe("string");
    });

    it("produces output different from input", () => {
      const input = '{"hello":"world"}';
      const result = obfuscateJson(input);
      expect(result).not.toBe(input);
      expect(result).not.toContain("hello");
      expect(result).not.toContain("world");
    });
  });

  describe("deobfuscateJson", () => {
    it("round-trips ASCII JSON", () => {
      const input = '{"name":"Test","steps":[1,2,3]}';
      expect(deobfuscateJson(obfuscateJson(input))).toBe(input);
    });

    it("round-trips Unicode content", () => {
      const input = '{"title":"Ärger mit Ölübung","emoji":"🔧"}';
      expect(deobfuscateJson(obfuscateJson(input))).toBe(input);
    });

    it("round-trips empty object", () => {
      const input = "{}";
      expect(deobfuscateJson(obfuscateJson(input))).toBe(input);
    });

    it("round-trips large data", () => {
      const obj: Record<string, string> = {};
      for (let i = 0; i < 1000; i++) {
        obj[`key_${i}`] = `value_${i}_${"x".repeat(100)}`;
      }
      const input = JSON.stringify(obj);
      expect(deobfuscateJson(obfuscateJson(input))).toBe(input);
    });

    it("round-trips empty string", () => {
      const input = "";
      expect(deobfuscateJson(obfuscateJson(input))).toBe(input);
    });
  });

  describe("isObfuscated", () => {
    it("detects obfuscated JSON", () => {
      const obfuscated = obfuscateJson('{"test":true}');
      expect(isObfuscated(obfuscated)).toBe(true);
    });

    it("rejects plain JSON", () => {
      expect(isObfuscated('{"test":true}')).toBe(false);
    });

    it("rejects plain JSON array", () => {
      expect(isObfuscated("[1,2,3]")).toBe(false);
    });

    it("rejects empty string", () => {
      expect(isObfuscated("")).toBe(false);
    });

    it("rejects non-JSON text", () => {
      expect(isObfuscated("hello world")).toBe(false);
    });

    it("rejects object with v but no d", () => {
      expect(isObfuscated('{"v":1}')).toBe(false);
    });

    it("rejects object with wrong version", () => {
      expect(isObfuscated('{"v":99,"d":"abc"}')).toBe(false);
    });

    it("rejects object with v and d but no mvis marker", () => {
      expect(isObfuscated('{"v":1,"d":"someBase64String"}')).toBe(false);
    });

    it("rejects object with wrong marker", () => {
      expect(isObfuscated('{"_":"other","v":1,"d":"abc"}')).toBe(false);
    });
  });
});
