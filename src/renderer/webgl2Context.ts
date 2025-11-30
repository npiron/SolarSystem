export function initWebGL2(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    antialias: true,
    depth: false,
    stencil: false,
    powerPreference: "high-performance"
  });

  if (!gl) {
    console.warn("WebGL2 non supporté sur ce navigateur ou ce canvas.");
    return null;
  }

  const extensions = {
    floatBuffer: gl.getExtension("EXT_color_buffer_float")
  } as const;

  gl.enable(gl.BLEND);
  gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  return { gl, extensions };
}
