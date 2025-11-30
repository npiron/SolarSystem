/**
 * WebGL2 Shaders
 *
 * GLSL shader source code for various rendering primitives.
 * All shaders use GLSL ES 3.0 (#version 300 es) for WebGL2.
 */

// =============================================================================
// Circle Shader - Used for player, enemies, projectiles, fragments
// =============================================================================

/** Vertex shader for rendering circles using instanced rendering */
export const CIRCLE_VERT = `#version 300 es
precision highp float;

// Per-vertex attributes (unit circle quad)
in vec2 a_position;

// Per-instance attributes
in vec2 a_center;
in float a_radius;
in vec4 a_color;

uniform mat4 u_projection;

out vec4 v_color;
out vec2 v_localPos;

void main() {
  vec2 worldPos = a_center + a_position * a_radius;
  gl_Position = u_projection * vec4(worldPos, 0.0, 1.0);
  v_color = a_color;
  v_localPos = a_position;
}
`;

/** Fragment shader for rendering circles with smooth edges */
export const CIRCLE_FRAG = `#version 300 es
precision highp float;

in vec4 v_color;
in vec2 v_localPos;

out vec4 fragColor;

void main() {
  // Calculate distance from center (0,0) in local coordinates
  float dist = length(v_localPos);
  
  // Smooth edge antialiasing
  float alpha = 1.0 - smoothstep(0.9, 1.0, dist);
  
  // Discard pixels outside the circle
  if (alpha < 0.01) discard;
  
  fragColor = vec4(v_color.rgb, v_color.a * alpha);
}
`;

// =============================================================================
// Line Shader - Used for grid background
// =============================================================================

/** Vertex shader for rendering lines */
export const LINE_VERT = `#version 300 es
precision highp float;

in vec2 a_position;

uniform mat4 u_projection;
uniform vec4 u_color;

out vec4 v_color;

void main() {
  gl_Position = u_projection * vec4(a_position, 0.0, 1.0);
  v_color = u_color;
}
`;

/** Fragment shader for rendering lines */
export const LINE_FRAG = `#version 300 es
precision highp float;

in vec4 v_color;

out vec4 fragColor;

void main() {
  fragColor = v_color;
}
`;

// =============================================================================
// Quad Shader - Used for health bars and UI elements
// =============================================================================

/** Vertex shader for rendering quads (rectangles) using instanced rendering */
export const QUAD_VERT = `#version 300 es
precision highp float;

// Per-vertex attributes (unit quad)
in vec2 a_position;

// Per-instance attributes
in vec4 a_bounds;  // x, y, width, height
in vec4 a_color;

uniform mat4 u_projection;

out vec4 v_color;

void main() {
  // Transform unit quad [0,1] to world coordinates
  vec2 worldPos = a_bounds.xy + a_position * a_bounds.zw;
  gl_Position = u_projection * vec4(worldPos, 0.0, 1.0);
  v_color = a_color;
}
`;

/** Fragment shader for rendering quads */
export const QUAD_FRAG = `#version 300 es
precision highp float;

in vec4 v_color;

out vec4 fragColor;

void main() {
  fragColor = v_color;
}
`;

// =============================================================================
// Glow Post-Processing Shader
// =============================================================================

/** Vertex shader for full-screen quad post-processing */
export const FULLSCREEN_VERT = `#version 300 es
precision highp float;

// Full-screen quad vertices covering clip space
const vec2 pos[6] = vec2[6](
  vec2(-1, -1), vec2(1, -1), vec2(-1, 1),
  vec2(-1, 1), vec2(1, -1), vec2(1, 1)
);

const vec2 uv[6] = vec2[6](
  vec2(0, 0), vec2(1, 0), vec2(0, 1),
  vec2(0, 1), vec2(1, 0), vec2(1, 1)
);

out vec2 v_texCoord;

void main() {
  gl_Position = vec4(pos[gl_VertexID], 0.0, 1.0);
  v_texCoord = uv[gl_VertexID];
}
`;

/** Fragment shader for Kawase blur (glow effect) */
export const BLUR_FRAG = `#version 300 es
precision highp float;

uniform sampler2D u_texture;
uniform vec2 u_texelSize;
uniform float u_offset;

in vec2 v_texCoord;

out vec4 fragColor;

void main() {
  vec4 color = texture(u_texture, v_texCoord);
  
  // Kawase blur: sample 4 corners at offset
  color += texture(u_texture, v_texCoord + vec2(-u_offset, -u_offset) * u_texelSize);
  color += texture(u_texture, v_texCoord + vec2( u_offset, -u_offset) * u_texelSize);
  color += texture(u_texture, v_texCoord + vec2(-u_offset,  u_offset) * u_texelSize);
  color += texture(u_texture, v_texCoord + vec2( u_offset,  u_offset) * u_texelSize);
  
  fragColor = color / 5.0;
}
`;

/** Fragment shader for glow compositing */
export const GLOW_COMPOSITE_FRAG = `#version 300 es
precision highp float;

uniform sampler2D u_scene;
uniform sampler2D u_blur;
uniform float u_intensity;
uniform vec3 u_glowColor;

in vec2 v_texCoord;

out vec4 fragColor;

void main() {
  vec4 scene = texture(u_scene, v_texCoord);
  vec4 blur = texture(u_blur, v_texCoord);
  
  // Add glow on top of scene
  vec3 glow = blur.rgb * u_glowColor * u_intensity;
  fragColor = vec4(scene.rgb + glow, scene.a);
}
`;

// =============================================================================
// Ring Shader - Used for fragment collection rings
// =============================================================================

/** Vertex shader for rendering rings (circle outlines) */
export const RING_VERT = `#version 300 es
precision highp float;

// Per-vertex attributes (unit circle)
in vec2 a_position;

// Per-instance attributes
in vec2 a_center;
in float a_radius;
in float a_thickness;
in vec4 a_color;

uniform mat4 u_projection;

out vec4 v_color;
out vec2 v_localPos;
out float v_thickness;
out float v_radius;

void main() {
  // Scale position by outer radius
  vec2 worldPos = a_center + a_position * a_radius;
  gl_Position = u_projection * vec4(worldPos, 0.0, 1.0);
  v_color = a_color;
  v_localPos = a_position;
  v_thickness = a_thickness;
  v_radius = a_radius;
}
`;

/** Fragment shader for rendering rings */
export const RING_FRAG = `#version 300 es
precision highp float;

in vec4 v_color;
in vec2 v_localPos;
in float v_thickness;
in float v_radius;

out vec4 fragColor;

void main() {
  float dist = length(v_localPos);
  
  // Ring thickness in normalized coordinates
  float innerEdge = 1.0 - (v_thickness / v_radius);
  
  // Smooth edges
  float outerAlpha = 1.0 - smoothstep(0.95, 1.0, dist);
  float innerAlpha = smoothstep(innerEdge - 0.05, innerEdge, dist);
  float alpha = outerAlpha * innerAlpha;
  
  if (alpha < 0.01) discard;
  
  fragColor = vec4(v_color.rgb, v_color.a * alpha);
}
`;
