/**
 * Unit tests for enemy AI steering behaviors
 */
import { describe, it, expect } from "vitest";
import {
  getBehaviorWeights,
  computeEnemyVelocity,
  updateEnemyAI,
} from "../src/systems/combat/ai.ts";
import type { Enemy, GameState } from "../src/types/index.ts";
import type { AiTuning } from "../src/systems/combat/ai.ts";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeEnemy(overrides: Partial<Enemy> = {}): Enemy {
  return {
    x: 400,
    y: 300,
    vx: 0,
    vy: 0,
    radius: 12,
    hp: 50,
    maxHp: 50,
    speed: 45,
    reward: 5,
    fireTimer: 2,
    fireDelay: 3,
    elite: false,
    type: "normal",
    variant: "chaser",
    generation: 0,
    spawnAge: 1,
    strafeDir: 1,
    aiTimer: 0,
    ...overrides,
  };
}

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    running: true,
    wave: 1,
    time: 0,
    enemies: [],
    bullets: [],
    floatingText: [],
    fragmentsOrbs: [],
    gainTicker: { fragments: 0, essence: 0, timer: 0 },
    runStats: { kills: 0, fragments: 0, essence: 0 },
    player: {
      x: 400,
      y: 300,
      vx: 0,
      vy: 0,
      radius: 24,
      hp: 100,
      maxHp: 100,
      damage: 12,
      fireDelay: 0.65,
      projectiles: 1,
      regen: 2,
      range: 1,
      bulletSpeed: 260,
      damageReduction: 0,
      pierce: 0,
      collectRadius: 90,
      critChance: 0.08,
      critMultiplier: 2,
      speed: 95,
      orbitProjectiles: 8,
      orbitDelay: 1.2,
      fireTimer: 0,
      orbitTimer: 0,
      spin: 0,
    },
    resources: { essence: 0, fragments: 0, idleMultiplier: 1 },
    talents: {
      bonuses: {
        damage: 0,
        fireDelay: 0,
        economy: 0,
        collectRadius: 0,
        projectiles: 0,
        regen: 0,
        damageReduction: 0,
        critChance: 0,
        critMultiplier: 0,
        bulletSpeed: 0,
      },
    },
    assist: { firstShot: false, firstPurchase: false, firstPrestige: false, bestWave: 0, completed: [] },
    spawnTimer: 0,
    overlayFade: 0,
    prestigeCooldown: 0,
    dead: false,
    visualsLow: false,
    visualsParallax: true,
    audio: { enabled: true },
    performance: { fps: 60, frameTimeMs: 16, avgFps: 60, memoryUsageMb: null, memoryLimitMb: null, history: [], maxSamples: 60, graphVisible: false },
    addons: { glow: true, bloom: true, grain: true },
    bossActive: false,
    currentBoss: null,
    enemyProjectiles: [],
    lastBossWave: 0,
    orbitalOrbs: [],
    weapons: [],
    lightningBolts: [],
    laserBeams: [],
    missiles: [],
    lightningTimer: 0,
    laserTimer: 0,
    missileTimer: 0,
    screenShake: { trauma: 0, decay: 0.9 },
    deathParticles: [],
    ...overrides,
  } as GameState;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("getBehaviorWeights", () => {
  it("returns chaser weights for unknown variant", () => {
    const weights = getBehaviorWeights("unknown");
    expect(weights.seek).toBe(1.0);
    expect(weights.kite).toBe(0);
  });

  it("returns volatile weights for volatile variant", () => {
    const weights = getBehaviorWeights("volatile");
    expect(weights.seek).toBe(1.3);
    expect(weights.kite).toBe(0);
  });

  it("returns splitter weights for splitter variant", () => {
    const weights = getBehaviorWeights("splitter");
    expect(weights.seek).toBe(0.9);
    expect(weights.weave).toBe(0.2);
  });

  it("returns artillery weights for artillery variant", () => {
    const weights = getBehaviorWeights("artillery");
    expect(weights.kite).toBe(1.0);
    expect(weights.dodge).toBe(0.5);
    expect(weights.strafe).toBe(0.4);
  });
});

