import { createProgram } from "./shaders.ts";
import { initWebGL2, resizeCanvas } from "./webgl2Context.ts";
import { WebGL2TextRenderer, type TextInstance } from "./webgl2Text.ts";
import type { Shape } from "../types/entities.ts";
import { getShapeId } from "../config/shapes.ts";

const GRID_SPACING = 64;
const GRID_COLOR = [255 / 255, 210 / 255, 102 / 255, 0.08] as const;

type ShapeInstance = {
  x: number;
  y: number;
  radius: number;
  color: readonly [number, number, number, number];
  shape?: Shape;
  halo?: {
    color: readonly [number, number, number, number];
    scale: number;
  };
};

export type { TextInstance };

const FLOATS_PER_SHAPE = 13; // Added 1 float for shape type

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

  // Shapes rendering resources (renamed from circles to shapes)
  private shapesProgram: WebGLProgram;
  private shapesVao: WebGLVertexArrayObject | null;
  private shapesQuadBuffer: WebGLBuffer | null;
  private shapesInstanceBuffer: WebGLBuffer | null;
  private shapesUniforms: { resolution: WebGLUniformLocation | null };
  private shapesData: Float32Array;
  private shapesCapacity = 0;
  private shapesCount = 0;

  // Text rendering
  private textRenderer: WebGL2TextRenderer;

  private constructor(private canvas: HTMLCanvasElement, gl: WebGL2RenderingContext, dpr: number) {
    this.gl = gl;
    this.dpr = dpr;

    // Initialize grid program
    this.gridProgram = createProgram(gl, this.gridVertexShader(), this.gridFragmentShader());
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

    // Initialize shapes program (previously circles)
    this.shapesProgram = createProgram(gl, this.shapesVertexShader(), this.shapesFragmentShader());
    this.shapesVao = gl.createVertexArray();
    this.shapesQuadBuffer = gl.createBuffer();
    this.shapesInstanceBuffer = gl.createBuffer();
    this.shapesUniforms = {
      resolution: gl.getUniformLocation(this.shapesProgram, "u_resolution")
    };
    this.shapesData = new Float32Array(0);

    gl.useProgram(this.shapesProgram);
    gl.bindVertexArray(this.shapesVao);
    this.configureShapesQuad();
    this.configureShapesInstanceAttributes();

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
    this.shapesCount = 0;
    this.textRenderer.beginFrame();
  }

  pushCircle(shape: ShapeInstance) {
    if (!this.enabled) return;
    this.ensureShapesCapacity(this.shapesCount + 1);
    const offset = this.shapesCount * FLOATS_PER_SHAPE;
    const haloColor = shape.halo?.color ?? [0, 0, 0, 0];
    const haloScale = shape.halo?.scale ?? 1;
    const shapeType = getShapeId(shape.shape ?? 'circle');

    this.shapesData[offset] = shape.x * this.dpr;
    this.shapesData[offset + 1] = shape.y * this.dpr;
    this.shapesData[offset + 2] = shape.radius * this.dpr;
    this.shapesData[offset + 3] = shape.color[0];
    this.shapesData[offset + 4] = shape.color[1];
    this.shapesData[offset + 5] = shape.color[2];
    this.shapesData[offset + 6] = shape.color[3];
    this.shapesData[offset + 7] = haloColor[0];
    this.shapesData[offset + 8] = haloColor[1];
    this.shapesData[offset + 9] = haloColor[2];
    this.shapesData[offset + 10] = haloColor[3];
    this.shapesData[offset + 11] = haloScale;
    this.shapesData[offset + 12] = shapeType;
    this.shapesCount += 1;
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
    // Clear the entire canvas each frame. Since shapes are dynamic and share 
    // the same canvas as the static grid, we must redraw everything each frame.
    // The grid vertex buffer is cached via gridNeedsRebuild flag to avoid
    // unnecessary geometry rebuilding.
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Render grid first (background)
    if (this.gridEnabled) {
      this.renderGrid();
    }

    // Render shapes on top
    this.renderShapes();

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
    
    // Clean up shapes resources
    if (this.shapesVao) gl.deleteVertexArray(this.shapesVao);
    if (this.shapesQuadBuffer) gl.deleteBuffer(this.shapesQuadBuffer);
    if (this.shapesInstanceBuffer) gl.deleteBuffer(this.shapesInstanceBuffer);
    if (this.shapesProgram) gl.deleteProgram(this.shapesProgram);
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

  private renderShapes() {
    if (!this.shapesCount) return;

    const gl = this.gl;
    gl.useProgram(this.shapesProgram);
    gl.bindVertexArray(this.shapesVao);

    if (this.shapesUniforms.resolution) {
      gl.uniform2f(this.shapesUniforms.resolution, this.resolution.width, this.resolution.height);
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.shapesInstanceBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.shapesData.subarray(0, this.shapesCount * FLOATS_PER_SHAPE));
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.shapesCount);
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

  private ensureShapesCapacity(targetInstances: number) {
    if (targetInstances <= this.shapesCapacity) return;
    const nextCapacity = Math.max(targetInstances, Math.max(64, this.shapesCapacity * 2));
    this.shapesCapacity = nextCapacity;
    this.shapesData = new Float32Array(this.shapesCapacity * FLOATS_PER_SHAPE);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.shapesInstanceBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.shapesData.byteLength, this.gl.DYNAMIC_DRAW);
  }

  private configureShapesQuad() {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.shapesQuadBuffer);
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

    const cornerLoc = gl.getAttribLocation(this.shapesProgram, "a_corner");
    gl.enableVertexAttribArray(cornerLoc);
    gl.vertexAttribPointer(cornerLoc, 2, gl.FLOAT, false, 0, 0);
  }

  private configureShapesInstanceAttributes() {
    const gl = this.gl;
    const stride = FLOATS_PER_SHAPE * 4;

    gl.bindBuffer(gl.ARRAY_BUFFER, this.shapesInstanceBuffer);

    const centerLoc = gl.getAttribLocation(this.shapesProgram, "a_center");
    gl.enableVertexAttribArray(centerLoc);
    gl.vertexAttribPointer(centerLoc, 2, gl.FLOAT, false, stride, 0);
    gl.vertexAttribDivisor(centerLoc, 1);

    const radiusLoc = gl.getAttribLocation(this.shapesProgram, "a_radius");
    gl.enableVertexAttribArray(radiusLoc);
    gl.vertexAttribPointer(radiusLoc, 1, gl.FLOAT, false, stride, 8);
    gl.vertexAttribDivisor(radiusLoc, 1);

    const colorLoc = gl.getAttribLocation(this.shapesProgram, "a_color");
    gl.enableVertexAttribArray(colorLoc);
    gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, stride, 12);
    gl.vertexAttribDivisor(colorLoc, 1);

    const haloColorLoc = gl.getAttribLocation(this.shapesProgram, "a_haloColor");
    gl.enableVertexAttribArray(haloColorLoc);
    gl.vertexAttribPointer(haloColorLoc, 4, gl.FLOAT, false, stride, 28);
    gl.vertexAttribDivisor(haloColorLoc, 1);

    const haloScaleLoc = gl.getAttribLocation(this.shapesProgram, "a_haloScale");
    gl.enableVertexAttribArray(haloScaleLoc);
    gl.vertexAttribPointer(haloScaleLoc, 1, gl.FLOAT, false, stride, 44);
    gl.vertexAttribDivisor(haloScaleLoc, 1);

    const shapeTypeLoc = gl.getAttribLocation(this.shapesProgram, "a_shapeType");
    gl.enableVertexAttribArray(shapeTypeLoc);
    gl.vertexAttribPointer(shapeTypeLoc, 1, gl.FLOAT, false, stride, 48);
    gl.vertexAttribDivisor(shapeTypeLoc, 1);
  }

  private gridVertexShader() {
    return `#version 300 es
in vec2 a_position;
uniform vec2 u_resolution;
void main() {
  vec2 zeroToOne = a_position / u_resolution;
  vec2 clip = zeroToOne * 2.0 - 1.0;
  clip.y *= -1.0;
  gl_Position = vec4(clip, 0.0, 1.0);
}`;
  }

  private gridFragmentShader() {
    return `#version 300 es
precision highp float;
uniform vec4 u_color;
out vec4 outColor;
void main() { outColor = u_color; }`;
  }

  private shapesVertexShader() {
    return `#version 300 es
in vec2 a_corner;
in vec2 a_center;
in float a_radius;
in vec4 a_color;
in vec4 a_haloColor;
in float a_haloScale;
in float a_shapeType;
uniform vec2 u_resolution;
out vec2 v_corner;
out float v_radius;
out vec4 v_color;
out vec4 v_haloColor;
out float v_haloScale;
out float v_shapeType;
void main() {
  vec2 world = a_center + a_corner * a_radius;
  vec2 zeroToOne = world / u_resolution;
  vec2 clip = zeroToOne * 2.0 - 1.0;
  clip.y *= -1.0;
  gl_Position = vec4(clip, 0.0, 1.0);
  v_corner = a_corner;
  v_radius = a_radius;
  v_color = a_color;
  v_haloColor = a_haloColor;
  v_haloScale = a_haloScale;
  v_shapeType = a_shapeType;
}`;
  }

  private shapesFragmentShader() {
    // Shape types: 0=circle, 1=square, 2=triangle, 3=diamond, 4=hexagon, 5=star
    return `#version 300 es
precision highp float;
in vec2 v_corner;
in float v_radius;
in vec4 v_color;
in vec4 v_haloColor;
in float v_haloScale;
in float v_shapeType;
out vec4 outColor;

// SDF for circle
float sdCircle(vec2 p, float r) {
  return length(p) - r;
}

// SDF for square (box)
float sdSquare(vec2 p, float r) {
  vec2 d = abs(p) - vec2(r * 0.75);
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

// SDF for equilateral triangle
float sdTriangle(vec2 p, float r) {
  const float k = sqrt(3.0);
  p.y += r * 0.33; // Center the triangle
  p.x = abs(p.x) - r * 0.75;
  p.y = p.y + r * 0.75 / k;
  if (p.x + k * p.y > 0.0) p = vec2(p.x - k * p.y, -k * p.x - p.y) / 2.0;
  p.x -= clamp(p.x, -2.0 * r * 0.75, 0.0);
  return -length(p) * sign(p.y);
}

// SDF for diamond (rotated square)
float sdDiamond(vec2 p, float r) {
  vec2 b = vec2(r * 0.5, r * 0.8);
  vec2 q = abs(p);
  float h = clamp((-2.0 * q.x * b.x + q.y * b.y) / dot(b, b), -1.0, 1.0);
  float d = length(q - 0.5 * b * vec2(1.0 - h, 1.0 + h));
  return d * sign(q.x * b.y + q.y * b.x - b.x * b.y);
}

// SDF for hexagon
float sdHexagon(vec2 p, float r) {
  const vec3 k = vec3(-0.866025404, 0.5, 0.577350269);
  p = abs(p);
  p -= 2.0 * min(dot(k.xy, p), 0.0) * k.xy;
  p -= vec2(clamp(p.x, -k.z * r * 0.85, k.z * r * 0.85), r * 0.85);
  return length(p) * sign(p.y);
}

// SDF for 5-pointed star
float sdStar(vec2 p, float r) {
  const float an = 3.141593 / 5.0;
  const float en = 3.141593 / 2.5;
  vec2 acs = vec2(cos(an), sin(an));
  vec2 ecs = vec2(cos(en), sin(en));
  float rf = r * 0.42;
  
  float bn = mod(atan(p.x, p.y), 2.0 * an) - an;
  p = length(p) * vec2(cos(bn), abs(sin(bn)));
  p -= r * acs;
  p += ecs * clamp(-dot(p, ecs), 0.0, r * acs.y / ecs.y);
  return length(p) * sign(p.x);
}

// Get the distance for the current shape type
float getShapeDistance(vec2 p, float r, float shapeType) {
  int shape = int(shapeType + 0.5);
  if (shape == 1) return sdSquare(p, r);
  if (shape == 2) return sdTriangle(p, r);
  if (shape == 3) return sdDiamond(p, r);
  if (shape == 4) return sdHexagon(p, r);
  if (shape == 5) return sdStar(p, r);
  return sdCircle(p, r); // Default to circle
}

void main() {
  float aa = 1.5;
  vec2 p = v_corner * v_radius;
  
  float dist = getShapeDistance(p, v_radius, v_shapeType);
  float fill = smoothstep(aa, -aa, dist) * v_color.a;
  
  float halo = 0.0;
  if (v_haloScale > 1.0 && v_haloColor.a > 0.0) {
    float haloRadius = v_radius * v_haloScale;
    float haloDist = getShapeDistance(p, haloRadius, v_shapeType);
    float outer = smoothstep(aa, -aa, haloDist);
    float inner = smoothstep(-aa, aa, dist);
    halo = outer * inner * v_haloColor.a;
  }
  
  float alpha = clamp(fill + halo, 0.0, 1.0);
  vec3 color = vec3(0.0);
  if (alpha > 0.0) {
    color = (v_color.rgb * fill + v_haloColor.rgb * halo);
  }
  outColor = vec4(color, alpha);
}`;
  }
}
