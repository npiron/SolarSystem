import { describe, expect, it, vi } from "vitest";
import { AttributePointer, bindAttributePointers, createBuffer, ensureCapacity } from "../src/renderer/buffers.ts";

type StubbedGL = WebGL2RenderingContext & {
  __calls?: Record<string, MockFn>;
};

type MockFn = ReturnType<typeof vi.fn>;

function createStubGL(): StubbedGL {
  const bindBuffer = vi.fn();
  const bufferData = vi.fn();
  const createBufferMock = vi.fn(() => ({}) as WebGLBuffer) as MockFn;
  const enableVertexAttribArray = vi.fn();
  const vertexAttribPointer = vi.fn();
  const vertexAttribDivisor = vi.fn();

  const gl = {
    ARRAY_BUFFER: 0x8892,
    DYNAMIC_DRAW: 0x88e8,
    STATIC_DRAW: 0x88e4,
    FLOAT: 0x1406,
    bindBuffer,
    bufferData,
    createBuffer: createBufferMock,
    enableVertexAttribArray,
    vertexAttribPointer,
    vertexAttribDivisor
  } as unknown as StubbedGL;

  gl.__calls = {
    bindBuffer,
    bufferData,
    createBuffer: createBufferMock,
    enableVertexAttribArray,
    vertexAttribPointer,
    vertexAttribDivisor
  };

  return gl;
}

describe("buffer utilities", () => {
  it("creates and uploads buffers", () => {
    const gl = createStubGL();
    const data = new Float32Array([1, 2, 3]);
    const buffer = createBuffer(gl, gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

    expect(buffer).toBeTruthy();
    expect(gl.__calls?.createBuffer).toHaveBeenCalledTimes(1);
    expect(gl.__calls?.bindBuffer).toHaveBeenCalledWith(gl.ARRAY_BUFFER, buffer);
    expect(gl.__calls?.bufferData).toHaveBeenCalledWith(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  });

  it("binds attribute pointers with divisors", () => {
    const gl = createStubGL();
    const attributes: AttributePointer[] = [
      { location: 0, size: 2, stride: 24, offset: 0 },
      { location: 1, size: 4, stride: 24, offset: 8, divisor: 1 }
    ];

    bindAttributePointers(gl, attributes);

    expect(gl.__calls?.enableVertexAttribArray).toHaveBeenNthCalledWith(1, 0);
    expect(gl.__calls?.vertexAttribPointer).toHaveBeenNthCalledWith(1, 0, 2, gl.FLOAT, false, 24, 0);
    expect(gl.__calls?.vertexAttribDivisor).not.toHaveBeenCalledWith(0, expect.anything());
    expect(gl.__calls?.enableVertexAttribArray).toHaveBeenNthCalledWith(2, 1);
    expect(gl.__calls?.vertexAttribPointer).toHaveBeenNthCalledWith(2, 1, 4, gl.FLOAT, false, 24, 8);
    expect(gl.__calls?.vertexAttribDivisor).toHaveBeenCalledWith(1, 1);
  });

  it("grows instance arrays while preserving existing data", () => {
    const initial = new Float32Array([1, 2, 3, 4]);
    const expanded = ensureCapacity(initial, 10);

    expect(expanded.length).toBeGreaterThanOrEqual(10);
    expect(Array.from(expanded.slice(0, 4))).toEqual([1, 2, 3, 4]);
  });
});
