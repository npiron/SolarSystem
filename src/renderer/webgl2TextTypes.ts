/**
 * Type definitions for WebGL2 text rendering.
 */

/**
 * Text instance for batched rendering
 */
export type TextInstance = {
  text: string;
  x: number;
  y: number;
  color: readonly [number, number, number, number];
  scale?: number;
  alpha?: number;
};

/**
 * Style configuration for text rendering
 */
export type TextStyle = {
  fontFamily: string;
  fontSize: number;
  strokeColor: readonly [number, number, number, number];
  strokeThickness: number;
  dropShadow: boolean;
  dropShadowColor: readonly [number, number, number, number];
  dropShadowBlur: number;
  dropShadowOffset: readonly [number, number];
};

/**
 * Glyph metrics stored in the atlas
 */
export type GlyphMetrics = {
  x: number;      // X position in atlas texture
  y: number;      // Y position in atlas texture
  width: number;  // Width of glyph in atlas
  height: number; // Height of glyph in atlas
  xOffset: number;
  yOffset: number;
  xAdvance: number;
};

/**
 * Default text style configuration
 * Sharp, readable text with minimal blur for crisp rendering
 */
export const DEFAULT_STYLE: TextStyle = {
  fontFamily: "Fredoka, Baloo 2, Nunito, sans-serif",
  fontSize: 18,
  strokeColor: [5 / 255, 10 / 255, 25 / 255, 1.0],
  strokeThickness: 3,
  dropShadow: true,
  dropShadowColor: [0, 0, 0, 0.7],
  dropShadowBlur: 2,
  dropShadowOffset: [1.5, 1.5],
};

// Vertex data constants
export const FLOATS_PER_VERTEX = 8; // x, y, u, v, r, g, b, a
export const VERTICES_PER_QUAD = 6; // 2 triangles
export const FLOATS_PER_QUAD = FLOATS_PER_VERTEX * VERTICES_PER_QUAD;
