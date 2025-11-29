import type { Canvas, Enemy, GameState } from "../types/index.ts";

const MAX_PACK_SIZE = 5;

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

export function spawnEnemy(state: GameState, canvas: Canvas, chance: number): void {
  const margin = 20;
  const side = Math.floor(Math.random() * 4);
  let x = 0;
  let y = 0;
  if (side === 0) { x = Math.random() * canvas.width; y = margin; }
  if (side === 1) { x = Math.random() * canvas.width; y = canvas.height - margin; }
  if (side === 2) { x = margin; y = Math.random() * canvas.height; }
  if (side === 3) { x = canvas.width - margin; y = Math.random() * canvas.height; }

  const elite = Math.random() < chance;
  const waveScale = 1 + state.wave * 0.015;
  const hp = (25 + state.wave * 6) * waveScale * (elite ? 2.5 : 1);
  const speed = (45 + state.wave * 1.5) * (elite ? 0.85 : 1);
  const fireDelay = Math.max(1.4, (elite ? 3.2 : 4.2) - state.wave * 0.05);
  const enemy: Enemy = {
    x,
    y,
    radius: 10,
    hp,
    maxHp: hp,
    speed,
    reward: (2.5 + state.wave * 0.6) * (elite ? 2.5 : 1),
    fireTimer: fireDelay * Math.random(),
    fireDelay,
    elite
  };
  state.enemies.push(enemy);
}

export function updateSpawn(state: GameState, dt: number, canvas: Canvas): void {
  state.spawnTimer -= dt;
  if (state.spawnTimer > 0) return;

  const rate = spawnRate(state);
  const pack = packSize(state);
  const chance = eliteChance(state, pack);
  for (let i = 0; i < pack; i++) {
    spawnEnemy(state, canvas, chance);
  }
  state.spawnTimer = 1 / rate;
}
