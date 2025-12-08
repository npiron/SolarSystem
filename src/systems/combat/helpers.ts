/**
 * Combat Helpers - Utility functions
 * Extracted from combat.ts
 */

import type { Enemy, GameState } from "../../types/index.ts";
import type { TuningConfig } from "../../config/tuning.ts";
import type { WeaponId } from "../../config/weapons.ts";

/**
 * Check if a weapon is unlocked
 */
export function isWeaponUnlocked(state: GameState, id: WeaponId): boolean {
    const weapon = state.weapons.find(w => w.id === id);
    return weapon?.unlocked ?? false;
}

/**
 * Get weapon level
 */
export function getWeaponLevel(state: GameState, id: WeaponId): number {
    const weapon = state.weapons.find(w => w.id === id);
    return weapon?.level ?? 0;
}

/**
 * Find nearest enemy to player
 */
export function nearestEnemy(state: GameState): Enemy | { x: number; y: number } | null {
    let closest: Enemy | { x: number; y: number } | null = null;
    let bestDist = Infinity;

    // Check regular enemies
    state.enemies.forEach((e) => {
        const dx = e.x - state.player.x;
        const dy = e.y - state.player.y;
        const dist = dx * dx + dy * dy;
        if (dist < bestDist) {
            bestDist = dist;
            closest = e;
        }
    });

    // Check boss if active
    if (state.bossActive && state.currentBoss) {
        const dx = state.currentBoss.x - state.player.x;
        const dy = state.currentBoss.y - state.player.y;
        const dist = dx * dx + dy * dy;
        if (dist < bestDist) {
            closest = state.currentBoss;
        }
    }

    return closest;
}

/**
 * Calculate number of orbit projectiles
 */
export function calculateOrbitProjectiles(state: GameState, orbitConfig: TuningConfig["orbit"]): number {
    const bonusProjectiles = Math.max(0, state.player.projectiles - 1) * orbitConfig.projectileScaling;
    const desiredOrbs = state.player.orbitProjectiles + bonusProjectiles;
    const roundedOrbs = Math.max(1, Math.round(desiredOrbs));
    return Math.min(orbitConfig.maxOrbitProjectiles, roundedOrbs);
}
