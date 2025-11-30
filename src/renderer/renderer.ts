/**
 * WebGL2 Renderer
 *
 * Main renderer class that handles all WebGL2 rendering for the game.
 * Supports rendering circles, lines, quads, and post-processing effects.
 */

import { initWebGL2, isWebGL2Supported } from './webgl2Context.ts';
import {
  CIRCLE_VERT,
  CIRCLE_FRAG,
  LINE_VERT,
  LINE_FRAG,
  QUAD_VERT,
  QUAD_FRAG,
  RING_VERT,
  RING_FRAG,
} from './shaders.ts';
import {
  createProgram,
  createBuffer,
  createCircleQuadVertices,
  createUnitQuadVertices,
  createOrthoMatrix,
  hexToRGBA,
  DynamicBuffer,
  createDynamicBuffer,
  updateDynamicBuffer,
} from './buffers.ts';

/** Circle instance data: x, y, radius, r, g, b, a */
const CIRCLE_FLOATS_PER_INSTANCE = 7;

/** Quad instance data: x, y, width, height, r, g, b, a */
const QUAD_FLOATS_PER_INSTANCE = 8;

/** Ring instance data: x, y, radius, thickness, r, g, b, a */
const RING_FLOATS_PER_INSTANCE = 8;

/** Line data: x1, y1, x2, y2 per line */
const LINE_FLOATS_PER_LINE = 4;

/**
 * Shader program with uniform locations
 */
interface ShaderProgram {
  program: WebGLProgram;
  uniforms: Record<string, WebGLUniformLocation | null>;
  attributes: Record<string, number>;
}

/**
 * Configuration for creating the renderer
 */
export interface RendererConfig {
  canvas: HTMLCanvasElement;
  maxCircles?: number;
  maxQuads?: number;
  maxRings?: number;
  maxLineVertices?: number;
}

/**
 * WebGL2 Renderer class
 */
export class WebGL2Renderer {
  private gl: WebGL2RenderingContext;
  private canvas: HTMLCanvasElement;
  private projection: Float32Array;

  // Shader programs
  private circleProgram: ShaderProgram | null = null;
  private lineProgram: ShaderProgram | null = null;
  private quadProgram: ShaderProgram | null = null;
  private ringProgram: ShaderProgram | null = null;

  // VAOs
  private circleVAO: WebGLVertexArrayObject | null = null;
  private lineVAO: WebGLVertexArrayObject | null = null;
  private quadVAO: WebGLVertexArrayObject | null = null;
  private ringVAO: WebGLVertexArrayObject | null = null;

  // Static vertex buffers
  private circleQuadBuffer: WebGLBuffer | null = null;
  private unitQuadBuffer: WebGLBuffer | null = null;

  // Dynamic instance buffers
  private circleInstanceBuffer: DynamicBuffer | null = null;
  private quadInstanceBuffer: DynamicBuffer | null = null;
  private ringInstanceBuffer: DynamicBuffer | null = null;
  private lineBuffer: DynamicBuffer | null = null;

  // Rendering state
  private width: number = 0;
  private height: number = 0;

  constructor(config: RendererConfig) {
    this.canvas = config.canvas;
    
    const result = initWebGL2(config.canvas);
    if (!result) {
      throw new Error('Failed to initialize WebGL2');
    }
    
    this.gl = result.gl;
    this.projection = new Float32Array(16);
    
    this.init(config);
  }

