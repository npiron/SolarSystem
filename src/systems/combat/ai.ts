/**
 * Enemy AI - Steering behaviors for enemy movement
 *
 * Provides variant-specific AI behaviors:
 * - Seek: Move toward player
 * - Separation: Avoid crowding with other enemies
 * - Dodge: Detect and evade incoming bullets
 * - Flank: Approach from angles instead of head-on
 * - Kite: Maintain distance (artillery)
 * - Weave: Sinusoidal movement for unpredictability
 * - Strafe: Circle around the player
 * - Boundary avoidance: Stay within play area
 */

import type { Enemy, GameState } from "../../types/index.ts";
import { getTuning } from "../../config/tuning.ts";
import { TAU } from "../../config/constants.ts";

// ── Types ──────────────────────────────────────────────────────────────────

/** 2D steering force vector */
export interface SteeringForce {
  fx: number;
  fy: number;
}

/** Behavior weights per variant – higher = stronger influence */
export interface BehaviorWeights {
  seek: number;
  separation: number;
  dodge: number;
  flank: number;
  kite: number;
  weave: number;
  strafe: number;
  boundary: number;
}

/** AI tuning parameters exposed to the tuning panel */
export interface AiTuning {
  /** Radius to scan for nearby enemies (separation) */
  separationRadius: number;
  /** Maximum separation force */
  separationForce: number;
  /** Radius to scan for incoming bullets (dodge) */
  dodgeScanRadius: number;
  /** Dodge reaction time in seconds (lower = faster reaction) */
  dodgeReactionTime: number;
  /** Maximum dodge force */
  dodgeForce: number;
  /** Dodge cooldown in seconds after a dodge */
  dodgeCooldownDuration: number;
  /** Flank angle offset in radians */
  flankAngle: number;
  /** Flank force strength */
  flankForce: number;
  /** Kite: desired distance from player */
  kiteDesiredDistance: number;
  /** Kite: force when too close */
  kiteRepulsionForce: number;
  /** Kite: force when too far */
  kiteAttractionForce: number;
  /** Weave amplitude (side-to-side) */
  weaveAmplitude: number;
  /** Weave frequency (cycles per second) */
  weaveFrequency: number;
  /** Strafe: tangential force */
  strafeForce: number;
  /** Boundary margin from screen edge */
  boundaryMargin: number;
  /** Boundary repulsion force */
  boundaryForce: number;
  /** Maximum steering force (force cap) */
  maxSteeringForce: number;
  /** Velocity blending: 0 = instant direction change, 1 = keep old direction */
  velocityBlend: number;
}

// ── Variant behavior profiles ──────────────────────────────────────────────

const CHASER_WEIGHTS: BehaviorWeights = {
  seek: 1.0,
  separation: 0.4,
  dodge: 0.25,
  flank: 0.15,
  kite: 0,
  weave: 0.05,
  strafe: 0.1,
  boundary: 0.6,
};

const VOLATILE_WEIGHTS: BehaviorWeights = {
  seek: 1.3,
  separation: 0.2,
  dodge: 0.1,
  flank: 0,
  kite: 0,
  weave: 0.08,
  strafe: 0,
  boundary: 0.4,
};

const SPLITTER_WEIGHTS: BehaviorWeights = {
  seek: 0.9,
  separation: 0.5,
  dodge: 0.2,
  flank: 0.2,
  kite: 0,
  weave: 0.2,
  strafe: 0.15,
  boundary: 0.5,
};

const ARTILLERY_WEIGHTS: BehaviorWeights = {
  seek: 0.3,
  separation: 0.6,
  dodge: 0.5,
  flank: 0.1,
  kite: 1.0,
  weave: 0.05,
  strafe: 0.4,
  boundary: 0.7,
};

/** Get behavior weights for a given enemy variant */
export function getBehaviorWeights(variant: string): BehaviorWeights {
  switch (variant) {
    case "volatile": return VOLATILE_WEIGHTS;
    case "splitter": return SPLITTER_WEIGHTS;
    case "artillery": return ARTILLERY_WEIGHTS;
    default: return CHASER_WEIGHTS;
  }
}

// ── Steering behaviors ──────────────────────────────────────────────────────

