import type { Canvas, Enemy, GameState, BossEnemy } from "../types/index.ts";
import { getTuning } from "../config/tuning.ts";

const SPAWN_MARGIN = 20;

export function spawnRate(state: GameState): number {
  const { baseSpawnRate, spawnRateWaveScale, maxSpawnRate } = getTuning().spawn;
  return Math.min(maxSpawnRate, baseSpawnRate + state.wave * spawnRateWaveScale);
}

export function packSize(state: GameState): number {
  const maxPackSize = getTuning().spawn.maxPackSize;
  const growth = Math.pow(Math.max(0, state.wave - 1) / 15, 0.6);
  return Math.min(maxPackSize, Math.max(1, Math.floor(1 + growth)));
}

function eliteChance(state: GameState, pack: number): number {
  const { baseEliteChance, eliteChanceWaveScale, maxEliteChance, maxPackSize } = getTuning().spawn;
  const packPressure = pack >= maxPackSize ? 0.04 : (pack / maxPackSize) * 0.02;
  const chance = baseEliteChance + state.wave * eliteChanceWaveScale + packPressure;
  return Math.min(maxEliteChance, chance);
}

/**
 * Choose a spawn side based on player position with weighted probability.
 * Enemies are more likely to spawn behind/away from the player's current direction
 * of movement, making gameplay more strategic.
 */
export function chooseSpawnSide(
  playerX: number,
  playerY: number,
  canvasWidth: number,
  canvasHeight: number
): number {
  // Calculate player's relative position (0 = left/top, 1 = right/bottom)
  const relX = playerX / canvasWidth;
  const relY = playerY / canvasHeight;

  // Sides: 0 = top, 1 = bottom, 2 = left, 3 = right
  // Weight each side based on player position - spawn more on far sides
  const weights = [
    0.15 + relY * 0.35, // top - more likely when player is toward bottom
    0.15 + (1 - relY) * 0.35, // bottom - more likely when player is toward top
    0.15 + relX * 0.35, // left - more likely when player is toward right
    0.15 + (1 - relX) * 0.35 // right - more likely when player is toward left
  ];

  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * totalWeight;

  for (let i = 0; i < weights.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return i;
  }
  return 0;
}

/**
 * Calculate spawn position with variation to avoid clustering.
 * Adds spread within the spawn zone based on pack formation.
 */
export function calculateSpawnPosition(
  side: number,
  canvas: Canvas,
  packIndex: number,
  packTotal: number
): { x: number; y: number } {
  const margin = SPAWN_MARGIN;
  const uiMargins = canvas.uiMargins || { left: 0, right: 0, top: 0, bottom: 0 };

  // Calculate playable area dimensions
  const playableWidth = canvas.width - uiMargins.left - uiMargins.right;
  const playableHeight = canvas.height - uiMargins.top - uiMargins.bottom;

  let x = 0;
  let y = 0;

  // Base spawn position along the edge of playable area
  if (side === 0) {
    // Top edge (within playable area)
    x = uiMargins.left + Math.random() * playableWidth;
    y = uiMargins.top + margin;
  } else if (side === 1) {
    // Bottom edge (within playable area)
    x = uiMargins.left + Math.random() * playableWidth;
    y = canvas.height - uiMargins.bottom - margin;
  } else if (side === 2) {
    // Left edge (within playable area)
    x = uiMargins.left + margin;
    y = uiMargins.top + Math.random() * playableHeight;
  } else {
    // Right edge (within playable area)
    x = canvas.width - uiMargins.right - margin;
    y = uiMargins.top + Math.random() * playableHeight;
  }

  // Add spread for pack spawning - enemies in same pack spawn in formation
  if (packTotal > 1) {
    const spread = 30 + packTotal * 8; // Formation spread size
    const angle = (packIndex / packTotal) * Math.PI * 2;
    const offsetX = Math.cos(angle) * spread * 0.4;
    const offsetY = Math.sin(angle) * spread * 0.4;

    // Apply offset but keep within playable bounds
    const minX = uiMargins.left + margin;
    const maxX = canvas.width - uiMargins.right - margin;
    const minY = uiMargins.top + margin;
    const maxY = canvas.height - uiMargins.bottom - margin;

    x = Math.max(minX, Math.min(maxX, x + offsetX));
    y = Math.max(minY, Math.min(maxY, y + offsetY));
  }

  return { x, y };
}

import type { EnemyType } from "../types/index.ts";

/**
 * Determine enemy type based on HP relative to wave baseline.
 * - weak: HP below 70% of wave baseline
 * - normal: HP between 70% and 130% of wave baseline
 * - strong: HP above 130% of wave baseline
 * - elite: flagged as elite (overrides other types)
 */
function determineEnemyType(hp: number, wave: number, isElite: boolean): EnemyType {
  if (isElite) return 'elite';

  const enemyConfig = getTuning().enemy;
  const baselineHp = (enemyConfig.baseHp + wave * enemyConfig.hpWaveScale) * (1 + wave * 0.015);
  const ratio = hp / baselineHp;

  if (ratio < 0.7) return 'weak';
  if (ratio > 1.3) return 'strong';
  return 'normal';
}

