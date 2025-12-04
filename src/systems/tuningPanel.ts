/**
 * Tuning Panel UI System
 * Renders a comprehensive dashboard for adjusting game parameters
 */

import {
  getTuning,
  setTuning,
  saveTuning,
  resetTuning,
  exportTuning,
  importTuning,
  loadTuning,
  tuningMeta,
  TuningConfig,
  TuningParamMeta
} from "../config/tuning.ts";
import type { GameState } from "../types/index.ts";
import { spawnRate } from "./spawn.ts";

interface TuningPanelContext {
  container: HTMLElement | null;
  onUpdate?: () => void;
  state?: GameState;
  onTuningChange?: () => void;
}

export interface LiveValues {
  playerDps: number;
  currentSpawnRate: number;
  currentEnemyHp: number;
  currentEnemySpeed: number;
  currentEliteChance: number;
}

let panelContext: TuningPanelContext = {
  container: null
};

/**
 * Initialize the tuning panel
 */
export function initTuningPanel(context: TuningPanelContext): void {
  panelContext = context;
  loadTuning();
  renderTuningPanel();
}

/**
 * Render the complete tuning panel
 */
export function renderTuningPanel(): void {
  const { container } = panelContext;
  if (!container) return;

  container.innerHTML = "";

  // Header with controls
  const header = document.createElement("div");
  header.className = "tuning-header";
  header.innerHTML = `
    <div class="tuning-actions">
      <button id="tuningReset" class="ghost small">🔄 Réinitialiser</button>
      <button id="tuningExport" class="ghost small">📤 Exporter</button>
      <button id="tuningImport" class="ghost small">📥 Importer</button>
    </div>
  `;
  container.appendChild(header);

  // Create sections for each category
  const tuning = getTuning();
  const categories = Object.keys(tuningMeta) as Array<keyof TuningConfig>;

  for (const category of categories) {
    const meta = tuningMeta[category];
    const section = createCategorySection(category, meta.label, tuning[category], meta.params);
    container.appendChild(section);
  }

  // Live values section (if state is available)
  if (panelContext.state) {
    const liveSection = createLiveValuesSection(panelContext.state);
    container.appendChild(liveSection);
  }

  // Hidden file input for import
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = ".json";
  fileInput.id = "tuningFileInput";
  fileInput.style.display = "none";
  container.appendChild(fileInput);

  // Attach event listeners
  attachTuningEventListeners();
}

/**
 * Create a collapsible section for a category
 */
function createCategorySection<K extends keyof TuningConfig>(
  categoryKey: K,
  label: string,
  values: TuningConfig[K],
  paramsMeta: { [P in keyof TuningConfig[K]]: TuningParamMeta }
): HTMLElement {
  const section = document.createElement("div");
  section.className = "tuning-section collapsible collapsed";
  section.dataset.category = categoryKey;

  const headerDiv = document.createElement("h3");
  headerDiv.className = "tuning-section-title";
  headerDiv.textContent = label;
  section.appendChild(headerDiv);

  const content = document.createElement("div");
  content.className = "tuning-section-content";

  const params = Object.keys(paramsMeta) as Array<keyof TuningConfig[K]>;
  for (const paramKey of params) {
    const meta = paramsMeta[paramKey];
    const value = values[paramKey] as number;
    const row = createParamRow(categoryKey, paramKey as string, meta, value);
    content.appendChild(row);
  }

  section.appendChild(content);
  return section;
}

/**
 * Create a parameter row with slider and input
 */
function createParamRow(
  category: string,
  param: string,
  meta: TuningParamMeta,
  value: number
): HTMLElement {
  const row = document.createElement("div");
  row.className = "tuning-row";

  const displayValue = formatParamValue(value, meta);
  const sliderValue = value;

  row.innerHTML = `
    <div class="tuning-label">
      <span class="tuning-param-name">${meta.label}</span>
      ${meta.description ? `<span class="tuning-param-desc muted">${meta.description}</span>` : ""}
    </div>
    <div class="tuning-controls">
      <input 
        type="range" 
        class="tuning-slider" 
        data-category="${category}" 
        data-param="${param}"
        min="${meta.min}" 
        max="${meta.max}" 
        step="${meta.step}" 
        value="${sliderValue}"
      />
      <input 
        type="number" 
        class="tuning-input" 
        data-category="${category}" 
        data-param="${param}"
        min="${meta.min}" 
        max="${meta.max}" 
        step="${meta.step}" 
        value="${value}"
      />
      <span class="tuning-unit">${meta.unit || ""}</span>
    </div>
  `;

  return row;
}

