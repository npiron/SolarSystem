import { describe, it, expect } from "vitest";
import { BASE_PLAYER_STATS, INITIAL_HP, INITIAL_MAX_HP, PLAYER_RADIUS } from "../src/config/player.ts";

describe("player config", () => {
  it("should have valid base stats", () => {
    expect(BASE_PLAYER_STATS.damage).toBe(12);
    expect(BASE_PLAYER_STATS.fireDelay).toBe(0.65);
    expect(BASE_PLAYER_STATS.projectiles).toBe(1);
    expect(BASE_PLAYER_STATS.regen).toBe(2);
    expect(BASE_PLAYER_STATS.range).toBe(1);
    expect(BASE_PLAYER_STATS.bulletSpeed).toBe(260);
    expect(BASE_PLAYER_STATS.damageReduction).toBe(0);
    expect(BASE_PLAYER_STATS.pierce).toBe(0);
    expect(BASE_PLAYER_STATS.collectRadius).toBe(90);
    expect(BASE_PLAYER_STATS.critChance).toBe(0.08);
    expect(BASE_PLAYER_STATS.critMultiplier).toBe(2);
    expect(BASE_PLAYER_STATS.speed).toBe(95);
  });

  it("should export HP constants", () => {
    expect(INITIAL_HP).toBe(120);
    expect(INITIAL_MAX_HP).toBe(120);
    expect(PLAYER_RADIUS).toBe(14);
  });
});
