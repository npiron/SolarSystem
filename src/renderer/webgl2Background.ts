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

// Hash function for pseudo-random values
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  
  // Force 16:9 aspect ratio for background (matches 1920x1080)
  vec2 correctUV = uv;
  float targetAspect = 1920.0 / 1080.0; // 16:9
  float currentAspect = u_resolution.x / u_resolution.y;
  
  if (currentAspect > targetAspect) {
    // Screen is wider than 16:9 - crop horizontally
    float scale = currentAspect / targetAspect;
    correctUV.x = (correctUV.x - 0.5) * scale + 0.5;
  } else {
    // Screen is taller than 16:9 - crop vertically
    float scale = targetAspect / currentAspect;
    correctUV.y = (correctUV.y - 0.5) * scale + 0.5;
  }
  
  // Deep black space - almost pure black
  vec3 color = vec3(0.0, 0.0, 0.01);
  
  // === Very distant Milky Way (extremely subtle) ===
  vec2 galaxyUV = correctUV * 2.0 - 1.0;
  galaxyUV.x *= targetAspect;
  
  // Rotate slightly
  float angle = 0.25;
  mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
  galaxyUV = rot * galaxyUV;
  
  // Very subtle band
  float galaxyBand = 1.0 - abs(galaxyUV.y * 2.0);
  galaxyBand = smoothstep(0.3, 0.9, galaxyBand);
  galaxyBand = pow(galaxyBand, 6.0); // Very soft falloff
  
  // Extremely faint galaxy glow
  vec3 galaxyColor = vec3(0.08, 0.06, 0.12) * 0.15; // Very faint purple
  color += galaxyColor * galaxyBand;
  
  // === Sharp, twinkling stars ===
  // Small distant stars (very far)
  vec2 starUV = correctUV * 120.0;
  vec2 starId = floor(starUV);
  float starRand = hash(starId);
  
  if(starRand > 0.97) {
    vec2 starPos = fract(starUV);
    float starDist = length(starPos - 0.5);
    
    // Very slow, gentle twinkle
    float twinkle = 0.6 + 0.4 * sin(u_time * 0.2 + starRand * 6.28);
    
    // Sharp star point
    float star = smoothstep(0.3, 0.0, starDist) * twinkle;
    color += vec3(0.9, 0.95, 1.0) * star * 0.4;
  }
  
  // Medium stars (far)
  vec2 medStarUV = correctUV * 60.0;
  vec2 medStarId = floor(medStarUV);
  float medStarRand = hash(medStarId + vec2(0.5));
  
  if(medStarRand > 0.95) {
    vec2 medStarPos = fract(medStarUV);
    float medStarDist = length(medStarPos - 0.5);
    
    // Slower twinkle
    float medTwinkle = 0.7 + 0.3 * sin(u_time * 0.15 + medStarRand * 6.28);
    
    // Sharper, brighter star
    float medStar = smoothstep(0.25, 0.0, medStarDist) * medTwinkle;
    vec3 starColor = mix(vec3(1.0, 0.95, 0.9), vec3(0.9, 0.95, 1.0), medStarRand);
    color += starColor * medStar * 0.6;
  }
  
  // Rare bright stars
  vec2 brightStarUV = correctUV * 25.0;
  vec2 brightStarId = floor(brightStarUV);
  float brightStarRand = hash(brightStarId + vec2(1.0));
  
  if(brightStarRand > 0.92) {
    vec2 brightStarPos = fract(brightStarUV);
    float brightStarDist = length(brightStarPos - 0.5);
    
    // Very slow twinkle
    float brightTwinkle = 0.8 + 0.2 * sin(u_time * 0.1 + brightStarRand * 6.28);
    
    // Sharp bright star
    float brightStar = smoothstep(0.22, 0.0, brightStarDist) * brightTwinkle;
    vec3 starColor = mix(vec3(1.0, 0.98, 0.95), vec3(0.95, 0.98, 1.0), brightStarRand);
    color += starColor * brightStar * 1.0;
  }
  
  fragColor = vec4(color, 1.0);
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
