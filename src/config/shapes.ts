/**
 * Shape configuration for game entities.
 * Defines available shapes and how they are assigned to different entity types.
 */

import type { Shape, EnemyType } from '../types/entities.ts';

/**
 * Shape ID constants for use in shaders and rendering.
 * These map to the actual shape rendering logic.
 */
export const SHAPE_IDS = {
  circle: 0,
  square: 1,
  triangle: 2,
  diamond: 3,
  hexagon: 4,
  star: 5,
} as const;

/**
 * Get the numeric ID for a shape (used in shaders).
 */
export function getShapeId(shape: Shape): number {
  return SHAPE_IDS[shape] ?? SHAPE_IDS.circle;
}

/**
 * All available shapes for random selection.
 */
export const ALL_SHAPES: readonly Shape[] = ['circle', 'square', 'triangle', 'diamond', 'hexagon', 'star'];

/**
 * Player shape - hexagon to distinguish the hero from other entities.
 */
export const PLAYER_SHAPE: Shape = 'hexagon';

/**
 * Shapes available for bullets/projectiles.
 * Primarily smaller, simpler shapes that look good at small sizes.
 */
export const BULLET_SHAPES: readonly Shape[] = ['circle', 'star', 'diamond'];

/**
 * Get a random bullet shape.
 */
export function getRandomBulletShape(): Shape {
  return BULLET_SHAPES[Math.floor(Math.random() * BULLET_SHAPES.length)];
}

/**
 * Shape mapping for enemy types.
 * Each enemy type has a distinct shape for visual clarity.
 */
export const ENEMY_SHAPES: Record<EnemyType, Shape> = {
  weak: 'circle',
  normal: 'square',
  strong: 'triangle',
  elite: 'star',
};

/**
 * Get the shape for an enemy based on its type.
 */
export function getEnemyShape(type: EnemyType): Shape {
  return ENEMY_SHAPES[type];
}

/**
 * Shapes available for fragment orbs.
 * Mix of shapes for visual variety.
 */
export const FRAGMENT_SHAPES: readonly Shape[] = ['circle', 'diamond', 'hexagon'];

/**
 * Get a random fragment shape.
 */
export function getRandomFragmentShape(): Shape {
  return FRAGMENT_SHAPES[Math.floor(Math.random() * FRAGMENT_SHAPES.length)];
}
