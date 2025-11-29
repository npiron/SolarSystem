import { describe, expect, it } from "vitest";
import { TALENT_RESET_COST } from "../src/config/talents.ts";
import {
  canUnlockTalent,
  computeTalentBonuses,
  hydrateTalents,
  prerequisitesMet,
  resetTalents,
  unlockTalent,
} from "../src/systems/talents.ts";

describe("talent system", () => {
  it("hydrates talent tree with saved progress", () => {
    const saved = [
      { id: "focus_fulgurant", unlocked: true },
      { id: "anneau_fulgurant", unlocked: false },
    ];
    const hydrated = hydrateTalents(saved);
    const hydratedFromNull = hydrateTalents(null);

    expect(hydrated.find((t) => t.id === "focus_fulgurant").unlocked).toBe(true);
    expect(hydrated.find((t) => t.id === "anneau_fulgurant").unlocked).toBe(false);
    expect(hydrated.every((t) => Object.prototype.hasOwnProperty.call(t, "unlocked"))).toBe(true);
    expect(hydratedFromNull.every((t) => t.unlocked === false)).toBe(true);
  });

  it("validates prerequisites and unlock conditions", () => {
    const talents = hydrateTalents();
    const focus = talents.find((t) => t.id === "focus_fulgurant");
    const cascade = talents.find((t) => t.id === "cascade_critique");
    const resources = { fragments: 1000 };

    expect(prerequisitesMet(cascade, talents)).toBe(false);
    focus.unlocked = true;
    expect(prerequisitesMet(cascade, talents)).toBe(true);
    expect(prerequisitesMet({ requires: undefined }, talents)).toBe(true);

    cascade.unlocked = true;
    expect(canUnlockTalent(cascade, talents, resources)).toBe(false);
    cascade.unlocked = false;
    resources.fragments = 0;
    expect(canUnlockTalent(cascade, talents, resources)).toBe(false);
    resources.fragments = 1000;
    expect(canUnlockTalent(cascade, talents, resources)).toBe(true);
  });

  it("unlocks talents only when requirements are satisfied", () => {
    const talents = hydrateTalents();
    const focus = talents.find((t) => t.id === "focus_fulgurant");
    const cascade = talents.find((t) => t.id === "cascade_critique");
    const state = { resources: { fragments: 800 } };

    const failure = unlockTalent(cascade, talents, state);
    expect(failure).toBe(false);
    expect(state.resources.fragments).toBe(800);
    expect(cascade.unlocked).toBe(false);

    focus.unlocked = true;
    const success = unlockTalent(cascade, talents, state);
    expect(success).toBe(true);
    expect(state.resources.fragments).toBe(800 - cascade.cost);
    expect(cascade.unlocked).toBe(true);
  });

  it("resets talents when the player pays the reset cost", () => {
    const talents = hydrateTalents();
    talents.forEach((talent) => {
      talent.unlocked = true;
    });

    const state = { resources: { fragments: TALENT_RESET_COST - 1 } };
    expect(resetTalents(talents, state)).toBe(false);
    expect(state.resources.fragments).toBe(TALENT_RESET_COST - 1);
    expect(talents.every((t) => t.unlocked)).toBe(true);

    state.resources.fragments = TALENT_RESET_COST + 200;
    expect(resetTalents(talents, state)).toBe(true);
    expect(state.resources.fragments).toBe(200);
    expect(talents.some((t) => t.unlocked)).toBe(false);
  });

  it("aggregates bonuses from all unlocked talents", () => {
    const customTalents = [
      {
        id: "damage_talent",
        unlocked: true,
        effect: {
          damageMult: 1.2,
          fireDelayMult: 0.95,
          economy: 1.1,
          collectRadius: 1.05,
          projectiles: 1,
          regen: 0.5,
          damageReduction: 0.08,
          critChance: 0.04,
          critMultiplier: 1.2,
          bulletSpeed: 1.1,
        },
      },
      {
        id: "stacking_talent",
        unlocked: true,
        effect: {
          damageMult: 1.1,
          economy: 1.05,
          projectiles: 2,
          critChance: 0.06,
          critMultiplier: 1.1,
        },
      },
      { id: "empty_effect", unlocked: true },
      { id: "locked", unlocked: false, effect: { damageMult: 10 } },
    ];

    const bonuses = computeTalentBonuses(customTalents);

    expect(bonuses.damage).toBeCloseTo(1.32); // 1 * 1.2 * 1.1
    expect(bonuses.fireDelay).toBeCloseTo(0.95);
    expect(bonuses.economy).toBeCloseTo(1.155);
    expect(bonuses.collectRadius).toBeCloseTo(1.05);
    expect(bonuses.projectiles).toBe(3);
    expect(bonuses.regen).toBeCloseTo(0.5);
    expect(bonuses.damageReduction).toBeCloseTo(0.08);
    expect(bonuses.critChance).toBeCloseTo(0.1);
    expect(bonuses.critMultiplier).toBeCloseTo(1.32);
    expect(bonuses.bulletSpeed).toBeCloseTo(1.1);
  });
});
