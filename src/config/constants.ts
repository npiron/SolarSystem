import type { BulletLimits, FxBudget, Icons } from "../types/index.ts";

export const STORAGE_KEY = "neo-survivors-save";
export const TAU = Math.PI * 2;
export const CELL_SIZE = 80;
export const VERSION = "v0.1.0";
export const MAX_OFFLINE_SECONDS = 60 * 60 * 3;

export const FX_BUDGET: FxBudget = {
  floatingText: 9999, // Quasi-illimité pour afficher tous les textes
  bullets: 520,
  fragments: 200
};

export const BULLET_LIMITS: BulletLimits = {
  maxSpeed: 520,
  maxLifetime: 2.4,
  offscreenPadding: 120
};

export const icons: Icons = {
  essence: '<i class="ti ti-droplet-filled resource-icon essence"></i>',
  fragments: '<i class="ti ti-diamond-filled resource-icon fragments"></i>',
  wave: '<i class="ti ti-wave-square"></i>',
  reach: '<i class="ti ti-antenna"></i>',
  speed: '<i class="ti ti-bolt"></i>',
  shield: '<i class="ti ti-shield-filled"></i>',
  crit: '<i class="ti ti-target"></i>',
  magnet: '<i class="ti ti-magnet"></i>'
};

// Simple emoji/text icons for WebGL/canvas rendering (no HTML)
export const glIcons = {
  essence: "💧",
  fragments: "💎",
  wave: "〰️",
  reach: "📡",
  speed: "⚡",
  shield: "🛡️",
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