/**
 * Calculate enemy radius based on type for visual differentiation.
 */
function getEnemyRadius(type: EnemyType): number {
  const graphics = getTuning().graphics;
  switch (type) {
    case 'weak': return graphics.enemyRadiusWeak;
    case 'normal': return graphics.enemyRadiusNormal;
    case 'strong': return graphics.enemyRadiusStrong;
    case 'elite': return graphics.enemyRadiusElite;
  }
}

export function spawnEnemy(
  state: GameState,
  canvas: Canvas,
  chance: number,
  packIndex = 0,
  packTotal = 1,
  forcedSide?: number
): void {
  const side = forcedSide ?? chooseSpawnSide(
    state.player.x,
    state.player.y,
    canvas.width,
    canvas.height
  );

  const { x, y } = calculateSpawnPosition(side, canvas, packIndex, packTotal);

  const elite = Math.random() < chance;
  const waveScale = 1 + state.wave * 0.015;

  const enemyConfig = getTuning().enemy;
  const spawnConfig = getTuning().spawn;

  // Add variance to HP for more diversity
  const hpVariance = 1 - enemyConfig.hpVariance + Math.random() * (enemyConfig.hpVariance * 2);
  const baseHp = (enemyConfig.baseHp + state.wave * enemyConfig.hpWaveScale) * waveScale;
  const hp = baseHp * hpVariance * (elite ? spawnConfig.eliteHpMultiplier : 1);

  const speed = (enemyConfig.baseSpeed + state.wave * enemyConfig.speedWaveScale) * (elite ? spawnConfig.eliteSpeedMultiplier : 1);
  const fireDelay = Math.max(
    enemyConfig.minFireDelay,
    (elite ? enemyConfig.eliteFireDelay : enemyConfig.baseFireDelay) - state.wave * enemyConfig.fireDelayWaveScale
  );

  const type = determineEnemyType(hp, state.wave, elite);
  const radius = getEnemyRadius(type);

  const enemy: Enemy = {
    x,
    y,
    radius,
    hp,
    maxHp: hp,
    speed,
    reward: (enemyConfig.baseReward + state.wave * enemyConfig.rewardWaveScale) * (elite ? spawnConfig.eliteRewardMultiplier : 1),
    fireTimer: fireDelay * Math.random(),
    fireDelay,
    elite,
    type
  };
  state.enemies.push(enemy);
}

export function updateSpawn(state: GameState, dt: number, canvas: Canvas): void {
  // Skip normal spawning during boss fight
  if (state.bossActive) return;

  state.spawnTimer -= dt;
  if (state.spawnTimer > 0) return;

  const rate = spawnRate(state);
  const pack = packSize(state);
  const chance = eliteChance(state, pack);

  // Choose a primary spawn side for this pack - all enemies in pack spawn from same general area
  const primarySide = chooseSpawnSide(
    state.player.x,
    state.player.y,
    canvas.width,
    canvas.height
  );

  for (let i = 0; i < pack; i++) {
    // 70% chance to spawn from primary side, 30% chance to spawn from random side
    const usePrimarySide = Math.random() < 0.7;
    const side = usePrimarySide ? primarySide : Math.floor(Math.random() * 4);
    spawnEnemy(state, canvas, chance, i, pack, side);
  }
  state.spawnTimer = 1 / rate;
}

/**
 * Check if a boss should spawn based on current wave.
 * Boss spawns every waveInterval waves.
 */
export function shouldSpawnBoss(state: GameState): boolean {
  const bossWaveInterval = getTuning().boss.waveInterval;
  const currentWaveFloor = Math.floor(state.wave);
  return (
    !state.bossActive &&
    currentWaveFloor > 0 &&
    currentWaveFloor % bossWaveInterval === 0 &&
    currentWaveFloor > state.lastBossWave
  );
}

/**
 * Spawn a boss and clear all regular enemies.
 */
export function spawnBoss(state: GameState, canvas: Canvas): void {
  // Clear all regular enemies
  state.enemies = [];
  state.enemyProjectiles = [];

  const waveScale = 1 + state.wave * 0.02;
  const enemyConfig = getTuning().enemy;
  const bossConfig = getTuning().boss;
  const graphicsConfig = getTuning().graphics;

  const baseHp = (enemyConfig.baseHp + state.wave * enemyConfig.hpWaveScale) * waveScale;
  const bossHp = baseHp * bossConfig.hpMultiplier;

  // Spawn boss from a random edge
  const side = Math.floor(Math.random() * 4);
  const { x, y } = calculateSpawnPosition(side, canvas, 0, 1);

  const boss: BossEnemy = {
    x,
    y,
    radius: graphicsConfig.bossRadius,
    hp: bossHp,
    maxHp: bossHp,
    speed: bossConfig.speed,
    reward: (enemyConfig.baseReward + state.wave * enemyConfig.rewardWaveScale) * bossConfig.rewardMultiplier,
    fireTimer: bossConfig.fireDelay * Math.random(),
    fireDelay: bossConfig.fireDelay
  };

  state.currentBoss = boss;
  state.bossActive = true;
  state.lastBossWave = Math.floor(state.wave);
}