  /**
   * Initialize all WebGL resources
   */
  private init(config: RendererConfig): void {
    const gl = this.gl;
    const maxCircles = config.maxCircles || 1000;
    const maxQuads = config.maxQuads || 500;
    const maxRings = config.maxRings || 200;
    const maxLineVertices = config.maxLineVertices || 1000;

    // Create shader programs
    this.circleProgram = this.createShaderProgram(
      CIRCLE_VERT,
      CIRCLE_FRAG,
      ['u_projection'],
      ['a_position', 'a_center', 'a_radius', 'a_color']
    );

    this.lineProgram = this.createShaderProgram(
      LINE_VERT,
      LINE_FRAG,
      ['u_projection', 'u_color'],
      ['a_position']
    );

    this.quadProgram = this.createShaderProgram(
      QUAD_VERT,
      QUAD_FRAG,
      ['u_projection'],
      ['a_position', 'a_bounds', 'a_color']
    );

    this.ringProgram = this.createShaderProgram(
      RING_VERT,
      RING_FRAG,
      ['u_projection'],
      ['a_position', 'a_center', 'a_radius', 'a_thickness', 'a_color']
    );

    // Create static vertex buffers
    this.circleQuadBuffer = createBuffer(gl, createCircleQuadVertices());
    this.unitQuadBuffer = createBuffer(gl, createUnitQuadVertices());

    // Create dynamic instance buffers
    this.circleInstanceBuffer = createDynamicBuffer(gl, maxCircles, CIRCLE_FLOATS_PER_INSTANCE);
    this.quadInstanceBuffer = createDynamicBuffer(gl, maxQuads, QUAD_FLOATS_PER_INSTANCE);
    this.ringInstanceBuffer = createDynamicBuffer(gl, maxRings, RING_FLOATS_PER_INSTANCE);
    this.lineBuffer = createDynamicBuffer(gl, maxLineVertices, 2); // x, y per vertex

    // Create VAOs
    this.circleVAO = this.createCircleVAO();
    this.lineVAO = this.createLineVAO();
    this.quadVAO = this.createQuadVAO();
    this.ringVAO = this.createRingVAO();

    // Initial setup
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  /**
   * Creates a shader program with uniform and attribute locations
   */
  private createShaderProgram(
    vertSource: string,
    fragSource: string,
    uniformNames: string[],
    attributeNames: string[]
  ): ShaderProgram | null {
    const gl = this.gl;
    const program = createProgram(gl, vertSource, fragSource);
    if (!program) return null;

    const uniforms: Record<string, WebGLUniformLocation | null> = {};
    for (const name of uniformNames) {
      uniforms[name] = gl.getUniformLocation(program, name);
    }

    const attributes: Record<string, number> = {};
    for (const name of attributeNames) {
      attributes[name] = gl.getAttribLocation(program, name);
    }

    return { program, uniforms, attributes };
  }

  /**
   * Creates VAO for circle rendering
   */
  private createCircleVAO(): WebGLVertexArrayObject | null {
    const gl = this.gl;
    const vao = gl.createVertexArray();
    if (!vao || !this.circleProgram || !this.circleInstanceBuffer) return null;

    gl.bindVertexArray(vao);

    // Bind static quad vertices (per-vertex data)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.circleQuadBuffer);
    const posLoc = this.circleProgram.attributes['a_position'];
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    // Bind instance buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.circleInstanceBuffer.buffer);

    const stride = CIRCLE_FLOATS_PER_INSTANCE * 4; // bytes

    // a_center (x, y)
    const centerLoc = this.circleProgram.attributes['a_center'];
    gl.enableVertexAttribArray(centerLoc);
    gl.vertexAttribPointer(centerLoc, 2, gl.FLOAT, false, stride, 0);
    gl.vertexAttribDivisor(centerLoc, 1);

    // a_radius
    const radiusLoc = this.circleProgram.attributes['a_radius'];
    gl.enableVertexAttribArray(radiusLoc);
    gl.vertexAttribPointer(radiusLoc, 1, gl.FLOAT, false, stride, 8);
    gl.vertexAttribDivisor(radiusLoc, 1);

    // a_color (r, g, b, a)
    const colorLoc = this.circleProgram.attributes['a_color'];
    gl.enableVertexAttribArray(colorLoc);
    gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, stride, 12);
    gl.vertexAttribDivisor(colorLoc, 1);

    gl.bindVertexArray(null);
    return vao;
  }

