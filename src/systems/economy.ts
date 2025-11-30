/**
 * Economy helper functions for calculating game economic values
 * 
 * This module provides convenience functions that wrap the progression
 * system for calculating idle rates and passive income.
 */
import type { Generator, TalentBonuses } from "../types/index.ts";
import { computeIdleRate as computeIdleRateBase } from "./progression.ts";

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
 * Calculate passive essence and fragments earned per time unit
 */
export function computePassiveGains(
  idleRate: number,
  dt: number
): { essence: number; fragments: number } {
  const passiveEssence = idleRate * dt;
  const passiveFragments = idleRate * 0.35 * dt;
  return { essence: passiveEssence, fragments: passiveFragments };
}

/**
 * Calculate offline gains based on elapsed seconds
 * Returns essence and fragments earned while offline
 */
export function computeOfflineGains(
  idleRate: number,
  seconds: number
): { essence: number; fragments: number } {
  const earnedEssence = idleRate * seconds;
  const earnedFragments = earnedEssence * 0.4;
  return { essence: earnedEssence, fragments: earnedFragments };
}
