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
in float a_sides;
in float a_rotation;
uniform vec2 u_resolution;
out vec2 v_corner;
out float v_radius;
out vec4 v_color;
out vec4 v_haloColor;
out float v_haloScale;
out float v_sides;
out float v_rotation;
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
  v_sides = a_sides;
  v_rotation = a_rotation;
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
in float v_sides;
in float v_rotation;
out vec4 outColor;
float sdRegularPolygon(vec2 p, float radius, float sides, float rotation) {
  float n = max(3.0, floor(sides + 0.5));
  float angle = 6.28318530718 / n;
  float halfAngle = angle * 0.5;
  float len = length(p);
  float a = atan(p.y, p.x) + rotation;
  float sector = mod(a + angle, angle) - halfAngle;
  float radial = cos(sector) * len;
  return radial - radius;
}
void main() {
  float aa = 1.5;
  vec2 pos = v_corner * v_radius;
  float radial = length(pos);
  float sides = max(0.0, v_sides);
  float distPx = sides < 2.5 ? radial - v_radius : sdRegularPolygon(pos, v_radius, sides, v_rotation);
  float fill = smoothstep(0.0, -aa, distPx) * v_color.a;
  float halo = 0.0;
  if (v_haloScale > 1.0 && v_haloColor.a > 0.0) {
    float haloStart = v_radius;
    float haloEnd = v_radius * v_haloScale;
    float inner = smoothstep(haloStart + aa, haloStart, radial);
    float outer = smoothstep(haloEnd, haloEnd - aa, radial);
    halo = inner * outer * v_haloColor.a;
  }
  float alpha = clamp(fill + halo, 0.0, 1.0);
  vec3 color = vec3(0.0);
  if (alpha > 0.0) {
    color = (v_color.rgb * fill + v_haloColor.rgb * halo);
  }
  outColor = vec4(color, alpha);
}`;
