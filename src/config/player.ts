/**
 * Base player stats configuration
 * @deprecated Use getPlayerStatsFromTuning() instead for configurable values
 */
import type { PlayerStats } from "../types/index.ts";
import { getTuning } from "./tuning.ts";

/**
 * Get player stats from tuning configuration
 */
export function getPlayerStatsFromTuning(): PlayerStats {
  const tuning = getTuning().player;
  return {
    damage: tuning.damage,
    fireDelay: tuning.fireDelay,
    projectiles: tuning.projectiles,
    regen: tuning.regen,
    range: tuning.range,
    bulletSpeed: tuning.bulletSpeed,
    damageReduction: tuning.damageReduction,
    pierce: tuning.pierce,
    collectRadius: tuning.collectRadius,
    critChance: tuning.critChance,
    critMultiplier: tuning.critMultiplier,
    speed: tuning.speed,
    orbitProjectiles: tuning.orbitProjectiles,
    orbitDelay: tuning.orbitDelay
  };
}

/**
 * @deprecated Use getPlayerStatsFromTuning() instead
 */
export const BASE_PLAYER_STATS: PlayerStats = getPlayerStatsFromTuning();

/**
 * Get initial HP from tuning
 */
export function getInitialHP(): number {
  return getTuning().player.initialHp;
}

/**
 * Get player radius from tuning
 */
export function getPlayerRadius(): number {
  return getTuning().player.radius;
}

/**
 * @deprecated Use getInitialHP() instead
 */
export const INITIAL_HP = getInitialHP();

/**
 * @deprecated Use getInitialHP() instead
 */
export const INITIAL_MAX_HP = getInitialHP();

/**
 * @deprecated Use getPlayerRadius() instead
 */
export const PLAYER_RADIUS = getPlayerRadius();
