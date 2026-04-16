import { describe, it, expect, beforeEach } from "vitest";
import { updateCombat } from "../src/systems/combat/index.ts";
import { createInitialState } from "../src/systems/gameState.ts";
import { getGlobalMultipliers } from "../src/systems/combat/weapons.ts";
import { getWeaponDef, getWeaponStats } from "../src/config/weapons.ts";
import { getPlayerStatsFromTuning } from "../src/config/player.ts";
import { computeTalentBonuses } from "../src/systems/talents.ts";
import { createTalentTree } from "../src/config/talents.ts";
import { applyProgressionEffects } from "../src/systems/progression.ts";
import type { GameState, Canvas, Bullet } from "../src/types/index.ts";

describe("weapon level → bullet damage integration", () => {
    let state: GameState;
    let canvas: Canvas;

    beforeEach(() => {
        state = createInitialState(800, 600);
        canvas = { width: 800, height: 600 };
        state.player.x = 400;
        state.player.y = 300;
        state.player.fireTimer = 0;
        state.player.orbitTimer = 100; // Prevent orbit fire
    });

    it("should scale bullet damage with weapon level", () => {
        // Level 1 main gun: base damage 12
        const def = getWeaponDef('mainGun');
        const stats1 = getWeaponStats(def, 1);
        const baseDamage = stats1.damage;

        // Level 5 main gun: damage should be 12 * 1.15^4 ≈ 20.99
        const stats5 = getWeaponStats(def, 5);
        const level5Damage = stats5.damage;

        expect(level5Damage).toBeGreaterThan(baseDamage);

        // Verify the scaling formula
        const expectedLevel5 = 12 * Math.pow(1.15, 4);
        expect(level5Damage).toBeCloseTo(expectedLevel5, 1);
    });

    it("should use bullet.damage for enemy collision, not state.player.damage", () => {
        // Set up a weapon at level 5 so bullet damage differs from player base damage
        const mainGun = state.weapons.find(w => w.id === 'mainGun');
        if (mainGun) {
            mainGun.level = 5;
        }

        // Apply progression so player stats are updated
        const upgrades: any[] = [];
        const talents = createTalentTree();
        applyProgressionEffects(state, upgrades, talents);

        // Fire a bullet
        updateCombat(state, 0.1, canvas);

        if (state.bullets.length > 0) {
            const bullet = state.bullets[0];
            // Bullet should have a damage field that differs from base player damage
            // The bullet damage includes weapon level scaling + global multipliers
            expect(bullet.damage).toBeDefined();
            expect(bullet.damage).toBeGreaterThan(0);

            // Verify bullet damage is weapon-scaled, not just base player damage
            const def = getWeaponDef('mainGun');
            const stats = getWeaponStats(def, 5);
            const { damageMult } = getGlobalMultipliers(state);
            const expectedBulletDamage = stats.damage * damageMult;
            expect(bullet.damage).toBeCloseTo(expectedBulletDamage, 1);
        }
    });

    it("should apply bullet.damage to enemies on collision", () => {
        // Prevent auto-fire so only our manual bullet hits
        state.player.fireTimer = 100;
        state.player.orbitTimer = 100;

        // Place enemy away from player to avoid contact damage
        state.enemies.push({
            x: 450, y: 300, vx: 0, vy: 0,
            radius: 20, hp: 1000, maxHp: 1000,
            speed: 50, reward: 10, fireTimer: 0, fireDelay: 1,
            elite: false, type: 'normal', variant: 'chaser'
        });

        // Create a bullet with known damage at the enemy position
        const bulletDamage = 42;
        state.bullets.push({
            x: 450, y: 300, dx: 10, dy: 0,
            life: 1.0, pierce: 0, damage: bulletDamage
        });

        const initialHp = state.enemies[0].hp;
        updateCombat(state, 0.1, canvas);

        // Enemy should take exactly bulletDamage (or crit variant)
        // Since crit is random, we check that damage is at least bulletDamage
        const damageDealt = initialHp - state.enemies[0].hp;
        expect(damageDealt).toBeGreaterThanOrEqual(bulletDamage);

        // Damage should not exceed bulletDamage * critMultiplier (max possible)
        const maxCritMultiplier = state.player.critMultiplier;
        expect(damageDealt).toBeLessThanOrEqual(bulletDamage * maxCritMultiplier + 1); // +1 for float
    });

    it("should apply bullet.damage to boss on collision", () => {
        // Prevent auto-fire so only our manual bullet hits
        state.player.fireTimer = 100;
        state.player.orbitTimer = 100;

        // Place boss away from player to avoid contact damage
        state.currentBoss = {
            x: 500, y: 300, vx: 0, vy: 0,
            radius: 48, hp: 5000, maxHp: 5000,
            speed: 30, reward: 100, fireTimer: 10, fireDelay: 1.2
        };
        state.bossActive = true;

        const bulletDamage = 55;
        state.bullets.push({
            x: 500, y: 300, dx: 10, dy: 0,
            life: 1.0, pierce: 0, damage: bulletDamage
        });

        const initialHp = state.currentBoss.hp;
        updateCombat(state, 0.1, canvas);

        const damageDealt = initialHp - state.currentBoss!.hp;
        expect(damageDealt).toBeGreaterThanOrEqual(bulletDamage);
        expect(damageDealt).toBeLessThanOrEqual(bulletDamage * state.player.critMultiplier + 1);
    });

    it("should apply crit multiplier to bullet.damage, not player base damage", () => {
        // Set 100% crit chance and 2x multiplier
        state.player.critChance = 1.0;
        state.player.critMultiplier = 2.0;
        state.player.fireTimer = 100; // Prevent auto-fire
        state.player.orbitTimer = 100;

        // Place enemy away from player to avoid contact damage
        // Player at (400, 300), enemy at (450, 300) — distance 50 > contact radius
        state.enemies.push({
            x: 450, y: 300, vx: 0, vy: 0,
            radius: 20, hp: 10000, maxHp: 10000,
            speed: 50, reward: 10, fireTimer: 0, fireDelay: 1,
            elite: false, type: 'normal', variant: 'chaser'
        });

        const bulletDamage = 30;
        state.bullets.push({
            x: 450, y: 300, dx: 10, dy: 0,
            life: 1.0, pierce: 0, damage: bulletDamage
        });

        const initialHp = state.enemies[0].hp;
        updateCombat(state, 0.1, canvas);

        // With 100% crit chance and 2x multiplier, damage should be bulletDamage * 2
        const damageDealt = initialHp - state.enemies[0].hp;
        expect(damageDealt).toBeCloseTo(bulletDamage * 2.0, 0);
    });

    it("should produce higher damage bullets at higher weapon levels", () => {
        // Fire at level 1
        const mainGun = state.weapons.find(w => w.id === 'mainGun')!;
        mainGun.level = 1;
        mainGun.unlocked = true;
        applyProgressionEffects(state, [], createTalentTree());

        state.player.fireTimer = 0;
        updateCombat(state, 0.1, canvas);

        const level1Bullets = state.bullets.map(b => b.damage);
        expect(level1Bullets.length).toBeGreaterThan(0);

        // Reset for level 5 test
        state.bullets = [];
        mainGun.level = 5;
        applyProgressionEffects(state, [], createTalentTree());
        state.player.fireTimer = 0;
        state.player.orbitTimer = 100;
        updateCombat(state, 0.1, canvas);

        const level5Bullets = state.bullets.map(b => b.damage);
        expect(level5Bullets.length).toBeGreaterThan(0);

        // Level 5 bullets should have higher damage than level 1
        const avgLevel1 = level1Bullets.reduce((a: number, b: number | undefined) => a + (b ?? 0), 0) / level1Bullets.length;
        const avgLevel5 = level5Bullets.reduce((a: number, b: number | undefined) => a + (b ?? 0), 0) / level5Bullets.length;
        expect(avgLevel5).toBeGreaterThan(avgLevel1);
    });
});

