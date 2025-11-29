import { describe, expect, it } from "vitest";
import {
  BULLET_LIMITS,
  FX_BUDGET,
  MAX_OFFLINE_SECONDS,
  STORAGE_KEY,
  TAU,
  VERSION,
  icons,
  palette,
} from "../src/config/constants.ts";
import { createGenerators } from "../src/config/generators.ts";
import { createUpgrades } from "../src/config/upgrades.ts";
import { createTalentTree } from "../src/config/talents.ts";

function cloneState() {
  return {
    player: {
      damage: 100,
      fireDelay: 2,
      regen: 0,
      projectiles: 1,
      range: 100,
      bulletSpeed: 100,
      critChance: 0.88,
      critMultiplier: 1.5,
      damageReduction: 0.68,
      pierce: 0,
      collectRadius: 50,
      speed: 100,
    },
  };
}

describe("config factories", () => {
  it("exposes immutable constants for the game", () => {
    expect(STORAGE_KEY).toBe("neo-survivors-save");
    expect(TAU).toBeCloseTo(Math.PI * 2);
    expect(VERSION).toBe("v0.1.0");
    expect(MAX_OFFLINE_SECONDS).toBe(10800);
    expect(FX_BUDGET).toMatchObject({ fragments: 200, bullets: 520 });
    expect(BULLET_LIMITS.maxLifetime).toBeCloseTo(2.4);
    expect(palette).toContain("#ffd166");
    expect(Object.keys(icons)).toEqual(
      expect.arrayContaining(["essence", "fragments", "wave"])
    );
  });

  it("creates generator definitions with default values", () => {
    const generators = createGenerators();
    expect(generators).toHaveLength(4);
    expect(generators.map((g) => g.id)).toEqual(["drone", "forge", "spires", "nexus"]);
    expect(generators[0]).toMatchObject({
      name: "Drones collecteurs",
      baseRate: 0.2,
      rate: 0.2,
      level: 0,
      cost: 15,
    });

    const anotherCall = createGenerators();
    expect(anotherCall).not.toBe(generators);
    expect(anotherCall[0]).not.toBe(generators[0]);
  });

  it("applies upgrades to a player state and clamps values", () => {
    const upgrades = createUpgrades();
    const state = cloneState();

    upgrades.forEach((upgrade) => upgrade.apply(state));

    expect(state.player.damage).toBeCloseTo(125);
    expect(state.player.fireDelay).toBeCloseTo(1.7);
    expect(state.player.regen).toBe(3);
    expect(state.player.projectiles).toBe(2);
    expect(state.player.range).toBeCloseTo(120);
    expect(state.player.bulletSpeed).toBeCloseTo(115);
    expect(state.player.critChance).toBeCloseTo(0.9);
    expect(state.player.critMultiplier).toBeCloseTo(2.2);
    expect(state.player.damageReduction).toBeCloseTo(0.7);
    expect(state.player.pierce).toBe(1);
    expect(state.player.collectRadius).toBeCloseTo(56);
    expect(state.player.speed).toBeCloseTo(108);
  });

  it("exposes a consistent talent tree structure", () => {
    const talents = createTalentTree();
    expect(talents).toHaveLength(9);
    const ids = talents.map((talent) => talent.id);
    expect(ids).toContain("focus_fulgurant");
    expect(ids).toContain("catapulte_d_energie");
    expect(talents.find((talent) => talent.id === "flux_conducteur").requires).toEqual([
      "anneau_fulgurant",
    ]);
  });
});
