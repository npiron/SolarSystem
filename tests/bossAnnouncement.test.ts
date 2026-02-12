import { describe, it, expect } from "vitest";
import { createInitialState, softReset } from "../src/systems/gameState.ts";
import { spawnBoss } from "../src/systems/spawn.ts";
import { update } from "../src/game.ts";

describe("boss announcement", () => {
  const canvas = { width: 800, height: 600 };

  it("should be null in initial state", () => {
    const state = createInitialState(800, 600);
    expect(state.bossAnnouncement).toBeNull();
  });

  it("should be set when a boss spawns", () => {
    const state = createInitialState(800, 600);
    state.wave = 5;
    spawnBoss(state, canvas);
    expect(state.bossAnnouncement).not.toBeNull();
    expect(state.bossAnnouncement!.text).toContain("BOSS");
    expect(state.bossAnnouncement!.text).toContain("5");
    expect(state.bossAnnouncement!.timer).toBe(3.0);
  });

  it("should count down over time via update", () => {
    const state = createInitialState(800, 600);
    state.wave = 5;
    spawnBoss(state, canvas);
    const context = {
      canvasWidth: 800,
      canvasHeight: 600,
      generators: [],
      talentBonuses: state.talents.bonuses,
      assistUi: {
        recordShot: () => {},
        recordPurchase: () => {},
        recordPrestige: () => {},
        trackWave: () => {},
        refreshMilestones: () => {},
      },
    };
    update(state, 1.0, context);
    expect(state.bossAnnouncement).not.toBeNull();
    expect(state.bossAnnouncement!.timer).toBeCloseTo(2.0, 0);
  });

  it("should be cleared after its duration expires", () => {
    const state = createInitialState(800, 600);
    state.wave = 5;
    spawnBoss(state, canvas);
    const context = {
      canvasWidth: 800,
      canvasHeight: 600,
      generators: [],
      talentBonuses: state.talents.bonuses,
      assistUi: {
        recordShot: () => {},
        recordPurchase: () => {},
        recordPrestige: () => {},
        trackWave: () => {},
        refreshMilestones: () => {},
      },
    };
    update(state, 3.5, context);
    expect(state.bossAnnouncement).toBeNull();
  });

  it("should be reset on softReset", () => {
    const state = createInitialState(800, 600);
    state.wave = 5;
    spawnBoss(state, canvas);
    expect(state.bossAnnouncement).not.toBeNull();
    softReset(state, 800, 600);
    expect(state.bossAnnouncement).toBeNull();
  });
});
