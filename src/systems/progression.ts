/**
 * Progression module
 * Handles generators, upgrades, and idle rate calculations
 */

import type {
  GameState,
  Generator,
  PlayerStats,
  Talent,
  TalentBonuses,
  Upgrade
} from "../types/index.ts";
import { BASE_PLAYER_STATS } from "../state/gameState.ts";
import { computeTalentBonuses } from "./talents.ts";

/**
 * Computes the production rate for a generator
 */
export function computeGeneratorRate(
  generator: Generator,
  idleMultiplier: number,
  economyBonus: number
): number {
  return generator.baseRate * Math.pow(1.12, generator.level) * idleMultiplier * economyBonus;
}

/**
 * Refreshes all generator rates with current multipliers
 */
export function refreshGeneratorRates(
  generators: Generator[],
  idleMultiplier: number,
  economyBonus: number
): void {
  generators.forEach((gen) => {
    gen.rate = computeGeneratorRate(gen, idleMultiplier, economyBonus);
  });
}

/**
 * Computes total idle production rate across all generators
 */
export function computeIdleRate(
  generators: Generator[],
  idleMultiplier: number,
  economyBonus: number
): number {
  return generators.reduce((sum, g) => {
    const rate = computeGeneratorRate(g, idleMultiplier, economyBonus);
    return sum + rate * g.level;
  }, 0);
}

/**
 * Applies all upgrade and talent effects to player stats
 * Resets stats to base values first, then applies all modifiers
 */
export function applyProgressionEffects(
  state: GameState,
  upgrades: Upgrade[],
  talents: Talent[]
): TalentBonuses {
  // Reset to base stats
  Object.entries(BASE_PLAYER_STATS).forEach(([key, value]) => {
    (state.player as unknown as Record<string, number>)[key] = value;
  });

  // Apply upgrade effects
  upgrades.forEach((upgrade) => {
    for (let i = 0; i < upgrade.level; i++) {
      upgrade.apply(state as { player: PlayerStats });
    }
  });

  // Compute and apply talent bonuses
  const talentBonuses = computeTalentBonuses(talents);
  state.talents.bonuses = talentBonuses;

  state.player.damage *= talentBonuses.damage;
  state.player.fireDelay *= talentBonuses.fireDelay;
  state.player.projectiles += talentBonuses.projectiles;
  state.player.regen += talentBonuses.regen;
  state.player.damageReduction = Math.min(
    0.85,
    state.player.damageReduction + talentBonuses.damageReduction
  );
  state.player.collectRadius *= talentBonuses.collectRadius;
  state.player.critChance = Math.min(
    0.95,
    state.player.critChance + talentBonuses.critChance
  );
  state.player.critMultiplier *= talentBonuses.critMultiplier;
  state.player.bulletSpeed *= talentBonuses.bulletSpeed;

  return talentBonuses;
}

/**
 * Grants offline production gains
 */
export function grantOfflineGains(
  state: GameState,
  seconds: number,
  idleRate: number
): void {
  const earnedEssence = idleRate * seconds;
  const earnedFragments = earnedEssence * 0.4;
  state.resources.essence += earnedEssence;
  state.resources.fragments += earnedFragments;
  state.runStats.essence += earnedEssence;
  state.runStats.fragments += earnedFragments;
}

/**
 * Attempts to purchase a generator level
 * Returns true if successful
 */
export function buyGenerator(
  state: GameState,
  generator: Generator,
  idleMultiplier: number,
  economyBonus: number
): boolean {
  if (state.resources.essence < generator.cost) return false;

  state.resources.essence -= generator.cost;
  generator.level += 1;
  generator.cost = Math.ceil(generator.cost * 1.35 + generator.level * 2);
  generator.rate = computeGeneratorRate(generator, idleMultiplier, economyBonus);

  return true;
}

/**
 * Attempts to purchase an upgrade level
 * Returns true if successful
 */
export function buyUpgrade(
  state: GameState,
  upgrade: Upgrade,
  upgrades: Upgrade[],
  talents: Talent[]
): boolean {
  if (upgrade.level >= upgrade.max) return false;
  if (state.resources.fragments < upgrade.cost) return false;

  state.resources.fragments -= upgrade.cost;
  upgrade.level += 1;
  upgrade.cost = Math.ceil(upgrade.cost * 1.45 + upgrade.level * 3);

  applyProgressionEffects(state, upgrades, talents);

  return true;
}
