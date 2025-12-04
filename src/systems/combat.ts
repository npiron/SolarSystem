import type { Bullet, Canvas, Enemy, GameState, EnemyProjectile } from "../types/index.ts";
import { getTuning } from "../config/tuning.ts";
import { CELL_SIZE, TAU } from "../config/constants.ts";
import { addFloatingText, registerFragmentGain } from "./hud.ts";

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

function fire(state: GameState): void {
  const target = nearestEnemy(state);
  const count = Math.max(1, state.player.projectiles);
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
      pierce: state.player.pierce
    };
    state.bullets.push(bullet);
  }
}

/**
 * Orbit weapon: fires projectiles in a circular pattern around the player
 */
function fireOrbit(state: GameState): void {
  const { maxSpeed, maxLifetime } = getTuning().bullet;
  const { maxBullets } = getTuning().fx;

  const count = Math.max(1, state.player.orbitProjectiles);
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
      pierce: state.player.pierce
    };
    state.bullets.push(bullet);
  }
}

export function updateCombat(state: GameState, dt: number, canvas: Canvas): void {
  state.player.fireTimer -= dt;
  state.player.orbitTimer -= dt;

  const bulletTuning = getTuning().bullet;
  const orbitTuning = getTuning().orbit;

  // Spin speed linked to bullet speed with tuning baseline
  const effectiveBulletSpeed = Math.min(state.player.bulletSpeed, bulletTuning.maxSpeed);
  const bulletSpeedFactor = effectiveBulletSpeed / orbitTuning.spinSpeedBulletBaseline;
  const spinSpeed = orbitTuning.spinSpeedBase * bulletSpeedFactor;
  state.player.spin = (state.player.spin + dt * spinSpeed) % TAU;

  // Update orbital orbs visual positions
  state.orbitalOrbs = [];
  const orbitCount = Math.max(0, state.player.orbitProjectiles);
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

  // Primary weapon: shotgun
  if (state.player.fireTimer <= 0) {
    fire(state);
    state.player.fireTimer = state.player.fireDelay;
  }

  // Secondary weapon: orbit
  if (state.player.orbitTimer <= 0) {
    fireOrbit(state);
    state.player.orbitTimer = state.player.orbitDelay;
  }

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

  state.fragmentsOrbs.forEach((f) => {
    f.life -= dt;
    const dx = state.player.x - f.x;
    const dy = state.player.y - f.y;
    const dist = Math.hypot(dx, dy) || 1;
    if (dist < state.player.collectRadius) {
      f.vx += (dx / dist) * attractionSpeed * dt;
      f.vy += (dy / dist) * attractionSpeed * dt;
    }
    f.x += f.vx * dt;
    f.y += f.vy * dt;
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

  state.enemies.forEach((e) => {
    const angle = Math.atan2(state.player.y - e.y, state.player.x - e.x);
    e.x += Math.cos(angle) * e.speed * dt;
    e.y += Math.sin(angle) * e.speed * dt;
  });

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

  state.enemies = state.enemies.filter((e) => {
    if (e.hp <= 0) {
      const fragReward = e.reward * 0.35;
      state.resources.essence += e.reward;
      state.runStats.kills += 1;
      state.runStats.essence += e.reward;
      const { maxFragments } = getTuning().fx;
      if (state.fragmentsOrbs.length < maxFragments) {
        state.fragmentsOrbs.push({
          x: e.x,
          y: e.y,
          value: fragReward,
          vx: (Math.random() - 0.5) * 30,
          vy: (Math.random() - 0.5) * 30,
          life: 12
        });
      } else {
        registerFragmentGain(state, fragReward, e.x, e.y, true);
      }
      return false;
    }
    return true;
  });

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

    // Move boss toward player
    const angle = Math.atan2(state.player.y - boss.y, state.player.x - boss.x);
    boss.x += Math.cos(angle) * boss.speed * dt;
    boss.y += Math.sin(angle) * boss.speed * dt;

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
