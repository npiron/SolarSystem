import { describe, it, expect } from "vitest";
import { createInitialState, createInitialTalentBonuses, softReset } from "../src/systems/gameState.ts";

describe("gameState", () => {
  describe("createInitialTalentBonuses", () => {
    it("should return neutral bonuses", () => {
      const bonuses = createInitialTalentBonuses();
      expect(bonuses.damage).toBe(1);
      expect(bonuses.fireDelay).toBe(1);
      expect(bonuses.economy).toBe(1);
      expect(bonuses.collectRadius).toBe(1);
      expect(bonuses.projectiles).toBe(0);
      expect(bonuses.regen).toBe(0);
      expect(bonuses.damageReduction).toBe(0);
      expect(bonuses.critChance).toBe(0);
      expect(bonuses.critMultiplier).toBe(1);
      expect(bonuses.bulletSpeed).toBe(1);
    });
  });

  describe("createInitialState", () => {
    it("should create state with player centered on canvas", () => {
      const state = createInitialState(800, 600);
      expect(state.player.x).toBe(400);
      expect(state.player.y).toBe(300);
    });

    it("should initialize with correct defaults", () => {
      const state = createInitialState(100, 100);
      expect(state.running).toBe(true);
      expect(state.wave).toBe(1);
      expect(state.enemies).toEqual([]);
      expect(state.bullets).toEqual([]);
      expect(state.resources.essence).toBe(0);
      expect(state.resources.fragments).toBe(0);
      expect(state.dead).toBe(false);
    });

    it("should have valid player stats", () => {
      const state = createInitialState(100, 100);
      expect(state.player.hp).toBe(120);
      expect(state.player.maxHp).toBe(120);
      expect(state.player.damage).toBe(12);
      expect(state.player.radius).toBe(12);
    });
  });

  describe("softReset", () => {
    it("should reset state while keeping resources", () => {
      const state = createInitialState(800, 600);
      state.wave = 50;
      state.player.hp = 10;
      state.enemies.push({} as never);
      state.resources.essence = 1000;
      state.dead = true;
      state.running = false;

      softReset(state, 800, 600);

      expect(state.wave).toBe(1);
      expect(state.player.hp).toBe(state.player.maxHp);
      expect(state.player.x).toBe(400);
      expect(state.player.y).toBe(300);
      expect(state.enemies).toEqual([]);
      expect(state.dead).toBe(false);
      expect(state.running).toBe(true);
      // Resources should NOT be reset
      expect(state.resources.essence).toBe(1000);
    });
  });
});