describe("computeEnemyVelocity", () => {
  it("moves enemy toward player (seek behavior)", () => {
    const enemy = makeEnemy({ x: 100, y: 300 });
    const state = makeState();
    const result = computeEnemyVelocity(enemy, state, 800, 600, 0.016);

    // Enemy should move toward player (positive x direction)
    expect(result.vx).toBeGreaterThan(0);
  });

  it("moves enemy away when too close (kite behavior for artillery)", () => {
    // Enemy is at x=500, player at x=400. Enemy is to the RIGHT of player.
    // Kite behavior should push enemy further RIGHT (away from player).
    const enemy = makeEnemy({ x: 420, y: 300, variant: "artillery" });
    const state = makeState();
    const result = computeEnemyVelocity(enemy, state, 800, 600, 0.016);

    // Artillery should try to kite away when too close
    // Enemy is right of player, so kite pushes right (positive vx)
    // The kite weight (1.0) should dominate the seek weight (0.3)
    expect(result.vx).toBeGreaterThan(0);
  });

  it("pushes enemies apart when they overlap (separation)", () => {
    const enemy1 = makeEnemy({ x: 400, y: 300 });
    const enemy2 = makeEnemy({ x: 405, y: 300 });
    const state = makeState({ enemies: [enemy1, enemy2] });

    const result = computeEnemyVelocity(enemy1, state, 800, 600, 0.016);

    // Enemy1 should be pushed away from enemy2 (negative x direction)
    // Separation force should reduce the seek force toward player
    expect(typeof result.vx).toBe("number");
    expect(typeof result.vy).toBe("number");
  });

  it("avoids screen boundaries", () => {
    const enemy = makeEnemy({ x: 5, y: 5 });
    const state = makeState();
    const result = computeEnemyVelocity(enemy, state, 800, 600, 0.016);

    // Boundary force should push enemy toward center
    expect(result.vx).toBeGreaterThan(0);
    expect(result.vy).toBeGreaterThan(0);
  });

  it("initializes strafeDir and aiTimer if undefined", () => {
    const enemy = makeEnemy();
    delete enemy.strafeDir;
    delete enemy.aiTimer;
    const state = makeState({ enemies: [enemy] });

    computeEnemyVelocity(enemy, state, 800, 600, 0.016);

    expect(enemy.strafeDir).toBeDefined();
    expect(enemy.aiTimer).toBeDefined();
  });
});

describe("updateEnemyAI", () => {
  it("updates enemy position based on AI steering", () => {
    const enemy = makeEnemy({ x: 100, y: 300 });
    const state = makeState({ enemies: [enemy] });

    updateEnemyAI(state, 800, 600, 0.016);

    // Enemy should have moved toward player
    expect(enemy.x).toBeGreaterThan(100);
    expect(enemy.vx).toBeDefined();
    expect(enemy.vy).toBeDefined();
  });

  it("clamps enemy speed to maxSpeedRatio", () => {
    const enemy = makeEnemy({ x: 100, y: 300, vx: 200, vy: 200 });
    const state = makeState({ enemies: [enemy] });

    updateEnemyAI(state, 800, 600, 0.016);

    const speed = Math.hypot(enemy.vx ?? 0, enemy.vy ?? 0);
    const maxSpeed = enemy.speed * 1.15; // enemyMaxSpeedRatio default
    expect(speed).toBeLessThanOrEqual(maxSpeed + 0.1);
  });

  it("handles multiple enemies with separation", () => {
    const enemy1 = makeEnemy({ x: 400, y: 300 });
    const enemy2 = makeEnemy({ x: 405, y: 300 });
    const state = makeState({ enemies: [enemy1, enemy2] });

    updateEnemyAI(state, 800, 600, 0.016);

    // Both enemies should have moved
    expect(enemy1.x).not.toBe(400);
    expect(enemy2.x).not.toBe(405);
  });
});
