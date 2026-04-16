import type { Canvas, Enemy, GameState, EnemyProjectile } from "../types/index.ts";
import { getTuning } from "../config/tuning.ts";
import { CELL_SIZE, TAU } from "../config/constants.ts";
import { addFloatingText, registerFragmentGain } from "./hud.ts";
import { playSound } from "./sound.ts";
import { audioManager } from "./audio.ts";
import { getVariantDefinition } from "../config/enemyVariants.ts";
import { getWeaponDef, getWeaponStats } from "../config/weapons.ts";
import { getPlayerStatsFromTuning } from "../config/player.ts";
import { addTrauma } from "../renderer/screenShake.ts";
import { isWeaponUnlocked, getWeaponLevel, nearestEnemy, calculateOrbitProjectiles } from "./combat/helpers.ts";
import { fire, fireOrbit, fireLightning, fireMissiles, getGlobalMultipliers } from "./combat/weapons.ts";
import { updateMissiles, updateLaser } from "./combat/projectiles.ts";
import { handleEnemyDeath } from "./combat/enemies.ts";
import { updateEnemyAI } from "./combat/ai.ts";

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
    // Cap the range influence to prevent orbs from going too far
    const cappedRange = Math.min(state.player.range, 1.5); // Limite à 1.5x max
    const orbitBaseDistance = Math.min(orbitTuning.baseDistance * cappedRange, orbitTuning.maxDistance);
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

  const { cooldownMult } = getGlobalMultipliers(state);

  // Primary weapon: Main Gun
  if (state.player.fireTimer <= 0 && isWeaponUnlocked(state, 'mainGun')) {
    const def = getWeaponDef('mainGun');
    const stats = getWeaponStats(def, getWeaponLevel(state, 'mainGun'));
    fire(state);
    playSound('weaponFire', { volume: 0.12, pitch: 0.9 + Math.random() * 0.2 });
    state.player.fireTimer = stats.fireDelay * cooldownMult;
  }

  // Secondary weapon: Circular Blast (orbit)
  if (state.player.orbitTimer <= 0 && isWeaponUnlocked(state, 'circularBlast')) {
    const def = getWeaponDef('circularBlast');
    const stats = getWeaponStats(def, getWeaponLevel(state, 'circularBlast'));
    fireOrbit(state);
    playSound('weaponFire', { volume: 0.10, pitch: 1.1 + Math.random() * 0.15 });
    state.player.orbitTimer = stats.fireDelay * cooldownMult;
  }

  // Lightning weapon
  state.lightningTimer -= dt;
  if (state.lightningTimer <= 0 && isWeaponUnlocked(state, 'lightning')) {
    const def = getWeaponDef('lightning');
    const stats = getWeaponStats(def, getWeaponLevel(state, 'lightning'));
    fireLightning(state);
    playSound('laser', { volume: 0.10, pitch: 1.3 + Math.random() * 0.2 });
    state.lightningTimer = stats.fireDelay * cooldownMult;
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
    playSound('weaponFire', { volume: 0.14, pitch: 0.7 + Math.random() * 0.15 });
    state.missileTimer = stats.fireDelay * cooldownMult;
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
      // Ultra-subtle musical note
      playSound('collect', { volume: 0.10, pitch: 1.0 });
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

  // Update enemy movement using AI steering behaviors
  updateEnemyAI(state, canvas.width, canvas.height, dt);

  // Handle artillery firing (separate from movement)
  state.enemies.forEach((e) => {
    const variantDef = getVariantDefinition(e.variant);

    if (e.variant === "artillery" && variantDef.projectile) {
      const angle = Math.atan2(state.player.y - e.y, state.player.x - e.x);
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
          const baseDmg = b.damage ?? state.player.damage;
          const crit = Math.random() < state.player.critChance;
          const dmg = crit ? baseDmg * state.player.critMultiplier : baseDmg;
          enemy.hp -= dmg;
          enemy.hitThisFrame = true;

          // Metallic clink on critical
          if (crit) {
            playSound('critical', { volume: 0.18, pitch: 1.0 });
            if (!state.visualsLow) {
              addFloatingText(state, `💥 ${Math.round(dmg)}`, enemy.x, enemy.y - 4, "#f472b6", 2.2);
            }
          }
          // No sound for normal hits - too spammy
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
      // Add minor screen shake for contact damage
      addTrauma(state.screenShake, 0.08 * dt);
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
        const baseDmg = b.damage ?? state.player.damage;
        const crit = Math.random() < state.player.critChance;
        const dmg = crit ? baseDmg * state.player.critMultiplier : baseDmg;
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
      // Add screen shake for boss contact damage
      addTrauma(state.screenShake, 0.12 * dt);
    }

    // Check if boss is defeated
    if (boss.hp <= 0) {
      // Boss defeated - add major screen shake
      addTrauma(state.screenShake, 0.8);

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
      // Add screen shake for projectile hit
      addTrauma(state.screenShake, 0.2);
    }
  });
  state.enemyProjectiles = state.enemyProjectiles.filter((p) => p.life > 0);

  if (state.player.hp <= 0 && !state.dead) {
    state.dead = true;
    state.running = false;
  }
}
