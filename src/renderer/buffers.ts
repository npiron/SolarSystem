/**
 * WebGL2 Buffer Management
 *
 * Utility functions for creating and managing Vertex Buffer Objects (VBOs)
 * and Vertex Array Objects (VAOs).
 */

/**
 * Compiles a shader from source code
 * @param gl WebGL2 context
 * @param type Shader type (gl.VERTEX_SHADER or gl.FRAGMENT_SHADER)
 * @param source GLSL source code
 * @returns Compiled shader or null on error
 */
export function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) {
    console.error('Failed to create shader');
    return null;
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compile error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

/**
 * Creates and links a shader program from vertex and fragment shader sources
 * @param gl WebGL2 context
 * @param vertSource Vertex shader source
 * @param fragSource Fragment shader source
 * @returns Linked program or null on error
 */
export function createProgram(
  gl: WebGL2RenderingContext,
  vertSource: string,
  fragSource: string
): WebGLProgram | null {
  const vertShader = compileShader(gl, gl.VERTEX_SHADER, vertSource);
  const fragShader = compileShader(gl, gl.FRAGMENT_SHADER, fragSource);

  if (!vertShader || !fragShader) {
    return null;
  }

  const program = gl.createProgram();
  if (!program) {
    console.error('Failed to create program');
    return null;
  }

  gl.attachShader(program, vertShader);
  gl.attachShader(program, fragShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }

  // Shaders can be deleted after linking
  gl.deleteShader(vertShader);
  gl.deleteShader(fragShader);

  return program;
}

/**
 * Creates a buffer and uploads data
 * @param gl WebGL2 context
 * @param data Data to upload (Float32Array, Uint16Array, etc.)
 * @param target Buffer target (gl.ARRAY_BUFFER or gl.ELEMENT_ARRAY_BUFFER)
 * @param usage Usage hint (gl.STATIC_DRAW, gl.DYNAMIC_DRAW, etc.)
 * @returns Created buffer or null on error
 */
export function createBuffer(
  gl: WebGL2RenderingContext,
  data: ArrayBufferView,
  target: number = gl.ARRAY_BUFFER,
  usage: number = gl.STATIC_DRAW
): WebGLBuffer | null {
  const buffer = gl.createBuffer();
  if (!buffer) {
    console.error('Failed to create buffer');
    return null;
  }

  gl.bindBuffer(target, buffer);
  gl.bufferData(target, data, usage);

  return buffer;
}

/**
 * Creates a unit circle quad (for rendering circles via instancing)
 * Returns vertices for a quad from -1 to 1 on both axes
 */
export function createCircleQuadVertices(): Float32Array {
  return new Float32Array([
    // Two triangles forming a quad
    -1, -1,
     1, -1,
    -1,  1,
    -1,  1,
     1, -1,
     1,  1,
  ]);
}

/**
 * Creates a unit quad (for rendering rectangles)
 * Returns vertices for a quad from 0 to 1 on both axes
 */
export function createUnitQuadVertices(): Float32Array {
  return new Float32Array([
    // Two triangles forming a quad
    0, 0,
    1, 0,
    0, 1,
    0, 1,
    1, 0,
    1, 1,
  ]);
}

/**
 * Generates vertices for a circle outline (for ring rendering)
 * @param segments Number of segments in the circle
 * @returns Float32Array of x,y vertex pairs
 */
export function createCircleVertices(segments: number = 32): Float32Array {
  const vertices = new Float32Array((segments + 1) * 2);
  const angleStep = (Math.PI * 2) / segments;

  for (let i = 0; i <= segments; i++) {
    const angle = i * angleStep;
    vertices[i * 2] = Math.cos(angle);
    vertices[i * 2 + 1] = Math.sin(angle);
  }

  return vertices;
}

/**
 * Interface for a dynamic buffer that can be resized and updated efficiently
 */
export interface DynamicBuffer {
  buffer: WebGLBuffer;
  data: Float32Array;
  capacity: number;
  count: number;
}

/**
 * Creates a dynamic buffer for storing instance data
 * @param gl WebGL2 context
 * @param initialCapacity Initial number of elements
 * @param floatsPerElement Number of floats per element
 * @returns Dynamic buffer object
 */
export function createDynamicBuffer(
  gl: WebGL2RenderingContext,
  initialCapacity: number,
  floatsPerElement: number
): DynamicBuffer | null {
  const buffer = gl.createBuffer();
  if (!buffer) {
    return null;
  }

  const data = new Float32Array(initialCapacity * floatsPerElement);
  
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data.byteLength, gl.DYNAMIC_DRAW);

  return {
    buffer,
    data,
    capacity: initialCapacity,
    count: 0,
  };
}

/**
 * Updates a dynamic buffer with new data
 * @param gl WebGL2 context
 * @param dynBuffer Dynamic buffer to update
 * @param floatsPerElement Number of floats per element
 */
export function updateDynamicBuffer(
  gl: WebGL2RenderingContext,
  dynBuffer: DynamicBuffer,
  floatsPerElement: number
): void {
  // Grow buffer if needed
  if (dynBuffer.count > dynBuffer.capacity) {
    const newCapacity = Math.max(dynBuffer.capacity * 2, dynBuffer.count);
    const newData = new Float32Array(newCapacity * floatsPerElement);
    newData.set(dynBuffer.data.subarray(0, dynBuffer.capacity * floatsPerElement));
    dynBuffer.data = newData;
    dynBuffer.capacity = newCapacity;

    gl.bindBuffer(gl.ARRAY_BUFFER, dynBuffer.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, dynBuffer.data.byteLength, gl.DYNAMIC_DRAW);
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, dynBuffer.buffer);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, dynBuffer.data.subarray(0, dynBuffer.count * floatsPerElement));
}

/**
 * Creates an orthographic projection matrix
 * @param left Left boundary
 * @param right Right boundary
 * @param bottom Bottom boundary
 * @param top Top boundary
 * @returns 4x4 projection matrix as Float32Array
 */
export function createOrthoMatrix(
  left: number,
  right: number,
  bottom: number,
  top: number
): Float32Array {
  const out = new Float32Array(16);
  const lr = 1 / (left - right);
  const bt = 1 / (bottom - top);

  out[0] = -2 * lr;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = -2 * bt;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = -1;
  out[11] = 0;
  out[12] = (left + right) * lr;
  out[13] = (top + bottom) * bt;
  out[14] = 0;
  out[15] = 1;

  return out;
}

/**
 * Converts a hex color (0xRRGGBB) to normalized RGBA values
 * @param hex Hex color value
 * @param alpha Alpha value (0-1)
 * @returns Array of [r, g, b, a] values (0-1)
 */
export function hexToRGBA(hex: number, alpha: number = 1): [number, number, number, number] {
  const r = ((hex >> 16) & 0xff) / 255;
  const g = ((hex >> 8) & 0xff) / 255;
  const b = (hex & 0xff) / 255;
  return [r, g, b, alpha];
}
