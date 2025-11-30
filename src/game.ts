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
import { updateSpawn } from "./systems/spawn.ts";
import { updateCombat } from "./systems/combat.ts";
import { updateFloatingText } from "./systems/hud.ts";
import { calculatePlayerMovement, clampPlayerToBounds } from "./player.ts";
import { computeIdleRate, computePassiveGains } from "./systems/economy.ts";

// Physics constants for inertial movement
const ACCELERATION = 8.0; // How fast the player accelerates toward target direction
const FRICTION = 4.5; // Drag coefficient for smooth deceleration

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
  const canvas = { width: canvasWidth, height: canvasHeight };

  state.time += dt;

  // Update enemy spawning
  updateSpawn(state, dt, canvas);

  // Get the desired movement direction using AI
  const movement = calculatePlayerMovement(state, canvas);
  const targetVx = movement.dirX * state.player.speed;
  const targetVy = movement.dirY * state.player.speed;

  // Calculate acceleration toward target velocity with smooth interpolation
  const ax = (targetVx - state.player.vx) * ACCELERATION;
  const ay = (targetVy - state.player.vy) * ACCELERATION;

  // Apply acceleration to velocity
  state.player.vx += ax * dt;
  state.player.vy += ay * dt;

  // Apply friction to velocity (damping effect for space-like feel)
  const frictionFactor = 1 - FRICTION * dt;
  state.player.vx *= Math.max(0, frictionFactor);
  state.player.vy *= Math.max(0, frictionFactor);

  // Clamp velocity to max speed
  const currentSpeed = Math.hypot(state.player.vx, state.player.vy);
  const maxSpeed = state.player.speed * 1.2;
  if (currentSpeed > maxSpeed) {
    state.player.vx = (state.player.vx / currentSpeed) * maxSpeed;
    state.player.vy = (state.player.vy / currentSpeed) * maxSpeed;
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

  // Progress wave
  state.wave += dt * 0.15;
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
