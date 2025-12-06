/**
 * WebGL2 Background Renderer
 * Renders an animated space nebula background with twinkling stars
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

// Simplex noise function for nebula effect
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                      -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m;
  m = m*m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

// Hash function for star positions
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// Star field
float stars(vec2 uv, float scale, float time) {
  vec2 grid = floor(uv * scale);
  vec2 f = fract(uv * scale);
  
  float star = 0.0;
  float h = hash(grid);
  
  if (h > 0.97) {
    vec2 center = vec2(hash(grid + 0.1), hash(grid + 0.2));
    float d = length(f - center);
    // Twinkling effect
    float twinkle = 0.5 + 0.5 * sin(time * 3.0 + h * 100.0);
    star = smoothstep(0.1 * twinkle, 0.0, d) * (0.5 + h * 0.5);
  }
  
  return star;
}

void main() {
  vec2 uv = v_uv;
  float aspect = u_resolution.x / u_resolution.y;
  vec2 scaledUv = vec2(uv.x * aspect, uv.y);
  
  // Deep space base color - very dark blue/purple
  vec3 spaceColor = vec3(0.02, 0.02, 0.06);
  
  // Nebula effect with multiple noise layers
  float time = u_time * 0.05;
  
  // Layer 1: Large scale nebula clouds (purple/blue)
  float nebula1 = snoise(scaledUv * 1.5 + time * 0.3) * 0.5 + 0.5;
  nebula1 = pow(nebula1, 2.0);
  vec3 nebulaColor1 = mix(
    vec3(0.1, 0.02, 0.15),  // Deep purple
    vec3(0.0, 0.08, 0.2),   // Deep blue
    nebula1
  );
  
  // Layer 2: Medium scale details (cyan/magenta)
  float nebula2 = snoise(scaledUv * 3.0 - time * 0.2) * 0.5 + 0.5;
  nebula2 = pow(nebula2, 3.0);
  vec3 nebulaColor2 = mix(
    vec3(0.0, 0.1, 0.12),   // Dark cyan
    vec3(0.12, 0.02, 0.1),  // Dark magenta
    snoise(scaledUv * 2.0 + time * 0.1) * 0.5 + 0.5
  );
  
  // Layer 3: Fine details and highlights
  float nebula3 = snoise(scaledUv * 6.0 + time * 0.4) * 0.5 + 0.5;
  nebula3 = pow(nebula3, 4.0);
  
  // Combine nebula layers
  vec3 nebula = spaceColor;
  nebula += nebulaColor1 * nebula1 * 0.3;
  nebula += nebulaColor2 * nebula2 * 0.2;
  nebula += vec3(0.0, 0.05, 0.08) * nebula3 * 0.15;
  
  // Add subtle color variation based on position
  float colorShift = sin(uv.x * 3.14159 + time) * 0.02;
  nebula.r += colorShift;
  nebula.b -= colorShift * 0.5;
  
  // Star layers at different scales
  float starField = 0.0;
  starField += stars(scaledUv, 100.0, u_time) * 0.6;  // Distant dim stars
  starField += stars(scaledUv, 60.0, u_time * 1.2) * 0.8;   // Medium stars
  starField += stars(scaledUv, 30.0, u_time * 0.8) * 1.0;   // Brighter stars
  
  // Star color slight variation
  vec3 starColor = vec3(1.0, 0.98, 0.95) + vec3(0.05, 0.05, 0.1) * sin(u_time + uv.x * 10.0);
  
  // Combine everything
  vec3 finalColor = nebula + starColor * starField;
  
  // Subtle vignette effect
  float vignette = 1.0 - length(uv - 0.5) * 0.4;
  finalColor *= vignette;
  
  // Clamp to avoid over-brightness
  finalColor = clamp(finalColor, 0.0, 1.0);
  
  fragColor = vec4(finalColor, 1.0);
}
`;

export class WebGL2Background {
    private program: WebGLProgram;
    private vao: WebGLVertexArrayObject | null;
    private uniforms: {
        time: WebGLUniformLocation | null;
        resolution: WebGLUniformLocation | null;
    };

    constructor(private gl: WebGL2RenderingContext) {
        this.program = createProgram(gl, backgroundVertexShader, backgroundFragmentShader);
        this.vao = gl.createVertexArray();

        this.uniforms = {
            time: gl.getUniformLocation(this.program, "u_time"),
            resolution: gl.getUniformLocation(this.program, "u_resolution"),
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

    render(width: number, height: number, time: number) {
        const gl = this.gl;

        gl.useProgram(this.program);
        gl.bindVertexArray(this.vao);

        if (this.uniforms.time) {
            gl.uniform1f(this.uniforms.time, time);
        }
        if (this.uniforms.resolution) {
            gl.uniform2f(this.uniforms.resolution, width, height);
        }

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    dispose() {
        const gl = this.gl;
        if (this.vao) gl.deleteVertexArray(this.vao);
        if (this.program) gl.deleteProgram(this.program);
    }
}
