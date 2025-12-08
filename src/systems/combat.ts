import type { Bullet, Canvas, Enemy, GameState, EnemyProjectile, LightningBolt, LaserBeam, HomingMissile } from "../types/index.ts";
import type { TuningConfig } from "../config/tuning.ts";
import type { EnemyVariantDefinition } from "../config/enemyVariants.ts";
import { getTuning } from "../config/tuning.ts";
import { CELL_SIZE, TAU } from "../config/constants.ts";
import { addFloatingText, registerFragmentGain } from "./hud.ts";
import { getVariantDefinition } from "../config/enemyVariants.ts";
import { getWeaponDef, getWeaponStats, type WeaponId } from "../config/weapons.ts";
import { BASE_PLAYER_STATS } from "../config/player.ts";

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
  addFloatingText(state, "BOOM", enemy.x, enemy.y - 8, "#ff1f1f");
  applyExplosionImpulse(state, enemy.x, enemy.y, radius);
}

function applyExplosionImpulse(state: GameState, originX: number, originY: number, radius: number): void {
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

function handleEnemyDeath(state: GameState, enemy: Enemy, spawned: Enemy[]): void {
  state.resources.essence += enemy.reward;
  state.runStats.kills += 1;
  state.runStats.essence += enemy.reward;

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

function fire(state: GameState): void {
  if (!isWeaponUnlocked(state, 'mainGun')) return;

  const level = getWeaponLevel(state, 'mainGun');
  const def = getWeaponDef('mainGun');
  const stats = getWeaponStats(def, level);

  const target = nearestEnemy(state);
  // Main weapon count: combine base stats, weapon upgrades, and player bonuses
  // state.player.projectiles includes base (1) + talents
  // stats.projectiles includes base (1) + weapon levels
  // We combine the bonuses from both sources
  // NOTE: getGlobalMultipliers uses state.player.projectiles VS BASE, so let's stick to the existing logic 
  // which works fine, but we MUST apply damageMult.

  const { damageMult } = getGlobalMultipliers(state);

  const weaponStatsProjectiles = stats.projectiles ?? 1;
  const playerBonus = Math.max(0, state.player.projectiles - 1);
  const weaponBonus = Math.max(0, weaponStatsProjectiles - 1);
  const count = 1 + playerBonus + weaponBonus;

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
      damage: stats.damage * damageMult // Apply global damage multiplier
    };
    state.bullets.push(bullet);
  }
}

/**
 * Helper to get global multipliers from player state upgrades
 */
function getGlobalMultipliers(state: GameState) {
  return {
    damageMult: state.player.damage / BASE_PLAYER_STATS.damage,
    rangeMult: state.player.range / BASE_PLAYER_STATS.range,
    // For cooldown, we want the ratio of current/base (e.g. 0.5/1.0 = 0.5x delay)
    // Be careful not to divide by zero if base is 0
    cooldownMult: BASE_PLAYER_STATS.fireDelay > 0 ? state.player.fireDelay / BASE_PLAYER_STATS.fireDelay : 1.0,
    // Additive projectile bonus
    extraProjectiles: Math.max(0, state.player.projectiles - BASE_PLAYER_STATS.projectiles)
  };
}

/**
 * Orbit weapon: fires projectiles in a circular pattern around the player
 */
