import { createProgram } from "./shaders.ts";

/**
 * Text instance for batched rendering
 */
export type TextInstance = {
  text: string;
  x: number;
  y: number;
  color: readonly [number, number, number, number];
  scale?: number;
  alpha?: number;
};

/**
 * Style configuration for text rendering
 */
export type TextStyle = {
  fontFamily: string;
  fontSize: number;
  strokeColor: readonly [number, number, number, number];
  strokeThickness: number;
  dropShadow: boolean;
  dropShadowColor: readonly [number, number, number, number];
  dropShadowBlur: number;
  dropShadowOffset: readonly [number, number];
};

const DEFAULT_STYLE: TextStyle = {
  fontFamily: "Fredoka, Baloo 2, Nunito, sans-serif",
  fontSize: 13,
  strokeColor: [11 / 255, 16 / 255, 36 / 255, 1.0],
  strokeThickness: 3,
  dropShadow: true,
  dropShadowColor: [11 / 255, 16 / 255, 36 / 255, 0.75],
  dropShadowBlur: 4,
  dropShadowOffset: [0, 0],
};

/**
 * Glyph metrics stored in the atlas
 */
type GlyphMetrics = {
  x: number;      // X position in atlas texture
  y: number;      // Y position in atlas texture
  width: number;  // Width of glyph in atlas
  height: number; // Height of glyph in atlas
  xOffset: number;
  yOffset: number;
  xAdvance: number;
};

// Characters to include in the font atlas
const ATLAS_CHARS = " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~⚡✦⚔️🌊⟳⇡🔥💎⏳éèêëàâäùûüôöîïçÉÈÊËÀÂÄÙÛÜÔÖÎÏÇ";

// Number of floats per quad vertex: x, y, u, v, r, g, b, a
const FLOATS_PER_VERTEX = 8;
// 6 vertices per quad (2 triangles)
const VERTICES_PER_QUAD = 6;
const FLOATS_PER_QUAD = FLOATS_PER_VERTEX * VERTICES_PER_QUAD;

/**
 * Native WebGL2 text renderer using canvas-generated font atlas
 */
export class WebGL2TextRenderer {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private vao: WebGLVertexArrayObject | null;
  private buffer: WebGLBuffer | null;
  private atlasTexture: WebGLTexture | null;
  private uniforms: {
    resolution: WebGLUniformLocation | null;
    atlas: WebGLUniformLocation | null;
  };
  
  private glyphMetrics: Map<string, GlyphMetrics> = new Map();
  private atlasWidth = 0;
  private atlasHeight = 0;
  private lineHeight = 0;
  
  private data: Float32Array;
  private capacity = 0;
  private quadCount = 0;
  
  private readonly dpr: number;
  private readonly style: TextStyle;
  
  /**
   * Create a new WebGL2 text renderer
   * @param gl WebGL2 rendering context
   * @param dpr Device pixel ratio
   * @param style Optional text style configuration
   */
  constructor(gl: WebGL2RenderingContext, dpr: number, style: Partial<TextStyle> = {}) {
    this.gl = gl;
    this.dpr = dpr;
    this.style = { ...DEFAULT_STYLE, ...style };
    
    // Create shader program
    this.program = createProgram(gl, this.vertexShader(), this.fragmentShader());
    this.vao = gl.createVertexArray();
    this.buffer = gl.createBuffer();
    this.atlasTexture = gl.createTexture();
    
    this.uniforms = {
      resolution: gl.getUniformLocation(this.program, "u_resolution"),
      atlas: gl.getUniformLocation(this.program, "u_atlas"),
    };
    
    this.data = new Float32Array(0);
    
    // Set up VAO
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    this.configureAttributes();
    gl.bindVertexArray(null);
    
    // Generate font atlas
    this.generateFontAtlas();
  }
  
