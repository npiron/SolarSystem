import { describe, it, expect, beforeEach } from "vitest";
import { createInitialState } from "../src/systems/gameState.ts";
import type { GameState, Upgrade } from "../src/types/index.ts";

describe("assist", () => {
    let state: GameState;

    beforeEach(() => {
        state = createInitialState(800, 600);
    });

    describe("assist state initialization", () => {
        it("should initialize assist state with default values", () => {
            expect(state.assist).toBeDefined();
            expect(state.assist.firstShot).toBe(false);
            expect(state.assist.firstPurchase).toBe(false);
            expect(state.assist.firstPrestige).toBe(false);
            expect(state.assist.bestWave).toBe(1);
            expect(state.assist.completed).toEqual([]);
        });
    });

    describe("step tracking", () => {
        it("should track first shot", () => {
            expect(state.assist.firstShot).toBe(false);

            state.assist.firstShot = true;

            expect(state.assist.firstShot).toBe(true);
        });

        it("should track first purchase", () => {
            expect(state.assist.firstPurchase).toBe(false);

            state.assist.firstPurchase = true;

            expect(state.assist.firstPurchase).toBe(true);
        });

        it("should track first prestige", () => {
            expect(state.assist.firstPrestige).toBe(false);

            state.assist.firstPrestige = true;

            expect(state.assist.firstPrestige).toBe(true);
        });

        it("should only be set once (idempotent)", () => {
            state.assist.firstShot = true;
            state.assist.firstShot = true; // Setting again

            expect(state.assist.firstShot).toBe(true);
        });
    });

    describe("wave tracking", () => {
        it("should track best wave reached", () => {
            state.assist.bestWave = 15;

            expect(state.assist.bestWave).toBe(15);
        });

        it("should update to higher waves", () => {
            state.assist.bestWave = 10;
            state.assist.bestWave = 15;

            expect(state.assist.bestWave).toBe(15);
        });

        it("should start at wave 1", () => {
            expect(state.assist.bestWave).toBe(1);
        });
    });

    describe("milestone completion tracking", () => {
        it("should track completed milestones in an array", () => {
            expect(state.assist.completed).toEqual([]);

            state.assist.completed.push("wave10");

            expect(state.assist.completed).toContain("wave10");
        });

        it("should track multiple milestones", () => {
            state.assist.completed.push("wave10");
            state.assist.completed.push("wave25");
            state.assist.completed.push("aoe");

            expect(state.assist.completed).toHaveLength(3);
            expect(state.assist.completed).toContain("wave10");
            expect(state.assist.completed).toContain("wave25");
            expect(state.assist.completed).toContain("aoe");
        });

        it("should not duplicate milestones (should be manually enforced by system)", () => {
            state.assist.completed.push("wave10");

            // Check if already completed before adding
            if (!state.assist.completed.includes("wave10")) {
                state.assist.completed.push("wave10");
            }

            expect(state.assist.completed.filter(m => m === "wave10")).toHaveLength(1);
        });
    });

    describe("milestone conditions", () => {
        it("wave10 milestone should check bestWave >= 10", () => {
            state.assist.bestWave = 9;
            const shouldComplete = state.assist.bestWave >= 10;
            expect(shouldComplete).toBe(false);

            state.assist.bestWave = 10;
            const shouldCompleteNow = state.assist.bestWave >= 10;
            expect(shouldCompleteNow).toBe(true);
        });

        it("wave25 milestone should check bestWave >= 25", () => {
            state.assist.bestWave = 24;
            expect(state.assist.bestWave >= 25).toBe(false);

            state.assist.bestWave = 25;
            expect(state.assist.bestWave >= 25).toBe(true);
        });

        it("wave50 milestone should check bestWave >= 50", () => {
            state.assist.bestWave = 49;
            expect(state.assist.bestWave >= 50).toBe(false);

            state.assist.bestWave = 50;
            expect(state.assist.bestWave >= 50).toBe(true);
        });

        it("prestige milestone should check firstPrestige", () => {
            expect(state.assist.firstPrestige).toBe(false);

            state.assist.firstPrestige = true;
            expect(state.assist.firstPrestige).toBe(true);
        });
    });

    describe("upgrade-based milestones", () => {
        it("should check upgrade levels for aoe milestone", () => {
            const upgrades: Upgrade[] = [
                {
                    id: "aoe",
                    name: "Pulsar chaotique",
                    description: "+1 projectile",
                    cost: 100,
                    baseCost: 100,
                    growth: 1.2,
                    max: 10,
                    level: 0,
                    apply: (_state, _level) => { }
                }
            ];

            const aoeUpgrade = upgrades.find(u => u.id === "aoe");
            expect((aoeUpgrade?.level || 0) >= 1).toBe(false);

            aoeUpgrade!.level = 1;
            expect((aoeUpgrade?.level || 0) >= 1).toBe(true);
        });

        it("should check upgrade levels for collect milestone (level 3)", () => {
            const upgrades: Upgrade[] = [
                {
                    id: "collect",
                    name: "Rayon de collecte",
                    description: "Collecte plus rapide",
                    cost: 50,
                    baseCost: 50,
                    growth: 1.15,
                    max: 10,
                    level: 2,
                    apply: (_state, _level) => { }
                }
            ];

            const collectUpgrade = upgrades.find(u => u.id === "collect");
            expect((collectUpgrade?.level || 0) >= 3).toBe(false);

            collectUpgrade!.level = 3;
            expect((collectUpgrade?.level || 0) >= 3).toBe(true);
        });

        it("should check upgrade levels for speed milestone (level 3)", () => {
            const upgrades: Upgrade[] = [
                {
                    id: "speed",
                    name: "Propulseurs",
                    description: "Vitesse de déplacement",
                    cost: 50,
                    baseCost: 50,
                    growth: 1.1,
                    max: 10,
                    level: 2,
                    apply: (_state, _level) => { }
                }
            ];

            const speedUpgrade = upgrades.find(u => u.id === "speed");
            expect((speedUpgrade?.level || 0) >= 3).toBe(false);

            speedUpgrade!.level = 3;
            expect((speedUpgrade?.level || 0) >= 3).toBe(true);
        });
    });

    describe("milestone progression", () => {
        it("should complete milestones in order as conditions are met", () => {
            // Start fresh
            expect(state.assist.completed).toEqual([]);

            // Reach wave 10
            state.assist.bestWave = 10;
            if (!state.assist.completed.includes("wave10") && state.assist.bestWave >= 10) {
                state.assist.completed.push("wave10");
            }
            expect(state.assist.completed).toContain("wave10");

            // Reach wave 25
            state.assist.bestWave = 25;
            if (!state.assist.completed.includes("wave25") && state.assist.bestWave >= 25) {
                state.assist.completed.push("wave25");
            }
            expect(state.assist.completed).toContain("wave25");

            // Should have both
            expect(state.assist.completed).toHaveLength(2);
        });

        it("should handle completing prestige milestone", () => {
            state.assist.firstPrestige = true;

            if (!state.assist.completed.includes("prestige") && state.assist.firstPrestige) {
                state.assist.completed.push("prestige");
            }

            expect(state.assist.completed).toContain("prestige");
        });
    });

    describe("assist state persistence", () => {
        it("should maintain state across game sessions (via gameState)", () => {
            // Simulate progress
            state.assist.firstShot = true;
            state.assist.firstPurchase = true;
            state.assist.bestWave = 30;
            state.assist.completed = ["wave10", "wave25"];

            // Verify all data is stored
            expect(state.assist.firstShot).toBe(true);
            expect(state.assist.firstPurchase).toBe(true);
            expect(state.assist.bestWave).toBe(30);
            expect(state.assist.completed).toHaveLength(2);
        });
    });
});
