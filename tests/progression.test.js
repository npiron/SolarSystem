/**
 * Tests for the progression module
 */
import { describe, expect, it, vi } from "vitest";
import {
  computeGeneratorRate,
  refreshGeneratorRates,
  computeIdleRate,
  buyGenerator,
  buyUpgrade
} from "../src/systems/progression.ts";

describe("progression module", () => {
  describe("computeGeneratorRate", () => {
    it("should compute base rate at level 0", () => {
      const generator = { id: "test", name: "Test", baseRate: 1, rate: 0, level: 0, cost: 10 };
      const rate = computeGeneratorRate(generator, 1, 1);
      expect(rate).toBe(1);
    });

    it("should scale rate by 1.12x per level", () => {
      const generator = { id: "test", name: "Test", baseRate: 1, rate: 0, level: 1, cost: 10 };
      const rate = computeGeneratorRate(generator, 1, 1);
      expect(rate).toBeCloseTo(1.12);
    });

    it("should apply idle multiplier", () => {
      const generator = { id: "test", name: "Test", baseRate: 1, rate: 0, level: 0, cost: 10 };
      const rate = computeGeneratorRate(generator, 2, 1);
      expect(rate).toBe(2);
    });

    it("should apply economy bonus", () => {
      const generator = { id: "test", name: "Test", baseRate: 1, rate: 0, level: 0, cost: 10 };
      const rate = computeGeneratorRate(generator, 1, 1.5);
      expect(rate).toBe(1.5);
    });

    it("should stack all multipliers", () => {
      const generator = { id: "test", name: "Test", baseRate: 2, rate: 0, level: 2, cost: 10 };
      const rate = computeGeneratorRate(generator, 1.5, 1.2);
      // 2 * 1.12^2 * 1.5 * 1.2 = 2 * 1.2544 * 1.8 = 4.51584
      expect(rate).toBeCloseTo(4.51584, 4);
    });
  });

  describe("refreshGeneratorRates", () => {
    it("should update all generator rates", () => {
      const generators = [
        { id: "gen1", name: "Gen1", baseRate: 1, rate: 0, level: 0, cost: 10 },
        { id: "gen2", name: "Gen2", baseRate: 2, rate: 0, level: 1, cost: 20 }
      ];

      refreshGeneratorRates(generators, 1.5, 1.2);

      expect(generators[0].rate).toBeCloseTo(1.8);
      expect(generators[1].rate).toBeCloseTo(2 * 1.12 * 1.5 * 1.2);
    });
  });

  describe("computeIdleRate", () => {
    it("should return 0 when no generators owned", () => {
      const generators = [
        { id: "gen1", name: "Gen1", baseRate: 1, rate: 1, level: 0, cost: 10 }
      ];

      const rate = computeIdleRate(generators, 1, 1);
      expect(rate).toBe(0);
    });

    it("should sum production from all generators", () => {
      const generators = [
        { id: "gen1", name: "Gen1", baseRate: 1, rate: 1, level: 2, cost: 10 },
        { id: "gen2", name: "Gen2", baseRate: 2, rate: 2, level: 1, cost: 20 }
      ];

      const rate = computeIdleRate(generators, 1, 1);
      // gen1: 1 * 1.12^2 * 1 * 1 * 2 = 2.5088
      // gen2: 2 * 1.12^1 * 1 * 1 * 1 = 2.24
      // Total: ~4.75
      expect(rate).toBeCloseTo(4.7488, 3);
    });
  });

  describe("buyGenerator", () => {
    const createState = () => ({
      resources: {
        essence: 100,
        fragments: 0,
        idleMultiplier: 1
      }
    });

    it("should return false if not enough essence", () => {
      const state = createState();
      state.resources.essence = 5;
      const generator = { id: "test", name: "Test", baseRate: 1, rate: 0, level: 0, cost: 10 };

      const result = buyGenerator(state, generator, 1, 1);

      expect(result).toBe(false);
      expect(generator.level).toBe(0);
      expect(state.resources.essence).toBe(5);
    });

    it("should purchase generator and update stats", () => {
      const state = createState();
      const generator = { id: "test", name: "Test", baseRate: 1, rate: 0, level: 0, cost: 10 };

      const result = buyGenerator(state, generator, 1, 1);

      expect(result).toBe(true);
      expect(generator.level).toBe(1);
      expect(state.resources.essence).toBe(90);
      expect(generator.cost).toBeGreaterThan(10);
      expect(generator.rate).toBeCloseTo(1.12);
    });

    it("should scale cost correctly", () => {
      const state = createState();
      const generator = { id: "test", name: "Test", baseRate: 1, rate: 0, level: 0, cost: 10 };

      buyGenerator(state, generator, 1, 1);

      // New cost = ceil(10 * 1.35 + 1 * 2) = ceil(15.5) = 16
      expect(generator.cost).toBe(16);
    });
  });

  describe("buyUpgrade", () => {
    const createState = () => ({
      resources: {
        essence: 0,
        fragments: 100,
        idleMultiplier: 1
      },
      player: {
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
        speed: 95,
        x: 0, y: 0, radius: 12, hp: 100, maxHp: 100, fireTimer: 0, spin: 0
      },
      talents: { bonuses: { damage: 1, fireDelay: 1, economy: 1, collectRadius: 1, projectiles: 0, regen: 0, damageReduction: 0, critChance: 0, critMultiplier: 1, bulletSpeed: 1 } }
    });

    const mockApply = vi.fn((state) => { state.player.damage += 1; });

    it("should return false if already at max level", () => {
      const state = createState();
      const upgrade = { id: "test", name: "Test", description: "", cost: 10, baseCost: 10, level: 5, max: 5, apply: mockApply };

      const result = buyUpgrade(state, upgrade, [upgrade], []);

      expect(result).toBe(false);
      expect(upgrade.level).toBe(5);
    });

    it("should return false if not enough fragments", () => {
      const state = createState();
      state.resources.fragments = 5;
      const upgrade = { id: "test", name: "Test", description: "", cost: 10, baseCost: 10, level: 0, max: 5, apply: mockApply };

      const result = buyUpgrade(state, upgrade, [upgrade], []);

      expect(result).toBe(false);
      expect(upgrade.level).toBe(0);
    });

    it("should purchase upgrade and update level", () => {
      const state = createState();
      const upgrade = { id: "test", name: "Test", description: "", cost: 10, baseCost: 10, level: 0, max: 5, apply: mockApply };

      const result = buyUpgrade(state, upgrade, [upgrade], []);

      expect(result).toBe(true);
      expect(upgrade.level).toBe(1);
      expect(state.resources.fragments).toBe(90);
      expect(upgrade.cost).toBeGreaterThan(10);
    });
  });
});
