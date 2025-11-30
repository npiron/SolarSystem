/**
 * Player movement and AI system.
 * Handles intelligent player movement based on health, threats, and objectives.
 */

import type { GameState } from "../types/state.ts";

type DangerVector = {
  dx: number;
  dy: number;
  threat: number;
};

type MovementResult = {
  moveX: number;
  moveY: number;
};

/**
 * Find the nearest fragment orb to the player.
 * @param state - Current game state
 * @returns The closest fragment orb, or null if no fragments exist
 */
export function nearestFragment(state: GameState): typeof state.fragmentsOrbs[0] | null {
  let closest = null;
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
 * Calculate a danger repulsion vector from nearby enemies.
 * Returns normalized direction away from danger center of mass.
 * @param state - Current game state
 * @returns Object containing:
 *   - dx: Normalized x-direction away from threats (-1 to 1)
 *   - dy: Normalized y-direction away from threats (-1 to 1)
 *   - threat: Normalized threat level (0 to 1) indicating danger intensity
 */
export function calculateDangerVector(state: GameState): DangerVector {
  if (state.enemies.length === 0) return { dx: 0, dy: 0, threat: 0 };

  const DANGER_RADIUS = 150; // Distance at which enemies become threatening
  let threatDx = 0;
  let threatDy = 0;
  let totalThreat = 0;

  state.enemies.forEach((e) => {
    const dx = e.x - state.player.x;
    const dy = e.y - state.player.y;
    const dist = Math.hypot(dx, dy);

    if (dist < DANGER_RADIUS && dist > 0) {
      // Closer enemies are more threatening (inverse square relationship)
      const threat = Math.pow((DANGER_RADIUS - dist) / DANGER_RADIUS, 2);
      // Elite enemies are more threatening
      const eliteMult = e.elite ? 1.8 : 1;
      const weight = threat * eliteMult;

      threatDx += (dx / dist) * weight;
      threatDy += (dy / dist) * weight;
      totalThreat += weight;
    }
  });

  if (totalThreat === 0) return { dx: 0, dy: 0, threat: 0 };

  // Normalize and return the direction away from threats (negative)
  const mag = Math.hypot(threatDx, threatDy) || 1;
  return {
    dx: -threatDx / mag,
    dy: -threatDy / mag,
    threat: Math.min(1, totalThreat / 3) // Normalized threat level
  };
}

/**
 * Find the safest fragment to collect, considering both distance and danger.
 * Balances proximity to fragment with enemy threat at the fragment's location.
 * @param state - Current game state
 * @returns The best fragment orb to collect, or null if no fragments exist
 */
export function findBestFragment(state: GameState): typeof state.fragmentsOrbs[0] | null {
  if (state.fragmentsOrbs.length === 0) return null;

  const DANGER_WEIGHT = 0.4; // How much danger affects fragment choice
  let bestFragment = null;
  let bestScore = -Infinity;

  state.fragmentsOrbs.forEach((f) => {
    const dx = f.x - state.player.x;
    const dy = f.y - state.player.y;
    const distToFragment = Math.hypot(dx, dy) || 1;

    // Calculate danger at fragment's position
    let dangerAtFragment = 0;
    state.enemies.forEach((e) => {
      const eDx = e.x - f.x;
      const eDy = e.y - f.y;
      const eDist = Math.hypot(eDx, eDy);
      if (eDist < 120) {
        dangerAtFragment += (120 - eDist) / 120;
      }
    });

    // Score: prefer close fragments with low danger
    // Higher score = better choice
    const distScore = 1 / (1 + distToFragment / 100); // Close is better
    const safetyScore = 1 / (1 + dangerAtFragment); // Less danger is better
    const valueScore = f.value / 10; // Higher value fragments preferred slightly

    const score = distScore * (1 - DANGER_WEIGHT) + safetyScore * DANGER_WEIGHT + valueScore * 0.1;

    if (score > bestScore) {
      bestScore = score;
      bestFragment = f;
    }
  });

  return bestFragment;
}

/**
 * Calculate intelligent player movement based on health, threats, and objectives.
 * Implements survival mode when health is low, balances fragment collection with danger.
 * @param state - Current game state
 * @param dt - Delta time in seconds since last frame
 * @param arenaWidth - Width of the arena
 * @param arenaHeight - Height of the arena
 * @returns Object containing movement deltas:
 *   - moveX: Horizontal movement distance for this frame
 *   - moveY: Vertical movement distance for this frame
 */
export function calculatePlayerMovement(
  state: GameState,
  dt: number,
  arenaWidth: number,
  arenaHeight: number
): MovementResult {
  const healthRatio = state.player.hp / state.player.maxHp;
  const danger = calculateDangerVector(state);

  // Survival mode: prioritize avoiding enemies when health is low
  const survivalThreshold = 0.35;
  const isSurvivalMode = healthRatio < survivalThreshold && danger.threat > 0.2;

  let moveX = 0;
  let moveY = 0;

  if (isSurvivalMode) {
    // In survival mode, heavily weight escape direction
    moveX = danger.dx * state.player.speed * dt * 1.3;
    moveY = danger.dy * state.player.speed * dt * 1.3;

    // Add some randomness to avoid predictable patterns
    const jitter = 0.2;
    moveX += (Math.random() - 0.5) * jitter * state.player.speed * dt;
    moveY += (Math.random() - 0.5) * jitter * state.player.speed * dt;
  } else {
    // Normal mode: balance fragment collection with safety
    const targetFragment = findBestFragment(state);

    if (targetFragment) {
      const dx = targetFragment.x - state.player.x;
      const dy = targetFragment.y - state.player.y;
      const dist = Math.hypot(dx, dy) || 1;

      // Direction toward fragment
      let fragmentDx = dx / dist;
      let fragmentDy = dy / dist;

      // Blend with danger avoidance based on threat level and health
      const dangerBlend = danger.threat * (1.2 - healthRatio);
      fragmentDx = fragmentDx * (1 - dangerBlend) + danger.dx * dangerBlend;
      fragmentDy = fragmentDy * (1 - dangerBlend) + danger.dy * dangerBlend;

      // Normalize blended direction
      const blendMag = Math.hypot(fragmentDx, fragmentDy) || 1;
      moveX = (fragmentDx / blendMag) * state.player.speed * dt * 1.1;
      moveY = (fragmentDy / blendMag) * state.player.speed * dt * 1.1;
    } else {
      // No fragments: patrol pattern with danger awareness
      if (danger.threat > 0.3) {
        // Move away from danger
        moveX = danger.dx * state.player.speed * dt * 0.9;
        moveY = danger.dy * state.player.speed * dt * 0.9;
      } else {
        // Patrol in smooth orbit pattern toward center
        const centerX = arenaWidth / 2;
        const centerY = arenaHeight / 2;
        const toCenterX = centerX - state.player.x;
        const toCenterY = centerY - state.player.y;
        const distToCenter = Math.hypot(toCenterX, toCenterY) || 1;

        // Mix orbital movement with drift toward center
        const orbit = Math.sin(state.time * 0.6) * 0.4;
        const orbitMoveX = Math.cos(state.time * 0.8 + orbit);
        const orbitMoveY = Math.sin(state.time * 0.5);

        // Stronger pull toward center when far from it
        const centerPull = Math.min(0.5, distToCenter / 300);
        moveX = (orbitMoveX * (1 - centerPull) + (toCenterX / distToCenter) * centerPull) * state.player.speed * dt;
        moveY = (orbitMoveY * (1 - centerPull) + (toCenterY / distToCenter) * centerPull) * state.player.speed * dt;
      }
    }
  }

  return { moveX, moveY };
}
