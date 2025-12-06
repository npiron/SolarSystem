import type { Bullet, Canvas, Enemy, GameState, EnemyProjectile, LightningBolt, LaserBeam, HomingMissile } from "../types/index.ts";
import type { TuningConfig } from "../config/tuning.ts";
import type { EnemyVariantDefinition } from "../config/enemyVariants.ts";
import { getTuning } from "../config/tuning.ts";
import { CELL_SIZE, TAU } from "../config/constants.ts";
import { addFloatingText, registerFragmentGain } from "./hud.ts";
import { getVariantDefinition } from "../config/enemyVariants.ts";
import { getWeaponDef, getWeaponStats, type WeaponId } from "../config/weapons.ts";

// Helper to check if a weapon is unlocked
function isWeaponUnlocked(state: GameState, id: WeaponId): boolean {
  const weapon = state.weapons.find(w => w.id === id);
  return weapon?.unlocked ?? false;
}

// Helper to get weapon level
function getWeaponLevel(state: GameState, id: WeaponId): number {
  const weapon = state.weapons.find(w => w.id === id);
  return weapon?.level ?? 0;
}

function nearestEnemy(state: GameState): Enemy | { x: number; y: number } | null {
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

function calculateOrbitProjectiles(state: GameState, orbitConfig: TuningConfig["orbit"]): number {
  const bonusProjectiles = Math.max(0, state.player.projectiles - 1) * orbitConfig.projectileScaling;
  const desiredOrbs = state.player.orbitProjectiles + bonusProjectiles;
  const roundedOrbs = Math.max(1, Math.round(desiredOrbs));
  return Math.min(orbitConfig.maxOrbitProjectiles, roundedOrbs);
}

function applyExplosionDamage(
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
  addFloatingText(state, "BOOM", enemy.x, enemy.y - 8, "#fb7185");
}

function spawnSplitChildren(
  state: GameState,
  enemy: Enemy,
  variantDef: EnemyVariantDefinition,
  spawned: Enemy[]
): void {
  const split = variantDef.split;
  if (!split) return;

  const generation = (enemy.generation ?? 0) + 1;
  if (generation > split.maxGenerations) return;

  for (let i = 0; i < split.count; i++) {
    const angle = Math.random() * TAU;
    const offset = split.spread * (0.8 + Math.random() * 0.6);
    const childX = enemy.x + Math.cos(angle) * offset;
    const childY = enemy.y + Math.sin(angle) * offset;
    const hp = Math.max(6, enemy.maxHp * split.hpScale);
    const radius = Math.max(4, enemy.radius * split.radiusScale);
    const reward = Math.max(0.5, enemy.reward * split.rewardScale);

    const child: Enemy = {
      x: childX,
      y: childY,
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

function handleEnemyDeath(state: GameState, enemy: Enemy, spawned: Enemy[]): void {
  const variantDef = getVariantDefinition(enemy.variant);
  applyExplosionDamage(state, enemy, variantDef);
  spawnSplitChildren(state, enemy, variantDef, spawned);

  const fragReward = enemy.reward * 0.35;
  state.resources.essence += enemy.reward;
  state.runStats.kills += 1;
  state.runStats.essence += enemy.reward;
  const { maxFragments } = getTuning().fx;
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
}

function fire(state: GameState): void {
  if (!isWeaponUnlocked(state, 'mainGun')) return;

  const level = getWeaponLevel(state, 'mainGun');
  const def = getWeaponDef('mainGun');
  const stats = getWeaponStats(def, level);

  const target = nearestEnemy(state);
  const count = Math.max(1, stats.projectiles ?? state.player.projectiles);
  // Base direction: toward nearest enemy, or forward if no enemies
  const baseAngle = target
    ? Math.atan2(target.y - state.player.y, target.x - state.player.x)
    : state.time * 0.9;

  const { maxSpeed, maxLifetime } = getTuning().bullet;
  const { maxBullets } = getTuning().fx;

  const bulletSpeed = Math.min(state.player.bulletSpeed, maxSpeed);
  const lifetime = Math.min(1.2 * state.player.range, maxLifetime);

  // Shotgun spread: all projectiles fire in a cone toward the target
  const spreadAngle = Math.PI / 4; // 45 degrees total spread (like a shotgun)

  for (let i = 0; i < count; i++) {
    if (state.bullets.length >= maxBullets) break;
    // Spread projectiles evenly within the cone, centered on baseAngle
    const offset = count > 1 ? (i / (count - 1) - 0.5) * spreadAngle : 0;
    const angle = baseAngle + offset;
    const bullet: Bullet = {
      x: state.player.x,
      y: state.player.y,
      dx: Math.cos(angle) * bulletSpeed,
      dy: Math.sin(angle) * bulletSpeed,
      life: lifetime,
      pierce: state.player.pierce,
      damage: stats.damage // Use weapon damage
    };
    state.bullets.push(bullet);
  }
}

/**
 * Orbit weapon: fires projectiles in a circular pattern around the player
 */
function fireOrbit(state: GameState): void {
  if (!isWeaponUnlocked(state, 'circularBlast')) return;

  const level = getWeaponLevel(state, 'circularBlast');
  const def = getWeaponDef('circularBlast');
  const stats = getWeaponStats(def, level);

  const { maxSpeed, maxLifetime } = getTuning().bullet;
  const { maxBullets } = getTuning().fx;

  const count = Math.max(1, stats.projectiles ?? 8);
  const bulletSpeed = Math.min(state.player.bulletSpeed * 0.8, maxSpeed);
  const lifetime = Math.min(1.5 * state.player.range, maxLifetime);

  for (let i = 0; i < count; i++) {
    if (state.bullets.length >= maxBullets) break;
    // Evenly distribute projectiles around the player
    const angle = (TAU * i) / count + state.player.spin;
    const bullet: Bullet = {
      x: state.player.x,
      y: state.player.y,
      dx: Math.cos(angle) * bulletSpeed,
      dy: Math.sin(angle) * bulletSpeed,
      life: lifetime,
      pierce: state.player.pierce,
      damage: stats.damage
    };
    state.bullets.push(bullet);
  }
}

/**
 * Lightning weapon: strikes random enemy and chains to nearby enemies
 */
function fireLightning(state: GameState): void {
  if (!isWeaponUnlocked(state, 'lightning')) return;
  if (state.enemies.length === 0) return;

  const level = getWeaponLevel(state, 'lightning');
  const def = getWeaponDef('lightning');
  const stats = getWeaponStats(def, level);

  const range = stats.range ?? 200;
  const chainCount = stats.chainCount ?? 2;

  // Find enemies within range
  const inRange = state.enemies.filter(e => {
    const dx = e.x - state.player.x;
    const dy = e.y - state.player.y;
    return Math.hypot(dx, dy) <= range;
  });

  if (inRange.length === 0) return;

  // Pick random target
  const primaryTarget = inRange[Math.floor(Math.random() * inRange.length)];
  const hitEnemies: Enemy[] = [primaryTarget];

  // Apply damage to primary target
  primaryTarget.hp -= stats.damage;
  primaryTarget.hitThisFrame = true;

  // Create lightning bolt visual
  const segments: { x: number; y: number }[] = [];
  let lastX = state.player.x;
  let lastY = state.player.y;

  // Generate zigzag path to primary target
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

  // Chain to nearby enemies
  let currentX = primaryTarget.x;
  let currentY = primaryTarget.y;

  for (let c = 0; c < chainCount && hitEnemies.length < inRange.length; c++) {
    // Find nearest un-hit enemy
    let nearest: Enemy | null = null;
    let nearestDist = Infinity;

    for (const e of state.enemies) {
      if (hitEnemies.includes(e)) continue;
      const dx = e.x - currentX;
      const dy = e.y - currentY;
      const dist = Math.hypot(dx, dy);
      if (dist < nearestDist && dist < range * 0.6) {
        nearestDist = dist;
        nearest = e;
      }
    }

    if (!nearest) break;

    // Apply chain damage (reduced)
    const chainDamage = stats.damage * 0.6;
    nearest.hp -= chainDamage;
    nearest.hitThisFrame = true;
    hitEnemies.push(nearest);

    // Add chain segment
    segments.push({ x: nearest.x, y: nearest.y });
    currentX = nearest.x;
    currentY = nearest.y;
  }

  // Add visual bolt
  state.lightningBolts.push({
    startX: state.player.x,
    startY: state.player.y,
    segments,
    life: 0.2
  });

  addFloatingText(state, "⚡", primaryTarget.x, primaryTarget.y - 10, "#00ffff");
}

/**
 * Laser weapon: continuous beam toward nearest enemy
 */
function updateLaser(state: GameState, dt: number): void {
  if (!isWeaponUnlocked(state, 'laser')) return;

  const level = getWeaponLevel(state, 'laser');
  const def = getWeaponDef('laser');
  const stats = getWeaponStats(def, level);

  // Clear old beams
  state.laserBeams = [];

  const target = nearestEnemy(state);
  if (!target) return;

  const dx = target.x - state.player.x;
  const dy = target.y - state.player.y;
  const dist = Math.hypot(dx, dy);

  if (dist > (stats.range ?? 250)) return;

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
  const dps = stats.damage;

  for (const enemy of state.enemies) {
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

  // Also damage boss if on beam
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

/**
 * Missiles weapon: fire homing missiles toward enemies
 */
function fireMissiles(state: GameState): void {
  if (!isWeaponUnlocked(state, 'missiles')) return;
  if (state.enemies.length === 0 && !state.bossActive) return;

  const level = getWeaponLevel(state, 'missiles');
  const def = getWeaponDef('missiles');
  const stats = getWeaponStats(def, level);

  const count = Math.max(1, Math.floor(stats.projectiles ?? 1));

  for (let i = 0; i < count; i++) {
    // Pick a random target
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
      targetId: i, // Just an identifier
      life: 4,
      damage: stats.damage
    };

    state.missiles.push(missile);
  }
}

/**
 * Update homing missiles movement and collisions
 */
function updateMissiles(state: GameState, dt: number): void {
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

export function updateCombat(state: GameState, dt: number, canvas: Canvas): void {
  state.player.fireTimer -= dt;
  state.player.orbitTimer -= dt;

  const bulletTuning = getTuning().bullet;
  const orbitTuning = getTuning().orbit;
  const orbitCount = calculateOrbitProjectiles(state, orbitTuning);

  // Spin speed linked to bullet speed with tuning baseline
  const effectiveBulletSpeed = Math.min(state.player.bulletSpeed, bulletTuning.maxSpeed);
  const bulletSpeedFactor = effectiveBulletSpeed / orbitTuning.spinSpeedBulletBaseline;
  const spinSpeed = orbitTuning.spinSpeedBase * bulletSpeedFactor;
  state.player.spin = (state.player.spin + dt * spinSpeed) % TAU;

  // Update orbital orbs visual positions
  state.orbitalOrbs = [];
  if (orbitCount > 0) {
    const orbitBaseDistance = Math.min(orbitTuning.baseDistance * state.player.range, orbitTuning.maxDistance);
    const orbsPerRing = Math.max(1, Math.floor(orbitTuning.maxOrbsPerRing));
    const ringCount = Math.ceil(orbitCount / orbsPerRing);

    for (let ringIndex = 0; ringIndex < ringCount; ringIndex++) {
      const ringOrbs = ringIndex === ringCount - 1 ? orbitCount - orbsPerRing * (ringCount - 1) : orbsPerRing;
      const ringDistance = Math.min(
        orbitBaseDistance + ringIndex * orbitTuning.ringSpacing,
        orbitTuning.maxDistance
      );
      const spinDirection = ringIndex % 2 === 0 ? 1 : -1;
      const angleOffset = ringIndex * orbitTuning.ringAngleOffset;

      for (let i = 0; i < ringOrbs; i++) {
        const angle = (TAU * i) / ringOrbs + state.player.spin * spinDirection + angleOffset;
        state.orbitalOrbs.push({
          angle,
          distance: ringDistance
        });
      }
    }
  }

  // Primary weapon: Main Gun
  if (state.player.fireTimer <= 0 && isWeaponUnlocked(state, 'mainGun')) {
    const def = getWeaponDef('mainGun');
    const stats = getWeaponStats(def, getWeaponLevel(state, 'mainGun'));
    fire(state);
    state.player.fireTimer = stats.fireDelay;
  }

  // Secondary weapon: Circular Blast (orbit)
  if (state.player.orbitTimer <= 0 && isWeaponUnlocked(state, 'circularBlast')) {
    const def = getWeaponDef('circularBlast');
    const stats = getWeaponStats(def, getWeaponLevel(state, 'circularBlast'));
    fireOrbit(state);
    state.player.orbitTimer = stats.fireDelay;
  }

  // Lightning weapon
  state.lightningTimer -= dt;
  if (state.lightningTimer <= 0 && isWeaponUnlocked(state, 'lightning')) {
    const def = getWeaponDef('lightning');
    const stats = getWeaponStats(def, getWeaponLevel(state, 'lightning'));
    fireLightning(state);
    state.lightningTimer = stats.fireDelay;
  }

  // Laser weapon (continuous)
  updateLaser(state, dt);

  // Update lightning bolt visuals
  state.lightningBolts = state.lightningBolts.filter(b => {
    b.life -= dt;
    return b.life > 0;
  });

  // Update laser beam visuals
  state.laserBeams = state.laserBeams.filter(b => {
    b.life -= dt;
    return b.life > 0;
  });

  // Missiles weapon
  state.missileTimer -= dt;
  if (state.missileTimer <= 0 && isWeaponUnlocked(state, 'missiles')) {
    const def = getWeaponDef('missiles');
    const stats = getWeaponStats(def, getWeaponLevel(state, 'missiles'));
    fireMissiles(state);
    state.missileTimer = stats.fireDelay;
  }

  // Update homing missiles
  updateMissiles(state, dt);

  state.player.hp = Math.min(state.player.maxHp, state.player.hp + state.player.regen * dt);

  const { offscreenPadding } = getTuning().bullet;
  const { maxBullets } = getTuning().fx;

  state.bullets.forEach((b) => {
    b.x += b.dx * dt;
    b.y += b.dy * dt;
    b.life -= dt;

    if (
      b.x < -offscreenPadding ||
      b.x > canvas.width + offscreenPadding ||
      b.y < -offscreenPadding ||
      b.y > canvas.height + offscreenPadding
    ) {
      b.life = -1;
    }
  });
  if (state.bullets.length > maxBullets) {
    state.bullets.splice(0, state.bullets.length - maxBullets);
  }
  state.bullets = state.bullets.filter((b) => b.life > 0);

  const { attractionSpeed, collectDistanceMultiplier } = getTuning().fragments;
  const { maxFragments } = getTuning().fx;
  const { fragmentGravity, fragmentDrag, fragmentBounce } = getTuning().physics;
  
  // Pre-calculate drag factor for better performance (per-frame constant)
  const dragFactor = 1 - (1 - fragmentDrag) * dt * 60;

  state.fragmentsOrbs.forEach((f) => {
    f.life -= dt;
    const dx = state.player.x - f.x;
    const dy = state.player.y - f.y;
    const dist = Math.hypot(dx, dy) || 1;
    
    // Apply gravity (downward force)
    f.vy += fragmentGravity * dt;
    
    // Apply air drag to slow fragments over time (optimized linear approximation)
    f.vx *= dragFactor;
    f.vy *= dragFactor;
    
    // Attraction force when in collection radius
    if (dist < state.player.collectRadius) {
      const attractionForce = attractionSpeed * dt;
      f.vx += (dx / dist) * attractionForce;
      f.vy += (dy / dist) * attractionForce;
    }
    
    // Update position
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    
    // Ground bounce - prevent fragments from falling off screen
    const groundY = canvas.height - 30;
    if (f.y > groundY) {
      f.y = groundY;
      f.vy = -Math.abs(f.vy) * fragmentBounce; // Bounce with energy loss
      f.vx *= 0.9; // Friction on ground contact
    }
    
    // Wall bounces for more dynamic physics
    const leftWall = 30;
    const rightWall = canvas.width - 30;
    if (f.x < leftWall) {
      f.x = leftWall;
      f.vx = Math.abs(f.vx) * fragmentBounce;
    } else if (f.x > rightWall) {
      f.x = rightWall;
      f.vx = -Math.abs(f.vx) * fragmentBounce;
    }
    
    const collectDist = state.player.radius + 6 + state.player.collectRadius * collectDistanceMultiplier;
    if (dist < collectDist) {
      registerFragmentGain(state, f.value, f.x, f.y - 6);
      f.life = -1;
    }
  });
  state.fragmentsOrbs = state.fragmentsOrbs.filter((f) => f.life > 0);

  if (state.fragmentsOrbs.length > maxFragments) {
    const overflow = state.fragmentsOrbs.splice(0, state.fragmentsOrbs.length - maxFragments);
    const merged = overflow.reduce((sum, f) => sum + f.value, 0);
    registerFragmentGain(state, merged, state.player.x, state.player.y - 10, true);
  }

  const newEnemyProjectiles: EnemyProjectile[] = [];
  const { enemyAcceleration, enemyMaxSpeedRatio } = getTuning().physics;
  
  state.enemies.forEach((e) => {
    // Initialize velocity if not present (for existing enemies)
    if (e.vx === undefined) e.vx = 0;
    if (e.vy === undefined) e.vy = 0;
    
    const angle = Math.atan2(state.player.y - e.y, state.player.x - e.x);
    const variantDef = getVariantDefinition(e.variant);

    if (e.variant === "artillery" && variantDef.projectile) {
      const distance = Math.hypot(state.player.x - e.x, state.player.y - e.y);
      const desiredRange = 240;
      const approachDirection = distance > desiredRange ? 1 : -0.65;
      
      // Target velocity for artillery
      const targetVx = Math.cos(angle) * e.speed * approachDirection;
      const targetVy = Math.sin(angle) * e.speed * approachDirection;
      
      // Accelerate towards target velocity
      e.vx += (targetVx - e.vx) * enemyAcceleration * dt;
      e.vy += (targetVy - e.vy) * enemyAcceleration * dt;
      
      // Apply velocity with speed clamping
      const currentSpeed = Math.hypot(e.vx, e.vy);
      const maxSpeed = e.speed * enemyMaxSpeedRatio;
      if (currentSpeed > maxSpeed) {
        const scale = maxSpeed / currentSpeed;
        e.vx *= scale;
        e.vy *= scale;
      }
      
      e.x += e.vx * dt;
      e.y += e.vy * dt;

      e.fireTimer -= dt;
      if (e.fireTimer <= 0) {
        const projectileSpeed = variantDef.projectile.speed;
        const projectileDamage = variantDef.projectile.damage * (1 + state.wave * 0.02);
        newEnemyProjectiles.push({
          x: e.x,
          y: e.y,
          dx: Math.cos(angle) * projectileSpeed,
          dy: Math.sin(angle) * projectileSpeed,
          life: variantDef.projectile.life,
          damage: projectileDamage
        });
        e.fireTimer = e.fireDelay;
      }
    } else {
      // Standard chasing behavior with acceleration
      const targetVx = Math.cos(angle) * e.speed;
      const targetVy = Math.sin(angle) * e.speed;
      
      // Accelerate towards target velocity for smooth movement
      e.vx += (targetVx - e.vx) * enemyAcceleration * dt;
      e.vy += (targetVy - e.vy) * enemyAcceleration * dt;
      
      // Apply velocity with speed clamping
      const currentSpeed = Math.hypot(e.vx, e.vy);
      const maxSpeed = e.speed * enemyMaxSpeedRatio;
      if (currentSpeed > maxSpeed) {
        const scale = maxSpeed / currentSpeed;
        e.vx *= scale;
        e.vy *= scale;
      }
      
      e.x += e.vx * dt;
      e.y += e.vy * dt;
    }
  });
  state.enemyProjectiles.push(...newEnemyProjectiles);

  const enemyBuckets = new Map<string, Enemy[]>();
  const bucketKey = (x: number, y: number): string => `${Math.floor(x / CELL_SIZE)},${Math.floor(y / CELL_SIZE)}`;
  const neighborKeys = (x: number, y: number): string[] => {
    const cx = Math.floor(x / CELL_SIZE);
    const cy = Math.floor(y / CELL_SIZE);
    const keys: string[] = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        keys.push(`${cx + dx},${cy + dy}`);
      }
    }
    return keys;
  };

  state.enemies.forEach((enemy) => {
    const key = bucketKey(enemy.x, enemy.y);
    if (!enemyBuckets.has(key)) enemyBuckets.set(key, []);
    enemyBuckets.get(key)!.push(enemy);
  });

  state.enemies.forEach((enemy) => (enemy.hitThisFrame = false));
  state.bullets.forEach((b) => {
    const keys = neighborKeys(b.x, b.y);
    for (const key of keys) {
      const bucket = enemyBuckets.get(key);
      if (!bucket) continue;
      for (const enemy of bucket) {
        const dx = enemy.x - b.x;
        const dy = enemy.y - b.y;
        if (dx * dx + dy * dy < (enemy.radius + 4) ** 2) {
          const crit = Math.random() < state.player.critChance;
          const dmg = crit ? state.player.damage * state.player.critMultiplier : state.player.damage;
          enemy.hp -= dmg;
          enemy.hitThisFrame = true;
          if (!state.visualsLow) {
            if (crit) addFloatingText(state, "CRIT", enemy.x, enemy.y - 4, "#f472b6");
          }
          if (b.pierce > 0) {
            b.pierce -= 1;
          } else {
            b.life = -1;
            return;
          }
        }
      }
    }
  });

  state.bullets = state.bullets.filter((b) => b.life > 0);

  const spawnedEnemies: Enemy[] = [];
  state.enemies = state.enemies.filter((e) => {
    if (e.hp <= 0) {
      handleEnemyDeath(state, e, spawnedEnemies);
      return false;
    }
    return true;
  });
  state.enemies.push(...spawnedEnemies);

  state.enemies.forEach((e) => {
    const dx = e.x - state.player.x;
    const dy = e.y - state.player.y;
    const distSq = dx * dx + dy * dy;
    const radius = e.radius + state.player.radius;
    if (distSq < radius * radius) {
      const { contactDamageBase, contactDamageWaveScale } = getTuning().combat;
      const dmg = contactDamageBase * dt * (1 + state.wave * contactDamageWaveScale) * (1 - state.player.damageReduction);
      state.player.hp -= dmg;
    }
  });

  // Boss combat logic
  if (state.bossActive && state.currentBoss) {
    const boss = state.currentBoss;
    
    // Initialize velocity if not present
    if (boss.vx === undefined) boss.vx = 0;
    if (boss.vy === undefined) boss.vy = 0;

    // Move boss toward player with acceleration (smoother, heavier feeling)
    const angle = Math.atan2(state.player.y - boss.y, state.player.x - boss.x);
    const targetVx = Math.cos(angle) * boss.speed;
    const targetVy = Math.sin(angle) * boss.speed;
    
    // Boss has slower acceleration for more imposing movement
    const bossAcceleration = enemyAcceleration * 0.6;
    boss.vx += (targetVx - boss.vx) * bossAcceleration * dt;
    boss.vy += (targetVy - boss.vy) * bossAcceleration * dt;
    
    // Apply velocity
    boss.x += boss.vx * dt;
    boss.y += boss.vy * dt;

    // Boss fires projectiles
    boss.fireTimer -= dt;
    if (boss.fireTimer <= 0) {
      const projAngle = Math.atan2(state.player.y - boss.y, state.player.x - boss.x);
      const { bossProjectileSpeed, bossProjectileDamage } = getTuning().combat;
      const projectile: EnemyProjectile = {
        x: boss.x,
        y: boss.y,
        dx: Math.cos(projAngle) * bossProjectileSpeed,
        dy: Math.sin(projAngle) * bossProjectileSpeed,
        life: 3.0,
        damage: bossProjectileDamage * (1 + state.wave * 0.05)
      };
      state.enemyProjectiles.push(projectile);
      boss.fireTimer = boss.fireDelay;
    }

    // Check bullet collisions with boss
    state.bullets.forEach((b) => {
      const dx = boss.x - b.x;
      const dy = boss.y - b.y;
      if (dx * dx + dy * dy < (boss.radius + 4) ** 2) {
        const crit = Math.random() < state.player.critChance;
        const dmg = crit ? state.player.damage * state.player.critMultiplier : state.player.damage;
        boss.hp -= dmg;
        if (!state.visualsLow) {
          if (crit) addFloatingText(state, "CRIT", boss.x, boss.y - 4, "#f472b6");
        }
        if (b.pierce > 0) {
          b.pierce -= 1;
        } else {
          b.life = -1;
        }
      }
    });
    state.bullets = state.bullets.filter((b) => b.life > 0);

    // Check boss contact damage
    const bx = boss.x - state.player.x;
    const by = boss.y - state.player.y;
    const bDistSq = bx * bx + by * by;
    const bRadius = boss.radius + state.player.radius;
    if (bDistSq < bRadius * bRadius) {
      const { bossContactDamageBase } = getTuning().combat;
      const dmg = bossContactDamageBase * dt * (1 + state.wave * 0.05) * (1 - state.player.damageReduction);
      state.player.hp -= dmg;
    }

    // Check if boss is defeated
    if (boss.hp <= 0) {
      const fragReward = boss.reward * 0.35;
      state.resources.essence += boss.reward;
      state.runStats.kills += 1;
      state.runStats.essence += boss.reward;
      const { maxFragments } = getTuning().fx;
      if (state.fragmentsOrbs.length < maxFragments) {
        state.fragmentsOrbs.push({
          x: boss.x,
          y: boss.y,
          value: fragReward,
          vx: (Math.random() - 0.5) * 30,
          vy: (Math.random() - 0.5) * 30,
          life: 12
        });
      } else {
        registerFragmentGain(state, fragReward, boss.x, boss.y, true);
      }
      addFloatingText(state, "BOSS DEFEATED!", boss.x, boss.y - 20, "#ffcc00", 2);
      state.currentBoss = null;
      state.bossActive = false;
      state.enemyProjectiles = [];
    }
  }

  // Update enemy projectiles
  state.enemyProjectiles.forEach((p) => {
    p.x += p.dx * dt;
    p.y += p.dy * dt;
    p.life -= dt;

    // Check if projectile is off-screen
    const { offscreenPadding } = getTuning().bullet;
    if (
      p.x < -offscreenPadding ||
      p.x > canvas.width + offscreenPadding ||
      p.y < -offscreenPadding ||
      p.y > canvas.height + offscreenPadding
    ) {
      p.life = -1;
    }

    // Check collision with player
    const dx = p.x - state.player.x;
    const dy = p.y - state.player.y;
    const distSq = dx * dx + dy * dy;
    const hitRadius = state.player.radius + 4;
    if (distSq < hitRadius * hitRadius) {
      const dmg = p.damage * (1 - state.player.damageReduction);
      state.player.hp -= dmg;
      p.life = -1;
    }
  });
  state.enemyProjectiles = state.enemyProjectiles.filter((p) => p.life > 0);

  if (state.player.hp <= 0 && !state.dead) {
    state.dead = true;
    state.running = false;
  }
}
