/**
 * WebGL2 Renderer Module
 *
 * Exports all renderer components for the WebGL2 migration.
 */

export { initWebGL2, isWebGL2Supported } from './webgl2Context.ts';
export type { WebGL2ContextResult } from './webgl2Context.ts';

export {
  CIRCLE_VERT,
  CIRCLE_FRAG,
  LINE_VERT,
  LINE_FRAG,
  QUAD_VERT,
  QUAD_FRAG,
  RING_VERT,
  RING_FRAG,
  FULLSCREEN_VERT,
  BLUR_FRAG,
  GLOW_COMPOSITE_FRAG,
} from './shaders.ts';

export {
  compileShader,
  createProgram,
  createBuffer,
  createCircleQuadVertices,
  createUnitQuadVertices,
  createCircleVertices,
  createDynamicBuffer,
  updateDynamicBuffer,
  createOrthoMatrix,
  hexToRGBA,
} from './buffers.ts';
export type { DynamicBuffer } from './buffers.ts';

export {
  WebGL2Renderer,
  CanvasFallbackRenderer,
  createRenderer,
} from './renderer.ts';
export type { RendererConfig, Renderer } from './renderer.ts';