/**
 * Format a parameter value for display
 */
function formatParamValue(value: number, meta: TuningParamMeta): string {
  if (meta.unit === "%") {
    return `${(value * 100).toFixed(0)}%`;
  }
  if (meta.step < 1) {
    return value.toFixed(2);
  }
  return value.toString();
}

/**
 * Attach event listeners for tuning controls
 */
function attachTuningEventListeners(): void {
  const { container, onUpdate } = panelContext;
  if (!container) return;

  // Slider change events
  container.querySelectorAll<HTMLInputElement>(".tuning-slider").forEach((slider) => {
    slider.addEventListener("input", () => {
      const category = slider.dataset.category as keyof TuningConfig;
      const param = slider.dataset.param as string;
      const value = parseFloat(slider.value);

      // Update the number input
      const input = container.querySelector<HTMLInputElement>(
        `.tuning-input[data-category="${category}"][data-param="${param}"]`
      );
      if (input) input.value = value.toString();

      updateTuningParam(category, param, value);
    });
  });

  // Number input change events
  container.querySelectorAll<HTMLInputElement>(".tuning-input").forEach((input) => {
    input.addEventListener("change", () => {
      const category = input.dataset.category as keyof TuningConfig;
      const param = input.dataset.param as string;
      const value = parseFloat(input.value);

      // Update the slider
      const slider = container.querySelector<HTMLInputElement>(
        `.tuning-slider[data-category="${category}"][data-param="${param}"]`
      );
      if (slider) slider.value = value.toString();

      updateTuningParam(category, param, value);
    });
  });

  // Section toggle events
  container.querySelectorAll<HTMLElement>(".tuning-section-title").forEach((title) => {
    title.addEventListener("click", () => {
      const section = title.parentElement;
      if (section) {
        section.classList.toggle("collapsed");
      }
    });
  });

  // Reset button
  const resetBtn = container.querySelector("#tuningReset");
  resetBtn?.addEventListener("click", () => {
    if (confirm("Réinitialiser tous les paramètres aux valeurs par défaut ?")) {
      resetTuning();
      saveTuning();
      renderTuningPanel();
      onUpdate?.();
    }
  });

  // Export button
  const exportBtn = container.querySelector("#tuningExport");
  exportBtn?.addEventListener("click", () => {
    const json = exportTuning();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tuning-config-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // Import button
  const importBtn = container.querySelector("#tuningImport");
  const fileInput = container.querySelector<HTMLInputElement>("#tuningFileInput");
  importBtn?.addEventListener("click", () => {
    fileInput?.click();
  });

  fileInput?.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      if (importTuning(text)) {
        renderTuningPanel();
        onUpdate?.();
        alert("Configuration importée avec succès !");
      } else {
        alert("Erreur lors de l'import de la configuration.");
      }
    };
    reader.readAsText(file);
  });
}

/**
 * Update a single tuning parameter
 */
function updateTuningParam(category: keyof TuningConfig, param: string, value: number): void {
  const tuning = getTuning();
  const categoryValues = { ...tuning[category] } as Record<string, unknown>;
  categoryValues[param] = value;
  setTuning({ [category]: categoryValues } as Partial<TuningConfig>);
  saveTuning();
  panelContext.onUpdate?.();

  // Trigger tuning change callback (will reset game)
  if (panelContext.onTuningChange) {
    panelContext.onTuningChange();
  }
}

/**
 * Calculate live values from game state
 */
