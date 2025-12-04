/**
 * Progression system - handles upgrades, talents, and generator rates
 */
import type { GameState, Generator, Talent, TalentBonuses, Upgrade } from "../types/index.ts";
import { BASE_PLAYER_STATS } from "../config/player.ts";
import { computeTalentBonuses } from "./talents.ts";

export function computeGeneratorRate(generator: Generator, idleMultiplier: number, economyBonus: number): number {
  return generator.baseRate * Math.pow(1.10, generator.level) * idleMultiplier * economyBonus;
}

export function refreshGeneratorRates(generators: Generator[], idleMultiplier: number, economyBonus: number): void {
  generators.forEach((gen) => {
    gen.rate = computeGeneratorRate(gen, idleMultiplier, economyBonus);
  });
}

export function computeIdleRate(generators: Generator[], idleMultiplier: number, economyBonus: number): number {
  return generators.reduce((sum, g) => {
    const rate = computeGeneratorRate(g, idleMultiplier, economyBonus);
    return sum + rate * g.level;
  }, 0);
}

export function applyProgressionEffects(
  state: GameState, 
  upgrades: Upgrade[], 
  talents: Talent[]
): TalentBonuses {
  // Reset to base stats - use Object.assign for type safety
  Object.assign(state.player, BASE_PLAYER_STATS);

  // Apply upgrades
  upgrades.forEach((upgrade) => {
    if (upgrade.level === 0) return;
    upgrade.apply(state, upgrade.level);
  });

  // Apply talent bonuses
  const talentBonuses = computeTalentBonuses(talents);
  state.talents.bonuses = talentBonuses;

  state.player.damage *= talentBonuses.damage;
  state.player.fireDelay *= talentBonuses.fireDelay;
  state.player.projectiles += talentBonuses.projectiles;
  state.player.regen += talentBonuses.regen;
  state.player.damageReduction = Math.min(0.85, state.player.damageReduction + talentBonuses.damageReduction);
  state.player.collectRadius *= talentBonuses.collectRadius;
  state.player.critChance = Math.min(0.95, state.player.critChance + talentBonuses.critChance);
  state.player.critMultiplier *= talentBonuses.critMultiplier;
  state.player.bulletSpeed *= talentBonuses.bulletSpeed;

  return talentBonuses;
}
