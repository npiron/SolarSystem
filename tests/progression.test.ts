import { describe, it, expect } from "vitest";
import { 
  computeGeneratorRate, 
  computeIdleRate, 
  refreshGeneratorRates,
  applyProgressionEffects
} from "../src/systems/progression.ts";
import type { Generator, Upgrade, GameState } from "../src/types/index.ts";
import type { Talent } from "../src/systems/talents.ts";
import { createInitialState } from "../src/systems/gameState.ts";

describe("progression", () => {
  describe("computeGeneratorRate", () => {
    it("should compute rate with base values", () => {
      const gen: Generator = { id: "test", name: "Test", baseRate: 1, rate: 1, level: 0, cost: 10 };
      const rate = computeGeneratorRate(gen, 1, 1);
      expect(rate).toBe(1);
    });

    it("should scale with level", () => {
      const gen: Generator = { id: "test", name: "Test", baseRate: 1, rate: 1, level: 10, cost: 10 };
      const rate = computeGeneratorRate(gen, 1, 1);
      // 1 * 1.10^10 ≈ 2.594
      expect(rate).toBeCloseTo(2.594, 2);
    });

    it("should apply idle multiplier", () => {
      const gen: Generator = { id: "test", name: "Test", baseRate: 1, rate: 1, level: 0, cost: 10 };
      const rate = computeGeneratorRate(gen, 2, 1);
      expect(rate).toBe(2);
    });

    it("should apply economy bonus", () => {
      const gen: Generator = { id: "test", name: "Test", baseRate: 1, rate: 1, level: 0, cost: 10 };
      const rate = computeGeneratorRate(gen, 1, 1.5);
      expect(rate).toBe(1.5);
    });
  });

  describe("computeIdleRate", () => {
    it("should return 0 with no generators", () => {
      const rate = computeIdleRate([], 1, 1);
      expect(rate).toBe(0);
    });

    it("should sum rates by level (with level scaling)", () => {
      const generators: Generator[] = [
        { id: "a", name: "A", baseRate: 1, rate: 1, level: 2, cost: 10 },
        { id: "b", name: "B", baseRate: 2, rate: 2, level: 1, cost: 20 }
      ];
      const rate = computeIdleRate(generators, 1, 1);
      // gen A: baseRate 1 * 1.10^2 * 2 levels = 1.21 * 2 = 2.42
      // gen B: baseRate 2 * 1.10^1 * 1 level = 2.2 * 1 = 2.2
      // total ≈ 4.62
      expect(rate).toBeCloseTo(4.62, 1);
    });
  });

  describe("refreshGeneratorRates", () => {
    it("should update all generator rates", () => {
      const generators: Generator[] = [
        { id: "a", name: "A", baseRate: 1, rate: 0, level: 0, cost: 10 },
        { id: "b", name: "B", baseRate: 2, rate: 0, level: 0, cost: 20 }
      ];
      
      refreshGeneratorRates(generators, 1, 1);
      
      expect(generators[0].rate).toBe(1);
      expect(generators[1].rate).toBe(2);
    });
  });

  describe("applyProgressionEffects", () => {
    it("should reset to base stats and apply upgrades", () => {
      const state = createInitialState(100, 100);
      state.player.damage = 999; // Modified value
      
      const upgrades: Upgrade[] = [];
      const talents: Talent[] = [];
      
      const bonuses = applyProgressionEffects(state, upgrades, talents);
      
      // Should reset to base damage (12)
      expect(state.player.damage).toBe(12);
      expect(bonuses.damage).toBe(1);
    });

    it("should apply upgrade effects multiple times based on level", () => {
      const state = createInitialState(100, 100);
      
      const upgrades: Upgrade[] = [{
        id: "test",
        name: "Test",
        description: "Test",
        cost: 10,
        baseCost: 10,
        level: 2, // Level 2 = apply twice
        max: 10,
        apply: (s: { player: { damage: number } }) => {
          s.player.damage *= 1.15;
        }
      }];
      
      applyProgressionEffects(state, upgrades, []);
      
      // 12 * 1.15 * 1.15 ≈ 15.87
      expect(state.player.damage).toBeCloseTo(15.87, 1);
    });

    it("should apply talent bonuses", () => {
      const state = createInitialState(100, 100);
      
      const talents: Talent[] = [{
        id: "test",
        name: "Test",
        description: "Test",
        synergy: "damage",
        cost: 100,
        requires: [],
        unlocked: true,
        effect: { damageMult: 1.2, projectiles: 2, regen: 5 }
      }];
      
      const bonuses = applyProgressionEffects(state, [], talents);
      
      expect(bonuses.damage).toBe(1.2);
      expect(state.player.damage).toBe(12 * 1.2);
      expect(state.player.projectiles).toBe(1 + 2);
      expect(state.player.regen).toBe(2 + 5);
    });

    it("should cap damage reduction at 0.85", () => {
      const state = createInitialState(100, 100);
      
      const talents: Talent[] = [{
        id: "test",
        name: "Test",
        description: "Test",
        synergy: "defense",
        cost: 100,
        requires: [],
        unlocked: true,
        effect: { damageReduction: 0.9 }
      }];
      
      applyProgressionEffects(state, [], talents);
      
      expect(state.player.damageReduction).toBe(0.85);
    });

    it("should cap crit chance at 0.95", () => {
      const state = createInitialState(100, 100);
      
      const talents: Talent[] = [{
        id: "test",
        name: "Test",
        description: "Test",
        synergy: "damage",
        cost: 100,
        requires: [],
        unlocked: true,
        effect: { critChance: 0.95 }
      }];
      
      applyProgressionEffects(state, [], talents);
      
      // 0.08 (base) + 0.95 would be > 0.95, so capped at 0.95
      expect(state.player.critChance).toBe(0.95);
    });
  });
});