/** Seek: steer toward the player */
function seekForce(enemy: Enemy, playerX: number, playerY: number): SteeringForce {
  const dx = playerX - enemy.x;
  const dy = playerY - enemy.y;
  const dist = Math.hypot(dx, dy) || 1;
  return { fx: dx / dist, fy: dy / dist };
}

/** Separation: push away from nearby enemies to avoid clumping */
function separationForce(
  enemy: Enemy,
  enemies: Enemy[],
  radius: number,
  maxForce: number
): SteeringForce {
  let fx = 0;
  let fy = 0;
  let count = 0;

  for (const other of enemies) {
    if (other === enemy) continue;
    const dx = enemy.x - other.x;
    const dy = enemy.y - other.y;
    const dist = Math.hypot(dx, dy);

    if (dist < radius && dist > 0.1) {
      // Stronger push when closer
      const strength = (1 - dist / radius) * maxForce;
      fx += (dx / dist) * strength;
      fy += (dy / dist) * strength;
      count++;
    }
  }

  if (count > 0) {
    const mag = Math.hypot(fx, fy) || 1;
    return { fx: (fx / mag) * Math.min(mag, maxForce), fy: (fy / mag) * Math.min(mag, maxForce) };
  }
  return { fx: 0, fy: 0 };
}

/** Dodge: detect incoming bullets and steer away from them */
function dodgeForce(
  enemy: Enemy,
  bullets: { x: number; y: number; dx: number; dy: number }[],
  scanRadius: number,
  maxForce: number
): SteeringForce {
  let fx = 0;
  let fy = 0;
  let threats = 0;

  for (const bullet of bullets) {
    // Vector from bullet to enemy
    const toEnemyX = enemy.x - bullet.x;
    const toEnemyY = enemy.y - bullet.y;
    const dist = Math.hypot(toEnemyX, toEnemyY);

    if (dist > scanRadius) continue;

    // Check if bullet is heading toward enemy (dot product)
    const bulletSpeed = Math.hypot(bullet.dx, bullet.dy);
    if (bulletSpeed < 1) continue;

    const bulletDirX = bullet.dx / bulletSpeed;
    const bulletDirY = bullet.dy / bulletSpeed;
    const dot = bulletDirX * toEnemyX + bulletDirY * toEnemyY;

    // Only dodge if bullet is heading toward us (positive dot product)
    if (dot <= 0) continue;

    // Perpendicular dodge direction
    const perpX = -bulletDirY;
    const perpY = bulletDirX;

    // Choose the side that's further from the bullet's path
    const side = perpX * toEnemyX + perpY * toEnemyY;
    const dodgeDir = side >= 0 ? 1 : -1;

    // Stronger dodge when bullet is closer and heading toward us
    const urgency = (1 - dist / scanRadius) * (dot / (dist + 1));
    const strength = Math.min(urgency * maxForce, maxForce);

    fx += perpX * dodgeDir * strength;
    fy += perpY * dodgeDir * strength;
    threats++;
  }

  if (threats > 0) {
    const mag = Math.hypot(fx, fy) || 1;
    return { fx: (fx / mag) * Math.min(mag, maxForce), fy: (fy / mag) * Math.min(mag, maxForce) };
  }
  return { fx: 0, fy: 0 };
}

/** Flank: approach from an angle rather than head-on */
function flankForce(
  enemy: Enemy,
  playerX: number,
  playerY: number,
  angleOffset: number,
  maxForce: number
): SteeringForce {
  const dx = playerX - enemy.x;
  const dy = playerY - enemy.y;
  const dist = Math.hypot(dx, dy) || 1;

  // Angle toward player
  const angle = Math.atan2(dy, dx);
  // Offset angle for flanking
  const flankAngle = angle + angleOffset;

  // Stronger flank force when further away, weaker when close
  const distFactor = Math.min(dist / 200, 1);

  return {
    fx: Math.cos(flankAngle) * maxForce * distFactor,
    fy: Math.sin(flankAngle) * maxForce * distFactor,
  };
}

