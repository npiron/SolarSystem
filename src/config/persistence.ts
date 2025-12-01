/**
 * Save/Load system for game persistence via localStorage
 */
import type { GameState, Generator, PlayerStats, Talent, Upgrade } from "../types/index.ts";
import { MAX_OFFLINE_SECONDS, STORAGE_KEY } from "./constants.ts";
import { BASE_PLAYER_STATS } from "./player.ts";
import { hydrateTalents, computeTalentBonuses } from "../systems/talents.ts";
import { debugPing } from "../systems/hud.ts";

interface SaveData {
  resources?: {
    essence?: number;
    fragments?: number;
    idleMultiplier?: number;
  };
  wave?: number;
  audio?: { enabled?: boolean };
  addons?: {
    glow?: boolean;
    bloom?: boolean;
    grain?: boolean;
  };
  player?: Partial<typeof BASE_PLAYER_STATS>;
  generators?: Array<{ level: number; cost: number }>;
  upgrades?: Array<{ level: number; cost: number } | number>;
  talents?: Array<{ id: string; unlocked: boolean }>;
  idleMultiplier?: number;
  assist?: {
    firstShot?: boolean;
    firstPurchase?: boolean;
    firstPrestige?: boolean;
    bestWave?: number;
    completed?: string[];
  };
  lastSeen?: number;
}

interface SaveContext {
  generators: Generator[];
  upgrades: Upgrade[];
  talents: Talent[];
  computeGeneratorRate: (gen: Generator) => number;
  applyProgressionEffects: () => void;
  refreshGeneratorRates: () => void;
  applyUpgradeEffects?: () => void;
  updateHud: () => void;
}

function formatDuration(seconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const parts: string[] = [];
  if (hours) parts.push(`${hours}h`);
  if (minutes || !parts.length) parts.push(`${minutes}m`);
  return parts.join(" ");
}

function grantOfflineGains(state: GameState, seconds: number, computeIdleRate: () => number): void {
  const rate = computeIdleRate();
  const earnedEssence = rate * seconds;
  const earnedFragments = earnedEssence * 0.4;
  state.resources.essence += earnedEssence;
  state.resources.fragments += earnedFragments;
  state.runStats.essence += earnedEssence;
  state.runStats.fragments += earnedFragments;
}

export function loadSave(
  state: GameState,
  context: SaveContext,
  computeIdleRate: () => number
): Talent[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  let talents = context.talents;

  if (!raw) return talents;

  try {
    const save: SaveData = JSON.parse(raw);
    
    // Resources
    if (save.resources) {
      Object.assign(state.resources, save.resources);
    }
    
    // Wave
    state.wave = save.wave || state.wave;
    
    // Audio
    state.audio.enabled = save.audio?.enabled ?? state.audio.enabled;
    
    // Addons (sanitize to known keys)
    {
      const addons = { ...state.addons, ...save.addons } as Partial<typeof state.addons>;
      state.addons = {
        glow: !!addons.glow,
        bloom: !!addons.bloom,
        grain: !!addons.grain
      };
    }
    
    // Player stats
    if (save.player) {
      Object.keys(BASE_PLAYER_STATS).forEach((key) => {
        const k = key as keyof typeof BASE_PLAYER_STATS;
        const value = save.player?.[k];
        if (value !== undefined) {
          (state.player as PlayerStats)[k] = value;
        }
      });
    }
    
    // Idle multiplier
    state.resources.idleMultiplier = save.idleMultiplier || state.resources.idleMultiplier;
    
    // Generators
    save.generators?.forEach((g, idx) => {
      if (context.generators[idx]) {
        context.generators[idx].level = g.level || 0;
        context.generators[idx].rate = context.computeGeneratorRate(context.generators[idx]);
        context.generators[idx].cost = g.cost || context.generators[idx].cost;
      }
    });
    
    // Upgrades
    save.upgrades?.forEach((entry, idx) => {
      const upgrade = context.upgrades[idx];
      if (!upgrade) return;
      if (typeof entry === "number") {
        upgrade.level = entry;
      } else {
        upgrade.level = entry.level || 0;
        upgrade.cost = entry.cost || upgrade.cost;
      }
    });
    
    // Talents
    talents = hydrateTalents(save.talents);
    context.talents = talents;
    const talentBonuses = computeTalentBonuses(talents);
    state.talents.bonuses = talentBonuses;
    
    context.applyProgressionEffects();
    context.refreshGeneratorRates();
    
    // Assist
    state.assist = {
      ...state.assist,
      ...save.assist,
      completed: save.assist?.completed || []
    };
    state.assist.bestWave = Math.max(state.assist.bestWave || 1, state.wave || 1);
    
    // Offline gains
    const now = Date.now();
    if (save.lastSeen) {
      const elapsed = Math.max(0, (now - save.lastSeen) / 1000);
      const offlineSeconds = Math.min(MAX_OFFLINE_SECONDS, elapsed);
      grantOfflineGains(state, offlineSeconds, computeIdleRate);
      if (elapsed > MAX_OFFLINE_SECONDS) {
        debugPing(state, `⏳ Offline gains capped at ${formatDuration(MAX_OFFLINE_SECONDS)}`, "#fbbf24");
      }
    }
  } catch (err) {
    console.warn("Save corrupted", err);
  }

  return talents;
}

export function saveGame(state: GameState, generators: Generator[], upgrades: Upgrade[], talents: Talent[]): void {
  const data: SaveData = {
    resources: state.resources,
    wave: state.wave,
    audio: { enabled: state.audio.enabled },
    player: {
      damage: state.player.damage,
      fireDelay: state.player.fireDelay,
      projectiles: state.player.projectiles,
      regen: state.player.regen,
      range: state.player.range,
      bulletSpeed: state.player.bulletSpeed,
      damageReduction: state.player.damageReduction,
      pierce: state.player.pierce,
      collectRadius: state.player.collectRadius,
      critChance: state.player.critChance,
      critMultiplier: state.player.critMultiplier,
      speed: state.player.speed
    },
    generators: generators.map((g) => ({ level: g.level, cost: g.cost })),
    upgrades: upgrades.map((u) => ({ level: u.level, cost: u.cost })),
    talents: talents.map((talent) => ({ id: talent.id, unlocked: talent.unlocked ?? false })),
    idleMultiplier: state.resources.idleMultiplier,
    assist: {
      firstShot: state.assist.firstShot,
      firstPurchase: state.assist.firstPurchase,
      firstPrestige: state.assist.firstPrestige,
      bestWave: state.assist.bestWave,
      completed: state.assist.completed
    },
    addons: state.addons,
    lastSeen: Date.now()
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
