/**
 * Live Values HUD System
 * Renders calculated real-time values in the merged run HUD at bottom-left
 */

import { calculateLiveValues } from "./tuningPanel.ts";
import type { GameState } from "../types/index.ts";

interface HudElements {
  dps: HTMLElement | null;
  spawnRate: HTMLElement | null;
  enemyHp: HTMLElement | null;
  enemySpeed: HTMLElement | null;
  eliteChance: HTMLElement | null;
}

let hudElements: HudElements = {
  dps: null,
  spawnRate: null,
  enemyHp: null,
  enemySpeed: null,
  eliteChance: null
};

/**
 * Initialize the live values HUD
 */
export function initLiveValuesHud(): void {
  hudElements = {
    dps: document.getElementById("hudLiveDps"),
    spawnRate: document.getElementById("hudLiveSpawnRate"),
    enemyHp: document.getElementById("hudLiveEnemyHp"),
    enemySpeed: document.getElementById("hudLiveEnemySpeed"),
    eliteChance: document.getElementById("hudLiveEliteChance")
  };
}

/**
 * Update the live values HUD display
 */
export function updateLiveValuesHud(state: GameState): void {
  const liveValues = calculateLiveValues(state);

  if (hudElements.dps) {
    hudElements.dps.textContent = liveValues.playerDps.toFixed(1);
  }

  if (hudElements.spawnRate) {
    hudElements.spawnRate.textContent = `${liveValues.currentSpawnRate.toFixed(2)} /s`;
  }

  if (hudElements.enemyHp) {
    hudElements.enemyHp.textContent = Math.round(liveValues.currentEnemyHp).toString();
  }

  if (hudElements.enemySpeed) {
    hudElements.enemySpeed.textContent = Math.round(liveValues.currentEnemySpeed).toString();
  }

  if (hudElements.eliteChance) {
    hudElements.eliteChance.textContent = `${(liveValues.currentEliteChance * 100).toFixed(1)}%`;
  }
}

/**
 * Toggle visibility is no longer needed as the HUD is always visible
 */
export function toggleLiveValuesHud(visible?: boolean): void {
  // No-op: merged HUD is always visible
}
