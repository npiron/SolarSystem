export type WebGL2Context = {
  gl: WebGL2RenderingContext;
  extensions: {
    floatBuffer: EXT_color_buffer_float | null;
  };
  dpr: number;
};

export type WebGL2InitOptions = WebGLContextAttributes & {
  maxDpr?: number;
};

const DEFAULT_OPTIONS: WebGL2InitOptions = {
  alpha: true,
  antialias: true,
  depth: false,
  stencil: false,
  premultipliedAlpha: true,
  powerPreference: "high-performance",
  maxDpr: 2
};

export function initWebGL2(canvas: HTMLCanvasElement, options: WebGL2InitOptions = DEFAULT_OPTIONS): WebGL2Context | null {
  const { maxDpr, ...contextOptions } = options;
  const gl = canvas.getContext("webgl2", contextOptions);

  if (!gl) {
    console.warn("WebGL2 non supporté sur ce navigateur ou ce canvas.");
    return null;
  }

  const maxDeviceRatio = typeof maxDpr === "number" ? maxDpr : DEFAULT_OPTIONS.maxDpr ?? 2;
  const dpr = Math.max(1, Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, maxDeviceRatio));
  const extensions = {
    floatBuffer: gl.getExtension("EXT_color_buffer_float")
  } as const;

  gl.enable(gl.BLEND);
  gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.STENCIL_TEST);

  return { gl, extensions, dpr };
}

export function resizeCanvas(gl: WebGL2RenderingContext, canvas: HTMLCanvasElement, width: number, height: number, dpr: number) {
  const pixelWidth = Math.max(1, Math.round(width * dpr));
  const pixelHeight = Math.max(1, Math.round(height * dpr));

  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }

  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  gl.viewport(0, 0, pixelWidth, pixelHeight);
  return { width: pixelWidth, height: pixelHeight };
}
