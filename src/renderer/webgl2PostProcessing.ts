import { createProgram } from "./shaders.ts";

const fullscreenQuadVertexShader = `#version 300 es
precision mediump float;

in vec2 a_position;
out vec2 v_uv;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_uv = a_position * 0.5 + 0.5;
}
`;

const fullscreenQuadFragmentShader = `#version 300 es
precision mediump float;

in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_texture;

void main() {
  fragColor = texture(u_texture, v_uv);
}
`;

const glowFragmentShader = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_texture;
uniform float u_intensity;
uniform vec2 u_resolution;

const float directions = 16.0;
const float quality = 3.0;
const float size = 12.0;

void main() {
    vec2 uv = v_uv;
    vec4 color = vec4(0.0);
    vec2 texel = 1.0 / u_resolution;

    for (float d = 0.0; d < 6.28318530718; d += 6.28318530718 / directions) {
        for (float i = 1.0 / quality; i <= 1.0; i += 1.0 / quality) {
            color += texture(u_texture, uv + vec2(cos(d), sin(d)) * texel * size * i);
        }
    }

    color /= quality * directions;
    fragColor = mix(texture(u_texture, uv), color, u_intensity);
}
`;

const bloomFragmentShader = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_texture;
uniform float u_intensity;
uniform vec2 u_resolution;

// Enhanced bloom with wider sampling and better falloff
vec4 bloom(sampler2D tex, vec2 uv, vec2 resolution, float intensity) {
    vec4 sum = vec4(0.0);
    vec2 texel = 1.0 / resolution;

    // Gaussian-like weights for natural falloff
    float weights[5];
    weights[0] = 0.227027;
    weights[1] = 0.1945946;
    weights[2] = 0.1216216;
    weights[3] = 0.054054;
    weights[4] = 0.016216;

    // Multi-pass bloom sampling
    for (int i = -4; i <= 4; i++) {
        for (int j = -4; j <= 4; j++) {
            float weight = weights[abs(i)] * weights[abs(j)] * 4.0;
            sum += texture(tex, uv + vec2(float(j), float(i)) * texel * 2.0) * weight;
        }
    }

    vec4 original = texture(tex, uv);
    float luminance = dot(original.rgb, vec3(0.299, 0.587, 0.114));

    // Apply bloom more aggressively to bright areas
    float bloomFactor = smoothstep(0.2, 0.8, luminance);
    vec4 bloomColor = sum * intensity * (0.5 + bloomFactor * 0.5);

    // Additive blend with slight saturation boost
    vec3 result = original.rgb + bloomColor.rgb * 0.8;
    result = mix(result, result * 1.1, bloomFactor * 0.3);

    return vec4(result, original.a);
}

void main() {
  fragColor = bloom(u_texture, v_uv, u_resolution, u_intensity);
}
`;

const grainFragmentShader = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_texture;
uniform float u_intensity;
uniform float u_time;

// Enhanced noise function
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

