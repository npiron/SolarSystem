import type { Shape } from "../types/entities.ts";

const TAU = Math.PI * 2;

export type PathContext = Pick<
  CanvasRenderingContext2D,
  "beginPath" | "arc" | "rect" | "moveTo" | "lineTo" | "closePath"
>;

/**
 * Trace a path for the provided shape onto a 2D drawing context.
 * The path is centered at (x, y) with the provided radius.
 */
export function traceShapePath(
  ctx: PathContext,
  x: number,
  y: number,
  radius: number,
  shape: Shape
): void {
  ctx.beginPath();
  switch (shape) {
    case "square":
      ctx.rect(x - radius * 0.75, y - radius * 0.75, radius * 1.5, radius * 1.5);
      break;
    case "triangle": {
      const h = radius * 0.866;
      ctx.moveTo(x, y - radius);
      ctx.lineTo(x - h, y + radius * 0.5);
      ctx.lineTo(x + h, y + radius * 0.5);
      ctx.closePath();
      break;
    }
    case "diamond":
      ctx.moveTo(x, y - radius);
      ctx.lineTo(x + radius * 0.7, y);
      ctx.lineTo(x, y + radius);
      ctx.lineTo(x - radius * 0.7, y);
      ctx.closePath();
      break;
    case "hexagon": {
      const sideRadius = radius * 0.85;
      for (let i = 0; i < 6; i++) {
        const angle = (i * TAU) / 6 - Math.PI / 6;
        const px = x + Math.cos(angle) * sideRadius;
        const py = y + Math.sin(angle) * sideRadius;
        if (i === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.closePath();
      break;
    }
    case "star": {
      for (let i = 0; i < 10; i++) {
        const angle = (i * TAU) / 10 - Math.PI / 2;
        const r = i % 2 === 0 ? radius : radius * 0.4;
        const px = x + Math.cos(angle) * r;
        const py = y + Math.sin(angle) * r;
        if (i === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.closePath();
      break;
    }
    case "circle":
    default:
      ctx.arc(x, y, radius, 0, TAU);
      break;
  }
}