  /**
   * Generate font atlas texture using Canvas2D
   */
  private generateFontAtlas(): void {
    const gl = this.gl;
    const fontSize = Math.ceil(this.style.fontSize * this.dpr);
    const padding = Math.ceil(this.style.strokeThickness * this.dpr) + 4;
    const shadowPadding = this.style.dropShadow ? Math.ceil(this.style.dropShadowBlur * this.dpr) : 0;
    const totalPadding = padding + shadowPadding;
    
    // Create temporary canvas for measuring glyphs
    const measureCanvas = document.createElement("canvas");
    const measureCtx = measureCanvas.getContext("2d")!;
    measureCtx.font = `${fontSize}px ${this.style.fontFamily}`;
    
    // Measure all characters
    const glyphSizes: { char: string; width: number; height: number }[] = [];
    for (const char of ATLAS_CHARS) {
      const metrics = measureCtx.measureText(char);
      const width = Math.ceil(metrics.width) + totalPadding * 2;
      const height = fontSize + totalPadding * 2;
      glyphSizes.push({ char, width, height });
    }
    
    // Calculate atlas dimensions (approximate square)
    // Start with estimated size and increase if needed
    const totalArea = glyphSizes.reduce((sum, g) => sum + g.width * g.height, 0);
    let atlasSize = Math.max(256, Math.pow(2, Math.ceil(Math.log2(Math.sqrt(totalArea * 1.3)))));
    const maxAtlasSize = 4096; // WebGL2 guaranteed minimum texture size
    
    // Try to fit all glyphs, increasing atlas size if needed
    let fitsAll = false;
    while (!fitsAll && atlasSize <= maxAtlasSize) {
      let testX = 0;
      let testY = 0;
      let testRowHeight = 0;
      fitsAll = true;
      
      for (const glyph of glyphSizes) {
        if (testX + glyph.width > atlasSize) {
          testX = 0;
          testY += testRowHeight;
          testRowHeight = 0;
        }
        if (testY + glyph.height > atlasSize) {
          fitsAll = false;
          atlasSize *= 2;
          break;
        }
        testX += glyph.width;
        testRowHeight = Math.max(testRowHeight, glyph.height);
      }
    }
    
    if (!fitsAll) {
      console.warn(`WebGL2TextRenderer: Atlas size ${atlasSize} exceeds maximum, some glyphs may be missing`);
      atlasSize = maxAtlasSize;
    }
    
    this.atlasWidth = atlasSize;
    this.atlasHeight = atlasSize;
    this.lineHeight = fontSize + totalPadding;
    
    // Create atlas canvas
    const atlasCanvas = document.createElement("canvas");
    atlasCanvas.width = atlasSize;
    atlasCanvas.height = atlasSize;
    const ctx = atlasCanvas.getContext("2d")!;
    
    // Set rendering style
    ctx.font = `${fontSize}px ${this.style.fontFamily}`;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    
    // Pack glyphs into atlas
    let x = 0;
    let y = 0;
    let rowHeight = 0;
    
    for (const glyph of glyphSizes) {
      // Check if we need to start a new row
      if (x + glyph.width > atlasSize) {
        x = 0;
        y += rowHeight;
        rowHeight = 0;
      }
      
      // Check if we've exceeded the atlas height
      if (y + glyph.height > atlasSize) {
        console.warn("WebGL2TextRenderer: Atlas overflow, some glyphs may be missing");
        break;
      }
      
      const glyphX = x + totalPadding;
      const glyphY = y + totalPadding;
      
      // Draw drop shadow
      if (this.style.dropShadow) {
        const [sr, sg, sb, sa] = this.style.dropShadowColor;
        ctx.shadowColor = `rgba(${sr * 255}, ${sg * 255}, ${sb * 255}, ${sa})`;
        ctx.shadowBlur = this.style.dropShadowBlur * this.dpr;
        ctx.shadowOffsetX = this.style.dropShadowOffset[0] * this.dpr;
        ctx.shadowOffsetY = this.style.dropShadowOffset[1] * this.dpr;
        
        // Draw shadow pass
        ctx.fillStyle = "rgba(0,0,0,0)";
        ctx.strokeStyle = `rgba(${sr * 255}, ${sg * 255}, ${sb * 255}, ${sa * 0.5})`;
        ctx.lineWidth = this.style.strokeThickness * this.dpr;
        ctx.strokeText(glyph.char, glyphX, glyphY);
      }
      
      // Reset shadow for main text
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      
      // Draw stroke
      if (this.style.strokeThickness > 0) {
        const [r, g, b, a] = this.style.strokeColor;
        ctx.strokeStyle = `rgba(${r * 255}, ${g * 255}, ${b * 255}, ${a})`;
        ctx.lineWidth = this.style.strokeThickness * this.dpr;
        ctx.lineJoin = "round";
        ctx.strokeText(glyph.char, glyphX, glyphY);
      }
      
      // Draw fill (white for color multiplication)
      ctx.fillStyle = "white";
      ctx.fillText(glyph.char, glyphX, glyphY);
      
      // Store glyph metrics
      const metrics = measureCtx.measureText(glyph.char);
      this.glyphMetrics.set(glyph.char, {
        x,
        y,
        width: glyph.width,
        height: glyph.height,
        xOffset: totalPadding,
        yOffset: totalPadding,
        xAdvance: metrics.width,
      });
      
      x += glyph.width;
      rowHeight = Math.max(rowHeight, glyph.height);
    }
    
    // Upload atlas to GPU
    gl.bindTexture(gl.TEXTURE_2D, this.atlasTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlasCanvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }
  
  /**
   * Configure vertex attributes
   */
  private configureAttributes(): void {
    const gl = this.gl;
    const stride = FLOATS_PER_VERTEX * 4; // 4 bytes per float
    
    // Position (x, y)
    const posLoc = gl.getAttribLocation(this.program, "a_position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, stride, 0);
    
    // Texture coordinates (u, v)
    const uvLoc = gl.getAttribLocation(this.program, "a_uv");
    gl.enableVertexAttribArray(uvLoc);
    gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, stride, 8);
    
    // Color (r, g, b, a)
    const colorLoc = gl.getAttribLocation(this.program, "a_color");
    gl.enableVertexAttribArray(colorLoc);
    gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, stride, 16);
  }
  
