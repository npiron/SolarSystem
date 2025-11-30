import { describe, expect, it } from "vitest";
import { traceShapePath, type PathContext } from "../src/renderer/shapePaths.ts";
import type { Shape } from "../src/types/entities.ts";

class MockContext implements PathContext {
  operations: string[] = [];

  beginPath(): void {
    this.operations.push("begin");
  }

  arc(x: number, y: number, radius: number): void {
    this.operations.push(`arc:${x},${y},${radius}`);
  }

  rect(x: number, y: number, width: number, height: number): void {
    this.operations.push(`rect:${x},${y},${width},${height}`);
  }

  moveTo(x: number, y: number): void {
    this.operations.push(`move:${x},${y}`);
  }

  lineTo(x: number, y: number): void {
    this.operations.push(`line:${x},${y}`);
  }

  closePath(): void {
    this.operations.push("close");
  }
}

function draw(shape: Shape, radius: number) {
  const ctx = new MockContext();
  traceShapePath(ctx, 10, 20, radius, shape);
  return ctx.operations;
}

describe("traceShapePath", () => {
  it("draws a circle with an arc command", () => {
    const ops = draw("circle", 6);
    expect(ops[0]).toBe("begin");
    expect(ops).toContain("arc:10,20,6");
  });

  it("draws a square using a scaled rect", () => {
    const ops = draw("square", 8);
    expect(ops).toContain("rect:4,14,12,12");
  });

  it("closes polygon shapes like triangles and diamonds", () => {
    const triangleOps = draw("triangle", 5);
    expect(triangleOps).toContain("close");
    const diamondOps = draw("diamond", 5);
    expect(diamondOps).toContain("close");
  });

  it("creates the expected vertex count for hexagons and stars", () => {
    const hexOps = draw("hexagon", 10);
    const hexLines = hexOps.filter((op) => op.startsWith("line:"));
    expect(hexLines).toHaveLength(5); // 6 vertices -> 5 lines after first move

    const starOps = draw("star", 7);
    const starLines = starOps.filter((op) => op.startsWith("line:"));
    expect(starLines).toHaveLength(9); // 10 points -> 9 lines after first move
  });
});
