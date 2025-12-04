/**
 * Live Values HUD System
 * Renders calculated real-time values as an overlay on the canvas (video game style)
 */

import { calculateLiveValues } from "./tuningPanel.ts";
import type { GameState } from "../types/index.ts";

interface HudElements {
  container: HTMLElement | null;
  dps: HTMLElement | null;
  spawnRate: HTMLElement | null;
  enemyHp: HTMLElement | null;
  enemySpeed: HTMLElement | null;
  eliteChance: HTMLElement | null;
}

let hudElements: HudElements = {
  container: null,
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
    container: document.getElementById("liveValuesHud"),
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
  if (!hudElements.container) return;

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
 * Toggle visibility of the live values HUD
 */
export function toggleLiveValuesHud(visible?: boolean): void {
  if (!hudElements.container) return;

  if (visible === undefined) {
    hudElements.container.style.display = 
      hudElements.container.style.display === "none" ? "block" : "none";
  } else {
    hudElements.container.style.display = visible ? "block" : "none";
  }
}
