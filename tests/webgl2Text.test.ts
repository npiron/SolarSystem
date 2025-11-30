import { describe, expect, it } from "vitest";

/**
 * Convert a CSS hex color string to a WebGL vec4 color array.
 * This is a copy of the function from main.js for testing.
 */
function hexStringToVec4(hexStr: string, alpha = 1): readonly [number, number, number, number] {
  const hex = hexStr.replace("#", "");
  const fullHex = hex.length === 3
    ? hex.split("").map((c) => c + c).join("")
    : hex;
  const value = parseInt(fullHex, 16);
  return [
    ((value >> 16) & 0xff) / 255,
    ((value >> 8) & 0xff) / 255,
    (value & 0xff) / 255,
    alpha
  ];
}

describe("hexStringToVec4", () => {
  it("converts 6-digit hex to vec4", () => {
    const result = hexStringToVec4("#ff0000");
    expect(result[0]).toBeCloseTo(1.0);
    expect(result[1]).toBeCloseTo(0.0);
    expect(result[2]).toBeCloseTo(0.0);
    expect(result[3]).toBe(1);
  });

  it("converts 3-digit hex to vec4", () => {
    const result = hexStringToVec4("#f00");
    expect(result[0]).toBeCloseTo(1.0);
    expect(result[1]).toBeCloseTo(0.0);
    expect(result[2]).toBeCloseTo(0.0);
    expect(result[3]).toBe(1);
  });

  it("handles white color", () => {
    const result = hexStringToVec4("#ffffff");
    expect(result[0]).toBeCloseTo(1.0);
    expect(result[1]).toBeCloseTo(1.0);
    expect(result[2]).toBeCloseTo(1.0);
    expect(result[3]).toBe(1);
  });

  it("handles black color", () => {
    const result = hexStringToVec4("#000000");
    expect(result[0]).toBeCloseTo(0.0);
    expect(result[1]).toBeCloseTo(0.0);
    expect(result[2]).toBeCloseTo(0.0);
    expect(result[3]).toBe(1);
  });

  it("applies custom alpha value", () => {
    const result = hexStringToVec4("#ff0000", 0.5);
    expect(result[0]).toBeCloseTo(1.0);
    expect(result[3]).toBe(0.5);
  });

  it("handles hex without # prefix", () => {
    const result = hexStringToVec4("fef08a");
    expect(result[0]).toBeCloseTo(254 / 255);
    expect(result[1]).toBeCloseTo(240 / 255);
    expect(result[2]).toBeCloseTo(138 / 255);
    expect(result[3]).toBe(1);
  });
});
