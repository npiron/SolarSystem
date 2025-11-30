/**
 * Base player stats configuration
 */
import type { PlayerStats } from "../types/index.ts";

export const BASE_PLAYER_STATS: PlayerStats = {
  damage: 12,
  fireDelay: 0.65,
  projectiles: 1,
  regen: 2,
  range: 1,
  bulletSpeed: 260,
  damageReduction: 0,
  pierce: 0,
  collectRadius: 90,
  critChance: 0.08,
  critMultiplier: 2,
  speed: 95
};

export const INITIAL_HP = 120;
export const INITIAL_MAX_HP = 120;
export const PLAYER_RADIUS = 12;