describe("talent → combat damage pipeline", () => {
    let state: GameState;
    let canvas: Canvas;

    beforeEach(() => {
        state = createInitialState(800, 600);
        canvas = { width: 800, height: 600 };
        state.player.x = 400;
        state.player.y = 300;
    });

    it("should propagate talent damage bonus through getGlobalMultipliers", () => {
        // Base multipliers (no talents)
        const baseMultipliers = getGlobalMultipliers(state);
        expect(baseMultipliers.damageMult).toBe(1); // No upgrades, no talents

        // Unlock focus_fulgurant (+12% damage)
        const talents = createTalentTree();
        const focusTalent = talents.find(t => t.id === 'focus_fulgurant')!;
        focusTalent.unlocked = true;

        // Apply progression effects
        applyProgressionEffects(state, [], talents);

        // Now player.damage should be 12% higher than base
        const multipliers = getGlobalMultipliers(state);
        expect(multipliers.damageMult).toBeCloseTo(1.12, 2);
    });

    it("should include talent bonus in bullet damage", () => {
        // Set up with focus_fulgurant (+12% damage)
        const talents = createTalentTree();
        const focusTalent = talents.find(t => t.id === 'focus_fulgurant')!;
        focusTalent.unlocked = true;
        applyProgressionEffects(state, [], talents);

        state.player.fireTimer = 0;
        state.player.orbitTimer = 100;
        updateCombat(state, 0.1, canvas);

        if (state.bullets.length > 0) {
            const bullet = state.bullets[0];
            // Bullet damage should include the 12% talent bonus
            const def = getWeaponDef('mainGun');
            const stats = getWeaponStats(def, state.weapons.find(w => w.id === 'mainGun')?.level ?? 1);
            const { damageMult } = getGlobalMultipliers(state);
            const expectedDamage = stats.damage * damageMult;

            expect(bullet.damage).toBeCloseTo(expectedDamage, 1);
            // Verify the talent effect is included
            expect(damageMult).toBeCloseTo(1.12, 2);
        }
    });

    it("should stack multiple talent bonuses correctly", () => {
        // Unlock focus_fulgurant (+12% damage) and catapulte_d_energie (+24% damage, +1 projectile, +6% crit)
        const talents = createTalentTree();
        const focusTalent = talents.find(t => t.id === 'focus_fulgurant')!;
        focusTalent.unlocked = true;
        const catapultTalent = talents.find(t => t.id === 'catapulte_d_energie')!;
        catapultTalent.unlocked = true;

        applyProgressionEffects(state, [], talents);

        // Damage should be multiplicative: 1.12 * 1.24 = 1.3888
        const multipliers = getGlobalMultipliers(state);
        expect(multipliers.damageMult).toBeCloseTo(1.12 * 1.24, 2);

        // Should also have extra projectile
        expect(multipliers.extraProjectiles).toBeGreaterThanOrEqual(1);
    });

    it("should apply talent crit bonus to bullet collision damage", () => {
        // Unlock cascade_critique (+3% crit chance, +10% crit multiplier)
        const talents = createTalentTree();
        const focusTalent = talents.find(t => t.id === 'focus_fulgurant')!;
        focusTalent.unlocked = true;
        const cascadeTalent = talents.find(t => t.id === 'cascade_critique')!;
        cascadeTalent.unlocked = true;

        applyProgressionEffects(state, [], talents);

        // Verify crit stats are updated
        expect(state.player.critChance).toBeGreaterThan(0);
        expect(state.player.critMultiplier).toBeGreaterThan(1);

        // Create enemy and bullet with known damage
        state.enemies.push({
            x: 400, y: 300, vx: 0, vy: 0,
            radius: 20, hp: 100000, maxHp: 100000,
            speed: 50, reward: 10, fireTimer: 0, fireDelay: 1,
            elite: false, type: 'normal', variant: 'chaser'
        });

        const bulletDamage = 50;
        state.bullets.push({
            x: 400, y: 300, dx: 10, dy: 0,
            life: 1.0, pierce: 0, damage: bulletDamage
        });

        state.player.fireTimer = 100;
        state.player.orbitTimer = 100;

        // Force crit for testing
        const originalCritChance = state.player.critChance;
        state.player.critChance = 1.0;

        const initialHp = state.enemies[0].hp;
        updateCombat(state, 0.1, canvas);

        const damageDealt = initialHp - state.enemies[0].hp;
        // With forced crit, damage should be bulletDamage * critMultiplier
        // critMultiplier should include the +10% from cascade_critique
        expect(damageDealt).toBeCloseTo(bulletDamage * state.player.critMultiplier, 0);

        state.player.critChance = originalCritChance;
    });
});

describe("getGlobalMultipliers with getPlayerStatsFromTuning", () => {
    it("should use fresh tuning values, not stale cached ones", () => {
        const state = createInitialState(800, 600);
        const multipliers = getGlobalMultipliers(state);

        // With no upgrades or talents, all multipliers should be 1.0
        expect(multipliers.damageMult).toBe(1);
        expect(multipliers.rangeMult).toBe(1);
        expect(multipliers.cooldownMult).toBe(1);
        expect(multipliers.extraProjectiles).toBe(0);
    });

    it("should reflect player stat changes in multipliers", () => {
        const state = createInitialState(800, 600);
        const baseDamage = state.player.damage;

        // Double the player's damage
        state.player.damage = baseDamage * 2;

        const multipliers = getGlobalMultipliers(state);
        expect(multipliers.damageMult).toBe(2);
    });
});
