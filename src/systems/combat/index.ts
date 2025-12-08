/**
 * Combat System - Main Entry Point
 * 
 * This module coordinates all combat subsystems:
 * - Weapons (fire functions)
 * - Projectiles (missiles, laser updates)
 * - Enemies (death, effects)
 * - Main update loop
 */

// Re-export helpers
export { isWeaponUnlocked, getWeaponLevel, nearestEnemy, calculateOrbitProjectiles } from "./helpers.ts";

// Re-export weapons
export { fire, fireOrbit, fireLightning, fireMissiles, getGlobalMultipliers } from "./weapons.ts";

// Re-export projectiles
export { updateMissiles, updateLaser } from "./projectiles.ts";

// Re-export enemies
export { handleEnemyDeath, applyExplosionDamage, applyExplosionImpulse, spawnSplitChildren } from "./enemies.ts";

// Re-export main update from old file temporarily
// TODO: Move updateCombat to update.ts and import from there
export { updateCombat } from "../combat_old.ts";
