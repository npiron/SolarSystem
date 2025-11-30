/**
 * Economy helper functions for calculating game economic values
 * 
 * This module provides convenience functions that wrap the progression
 * system for calculating idle rates and passive income.
 * 
 * Note: Fragment multipliers differ between passive (0.35) and offline (0.4) gains.
 * This is intentional - offline gains are slightly more generous as a reward
 * for returning to the game.
 */
import type { Generator, TalentBonuses } from "../types/index.ts";
import { computeIdleRate as computeIdleRateBase } from "./progression.ts";

// Fragment multiplier for real-time passive gains (per second while playing)
const PASSIVE_FRAGMENT_MULTIPLIER = 0.35;
// Fragment multiplier for offline gains (while away from the game)
const OFFLINE_FRAGMENT_MULTIPLIER = 0.4;

/**
 * Calculate the total idle rate from all generators, accounting for
 * multipliers and talent bonuses.
 */
export function computeIdleRate(
  generators: Generator[],
  idleMultiplier: number,
  talentBonuses: TalentBonuses
): number {
  return computeIdleRateBase(generators, idleMultiplier, talentBonuses.economy);
}

/**
 * Calculate passive essence and fragments earned per time unit.
 * Uses a 0.35x fragment multiplier for real-time passive gains.
 */
export function computePassiveGains(
  idleRate: number,
  dt: number
): { essence: number; fragments: number } {
  const passiveEssence = idleRate * dt;
  const passiveFragments = idleRate * PASSIVE_FRAGMENT_MULTIPLIER * dt;
  return { essence: passiveEssence, fragments: passiveFragments };
}

/**
 * Calculate offline gains based on elapsed seconds.
 * Uses a 0.4x fragment multiplier (slightly higher than passive gains)
 * as a reward for returning to the game.
 */
export function computeOfflineGains(
  idleRate: number,
  seconds: number
): { essence: number; fragments: number } {
  const earnedEssence = idleRate * seconds;
  const earnedFragments = earnedEssence * OFFLINE_FRAGMENT_MULTIPLIER;
  return { essence: earnedEssence, fragments: earnedFragments };
}
