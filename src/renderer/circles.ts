import type { Shape } from "../types/entities.ts";
import { bindAttributePointers, createBuffer, createQuadCorners, ensureCapacity } from "./buffers.ts";
import { circleFragmentShader, circleVertexShader, createProgram } from "./shaders.ts";

export type CircleInstance = {
  center: readonly [number, number];
  radius: number;
  color: readonly [number, number, number, number];
  halo?: { color: readonly [number, number, number, number]; scale: number };
  shape?: Shape;
};

const FLOATS_PER_CIRCLE = 12;

export class CircleBatch {
  private readonly program: WebGLProgram;
  private readonly vao: WebGLVertexArrayObject | null;
  private readonly corners: WebGLBuffer | null;
  private readonly instanceBuffer: WebGLBuffer | null;
  private readonly uniforms: { resolution: WebGLUniformLocation | null };
  private data: Float32Array;
  private count = 0;

  constructor(private readonly gl: WebGL2RenderingContext, private readonly dpr: number) {
    this.program = createProgram(gl, circleVertexShader, circleFragmentShader);
    this.vao = gl.createVertexArray();
    this.corners = createQuadCorners(gl);
    this.instanceBuffer = createBuffer(gl, gl.ARRAY_BUFFER, 0, gl.DYNAMIC_DRAW);
    this.uniforms = {
      resolution: gl.getUniformLocation(this.program, "u_resolution")
    };
    this.data = new Float32Array(0);

    this.configureAttributes();
  }

  beginFrame() {
    this.count = 0;
  }

  push(circle: CircleInstance) {
    this.data = ensureCapacity(this.data, (this.count + 1) * FLOATS_PER_CIRCLE);
    const halo = circle.halo ?? defaultHalo(circle.color);
    const offset = this.count * FLOATS_PER_CIRCLE;
    const dpr = this.dpr;

    this.data[offset] = circle.center[0] * dpr;
    this.data[offset + 1] = circle.center[1] * dpr;
    this.data[offset + 2] = circle.radius * dpr;
    this.data[offset + 3] = circle.color[0];
    this.data[offset + 4] = circle.color[1];
    this.data[offset + 5] = circle.color[2];
    this.data[offset + 6] = circle.color[3];
    this.data[offset + 7] = halo.color[0];
    this.data[offset + 8] = halo.color[1];
    this.data[offset + 9] = halo.color[2];
    this.data[offset + 10] = halo.color[3];
    this.data[offset + 11] = halo.scale;

    this.count += 1;
  }

  flush(resolution: { width: number; height: number }) {
    if (!this.count) return;

    const gl = this.gl;
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
    if (this.uniforms.resolution) {
      gl.uniform2f(this.uniforms.resolution, resolution.width, resolution.height);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.data.subarray(0, this.count * FLOATS_PER_CIRCLE), gl.DYNAMIC_DRAW);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.count);
  }

  clear() {
    this.count = 0;
  }

  private configureAttributes() {
    const gl = this.gl;
    gl.bindVertexArray(this.vao);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.corners);
    bindAttributePointers(gl, [
      { location: gl.getAttribLocation(this.program, "a_corner"), size: 2, stride: 0, offset: 0 }
    ]);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    const stride = FLOATS_PER_CIRCLE * 4;
    bindAttributePointers(gl, [
      { location: gl.getAttribLocation(this.program, "a_center"), size: 2, stride, offset: 0, divisor: 1 },
      { location: gl.getAttribLocation(this.program, "a_radius"), size: 1, stride, offset: 8, divisor: 1 },
      { location: gl.getAttribLocation(this.program, "a_color"), size: 4, stride, offset: 12, divisor: 1 },
      { location: gl.getAttribLocation(this.program, "a_haloColor"), size: 4, stride, offset: 28, divisor: 1 },
      { location: gl.getAttribLocation(this.program, "a_haloScale"), size: 1, stride, offset: 44, divisor: 1 }
    ]);
  }
}

function defaultHalo(color: readonly [number, number, number, number]) {
  return { color: [color[0], color[1], color[2], 0] as const, scale: 1 } as const;
}
