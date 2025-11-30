/**
 * Game state management module
 * Handles the core game state, initialization, and state-related utilities
 */

import type {
  Addons,
  Assist,
  AudioState,
  Bullet,
  Enemy,
  FloatingText,
  FragmentOrb,
  GainTicker,
  GameState,
  PerformanceState,
  Player,
  PlayerStats,
  Resources,
  RunStats,
  TalentBonuses
} from "../types/index.ts";

/** Base player stats - used as defaults and for reset */
export const BASE_PLAYER_STATS: PlayerStats = {
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
  speed: 95
};

/** Default initial player state */
function createDefaultPlayer(centerX: number, centerY: number): Player {
  return {
    x: centerX,
    y: centerY,
    radius: 12,
    ...BASE_PLAYER_STATS,
    hp: 120,
    maxHp: 120,
    fireTimer: 0,
    spin: 0
  };
}

/** Default resources state */
function createDefaultResources(): Resources {
  return {
    essence: 0,
    fragments: 0,
    idleMultiplier: 1
  };
}

/** Default run statistics */
function createDefaultRunStats(): RunStats {
  return {
    kills: 0,
    fragments: 0,
    essence: 0
  };
}

/** Default gain ticker state */
function createDefaultGainTicker(): GainTicker {
  return {
    fragments: 0,
    essence: 0,
    timer: 0
  };
}

/** Default assist/tutorial state */
function createDefaultAssist(): Assist {
  return {
    firstShot: false,
    firstPurchase: false,
    firstPrestige: false,
    bestWave: 1,
    completed: []
  };
}

/** Default audio state */
function createDefaultAudioState(): AudioState {
  return {
    enabled: true
  };
}

/** Default performance monitoring state */
function createDefaultPerformanceState(): PerformanceState {
  return {
    fps: 0,
    history: [],
    maxSamples: 240,
    graphVisible: false
  };
}

/** Default addon toggles */
function createDefaultAddons(): Addons {
  return {
    glow: true,
    bloom: true,
    grain: false,
    hudPulse: true
  };
}

/**
 * Creates a fresh game state with all defaults
 * @param centerX - Initial player X position (typically canvas center)
 * @param centerY - Initial player Y position (typically canvas center)
 * @param talentBonuses - Initial talent bonuses (typically default/empty bonuses)
 */
export function createGameState(
  centerX: number,
  centerY: number,
  talentBonuses: TalentBonuses
): GameState {
  return {
    running: true,
    wave: 1,
    time: 0,
    enemies: [] as Enemy[],
    bullets: [] as Bullet[],
    floatingText: [] as FloatingText[],
    fragmentsOrbs: [] as FragmentOrb[],
    gainTicker: createDefaultGainTicker(),
    runStats: createDefaultRunStats(),
    player: createDefaultPlayer(centerX, centerY),
    resources: createDefaultResources(),
    talents: {
      bonuses: talentBonuses
    },
    assist: createDefaultAssist(),
    spawnTimer: 0,
    overlayFade: 0.12,
    prestigeCooldown: 0,
    dead: false,
    visualsLow: false,
    audio: createDefaultAudioState(),
    performance: createDefaultPerformanceState(),
    addons: createDefaultAddons()
  };
}

/**
 * Performs a soft reset of the game state (used for prestige/death)
 * Resets combat state but preserves progression
 */
export function softResetState(
  state: GameState,
  centerX: number,
  centerY: number
): void {
  state.wave = 1;
  state.player.hp = state.player.maxHp;
  state.player.fireTimer = 0;
  state.player.x = centerX;
  state.player.y = centerY;
  state.enemies = [];
  state.bullets = [];
  state.floatingText = [];
  state.fragmentsOrbs = [];
  state.gainTicker = createDefaultGainTicker();
  state.runStats = createDefaultRunStats();
  state.spawnTimer = 0;
  state.dead = false;
  state.running = true;
}

/**
 * Clamps the player position to stay within canvas bounds
 */
export function clampPlayerToBounds(
  state: GameState,
  canvasWidth: number,
  canvasHeight: number,
  margin = 30
): void {
  state.player.x = Math.max(margin, Math.min(canvasWidth - margin, state.player.x));
  state.player.y = Math.max(margin, Math.min(canvasHeight - margin, state.player.y));
}
