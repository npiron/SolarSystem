import { initWebGL2 } from "./webgl2Context.ts";

type CircleInstance = {
  x: number;
  y: number;
  radius: number;
  color: readonly [number, number, number, number];
  halo?: {
    color: readonly [number, number, number, number];
    scale: number;
  };
};

const FLOATS_PER_INSTANCE = 12;
const MAX_DPR = 2;

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

export class WebGL2Circles {
  static create(canvas: HTMLCanvasElement) {
    const context = initWebGL2(canvas);
    if (!context) return null;
    return new WebGL2Circles(canvas, context.gl);
  }

  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private vao: WebGLVertexArrayObject | null;
  private quadBuffer: WebGLBuffer | null;
  private instanceBuffer: WebGLBuffer | null;
  private resolution = { width: 0, height: 0 };
  private enabled = true;
  private readonly dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, MAX_DPR));
  private readonly uniforms: { resolution: WebGLUniformLocation | null };
  private data: Float32Array;
  private capacity = 0;
  private instanceCount = 0;

  private constructor(private canvas: HTMLCanvasElement, gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.program = createProgram(gl, this.vertexShaderSource(), this.fragmentShaderSource());
    this.uniforms = {
      resolution: gl.getUniformLocation(this.program, "u_resolution")
    };

    this.vao = gl.createVertexArray();
    this.quadBuffer = gl.createBuffer();
    this.instanceBuffer = gl.createBuffer();

    this.data = new Float32Array(0);

    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
    this.configureQuad();
    this.configureInstanceAttributes();

    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.STENCIL_TEST);
  }

  setEnabled(enabled: boolean) {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
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
  }

  beginFrame() {
    this.instanceCount = 0;
  }

  push(circle: CircleInstance) {
    if (!this.enabled) return;
    this.ensureCapacity(this.instanceCount + 1);
    const offset = this.instanceCount * FLOATS_PER_INSTANCE;
    const haloColor = circle.halo?.color ?? [0, 0, 0, 0];
    const haloScale = circle.halo?.scale ?? 1;

    this.data[offset] = circle.x * this.dpr;
    this.data[offset + 1] = circle.y * this.dpr;
    this.data[offset + 2] = circle.radius * this.dpr;
    this.data[offset + 3] = circle.color[0];
    this.data[offset + 4] = circle.color[1];
    this.data[offset + 5] = circle.color[2];
    this.data[offset + 6] = circle.color[3];
    this.data[offset + 7] = haloColor[0];
    this.data[offset + 8] = haloColor[1];
    this.data[offset + 9] = haloColor[2];
    this.data[offset + 10] = haloColor[3];
    this.data[offset + 11] = haloScale;
    this.instanceCount += 1;
  }

  render() {
    if (!this.enabled) return;
    const gl = this.gl;
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
    gl.viewport(0, 0, this.resolution.width, this.resolution.height);

    if (this.uniforms.resolution) {
      gl.uniform2f(this.uniforms.resolution, this.resolution.width, this.resolution.height);
    }

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    if (!this.instanceCount) return;

    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.data.subarray(0, this.instanceCount * FLOATS_PER_INSTANCE));
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.instanceCount);
  }

  clear() {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  private ensureCapacity(targetInstances: number) {
    if (targetInstances <= this.capacity) return;
    const nextCapacity = Math.max(targetInstances, Math.max(64, this.capacity * 2));
    this.capacity = nextCapacity;
    this.data = new Float32Array(this.capacity * FLOATS_PER_INSTANCE);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.instanceBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.data.byteLength, this.gl.DYNAMIC_DRAW);
  }

  private configureQuad() {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -1, -1,
        1, -1,
        -1, 1,
        1, 1
      ]),
      gl.STATIC_DRAW
    );

    const cornerLoc = gl.getAttribLocation(this.program, "a_corner");
    gl.enableVertexAttribArray(cornerLoc);
    gl.vertexAttribPointer(cornerLoc, 2, gl.FLOAT, false, 0, 0);
  }

  private configureInstanceAttributes() {
    const gl = this.gl;
    const stride = FLOATS_PER_INSTANCE * 4;

    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);

    const centerLoc = gl.getAttribLocation(this.program, "a_center");
    gl.enableVertexAttribArray(centerLoc);
    gl.vertexAttribPointer(centerLoc, 2, gl.FLOAT, false, stride, 0);
    gl.vertexAttribDivisor(centerLoc, 1);

    const radiusLoc = gl.getAttribLocation(this.program, "a_radius");
    gl.enableVertexAttribArray(radiusLoc);
    gl.vertexAttribPointer(radiusLoc, 1, gl.FLOAT, false, stride, 8);
    gl.vertexAttribDivisor(radiusLoc, 1);

    const colorLoc = gl.getAttribLocation(this.program, "a_color");
    gl.enableVertexAttribArray(colorLoc);
    gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, stride, 12);
    gl.vertexAttribDivisor(colorLoc, 1);

    const haloColorLoc = gl.getAttribLocation(this.program, "a_haloColor");
    gl.enableVertexAttribArray(haloColorLoc);
    gl.vertexAttribPointer(haloColorLoc, 4, gl.FLOAT, false, stride, 28);
    gl.vertexAttribDivisor(haloColorLoc, 1);

    const haloScaleLoc = gl.getAttribLocation(this.program, "a_haloScale");
    gl.enableVertexAttribArray(haloScaleLoc);
    gl.vertexAttribPointer(haloScaleLoc, 1, gl.FLOAT, false, stride, 44);
    gl.vertexAttribDivisor(haloScaleLoc, 1);
  }

  private vertexShaderSource() {
    return `#version 300 es\n`
      + `in vec2 a_corner;\n`
      + `in vec2 a_center;\n`
      + `in float a_radius;\n`
      + `in vec4 a_color;\n`
      + `in vec4 a_haloColor;\n`
      + `in float a_haloScale;\n`
      + `uniform vec2 u_resolution;\n`
      + `out vec2 v_corner;\n`
      + `out float v_radius;\n`
      + `out vec4 v_color;\n`
      + `out vec4 v_haloColor;\n`
      + `out float v_haloScale;\n`
      + `void main() {\n`
      + `  vec2 world = a_center + a_corner * a_radius;\n`
      + `  vec2 zeroToOne = world / u_resolution;\n`
      + `  vec2 clip = zeroToOne * 2.0 - 1.0;\n`
      + `  clip.y *= -1.0;\n`
      + `  gl_Position = vec4(clip, 0.0, 1.0);\n`
      + `  v_corner = a_corner;\n`
      + `  v_radius = a_radius;\n`
      + `  v_color = a_color;\n`
      + `  v_haloColor = a_haloColor;\n`
      + `  v_haloScale = a_haloScale;\n`
      + `}`;
  }

  private fragmentShaderSource() {
    return `#version 300 es\n`
      + `precision highp float;\n`
      + `in vec2 v_corner;\n`
      + `in float v_radius;\n`
      + `in vec4 v_color;\n`
      + `in vec4 v_haloColor;\n`
      + `in float v_haloScale;\n`
      + `out vec4 outColor;\n`
      + `void main() {\n`
      + `  float aa = 1.5;\n`
      + `  float distPx = length(v_corner * v_radius);\n`
      + `  float fill = smoothstep(v_radius, v_radius - aa, distPx) * v_color.a;\n`
      + `  float halo = 0.0;\n`
      + `  if (v_haloScale > 1.0 && v_haloColor.a > 0.0) {\n`
      + `    float haloStart = v_radius;\n`
      + `    float haloEnd = v_radius * v_haloScale;\n`
      + `    float inner = smoothstep(haloStart + aa, haloStart, distPx);\n`
      + `    float outer = smoothstep(haloEnd, haloEnd - aa, distPx);\n`
      + `    halo = inner * outer * v_haloColor.a;\n`
      + `  }\n`
      + `  float alpha = clamp(fill + halo, 0.0, 1.0);\n`
      + `  vec3 color = vec3(0.0);\n`
      + `  if (alpha > 0.0) {\n`
      + `    color = (v_color.rgb * fill + v_haloColor.rgb * halo);\n`
      + `  }\n`
      + `  outColor = vec4(color, alpha);\n`
      + `}`;
  }
}