  /**
   * Creates VAO for line rendering
   */
  private createLineVAO(): WebGLVertexArrayObject | null {
    const gl = this.gl;
    const vao = gl.createVertexArray();
    if (!vao || !this.lineProgram || !this.lineBuffer) return null;

    gl.bindVertexArray(vao);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.lineBuffer.buffer);
    const posLoc = this.lineProgram.attributes['a_position'];
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);
    return vao;
  }

  /**
   * Creates VAO for quad rendering
   */
  private createQuadVAO(): WebGLVertexArrayObject | null {
    const gl = this.gl;
    const vao = gl.createVertexArray();
    if (!vao || !this.quadProgram || !this.quadInstanceBuffer) return null;

    gl.bindVertexArray(vao);

    // Bind static quad vertices
    gl.bindBuffer(gl.ARRAY_BUFFER, this.unitQuadBuffer);
    const posLoc = this.quadProgram.attributes['a_position'];
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    // Bind instance buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadInstanceBuffer.buffer);

    const stride = QUAD_FLOATS_PER_INSTANCE * 4;

    // a_bounds (x, y, width, height)
    const boundsLoc = this.quadProgram.attributes['a_bounds'];
    gl.enableVertexAttribArray(boundsLoc);
    gl.vertexAttribPointer(boundsLoc, 4, gl.FLOAT, false, stride, 0);
    gl.vertexAttribDivisor(boundsLoc, 1);

    // a_color (r, g, b, a)
    const colorLoc = this.quadProgram.attributes['a_color'];
    gl.enableVertexAttribArray(colorLoc);
    gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, stride, 16);
    gl.vertexAttribDivisor(colorLoc, 1);

    gl.bindVertexArray(null);
    return vao;
  }

  /**
   * Creates VAO for ring rendering
   */
  private createRingVAO(): WebGLVertexArrayObject | null {
    const gl = this.gl;
    const vao = gl.createVertexArray();
    if (!vao || !this.ringProgram || !this.ringInstanceBuffer) return null;

    gl.bindVertexArray(vao);

    // Bind static quad vertices (same as circle)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.circleQuadBuffer);
    const posLoc = this.ringProgram.attributes['a_position'];
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    // Bind instance buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.ringInstanceBuffer.buffer);

    const stride = RING_FLOATS_PER_INSTANCE * 4;

    // a_center (x, y)
    const centerLoc = this.ringProgram.attributes['a_center'];
    gl.enableVertexAttribArray(centerLoc);
    gl.vertexAttribPointer(centerLoc, 2, gl.FLOAT, false, stride, 0);
    gl.vertexAttribDivisor(centerLoc, 1);

    // a_radius
    const radiusLoc = this.ringProgram.attributes['a_radius'];
    gl.enableVertexAttribArray(radiusLoc);
    gl.vertexAttribPointer(radiusLoc, 1, gl.FLOAT, false, stride, 8);
    gl.vertexAttribDivisor(radiusLoc, 1);

    // a_thickness
    const thicknessLoc = this.ringProgram.attributes['a_thickness'];
    gl.enableVertexAttribArray(thicknessLoc);
    gl.vertexAttribPointer(thicknessLoc, 1, gl.FLOAT, false, stride, 12);
    gl.vertexAttribDivisor(thicknessLoc, 1);

    // a_color (r, g, b, a)
    const colorLoc = this.ringProgram.attributes['a_color'];
    gl.enableVertexAttribArray(colorLoc);
    gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, stride, 16);
    gl.vertexAttribDivisor(colorLoc, 1);

    gl.bindVertexArray(null);
    return vao;
  }

  /**
   * Resize the renderer to match canvas dimensions
   */
  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.gl.viewport(0, 0, width, height);
    
    // Update projection matrix (origin at top-left, y-down)
    this.projection = createOrthoMatrix(0, width, height, 0);
  }

  /**
   * Clear the canvas
   */
  clear(): void {
    const gl = this.gl;
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  /**
   * Begin a new frame
   */
  beginFrame(): void {
    // Reset instance counts
    if (this.circleInstanceBuffer) this.circleInstanceBuffer.count = 0;
    if (this.quadInstanceBuffer) this.quadInstanceBuffer.count = 0;
    if (this.ringInstanceBuffer) this.ringInstanceBuffer.count = 0;
    if (this.lineBuffer) this.lineBuffer.count = 0;
  }

  /**
   * Add a circle to be rendered
   */
  addCircle(x: number, y: number, radius: number, color: number, alpha: number = 1): void {
    if (!this.circleInstanceBuffer) return;

    const [r, g, b] = hexToRGBA(color, alpha);
    const offset = this.circleInstanceBuffer.count * CIRCLE_FLOATS_PER_INSTANCE;
    
    // Grow data array if needed
    if (offset + CIRCLE_FLOATS_PER_INSTANCE > this.circleInstanceBuffer.data.length) {
      const newCapacity = this.circleInstanceBuffer.capacity * 2;
      const newData = new Float32Array(newCapacity * CIRCLE_FLOATS_PER_INSTANCE);
      newData.set(this.circleInstanceBuffer.data);
      this.circleInstanceBuffer.data = newData;
      this.circleInstanceBuffer.capacity = newCapacity;
    }

    this.circleInstanceBuffer.data[offset] = x;
    this.circleInstanceBuffer.data[offset + 1] = y;
    this.circleInstanceBuffer.data[offset + 2] = radius;
    this.circleInstanceBuffer.data[offset + 3] = r;
    this.circleInstanceBuffer.data[offset + 4] = g;
    this.circleInstanceBuffer.data[offset + 5] = b;
    this.circleInstanceBuffer.data[offset + 6] = alpha;
    this.circleInstanceBuffer.count++;
  }

  /**
   * Add a quad (rectangle) to be rendered
   */
  addQuad(x: number, y: number, width: number, height: number, color: number, alpha: number = 1): void {
    if (!this.quadInstanceBuffer) return;

    const [r, g, b] = hexToRGBA(color, alpha);
    const offset = this.quadInstanceBuffer.count * QUAD_FLOATS_PER_INSTANCE;
    
    if (offset + QUAD_FLOATS_PER_INSTANCE > this.quadInstanceBuffer.data.length) {
      const newCapacity = this.quadInstanceBuffer.capacity * 2;
      const newData = new Float32Array(newCapacity * QUAD_FLOATS_PER_INSTANCE);
      newData.set(this.quadInstanceBuffer.data);
      this.quadInstanceBuffer.data = newData;
      this.quadInstanceBuffer.capacity = newCapacity;
    }

    this.quadInstanceBuffer.data[offset] = x;
    this.quadInstanceBuffer.data[offset + 1] = y;
    this.quadInstanceBuffer.data[offset + 2] = width;
    this.quadInstanceBuffer.data[offset + 3] = height;
    this.quadInstanceBuffer.data[offset + 4] = r;
    this.quadInstanceBuffer.data[offset + 5] = g;
    this.quadInstanceBuffer.data[offset + 6] = b;
    this.quadInstanceBuffer.data[offset + 7] = alpha;
    this.quadInstanceBuffer.count++;
  }

  /**
   * Add a ring (circle outline) to be rendered
   */
  addRing(x: number, y: number, radius: number, thickness: number, color: number, alpha: number = 1): void {
    if (!this.ringInstanceBuffer) return;

    const [r, g, b] = hexToRGBA(color, alpha);
    const offset = this.ringInstanceBuffer.count * RING_FLOATS_PER_INSTANCE;
    
    if (offset + RING_FLOATS_PER_INSTANCE > this.ringInstanceBuffer.data.length) {
      const newCapacity = this.ringInstanceBuffer.capacity * 2;
      const newData = new Float32Array(newCapacity * RING_FLOATS_PER_INSTANCE);
      newData.set(this.ringInstanceBuffer.data);
      this.ringInstanceBuffer.data = newData;
      this.ringInstanceBuffer.capacity = newCapacity;
    }

    this.ringInstanceBuffer.data[offset] = x;
    this.ringInstanceBuffer.data[offset + 1] = y;
    this.ringInstanceBuffer.data[offset + 2] = radius;
    this.ringInstanceBuffer.data[offset + 3] = thickness;
    this.ringInstanceBuffer.data[offset + 4] = r;
    this.ringInstanceBuffer.data[offset + 5] = g;
    this.ringInstanceBuffer.data[offset + 6] = b;
    this.ringInstanceBuffer.data[offset + 7] = alpha;
    this.ringInstanceBuffer.count++;
  }

  /**
   * Add a line segment to be rendered
   */
  addLine(x1: number, y1: number, x2: number, y2: number): void {
    if (!this.lineBuffer) return;

    const offset = this.lineBuffer.count * 2;
    
    if (offset + LINE_FLOATS_PER_LINE > this.lineBuffer.data.length) {
      const newCapacity = this.lineBuffer.capacity * 2;
      const newData = new Float32Array(newCapacity * 2);
      newData.set(this.lineBuffer.data);
      this.lineBuffer.data = newData;
      this.lineBuffer.capacity = newCapacity;
    }

    this.lineBuffer.data[offset] = x1;
    this.lineBuffer.data[offset + 1] = y1;
    this.lineBuffer.data[offset + 2] = x2;
    this.lineBuffer.data[offset + 3] = y2;
    this.lineBuffer.count += 2; // 2 vertices per line
  }

  /**
   * Draw all accumulated lines
   */
  drawLines(color: number, alpha: number = 1): void {
    const gl = this.gl;
    if (!this.lineProgram || !this.lineVAO || !this.lineBuffer || this.lineBuffer.count === 0) return;

    // Upload line data
    updateDynamicBuffer(gl, this.lineBuffer, 2);

    gl.useProgram(this.lineProgram.program);
    gl.bindVertexArray(this.lineVAO);

    gl.uniformMatrix4fv(this.lineProgram.uniforms['u_projection'], false, this.projection);
    
    const [r, g, b] = hexToRGBA(color, alpha);
    gl.uniform4f(this.lineProgram.uniforms['u_color'], r, g, b, alpha);

    gl.drawArrays(gl.LINES, 0, this.lineBuffer.count);

    gl.bindVertexArray(null);
  }

  /**
   * Draw all accumulated circles
   */
  drawCircles(): void {
    const gl = this.gl;
    if (!this.circleProgram || !this.circleVAO || !this.circleInstanceBuffer || this.circleInstanceBuffer.count === 0) return;

    // Upload instance data
    updateDynamicBuffer(gl, this.circleInstanceBuffer, CIRCLE_FLOATS_PER_INSTANCE);

    gl.useProgram(this.circleProgram.program);
    gl.bindVertexArray(this.circleVAO);

    gl.uniformMatrix4fv(this.circleProgram.uniforms['u_projection'], false, this.projection);

    // Draw all circles with instancing (6 vertices per quad)
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, this.circleInstanceBuffer.count);

    gl.bindVertexArray(null);
  }

  /**
   * Draw all accumulated quads
   */
  drawQuads(): void {
    const gl = this.gl;
    if (!this.quadProgram || !this.quadVAO || !this.quadInstanceBuffer || this.quadInstanceBuffer.count === 0) return;

    // Upload instance data
    updateDynamicBuffer(gl, this.quadInstanceBuffer, QUAD_FLOATS_PER_INSTANCE);

    gl.useProgram(this.quadProgram.program);
    gl.bindVertexArray(this.quadVAO);

    gl.uniformMatrix4fv(this.quadProgram.uniforms['u_projection'], false, this.projection);

    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, this.quadInstanceBuffer.count);

    gl.bindVertexArray(null);
  }

  /**
   * Draw all accumulated rings
   */
  drawRings(): void {
    const gl = this.gl;
    if (!this.ringProgram || !this.ringVAO || !this.ringInstanceBuffer || this.ringInstanceBuffer.count === 0) return;

    // Upload instance data
    updateDynamicBuffer(gl, this.ringInstanceBuffer, RING_FLOATS_PER_INSTANCE);

    gl.useProgram(this.ringProgram.program);
    gl.bindVertexArray(this.ringVAO);

    gl.uniformMatrix4fv(this.ringProgram.uniforms['u_projection'], false, this.projection);

    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, this.ringInstanceBuffer.count);

    gl.bindVertexArray(null);
  }

  /**
   * Get the WebGL2 context (for advanced usage)
   */
  getContext(): WebGL2RenderingContext {
    return this.gl;
  }

  /**
   * Get the projection matrix
   */
  getProjection(): Float32Array {
    return this.projection;
  }

  /**
   * Get canvas dimensions
   */
  getDimensions(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }

  /**
   * Clean up WebGL resources
   */
  dispose(): void {
    const gl = this.gl;

    // Delete VAOs
    if (this.circleVAO) gl.deleteVertexArray(this.circleVAO);
    if (this.lineVAO) gl.deleteVertexArray(this.lineVAO);
    if (this.quadVAO) gl.deleteVertexArray(this.quadVAO);
    if (this.ringVAO) gl.deleteVertexArray(this.ringVAO);

    // Delete buffers
    if (this.circleQuadBuffer) gl.deleteBuffer(this.circleQuadBuffer);
    if (this.unitQuadBuffer) gl.deleteBuffer(this.unitQuadBuffer);
    if (this.circleInstanceBuffer) gl.deleteBuffer(this.circleInstanceBuffer.buffer);
    if (this.quadInstanceBuffer) gl.deleteBuffer(this.quadInstanceBuffer.buffer);
    if (this.ringInstanceBuffer) gl.deleteBuffer(this.ringInstanceBuffer.buffer);
    if (this.lineBuffer) gl.deleteBuffer(this.lineBuffer.buffer);

    // Delete programs
    if (this.circleProgram) gl.deleteProgram(this.circleProgram.program);
    if (this.lineProgram) gl.deleteProgram(this.lineProgram.program);
    if (this.quadProgram) gl.deleteProgram(this.quadProgram.program);
    if (this.ringProgram) gl.deleteProgram(this.ringProgram.program);
  }
}

