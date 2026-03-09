/**
 * Simple XOR + base64 obfuscation for data.json in .mweb exports.
 *
 * NOT encryption — just enough to prevent casual inspection / scraping.
 * Uses TextEncoder/TextDecoder for browser + Node compatibility (zero deps).
 */

/** 16-byte rotating XOR key. */
const XOR_KEY = new Uint8Array([
  0x4d, 0x6f, 0x6e, 0x74, 0x61, 0x76, 0x69, 0x73, // "Montavis"
  0x56, 0x69, 0x65, 0x77, 0x65, 0x72, 0x21, 0x21, // "Viewer!!"
]);

function xorTransform(data: Uint8Array): Uint8Array {
  const result = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    result[i] = data[i] ^ XOR_KEY[i % XOR_KEY.length];
  }
  return result;
}

/**
 * Base64 encode that works in both browser and Node.
 */
function toBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  // Browser fallback
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Base64 decode that works in both browser and Node.
 */
function fromBase64(str: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(str, "base64"));
  }
  // Browser fallback
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** Magic marker to distinguish obfuscated envelopes from arbitrary JSON. */
const OBFUSCATION_MARKER = "mvis";

/**
 * Obfuscate a JSON string. Returns a JSON string with format `{"_":"mvis","v":1,"d":"<base64>"}`.
 */
export function obfuscateJson(json: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(json);
  const xored = xorTransform(bytes);
  const encoded = toBase64(xored);
  return JSON.stringify({ _: OBFUSCATION_MARKER, v: 1, d: encoded });
}

/**
 * Deobfuscate a string produced by `obfuscateJson()`. Returns the original JSON string.
 */
export function deobfuscateJson(obfuscated: string): string {
  const parsed: unknown = JSON.parse(obfuscated);
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("v" in parsed) ||
    !("d" in parsed)
  ) {
    throw new Error("[obfuscation] Invalid obfuscated format");
  }
  const { v, d } = parsed as { v: number; d: string };
  if (v !== 1) {
    throw new Error(`[obfuscation] Unsupported version: ${v}`);
  }
  const xored = fromBase64(d);
  const bytes = xorTransform(xored);
  const decoder = new TextDecoder();
  return decoder.decode(bytes);
}

/**
 * Detect whether a string is obfuscated (vs plain JSON).
 * Checks for the `_: "mvis"` marker to avoid false positives on arbitrary JSON.
 */
export function isObfuscated(text: string): boolean {
  if (!text.startsWith("{")) return false;
  try {
    const parsed: unknown = JSON.parse(text);
    return (
      typeof parsed === "object" &&
      parsed !== null &&
      "_" in parsed &&
      (parsed as { _: unknown })._ === OBFUSCATION_MARKER &&
      "v" in parsed &&
      "d" in parsed &&
      (parsed as { v: unknown }).v === 1 &&
      typeof (parsed as { d: unknown }).d === "string"
    );
  } catch {
    return false;
  }
}