/** Kite: maintain a desired distance from the player */
function kiteForce(
  enemy: Enemy,
  playerX: number,
  playerY: number,
  desiredDistance: number,
  repulsionForce: number,
  attractionForce: number
): SteeringForce {
  const dx = playerX - enemy.x;
  const dy = playerY - enemy.y;
  const dist = Math.hypot(dx, dy) || 1;
  const nx = dx / dist;
  const ny = dy / dist;

  if (dist < desiredDistance * 0.7) {
    // Too close - push away strongly
    const urgency = 1 - (dist / (desiredDistance * 0.7));
    return { fx: -nx * repulsionForce * urgency, fy: -ny * repulsionForce * urgency };
  } else if (dist > desiredDistance * 1.3) {
    // Too far - pull toward gently
    return { fx: nx * attractionForce, fy: ny * attractionForce };
  } else if (dist < desiredDistance) {
    // Slightly close - push away gently
    const ratio = (desiredDistance - dist) / desiredDistance;
    return { fx: -nx * repulsionForce * ratio * 0.5, fy: -ny * repulsionForce * ratio * 0.5 };
  } else {
    // Slightly far - pull toward gently
    const ratio = (dist - desiredDistance) / desiredDistance;
    return { fx: nx * attractionForce * ratio * 0.5, fy: ny * attractionForce * ratio * 0.5 };
  }
}

/** Weave: sinusoidal side-to-side movement for unpredictability */
function weaveForce(
  enemy: Enemy,
  playerX: number,
  playerY: number,
  time: number,
  amplitude: number,
  frequency: number
): SteeringForce {
  // Use enemy position as phase offset so different enemies weave differently
  const phase = (enemy.x * 0.01 + enemy.y * 0.01) + time * frequency * TAU;
  const wave = Math.sin(phase) * amplitude;

  // Perpendicular to the direction toward the player
  const dx = playerX - enemy.x;
  const dy = playerY - enemy.y;
  const dist = Math.hypot(dx, dy) || 1;

  // Perpendicular direction
  const perpX = -dy / dist;
  const perpY = dx / dist;

  return { fx: perpX * wave, fy: perpY * wave };
}

/** Strafe: circle around the player */
function strafeForce(
  enemy: Enemy,
  playerX: number,
  playerY: number,
  force: number
): SteeringForce {
  const dx = playerX - enemy.x;
  const dy = playerY - enemy.y;
  const dist = Math.hypot(dx, dy) || 1;

  // Tangential direction (perpendicular to line toward player)
  const dir = enemy.strafeDir ?? 1;
  const perpX = (-dy / dist) * dir;
  const perpY = (dx / dist) * dir;

  // Stronger strafe when at medium range
  const distFactor = dist > 50 ? Math.min(dist / 150, 1) : dist / 50;

  return { fx: perpX * force * distFactor, fy: perpY * force * distFactor };
}

/** Boundary avoidance: push away from screen edges */
function boundaryForce(
  enemy: Enemy,
  canvasWidth: number,
  canvasHeight: number,
  margin: number,
  force: number
): SteeringForce {
  let fx = 0;
  let fy = 0;

  if (enemy.x < margin) {
    fx += force * (1 - enemy.x / margin);
  } else if (enemy.x > canvasWidth - margin) {
    fx -= force * (1 - (canvasWidth - enemy.x) / margin);
  }

  if (enemy.y < margin) {
    fy += force * (1 - enemy.y / margin);
  } else if (enemy.y > canvasHeight - margin) {
    fy -= force * (1 - (canvasHeight - enemy.y) / margin);
  }

  return { fx, fy };
}

// ── Main AI update ──────────────────────────────────────────────────────────

/**
 * Compute the desired velocity for an enemy using steering behaviors.
 * Returns the desired velocity vector (not a force - already scaled by speed).
 */
