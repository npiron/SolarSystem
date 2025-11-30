/**
 * WebGL2 shader definitions for the unified renderer.
 * Contains vertex and fragment shaders for grid and circles rendering.
 */

/**
 * Vertex shader for grid lines rendering.
 */
export const gridVertexShader = `#version 300 es
in vec2 a_position;
uniform vec2 u_resolution;
void main() {
  vec2 zeroToOne = a_position / u_resolution;
  vec2 clip = zeroToOne * 2.0 - 1.0;
  clip.y *= -1.0;
  gl_Position = vec4(clip, 0.0, 1.0);
}`;

/**
 * Fragment shader for grid lines rendering.
 */
export const gridFragmentShader = `#version 300 es
precision highp float;
uniform vec4 u_color;
out vec4 outColor;
void main() { outColor = u_color; }`;

/**
 * Vertex shader for instanced circles rendering.
 * Supports per-instance position, radius, color, and optional halo.
 */
export const circlesVertexShader = `#version 300 es
in vec2 a_corner;
in vec2 a_center;
in float a_radius;
in vec4 a_color;
in vec4 a_haloColor;
in float a_haloScale;
uniform vec2 u_resolution;
out vec2 v_corner;
out float v_radius;
out vec4 v_color;
out vec4 v_haloColor;
out float v_haloScale;
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
}`;

/**
 * Fragment shader for circles rendering with smooth edges and optional halo.
 */
export const circlesFragmentShader = `#version 300 es
precision highp float;
in vec2 v_corner;
in float v_radius;
in vec4 v_color;
in vec4 v_haloColor;
in float v_haloScale;
out vec4 outColor;
void main() {
  float aa = 1.5;
  float distPx = length(v_corner * v_radius);
  float fill = smoothstep(v_radius, v_radius - aa, distPx) * v_color.a;
  float halo = 0.0;
  if (v_haloScale > 1.0 && v_haloColor.a > 0.0) {
    float haloStart = v_radius;
    float haloEnd = v_radius * v_haloScale;
    float inner = smoothstep(haloStart + aa, haloStart, distPx);
    float outer = smoothstep(haloEnd, haloEnd - aa, distPx);
    halo = inner * outer * v_haloColor.a;
  }
  float alpha = clamp(fill + halo, 0.0, 1.0);
  vec3 color = vec3(0.0);
  if (alpha > 0.0) {
    color = (v_color.rgb * fill + v_haloColor.rgb * halo);
  }
  outColor = vec4(color, alpha);
}`;

/**
 * Vertex shader for instanced axis-aligned rectangles.
 */
export const rectVertexShader = `#version 300 es
in vec2 a_corner;
in vec2 a_position;
in vec2 a_size;
in vec4 a_color;
uniform vec2 u_resolution;
out vec4 v_color;
void main() {
  vec2 world = a_position + (a_corner * a_size);
  vec2 zeroToOne = world / u_resolution;
  vec2 clip = zeroToOne * 2.0 - 1.0;
  clip.y *= -1.0;
  gl_Position = vec4(clip, 0.0, 1.0);
  v_color = a_color;
}`;

/**
 * Fragment shader for rectangles.
 */
export const rectFragmentShader = `#version 300 es
precision highp float;
in vec4 v_color;
out vec4 outColor;
void main() {
  outColor = v_color;
}`;
