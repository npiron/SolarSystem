/**
 * Font atlas generation for WebGL2 text rendering.
 * Creates a texture atlas containing all needed glyphs with styling.
 */

import type { TextStyle, GlyphMetrics } from "./webgl2TextTypes.ts";

// Characters to include in the font atlas
const ATLAS_CHARS = " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~⚡✦⚔️🌊⟳⇡🔥💎⏳éèêëàâäùûüôöîïçÉÈÊËÀÂÄÙÛÜÔÖÎÏÇ";

type GlyphSize = {
  char: string;
  width: number;
  height: number;
};

type FontAtlasResult = {
  atlasWidth: number;
  atlasHeight: number;
  lineHeight: number;
  glyphMetrics: Map<string, GlyphMetrics>;
  atlasCanvas: HTMLCanvasElement;
};

/**
 * Generate a font atlas texture using Canvas2D.
 * @param style - Text style configuration
 * @param dpr - Device pixel ratio
 * @returns Object containing atlas dimensions, glyph metrics, and canvas
 */
export function generateFontAtlas(style: TextStyle, dpr: number): FontAtlasResult {
  const fontSize = Math.ceil(style.fontSize * dpr);
  const padding = Math.ceil(style.strokeThickness * dpr) + 4;
  const shadowPadding = style.dropShadow ? Math.ceil(style.dropShadowBlur * dpr) : 0;
  const totalPadding = padding + shadowPadding;

  // Create temporary canvas for measuring glyphs
  const measureCanvas = document.createElement("canvas");
  const measureCtx = measureCanvas.getContext("2d")!;
  measureCtx.font = `${fontSize}px ${style.fontFamily}`;

  // Measure all characters
  const glyphSizes: GlyphSize[] = [];
  for (const char of ATLAS_CHARS) {
    const metrics = measureCtx.measureText(char);
    const width = Math.ceil(metrics.width) + totalPadding * 2;
    const height = fontSize + totalPadding * 2;
    glyphSizes.push({ char, width, height });
  }

  // Calculate atlas dimensions (approximate square)
  const totalArea = glyphSizes.reduce((sum, g) => sum + g.width * g.height, 0);
  let atlasSize = Math.max(256, Math.pow(2, Math.ceil(Math.log2(Math.sqrt(totalArea * 1.3)))));
  const maxAtlasSize = 4096; // WebGL2 guaranteed minimum texture size

  // Try to fit all glyphs, increasing atlas size if needed
  let fitsAll = false;
  while (!fitsAll && atlasSize <= maxAtlasSize) {
    let testX = 0;
    let testY = 0;
    let testRowHeight = 0;
    fitsAll = true;

    for (const glyph of glyphSizes) {
      if (testX + glyph.width > atlasSize) {
        testX = 0;
        testY += testRowHeight;
        testRowHeight = 0;
      }
      if (testY + glyph.height > atlasSize) {
        fitsAll = false;
        atlasSize *= 2;
        break;
      }
      testX += glyph.width;
      testRowHeight = Math.max(testRowHeight, glyph.height);
    }
  }

  if (!fitsAll) {
    console.warn(`WebGL2TextRenderer: Atlas size ${atlasSize} exceeds maximum, some glyphs may be missing`);
    atlasSize = maxAtlasSize;
  }

  const atlasWidth = atlasSize;
  const atlasHeight = atlasSize;
  const lineHeight = fontSize + totalPadding;

  // Create atlas canvas
  const atlasCanvas = document.createElement("canvas");
  atlasCanvas.width = atlasSize;
  atlasCanvas.height = atlasSize;
  const ctx = atlasCanvas.getContext("2d")!;

  // Set rendering style
  ctx.font = `${fontSize}px ${style.fontFamily}`;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";

  // Pack glyphs into atlas
  let x = 0;
  let y = 0;
  let rowHeight = 0;
  const glyphMetrics = new Map<string, GlyphMetrics>();

  for (const glyph of glyphSizes) {
    // Check if we need to start a new row
    if (x + glyph.width > atlasSize) {
      x = 0;
      y += rowHeight;
      rowHeight = 0;
    }

    // Check if we've exceeded the atlas height
    if (y + glyph.height > atlasSize) {
      console.warn("WebGL2TextRenderer: Atlas overflow, some glyphs may be missing");
      break;
    }

    const glyphX = x + totalPadding;
    const glyphY = y + totalPadding;

    // Draw drop shadow
    if (style.dropShadow) {
      const [sr, sg, sb, sa] = style.dropShadowColor;
      ctx.shadowColor = `rgba(${sr * 255}, ${sg * 255}, ${sb * 255}, ${sa})`;
      ctx.shadowBlur = style.dropShadowBlur * dpr;
      ctx.shadowOffsetX = style.dropShadowOffset[0] * dpr;
      ctx.shadowOffsetY = style.dropShadowOffset[1] * dpr;

      // Draw shadow pass
      ctx.fillStyle = "rgba(0,0,0,0)";
      ctx.strokeStyle = `rgba(${sr * 255}, ${sg * 255}, ${sb * 255}, ${sa * 0.5})`;
      ctx.lineWidth = style.strokeThickness * dpr;
      ctx.strokeText(glyph.char, glyphX, glyphY);
    }

    // Reset shadow for main text
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Draw stroke
    if (style.strokeThickness > 0) {
      const [r, g, b, a] = style.strokeColor;
      ctx.strokeStyle = `rgba(${r * 255}, ${g * 255}, ${b * 255}, ${a})`;
      ctx.lineWidth = style.strokeThickness * dpr;
      ctx.lineJoin = "round";
      ctx.strokeText(glyph.char, glyphX, glyphY);
    }

    // Draw fill (white for color multiplication)
    ctx.fillStyle = "white";
    ctx.fillText(glyph.char, glyphX, glyphY);

    // Store glyph metrics
    const metrics = measureCtx.measureText(glyph.char);
    glyphMetrics.set(glyph.char, {
      x,
      y,
      width: glyph.width,
      height: glyph.height,
      xOffset: totalPadding,
      yOffset: totalPadding,
      xAdvance: metrics.width,
    });

    x += glyph.width;
    rowHeight = Math.max(rowHeight, glyph.height);
  }

  return {
    atlasWidth,
    atlasHeight,
    lineHeight,
    glyphMetrics,
    atlasCanvas
  };
}