/**
 * Canvas 2D Fallback Renderer
 *
 * Used when WebGL2 is not available.
 */
export class CanvasFallbackRenderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private width: number = 0;
  private height: number = 0;

  // Pending shapes to draw
  private circles: Array<{ x: number; y: number; radius: number; color: string; alpha: number }> = [];
  private quads: Array<{ x: number; y: number; width: number; height: number; color: string; alpha: number }> = [];
  private rings: Array<{ x: number; y: number; radius: number; thickness: number; color: string; alpha: number }> = [];
  private lines: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }
    this.ctx = ctx;
  }

  private hexToString(hex: number): string {
    return '#' + hex.toString(16).padStart(6, '0');
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  beginFrame(): void {
    this.circles = [];
    this.quads = [];
    this.rings = [];
    this.lines = [];
  }

  addCircle(x: number, y: number, radius: number, color: number, alpha: number = 1): void {
    this.circles.push({ x, y, radius, color: this.hexToString(color), alpha });
  }

  addQuad(x: number, y: number, width: number, height: number, color: number, alpha: number = 1): void {
    this.quads.push({ x, y, width, height, color: this.hexToString(color), alpha });
  }

  addRing(x: number, y: number, radius: number, thickness: number, color: number, alpha: number = 1): void {
    this.rings.push({ x, y, radius, thickness, color: this.hexToString(color), alpha });
  }

  addLine(x1: number, y1: number, x2: number, y2: number): void {
    this.lines.push({ x1, y1, x2, y2 });
  }

  drawLines(color: number, alpha: number = 1): void {
    const ctx = this.ctx;
    ctx.strokeStyle = this.hexToString(color);
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (const line of this.lines) {
      ctx.moveTo(line.x1, line.y1);
      ctx.lineTo(line.x2, line.y2);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  drawCircles(): void {
    const ctx = this.ctx;
    for (const circle of this.circles) {
      ctx.globalAlpha = circle.alpha;
      ctx.fillStyle = circle.color;
      ctx.beginPath();
      ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawQuads(): void {
    const ctx = this.ctx;
    for (const quad of this.quads) {
      ctx.globalAlpha = quad.alpha;
      ctx.fillStyle = quad.color;
      ctx.fillRect(quad.x, quad.y, quad.width, quad.height);
    }
    ctx.globalAlpha = 1;
  }

  drawRings(): void {
    const ctx = this.ctx;
    for (const ring of this.rings) {
      ctx.globalAlpha = ring.alpha;
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = ring.thickness;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  getProjection(): Float32Array {
    return createOrthoMatrix(0, this.width, this.height, 0);
  }

  getDimensions(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }

  dispose(): void {
    // Nothing to clean up for Canvas 2D
  }
}

/**
 * Renderer type (either WebGL2 or Canvas2D fallback)
 */
export type Renderer = WebGL2Renderer | CanvasFallbackRenderer;

/**
 * Creates the appropriate renderer based on WebGL2 support
 */
export function createRenderer(canvas: HTMLCanvasElement): Renderer {
  if (isWebGL2Supported()) {
    try {
      return new WebGL2Renderer({ canvas });
    } catch (e) {
      console.warn('Failed to create WebGL2 renderer, falling back to Canvas 2D:', e);
    }
  }
  
  console.warn('WebGL2 not supported, using Canvas 2D fallback');
  return new CanvasFallbackRenderer(canvas);
}
