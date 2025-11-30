/**
 * WebGL2 Context Initialization
 *
 * Initializes a WebGL2 rendering context with appropriate settings
 * for the game's needs. Also checks for required extensions.
 */

export interface WebGL2ContextResult {
  gl: WebGL2RenderingContext;
  extensions: {
    floatBuffer: EXT_color_buffer_float | null;
  };
}

/**
 * Initializes a WebGL2 context on the given canvas
 * @param canvas The HTML canvas element to initialize WebGL2 on
 * @returns WebGL2 context and extensions, or null if WebGL2 is not supported
 */
export function initWebGL2(canvas: HTMLCanvasElement): WebGL2ContextResult | null {
  const gl = canvas.getContext('webgl2', {
    alpha: true,
    antialias: true,
    depth: false,
    stencil: false,
    premultipliedAlpha: true,
    preserveDrawingBuffer: false,
    powerPreference: 'high-performance',
  });

  if (!gl) {
    console.error('WebGL2 not supported');
    return null;
  }

  // Check for required extensions
  const floatBuffer = gl.getExtension('EXT_color_buffer_float');
  if (!floatBuffer) {
    console.warn('EXT_color_buffer_float not supported - some features may be limited');
  }

  return {
    gl,
    extensions: {
      floatBuffer,
    },
  };
}

/**
 * Checks if WebGL2 is available in the current browser
 * @returns true if WebGL2 is supported
 */
export function isWebGL2Supported(): boolean {
  try {
    const testCanvas = document.createElement('canvas');
    const gl = testCanvas.getContext('webgl2');
    return gl !== null;
  } catch {
    return false;
  }
}
