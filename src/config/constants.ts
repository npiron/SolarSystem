import type { BulletLimits, FxBudget, Icons } from "../types/index.js";

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

export const palette: string[] = ["#7dd3fc", "#f9a8d4", "#ffd166", "#a5b4fc", "#6ee7b7"];

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