void main() {
  vec4 color = texture(u_texture, v_uv);

  // Film grain noise only - vignette is handled by CRT pass
  float noise = (random(v_uv * u_time + u_time * 0.1) - 0.5) * u_intensity;

  // Subtle color grading - slight warm tint for NES feel
  float luminance = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  vec3 warmTint = vec3(1.01, 1.0, 0.99);
  vec3 gradedColor = color.rgb * mix(vec3(1.0), warmTint, luminance);

  // Combine grain with graded color (no vignette here)
  vec3 result = gradedColor + noise;

  fragColor = vec4(clamp(result, 0.0, 1.0), color.a);
}
`;

/**
 * CRT post-processing shader - NES-style cathode ray tube effect
 * Combines: scanlines, barrel distortion, chromatic aberration,
 * vignette, phosphor glow, screen flicker, and pixel quantization
 */
const crtFragmentShader = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_time;

// Pseudo-random hash
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
}

// Barrel distortion for CRT curvature
vec2 barrelDistort(vec2 uv, float amount) {
    vec2 cc = uv - 0.5;
    float dist = dot(cc, cc);
    return uv + cc * dist * amount;
}

void main() {
    // Apply barrel distortion (CRT curvature) - reduced for brightness
    vec2 uv = barrelDistort(v_uv, 0.06);

    // Discard pixels outside screen bounds (CRT edge)
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
        fragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
    }

    vec2 texel = 1.0 / u_resolution;

    // === Chromatic aberration (RGB offset at edges) - reduced ===
    vec2 cc = uv - 0.5;
    float edgeDist = length(cc);
    float aberration = edgeDist * 0.002;
    float r = texture(u_texture, barrelDistort(v_uv + vec2(aberration, 0.0), 0.06)).r;
    float g = texture(u_texture, uv).g;
    float b = texture(u_texture, barrelDistort(v_uv - vec2(aberration, 0.0), 0.06)).b;
    vec3 color = vec3(r, g, b);

    // === Scanlines (horizontal dark bands) - lighter for NES brightness ===
    float scanline = sin(uv.y * u_resolution.y * 3.14159) * 0.5 + 0.5;
    scanline = pow(scanline, 0.9);
    // Much softer scanlines: only 10% darkening at troughs
    float softScanline = smoothstep(0.35, 0.65, scanline);
    color *= mix(softScanline, scanline, 0.2) * 0.1 + 0.9;

    // === Phosphor pixel grid (very subtle) ===
    float pixelX = floor(uv.x * u_resolution.x);
    float subPixel = mod(pixelX, 3.0);
    // Minimal brightness variation per sub-pixel column
    float phosphor = subPixel < 1.0 ? 1.0 : (subPixel < 2.0 ? 0.99 : 0.98);
    color *= phosphor;

    // === Single gentle vignette (CRT edge darkening) ===
    float vignette = 1.0 - edgeDist * edgeDist * 0.9;
    vignette = smoothstep(0.1, 1.0, vignette);
    color *= vignette;

    // === Screen flicker (very subtle brightness oscillation) ===
    float flicker = 1.0 + sin(u_time * 8.0) * 0.004 + sin(u_time * 13.7) * 0.003;
    color *= flicker;

    // === NES color quantization (6-bit per channel = 64 levels) ===
    color = floor(color * 63.0 + 0.5) / 63.0;

    // === Slight warm tint (phosphor warmth) - very subtle ===
    color.r *= 1.02;
    color.b *= 0.99;

    fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`;

class PostProcessingPass {
  public program: WebGLProgram;
  public vao: WebGLVertexArrayObject | null;
  public uniformLocations: Record<string, WebGLUniformLocation | null> = {};

  constructor(
    private gl: WebGL2RenderingContext,
    vertexShader: string,
    fragmentShader: string,
    uniforms: string[] = []
  ) {
    this.program = createProgram(gl, vertexShader, fragmentShader);
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );

    const positionLocation = gl.getAttribLocation(this.program, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    uniforms.forEach((uniform) => {
      this.uniformLocations[uniform] = gl.getUniformLocation(this.program, uniform);
    });
  }
}

export class WebGL2PostProcessing {
  private framebuffer1: WebGLFramebuffer | null;
  private texture1: WebGLTexture | null;
  private framebuffer2: WebGLFramebuffer | null;
  private texture2: WebGLTexture | null;

  private fullscreenQuad: PostProcessingPass;
  private glowPass: PostProcessingPass;
  private bloomPass: PostProcessingPass;
  private grainPass: PostProcessingPass;
  private crtPass: PostProcessingPass;

  constructor(private gl: WebGL2RenderingContext, private dpr: number) {
    [this.framebuffer1, this.texture1] = this.createFramebuffer();
    [this.framebuffer2, this.texture2] = this.createFramebuffer();

    this.fullscreenQuad = new PostProcessingPass(
      gl,
      fullscreenQuadVertexShader,
      fullscreenQuadFragmentShader,
      ["u_texture"]
    );
    this.glowPass = new PostProcessingPass(gl, fullscreenQuadVertexShader, glowFragmentShader, [
      "u_texture",
      "u_intensity",
      "u_resolution"
    ]);
    this.bloomPass = new PostProcessingPass(gl, fullscreenQuadVertexShader, bloomFragmentShader, [
      "u_texture",
      "u_intensity",
      "u_resolution"
    ]);
    this.grainPass = new PostProcessingPass(gl, fullscreenQuadVertexShader, grainFragmentShader, [
      "u_texture",
      "u_intensity",
      "u_time"
    ]);
    this.crtPass = new PostProcessingPass(gl, fullscreenQuadVertexShader, crtFragmentShader, [
      "u_texture",
      "u_resolution",
      "u_time"
    ]);
  }

