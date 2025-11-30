import { describe, expect, it } from "vitest";
import {
  createCircleQuadVertices,
  createUnitQuadVertices,
  createCircleVertices,
  createOrthoMatrix,
  hexToRGBA,
} from "../src/renderer/buffers.ts";

describe("renderer buffer utilities", () => {
  it("creates circle quad vertices with correct size", () => {
    const vertices = createCircleQuadVertices();
    // 6 vertices (2 triangles) * 2 components (x, y)
    expect(vertices).toHaveLength(12);
    expect(vertices).toBeInstanceOf(Float32Array);
    
    // Check corners of the quad
    expect(vertices[0]).toBe(-1); // first vertex x
    expect(vertices[1]).toBe(-1); // first vertex y
    expect(vertices[10]).toBe(1); // last vertex x
    expect(vertices[11]).toBe(1); // last vertex y
  });

  it("creates unit quad vertices with correct size", () => {
    const vertices = createUnitQuadVertices();
    // 6 vertices (2 triangles) * 2 components (x, y)
    expect(vertices).toHaveLength(12);
    expect(vertices).toBeInstanceOf(Float32Array);
    
    // Check unit quad bounds (0 to 1)
    expect(vertices[0]).toBe(0); // first vertex x
    expect(vertices[1]).toBe(0); // first vertex y
    expect(vertices[10]).toBe(1); // last vertex x
    expect(vertices[11]).toBe(1); // last vertex y
  });

  it("creates circle vertices with default segments", () => {
    const vertices = createCircleVertices();
    // 32 segments + 1 closing vertex * 2 components
    expect(vertices).toHaveLength(66);
    expect(vertices).toBeInstanceOf(Float32Array);
    
    // First vertex should be at (1, 0)
    expect(vertices[0]).toBeCloseTo(1);
    expect(vertices[1]).toBeCloseTo(0);
    
    // Last vertex should match first (closed circle)
    expect(vertices[64]).toBeCloseTo(1);
    expect(vertices[65]).toBeCloseTo(0, 5);
  });

  it("creates circle vertices with custom segment count", () => {
    const vertices = createCircleVertices(8);
    // 8 segments + 1 closing vertex * 2 components
    expect(vertices).toHaveLength(18);
  });

  it("creates orthographic projection matrix", () => {
    const matrix = createOrthoMatrix(0, 800, 600, 0);
    expect(matrix).toHaveLength(16);
    expect(matrix).toBeInstanceOf(Float32Array);
    
    // The matrix converts coordinates from [left, right] x [top, bottom]
    // to clip space [-1, 1] x [-1, 1]
    // For (0, 800, 600, 0) with y-down coordinate system:
    // x: 0 -> -1, 800 -> 1, so scale = 2/800
    // y: 0 -> -1, 600 -> 1, so scale = -2/600 (negated for y-down)
    
    // matrix[0] = -2 * (1 / (left - right)) = -2 / (0 - 800) = 2/800
    expect(matrix[0]).toBeCloseTo(2 / 800);
    // matrix[5] = -2 * (1 / (bottom - top)) = -2 / (600 - 0) = -2/600
    expect(matrix[5]).toBeCloseTo(-2 / 600);
    expect(matrix[10]).toBe(-1); // z scale
    expect(matrix[15]).toBe(1); // w
    
    // Check translation (matrix[12] and matrix[13])
    // matrix[12] = (left + right) / (left - right) = 800 / (-800) = -1
    expect(matrix[12]).toBeCloseTo(-1);
    // matrix[13] = (top + bottom) / (bottom - top) = 600 / 600 = 1
    expect(matrix[13]).toBeCloseTo(1);
  });

  it("converts hex color to RGBA", () => {
    // Pure red
    const red = hexToRGBA(0xff0000);
    expect(red).toEqual([1, 0, 0, 1]);
    
    // Pure green
    const green = hexToRGBA(0x00ff00);
    expect(green).toEqual([0, 1, 0, 1]);
    
    // Pure blue
    const blue = hexToRGBA(0x0000ff);
    expect(blue).toEqual([0, 0, 1, 1]);
    
    // White
    const white = hexToRGBA(0xffffff);
    expect(white).toEqual([1, 1, 1, 1]);
    
    // Black
    const black = hexToRGBA(0x000000);
    expect(black).toEqual([0, 0, 0, 1]);
    
    // Custom alpha
    const semiTransparent = hexToRGBA(0xff0000, 0.5);
    expect(semiTransparent).toEqual([1, 0, 0, 0.5]);
  });

  it("handles mixed colors correctly", () => {
    // 0x7dd3fc = rgb(125, 211, 252) - player color
    const playerColor = hexToRGBA(0x7dd3fc);
    expect(playerColor[0]).toBeCloseTo(125 / 255);
    expect(playerColor[1]).toBeCloseTo(211 / 255);
    expect(playerColor[2]).toBeCloseTo(252 / 255);
    expect(playerColor[3]).toBe(1);
  });
});