function fireOrbit(state: GameState): void {
  if (!isWeaponUnlocked(state, 'circularBlast')) return;

  const level = getWeaponLevel(state, 'circularBlast');
  const def = getWeaponDef('circularBlast');
  const stats = getWeaponStats(def, level);
  const { damageMult } = getGlobalMultipliers(state);

  const { maxSpeed, maxLifetime } = getTuning().bullet;
  const { maxBullets } = getTuning().fx;
  const orbitConfig = getTuning().orbit;

  // Use the same calculation as visuals to ensure what you see is what you hit with
  // Note: calculateOrbitProjectiles already uses state.player.projectiles, so scaling is handled there
  const count = calculateOrbitProjectiles(state, orbitConfig);

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
      pierce: state.player.pierce, // Pierce upgrade applies globally
      damage: stats.damage * damageMult // Apply global damage multiplier
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
  const { damageMult, rangeMult, extraProjectiles } = getGlobalMultipliers(state);

  const range = (stats.range ?? 200) * rangeMult;
  // Extra projectiles increase chain count for lightning
  const chainCount = (stats.chainCount ?? 2) + extraProjectiles;

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
  primaryTarget.hp -= stats.damage * damageMult;
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
      if (dist < nearestDist && dist < range * 0.8) { // Chain range slightly shorter
        nearestDist = dist;
        nearest = e;
      }
    }

    if (!nearest) break;

    // Apply chain damage (reduced)
    const chainDamage = (stats.damage * damageMult) * 0.6;
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
  const { damageMult, rangeMult, extraProjectiles } = getGlobalMultipliers(state);

  // Clear old beams
  state.laserBeams = [];

  const range = (stats.range ?? 250) * rangeMult;

  // Find multiple targets based on extra projectiles
  const beamCount = 1 + extraProjectiles;

  // Get all enemies in range sorted by distance
  // Optimization: Pre-filter by range square
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
      // Treat boss as a high priority target (hack: dist 0 to always be first)
      candidates.unshift({ enemy: state.currentBoss as unknown as Enemy, distSq: 0 });
    }
  }

  // Sort by distance (closest first)
  candidates.sort((a, b) => a.distSq - b.distSq);

  const targets = candidates.slice(0, beamCount).map(c => c.enemy);

  for (const target of targets) {
    const dx = target.x - state.player.x;
    const dy = target.y - state.player.y;
    const dist = Math.sqrt(candidates.find(c => c.enemy === target)?.distSq || 1); // potential slight inefficiency but ok for low counts

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
      // Optimization: simple bbox check first
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

    // Boss hit check (if active)
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

/**
 * Missiles weapon: fire homing missiles toward enemies
 */
function fireMissiles(state: GameState): void {
  if (!isWeaponUnlocked(state, 'missiles')) return;
  if (state.enemies.length === 0 && !state.bossActive) return;

  const level = getWeaponLevel(state, 'missiles');
  const def = getWeaponDef('missiles');
  const stats = getWeaponStats(def, level);
  const { damageMult, extraProjectiles } = getGlobalMultipliers(state);

  const count = Math.max(1, Math.floor((stats.projectiles ?? 1) + extraProjectiles));

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
      damage: stats.damage * damageMult
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

  // Black hole fusion - fragments merge when very close
  const fusionRadius = 20; // Radius for fusion
  const fusedFragments = new Set<number>();

  for (let i = 0; i < state.fragmentsOrbs.length; i++) {
    if (fusedFragments.has(i)) continue;
    const f1 = state.fragmentsOrbs[i];

    for (let j = i + 1; j < state.fragmentsOrbs.length; j++) {
      if (fusedFragments.has(j)) continue;
      const f2 = state.fragmentsOrbs[j];

      const dx = f2.x - f1.x;
      const dy = f2.y - f1.y;
      const dist = Math.hypot(dx, dy);

      // Fusion - merge into larger black hole!
      if (dist < fusionRadius) {
        f1.value += f2.value; // Combine mass
        // Transfer momentum (conservation)
        const totalMass = 2;
        f1.vx = (f1.vx + f2.vx) / totalMass;
        f1.vy = (f1.vy + f2.vy) / totalMass;
        fusedFragments.add(j);

        // Visual effect for fusion
        if (!state.visualsLow) {
          addFloatingText(state, "⚫", (f1.x + f2.x) / 2, (f1.y + f2.y) / 2 - 10, "#a855f7", 1.5);
        }
      }
    }
  }

  state.fragmentsOrbs.forEach((f, index) => {
    if (fusedFragments.has(index)) {
      f.life = -1; // Mark absorbed fragments for deletion
      return;
    }

    f.life -= dt;
    const dx = state.player.x - f.x;
    const dy = state.player.y - f.y;
    const dist = Math.hypot(dx, dy) || 1;

    // Apply gravity (downward force)
    f.vy += fragmentGravity * dt;

    // Apply air drag to slow fragments over time (optimized linear approximation)
    f.vx *= dragFactor;
    f.vy *= dragFactor;

    // Attraction force when in collection radius - TOUJOURS actif pour voir les fragments arriver
    const attractCollectDist = state.player.radius + 6 + state.player.collectRadius * collectDistanceMultiplier;
    if (dist < attractCollectDist) {
      // Courbe d'accélération progressive - effet "trou noir"
      // Plus le fragment est proche, plus il accélère fort !
      const distanceRatio = dist / attractCollectDist; // 1.0 = loin, 0.0 = très proche
      const accelerationCurve = 1 + (1 - distanceRatio) ** 2.5 * 4; // Accélération exponentielle

      const attractionForce = attractionSpeed * accelerationCurve * dt;
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

    // Collection quand le fragment arrive près du héros (rayon raisonnable)
    const pickupRadius = state.player.radius + 50; // Rayon de ~74px - collecte plus facile
    if (dist < pickupRadius) {
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
            if (crit) {
              addFloatingText(state, `💥 ${Math.round(dmg)}`, enemy.x, enemy.y - 4, "#f472b6", 2.2);
            }
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
          if (crit) {
            addFloatingText(state, `💥 ${Math.round(dmg)}`, boss.x, boss.y - 4, "#f472b6", 2.2);
          }
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
