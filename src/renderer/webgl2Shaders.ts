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
 * Fragment shader for circles rendering with enhanced glow, bloom and smooth edges.
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
  float aa = 1.5; // Increased anti-aliasing for smoother edges
  vec2 pos = v_corner * v_radius;
  float radial = length(pos);
  float sides = max(0.0, v_sides);
  float distPx = sides < 2.5 ? radial - v_radius : sdRegularPolygon(pos, v_radius, sides, v_rotation);
  
  // Core shape with smooth edges
  float fill = smoothstep(0.5, -aa, distPx) * v_color.a;
  
  // Inner glow - soft light emanating from center
  float innerGlow = 0.0;
  if (v_color.a > 0.0) {
    float centerDist = radial / v_radius;
    innerGlow = (1.0 - centerDist * 0.6) * fill * 0.3;
  }
  
  // Multi-layer halo for premium glow effect
  float halo = 0.0;
  float halo2 = 0.0;
  float halo3 = 0.0;
  
  if (v_haloScale > 1.0 && v_haloColor.a > 0.0) {
    // Primary halo - tight and bright
    float haloStart = v_radius;
    float haloEnd = v_radius * v_haloScale;
    float haloMid = v_radius * (1.0 + (v_haloScale - 1.0) * 0.5);
    
    float inner = smoothstep(haloStart + aa * 2.0, haloStart, radial);
    float outer = smoothstep(haloEnd, haloMid, radial);
    halo = inner * outer * v_haloColor.a;
    
    // Secondary halo - wider and softer
    float haloEnd2 = v_radius * (v_haloScale * 1.3);
    float outer2 = smoothstep(haloEnd2, haloEnd, radial);
    halo2 = inner * outer2 * v_haloColor.a * 0.4;
    
    // Tertiary halo - very wide ambient glow
    float haloEnd3 = v_radius * (v_haloScale * 1.8);
    float outer3 = smoothstep(haloEnd3, haloEnd2, radial);
    halo3 = inner * outer3 * v_haloColor.a * 0.15;
  }
  
  float totalHalo = halo + halo2 + halo3;
  float alpha = clamp(fill + totalHalo, 0.0, 1.0);
  
  vec3 color = vec3(0.0);
  if (alpha > 0.0) {
    // Brighten core color slightly for more vibrant look
    vec3 brightCore = v_color.rgb * (1.0 + innerGlow);
    color = brightCore * fill + v_haloColor.rgb * totalHalo;
    
    // Add subtle bloom effect on bright areas
    float brightness = dot(color, vec3(0.299, 0.587, 0.114));
    if (brightness > 0.7) {
      color += (color - 0.7) * 0.2;
    }
  }
  
  outColor = vec4(color, alpha);
}`;

/**
 * Vertex shader for instanced health bar quads.
 */
export const healthVertexShader = `#version 300 es
precision highp float;
precision highp int;
in vec2 a_corner;
in vec2 a_center;
in float a_halfWidth;
in float a_ratio;
uniform vec2 u_resolution;
uniform float u_height;
uniform float u_yOffset;
uniform int u_fillMode;
void main() {
  float width = a_halfWidth * (u_fillMode == 0 ? 1.0 : a_ratio);
  vec2 halfSize = vec2(width, u_height * 0.5);
  vec2 world = vec2(a_center.x + a_corner.x * halfSize.x, (a_center.y - u_yOffset) + a_corner.y * halfSize.y);
  vec2 zeroToOne = world / u_resolution;
  vec2 clip = zeroToOne * 2.0 - 1.0;
  clip.y *= -1.0;
  gl_Position = vec4(clip, 0.0, 1.0);
}`;

/**
 * Fragment shader for health bars with dual pass (background + fill).
 */
export const healthFragmentShader = `#version 300 es
precision highp float;
precision highp int;
uniform vec4 u_bgColor;
uniform vec4 u_fgColor;
uniform int u_fillMode;
out vec4 outColor;
void main() {
  outColor = u_fillMode == 0 ? u_bgColor : u_fgColor;
}`;
