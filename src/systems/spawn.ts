import type { Canvas, Enemy, GameState } from "../types/index.ts";
import { getEnemyShape } from "../config/shapes.ts";

const MAX_PACK_SIZE = 5;
const SPAWN_MARGIN = 20;

export function spawnRate(state: GameState): number {
  return Math.min(8, 1.4 + state.wave * 0.08);
}

export function packSize(state: GameState): number {
  const growth = Math.pow(Math.max(0, state.wave - 1) / 15, 0.6);
  return Math.min(MAX_PACK_SIZE, Math.max(1, Math.floor(1 + growth)));
}

function eliteChance(state: GameState, pack: number): number {
  const packPressure = pack >= MAX_PACK_SIZE ? 0.04 : (pack / MAX_PACK_SIZE) * 0.02;
  const chance = 0.10 + state.wave * 0.0015 + packPressure;
  return Math.min(0.55, chance);
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
  let x = 0;
  let y = 0;

  // Base spawn position along the edge
  if (side === 0) {
    // Top edge
    x = Math.random() * canvas.width;
    y = margin;
  } else if (side === 1) {
    // Bottom edge
    x = Math.random() * canvas.width;
    y = canvas.height - margin;
  } else if (side === 2) {
    // Left edge
    x = margin;
    y = Math.random() * canvas.height;
  } else {
    // Right edge
    x = canvas.width - margin;
    y = Math.random() * canvas.height;
  }

  // Add spread for pack spawning - enemies in same pack spawn in formation
  if (packTotal > 1) {
    const spread = 30 + packTotal * 8; // Formation spread size
    const angle = (packIndex / packTotal) * Math.PI * 2;
    const offsetX = Math.cos(angle) * spread * 0.4;
    const offsetY = Math.sin(angle) * spread * 0.4;

    // Apply offset but keep within bounds
    x = Math.max(margin, Math.min(canvas.width - margin, x + offsetX));
    y = Math.max(margin, Math.min(canvas.height - margin, y + offsetY));
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
  
  const baselineHp = (25 + wave * 6) * (1 + wave * 0.015);
  const ratio = hp / baselineHp;
  
  if (ratio < 0.7) return 'weak';
  if (ratio > 1.3) return 'strong';
  return 'normal';
}

/**
 * Calculate enemy radius based on type for visual differentiation.
 * - weak: smaller (8)
 * - normal: base size (10)
 * - strong: larger (12)
 * - elite: largest (14)
 */
function getEnemyRadius(type: EnemyType): number {
  switch (type) {
    case 'weak': return 8;
    case 'normal': return 10;
    case 'strong': return 12;
    case 'elite': return 14;
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
  
  // Add variance to HP for more diversity (±30%)
  const hpVariance = 0.7 + Math.random() * 0.6;
  const baseHp = (25 + state.wave * 6) * waveScale;
  const hp = baseHp * hpVariance * (elite ? 2.5 : 1);
  
  const speed = (45 + state.wave * 1.5) * (elite ? 0.85 : 1);
  const fireDelay = Math.max(1.4, (elite ? 3.2 : 4.2) - state.wave * 0.05);
  
  const type = determineEnemyType(hp, state.wave, elite);
  const radius = getEnemyRadius(type);
  
  const enemy: Enemy = {
    x,
    y,
    radius,
    hp,
    maxHp: hp,
    speed,
    reward: (2.5 + state.wave * 0.6) * (elite ? 2.5 : 1),
    fireTimer: fireDelay * Math.random(),
    fireDelay,
    elite,
    type,
    shape: getEnemyShape(type)
  };
  state.enemies.push(enemy);
}

export function updateSpawn(state: GameState, dt: number, canvas: Canvas): void {
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
