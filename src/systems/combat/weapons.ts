/**
 * Combat Weapons - All weapon fire functions
 * Extracted from combat.ts
 */

import type { Bullet, GameState, HomingMissile, Enemy } from "../../types/index.ts";
import { getTuning } from "../../config/tuning.ts";
import { getWeaponDef, getWeaponStats } from "../../config/weapons.ts";
import { BASE_PLAYER_STATS } from "../../config/player.ts";
import { addFloatingText } from "../hud.ts";
import { TAU } from "../../config/constants.ts";
import { isWeaponUnlocked, getWeaponLevel, nearestEnemy, calculateOrbitProjectiles } from "./helpers.ts";

/**
 * Helper to get global multipliers from player state upgrades
 */
export function getGlobalMultipliers(state: GameState) {
    return {
        damageMult: state.player.damage / BASE_PLAYER_STATS.damage,
        rangeMult: state.player.range / BASE_PLAYER_STATS.range,
        cooldownMult: BASE_PLAYER_STATS.fireDelay > 0 ? state.player.fireDelay / BASE_PLAYER_STATS.fireDelay : 1.0,
        extraProjectiles: Math.max(0, state.player.projectiles - BASE_PLAYER_STATS.projectiles)
    };
}

/**
 * Main Gun - Shotgun spread pattern
 */
export function fire(state: GameState): void {
    if (!isWeaponUnlocked(state, 'mainGun')) return;

    const level = getWeaponLevel(state, 'mainGun');
    const def = getWeaponDef('mainGun');
    const stats = getWeaponStats(def, level);

    const target = nearestEnemy(state);
    const { damageMult } = getGlobalMultipliers(state);

    const weaponStatsProjectiles = stats.projectiles ?? 1;
    const playerBonus = Math.max(0, state.player.projectiles - 1);
    const weaponBonus = Math.max(0, weaponStatsProjectiles - 1);
    const count = 1 + playerBonus + weaponBonus;

    const baseAngle = target
        ? Math.atan2(target.y - state.player.y, target.x - state.player.x)
        : state.time * 0.9;

    const { maxSpeed, maxLifetime } = getTuning().bullet;
    const { maxBullets } = getTuning().fx;

    const bulletSpeed = Math.min(state.player.bulletSpeed, maxSpeed);
    const lifetime = Math.min(1.2 * state.player.range, maxLifetime);

    const spreadAngle = Math.PI / 4;

    for (let i = 0; i < count; i++) {
        if (state.bullets.length >= maxBullets) break;
        const offset = count > 1 ? (i / (count - 1) - 0.5) * spreadAngle : 0;
        const angle = baseAngle + offset;
        const bullet: Bullet = {
            x: state.player.x,
            y: state.player.y,
            dx: Math.cos(angle) * bulletSpeed,
            dy: Math.sin(angle) * bulletSpeed,
            life: lifetime,
            pierce: state.player.pierce,
            damage: stats.damage * damageMult
        };
        state.bullets.push(bullet);
    }
}

/**
 * Orbit weapon - Circular blast pattern
 */
export function fireOrbit(state: GameState): void {
    if (!isWeaponUnlocked(state, 'circularBlast')) return;

    const level = getWeaponLevel(state, 'circularBlast');
    const def = getWeaponDef('circularBlast');
    const stats = getWeaponStats(def, level);
    const { damageMult } = getGlobalMultipliers(state);

    const { maxSpeed, maxLifetime } = getTuning().bullet;
    const { maxBullets } = getTuning().fx;
    const orbitConfig = getTuning().orbit;

    const count = calculateOrbitProjectiles(state, orbitConfig);
    const bulletSpeed = Math.min(state.player.bulletSpeed * 0.8, maxSpeed);
    const lifetime = Math.min(1.5 * state.player.range, maxLifetime);

    for (let i = 0; i < count; i++) {
        if (state.bullets.length >= maxBullets) break;
        const angle = (TAU * i) / count + state.player.spin;
        const bullet: Bullet = {
            x: state.player.x,
            y: state.player.y,
            dx: Math.cos(angle) * bulletSpeed,
            dy: Math.sin(angle) * bulletSpeed,
            life: lifetime,
            pierce: state.player.pierce,
            damage: stats.damage * damageMult
        };
        state.bullets.push(bullet);
    }
}

