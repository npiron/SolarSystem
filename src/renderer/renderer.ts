import { bindAttributePointers, createBuffer, createQuadCorners, ensureCapacity } from "./buffers.ts";
import {
  circleFragmentShader,
  circleVertexShader,
  createProgram,
  lineFragmentShader,
  lineVertexShader,
  quadFragmentShader,
  quadVertexShader
} from "./shaders.ts";
import { initWebGL2, resizeCanvas, WebGL2Context } from "./webgl2Context.ts";

export type CircleInstance = {
  center: readonly [number, number];
  radius: number;
  color: readonly [number, number, number, number];
  halo?: { color: readonly [number, number, number, number]; scale: number };
};

export type QuadInstance = {
  position: readonly [number, number];
  size: readonly [number, number];
  color: readonly [number, number, number, number];
};

export type LineInstance = {
  from: readonly [number, number];
  to: readonly [number, number];
  color: readonly [number, number, number, number];
};

const FLOATS_PER_CIRCLE = 12;
const FLOATS_PER_QUAD = 8 + 4;
const FLOATS_PER_LINE_VERTEX = 6;

function defaultHalo(color: readonly [number, number, number, number]) {
  return { color: [color[0], color[1], color[2], 0] as const, scale: 1 } as const;
}

export class WebGL2Renderer {
  static create(canvas: HTMLCanvasElement) {
    const context = initWebGL2(canvas);
    if (!context) return null;
    return new WebGL2Renderer(canvas, context);
  }

  private gl: WebGL2RenderingContext;
  private readonly dpr: number;
  private circleProgram: WebGLProgram;
  private quadProgram: WebGLProgram;
  private lineProgram: WebGLProgram;
  private circleVao: WebGLVertexArrayObject | null;
  private quadVao: WebGLVertexArrayObject | null;
  private lineVao: WebGLVertexArrayObject | null;
  private quadCorners: WebGLBuffer | null;
  private circleCorners: WebGLBuffer | null;
  private circleInstanceBuffer: WebGLBuffer | null;
  private quadInstanceBuffer: WebGLBuffer | null;
  private lineBuffer: WebGLBuffer | null;
  private circleData: Float32Array;
  private quadData: Float32Array;
  private lineData: Float32Array;
  private circleCount = 0;
  private quadCount = 0;
  private lineVertices = 0;
  private resolution = { width: 0, height: 0 };

  private readonly uniforms: {
    circleResolution: WebGLUniformLocation | null;
    quadResolution: WebGLUniformLocation | null;
    lineResolution: WebGLUniformLocation | null;
  };

  private constructor(private canvas: HTMLCanvasElement, context: WebGL2Context) {
    this.gl = context.gl;
    this.dpr = context.dpr;

    this.circleProgram = createProgram(this.gl, circleVertexShader, circleFragmentShader);
    this.quadProgram = createProgram(this.gl, quadVertexShader, quadFragmentShader);
    this.lineProgram = createProgram(this.gl, lineVertexShader, lineFragmentShader);

    this.circleVao = this.gl.createVertexArray();
    this.quadVao = this.gl.createVertexArray();
    this.lineVao = this.gl.createVertexArray();

    this.quadCorners = createQuadCorners(this.gl);
    this.circleCorners = this.quadCorners;

    this.circleInstanceBuffer = createBuffer(this.gl, this.gl.ARRAY_BUFFER, 0, this.gl.DYNAMIC_DRAW);
    this.quadInstanceBuffer = createBuffer(this.gl, this.gl.ARRAY_BUFFER, 0, this.gl.DYNAMIC_DRAW);
    this.lineBuffer = createBuffer(this.gl, this.gl.ARRAY_BUFFER, 0, this.gl.DYNAMIC_DRAW);

    this.circleData = new Float32Array(0);
    this.quadData = new Float32Array(0);
    this.lineData = new Float32Array(0);

    this.uniforms = {
      circleResolution: this.gl.getUniformLocation(this.circleProgram, "u_resolution"),
      quadResolution: this.gl.getUniformLocation(this.quadProgram, "u_resolution"),
      lineResolution: this.gl.getUniformLocation(this.lineProgram, "u_resolution")
    };

    this.configureCircleAttributes();
    this.configureQuadAttributes();
    this.configureLineAttributes();
  }

