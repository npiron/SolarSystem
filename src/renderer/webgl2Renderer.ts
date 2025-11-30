import { createProgram } from "./shaders.ts";
import { initWebGL2, resizeCanvas } from "./webgl2Context.ts";
import { WebGL2TextRenderer, type TextInstance } from "./webgl2Text.ts";
import {
  gridVertexShader,
  gridFragmentShader,
  circlesVertexShader,
  circlesFragmentShader,
  healthVertexShader,
  healthFragmentShader
} from "./webgl2Shaders.ts";

const GRID_SPACING = 64;
const GRID_COLOR = [255 / 255, 210 / 255, 102 / 255, 0.08] as const;

type ShapeInstance = {
  x: number;
  y: number;
  radius: number;
  color: readonly [number, number, number, number];
  sides?: number;
  rotation?: number;
  halo?: {
    color: readonly [number, number, number, number];
    scale: number;
  };
};

type HealthBarInstance = {
  x: number;
  y: number;
  width: number;
  ratio: number;
};

export type { TextInstance };

const FLOATS_PER_SHAPE = 14;
const FLOATS_PER_HEALTH = 4;
const HEALTH_BAR_HEIGHT = 6;
const HEALTH_BAR_OFFSET = 12;

/**
 * Unified WebGL2 renderer that combines grid and circles rendering
 * into a single canvas using WebGL2.
 */
export class WebGL2Renderer {
  static create(canvas: HTMLCanvasElement) {
    const context = initWebGL2(canvas);
    if (!context) return null;
    return new WebGL2Renderer(canvas, context.gl, context.dpr);
  }

  private gl: WebGL2RenderingContext;
  private readonly dpr: number;
  private resolution = { width: 0, height: 0 };
  private enabled = true;
  private gridEnabled = true;

  // Grid rendering resources
  private gridProgram: WebGLProgram;
  private gridVao: WebGLVertexArrayObject | null;
  private gridBuffer: WebGLBuffer | null;
  private gridVertexCount = 0;
  private gridNeedsRebuild = true;
  private gridUniforms: { resolution: WebGLUniformLocation | null; color: WebGLUniformLocation | null };
  private readonly cellSize = GRID_SPACING;

  // Circles rendering resources
  private circlesProgram: WebGLProgram;
  private circlesVao: WebGLVertexArrayObject | null;
  private circlesQuadBuffer: WebGLBuffer | null;
  private circlesInstanceBuffer: WebGLBuffer | null;
  private circlesUniforms: { resolution: WebGLUniformLocation | null };
  private circlesData: Float32Array;
  private circlesCapacity = 0;
  private circlesCount = 0;

  // Health bar rendering resources
  private healthProgram: WebGLProgram;
  private healthVao: WebGLVertexArrayObject | null;
  private healthQuadBuffer: WebGLBuffer | null;
  private healthInstanceBuffer: WebGLBuffer | null;
  private healthUniforms: {
    resolution: WebGLUniformLocation | null;
    barHeight: WebGLUniformLocation | null;
    yOffset: WebGLUniformLocation | null;
    bgColor: WebGLUniformLocation | null;
    fgColor: WebGLUniformLocation | null;
    fillMode: WebGLUniformLocation | null;
  };
  private healthData: Float32Array;
  private healthCapacity = 0;
  private healthCount = 0;

  // Text rendering
  private textRenderer: WebGL2TextRenderer;

  private constructor(private canvas: HTMLCanvasElement, gl: WebGL2RenderingContext, dpr: number) {
    this.gl = gl;
    this.dpr = dpr;

    // Initialize grid program
    this.gridProgram = createProgram(gl, gridVertexShader, gridFragmentShader);
    this.gridVao = gl.createVertexArray();
    this.gridBuffer = gl.createBuffer();
    this.gridUniforms = {
      resolution: gl.getUniformLocation(this.gridProgram, "u_resolution"),
      color: gl.getUniformLocation(this.gridProgram, "u_color")
    };

    gl.useProgram(this.gridProgram);
    gl.bindVertexArray(this.gridVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.gridBuffer);

    const gridPositionLoc = gl.getAttribLocation(this.gridProgram, "a_position");
    gl.enableVertexAttribArray(gridPositionLoc);
    gl.vertexAttribPointer(gridPositionLoc, 2, gl.FLOAT, false, 0, 0);

    // Initialize circles program
    this.circlesProgram = createProgram(gl, circlesVertexShader, circlesFragmentShader);
    this.circlesVao = gl.createVertexArray();
    this.circlesQuadBuffer = gl.createBuffer();
    this.circlesInstanceBuffer = gl.createBuffer();
    this.circlesUniforms = {
      resolution: gl.getUniformLocation(this.circlesProgram, "u_resolution")
    };
    this.circlesData = new Float32Array(0);

    gl.useProgram(this.circlesProgram);
    gl.bindVertexArray(this.circlesVao);
    this.configureCirclesQuad();
    this.configureCirclesInstanceAttributes();

    // Initialize health bar program
    this.healthProgram = createProgram(gl, healthVertexShader, healthFragmentShader);
    this.healthVao = gl.createVertexArray();
    this.healthQuadBuffer = gl.createBuffer();
    this.healthInstanceBuffer = gl.createBuffer();
    this.healthUniforms = {
      resolution: gl.getUniformLocation(this.healthProgram, "u_resolution"),
      barHeight: gl.getUniformLocation(this.healthProgram, "u_height"),
      yOffset: gl.getUniformLocation(this.healthProgram, "u_yOffset"),
      bgColor: gl.getUniformLocation(this.healthProgram, "u_bgColor"),
      fgColor: gl.getUniformLocation(this.healthProgram, "u_fgColor"),
      fillMode: gl.getUniformLocation(this.healthProgram, "u_fillMode")
    };
    this.healthData = new Float32Array(0);

    gl.useProgram(this.healthProgram);
    gl.bindVertexArray(this.healthVao);
    this.configureHealthQuad();
    this.configureHealthInstanceAttributes();

    // Set up blending and other GL state
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.STENCIL_TEST);
    gl.clearColor(0, 0, 0, 0);

