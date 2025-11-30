import { bindAttributePointers, createBuffer, ensureCapacity } from "./buffers.ts";
import { createProgram, lineFragmentShader, lineVertexShader } from "./shaders.ts";

export type LineInstance = {
  from: readonly [number, number];
  to: readonly [number, number];
  color: readonly [number, number, number, number];
};

const FLOATS_PER_LINE_VERTEX = 6;

export class LineBatch {
  private readonly program: WebGLProgram;
  private readonly vao: WebGLVertexArrayObject | null;
  private readonly buffer: WebGLBuffer | null;
  private readonly uniforms: { resolution: WebGLUniformLocation | null };
  private data: Float32Array;
  private vertexCount = 0;

  constructor(private readonly gl: WebGL2RenderingContext, private readonly dpr: number) {
    this.program = createProgram(gl, lineVertexShader, lineFragmentShader);
    this.vao = gl.createVertexArray();
    this.buffer = createBuffer(gl, gl.ARRAY_BUFFER, 0, gl.DYNAMIC_DRAW);
    this.uniforms = {
      resolution: gl.getUniformLocation(this.program, "u_resolution")
    };
    this.data = new Float32Array(0);

    this.configureAttributes();
  }

  beginFrame() {
    this.vertexCount = 0;
  }

  push(line: LineInstance) {
    this.data = ensureCapacity(this.data, (this.vertexCount + 2) * FLOATS_PER_LINE_VERTEX);
    const dpr = this.dpr;
    const start = this.vertexCount * FLOATS_PER_LINE_VERTEX;
    const end = start + FLOATS_PER_LINE_VERTEX;

    this.data[start] = line.from[0] * dpr;
    this.data[start + 1] = line.from[1] * dpr;
    this.data[start + 2] = line.color[0];
    this.data[start + 3] = line.color[1];
    this.data[start + 4] = line.color[2];
    this.data[start + 5] = line.color[3];

    this.data[end] = line.to[0] * dpr;
    this.data[end + 1] = line.to[1] * dpr;
    this.data[end + 2] = line.color[0];
    this.data[end + 3] = line.color[1];
    this.data[end + 4] = line.color[2];
    this.data[end + 5] = line.color[3];

    this.vertexCount += 2;
  }

  flush(resolution: { width: number; height: number }) {
    if (!this.vertexCount) return;

    const gl = this.gl;
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
    if (this.uniforms.resolution) {
      gl.uniform2f(this.uniforms.resolution, resolution.width, resolution.height);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.data.subarray(0, this.vertexCount * FLOATS_PER_LINE_VERTEX), gl.DYNAMIC_DRAW);
    gl.drawArrays(gl.LINES, 0, this.vertexCount);
  }

  clear() {
    this.vertexCount = 0;
  }

  private configureAttributes() {
    const gl = this.gl;
    gl.bindVertexArray(this.vao);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    const stride = FLOATS_PER_LINE_VERTEX * 4;
    bindAttributePointers(gl, [
      { location: gl.getAttribLocation(this.program, "a_position"), size: 2, stride, offset: 0 },
      { location: gl.getAttribLocation(this.program, "a_color"), size: 4, stride, offset: 8 }
    ]);
  }
}
