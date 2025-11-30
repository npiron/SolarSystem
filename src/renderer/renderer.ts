import { CircleBatch, type CircleInstance } from "./circles.ts";
import { LineBatch, type LineInstance } from "./lines.ts";
import { QuadBatch, type QuadInstance } from "./quads.ts";
import { initWebGL2, resizeCanvas, WebGL2Context } from "./webgl2Context.ts";

export type { CircleInstance, LineInstance, QuadInstance };

export class WebGL2Renderer {
  static create(canvas: HTMLCanvasElement) {
    const context = initWebGL2(canvas);
    if (!context) return null;
    return new WebGL2Renderer(canvas, context);
  }

  private readonly gl: WebGL2RenderingContext;
  private readonly dpr: number;
  private readonly circles: CircleBatch;
  private readonly quads: QuadBatch;
  private readonly lines: LineBatch;
  private resolution = { width: 0, height: 0 };

  private constructor(private canvas: HTMLCanvasElement, context: WebGL2Context) {
    this.gl = context.gl;
    this.dpr = context.dpr;

    this.circles = new CircleBatch(this.gl, context.dpr);
    this.quads = new QuadBatch(this.gl, context.dpr);
    this.lines = new LineBatch(this.gl, context.dpr);
  }

  resize(width: number, height: number) {
    const next = resizeCanvas(this.gl, this.canvas, width, height, this.dpr);
    this.resolution = next;
    return next;
  }

  beginFrame() {
    this.circles.beginFrame();
    this.quads.beginFrame();
    this.lines.beginFrame();
    this.gl.clearColor(0, 0, 0, 0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }

  pushCircle(circle: CircleInstance) {
    this.circles.push(circle);
  }

  pushQuad(quad: QuadInstance) {
    this.quads.push(quad);
  }

  pushLine(line: LineInstance) {
    this.lines.push(line);
  }

  drawGrid(width: number, height: number, spacing: number, color: readonly [number, number, number, number]) {
    for (let x = 0; x <= width; x += spacing) {
      this.pushLine({ from: [x, 0], to: [x, height], color });
    }
    for (let y = 0; y <= height; y += spacing) {
      this.pushLine({ from: [0, y], to: [width, y], color });
    }
  }

  render() {
    this.lines.flush(this.resolution);
    this.quads.flush(this.resolution);
    this.circles.flush(this.resolution);
  }

  clear() {
    this.circles.clear();
    this.quads.clear();
    this.lines.clear();
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    this.gl.clearColor(0, 0, 0, 0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }
}

export class CanvasFallbackRenderer {
  static create(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    return new CanvasFallbackRenderer(canvas, ctx);
  }

  private resolution = { width: 0, height: 0 };
  private circles: CircleInstance[] = [];
  private quads: QuadInstance[] = [];
  private lines: LineInstance[] = [];

  private constructor(private canvas: HTMLCanvasElement, private ctx: CanvasRenderingContext2D) {}

  resize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.resolution = { width, height };
    return this.resolution;
  }

  beginFrame() {
    this.circles.length = 0;
    this.quads.length = 0;
    this.lines.length = 0;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  pushCircle(circle: CircleInstance) {
    this.circles.push(circle);
  }

  pushQuad(quad: QuadInstance) {
    this.quads.push(quad);
  }

  pushLine(line: LineInstance) {
    this.lines.push(line);
  }

  drawGrid(width: number, height: number, spacing: number, color: readonly [number, number, number, number]) {
    for (let x = 0; x <= width; x += spacing) {
      this.pushLine({ from: [x, 0], to: [x, height], color });
    }
    for (let y = 0; y <= height; y += spacing) {
      this.pushLine({ from: [0, y], to: [width, y], color });
    }
  }

  render() {
    for (const line of this.lines) {
      this.ctx.strokeStyle = rgba(line.color);
      this.ctx.beginPath();
      this.ctx.moveTo(line.from[0], line.from[1]);
      this.ctx.lineTo(line.to[0], line.to[1]);
      this.ctx.stroke();
    }

    for (const quad of this.quads) {
      this.ctx.fillStyle = rgba(quad.color);
      this.ctx.fillRect(quad.position[0], quad.position[1], quad.size[0], quad.size[1]);
    }

    for (const circle of this.circles) {
      if (circle.halo && circle.halo.color[3] > 0) {
        this.ctx.fillStyle = rgba([circle.halo.color[0], circle.halo.color[1], circle.halo.color[2], circle.halo.color[3] * 0.6] as const);
        this.ctx.beginPath();
        this.ctx.arc(circle.center[0], circle.center[1], circle.radius * circle.halo.scale, 0, Math.PI * 2);
        this.ctx.fill();
      }
      this.ctx.fillStyle = rgba(circle.color);
      this.ctx.beginPath();
      this.ctx.arc(circle.center[0], circle.center[1], circle.radius, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

export function createRenderer(canvas: HTMLCanvasElement) {
  const webglRenderer = WebGL2Renderer.create(canvas);
  if (webglRenderer) return webglRenderer;
  return CanvasFallbackRenderer.create(canvas);
}

function rgba(color: readonly [number, number, number, number]) {
  const [r, g, b, a] = color;
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
}
