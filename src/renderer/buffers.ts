export type AttributePointer = {
  location: number;
  size: number;
  type?: GLenum;
  normalized?: GLboolean;
  stride: number;
  offset: number;
  divisor?: number;
};

export function createBuffer(gl: WebGL2RenderingContext, target: GLenum, dataOrSize: BufferSource | number, usage: GLenum) {
  const buffer = gl.createBuffer();
  if (!buffer) {
    throw new Error("Impossible de créer un buffer WebGL2");
  }
  gl.bindBuffer(target, buffer);
  if (typeof dataOrSize === "number") {
    gl.bufferData(target, dataOrSize, usage);
  } else {
    gl.bufferData(target, dataOrSize, usage);
  }
  return buffer;
}

export function bindAttributePointers(gl: WebGL2RenderingContext, attributes: AttributePointer[]) {
  for (const attr of attributes) {
    gl.enableVertexAttribArray(attr.location);
    gl.vertexAttribPointer(
      attr.location,
      attr.size,
      attr.type ?? gl.FLOAT,
      attr.normalized ?? false,
      attr.stride,
      attr.offset
    );
    if (attr.divisor !== undefined) {
      gl.vertexAttribDivisor(attr.location, attr.divisor);
    }
  }
}

export function createQuadCorners(gl: WebGL2RenderingContext) {
  return createBuffer(
    gl,
    gl.ARRAY_BUFFER,
    new Float32Array([
      -1, -1,
      1, -1,
      -1, 1,
      1, 1
    ]),
    gl.STATIC_DRAW
  );
}

export function ensureCapacity(current: Float32Array, required: number) {
  if (required <= current.length) {
    return current;
  }
  const next = new Float32Array(Math.max(required, current.length * 2));
  next.set(current);
  return next;
}
