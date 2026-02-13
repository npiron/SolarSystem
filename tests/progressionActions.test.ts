import { describe, expect, it } from "vitest";
import { computeNextUpgradeCost, isUpgradeCapped } from "../src/core/progressionActions.ts";
import type { Upgrade } from "../src/types/index.ts";

describe("progressionActions", () => {
  it("should detect capped upgrades", () => {
    const upgrade = {
      id: "damage",
      name: "Damage",
      description: "",
      baseCost: 10,
      cost: 20,
      growth: 1.4,
      level: 3,
      max: 3,
      apply: () => { }
    } as Upgrade;

    expect(isUpgradeCapped(upgrade)).toBe(true);
  });

  it("should increase upgrade cost with level scaling", () => {
    const baseUpgrade = {
      id: "fireRate",
      name: "Fire rate",
      description: "",
      baseCost: 100,
      cost: 100,
      growth: 1.4,
      level: 0,
      max: Infinity,
      apply: () => { }
    } as Upgrade;
    const highLevelUpgrade = { ...baseUpgrade, level: 40 };

    const firstCost = computeNextUpgradeCost(baseUpgrade);
    const scaledCost = computeNextUpgradeCost(highLevelUpgrade);
    const expectedFirstCost = Math.ceil(100 * Math.pow(1.4, 1));
    const expectedScaledCost = Math.ceil(100 * Math.pow(1.4 * (1 + (40 - 25) * 0.012), 41));

    expect(firstCost).toBe(expectedFirstCost);
    expect(scaledCost).toBe(expectedScaledCost);
  });
});
