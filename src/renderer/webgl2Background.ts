/**
 * WebGL2 Background Renderer
 * Renders an animated space background with Milky Way and stars
 * Version: 2024-12-08-v2 - Milky Way edition
 */

import { createProgram } from "./shaders.ts";

const backgroundVertexShader = `#version 300 es
precision highp float;
in vec2 a_position;
out vec2 v_uv;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_uv = a_position * 0.5 + 0.5;
}
`;

const backgroundFragmentShader = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_camera;
uniform float u_parallaxStrength;

// Hash function for pseudo-random values
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

vec2 correctAspect(vec2 uv) {
  vec2 corrected = uv;
  float targetAspect = 1920.0 / 1080.0; // 16:9
  float currentAspect = u_resolution.x / u_resolution.y;

  if (currentAspect > targetAspect) {
    float scale = currentAspect / targetAspect;
    corrected.x = (corrected.x - 0.5) * scale + 0.5;
  } else {
    float scale = targetAspect / currentAspect;
    corrected.y = (corrected.y - 0.5) * scale + 0.5;
  }
  return corrected;
}

vec2 parallaxUV(vec2 uv, float depth) {
  float maxRes = max(u_resolution.x, u_resolution.y);
  vec2 cameraOffset = (u_camera - 0.5 * u_resolution) / max(maxRes, 1.0);
  vec2 drift = vec2(
    sin(u_time * (0.07 + depth * 0.05)),
    cos(u_time * (0.05 + depth * 0.08))
  ) * 0.003 * depth;
  return uv - cameraOffset * depth * u_parallaxStrength + drift;
}

void addStarLayer(
  inout vec3 color,
  vec2 uv,
  float scale,
  float threshold,
  float falloff,
  float twinkleSpeed,
  vec3 tint,
  float intensity
) {
  vec2 starUV = uv * scale;
  vec2 starId = floor(starUV);
  float starRand = hash(starId);
  vec2 local = fract(starUV) - 0.5;
  local.x *= u_resolution.x / u_resolution.y;
  float starDist = length(local);
  float starShape = smoothstep(falloff, 0.0, starDist);
  float twinkle = 0.7 + 0.3 * sin(u_time * twinkleSpeed + starRand * 6.2831);
  float visible = step(threshold, starRand);
  color += tint * starShape * twinkle * visible * intensity;
}

void addDistantGalaxies(inout vec3 color, vec2 uv) {
  vec2 galaxyGrid = uv * 3.6;
  vec2 id = floor(galaxyGrid);
  vec2 local = fract(galaxyGrid) - 0.5;
  float rand = hash(id * 1.7 + 3.1);
  float present = step(0.965, rand);

  float angle = rand * 6.2831;
  mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
  vec2 oriented = rot * local;
  oriented.x *= 0.45 + rand * 0.25;

  float radius = length(oriented);
  float swirl = sin(atan(oriented.y, oriented.x) * 3.5 + radius * 12.0 + rand * 6.0);
  float core = exp(-radius * radius * 32.0);
  float arms = swirl * smoothstep(0.22, 0.05, radius);
  float brightness = (core * 0.9 + arms * 0.12) * present;

  vec3 tint = mix(vec3(0.6, 0.72, 1.0), vec3(1.0, 0.85, 0.9), rand);
  color += tint * brightness * 0.22;
}

void main() {
  vec2 uv = v_uv;
  vec2 correctUV = correctAspect(uv);

  // Deep black space base
  vec3 color = vec3(0.0, 0.0, 0.01);

  // Milky Way / nebula background
  vec2 galaxyUV = parallaxUV(correctUV, 0.12) * 2.0 - 1.0;
  galaxyUV.x *= 1920.0 / 1080.0;
  float angle = 0.25;
  mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
  galaxyUV = rot * galaxyUV;
  float galaxyBand = 1.0 - abs(galaxyUV.y * 2.0);
  galaxyBand = smoothstep(0.25, 0.9, galaxyBand);
  galaxyBand = pow(galaxyBand, 6.0);
  float galaxyNoise = noise(galaxyUV * 1.5 + u_time * 0.02);
  vec3 galaxyColor = vec3(0.08, 0.06, 0.12) * (0.12 + galaxyNoise * 0.12);
  color += galaxyColor * galaxyBand;

  // Distant galaxy clusters
  addDistantGalaxies(color, parallaxUV(correctUV, 0.14));

  // Star layers with parallax
  addStarLayer(color, parallaxUV(correctUV, 0.02), 180.0, 0.975, 0.26, 0.35, vec3(0.9, 0.95, 1.0), 0.4);
  addStarLayer(color, parallaxUV(correctUV, 0.06), 120.0, 0.94, 0.22, 0.22, vec3(1.0, 0.96, 0.9), 0.6);
  addStarLayer(color, parallaxUV(correctUV, 0.09), 48.0, 0.9, 0.18, 0.16, vec3(1.0, 0.98, 0.95), 0.95);

  // Dust / faint nebula wisps
  vec2 dustUV = parallaxUV(correctUV * 1.4, 0.12);
  float dustNoise = noise(dustUV * 3.0 + vec2(0.0, u_time * 0.01));
  float dust = smoothstep(0.6, 1.0, dustNoise);
  vec3 dustColor = vec3(0.2, 0.18, 0.3);
  color += dustColor * dust * 0.08;

  fragColor = vec4(color, 1.0);
}
`;

export class WebGL2Background {
  private program: WebGLProgram;
  private vao: WebGLVertexArrayObject | null;
  private uniforms: {
    time: WebGLUniformLocation | null;
    resolution: WebGLUniformLocation | null;
    camera: WebGLUniformLocation | null;
    parallaxStrength: WebGLUniformLocation | null;
  };

  constructor(private gl: WebGL2RenderingContext) {
    this.program = createProgram(gl, backgroundVertexShader, backgroundFragmentShader);
    this.vao = gl.createVertexArray();

    this.uniforms = {
      time: gl.getUniformLocation(this.program, "u_time"),
      resolution: gl.getUniformLocation(this.program, "u_resolution"),
      camera: gl.getUniformLocation(this.program, "u_camera"),
      parallaxStrength: gl.getUniformLocation(this.program, "u_parallaxStrength"),
    };

    // Set up fullscreen quad
    gl.bindVertexArray(this.vao);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );

    const positionLoc = gl.getAttribLocation(this.program, "a_position");
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
  }

  render(
    width: number,
    height: number,
    time: number,
    camera: { x: number; y: number },
    parallaxStrength: number
  ) {
    const gl = this.gl;

    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    if (this.uniforms.time) {
      gl.uniform1f(this.uniforms.time, time);
    }
    if (this.uniforms.resolution) {
      gl.uniform2f(this.uniforms.resolution, width, height);
    }
    if (this.uniforms.camera) {
      gl.uniform2f(this.uniforms.camera, camera.x, camera.y);
    }
    if (this.uniforms.parallaxStrength) {
      gl.uniform1f(this.uniforms.parallaxStrength, parallaxStrength);
    }

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  dispose() {
    const gl = this.gl;
    if (this.vao) gl.deleteVertexArray(this.vao);
    if (this.program) gl.deleteProgram(this.program);
  }
}
