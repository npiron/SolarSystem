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
}

export interface Player extends PlayerStats {
  x: number;
  y: number;
  radius: number;
  hp: number;
  maxHp: number;
  fireTimer: number;
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
}

export interface GainTicker {
  fragments: number;
  essence: number;
  timer: number;
}
