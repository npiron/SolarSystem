import { describe, expect, it } from "vitest";
import { hexStringToVec4 } from "../src/renderer/colorUtils.ts";

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