    // Initialize text renderer
    this.textRenderer = new WebGL2TextRenderer(gl, dpr);
  }

  setEnabled(enabled: boolean) {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    if (!enabled) {
      this.clear();
    }
  }

  setGridEnabled(enabled: boolean) {
    this.gridEnabled = enabled;
  }

  resize(width: number, height: number) {
    if (!this.enabled) return;
    const { width: pixelWidth, height: pixelHeight } = resizeCanvas(this.gl, this.canvas, width, height, this.dpr);
    if (pixelWidth === this.resolution.width && pixelHeight === this.resolution.height) {
      return;
    }

    this.resolution = { width: pixelWidth, height: pixelHeight };
    this.gridNeedsRebuild = true;
  }

  beginFrame() {
    this.circlesCount = 0;
    this.healthCount = 0;
    this.textRenderer.beginFrame();
  }

  pushCircle(circle: ShapeInstance) {
    if (!this.enabled) return;
    this.ensureCirclesCapacity(this.circlesCount + 1);
    const offset = this.circlesCount * FLOATS_PER_SHAPE;
    const haloColor = circle.halo?.color ?? [0, 0, 0, 0];
    const haloScale = circle.halo?.scale ?? 1;
    const sides = circle.sides ?? 0;
    const rotation = circle.rotation ?? 0;

    this.circlesData[offset] = circle.x * this.dpr;
    this.circlesData[offset + 1] = circle.y * this.dpr;
    this.circlesData[offset + 2] = circle.radius * this.dpr;
    this.circlesData[offset + 3] = circle.color[0];
    this.circlesData[offset + 4] = circle.color[1];
    this.circlesData[offset + 5] = circle.color[2];
    this.circlesData[offset + 6] = circle.color[3];
    this.circlesData[offset + 7] = haloColor[0];
    this.circlesData[offset + 8] = haloColor[1];
    this.circlesData[offset + 9] = haloColor[2];
    this.circlesData[offset + 10] = haloColor[3];
    this.circlesData[offset + 11] = haloScale;
    this.circlesData[offset + 12] = sides;
    this.circlesData[offset + 13] = rotation;
    this.circlesCount += 1;
  }

  pushHealthBar(instance: HealthBarInstance) {
    if (!this.enabled) return;
    this.ensureHealthCapacity(this.healthCount + 1);
    const offset = this.healthCount * FLOATS_PER_HEALTH;
    this.healthData[offset] = instance.x * this.dpr;
    this.healthData[offset + 1] = instance.y * this.dpr;
    this.healthData[offset + 2] = (instance.width * 0.5) * this.dpr;
    this.healthData[offset + 3] = Math.max(0, Math.min(1, instance.ratio));
    this.healthCount += 1;
  }

  /**
   * Add text to be rendered this frame
   */
  pushText(text: TextInstance) {
    if (!this.enabled) return;
    this.textRenderer.pushText(text);
  }

  render() {
    if (!this.enabled) return;
    const gl = this.gl;

    gl.viewport(0, 0, this.resolution.width, this.resolution.height);
    // Clear the entire canvas each frame. Since circles are dynamic and share 
    // the same canvas as the static grid, we must redraw everything each frame.
    // The grid vertex buffer is cached via gridNeedsRebuild flag to avoid
    // unnecessary geometry rebuilding.
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Render grid first (background)
    if (this.gridEnabled) {
      this.renderGrid();
    }

    // Render circles on top
    this.renderCircles();

    // Render health bars
    this.renderHealthBars();

    // Render text last (on top of everything)
    this.textRenderer.render(this.resolution);
  }

  clear() {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  /**
   * Clean up WebGL resources
   */
  dispose() {
    const gl = this.gl;
    
    // Dispose text renderer
    this.textRenderer.dispose();
    
    // Clean up grid resources
    if (this.gridVao) gl.deleteVertexArray(this.gridVao);
    if (this.gridBuffer) gl.deleteBuffer(this.gridBuffer);
    if (this.gridProgram) gl.deleteProgram(this.gridProgram);
    
    // Clean up circles resources
    if (this.circlesVao) gl.deleteVertexArray(this.circlesVao);
    if (this.circlesQuadBuffer) gl.deleteBuffer(this.circlesQuadBuffer);
    if (this.circlesInstanceBuffer) gl.deleteBuffer(this.circlesInstanceBuffer);
    if (this.circlesProgram) gl.deleteProgram(this.circlesProgram);

    // Clean up health resources
    if (this.healthVao) gl.deleteVertexArray(this.healthVao);
    if (this.healthQuadBuffer) gl.deleteBuffer(this.healthQuadBuffer);
    if (this.healthInstanceBuffer) gl.deleteBuffer(this.healthInstanceBuffer);
    if (this.healthProgram) gl.deleteProgram(this.healthProgram);
  }

  private renderGrid() {
    if (this.gridNeedsRebuild) {
      this.buildGrid();
    }

    if (!this.gridVertexCount) return;

    const gl = this.gl;
    gl.useProgram(this.gridProgram);
    gl.bindVertexArray(this.gridVao);

    if (this.gridUniforms.resolution) {
      gl.uniform2f(this.gridUniforms.resolution, this.resolution.width, this.resolution.height);
    }
    if (this.gridUniforms.color) {
      gl.uniform4f(this.gridUniforms.color, ...GRID_COLOR);
    }

    gl.drawArrays(gl.LINES, 0, this.gridVertexCount);
  }

  private renderCircles() {
    if (!this.circlesCount) return;

    const gl = this.gl;
    gl.useProgram(this.circlesProgram);
    gl.bindVertexArray(this.circlesVao);

    if (this.circlesUniforms.resolution) {
      gl.uniform2f(this.circlesUniforms.resolution, this.resolution.width, this.resolution.height);
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.circlesInstanceBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.circlesData.subarray(0, this.circlesCount * FLOATS_PER_SHAPE));
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.circlesCount);
  }

  private renderHealthBars() {
    if (!this.healthCount) return;

    const gl = this.gl;
    gl.useProgram(this.healthProgram);
    gl.bindVertexArray(this.healthVao);

    if (this.healthUniforms.resolution) {
      gl.uniform2f(this.healthUniforms.resolution, this.resolution.width, this.resolution.height);
    }
    if (this.healthUniforms.barHeight) {
      gl.uniform1f(this.healthUniforms.barHeight, HEALTH_BAR_HEIGHT * this.dpr);
    }
    if (this.healthUniforms.yOffset) {
      gl.uniform1f(this.healthUniforms.yOffset, HEALTH_BAR_OFFSET * this.dpr);
    }
    if (this.healthUniforms.bgColor) {
      gl.uniform4f(this.healthUniforms.bgColor, ...webglColors.hpBg);
    }
    if (this.healthUniforms.fgColor) {
      gl.uniform4f(this.healthUniforms.fgColor, ...webglColors.hpFg);
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.healthInstanceBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.healthData.subarray(0, this.healthCount * FLOATS_PER_HEALTH));

    if (this.healthUniforms.fillMode) {
      gl.uniform1i(this.healthUniforms.fillMode, 0);
    }
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.healthCount);

    if (this.healthUniforms.fillMode) {
      gl.uniform1i(this.healthUniforms.fillMode, 1);
    }
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.healthCount);
  }

  private buildGrid() {
    const gl = this.gl;
    if (!this.gridBuffer) return;

    const spacing = this.cellSize * this.dpr;
    const lines: number[] = [];

    for (let x = 0; x <= this.resolution.width; x += spacing) {
      lines.push(x, 0, x, this.resolution.height);
    }
    for (let y = 0; y <= this.resolution.height; y += spacing) {
      lines.push(0, y, this.resolution.width, y);
    }

    this.gridVertexCount = lines.length / 2;
    const vertices = new Float32Array(lines);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.gridBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    this.gridNeedsRebuild = false;
  }

  private ensureCirclesCapacity(targetInstances: number) {
    if (targetInstances <= this.circlesCapacity) return;
    const nextCapacity = Math.max(targetInstances, Math.max(64, this.circlesCapacity * 2));
    this.circlesCapacity = nextCapacity;
    this.circlesData = new Float32Array(this.circlesCapacity * FLOATS_PER_SHAPE);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.circlesInstanceBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.circlesData.byteLength, this.gl.DYNAMIC_DRAW);
  }

  private ensureHealthCapacity(targetInstances: number) {
    if (targetInstances <= this.healthCapacity) return;
    const nextCapacity = Math.max(targetInstances, Math.max(32, this.healthCapacity * 2));
    this.healthCapacity = nextCapacity;
    this.healthData = new Float32Array(this.healthCapacity * FLOATS_PER_HEALTH);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.healthInstanceBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.healthData.byteLength, this.gl.DYNAMIC_DRAW);
  }

  private configureCirclesQuad() {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.circlesQuadBuffer);
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

    const cornerLoc = gl.getAttribLocation(this.circlesProgram, "a_corner");
    gl.enableVertexAttribArray(cornerLoc);
    gl.vertexAttribPointer(cornerLoc, 2, gl.FLOAT, false, 0, 0);
  }

  private configureCirclesInstanceAttributes() {
    const gl = this.gl;
    const stride = FLOATS_PER_SHAPE * 4;

    gl.bindBuffer(gl.ARRAY_BUFFER, this.circlesInstanceBuffer);

    const centerLoc = gl.getAttribLocation(this.circlesProgram, "a_center");
    gl.enableVertexAttribArray(centerLoc);
    gl.vertexAttribPointer(centerLoc, 2, gl.FLOAT, false, stride, 0);
    gl.vertexAttribDivisor(centerLoc, 1);

    const radiusLoc = gl.getAttribLocation(this.circlesProgram, "a_radius");
    gl.enableVertexAttribArray(radiusLoc);
    gl.vertexAttribPointer(radiusLoc, 1, gl.FLOAT, false, stride, 8);
    gl.vertexAttribDivisor(radiusLoc, 1);

    const colorLoc = gl.getAttribLocation(this.circlesProgram, "a_color");
    gl.enableVertexAttribArray(colorLoc);
    gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, stride, 12);
    gl.vertexAttribDivisor(colorLoc, 1);

    const haloColorLoc = gl.getAttribLocation(this.circlesProgram, "a_haloColor");
    gl.enableVertexAttribArray(haloColorLoc);
    gl.vertexAttribPointer(haloColorLoc, 4, gl.FLOAT, false, stride, 28);
    gl.vertexAttribDivisor(haloColorLoc, 1);

    const haloScaleLoc = gl.getAttribLocation(this.circlesProgram, "a_haloScale");
    gl.enableVertexAttribArray(haloScaleLoc);
    gl.vertexAttribPointer(haloScaleLoc, 1, gl.FLOAT, false, stride, 44);
    gl.vertexAttribDivisor(haloScaleLoc, 1);

    const sidesLoc = gl.getAttribLocation(this.circlesProgram, "a_sides");
    gl.enableVertexAttribArray(sidesLoc);
    gl.vertexAttribPointer(sidesLoc, 1, gl.FLOAT, false, stride, 48);
    gl.vertexAttribDivisor(sidesLoc, 1);

    const rotationLoc = gl.getAttribLocation(this.circlesProgram, "a_rotation");
    gl.enableVertexAttribArray(rotationLoc);
    gl.vertexAttribPointer(rotationLoc, 1, gl.FLOAT, false, stride, 52);
    gl.vertexAttribDivisor(rotationLoc, 1);
  }

  private configureHealthQuad() {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.healthQuadBuffer);
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

    const cornerLoc = gl.getAttribLocation(this.healthProgram, "a_corner");
    gl.enableVertexAttribArray(cornerLoc);
    gl.vertexAttribPointer(cornerLoc, 2, gl.FLOAT, false, 0, 0);
  }

  private configureHealthInstanceAttributes() {
    const gl = this.gl;
    const stride = FLOATS_PER_HEALTH * 4;

    gl.bindBuffer(gl.ARRAY_BUFFER, this.healthInstanceBuffer);

    const centerLoc = gl.getAttribLocation(this.healthProgram, "a_center");
    gl.enableVertexAttribArray(centerLoc);
    gl.vertexAttribPointer(centerLoc, 2, gl.FLOAT, false, stride, 0);
    gl.vertexAttribDivisor(centerLoc, 1);

    const halfWidthLoc = gl.getAttribLocation(this.healthProgram, "a_halfWidth");
    gl.enableVertexAttribArray(halfWidthLoc);
    gl.vertexAttribPointer(halfWidthLoc, 1, gl.FLOAT, false, stride, 8);
    gl.vertexAttribDivisor(halfWidthLoc, 1);

    const ratioLoc = gl.getAttribLocation(this.healthProgram, "a_ratio");
    gl.enableVertexAttribArray(ratioLoc);
    gl.vertexAttribPointer(ratioLoc, 1, gl.FLOAT, false, stride, 12);
    gl.vertexAttribDivisor(ratioLoc, 1);
  }
}
