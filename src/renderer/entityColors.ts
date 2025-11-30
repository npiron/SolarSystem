/**
 * Entity color helpers for rendering enemies and fragments.
 * Provides color mappings for both PIXI (Canvas fallback) and WebGL2 renderers.
 */

import { colors, webglColors } from "./colors.ts";

/**
 * Get the PIXI color for an enemy based on its type.
 * @param type - Enemy type: 'weak', 'normal', 'strong', or 'elite'
 * @returns PIXI hex color value
 */
export function getEnemyColor(type: string): number {
  switch (type) {
    case 'weak': return colors.enemyWeak;
    case 'normal': return colors.enemyNormal;
    case 'strong': return colors.enemyStrong;
    case 'elite': return colors.enemyElite;
    default: return colors.enemyNormal;
  }
}

/**
 * Get the WebGL color array for an enemy based on its type.
 * @param type - Enemy type: 'weak', 'normal', 'strong', or 'elite'
 * @returns WebGL color as [r, g, b, a] normalized values
 */
export function getEnemyColorWebGL(type: string): readonly [number, number, number, number] {
  switch (type) {
    case 'weak': return webglColors.enemyWeak;
    case 'normal': return webglColors.enemyNormal;
    case 'strong': return webglColors.enemyStrong;
    case 'elite': return webglColors.enemyElite;
    default: return webglColors.enemyNormal;
  }
}

type FragmentVisuals = {
  color: readonly [number, number, number, number];
  ringColor: readonly [number, number, number, number];
  radius: number;
};

// Thresholds for fragment value categories
const LOW_THRESHOLD = 3;
const HIGH_THRESHOLD = 10;

/**
 * Get visual properties for a fragment orb based on its value.
 * Higher value fragments are larger and have brighter colors.
 * @param value - Fragment value
 * @returns Object with color, ringColor, and radius
 */
export function getFragmentVisuals(value: number): FragmentVisuals {
  if (value < LOW_THRESHOLD) {
    return {
      color: webglColors.fragmentLow,
      ringColor: webglColors.fragmentRingLow,
      radius: 1
    };
  } else if (value >= HIGH_THRESHOLD) {
    return {
      color: webglColors.fragmentHigh,
      ringColor: webglColors.fragmentRingHigh,
      radius: 3
    };
  } else {
    return {
      color: webglColors.fragmentMedium,
      ringColor: webglColors.fragmentRingMedium,
      radius: 2
    };
  }
}

/**
 * Get PIXI color for fragment orb based on value (for Canvas fallback).
 * @param value - Fragment value
 * @returns PIXI hex color value
 */
export function getFragmentColor(value: number): number {
  if (value < LOW_THRESHOLD) return colors.fragmentLow;
  if (value >= HIGH_THRESHOLD) return colors.fragmentHigh;
  return colors.fragmentMedium;
}

/**
 * Get radius for fragment orb based on value.
 * @param value - Fragment value
 * @returns Radius in pixels
 */
export function getFragmentRadius(value: number): number {
  if (value < LOW_THRESHOLD) return 1;
  if (value >= HIGH_THRESHOLD) return 3;
  return 2;
}