export function computeEnemyVelocity(
  enemy: Enemy,
  state: GameState,
  canvasWidth: number,
  canvasHeight: number,
  dt: number
): { vx: number; vy: number } {
  const weights = getBehaviorWeights(enemy.variant);
  const aiTuning = getTuning().ai;

  // Update AI timer
  if (enemy.aiTimer === undefined) enemy.aiTimer = 0;
  enemy.aiTimer += dt;

  // Periodically change strafe direction for more organic movement
  if (enemy.strafeDir === undefined) enemy.strafeDir = Math.random() < 0.5 ? 1 : -1;
  if (enemy.aiTimer > 2 + Math.random() * 3) {
    enemy.strafeDir = enemy.strafeDir === 1 ? -1 : 1;
    enemy.aiTimer = 0;
  }

  const playerX = state.player.x;
  const playerY = state.player.y;

  // Compute individual steering forces
  const seek = seekForce(enemy, playerX, playerY);
  const separation = separationForce(
    enemy,
    state.enemies,
    aiTuning.separationRadius,
    aiTuning.separationForce
  );
  const dodge = dodgeForce(
    enemy,
    state.bullets,
    aiTuning.dodgeScanRadius,
    aiTuning.dodgeForce
  );
  const flank = flankForce(enemy, playerX, playerY, aiTuning.flankAngle, aiTuning.flankForce);
  const kite = kiteForce(
    enemy,
    playerX,
    playerY,
    aiTuning.kiteDesiredDistance,
    aiTuning.kiteRepulsionForce,
    aiTuning.kiteAttractionForce
  );
  const weave = weaveForce(enemy, playerX, playerY, state.time, aiTuning.weaveAmplitude, aiTuning.weaveFrequency);
  const strafe = strafeForce(enemy, playerX, playerY, aiTuning.strafeForce);
  const boundary = boundaryForce(
    enemy,
    canvasWidth,
    canvasHeight,
    aiTuning.boundaryMargin,
    aiTuning.boundaryForce
  );

  // Combine forces with weights
  let totalFx =
    seek.fx * weights.seek +
    separation.fx * weights.separation +
    dodge.fx * weights.dodge +
    flank.fx * weights.flank +
    kite.fx * weights.kite +
    weave.fx * weights.weave +
    strafe.fx * weights.strafe +
    boundary.fx * weights.boundary;

  let totalFy =
    seek.fy * weights.seek +
    separation.fy * weights.separation +
    dodge.fy * weights.dodge +
    flank.fy * weights.flank +
    kite.fy * weights.kite +
    weave.fy * weights.weave +
    strafe.fy * weights.strafe +
    boundary.fy * weights.boundary;

  // Cap total steering force
  const totalMag = Math.hypot(totalFx, totalFy);
  if (totalMag > aiTuning.maxSteeringForce) {
    const scale = aiTuning.maxSteeringForce / totalMag;
    totalFx *= scale;
    totalFy *= scale;
  }

  // Normalize to get direction, then scale by enemy speed
  const dirMag = Math.hypot(totalFx, totalFy) || 1;
  const targetVx = (totalFx / dirMag) * enemy.speed;
  const targetVy = (totalFy / dirMag) * enemy.speed;

  // Blend with current velocity for smooth movement
  const blend = aiTuning.velocityBlend;
  const currentVx = enemy.vx ?? 0;
  const currentVy = enemy.vy ?? 0;

  return {
    vx: currentVx * blend + targetVx * (1 - blend),
    vy: currentVy * blend + targetVy * (1 - blend),
  };
}

/**
 * Update enemy positions and velocities using AI steering.
 * Replaces the simple "move toward player" logic with variant-specific behaviors.
 */
export function updateEnemyAI(
  state: GameState,
  canvasWidth: number,
  canvasHeight: number,
  dt: number
): void {
  const { enemyAcceleration, enemyMaxSpeedRatio } = getTuning().physics;

  state.enemies.forEach((e) => {
    // Initialize velocity if not present
    if (e.vx === undefined) e.vx = 0;
    if (e.vy === undefined) e.vy = 0;

    // Update spawn age
    if (e.spawnAge !== undefined) {
      e.spawnAge += dt;
    }

    // Compute desired velocity from AI
    const desired = computeEnemyVelocity(e, state, canvasWidth, canvasHeight, dt);

    // Apply acceleration toward desired velocity
    e.vx += (desired.vx - e.vx) * enemyAcceleration * dt;
    e.vy += (desired.vy - e.vy) * enemyAcceleration * dt;

    // Clamp speed
    const currentSpeed = Math.hypot(e.vx, e.vy);
    const maxSpeed = e.speed * enemyMaxSpeedRatio;
    if (currentSpeed > maxSpeed) {
      const scale = maxSpeed / currentSpeed;
      e.vx *= scale;
      e.vy *= scale;
    }

    // Update position
    e.x += e.vx * dt;
    e.y += e.vy * dt;
  });
}
