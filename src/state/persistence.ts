/**
 * Save/Load module for game persistence
 * Handles localStorage serialization and deserialization
 */

import type {
  Addons,
  Assist,
  GameState,
  Generator,
  PlayerStats,
  Resources,
  SavedTalent,
  Talent,
  TalentBonuses,
  Upgrade
} from "../types/index.ts";
import { MAX_OFFLINE_SECONDS, STORAGE_KEY } from "../config/constants.ts";
import { BASE_PLAYER_STATS } from "./gameState.ts";

/** Saved game data structure */
export interface SaveData {
  resources?: Partial<Resources>;
  wave?: number;
  audio?: { enabled?: boolean };
  player?: Partial<PlayerStats>;
  generators?: Array<{ level?: number; cost?: number }>;
  upgrades?: Array<{ level?: number; cost?: number } | number>;
  talents?: SavedTalent[];
  idleMultiplier?: number;
  assist?: Partial<Assist>;
  addons?: Partial<Addons>;
  lastSeen?: number;
}

/** Result of loading a save file */
export interface LoadResult {
  offlineSeconds: number;
  wasLoaded: boolean;
}

/**
 * Formats a duration in seconds to a human-readable string
 */
export function formatDuration(seconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const parts: string[] = [];
  if (hours) parts.push(`${hours}h`);
  if (minutes || !parts.length) parts.push(`${minutes}m`);
  return parts.join(" ");
}

/**
 * Saves the current game state to localStorage
 */
export function saveGame(
  state: GameState,
  generators: Generator[],
  upgrades: Upgrade[],
  talents: Talent[]
): void {
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

/**
 * Loads game state from localStorage
 * Returns the number of offline seconds for offline gains calculation
 */
export function loadSave(
  state: GameState,
  generators: Generator[],
  upgrades: Upgrade[],
  hydrateTalents: (saved?: SavedTalent[] | null) => Talent[],
  computeGeneratorRate: (gen: Generator) => number,
  applyProgressionEffects: () => void,
  refreshGeneratorRates: () => void
): LoadResult {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { offlineSeconds: 0, wasLoaded: false };

  try {
    const save: SaveData = JSON.parse(raw);

    // Load resources
    Object.assign(state.resources, save.resources || {});
    state.wave = save.wave || state.wave;
    state.audio.enabled = save.audio?.enabled ?? state.audio.enabled;
    state.addons = { ...state.addons, ...save.addons };

    // Load player stats
    const playerKeys: (keyof PlayerStats)[] = [
      "damage", "fireDelay", "projectiles", "regen", "range",
      "bulletSpeed", "damageReduction", "pierce", "collectRadius",
      "critChance", "critMultiplier", "speed"
    ];
    playerKeys.forEach((key) => {
      const savedValue = save.player?.[key];
      if (savedValue !== undefined) {
        (state.player as unknown as Record<string, number>)[key] = savedValue;
      }
    });

    state.resources.idleMultiplier = save.idleMultiplier || state.resources.idleMultiplier;

    // Load generators
    save.generators?.forEach((g, idx) => {
      if (generators[idx]) {
        generators[idx].level = g.level || 0;
        generators[idx].rate = computeGeneratorRate(generators[idx]);
        generators[idx].cost = g.cost || generators[idx].cost;
      }
    });

    // Load upgrades
    save.upgrades?.forEach((entry, idx) => {
      const upgrade = upgrades[idx];
      if (!upgrade) return;
      if (typeof entry === "number") {
        upgrade.level = entry;
      } else {
        upgrade.level = entry.level || 0;
        upgrade.cost = entry.cost || upgrade.cost;
      }
    });

    // Apply progression
    applyProgressionEffects();
    refreshGeneratorRates();

    // Load assist state
    state.assist = {
      ...state.assist,
      ...save.assist,
      completed: save.assist?.completed || []
    };
    state.assist.bestWave = Math.max(state.assist.bestWave || 1, state.wave || 1);

    // Calculate offline time
    const now = Date.now();
    let offlineSeconds = 0;
    if (save.lastSeen) {
      const elapsed = Math.max(0, (now - save.lastSeen) / 1000);
      offlineSeconds = Math.min(MAX_OFFLINE_SECONDS, elapsed);
    }

    return { offlineSeconds, wasLoaded: true };
  } catch (err) {
    console.warn("Save corrupted", err);
    return { offlineSeconds: 0, wasLoaded: false };
  }
}

/**
 * Clears all saved game data
 */
export function clearSave(): void {
  localStorage.removeItem(STORAGE_KEY);
}
