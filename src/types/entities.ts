/**
 * Entity type definitions for gameplay objects.
 */

/**
 * Shape types for rendering entities.
 * - circle: standard round shape
 * - square: square/rectangle shape
 * - triangle: triangular shape (pointing up)
 * - diamond: rotated square (rhombus)
 * - hexagon: six-sided polygon
 * - star: five-pointed star
 */
export type Shape = 'circle' | 'square' | 'triangle' | 'diamond' | 'hexagon' | 'star';

export interface PlayerStats {
  damage: number;
  fireDelay: number;
  projectiles: number;
  regen: number;
  range: number;
  bulletSpeed: number;
  damageReduction: number;
  pierce: number;
  collectRadius: number;
  critChance: number;
  critMultiplier: number;
  speed: number;
}

export interface Player extends PlayerStats {
  x: number;
  y: number;
  radius: number;
  hp: number;
  maxHp: number;
  fireTimer: number;
  spin: number;
  shape: Shape;
}

export interface Bullet {
  x: number;
  y: number;
  dx: number;
  dy: number;
  life: number;
  pierce: number;
  shape: Shape;
}

export type EnemyType = 'weak' | 'normal' | 'strong' | 'elite';

export interface Enemy {
  x: number;
  y: number;
  radius: number;
  hp: number;
  maxHp: number;
  speed: number;
  reward: number;
  fireTimer: number;
  fireDelay: number;
  elite: boolean;
  type: EnemyType;
  shape: Shape;
  hitThisFrame?: boolean;
}

export interface FragmentOrb {
  x: number;
  y: number;
  value: number;
  vx: number;
  vy: number;
  life: number;
  shape: Shape;
}

export interface FloatingText {
  text: string;
  x: number;
  y: number;
  life: number;
  color: string;
}

export interface GainTicker {
  fragments: number;
  essence: number;
  timer: number;
}
