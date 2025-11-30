import { createProgram } from "./shaders.ts";
import { initWebGL2, resizeCanvas } from "./webgl2Context.ts";

const GRID_SPACING = 64;
const GRID_COLOR = [255 / 255, 210 / 255, 102 / 255, 0.08] as const;

export class WebGL2Grid {
  static create(canvas: HTMLCanvasElement) {
    const context = initWebGL2(canvas);
    if (!context) return null;
    return new WebGL2Grid(canvas, context.gl, context.dpr);
  }

  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private vao: WebGLVertexArrayObject | null;
  private buffer: WebGLBuffer | null;
  private vertexCount = 0;
  private resolution = { width: 0, height: 0 };
  private needsRender = true;
  private enabled = true;
  private readonly dpr: number;
  private readonly cellSize = GRID_SPACING;
  private readonly uniforms: { resolution: WebGLUniformLocation | null; color: WebGLUniformLocation | null; };

  private constructor(private canvas: HTMLCanvasElement, gl: WebGL2RenderingContext, dpr: number) {
    this.gl = gl;
    this.dpr = dpr;
    this.program = createProgram(gl, this.vertexShaderSource(), this.fragmentShaderSource());
    this.vao = gl.createVertexArray();
    this.buffer = gl.createBuffer();
    this.uniforms = {
      resolution: gl.getUniformLocation(this.program, "u_resolution"),
      color: gl.getUniformLocation(this.program, "u_color")
    };

    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);

    const positionLocation = gl.getAttribLocation(this.program, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.clearColor(0, 0, 0, 0);
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  setEnabled(enabled: boolean) {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    this.needsRender = enabled;
    if (!enabled) {
      this.clear();
    }
  }

  resize(width: number, height: number) {
    if (!this.enabled) return;
    const { width: pixelWidth, height: pixelHeight } = resizeCanvas(this.gl, this.canvas, width, height, this.dpr);
    if (pixelWidth === this.resolution.width && pixelHeight === this.resolution.height) {
      return;
    }

    this.resolution = { width: pixelWidth, height: pixelHeight };
    this.buildGrid();
    this.needsRender = true;
  }

  render() {
    if (!this.enabled || !this.vertexCount) return;
    if (!this.needsRender) return;
    const gl = this.gl;
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);

    if (this.uniforms.resolution) {
      gl.uniform2f(this.uniforms.resolution, this.resolution.width, this.resolution.height);
    }
    if (this.uniforms.color) {
      gl.uniform4f(this.uniforms.color, ...GRID_COLOR);
    }

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.LINES, 0, this.vertexCount);
    this.needsRender = false;
  }

  clear() {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  private buildGrid() {
    const gl = this.gl;
    if (!this.buffer) return;

    const spacing = this.cellSize * this.dpr;
    const lines: number[] = [];

    for (let x = 0; x <= this.resolution.width; x += spacing) {
      lines.push(x, 0, x, this.resolution.height);
    }
    for (let y = 0; y <= this.resolution.height; y += spacing) {
      lines.push(0, y, this.resolution.width, y);
    }

    this.vertexCount = lines.length / 2;
    const vertices = new Float32Array(lines);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  }

  private vertexShaderSource() {
    return `#version 300 es\n`
      + `in vec2 a_position;\n`
      + `uniform vec2 u_resolution;\n`
      + `void main() {\n`
      + `  vec2 zeroToOne = a_position / u_resolution;\n`
      + `  vec2 clip = zeroToOne * 2.0 - 1.0;\n`
      + `  clip.y *= -1.0;\n`
      + `  gl_Position = vec4(clip, 0.0, 1.0);\n`
      + `}`;
  }

  private fragmentShaderSource() {
    return `#version 300 es\n`
      + `precision highp float;\n`
      + `uniform vec4 u_color;\n`
      + `out vec4 outColor;\n`
      + `void main() { outColor = u_color; }`;
  }
}
