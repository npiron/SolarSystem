import { bindAttributePointers, createBuffer, createQuadCorners, ensureCapacity } from "./buffers.ts";
import { createProgram, quadFragmentShader, quadVertexShader } from "./shaders.ts";

export type QuadInstance = {
  position: readonly [number, number];
  size: readonly [number, number];
  color: readonly [number, number, number, number];
};

const FLOATS_PER_QUAD = 12;

export class QuadBatch {
  private readonly program: WebGLProgram;
  private readonly vao: WebGLVertexArrayObject | null;
  private readonly corners: WebGLBuffer | null;
  private readonly instanceBuffer: WebGLBuffer | null;
  private readonly uniforms: { resolution: WebGLUniformLocation | null };
  private data: Float32Array;
  private count = 0;

  constructor(private readonly gl: WebGL2RenderingContext, private readonly dpr: number) {
    this.program = createProgram(gl, quadVertexShader, quadFragmentShader);
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

  push(quad: QuadInstance) {
    this.data = ensureCapacity(this.data, (this.count + 1) * FLOATS_PER_QUAD);
    const offset = this.count * FLOATS_PER_QUAD;
    const dpr = this.dpr;

    this.data[offset] = quad.position[0] * dpr;
    this.data[offset + 1] = quad.position[1] * dpr;
    this.data[offset + 2] = quad.size[0] * dpr;
    this.data[offset + 3] = quad.size[1] * dpr;
    this.data[offset + 4] = quad.color[0];
    this.data[offset + 5] = quad.color[1];
    this.data[offset + 6] = quad.color[2];
    this.data[offset + 7] = quad.color[3];

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
    gl.bufferData(gl.ARRAY_BUFFER, this.data.subarray(0, this.count * FLOATS_PER_QUAD), gl.DYNAMIC_DRAW);
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
    const stride = FLOATS_PER_QUAD * 4;
    bindAttributePointers(gl, [
      { location: gl.getAttribLocation(this.program, "a_position"), size: 2, stride, offset: 0, divisor: 1 },
      { location: gl.getAttribLocation(this.program, "a_size"), size: 2, stride, offset: 8, divisor: 1 },
      { location: gl.getAttribLocation(this.program, "a_color"), size: 4, stride, offset: 16, divisor: 1 }
    ]);
  }
}
