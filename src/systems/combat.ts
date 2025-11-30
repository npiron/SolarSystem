import type { Bullet, Canvas, Enemy, GameState } from "../types/index.ts";
import { BULLET_LIMITS, CELL_SIZE, FX_BUDGET, TAU } from "../config/constants.ts";
import { addFloatingText, registerFragmentGain } from "./hud.ts";

function nearestEnemy(state: GameState): Enemy | null {
  let closest: Enemy | null = null;
  let bestDist = Infinity;
  state.enemies.forEach((e) => {
    const dx = e.x - state.player.x;
    const dy = e.y - state.player.y;
    const dist = dx * dx + dy * dy;
    if (dist < bestDist) {
      bestDist = dist;
      closest = e;
    }
  });
  return closest;
}

function fire(state: GameState): void {
  const target = nearestEnemy(state);
  const count = Math.max(1, state.player.projectiles);
  // Base direction: toward nearest enemy, or forward if no enemies
  const baseAngle = target
    ? Math.atan2(target.y - state.player.y, target.x - state.player.x)
    : state.time * 0.9;

  const bulletSpeed = Math.min(state.player.bulletSpeed, BULLET_LIMITS.maxSpeed);
  const lifetime = Math.min(1.2 * state.player.range, BULLET_LIMITS.maxLifetime);

  // Shotgun spread: all projectiles fire in a cone toward the target
  const spreadAngle = Math.PI / 4; // 45 degrees total spread (like a shotgun)

  for (let i = 0; i < count; i++) {
    if (state.bullets.length >= FX_BUDGET.bullets) break;
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
  const count = Math.max(1, state.player.orbitProjectiles);
  const bulletSpeed = Math.min(state.player.bulletSpeed * 0.8, BULLET_LIMITS.maxSpeed);
  const lifetime = Math.min(1.5 * state.player.range, BULLET_LIMITS.maxLifetime);

  for (let i = 0; i < count; i++) {
    if (state.bullets.length >= FX_BUDGET.bullets) break;
    // Evenly distribute projectiles around the player
    const angle = (TAU * i) / count + state.player.spin;
    const bullet: Bullet = {
      x: state.player.x,
      y: state.player.y,
      dx: Math.cos(angle) * bulletSpeed,
      dy: Math.sin(angle) * bulletSpeed,
      life: lifetime,
      pierce: Math.max(0, state.player.pierce - 1)
    };
    state.bullets.push(bullet);
  }
}

export function updateCombat(state: GameState, dt: number, canvas: Canvas): void {
  state.player.fireTimer -= dt;
  state.player.orbitTimer -= dt;
  state.player.spin = (state.player.spin + dt * 1.2) % TAU;

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

  state.bullets.forEach((b) => {
    b.x += b.dx * dt;
    b.y += b.dy * dt;
    b.life -= dt;

    if (
      b.x < -BULLET_LIMITS.offscreenPadding ||
      b.x > canvas.width + BULLET_LIMITS.offscreenPadding ||
      b.y < -BULLET_LIMITS.offscreenPadding ||
      b.y > canvas.height + BULLET_LIMITS.offscreenPadding
    ) {
      b.life = -1;
    }
  });
  if (state.bullets.length > FX_BUDGET.bullets) {
    state.bullets.splice(0, state.bullets.length - FX_BUDGET.bullets);
  }
  state.bullets = state.bullets.filter((b) => b.life > 0);

  state.fragmentsOrbs.forEach((f) => {
    f.life -= dt;
    const dx = state.player.x - f.x;
    const dy = state.player.y - f.y;
    const dist = Math.hypot(dx, dy) || 1;
    if (dist < state.player.collectRadius) {
      f.vx += (dx / dist) * 120 * dt;
      f.vy += (dy / dist) * 120 * dt;
    }
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    const collectDist = state.player.radius + 6 + state.player.collectRadius * 0.15;
    if (dist < collectDist) {
      registerFragmentGain(state, f.value, f.x, f.y - 6);
      f.life = -1;
    }
  });
  state.fragmentsOrbs = state.fragmentsOrbs.filter((f) => f.life > 0);

  if (state.fragmentsOrbs.length > FX_BUDGET.fragments) {
    const overflow = state.fragmentsOrbs.splice(0, state.fragmentsOrbs.length - FX_BUDGET.fragments);
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
      if (state.fragmentsOrbs.length < FX_BUDGET.fragments) {
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
      const dmg = 18 * dt * (1 + state.wave * 0.05) * (1 - state.player.damageReduction);
      state.player.hp -= dmg;
    }
  });

  if (state.player.hp <= 0 && !state.dead) {
    state.dead = true;
    state.running = false;
  }
}
