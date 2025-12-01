/**
 * Game state factory and initialization
 */
import type { GameState, TalentBonuses } from "../types/index.ts";
import { getPlayerStatsFromTuning, getInitialHP, getPlayerRadius } from "../config/player.ts";

export function createInitialTalentBonuses(): TalentBonuses {
  return {
    damage: 1,
    fireDelay: 1,
    economy: 1,
    collectRadius: 1,
    projectiles: 0,
    regen: 0,
    damageReduction: 0,
    critChance: 0,
    critMultiplier: 1,
    bulletSpeed: 1
  };
}

export function createInitialState(canvasWidth: number, canvasHeight: number): GameState {
  return {
    running: true,
    wave: 1,
    time: 0,
    enemies: [],
    bullets: [],
    floatingText: [],
    fragmentsOrbs: [],
    gainTicker: { fragments: 0, essence: 0, timer: 0 },
    runStats: {
      kills: 0,
      fragments: 0,
      essence: 0
    },
    player: {
      x: canvasWidth / 2,
      y: canvasHeight / 2,
      vx: 0,
      vy: 0,
      radius: getPlayerRadius(),
      ...getPlayerStatsFromTuning(),
      hp: getInitialHP(),
      maxHp: getInitialHP(),
      fireTimer: 0,
      orbitTimer: 0,
      spin: 0
    },
    resources: {
      essence: 0,
      fragments: 0,
      idleMultiplier: 1
    },
    talents: {
      bonuses: createInitialTalentBonuses(),
    },
    assist: {
      firstShot: false,
      firstPurchase: false,
      firstPrestige: false,
      bestWave: 1,
      completed: []
    },
    spawnTimer: 0,
    overlayFade: 0.12,
    prestigeCooldown: 0,
    dead: false,
    visualsLow: false,
    audio: {
      enabled: true,
    },
    performance: {
      fps: 0,
      history: [],
      maxSamples: 240,
      graphVisible: false
    },
    addons: {
      glow: true,
      bloom: true,
      grain: false,
      hudPulse: true
    },
    bossActive: false,
    currentBoss: null,
    enemyProjectiles: [],
    lastBossWave: 0,
    orbitalOrbs: []
  };
}

export function softReset(state: GameState, canvasWidth: number, canvasHeight: number): void {
  state.wave = 1;
  state.player.hp = state.player.maxHp;
  state.player.fireTimer = 0;
  state.player.orbitTimer = 0;
  state.player.vx = 0;
  state.player.vy = 0;
  state.player.x = canvasWidth / 2;
  state.player.y = canvasHeight / 2;
  state.player.vx = 0;
  state.player.vy = 0;
  state.enemies = [];
  state.bullets = [];
  state.floatingText = [];
  state.fragmentsOrbs = [];
  state.gainTicker = { fragments: 0, essence: 0, timer: 0 };
  state.runStats = { kills: 0, fragments: 0, essence: 0 };
  state.spawnTimer = 0;
  state.dead = false;
  state.running = true;
  state.bossActive = false;
  state.currentBoss = null;
  state.enemyProjectiles = [];
  state.lastBossWave = 0;
  state.orbitalOrbs = [];
}
