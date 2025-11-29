/**
 * Game loop module
 * Contains the core game update logic
 */

import type { Canvas, FragmentOrb, GameState } from "../types/index.ts";
import { updateSpawn } from "./spawn.ts";
import { updateCombat } from "./combat.ts";
import { updateFloatingText } from "./hud.ts";

/**
 * Finds the nearest fragment orb to the player
 */
export function findNearestFragment(state: GameState): FragmentOrb | null {
  let closest: FragmentOrb | null = null;
  let bestDist = Infinity;

  state.fragmentsOrbs.forEach((f) => {
    const dx = f.x - state.player.x;
    const dy = f.y - state.player.y;
    const dist = dx * dx + dy * dy;
    if (dist < bestDist) {
      bestDist = dist;
      closest = f;
    }
  });

  return closest;
}

/**
 * Clamps player position to stay within canvas bounds
 */
export function clampPlayerToBounds(
  state: GameState,
  width: number,
  height: number,
  margin = 30
): void {
  state.player.x = Math.max(margin, Math.min(width - margin, state.player.x));
  state.player.y = Math.max(margin, Math.min(height - margin, state.player.y));
}

/** Options for update function */
export interface UpdateOptions {
  canvas: Canvas;
  canvasWidth: number;
  canvasHeight: number;
  computeIdleRate: () => number;
  onFirstShot: () => void;
  onWaveProgress: (wave: number) => void;
}

/**
 * Main game update function
 * Called every frame to update game state
 */
export function updateGame(
  state: GameState,
  dt: number,
  options: UpdateOptions
): void {
  if (!state.running) return;

  state.time += dt;

  // Spawn enemies
  updateSpawn(state, dt, options.canvas);

  // Player movement - chase fragments or orbit
  const targetFragment = findNearestFragment(state);
  if (targetFragment) {
    const dx = targetFragment.x - state.player.x;
    const dy = targetFragment.y - state.player.y;
    const dist = Math.hypot(dx, dy) || 1;
    state.player.x += (dx / dist) * state.player.speed * dt * 1.1;
    state.player.y += (dy / dist) * state.player.speed * dt * 1.1;
  } else {
    const orbit = Math.sin(state.time * 0.6) * 0.4;
    state.player.x += Math.cos(state.time * 0.8 + orbit) * state.player.speed * dt;
    state.player.y += Math.sin(state.time * 0.5) * state.player.speed * dt;
  }
  clampPlayerToBounds(state, options.canvasWidth, options.canvasHeight);

  // Combat update
  updateCombat(state, dt, options.canvas);

  // Track first shot for tutorial
  if (!state.assist.firstShot && state.bullets.length > 0) {
    options.onFirstShot();
  }

  // Wave progression
  state.wave += dt * 0.15;
  options.onWaveProgress(state.wave);

  // Prestige cooldown
  if (state.prestigeCooldown > 0) {
    state.prestigeCooldown = Math.max(0, state.prestigeCooldown - dt);
  }

  // Passive resource generation
  const idleRate = options.computeIdleRate();
  const passiveEssence = idleRate * dt;
  const passiveFragments = idleRate * 0.35 * dt;
  state.resources.essence += passiveEssence;
  state.resources.fragments += passiveFragments;
  state.runStats.essence += passiveEssence;
  state.runStats.fragments += passiveFragments;

  // Update floating text animations
  updateFloatingText(state, dt);
}

/**
 * Performs a soft reset of the game state
 * Used for prestige and death recovery
 */
export function performSoftReset(
  state: GameState,
  centerX: number,
  centerY: number
): void {
  state.wave = 1;
  state.player.hp = state.player.maxHp;
  state.player.fireTimer = 0;
  state.player.x = centerX;
  state.player.y = centerY;
  state.enemies = [];
  state.bullets = [];
  state.floatingText = [];
  state.fragmentsOrbs = [];
  state.gainTicker = { fragments: 0, essence: 0, timer: 0 };
  state.runStats = { kills: 0, fragments: 0, essence: 0 };
  state.spawnTimer = 0;
  state.dead = false;
  state.running = true;
}

/** Options for prestige function */
export interface PrestigeOptions {
  centerX: number;
  centerY: number;
  refreshGeneratorRates: () => void;
  playPrestige: () => void;
  recordPrestige: () => void;
  saveGame: () => void;
  renderGenerators: () => void;
}

/**
 * Performs a prestige (soft reset with bonus multiplier)
 */
export function performPrestige(
  state: GameState,
  options: PrestigeOptions
): void {
  const bonus = 1 + Math.sqrt(state.wave) * 0.25;
  state.resources.idleMultiplier *= bonus;

  options.refreshGeneratorRates();
  performSoftReset(state, options.centerX, options.centerY);

  state.prestigeCooldown = 8;
  options.playPrestige();
  options.recordPrestige();
  options.saveGame();
  options.renderGenerators();
}
