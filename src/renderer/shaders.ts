export function compileShader(gl: WebGL2RenderingContext, type: GLenum, source: string) {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error("Impossible de créer le shader WebGL2");
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Erreur de compilation shader: ${log || "inconnue"}`);
  }
  return shader;
}

export function createProgram(gl: WebGL2RenderingContext, vertexSrc: string, fragmentSrc: string) {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSrc);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSrc);
  const program = gl.createProgram();
  if (!program) {
    throw new Error("Impossible de créer le programme WebGL2");
  }
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    throw new Error(`Echec du linkage du programme: ${log || "inconnu"}`);
  }

  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  return program;
}

export const circleVertexShader = `#version 300 es\n`
  + `in vec2 a_corner;\n`
  + `in vec2 a_center;\n`
  + `in float a_radius;\n`
  + `in vec4 a_color;\n`
  + `in vec4 a_haloColor;\n`
  + `in float a_haloScale;\n`
  + `uniform vec2 u_resolution;\n`
  + `out vec2 v_corner;\n`
  + `out float v_radius;\n`
  + `out vec4 v_color;\n`
  + `out vec4 v_haloColor;\n`
  + `out float v_haloScale;\n`
  + `void main() {\n`
  + `  vec2 world = a_center + a_corner * a_radius;\n`
  + `  vec2 zeroToOne = world / u_resolution;\n`
  + `  vec2 clip = zeroToOne * 2.0 - 1.0;\n`
  + `  clip.y *= -1.0;\n`
  + `  gl_Position = vec4(clip, 0.0, 1.0);\n`
  + `  v_corner = a_corner;\n`
  + `  v_radius = a_radius;\n`
  + `  v_color = a_color;\n`
  + `  v_haloColor = a_haloColor;\n`
  + `  v_haloScale = a_haloScale;\n`
  + `}`;

export const circleFragmentShader = `#version 300 es\n`
  + `precision highp float;\n`
  + `in vec2 v_corner;\n`
  + `in float v_radius;\n`
  + `in vec4 v_color;\n`
  + `in vec4 v_haloColor;\n`
  + `in float v_haloScale;\n`
  + `out vec4 outColor;\n`
  + `void main() {\n`
  + `  float aa = 1.5;\n`
  + `  float distPx = length(v_corner * v_radius);\n`
  + `  float fill = smoothstep(v_radius, v_radius - aa, distPx) * v_color.a;\n`
  + `  float halo = 0.0;\n`
  + `  if (v_haloScale > 1.0 && v_haloColor.a > 0.0) {\n`
  + `    float haloStart = v_radius;\n`
  + `    float haloEnd = v_radius * v_haloScale;\n`
  + `    float inner = smoothstep(haloStart + aa, haloStart, distPx);\n`
  + `    float outer = smoothstep(haloEnd, haloEnd - aa, distPx);\n`
  + `    halo = inner * outer * v_haloColor.a;\n`
  + `  }\n`
  + `  float alpha = clamp(fill + halo, 0.0, 1.0);\n`
  + `  vec3 color = vec3(0.0);\n`
  + `  if (alpha > 0.0) {\n`
  + `    color = (v_color.rgb * fill + v_haloColor.rgb * halo);\n`
  + `  }\n`
  + `  outColor = vec4(color, alpha);\n`
  + `}`;

export const quadVertexShader = `#version 300 es\n`
  + `in vec2 a_corner;\n`
  + `in vec2 a_position;\n`
  + `in vec2 a_size;\n`
  + `in vec4 a_color;\n`
  + `uniform vec2 u_resolution;\n`
  + `out vec4 v_color;\n`
  + `void main() {\n`
  + `  vec2 world = a_position + (a_corner * a_size);\n`
  + `  vec2 zeroToOne = world / u_resolution;\n`
  + `  vec2 clip = zeroToOne * 2.0 - 1.0;\n`
  + `  clip.y *= -1.0;\n`
  + `  gl_Position = vec4(clip, 0.0, 1.0);\n`
  + `  v_color = a_color;\n`
  + `}`;

export const quadFragmentShader = `#version 300 es\n`
  + `precision highp float;\n`
  + `in vec4 v_color;\n`
  + `out vec4 outColor;\n`
  + `void main() {\n`
  + `  outColor = v_color;\n`
  + `}`;

export const lineVertexShader = `#version 300 es\n`
  + `in vec2 a_position;\n`
  + `in vec4 a_color;\n`
  + `uniform vec2 u_resolution;\n`
  + `out vec4 v_color;\n`
  + `void main() {\n`
  + `  vec2 zeroToOne = a_position / u_resolution;\n`
  + `  vec2 clip = zeroToOne * 2.0 - 1.0;\n`
  + `  clip.y *= -1.0;\n`
  + `  gl_Position = vec4(clip, 0.0, 1.0);\n`
  + `  v_color = a_color;\n`
  + `}`;

export const lineFragmentShader = `#version 300 es\n`
  + `precision highp float;\n`
  + `in vec4 v_color;\n`
  + `out vec4 outColor;\n`
  + `void main() { outColor = v_color; }`;
