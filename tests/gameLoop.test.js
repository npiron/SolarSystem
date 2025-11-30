/**
 * Tests for the game loop module
 */
import { describe, expect, it, vi } from "vitest";
import {
  findNearestFragment,
  clampPlayerToBounds,
  performSoftReset,
} from "../src/systems/gameLoop.ts";

describe("gameLoop module", () => {
  const createMockState = () => ({
    running: true,
    wave: 10,
    time: 0,
    enemies: [],
    bullets: [],
    floatingText: [],
    fragmentsOrbs: [],
    gainTicker: { fragments: 100, essence: 50, timer: 1 },
    runStats: { kills: 10, fragments: 500, essence: 1000 },
    player: {
      x: 480,
      y: 300,
      radius: 12,
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
      hp: 50,
      maxHp: 120,
      fireTimer: 0.5,
      spin: 0.3,
    },
    resources: { essence: 1000, fragments: 500, idleMultiplier: 1.5 },
    talents: { bonuses: {} },
    assist: { firstShot: true, firstPurchase: true, firstPrestige: false, bestWave: 10, completed: [] },
    spawnTimer: 0.5,
    overlayFade: 0.12,
    prestigeCooldown: 5,
    dead: true,
    visualsLow: false,
    audio: { enabled: true },
    performance: { fps: 60, history: [], maxSamples: 240, graphVisible: false },
    addons: { glow: true, bloom: true, grain: false, hudPulse: true },
  });

  describe("findNearestFragment", () => {
    it("should return null when no fragments exist", () => {
      const state = createMockState();
      state.fragmentsOrbs = [];

      const result = findNearestFragment(state);

      expect(result).toBeNull();
    });

    it("should return the nearest fragment", () => {
      const state = createMockState();
      state.player.x = 100;
      state.player.y = 100;
      state.fragmentsOrbs = [
        { x: 200, y: 200, value: 10, vx: 0, vy: 0, life: 5 },
        { x: 110, y: 110, value: 5, vx: 0, vy: 0, life: 5 },
        { x: 500, y: 500, value: 20, vx: 0, vy: 0, life: 5 },
      ];

      const result = findNearestFragment(state);

      expect(result).toBe(state.fragmentsOrbs[1]);
    });

    it("should return the only fragment when there is one", () => {
      const state = createMockState();
      state.fragmentsOrbs = [
        { x: 300, y: 300, value: 10, vx: 0, vy: 0, life: 5 },
      ];

      const result = findNearestFragment(state);

      expect(result).toBe(state.fragmentsOrbs[0]);
    });
  });

  describe("clampPlayerToBounds", () => {
    it("should clamp player to left boundary", () => {
      const state = createMockState();
      state.player.x = -10;

      clampPlayerToBounds(state, 960, 600);

      expect(state.player.x).toBe(30);
    });

    it("should clamp player to right boundary", () => {
      const state = createMockState();
      state.player.x = 1000;

      clampPlayerToBounds(state, 960, 600);

      expect(state.player.x).toBe(930);
    });

    it("should clamp player to top boundary", () => {
      const state = createMockState();
      state.player.y = 0;

      clampPlayerToBounds(state, 960, 600);

      expect(state.player.y).toBe(30);
    });

    it("should clamp player to bottom boundary", () => {
      const state = createMockState();
      state.player.y = 700;

      clampPlayerToBounds(state, 960, 600);

      expect(state.player.y).toBe(570);
    });

    it("should use custom margin", () => {
      const state = createMockState();
      state.player.x = 5;

      clampPlayerToBounds(state, 960, 600, 20);

      expect(state.player.x).toBe(20);
    });
  });

  describe("performSoftReset", () => {
    it("should reset wave to 1", () => {
      const state = createMockState();

      performSoftReset(state, 480, 300);

      expect(state.wave).toBe(1);
    });

    it("should restore player HP to max", () => {
      const state = createMockState();

      performSoftReset(state, 480, 300);

      expect(state.player.hp).toBe(state.player.maxHp);
    });

    it("should center player position", () => {
      const state = createMockState();

      performSoftReset(state, 500, 350);

      expect(state.player.x).toBe(500);
      expect(state.player.y).toBe(350);
    });

    it("should clear all entity arrays", () => {
      const state = createMockState();
      state.enemies = [{}, {}];
      state.bullets = [{}];
      state.floatingText = [{}, {}, {}];
      state.fragmentsOrbs = [{}];

      performSoftReset(state, 480, 300);

      expect(state.enemies).toEqual([]);
      expect(state.bullets).toEqual([]);
      expect(state.floatingText).toEqual([]);
      expect(state.fragmentsOrbs).toEqual([]);
    });

    it("should reset run stats", () => {
      const state = createMockState();

      performSoftReset(state, 480, 300);

      expect(state.runStats).toEqual({ kills: 0, fragments: 0, essence: 0 });
    });

    it("should reset game flags", () => {
      const state = createMockState();
      state.dead = true;
      state.running = false;

      performSoftReset(state, 480, 300);

      expect(state.dead).toBe(false);
      expect(state.running).toBe(true);
    });

    it("should reset gain ticker", () => {
      const state = createMockState();

      performSoftReset(state, 480, 300);

      expect(state.gainTicker).toEqual({ fragments: 0, essence: 0, timer: 0 });
    });

    it("should reset spawn timer and fire timer", () => {
      const state = createMockState();

      performSoftReset(state, 480, 300);

      expect(state.spawnTimer).toBe(0);
      expect(state.player.fireTimer).toBe(0);
    });
  });
});
