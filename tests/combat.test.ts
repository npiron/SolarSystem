import { describe, it, expect, beforeEach } from "vitest";
import { updateCombat } from "../src/systems/combat.ts";
import { createInitialState } from "../src/systems/gameState.ts";
import type { GameState, Canvas } from "../src/types/index.ts";
import { spawnEnemy } from "../src/systems/spawn.ts";

describe("combat", () => {
    let state: GameState;
    let canvas: Canvas;

    beforeEach(() => {
        state = createInitialState(800, 600);
        canvas = { width: 800, height: 600 };
        // Set player to center
        state.player.x = 400;
        state.player.y = 300;
    });

    describe("weapon firing", () => {
        beforeEach(() => {
            state.player.orbitTimer = 100; // Prevent orbit fire
        });

        it("should fire bullets when fireTimer expires", () => {
            state.player.fireTimer = 0;
            expect(state.bullets.length).toBe(0);

            updateCombat(state, 0.1, canvas);

            expect(state.bullets.length).toBeGreaterThan(0);
        });

        it("should fire multiple projectiles based on player.projectiles", () => {
            state.player.projectiles = 3;
            state.player.fireTimer = 0;
            state.player.orbitTimer = 100; // Explicitly set to prevent orbit fire

            updateCombat(state, 0.1, canvas);

            expect(state.bullets.length).toBe(3);
        });

        it("should fire toward nearest enemy", () => {
            // Spawn enemy to the right
            spawnEnemy(state, canvas, 0, 0, 1, 3); // Force spawn on right side
            state.player.fireTimer = 0;
            state.player.orbitTimer = 100;

            updateCombat(state, 0.1, canvas);

            // Bullets should have positive dx (moving right)
            const bullet = state.bullets[0];
            expect(bullet.dx).toBeGreaterThan(0);
        });

        it("should fire in rotation when no enemies exist", () => {
            state.player.fireTimer = 0;
            state.player.orbitTimer = 100;
            state.time = 1.0;

            updateCombat(state, 0.1, canvas);

            expect(state.bullets.length).toBeGreaterThan(0);
            // Bullet should exist with some direction based on time
            const bullet = state.bullets[0];
            expect(Math.abs(bullet.dx) + Math.abs(bullet.dy)).toBeGreaterThan(0);
        });

        it("should not fire if fireTimer has not expired", () => {
            state.player.fireTimer = 1.0; // Still waiting
            state.player.orbitTimer = 100;

            updateCombat(state, 0.1, canvas);

            expect(state.bullets.length).toBe(0);
        });
    });

    describe("orbital weapon", () => {
        it("should fire orbital projectiles when orbitTimer expires", () => {
            // circularBlast weapon has 8 base projectiles
            // player starts with orbitProjectiles = 4 (base value)
            // Set to 5 to test that bonus projectiles are added
            state.player.orbitProjectiles = 5;
            state.player.orbitTimer = 0;
            state.player.fireTimer = 100; // Prevent regular fire

            updateCombat(state, 0.1, canvas);

            // Should fire: 8 (weapon base) + 1 (player bonus: 5 - 4) = 9
            expect(state.bullets.length).toBe(9);
        });

        it("should distribute orbital projectiles evenly around player", () => {
            // circularBlast weapon has 8 base projectiles
            state.player.orbitProjectiles = 4; // No bonus (base value)
            state.player.orbitTimer = 0;
            state.player.fireTimer = 100; // Prevent regular fire

            updateCombat(state, 0.1, canvas);

            // Should fire 8 projectiles (weapon base)
            expect(state.bullets.length).toBe(8);

            // Check that angles are distributed
            const angles = state.bullets.map(b => Math.atan2(b.dy, b.dx));
            // Angles should not all be the same
            const uniqueAngles = new Set(angles.map(a => a.toFixed(2)));
            expect(uniqueAngles.size).toBeGreaterThan(1);
        });

        it("should update orbital orbs visual positions", () => {
            state.player.orbitProjectiles = 3;
            state.player.fireTimer = 100;

            updateCombat(state, 0.1, canvas);

            expect(state.orbitalOrbs.length).toBeGreaterThan(0);
            state.orbitalOrbs.forEach(orb => {
                expect(orb.angle).toBeDefined();
                expect(orb.distance).toBeGreaterThan(0);
            });
        });

        it("should rotate orbital orbs based on spin", () => {
            state.player.orbitProjectiles = 2;
            state.player.fireTimer = 100;
            const initialSpin = state.player.spin;

            updateCombat(state, 1.0, canvas);

            expect(state.player.spin).not.toBe(initialSpin);
        });
    });

    describe("bullet physics", () => {
        beforeEach(() => {
            state.player.fireTimer = 100; // Prevent auto-fire
            state.player.orbitTimer = 100; // Prevent orbit fire
        });

        it("should move bullets based on velocity and dt", () => {
            state.bullets.push({
                x: 400,
                y: 300,
                dx: 100, // Moving right at 100 units/s
                dy: 0,
                life: 2.0,
                pierce: 0
            });

            updateCombat(state, 0.1, canvas);

            const bullet = state.bullets[0];
            expect(bullet.x).toBe(410); // 400 + 100 * 0.1
            expect(bullet.y).toBe(300);
        });

        it("should decrease bullet lifetime", () => {
            state.bullets.push({
                x: 400,
                y: 300,
                dx: 100,
                dy: 0,
                life: 2.0,
                pierce: 0
            });

            updateCombat(state, 0.5, canvas);

            expect(state.bullets[0].life).toBe(1.5);
        });

        it("should remove bullets when life expires", () => {
            state.bullets.push({
                x: 400,
                y: 300,
                dx: 100,
                dy: 0,
                life: 0.1,
                pierce: 0
            });
            state.player.orbitTimer = 100; // Explicitly set

            updateCombat(state, 0.2, canvas);

            expect(state.bullets.length).toBe(0);
        });

        it("should remove bullets that go off-screen", () => {
            state.bullets.push({
                x: -1000, // Way off screen
                y: 300,
                dx: -100,
                dy: 0,
                life: 10.0,
                pierce: 0
            });
            state.player.orbitTimer = 100; // Explicitly set

            updateCombat(state, 0.1, canvas);

            expect(state.bullets.length).toBe(0);
        });
    });

    describe("bullet-enemy collision", () => {
        beforeEach(() => {
            state.player.fireTimer = 100; // Prevent auto-fire
            state.player.orbitTimer = 100; // Prevent orbit fire
        });

        it("should detect collision between bullet and enemy", () => {
            // Spawn enemy at same position as player
            spawnEnemy(state, canvas, 0);
            state.enemies[0].x = 400;
            state.enemies[0].y = 300;
            const initialHp = state.enemies[0].hp;

            // Fire bullet right at enemy
            state.bullets.push({
                x: 400,
                y: 300,
                dx: 10,
                dy: 0,
                life: 1.0,
                pierce: 0
            });

            updateCombat(state, 0.1, canvas);

            // Enemy should take damage
            expect(state.enemies[0].hp).toBeLessThan(initialHp);
        });

        it("should apply player damage to enemies", () => {
            state.player.damage = 50;
            spawnEnemy(state, canvas, 0);
            state.enemies[0].x = 400;
            state.enemies[0].y = 300;
            state.enemies[0].hp = 100;

            state.bullets.push({
                x: 400,
                y: 300,
                dx: 10,
                dy: 0,
                life: 1.0,
                pierce: 0
            });

            updateCombat(state, 0.1, canvas);

            expect(state.enemies[0].hp).toBeLessThanOrEqual(50); // Could be less if crit
        });

        it("should remove bullet after hitting enemy without pierce", () => {
            spawnEnemy(state, canvas, 0);
            state.enemies[0].x = 400;
            state.enemies[0].y = 300;

            state.bullets.push({
                x: 400,
                y: 300,
                dx: 10,
                dy: 0,
                life: 1.0,
                pierce: 0
            });
            state.player.orbitTimer = 100; // Explicitly set

            updateCombat(state, 0.1, canvas);

            expect(state.bullets.length).toBe(0);
        });

        it("should pierce through enemies when pierce > 0", () => {
            // Create two enemies in a line
            spawnEnemy(state, canvas, 0);
            spawnEnemy(state, canvas, 0);
            state.enemies[0].x = 400;
            state.enemies[0].y = 300;
            state.enemies[1].x = 410;
            state.enemies[1].y = 300;

            state.bullets.push({
                x: 390,
                y: 300,
                dx: 100,
                dy: 0,
                life: 1.0,
                pierce: 1 // Can hit 2 enemies total
            });

            updateCombat(state, 0.1, canvas);

            // Both enemies should be hit
            expect(state.enemies[0].hitThisFrame).toBe(true);
        });

        it("should remove enemy when HP drops to 0", () => {
            spawnEnemy(state, canvas, 0);
            state.enemies[0].x = 400;
            state.enemies[0].y = 300;
            state.enemies[0].hp = 1; // Very low HP
            state.player.damage = 100; // High damage

            state.bullets.push({
                x: 400,
                y: 300,
                dx: 10,
                dy: 0,
                life: 1.0,
                pierce: 0
            });

            updateCombat(state, 0.1, canvas);

            expect(state.enemies.length).toBe(0);
        });

        it("should grant essence reward when enemy is killed", () => {
            const initialEssence = state.resources.essence;
            spawnEnemy(state, canvas, 0);
            const enemyReward = state.enemies[0].reward;
            state.enemies[0].x = 400;
            state.enemies[0].y = 300;
        });

        it("should attract fragments within collection radius", () => {
            state.player.collectRadius = 100;
            state.fragmentsOrbs.push({
                x: 450, // 50 units away
                y: 300,
                value: 10,
                vx: 0,
                vy: 0,
                life: 10
            });

            updateCombat(state, 0.1, canvas);

            const fragment = state.fragmentsOrbs[0];
            // Fragment should have gained velocity toward player
            expect(fragment.vx).toBeLessThan(0); // Moving left toward player
        });

        it("should collect fragments when player is close enough", () => {
            state.fragmentsOrbs.push({
                x: state.player.x,
                y: state.player.y,
                value: 10,
                vx: 0,
                vy: 0,
                life: 10
            });

            updateCombat(state, 0.1, canvas);

            expect(state.fragmentsOrbs.length).toBe(0);
        });

        it("should update fragment positions based on velocity", () => {
            // Place fragment far enough to not be collected
            state.fragmentsOrbs.push({
                x: 600,
                y: 300,
                value: 10,
                vx: 50, // Moving right
                vy: 0,
                life: 10
            });

            updateCombat(state, 0.1, canvas);

            // With drag and gravity, position won't be exactly 605 but close
            expect(state.fragmentsOrbs[0].x).toBeGreaterThan(600);
            expect(state.fragmentsOrbs[0].x).toBeLessThan(606);
        });

        it("should remove fragments when lifetime expires", () => {
            state.fragmentsOrbs.push({
                x: 600,
                y: 300,
                value: 10,
                vx: 0,
                vy: 0,
                life: 0.05
            });

            updateCombat(state, 0.1, canvas);

            expect(state.fragmentsOrbs.length).toBe(0);
        });
    });

    describe("player regeneration", () => {
        it("should regenerate HP over time", () => {
            state.player.hp = 50;
            state.player.maxHp = 100;
            state.player.regen = 10; // 10 HP per second

            updateCombat(state, 1.0, canvas);

            expect(state.player.hp).toBe(60);
        });

        it("should not exceed maxHp when regenerating", () => {
            state.player.hp = 95;
            state.player.maxHp = 100;
            state.player.regen = 10;

            updateCombat(state, 1.0, canvas);

            expect(state.player.hp).toBe(100);
        });
    });

    describe("boss combat", () => {
        beforeEach(() => {
            state.player.fireTimer = 100;
            state.currentBoss = {
                x: 500,
                y: 300,
                radius: 48,
                hp: 1000,
                maxHp: 1000,
                speed: 30,
                fireTimer: 0,
                fireDelay: 1.2,
                reward: 100
            };
            state.bossActive = true;
        });

        it("should move boss toward player", () => {
            const initialX = state.currentBoss!.x;

            updateCombat(state, 0.1, canvas);

            expect(state.currentBoss!.x).toBeLessThan(initialX);
        });

        it("should fire projectiles from boss", () => {
            state.currentBoss!.fireTimer = 0;

            updateCombat(state, 0.1, canvas);

            expect(state.enemyProjectiles.length).toBeGreaterThan(0);
        });

        it("should damage boss with player bullets", () => {
            const initialHp = state.currentBoss!.hp;
            state.bullets.push({
                x: state.currentBoss!.x,
                y: state.currentBoss!.y,
                dx: 10,
                dy: 0,
                life: 1.0,
                pierce: 0
            });

            updateCombat(state, 0.1, canvas);

            expect(state.currentBoss!.hp).toBeLessThan(initialHp);
        });

        it("should damage player on boss contact", () => {
            const initialHp = state.player.hp;
            // Position boss overlapping player - with boss radius of 48 and player 24
            // they need to be within 72 units to collide
            state.currentBoss!.x = state.player.x + 50; // Within collision distance
            state.currentBoss!.y = state.player.y;
            // Initialize boss velocity to move toward player
            state.currentBoss!.vx = 0;
            state.currentBoss!.vy = 0;

            updateCombat(state, 1.0, canvas);

            expect(state.player.hp).toBeLessThan(initialHp);
        });

        it("should remove boss when HP reaches 0", () => {
            state.currentBoss!.hp = 1;
            state.player.damage = 1000;
            state.bullets.push({
                x: state.currentBoss!.x,
                y: state.currentBoss!.y,
                dx: 10,
                dy: 0,
                life: 1.0,
                pierce: 0
            });

            updateCombat(state, 0.1, canvas);

            expect(state.currentBoss).toBeNull();
            expect(state.bossActive).toBe(false);
        });

        it("should grant reward when boss is defeated", () => {
            const initialEssence = state.resources.essence;
            const reward = state.currentBoss!.reward;
            state.currentBoss!.hp = 1;
            state.player.damage = 1000;
            state.bullets.push({
                x: state.currentBoss!.x,
                y: state.currentBoss!.y,
                dx: 10,
                dy: 0,
                life: 1.0,
                pierce: 0
            });

            updateCombat(state, 0.1, canvas);

            expect(state.resources.essence).toBe(initialEssence + reward);
        });

        it("should clear enemy projectiles when boss is defeated", () => {
            state.enemyProjectiles.push({
                x: 400,
                y: 300,
                dx: 50,
                dy: 0,
                life: 5.0,
                damage: 10
            });

            state.currentBoss!.hp = 1;
            state.player.damage = 1000;
            state.bullets.push({
                x: state.currentBoss!.x,
                y: state.currentBoss!.y,
                dx: 10,
                dy: 0,
                life: 1.0,
                pierce: 0
            });

            updateCombat(state, 0.1, canvas);

            expect(state.enemyProjectiles.length).toBe(0);
        });
    });

    describe("enemy projectiles", () => {
        beforeEach(() => {
            state.player.fireTimer = 100;
        });

        it("should move enemy projectiles", () => {
            state.enemyProjectiles.push({
                x: 600, // Far from player
                y: 300,
                dx: 100,
                dy: 0,
                life: 2.0,
                damage: 10
            });

            updateCombat(state, 0.1, canvas);

            expect(state.enemyProjectiles[0].x).toBe(610);
        });

        it("should damage player on projectile hit", () => {
            const initialHp = state.player.hp;
            state.enemyProjectiles.push({
                x: state.player.x,
                y: state.player.y,
                dx: 50,
                dy: 0,
                life: 2.0,
                damage: 20
            });

            updateCombat(state, 0.1, canvas);

            expect(state.player.hp).toBeLessThan(initialHp);
        });

        it("should remove projectile after hitting player", () => {
            state.enemyProjectiles.push({
                x: state.player.x,
                y: state.player.y,
                dx: 50,
                dy: 0,
                life: 2.0,
                damage: 20
            });

            updateCombat(state, 0.1, canvas);

            expect(state.enemyProjectiles.length).toBe(0);
        });

        it("should apply damage reduction to projectile damage", () => {
            state.enemyProjectiles.push({
                x: state.player.x,
                y: state.player.y,
                dx: 50,
                dy: 0,
                life: 2.0,
                damage: 100
            });

            state.player.hp = 1000;
            state.player.damageReduction = 0;
            updateCombat(state, 0.1, canvas);
            const damageWithoutReduction = 1000 - state.player.hp;

            const state2 = createInitialState(800, 600);
            state2.player.x = 400;
            state2.player.y = 300;
            state2.player.fireTimer = 100;
            state2.enemyProjectiles.push({
                x: state2.player.x,
                y: state2.player.y,
                dx: 50,
                dy: 0,
                life: 2.0,
                damage: 100
            });
            state2.player.hp = 1000;
            state2.player.damageReduction = 0.5;
            updateCombat(state2, 0.1, canvas);
            const damageWithReduction = 1000 - state2.player.hp;

            expect(damageWithReduction).toBeLessThan(damageWithoutReduction);
        });

        it("should remove projectiles that go off-screen", () => {
            state.enemyProjectiles.push({
                x: -1000,
                y: 300,
                dx: -100,
                dy: 0,
                life: 10.0,
                damage: 10
            });

            updateCombat(state, 0.1, canvas);

            expect(state.enemyProjectiles.length).toBe(0);
        });

        it("should decrease projectile lifetime", () => {
            state.enemyProjectiles.push({
                x: 600,
                y: 300,
                dx: 50,
                dy: 0,
                life: 2.0,
                damage: 10
            });

            updateCombat(state, 0.5, canvas);

            expect(state.enemyProjectiles[0].life).toBe(1.5);
        });
    });
});
