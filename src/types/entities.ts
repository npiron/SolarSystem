/**
 * Entity type definitions for gameplay objects.
 */

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
  orbitProjectiles: number;
  orbitDelay: number;
}

export interface Player extends PlayerStats {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hp: number;
  maxHp: number;
  fireTimer: number;
  orbitTimer: number;
  spin: number;
}

export interface Bullet {
  x: number;
  y: number;
  dx: number;
  dy: number;
  life: number;
  pierce: number;
}

export type EnemyType = 'weak' | 'normal' | 'strong' | 'elite';
export type EnemyVariant = 'chaser' | 'volatile' | 'splitter' | 'artillery';

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
  variant: EnemyVariant;
  generation?: number;
  hitThisFrame?: boolean;
}

export interface FragmentOrb {
  x: number;
  y: number;
  value: number;
  vx: number;
  vy: number;
  life: number;
}

export interface FloatingText {
  text: string;
  x: number;
  y: number;
  life: number;
  color: string;
  scale?: number;
}

export interface GainTicker {
  fragments: number;
  essence: number;
  timer: number;
}

export interface BossEnemy {
  x: number;
  y: number;
  radius: number;
  hp: number;
  maxHp: number;
  speed: number;
  reward: number;
  fireTimer: number;
  fireDelay: number;
}

export interface EnemyProjectile {
  x: number;
  y: number;
  dx: number;
  dy: number;
  life: number;
  damage: number;
}

export interface OrbitalOrb {
  angle: number;
  distance: number;
}

// New weapon visual types
export interface LightningBolt {
  startX: number;
  startY: number;
  segments: { x: number; y: number }[];
  life: number;
}

export interface LaserBeam {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  life: number;
}

export interface HomingMissile {
  x: number;
  y: number;
  dx: number;
  dy: number;
  targetId: number;
  life: number;
  damage: number;
}
