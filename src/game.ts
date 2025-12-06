/**
 * Core game update logic
 * 
 * This module contains the main game update function that handles:
 * - Time progression
 * - Player movement
 * - Combat updates
 * - Resource generation
 */
import type { GameState, Generator, TalentBonuses, AssistUi } from "./types/index.ts";
import { updateSpawn, shouldSpawnBoss, spawnBoss } from "./systems/spawn.ts";
import { updateCombat } from "./systems/combat.ts";
import { updateFloatingText } from "./systems/hud.ts";
import { calculatePlayerMovement, clampPlayerToBounds } from "./player.ts";
import { computeIdleRate, computePassiveGains } from "./systems/economy.ts";
import { getTuning } from "./config/tuning.ts";

interface UpdateContext {
  canvasWidth: number;
  canvasHeight: number;
  generators: Generator[];
  talentBonuses: TalentBonuses;
  assistUi: AssistUi;
}

/**
 * Main game update function - handles all per-frame game logic
 * @param state The game state to update
 * @param dt Delta time in seconds since last frame
 * @param context Additional context needed for updates
 */
export function update(state: GameState, dt: number, context: UpdateContext): void {
  if (!state.running) return;

  const { canvasWidth, canvasHeight, generators, talentBonuses, assistUi } = context;

  // Define UI margins for panels
  const UI_MARGINS = { left: 16, right: 16, top: 60, bottom: 32 };
  const canvas = { width: canvasWidth, height: canvasHeight, uiMargins: UI_MARGINS };

  state.time += dt;

  // Update enemy spawning
  updateSpawn(state, dt, canvas);

  // Check for boss spawn
  if (shouldSpawnBoss(state)) {
    spawnBoss(state, canvas);
  }

  // Get the desired movement direction using AI
  const movement = calculatePlayerMovement(state, canvas);
  const targetVx = movement.dirX * state.player.speed;
  const targetVy = movement.dirY * state.player.speed;

  // Get physics constants from tuning
  const { playerAcceleration, playerFriction, maxSpeedMultiplier, momentumPreservation } = getTuning().physics;

  // Calculate velocity difference for responsive acceleration
  const deltaVx = targetVx - state.player.vx;
  const deltaVy = targetVy - state.player.vy;
  const deltaSpeed = Math.hypot(deltaVx, deltaVy);
  
  // Dynamic acceleration: faster when changing direction significantly
  const directionChange = deltaSpeed / (state.player.speed || 1);
  const dynamicAcceleration = playerAcceleration * (1 + directionChange * 0.3);
  
  // Calculate acceleration toward target velocity with smooth interpolation
  const ax = (targetVx - state.player.vx) * dynamicAcceleration;
  const ay = (targetVy - state.player.vy) * dynamicAcceleration;

  // Apply acceleration to velocity
  state.player.vx += ax * dt;
  state.player.vy += ay * dt;

  // Apply friction to velocity (damping effect for space-like feel)
  // Reduce friction when moving to preserve momentum better
  const currentSpeed = Math.hypot(state.player.vx, state.player.vy);
  const speedRatio = Math.min(1, currentSpeed / (state.player.speed || 1));
  const dynamicFriction = playerFriction * (1 - speedRatio * momentumPreservation);
  const frictionFactor = 1 - dynamicFriction * dt;
  state.player.vx *= Math.max(0, frictionFactor);
  state.player.vy *= Math.max(0, frictionFactor);

  // Clamp velocity to max speed with smooth limiting
  const maxSpeed = state.player.speed * maxSpeedMultiplier;
  if (currentSpeed > maxSpeed) {
    const limitFactor = maxSpeed / currentSpeed;
    // Soft speed limit that feels more natural
    const smoothFactor = 0.95 + limitFactor * 0.05;
    state.player.vx *= smoothFactor;
    state.player.vy *= smoothFactor;
  }

  // Update position based on velocity
  state.player.x += state.player.vx * dt;
  state.player.y += state.player.vy * dt;
  clampPlayerToBounds(state, canvas);

  // Update combat (bullets, enemies, collisions)
  updateCombat(state, dt, canvas);

  // Track first shot for assist system
  if (!state.assist.firstShot && state.bullets.length > 0) {
    assistUi.recordShot();
  }

  // Progress wave using tuning value
  state.wave += dt * getTuning().wave.progressionSpeed;
  assistUi.trackWave(state.wave);

  // Update prestige cooldown
  if (state.prestigeCooldown > 0) {
    state.prestigeCooldown = Math.max(0, state.prestigeCooldown - dt);
  }

  // Calculate and apply passive resource gains
  const idleRate = computeIdleRate(generators, state.resources.idleMultiplier, talentBonuses);
  const { essence: passiveEssence, fragments: passiveFragments } = computePassiveGains(idleRate, dt);
  state.resources.essence += passiveEssence;
  state.resources.fragments += passiveFragments;
  state.runStats.essence += passiveEssence;
  state.runStats.fragments += passiveFragments;

  // Update floating text animations
  updateFloatingText(state, dt);
}
