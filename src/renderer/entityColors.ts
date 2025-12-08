/**
 * Entity color helpers for rendering enemies and fragments.
 * Provides color mappings for WebGL2 renderers.
 */

import type { EnemyVariant } from "../types/index.ts";
import { colors, webglColors } from "./colors.ts";

/**
 * Get the hex color for an enemy based on its type.
 * @param type - Enemy type: 'weak', 'normal', 'strong', or 'elite'
 * @returns Numeric hex color value
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

export function getVariantHaloColor(variant: EnemyVariant): readonly [number, number, number, number] | undefined {
  switch (variant) {
    case 'volatile': return webglColors.enemyVolatile;
    case 'splitter': return webglColors.enemySplitter;
    case 'artillery': return webglColors.enemyArtillery;
    default: return undefined;
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
 * Get visual properties for a fragment as a mini black hole.
 * Higher value fragments have larger event horizons and brighter accretion disks.
 * @param value - Fragment value
 * @returns Object with color, ringColor, and radius
 */
export function getFragmentVisuals(value: number): FragmentVisuals {
  if (value < LOW_THRESHOLD) {
    // Small black hole - blue accretion disk
    return {
      color: [0.02, 0.02, 0.08, 1] as const, // Ultra dark blue core
      ringColor: [0.3, 0.6, 1, 0.7] as const, // Blue glow
      radius: 3.5 // Smaller
    };
  } else if (value >= HIGH_THRESHOLD) {
    // Large black hole - purple/magenta accretion disk
    return {
      color: [0.05, 0.02, 0.08, 1] as const, // Ultra dark purple core
      ringColor: [0.7, 0.3, 1, 0.8] as const, // Purple glow
      radius: 7 // Smaller
    };
  } else {
    // Medium black hole - cyan accretion disk
    return {
      color: [0.02, 0.05, 0.08, 1] as const, // Ultra dark cyan core
      ringColor: [0.4, 0.8, 1, 0.75] as const, // Cyan glow
      radius: 5.5 // Smaller
    };
  }
}

/**
 * Get hex color for fragment orb based on value.
 * @param value - Fragment value
 * @returns Numeric hex color value
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
  if (value < LOW_THRESHOLD) return 4.5;
  if (value >= HIGH_THRESHOLD) return 10;
  return 7;
}
