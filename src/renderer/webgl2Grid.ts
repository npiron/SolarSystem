import { initWebGL2 } from "./webgl2Context.ts";

const GRID_SPACING = 64;
const GRID_COLOR = [255 / 255, 210 / 255, 102 / 255, 0.08] as const;

function compileShader(gl: WebGL2RenderingContext, type: GLenum, source: string) {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error("Impossible de créer le shader WebGL2");
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Erreur de compilation shader: ${log || "inconnue"}`);
  }
  return shader;
}

function createProgram(gl: WebGL2RenderingContext, vertexSrc: string, fragmentSrc: string) {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSrc);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSrc);
  const program = gl.createProgram();
  if (!program) {
    throw new Error("Impossible de créer le programme WebGL2");
  }
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    throw new Error(`Echec du linkage du programme: ${log || "inconnu"}`);
  }

  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  return program;
}

export class WebGL2Grid {
  static create(canvas: HTMLCanvasElement) {
    const context = initWebGL2(canvas);
    if (!context) return null;
    return new WebGL2Grid(canvas, context.gl);
  }

  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private vao: WebGLVertexArrayObject | null;
  private buffer: WebGLBuffer | null;
  private vertexCount = 0;
  private resolution = { width: 0, height: 0 };
  private needsRender = true;
  private enabled = true;
  private readonly dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
  private readonly cellSize = GRID_SPACING;
  private readonly uniforms: { resolution: WebGLUniformLocation | null; color: WebGLUniformLocation | null; };

  private constructor(private canvas: HTMLCanvasElement, gl: WebGL2RenderingContext) {
    this.gl = gl;
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
    const pixelWidth = Math.max(1, Math.round(width * this.dpr));
    const pixelHeight = Math.max(1, Math.round(height * this.dpr));

    if (pixelWidth === this.resolution.width && pixelHeight === this.resolution.height) {
      return;
    }

    this.canvas.width = pixelWidth;
    this.canvas.height = pixelHeight;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    this.resolution = { width: pixelWidth, height: pixelHeight };
    this.gl.viewport(0, 0, pixelWidth, pixelHeight);
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