/**
 * Lightning weapon - Chain lightning
 */
export function fireLightning(state: GameState): void {
    if (!isWeaponUnlocked(state, 'lightning')) return;
    if (state.enemies.length === 0) return;

    const level = getWeaponLevel(state, 'lightning');
    const def = getWeaponDef('lightning');
    const stats = getWeaponStats(def, level);
    const { damageMult, rangeMult, extraProjectiles } = getGlobalMultipliers(state);

    const range = (stats.range ?? 200) * rangeMult;
    const chainCount = (stats.chainCount ?? 2) + extraProjectiles;

    const inRange = state.enemies.filter(e => {
        const dx = e.x - state.player.x;
        const dy = e.y - state.player.y;
        return Math.hypot(dx, dy) <= range;
    });

    if (inRange.length === 0) return;

    const primaryTarget = inRange[Math.floor(Math.random() * inRange.length)];
    const hitEnemies: Enemy[] = [primaryTarget];

    primaryTarget.hp -= stats.damage * damageMult;
    primaryTarget.hitThisFrame = true;

    const segments: { x: number; y: number }[] = [];
    let lastX = state.player.x;
    let lastY = state.player.y;

    const steps = 5;
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const baseX = state.player.x + (primaryTarget.x - state.player.x) * t;
        const baseY = state.player.y + (primaryTarget.y - state.player.y) * t;
        const offset = i === 0 || i === steps ? 0 : (Math.random() - 0.5) * 30;
        segments.push({ x: baseX + offset, y: baseY + offset });
        lastX = baseX;
        lastY = baseY;
    }

    let currentX = primaryTarget.x;
    let currentY = primaryTarget.y;

    for (let c = 0; c < chainCount && hitEnemies.length < inRange.length; c++) {
        let nearest: Enemy | null = null;
        let nearestDist = Infinity;

        for (const e of state.enemies) {
            if (hitEnemies.includes(e)) continue;
            const dx = e.x - currentX;
            const dy = e.y - currentY;
            const dist = Math.hypot(dx, dy);
            if (dist < nearestDist && dist < range * 0.8) {
                nearestDist = dist;
                nearest = e;
            }
        }

        if (!nearest) break;

        const chainDamage = (stats.damage * damageMult) * 0.6;
        nearest.hp -= chainDamage;
        nearest.hitThisFrame = true;
        hitEnemies.push(nearest);

        segments.push({ x: nearest.x, y: nearest.y });
        currentX = nearest.x;
        currentY = nearest.y;
    }

    state.lightningBolts.push({
        startX: state.player.x,
        startY: state.player.y,
        segments,
        life: 0.2
    });

    addFloatingText(state, "⚡", primaryTarget.x, primaryTarget.y - 10, "#00ffff");
}

/**
 * Missiles weapon - Homing missiles
 */
export function fireMissiles(state: GameState): void {
    if (!isWeaponUnlocked(state, 'missiles')) return;
    if (state.enemies.length === 0 && !state.bossActive) return;

    const level = getWeaponLevel(state, 'missiles');
    const def = getWeaponDef('missiles');
    const stats = getWeaponStats(def, level);
    const { damageMult, extraProjectiles } = getGlobalMultipliers(state);

    const count = Math.max(1, Math.floor((stats.projectiles ?? 1) + extraProjectiles));

    for (let i = 0; i < count; i++) {
        let targetX: number, targetY: number;

        if (state.bossActive && state.currentBoss && Math.random() < 0.5) {
            targetX = state.currentBoss.x;
            targetY = state.currentBoss.y;
        } else if (state.enemies.length > 0) {
            const target = state.enemies[Math.floor(Math.random() * state.enemies.length)];
            targetX = target.x;
            targetY = target.y;
        } else {
            continue;
        }

        const dx = targetX - state.player.x;
        const dy = targetY - state.player.y;
        const dist = Math.hypot(dx, dy) || 1;
        const speed = 150;

        const missile: HomingMissile = {
            x: state.player.x,
            y: state.player.y,
            dx: (dx / dist) * speed,
            dy: (dy / dist) * speed,
            targetId: i,
            life: 4,
            damage: stats.damage * damageMult
        };

        state.missiles.push(missile);
    }
}