  resize(width: number, height: number) {
    const next = resizeCanvas(this.gl, this.canvas, width, height, this.dpr);
    this.resolution = next;
    return next;
  }

  beginFrame() {
    this.circleCount = 0;
    this.quadCount = 0;
    this.lineVertices = 0;
    this.gl.clearColor(0, 0, 0, 0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }

  pushCircle(circle: CircleInstance) {
    this.circleData = ensureCapacity(this.circleData, (this.circleCount + 1) * FLOATS_PER_CIRCLE);
    const halo = circle.halo ?? defaultHalo(circle.color);
    const offset = this.circleCount * FLOATS_PER_CIRCLE;
    const dpr = this.dpr;

    this.circleData[offset] = circle.center[0] * dpr;
    this.circleData[offset + 1] = circle.center[1] * dpr;
    this.circleData[offset + 2] = circle.radius * dpr;
    this.circleData[offset + 3] = circle.color[0];
    this.circleData[offset + 4] = circle.color[1];
    this.circleData[offset + 5] = circle.color[2];
    this.circleData[offset + 6] = circle.color[3];
    this.circleData[offset + 7] = halo.color[0];
    this.circleData[offset + 8] = halo.color[1];
    this.circleData[offset + 9] = halo.color[2];
    this.circleData[offset + 10] = halo.color[3];
    this.circleData[offset + 11] = halo.scale;

    this.circleCount += 1;
  }

  pushQuad(quad: QuadInstance) {
    this.quadData = ensureCapacity(this.quadData, (this.quadCount + 1) * FLOATS_PER_QUAD);
    const offset = this.quadCount * FLOATS_PER_QUAD;
    const dpr = this.dpr;

    this.quadData[offset] = quad.position[0] * dpr;
    this.quadData[offset + 1] = quad.position[1] * dpr;
    this.quadData[offset + 2] = quad.size[0] * dpr;
    this.quadData[offset + 3] = quad.size[1] * dpr;
    this.quadData[offset + 4] = quad.color[0];
    this.quadData[offset + 5] = quad.color[1];
    this.quadData[offset + 6] = quad.color[2];
    this.quadData[offset + 7] = quad.color[3];

    this.quadCount += 1;
  }

  pushLine(line: LineInstance) {
    this.lineData = ensureCapacity(this.lineData, (this.lineVertices + 2) * FLOATS_PER_LINE_VERTEX);
    const dpr = this.dpr;
    const start = this.lineVertices * FLOATS_PER_LINE_VERTEX;
    const end = start + FLOATS_PER_LINE_VERTEX;

    this.lineData[start] = line.from[0] * dpr;
    this.lineData[start + 1] = line.from[1] * dpr;
    this.lineData[start + 2] = line.color[0];
    this.lineData[start + 3] = line.color[1];
    this.lineData[start + 4] = line.color[2];
    this.lineData[start + 5] = line.color[3];

    this.lineData[end] = line.to[0] * dpr;
    this.lineData[end + 1] = line.to[1] * dpr;
    this.lineData[end + 2] = line.color[0];
    this.lineData[end + 3] = line.color[1];
    this.lineData[end + 4] = line.color[2];
    this.lineData[end + 5] = line.color[3];

    this.lineVertices += 2;
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
    const gl = this.gl;

    if (this.lineVertices) {
      gl.useProgram(this.lineProgram);
      gl.bindVertexArray(this.lineVao);
      if (this.uniforms.lineResolution) {
        gl.uniform2f(this.uniforms.lineResolution, this.resolution.width, this.resolution.height);
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, this.lineBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, this.lineData.subarray(0, this.lineVertices * FLOATS_PER_LINE_VERTEX), gl.DYNAMIC_DRAW);
      gl.drawArrays(gl.LINES, 0, this.lineVertices);
    }

    if (this.quadCount) {
      gl.useProgram(this.quadProgram);
      gl.bindVertexArray(this.quadVao);
      if (this.uniforms.quadResolution) {
        gl.uniform2f(this.uniforms.quadResolution, this.resolution.width, this.resolution.height);
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quadInstanceBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, this.quadData.subarray(0, this.quadCount * FLOATS_PER_QUAD), gl.DYNAMIC_DRAW);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.quadCount);
    }

    if (this.circleCount) {
      gl.useProgram(this.circleProgram);
      gl.bindVertexArray(this.circleVao);
      if (this.uniforms.circleResolution) {
        gl.uniform2f(this.uniforms.circleResolution, this.resolution.width, this.resolution.height);
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, this.circleInstanceBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, this.circleData.subarray(0, this.circleCount * FLOATS_PER_CIRCLE), gl.DYNAMIC_DRAW);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.circleCount);
    }
  }

  clear() {
    this.circleCount = 0;
    this.quadCount = 0;
    this.lineVertices = 0;
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    this.gl.clearColor(0, 0, 0, 0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }

  private configureCircleAttributes() {
    const gl = this.gl;
    gl.bindVertexArray(this.circleVao);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.circleCorners);
    bindAttributePointers(gl, [
      { location: gl.getAttribLocation(this.circleProgram, "a_corner"), size: 2, stride: 0, offset: 0 }
    ]);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.circleInstanceBuffer);
    const stride = FLOATS_PER_CIRCLE * 4;
    bindAttributePointers(gl, [
      { location: gl.getAttribLocation(this.circleProgram, "a_center"), size: 2, stride, offset: 0, divisor: 1 },
      { location: gl.getAttribLocation(this.circleProgram, "a_radius"), size: 1, stride, offset: 8, divisor: 1 },
      { location: gl.getAttribLocation(this.circleProgram, "a_color"), size: 4, stride, offset: 12, divisor: 1 },
      { location: gl.getAttribLocation(this.circleProgram, "a_haloColor"), size: 4, stride, offset: 28, divisor: 1 },
      { location: gl.getAttribLocation(this.circleProgram, "a_haloScale"), size: 1, stride, offset: 44, divisor: 1 }
    ]);
  }

  private configureQuadAttributes() {
    const gl = this.gl;
    gl.bindVertexArray(this.quadVao);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadCorners);
    bindAttributePointers(gl, [
      { location: gl.getAttribLocation(this.quadProgram, "a_corner"), size: 2, stride: 0, offset: 0 }
    ]);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadInstanceBuffer);
    const stride = FLOATS_PER_QUAD * 4;
    bindAttributePointers(gl, [
      { location: gl.getAttribLocation(this.quadProgram, "a_position"), size: 2, stride, offset: 0, divisor: 1 },
      { location: gl.getAttribLocation(this.quadProgram, "a_size"), size: 2, stride, offset: 8, divisor: 1 },
      { location: gl.getAttribLocation(this.quadProgram, "a_color"), size: 4, stride, offset: 16, divisor: 1 }
    ]);
  }

  private configureLineAttributes() {
    const gl = this.gl;
    gl.bindVertexArray(this.lineVao);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.lineBuffer);
    const stride = FLOATS_PER_LINE_VERTEX * 4;
    bindAttributePointers(gl, [
      { location: gl.getAttribLocation(this.lineProgram, "a_position"), size: 2, stride, offset: 0 },
      { location: gl.getAttribLocation(this.lineProgram, "a_color"), size: 4, stride, offset: 8 }
    ]);
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