export function calculateLiveValues(state: GameState): LiveValues {
  const tuning = getTuning();
  const enemyConfig = tuning.enemy;
  const spawnConfig = tuning.spawn;

  // Calculate current enemy HP for this wave
  const waveScale = 1 + state.wave * 0.015;
  const baseHp = (enemyConfig.baseHp + state.wave * enemyConfig.hpWaveScale) * waveScale;

  // Calculate current enemy speed
  const baseSpeed = enemyConfig.baseSpeed + state.wave * enemyConfig.speedWaveScale;

  // Calculate current elite chance
  const pack = Math.min(spawnConfig.maxPackSize, Math.max(1, Math.floor(1 + Math.pow(Math.max(0, state.wave - 1) / 15, 0.6))));
  const packPressure = pack >= spawnConfig.maxPackSize ? 0.04 : (pack / spawnConfig.maxPackSize) * 0.02;
  const eliteChance = Math.min(spawnConfig.maxEliteChance, spawnConfig.baseEliteChance + state.wave * spawnConfig.eliteChanceWaveScale + packPressure);

  // Estimate DPS (damage * projectiles / fireDelay)
  const playerDps = (state.player.damage * state.player.projectiles) / state.player.fireDelay;

  return {
    playerDps,
    currentSpawnRate: spawnRate(state),
    currentEnemyHp: baseHp,
    currentEnemySpeed: baseSpeed,
    currentEliteChance: eliteChance
  };
}

/**
 * Create the live values section
 */
function createLiveValuesSection(state: GameState): HTMLElement {
  const section = document.createElement("div");
  section.className = "tuning-section live-values";
  section.id = "tuningLiveValues";

  const header = document.createElement("h3");
  header.className = "tuning-section-title";
  header.textContent = "⚡ Valeurs calculées (temps réel)";
  section.appendChild(header);

  const content = document.createElement("div");
  content.className = "tuning-section-content";

  const liveValues = calculateLiveValues(state);

  content.innerHTML = `
    <div class="tuning-row">
      <span class="tuning-label">DPS joueur estimé</span>
      <span id="liveDps" class="tuning-live-value">${liveValues.playerDps.toFixed(1)}</span>
    </div>
    <div class="tuning-row">
      <span class="tuning-label">Taux de spawn actuel</span>
      <span id="liveSpawnRate" class="tuning-live-value">${liveValues.currentSpawnRate.toFixed(2)} /s</span>
    </div>
    <div class="tuning-row">
      <span class="tuning-label">HP ennemis (vague ${Math.floor(state.wave)})</span>
      <span id="liveEnemyHp" class="tuning-live-value">${Math.round(liveValues.currentEnemyHp)}</span>
    </div>
    <div class="tuning-row">
      <span class="tuning-label">Vitesse ennemis (vague ${Math.floor(state.wave)})</span>
      <span id="liveEnemySpeed" class="tuning-live-value">${Math.round(liveValues.currentEnemySpeed)}</span>
    </div>
    <div class="tuning-row">
      <span class="tuning-label">Chance élite actuelle</span>
      <span id="liveEliteChance" class="tuning-live-value">${(liveValues.currentEliteChance * 100).toFixed(1)}%</span>
    </div>
  `;

  section.appendChild(content);
  return section;
}

/**
 * Update live values display (called from game loop)
 */
export function updateLiveValues(state: GameState): void {
  if (!panelContext.state) return;

  const liveValues = calculateLiveValues(state);

  const dpsEl = document.getElementById("liveDps");
  const spawnRateEl = document.getElementById("liveSpawnRate");
  const enemyHpEl = document.getElementById("liveEnemyHp");
  const enemySpeedEl = document.getElementById("liveEnemySpeed");
  const eliteChanceEl = document.getElementById("liveEliteChance");

  if (dpsEl) dpsEl.textContent = liveValues.playerDps.toFixed(1);
  if (spawnRateEl) spawnRateEl.textContent = `${liveValues.currentSpawnRate.toFixed(2)} /s`;
  if (enemyHpEl) enemyHpEl.textContent = Math.round(liveValues.currentEnemyHp).toString();
  if (enemySpeedEl) enemySpeedEl.textContent = Math.round(liveValues.currentEnemySpeed).toString();
  if (eliteChanceEl) eliteChanceEl.textContent = `${(liveValues.currentEliteChance * 100).toFixed(1)}%`;
}

/**
 * Refresh the tuning panel UI to reflect current values
 */
export function refreshTuningPanel(): void {
  renderTuningPanel();
}
