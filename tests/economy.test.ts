import { describe, it, expect } from "vitest";
import { computeIdleRate, computePassiveGains, computeOfflineGains } from "../src/systems/economy.ts";
import type { Generator, TalentBonuses } from "../src/types/index.ts";

describe("economy", () => {
    describe("computeIdleRate", () => {
        it("should return 0 with no generators", () => {
            const generators: Generator[] = [];
            const idleMultiplier = 1.0;
            const talentBonuses: TalentBonuses = {
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

            const result = computeIdleRate(generators, idleMultiplier, talentBonuses);

            expect(result).toBe(0);
        });

        it("should compute rate from a single generator", () => {
            const generators: Generator[] = [
                {
                    id: "gen1",
                    name: "Generator 1",
                    baseRate: 10,
                    level: 1,
                    cost: 100,
                    rate: 0
                }
            ];
            const idleMultiplier = 1.0;
            const talentBonuses: TalentBonuses = {
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

            const result = computeIdleRate(generators, idleMultiplier, talentBonuses);

            expect(result).toBeGreaterThan(0);
        });

        it("should scale with generator levels", () => {
            const generatorsLevel1: Generator[] = [
                {
                    id: "gen1",
                    name: "Generator 1",
                    baseRate: 10,
                    level: 1,
                    cost: 100,
                    rate: 0
                }
            ];

            const generatorsLevel5: Generator[] = [
                {
                    id: "gen1",
                    name: "Generator 1",
                    baseRate: 10,
                    level: 5,
                    cost: 100,
                    rate: 0
                }
            ];

            const idleMultiplier = 1.0;
            const talentBonuses: TalentBonuses = {
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

            const rate1 = computeIdleRate(generatorsLevel1, idleMultiplier, talentBonuses);
            const rate5 = computeIdleRate(generatorsLevel5, idleMultiplier, talentBonuses);

            expect(rate5).toBeGreaterThan(rate1);
        });

        it("should apply idle multiplier", () => {
            const generators: Generator[] = [
                {
                    id: "gen1",
                    name: "Generator 1",
                    baseRate: 10,
                    level: 1,
                    cost: 100,
                    rate: 0
                }
            ];

            const talentBonuses: TalentBonuses = {
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

            const rateWith1x = computeIdleRate(generators, 1.0, talentBonuses);
            const rateWith2x = computeIdleRate(generators, 2.0, talentBonuses);

            expect(rateWith2x).toBeGreaterThan(rateWith1x);
            expect(rateWith2x).toBeCloseTo(rateWith1x * 2, 1);
        });

        it("should apply economy talent bonuses", () => {
            const generators: Generator[] = [
                {
                    id: "gen1",
                    name: "Generator 1",
                    baseRate: 10,
                    level: 1,
                    cost: 100,
                    rate: 0
                }
            ];

            const idleMultiplier = 1.0;

            const talentBonusesNone: TalentBonuses = {
                damage: 1,
                fireDelay: 1,
                economy: 1, // 100% (normal)
                collectRadius: 1,
                projectiles: 0,
                regen: 0,
                damageReduction: 0,
                critChance: 0,
                critMultiplier: 1,
                bulletSpeed: 1
            };

            const talentBonusesWith: TalentBonuses = {
                damage: 1,
                fireDelay: 1,
                economy: 1.5, // 150% (bonus)
                collectRadius: 1,
                projectiles: 0,
                regen: 0,
                damageReduction: 0,
                critChance: 0,
                critMultiplier: 1,
                bulletSpeed: 1
            };

            const rateWithout = computeIdleRate(generators, idleMultiplier, talentBonusesNone);
            const rateWith = computeIdleRate(generators, idleMultiplier, talentBonusesWith);

            expect(rateWith).toBeGreaterThan(rateWithout);
        });

        it("should sum rates from multiple generators", () => {
            const generators: Generator[] = [
                {
                    id: "gen1",
                    name: "Generator 1",
                    baseRate: 10,
                    level: 2,
                    cost: 100,
                    rate: 0
                },
                {
                    id: "gen2",
                    name: "Generator 2",
                    baseRate: 20,
                    level: 1,
                    cost: 200,
                    rate: 0
                }
            ];

            const idleMultiplier = 1.0;
            const talentBonuses: TalentBonuses = {
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

            const result = computeIdleRate(generators, idleMultiplier, talentBonuses);

            expect(result).toBeGreaterThan(0);
        });
    });

    describe("computePassiveGains", () => {
        it("should compute passive essence based on idle rate and dt", () => {
            const idleRate = 100; // 100 essence per second
            const dt = 1.0; // 1 second

            const result = computePassiveGains(idleRate, dt);

            expect(result.essence).toBe(100);
        });

        it("should apply 0.35x multiplier for fragments", () => {
            const idleRate = 100;
            const dt = 1.0;

            const result = computePassiveGains(idleRate, dt);

            expect(result.fragments).toBe(35); // 100 * 0.35
        });

        it("should scale with dt", () => {
            const idleRate = 100;

            const result1s = computePassiveGains(idleRate, 1.0);
            const result2s = computePassiveGains(idleRate, 2.0);

            expect(result2s.essence).toBe(result1s.essence * 2);
            expect(result2s.fragments).toBe(result1s.fragments * 2);
        });

        it("should work with fractional dt", () => {
            const idleRate = 100;
            const dt = 0.1; // 100ms

            const result = computePassiveGains(idleRate, dt);

            expect(result.essence).toBe(10);
            expect(result.fragments).toBe(3.5);
        });

        it("should return zero gains when idle rate is zero", () => {
            const idleRate = 0;
            const dt = 1.0;

            const result = computePassiveGains(idleRate, dt);

            expect(result.essence).toBe(0);
            expect(result.fragments).toBe(0);
        });
    });

    describe("computeOfflineGains", () => {
        it("should compute offline essence based on idle rate and seconds", () => {
            const idleRate = 100; // 100 essence per second
            const seconds = 60; // 1 minute

            const result = computeOfflineGains(idleRate, seconds);

            expect(result.essence).toBe(6000);
        });

        it("should apply 0.4x multiplier for fragments (more generous than passive)", () => {
            const idleRate = 100;
            const seconds = 60;

            const result = computeOfflineGains(idleRate, seconds);

            expect(result.fragments).toBe(2400); // 6000 * 0.4
        });

        it("should work with hour-long offline periods", () => {
            const idleRate = 100;
            const seconds = 3600; // 1 hour

            const result = computeOfflineGains(idleRate, seconds);

            expect(result.essence).toBe(360000);
            expect(result.fragments).toBe(144000);
        });

        it("should work with very short offline periods", () => {
            const idleRate = 100;
            const seconds = 1;

            const result = computeOfflineGains(idleRate, seconds);

            expect(result.essence).toBe(100);
            expect(result.fragments).toBe(40);
        });

        it("should return zero gains when idle rate is zero", () => {
            const idleRate = 0;
            const seconds = 3600;

            const result = computeOfflineGains(idleRate, seconds);

            expect(result.essence).toBe(0);
            expect(result.fragments).toBe(0);
        });

        it("should give more fragments offline than passive for same duration", () => {
            const idleRate = 100;
            const duration = 60;

            const passive = computePassiveGains(idleRate, duration);
            const offline = computeOfflineGains(idleRate, duration);

            expect(offline.fragments).toBeGreaterThan(passive.fragments);
            // Offline should be 0.4x vs 0.35x for passive
            expect(offline.fragments / passive.fragments).toBeCloseTo(0.4 / 0.35, 2);
        });
    });
});
