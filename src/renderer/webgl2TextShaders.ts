/**
 * WebGL2 text shader definitions.
 * Contains vertex and fragment shaders for text rendering using font atlas.
 */

/**
 * Vertex shader for text rendering.
 * Transforms quad vertices and passes texture coordinates and colors.
 */
export const textVertexShader = `#version 300 es
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

/**
 * Fragment shader for text rendering.
 * Samples the font atlas and multiplies by vertex color.
 */
export const textFragmentShader = `#version 300 es
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
