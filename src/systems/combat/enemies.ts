/**
 * Combat Enemies - Enemy death and effects
 * Extracted from combat.ts
 */

import type { Enemy, GameState } from "../../types/index.ts";
import type { EnemyVariantDefinition } from "../../config/enemyVariants.ts";
import { getTuning } from "../../config/tuning.ts";
import { TAU } from "../../config/constants.ts";
import { addFloatingText, registerFragmentGain } from "../hud.ts";
import { playSound } from "../sound.ts";
import { getVariantDefinition } from "../../config/enemyVariants.ts";

/**
 * Apply explosion damage when explosive enemy dies
 */
export function applyExplosionDamage(
    state: GameState,
    enemy: Enemy,
    variantDef: EnemyVariantDefinition
): void {
    if (!variantDef.explosion) return;

    const { radius, damage } = variantDef.explosion;
    const dx = enemy.x - state.player.x;
    const dy = enemy.y - state.player.y;
    const dist = Math.hypot(dx, dy) || 1;
    if (dist > radius + state.player.radius) return;

    const scaledDamage = damage * (1 + state.wave * 0.025) * (1 - state.player.damageReduction);
    state.player.hp -= scaledDamage;
    addFloatingText(state, "BOOM", enemy.x, enemy.y - 8, "#ff1f1f");
    applyExplosionImpulse(state, enemy.x, enemy.y, radius);
}

/**
 * Apply knockback impulse from explosion
 */
export function applyExplosionImpulse(state: GameState, originX: number, originY: number, radius: number): void {
    const strength = 140;

    const applyKnockback = (target: { x: number; y: number; vx?: number; vy?: number; radius?: number }, scale = 1): void => {
        const dx = target.x - originX;
        const dy = target.y - originY;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist > radius + (target.radius ?? 0)) return;

        const falloff = 1 - Math.min(dist / radius, 1);
        const impulse = strength * falloff * scale;
        const nx = dx / dist;
        const ny = dy / dist;

        target.vx = (target.vx ?? 0) + nx * impulse;
        target.vy = (target.vy ?? 0) + ny * impulse;
    };

    applyKnockback(state.player, 0.6);
    state.enemies.forEach((other) => applyKnockback(other, other.elite ? 0.9 : 1));
    state.fragmentsOrbs.forEach((fragment) => applyKnockback(fragment, 0.4));
}

/**
 * Spawn split children when split enemy dies
 */
export function spawnSplitChildren(
    state: GameState,
    enemy: Enemy,
    variantDef: EnemyVariantDefinition,
    spawned: Enemy[]
): void {
    const split = variantDef.split;
    if (!split) return;

    const generation = (enemy.generation ?? 0) + 1;
    if (generation > split.maxGenerations) return;

    if (!state.visualsLow) {
        addFloatingText(state, "✨", enemy.x, enemy.y - enemy.radius, "#c084fc", 1.4);
    }

    for (let i = 0; i < split.count; i++) {
        const angle = Math.random() * TAU;
        const offset = split.spread * (0.8 + Math.random() * 0.6);
        const childX = enemy.x + Math.cos(angle) * offset;
        const childY = enemy.y + Math.sin(angle) * offset;
        const hp = Math.max(6, enemy.maxHp * split.hpScale);
        const radius = Math.max(4, enemy.radius * split.radiusScale);
        const reward = Math.max(0.5, enemy.reward * split.rewardScale);

        const launchSpeed = 90;
        const child: Enemy = {
            x: childX,
            y: childY,
            vx: Math.cos(angle) * launchSpeed,
            vy: Math.sin(angle) * launchSpeed,
            radius,
            hp,
            maxHp: hp,
            speed: enemy.speed * split.speedScale,
            reward,
            fireTimer: enemy.fireDelay * Math.random(),
            fireDelay: enemy.fireDelay,
            elite: false,
            type: enemy.type === "weak" ? "weak" : "normal",
            variant: enemy.variant,
            generation
        };
        spawned.push(child);
    }
}

/**
 * Handle enemy death - rewards, effects, fragments
 */
export function handleEnemyDeath(state: GameState, enemy: Enemy, spawned: Enemy[]): void {
    state.resources.essence += enemy.reward;
    state.runStats.kills += 1;
    state.runStats.essence += enemy.reward;

    // Play death sound - deep knock
    playSound('death', { volume: 0.18, pitch: 1.0 });
    const variantDef = getVariantDefinition(enemy.variant);

    // Death animation - mini explosion particles
    if (!state.visualsLow) {
        const particleCount = enemy.elite ? 8 : 5;
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const color = enemy.elite ? "#fbbf24" : "#94a3b8";
            addFloatingText(
                state,
                "★",
                enemy.x + Math.cos(angle) * 5,
                enemy.y + Math.sin(angle) * 5,
                color,
                1.2
            );
        }
    }

    // Handle variant death effects
    applyExplosionDamage(state, enemy, variantDef);
    spawnSplitChildren(state, enemy, variantDef, spawned);

    // Drop fragment orb with 35% of reward
    const { maxFragments } = getTuning().fx;
    const fragReward = enemy.reward * 0.35;
    if (state.fragmentsOrbs.length < maxFragments) {
        state.fragmentsOrbs.push({
            x: enemy.x,
            y: enemy.y,
            value: fragReward,
            vx: (Math.random() - 0.5) * 30,
            vy: (Math.random() - 0.5) * 30,
            life: 12
        });
    } else {
        registerFragmentGain(state, fragReward, enemy.x, enemy.y, true);
    }

    // Add floating text for essence gain
    if (!state.visualsLow) {
        const gainText = `+${Math.round(enemy.reward)}`;
        addFloatingText(state, gainText, enemy.x, enemy.y - 10, "#84cc16", 1.6);
    }

    // High-value enemies show special effects
    if (enemy.elite && !state.visualsLow) {
        addFloatingText(state, "⭐ ELITE", enemy.x, enemy.y + 8, "#fbbf24", 2.0);
    }
}