  beginFrame() {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer1);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }

  endFrame(
    resolution: { width: number; height: number },
    addons: { glow: boolean; bloom: boolean; grain: boolean; crt: boolean },
    time: number
  ) {
    const passes: {
      pass: PostProcessingPass;
      uniforms: (gl: WebGL2RenderingContext) => void;
    }[] = [];

    if (addons.glow) {
      passes.push({
        pass: this.glowPass,
        uniforms: (gl) => {
          gl.uniform1f(this.glowPass.uniformLocations["u_intensity"], 0.6);
          gl.uniform2f(
            this.glowPass.uniformLocations["u_resolution"],
            resolution.width,
            resolution.height
          );
        }
      });
    }

    if (addons.bloom) {
      passes.push({
        pass: this.bloomPass,
        uniforms: (gl) => {
          gl.uniform1f(this.bloomPass.uniformLocations["u_intensity"], 0.4);
          gl.uniform2f(
            this.bloomPass.uniformLocations["u_resolution"],
            resolution.width,
            resolution.height
          );
        }
      });
    }

    if (addons.grain) {
      passes.push({
        pass: this.grainPass,
        uniforms: (gl) => {
          gl.uniform1f(this.grainPass.uniformLocations["u_intensity"], 0.1);
          gl.uniform1f(this.grainPass.uniformLocations["u_time"], time);
        }
      });
    }

    // CRT pass is always applied last for the full retro effect
    if (addons.crt) {
      passes.push({
        pass: this.crtPass,
        uniforms: (gl) => {
          gl.uniform2f(
            this.crtPass.uniformLocations["u_resolution"],
            resolution.width,
            resolution.height
          );
          gl.uniform1f(this.crtPass.uniformLocations["u_time"], time);
        }
      });
    }

    let read = { fbo: this.framebuffer1, texture: this.texture1 };
    let write = { fbo: this.framebuffer2, texture: this.texture2 };

    passes.forEach((p) => {
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, write.fbo);
      this.gl.clear(this.gl.COLOR_BUFFER_BIT);

      this.gl.useProgram(p.pass.program);
      this.gl.bindVertexArray(p.pass.vao);
      this.gl.activeTexture(this.gl.TEXTURE0);
      this.gl.bindTexture(this.gl.TEXTURE_2D, read.texture);
      this.gl.uniform1i(p.pass.uniformLocations["u_texture"], 0);
      p.uniforms(this.gl);
      this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);

      // Swap
      const temp = read;
      read = write;
      write = temp;
    });

    // Final pass to screen
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    this.gl.useProgram(this.fullscreenQuad.program);
    this.gl.bindVertexArray(this.fullscreenQuad.vao);
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, read.texture);
    this.gl.uniform1i(this.fullscreenQuad.uniformLocations["u_texture"], 0);
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  }

  resize(width: number, height: number) {
    for (const texture of [this.texture1, this.texture2]) {
      this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
      this.gl.texImage2D(
        this.gl.TEXTURE_2D,
        0,
        this.gl.RGBA,
        width * this.dpr,
        height * this.dpr,
        0,
        this.gl.RGBA,
        this.gl.UNSIGNED_BYTE,
        null
      );
    }
  }

  private createFramebuffer(): [WebGLFramebuffer | null, WebGLTexture | null] {
    const framebuffer = this.gl.createFramebuffer();
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer);

    const texture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

    this.gl.framebufferTexture2D(
      this.gl.FRAMEBUFFER,
      this.gl.COLOR_ATTACHMENT0,
      this.gl.TEXTURE_2D,
      texture,
      0
    );

    return [framebuffer, texture];
  }
}
