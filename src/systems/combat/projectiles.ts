/**
 * Combat Projectiles - Bullet/missile/laser updates
 * Extracted from combat.ts
 */

import type { Enemy, GameState } from "../../types/index.ts";
import { TAU } from "../../config/constants.ts";
import { getTuning } from "../../config/tuning.ts";
import { getWeaponDef, getWeaponStats } from "../../config/weapons.ts";
import { addFloatingText } from "../hud.ts";
import { isWeaponUnlocked, getWeaponLevel } from "./helpers.ts";
import { getGlobalMultipliers } from "./weapons.ts";

/**
 * Update homing missiles movement and collisions
 */
export function updateMissiles(state: GameState, dt: number): void {
    const turnSpeed = 4; // Radians per second for homing

    for (const missile of state.missiles) {
        // Find nearest enemy to home toward
        let nearestEnemy: Enemy | null = null;
        let nearestDist = Infinity;

        for (const e of state.enemies) {
            const dx = e.x - missile.x;
            const dy = e.y - missile.y;
            const dist = Math.hypot(dx, dy);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearestEnemy = e;
            }
        }

        // Also consider boss
        if (state.bossActive && state.currentBoss) {
            const dx = state.currentBoss.x - missile.x;
            const dy = state.currentBoss.y - missile.y;
            const dist = Math.hypot(dx, dy);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearestEnemy = null; // Will handle boss separately
            }
        }

        // Home toward target
        let targetX = missile.x + missile.dx;
        let targetY = missile.y + missile.dy;

        if (nearestEnemy) {
            targetX = nearestEnemy.x;
            targetY = nearestEnemy.y;
        } else if (state.bossActive && state.currentBoss) {
            targetX = state.currentBoss.x;
            targetY = state.currentBoss.y;
        }

        const desiredDx = targetX - missile.x;
        const desiredDy = targetY - missile.y;
        const desiredAngle = Math.atan2(desiredDy, desiredDx);
        const currentAngle = Math.atan2(missile.dy, missile.dx);

        // Interpolate angle
        let angleDiff = desiredAngle - currentAngle;
        while (angleDiff > Math.PI) angleDiff -= TAU;
        while (angleDiff < -Math.PI) angleDiff += TAU;

        const newAngle = currentAngle + Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), turnSpeed * dt);
        const speed = Math.hypot(missile.dx, missile.dy);

        missile.dx = Math.cos(newAngle) * speed;
        missile.dy = Math.sin(newAngle) * speed;

        // Move missile
        missile.x += missile.dx * dt;
        missile.y += missile.dy * dt;
        missile.life -= dt;

        // Check collision with enemies
        for (const enemy of state.enemies) {
            const dx = enemy.x - missile.x;
            const dy = enemy.y - missile.y;
            if (dx * dx + dy * dy < (enemy.radius + 6) ** 2) {
                enemy.hp -= missile.damage;
                enemy.hitThisFrame = true;
                missile.life = -1;
                addFloatingText(state, "💥", enemy.x, enemy.y - 5, "#ff6600");
                break;
            }
        }

        // Check collision with boss
        if (state.bossActive && state.currentBoss && missile.life > 0) {
            const boss = state.currentBoss;
            const dx = boss.x - missile.x;
            const dy = boss.y - missile.y;
            if (dx * dx + dy * dy < (boss.radius + 6) ** 2) {
                boss.hp -= missile.damage;
                missile.life = -1;
                addFloatingText(state, "💥", boss.x, boss.y - 5, "#ff6600");
            }
        }
    }

    // Remove dead missiles
    state.missiles = state.missiles.filter(m => m.life > 0);
}

/**
 * Update laser beam - continuous beam toward enemies
 */
export function updateLaser(state: GameState, dt: number): void {
    if (!isWeaponUnlocked(state, 'laser')) return;

    const level = getWeaponLevel(state, 'laser');
    const def = getWeaponDef('laser');
    const stats = getWeaponStats(def, level);
    const { damageMult, rangeMult, extraProjectiles } = getGlobalMultipliers(state);

    // Clear old beams
    state.laserBeams = [];

    const range = (stats.range ?? 250) * rangeMult;

    // Find multiple targets based on extra projectiles
    const beamCount = 1 + extraProjectiles;

    // Get all enemies in range sorted by distance
    const candidates: { enemy: Enemy, distSq: number }[] = [];
    const rangeSq = range * range;

    for (const e of state.enemies) {
        const dx = e.x - state.player.x;
        const dy = e.y - state.player.y;
        const distSq = dx * dx + dy * dy;
        if (distSq <= rangeSq) {
            candidates.push({ enemy: e, distSq });
        }
    }

    // Also add boss if in range
    if (state.bossActive && state.currentBoss) {
        const dx = state.currentBoss.x - state.player.x;
        const dy = state.currentBoss.y - state.player.y;
        const distSq = dx * dx + dy * dy;
        if (distSq <= rangeSq) {
            candidates.unshift({ enemy: state.currentBoss as unknown as Enemy, distSq: 0 });
        }
    }

    // Sort by distance (closest first)
    candidates.sort((a, b) => a.distSq - b.distSq);

    const targets = candidates.slice(0, beamCount).map(c => c.enemy);

    for (const target of targets) {
        const dx = target.x - state.player.x;
        const dy = target.y - state.player.y;
        const dist = Math.sqrt(candidates.find(c => c.enemy === target)?.distSq || 1);

        // Create laser beam visual
        state.laserBeams.push({
            startX: state.player.x,
            startY: state.player.y,
            endX: target.x,
            endY: target.y,
            life: 0.1
        });

        // Apply DPS to all enemies on the beam path
        const beamWidth = 8;
        const dps = stats.damage * damageMult;

        for (const enemy of state.enemies) {
            // Simple bbox check first
            if (Math.abs(enemy.x - state.player.x) > range && Math.abs(enemy.y - state.player.y) > range) continue;

            // Point-to-line distance
            const ex = enemy.x - state.player.x;
            const ey = enemy.y - state.player.y;
            const t = Math.max(0, Math.min(1, (ex * dx + ey * dy) / (dist * dist)));
            const closestX = state.player.x + t * dx;
            const closestY = state.player.y + t * dy;
            const distToBeam = Math.hypot(enemy.x - closestX, enemy.y - closestY);

            if (distToBeam < beamWidth + enemy.radius) {
                enemy.hp -= dps * dt;
                enemy.hitThisFrame = true;
            }
        }

        // Boss hit check
        if (state.bossActive && state.currentBoss) {
            const boss = state.currentBoss;
            const bx = boss.x - state.player.x;
            const by = boss.y - state.player.y;
            const t = Math.max(0, Math.min(1, (bx * dx + by * dy) / (dist * dist)));
            const closestX = state.player.x + t * dx;
            const closestY = state.player.y + t * dy;
            const distToBeam = Math.hypot(boss.x - closestX, boss.y - closestY);

            if (distToBeam < beamWidth + boss.radius) {
                boss.hp -= dps * dt;
            }
        }
    }
}