  /**
   * Begin a new frame, clearing previous text data
   */
  beginFrame(): void {
    this.quadCount = 0;
  }
  
  /**
   * Add a text string to be rendered
   */
  pushText(instance: TextInstance): void {
    const scale = (instance.scale ?? 1) * this.dpr;
    const alpha = instance.alpha ?? 1;
    const [r, g, b, a] = instance.color;
    const finalAlpha = a * alpha;
    
    // Calculate text width for centering
    let textWidth = 0;
    for (const char of instance.text) {
      const glyph = this.glyphMetrics.get(char);
      if (glyph) {
        textWidth += glyph.xAdvance * scale;
      }
    }
    
    // Start position (centered horizontally, bottom-aligned as in PixiJS anchor 0.5, 1)
    let cursorX = instance.x * this.dpr - textWidth / 2;
    const baseY = instance.y * this.dpr;
    
    for (const char of instance.text) {
      const glyph = this.glyphMetrics.get(char);
      if (!glyph) {
        // Skip unknown characters
        continue;
      }
      
      this.ensureCapacity(this.quadCount + 1);
      
      // Calculate quad positions
      const x0 = cursorX - glyph.xOffset * scale;
      const x1 = x0 + glyph.width * scale;
      const y0 = baseY - (glyph.height - glyph.yOffset) * scale;
      const y1 = y0 + glyph.height * scale;
      
      // Texture coordinates
      const u0 = glyph.x / this.atlasWidth;
      const u1 = (glyph.x + glyph.width) / this.atlasWidth;
      const v0 = glyph.y / this.atlasHeight;
      const v1 = (glyph.y + glyph.height) / this.atlasHeight;
      
      const offset = this.quadCount * FLOATS_PER_QUAD;
      
      // Triangle 1: bottom-left, bottom-right, top-left
      this.setVertex(offset + 0 * FLOATS_PER_VERTEX, x0, y1, u0, v1, r, g, b, finalAlpha);
      this.setVertex(offset + 1 * FLOATS_PER_VERTEX, x1, y1, u1, v1, r, g, b, finalAlpha);
      this.setVertex(offset + 2 * FLOATS_PER_VERTEX, x0, y0, u0, v0, r, g, b, finalAlpha);
      
      // Triangle 2: top-left, bottom-right, top-right
      this.setVertex(offset + 3 * FLOATS_PER_VERTEX, x0, y0, u0, v0, r, g, b, finalAlpha);
      this.setVertex(offset + 4 * FLOATS_PER_VERTEX, x1, y1, u1, v1, r, g, b, finalAlpha);
      this.setVertex(offset + 5 * FLOATS_PER_VERTEX, x1, y0, u1, v0, r, g, b, finalAlpha);
      
      this.quadCount++;
      cursorX += glyph.xAdvance * scale;
    }
  }
  
