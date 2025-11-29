/**
 * Tests for the state management module
 */
import { describe, expect, it } from "vitest";
import {
  BASE_PLAYER_STATS,
  createGameState,
  softResetState,
  clampPlayerToBounds
} from "../src/state/gameState.ts";

describe("gameState module", () => {
  const defaultTalentBonuses = {
    damage: 1,
    fireDelay: 1,
    economy: 1,
    collectRadius: 1,
    projectiles: 0,
    regen: 0,
    damageReduction: 0,
    critChance: 0,
    critMultiplier: 1,
    bulletSpeed: 1
  };

  describe("BASE_PLAYER_STATS", () => {
    it("should have correct default values", () => {
      expect(BASE_PLAYER_STATS.damage).toBe(12);
      expect(BASE_PLAYER_STATS.fireDelay).toBe(0.65);
      expect(BASE_PLAYER_STATS.projectiles).toBe(1);
      expect(BASE_PLAYER_STATS.regen).toBe(2);
      expect(BASE_PLAYER_STATS.critChance).toBe(0.08);
      expect(BASE_PLAYER_STATS.critMultiplier).toBe(2);
      expect(BASE_PLAYER_STATS.speed).toBe(95);
    });
  });

  describe("createGameState", () => {
    it("should create state with correct initial values", () => {
      const state = createGameState(480, 300, defaultTalentBonuses);

      expect(state.running).toBe(true);
      expect(state.wave).toBe(1);
      expect(state.time).toBe(0);
      expect(state.player.x).toBe(480);
      expect(state.player.y).toBe(300);
      expect(state.player.hp).toBe(120);
      expect(state.player.maxHp).toBe(120);
      expect(state.enemies).toEqual([]);
      expect(state.bullets).toEqual([]);
      expect(state.fragmentsOrbs).toEqual([]);
      expect(state.resources.essence).toBe(0);
      expect(state.resources.fragments).toBe(0);
      expect(state.resources.idleMultiplier).toBe(1);
      expect(state.dead).toBe(false);
      expect(state.visualsLow).toBe(false);
    });

    it("should use provided talent bonuses", () => {
      const customBonuses = { ...defaultTalentBonuses, damage: 1.5 };
      const state = createGameState(0, 0, customBonuses);

      expect(state.talents.bonuses.damage).toBe(1.5);
    });
  });

  describe("softResetState", () => {
    it("should reset combat state but preserve resources", () => {
      const state = createGameState(480, 300, defaultTalentBonuses);

      // Modify state as if game has progressed
      state.wave = 15;
      state.player.hp = 50;
      state.player.x = 100;
      state.player.y = 100;
      state.enemies.push({});
      state.bullets.push({});
      state.resources.essence = 1000;
      state.resources.fragments = 500;
      state.dead = true;
      state.running = false;

      softResetState(state, 480, 300);

      // Check reset values
      expect(state.wave).toBe(1);
      expect(state.player.hp).toBe(state.player.maxHp);
      expect(state.player.x).toBe(480);
      expect(state.player.y).toBe(300);
      expect(state.enemies).toEqual([]);
      expect(state.bullets).toEqual([]);
      expect(state.dead).toBe(false);
      expect(state.running).toBe(true);

      // Check preserved values
      expect(state.resources.essence).toBe(1000);
      expect(state.resources.fragments).toBe(500);
    });
  });

  describe("clampPlayerToBounds", () => {
    it("should clamp player position within bounds", () => {
      const state = createGameState(480, 300, defaultTalentBonuses);

      // Test left boundary
      state.player.x = -50;
      clampPlayerToBounds(state, 960, 600);
      expect(state.player.x).toBe(30);

      // Test right boundary
      state.player.x = 1000;
      clampPlayerToBounds(state, 960, 600);
      expect(state.player.x).toBe(930);

      // Test top boundary
      state.player.y = -10;
      clampPlayerToBounds(state, 960, 600);
      expect(state.player.y).toBe(30);

      // Test bottom boundary
      state.player.y = 650;
      clampPlayerToBounds(state, 960, 600);
      expect(state.player.y).toBe(570);
    });

    it("should use custom margin", () => {
      const state = createGameState(480, 300, defaultTalentBonuses);

      state.player.x = 0;
      clampPlayerToBounds(state, 100, 100, 10);
      expect(state.player.x).toBe(10);

      state.player.x = 100;
      clampPlayerToBounds(state, 100, 100, 10);
      expect(state.player.x).toBe(90);
    });
  });
});
