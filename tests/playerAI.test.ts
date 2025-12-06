import { describe, it, expect } from "vitest";
import { calculateDangerVector } from "../src/player.ts";
import { createInitialState } from "../src/systems/gameState.ts";

function createState() {
  const state = createInitialState(800, 600);
  state.player.x = 400;
  state.player.y = 300;
  return state;
}

describe("player danger awareness", () => {
  it("prioritizes strafing away from incoming projectiles", () => {
    const state = createState();

    state.enemyProjectiles.push({
      x: state.player.x,
      y: state.player.y - 180,
      dx: 0,
      dy: 140,
      life: 2,
      damage: 18
    });

    const danger = calculateDangerVector(state);

    expect(danger.threat).toBeGreaterThan(0);
    expect(Math.abs(danger.dx)).toBeGreaterThan(0.25);
    expect(danger.dy).toBeGreaterThan(0);
  });

  it("ignores projectiles moving away from the player", () => {
    const state = createState();

    state.enemyProjectiles.push({
      x: state.player.x - 200,
      y: state.player.y,
      dx: -160,
      dy: 0,
      life: 1,
      damage: 10
    });

    const danger = calculateDangerVector(state);

    expect(danger.threat).toBe(0);
    expect(danger.dx).toBe(0);
    expect(danger.dy).toBe(0);
  });

  it("leans away from imminent projectiles even when enemies are nearby", () => {
    const state = createState();

    state.enemies.push({
      x: state.player.x + 90,
      y: state.player.y,
      radius: 20,
      hp: 12,
      maxHp: 12,
      speed: 40,
      reward: 5,
      fireTimer: 0,
      fireDelay: 1,
      elite: false,
      type: "normal",
      variant: "chaser"
    });

    state.enemyProjectiles.push({
      x: state.player.x - 160,
      y: state.player.y,
      dx: 140,
      dy: 0,
      life: 2,
      damage: 22
    });

    const danger = calculateDangerVector(state);

    expect(danger.threat).toBeGreaterThan(0);
    expect(danger.dy).toBeLessThan(-0.1);
  });
});