  /**
   * Set vertex data at the specified offset
   */
  private setVertex(offset: number, x: number, y: number, u: number, v: number, r: number, g: number, b: number, a: number): void {
    this.data[offset] = x;
    this.data[offset + 1] = y;
    this.data[offset + 2] = u;
    this.data[offset + 3] = v;
    this.data[offset + 4] = r;
    this.data[offset + 5] = g;
    this.data[offset + 6] = b;
    this.data[offset + 7] = a;
  }
  
  /**
   * Ensure buffer capacity for the given number of quads
   */
  private ensureCapacity(targetQuads: number): void {
    if (targetQuads <= this.capacity) return;
    
    const nextCapacity = Math.max(targetQuads, Math.max(64, this.capacity * 2));
    this.capacity = nextCapacity;
    this.data = new Float32Array(this.capacity * FLOATS_PER_QUAD);
    
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.data.byteLength, this.gl.DYNAMIC_DRAW);
  }
  
  /**
   * Render all pushed text
   */
  render(resolution: { width: number; height: number }): void {
    if (!this.quadCount) return;
    
    const gl = this.gl;
    
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
    
    // Set uniforms
    if (this.uniforms.resolution) {
      gl.uniform2f(this.uniforms.resolution, resolution.width, resolution.height);
    }
    
    // Bind atlas texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.atlasTexture);
    if (this.uniforms.atlas) {
      gl.uniform1i(this.uniforms.atlas, 0);
    }
    
    // Upload vertex data
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.data.subarray(0, this.quadCount * FLOATS_PER_QUAD));
    
    // Draw all quads
    gl.drawArrays(gl.TRIANGLES, 0, this.quadCount * VERTICES_PER_QUAD);
    
    gl.bindVertexArray(null);
  }
  
  /**
   * Vertex shader for text rendering
   */
  private vertexShader(): string {
    return `#version 300 es
in vec2 a_position;
in vec2 a_uv;
in vec4 a_color;
uniform vec2 u_resolution;
out vec2 v_uv;
out vec4 v_color;
void main() {
  vec2 zeroToOne = a_position / u_resolution;
  vec2 clip = zeroToOne * 2.0 - 1.0;
  clip.y *= -1.0;
  gl_Position = vec4(clip, 0.0, 1.0);
  v_uv = a_uv;
  v_color = a_color;
}`;
  }
  
  /**
   * Fragment shader for text rendering
   */
  private fragmentShader(): string {
    return `#version 300 es
precision highp float;
in vec2 v_uv;
in vec4 v_color;
uniform sampler2D u_atlas;
out vec4 outColor;
void main() {
  vec4 texColor = texture(u_atlas, v_uv);
  // Multiply texture by vertex color
  outColor = vec4(v_color.rgb * texColor.rgb, texColor.a * v_color.a);
}`;
  }
  
  /**
   * Clean up WebGL resources
   */
  dispose(): void {
    const gl = this.gl;
    if (this.atlasTexture) gl.deleteTexture(this.atlasTexture);
    if (this.buffer) gl.deleteBuffer(this.buffer);
    if (this.vao) gl.deleteVertexArray(this.vao);
    if (this.program) gl.deleteProgram(this.program);
  }
}
