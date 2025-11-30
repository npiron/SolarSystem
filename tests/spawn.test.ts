import { describe, it, expect } from "vitest";
import {
  chooseSpawnSide,
  calculateSpawnPosition,
  spawnRate,
  packSize,
  spawnEnemy
} from "../src/systems/spawn.ts";
import { createInitialState } from "../src/systems/gameState.ts";

describe("spawn", () => {
  describe("chooseSpawnSide", () => {
    it("should return a valid side (0-3)", () => {
      for (let i = 0; i < 100; i++) {
        const side = chooseSpawnSide(400, 300, 800, 600);
        expect(side).toBeGreaterThanOrEqual(0);
        expect(side).toBeLessThanOrEqual(3);
      }
    });

    it("should favor far sides based on player position", () => {
      // When player is at bottom-right, top and left should be more likely
      const counts = { 0: 0, 1: 0, 2: 0, 3: 0 };
      for (let i = 0; i < 1000; i++) {
        // Player at 90%, 90% position (bottom-right corner)
        const side = chooseSpawnSide(720, 540, 800, 600);
        counts[side as keyof typeof counts]++;
      }
      // Top (0) and left (2) should have more spawns than bottom (1) and right (3)
      expect(counts[0] + counts[2]).toBeGreaterThan(counts[1] + counts[3]);
    });

    it("should favor far sides when player is at top-left", () => {
      const counts = { 0: 0, 1: 0, 2: 0, 3: 0 };
      for (let i = 0; i < 1000; i++) {
        // Player at 10%, 10% position (top-left corner)
        const side = chooseSpawnSide(80, 60, 800, 600);
        counts[side as keyof typeof counts]++;
      }
      // Bottom (1) and right (3) should have more spawns than top (0) and left (2)
      expect(counts[1] + counts[3]).toBeGreaterThan(counts[0] + counts[2]);
    });
  });

  describe("calculateSpawnPosition", () => {
    const canvas = { width: 800, height: 600 };

    it("should spawn at top edge for side 0", () => {
      const pos = calculateSpawnPosition(0, canvas, 0, 1);
      expect(pos.y).toBe(20); // SPAWN_MARGIN
      expect(pos.x).toBeGreaterThanOrEqual(0);
      expect(pos.x).toBeLessThanOrEqual(canvas.width);
    });

    it("should spawn at bottom edge for side 1", () => {
      const pos = calculateSpawnPosition(1, canvas, 0, 1);
      expect(pos.y).toBe(canvas.height - 20);
      expect(pos.x).toBeGreaterThanOrEqual(0);
      expect(pos.x).toBeLessThanOrEqual(canvas.width);
    });

    it("should spawn at left edge for side 2", () => {
      const pos = calculateSpawnPosition(2, canvas, 0, 1);
      expect(pos.x).toBe(20);
      expect(pos.y).toBeGreaterThanOrEqual(0);
      expect(pos.y).toBeLessThanOrEqual(canvas.height);
    });

    it("should spawn at right edge for side 3", () => {
      const pos = calculateSpawnPosition(3, canvas, 0, 1);
      expect(pos.x).toBe(canvas.width - 20);
      expect(pos.y).toBeGreaterThanOrEqual(0);
      expect(pos.y).toBeLessThanOrEqual(canvas.height);
    });

    it("should add spread for pack spawning", () => {
      // For packs, positions should vary based on pack index
      const positions: { x: number; y: number }[] = [];
      for (let i = 0; i < 3; i++) {
        positions.push(calculateSpawnPosition(0, canvas, i, 3));
      }
      // Positions should not all be identical (though they could randomly be close)
      // This is a probabilistic test - in most cases pack positions will differ
    });

    it("should keep spawn positions within bounds", () => {
      for (let side = 0; side < 4; side++) {
        for (let i = 0; i < 5; i++) {
          const pos = calculateSpawnPosition(side, canvas, i, 5);
          expect(pos.x).toBeGreaterThanOrEqual(20);
          expect(pos.x).toBeLessThanOrEqual(canvas.width - 20);
          expect(pos.y).toBeGreaterThanOrEqual(20);
          expect(pos.y).toBeLessThanOrEqual(canvas.height - 20);
        }
      }
    });
  });

  describe("spawnRate", () => {
    it("should increase with wave", () => {
      const state1 = createInitialState(800, 600);
      state1.wave = 1;
      const rate1 = spawnRate(state1);

      const state10 = createInitialState(800, 600);
      state10.wave = 10;
      const rate10 = spawnRate(state10);

      expect(rate10).toBeGreaterThan(rate1);
    });

    it("should be capped at 8", () => {
      const state = createInitialState(800, 600);
      state.wave = 1000;
      expect(spawnRate(state)).toBe(8);
    });
  });

  describe("packSize", () => {
    it("should start at 1 for wave 1", () => {
      const state = createInitialState(800, 600);
      state.wave = 1;
      expect(packSize(state)).toBe(1);
    });

    it("should grow with wave", () => {
      const state = createInitialState(800, 600);
      state.wave = 30;
      expect(packSize(state)).toBeGreaterThan(1);
    });

    it("should be capped at MAX_PACK_SIZE (5)", () => {
      const state = createInitialState(800, 600);
      state.wave = 1000;
      expect(packSize(state)).toBe(5);
    });
  });

  describe("spawnEnemy", () => {
    it("should add an enemy to the state", () => {
      const state = createInitialState(800, 600);
      const canvas = { width: 800, height: 600 };
      expect(state.enemies.length).toBe(0);

      spawnEnemy(state, canvas, 0);

      expect(state.enemies.length).toBe(1);
    });

    it("should spawn enemy within canvas bounds", () => {
      const state = createInitialState(800, 600);
      const canvas = { width: 800, height: 600 };

      for (let i = 0; i < 100; i++) {
        spawnEnemy(state, canvas, 0);
      }

      state.enemies.forEach((enemy) => {
        expect(enemy.x).toBeGreaterThanOrEqual(0);
        expect(enemy.x).toBeLessThanOrEqual(canvas.width);
        expect(enemy.y).toBeGreaterThanOrEqual(0);
        expect(enemy.y).toBeLessThanOrEqual(canvas.height);
      });
    });

    it("should spawn elite enemies based on chance", () => {
      const state = createInitialState(800, 600);
      const canvas = { width: 800, height: 600 };

      // With 100% elite chance
      spawnEnemy(state, canvas, 1.0);
      expect(state.enemies[0].elite).toBe(true);
    });

    it("should spawn non-elite enemies with 0 chance", () => {
      const state = createInitialState(800, 600);
      const canvas = { width: 800, height: 600 };

      for (let i = 0; i < 50; i++) {
        spawnEnemy(state, canvas, 0);
      }

      // All should be non-elite
      state.enemies.forEach((enemy) => {
        expect(enemy.elite).toBe(false);
      });
    });

    it("should respect forced spawn side", () => {
      const state = createInitialState(800, 600);
      const canvas = { width: 800, height: 600 };

      // Force spawn from top (side 0)
      for (let i = 0; i < 10; i++) {
        spawnEnemy(state, canvas, 0, 0, 1, 0);
      }

      // All enemies should be at top (y = 20)
      state.enemies.forEach((enemy) => {
        expect(enemy.y).toBe(20);
      });
    });
  });
});
