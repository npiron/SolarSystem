import type { BulletLimits, FxBudget, Icons } from "../types/index.ts";

export const STORAGE_KEY = "neo-survivors-save";
export const TAU = Math.PI * 2;
export const CELL_SIZE = 80;
export const VERSION = "v0.1.0";
export const MAX_OFFLINE_SECONDS = 60 * 60 * 3;

export const FX_BUDGET: FxBudget = {
  floatingText: 80,
  bullets: 520,
  fragments: 200
};

export const BULLET_LIMITS: BulletLimits = {
  maxSpeed: 520,
  maxLifetime: 2.4,
  offscreenPadding: 120
};

export const icons: Icons = {
  essence: "⚡",
  fragments: "✦",
  wave: "🌊",
  reach: "📡",
  speed: "💨",
  shield: "🧿",
  crit: "🎯",
  magnet: "🧲"
};

// Boss configuration
export const BOSS_WAVE_INTERVAL = 5;
export const BOSS_RADIUS = 48;
export const BOSS_HP_MULTIPLIER = 15;
export const BOSS_SPEED = 30;
export const BOSS_FIRE_DELAY = 1.2;
export const BOSS_PROJECTILE_SPEED = 180;
export const BOSS_PROJECTILE_DAMAGE = 15;
export const BOSS_REWARD_MULTIPLIER = 10;
