/**
 * Additional HUD Systems
 * Renders global stats and weapons info HUDs in bottom corners
 */

import type { GameState } from "../types/index.ts";
import { formatNumber } from "./hud.ts";

interface GlobalStatsElements {
  bestWave: HTMLElement | null;
  totalKills: HTMLElement | null;
  runFragments: HTMLElement | null;
  runEssence: HTMLElement | null;
}

interface WeaponsHudElements {
  unlockedWeapons: HTMLElement | null;
  mainWeapon: HTMLElement | null;
  supportWeapons: HTMLElement | null;
}

let globalStatsElements: GlobalStatsElements = {
  bestWave: null,
  totalKills: null,
  runFragments: null,
  runEssence: null
};

let weaponsHudElements: WeaponsHudElements = {
  unlockedWeapons: null,
  mainWeapon: null,
  supportWeapons: null
};

/**
 * Initialize the additional HUDs
 */
export function initAdditionalHuds(): void {
  globalStatsElements = {
    bestWave: document.getElementById("hudBestWave"),
    totalKills: document.getElementById("hudTotalKills"),
    runFragments: document.getElementById("hudRunFragments"),
    runEssence: document.getElementById("hudRunEssence")
  };

  weaponsHudElements = {
    unlockedWeapons: document.getElementById("hudUnlockedWeapons"),
    mainWeapon: document.getElementById("hudMainWeapon"),
    supportWeapons: document.getElementById("hudSupportWeapons")
  };
}

/**
 * Update the global stats HUD display
 */
export function updateGlobalStatsHud(state: GameState): void {
  if (globalStatsElements.bestWave) {
    const bestWave = Math.max(state.assist.bestWave, Math.floor(state.wave));
    globalStatsElements.bestWave.textContent = bestWave.toString();
  }

  if (globalStatsElements.totalKills) {
    globalStatsElements.totalKills.textContent = formatNumber(state.runStats.kills);
  }

  if (globalStatsElements.runFragments) {
    globalStatsElements.runFragments.textContent = formatNumber(state.runStats.fragments);
  }

  if (globalStatsElements.runEssence) {
    globalStatsElements.runEssence.textContent = formatNumber(state.runStats.essence);
  }
}

/**
 * Update the weapons HUD display
 */
export function updateWeaponsHud(state: GameState): void {
  if (weaponsHudElements.unlockedWeapons) {
    const unlockedCount = state.weapons.filter(w => w.unlocked).length;
    weaponsHudElements.unlockedWeapons.textContent = `${unlockedCount}/${state.weapons.length}`;
  }

  if (weaponsHudElements.mainWeapon) {
    const mainWeapon = state.weapons.find(w => w.id === "mainGun");
    if (mainWeapon && mainWeapon.unlocked) {
      weaponsHudElements.mainWeapon.textContent = `Niv.${mainWeapon.level}`;
    } else {
      weaponsHudElements.mainWeapon.textContent = "--";
    }
  }

  if (weaponsHudElements.supportWeapons) {
    const supportCount = state.weapons.filter(w => w.unlocked && w.id !== "mainGun").length;
    weaponsHudElements.supportWeapons.textContent = supportCount.toString();
  }
}
