/**
 * HUD Toggle System
 * Manages the visibility of HUD overlays (Run Stats, Performance, Upgrade Bar)
 * with toggle buttons and persistent state.
 */

const STORAGE_KEY = "hudToggleState";

interface HudToggleState {
  runStatsVisible: boolean;
  perfHudVisible: boolean;
  upgradeBarVisible: boolean;
}

interface HudElements {
  runStatsHud: HTMLElement | null;
  perfHud: HTMLElement | null;
  upgradeBar: HTMLElement | null;
  toggleRunStatsBtn: HTMLElement | null;
  togglePerfHudBtn: HTMLElement | null;
  toggleUpgradeBarBtn: HTMLElement | null;
}

let hudElements: HudElements | null = null;
let hudState: HudToggleState = {
  runStatsVisible: true,
  perfHudVisible: true,
  upgradeBarVisible: true,
};

/**
 * Load HUD toggle state from localStorage
 */
function loadState(): HudToggleState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...hudState, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.warn("Failed to load HUD toggle state:", e);
  }
  return hudState;
}

/**
 * Save HUD toggle state to localStorage
 */
function saveState(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(hudState));
  } catch (e) {
    console.warn("Failed to save HUD toggle state:", e);
  }
}

/**
 * Toggle visibility of a HUD element
 */
function toggleHudElement(
  element: HTMLElement | null,
  button: HTMLElement | null,
  visible: boolean
): void {
  if (!element || !button) return;

  if (visible) {
    element.classList.remove("collapsed");
    button.classList.add("active");
  } else {
    element.classList.add("collapsed");
    button.classList.remove("active");
  }
}

/**
 * Toggle Run Stats HUD visibility
 */
function toggleRunStats(): void {
  hudState.runStatsVisible = !hudState.runStatsVisible;
  toggleHudElement(
    hudElements?.runStatsHud ?? null,
    hudElements?.toggleRunStatsBtn ?? null,
    hudState.runStatsVisible
  );
  saveState();
}

/**
 * Toggle Performance HUD visibility
 */
function togglePerfHud(): void {
  hudState.perfHudVisible = !hudState.perfHudVisible;
  toggleHudElement(
    hudElements?.perfHud ?? null,
    hudElements?.togglePerfHudBtn ?? null,
    hudState.perfHudVisible
  );
  saveState();
}

/**
 * Toggle Upgrade Bar visibility
 */
function toggleUpgradeBar(): void {
  hudState.upgradeBarVisible = !hudState.upgradeBarVisible;
  toggleHudElement(
    hudElements?.upgradeBar ?? null,
    hudElements?.toggleUpgradeBarBtn ?? null,
    hudState.upgradeBarVisible
  );
  saveState();
}

/**
 * Apply current HUD state to all elements
 */
function applyHudState(): void {
  toggleHudElement(
    hudElements?.runStatsHud ?? null,
    hudElements?.toggleRunStatsBtn ?? null,
    hudState.runStatsVisible
  );
  toggleHudElement(
    hudElements?.perfHud ?? null,
    hudElements?.togglePerfHudBtn ?? null,
    hudState.perfHudVisible
  );
  toggleHudElement(
    hudElements?.upgradeBar ?? null,
    hudElements?.toggleUpgradeBarBtn ?? null,
    hudState.upgradeBarVisible
  );
}

/**
 * Initialize HUD toggle system
 */
export function initHudToggle(): void {
  // Get DOM elements
  hudElements = {
    runStatsHud: document.querySelector(".merged-run-hud"),
    perfHud: document.querySelector(".performance-hud"),
    upgradeBar: document.getElementById("upgradeBar"),
    toggleRunStatsBtn: document.getElementById("toggleRunStatsBtn"),
    togglePerfHudBtn: document.getElementById("togglePerfHudBtn"),
    toggleUpgradeBarBtn: document.getElementById("toggleUpgradeBarBtn"),
  };

  // Load saved state
  hudState = loadState();

  // Apply initial state
  applyHudState();

  // Add event listeners
  hudElements.toggleRunStatsBtn?.addEventListener("click", toggleRunStats);
  hudElements.togglePerfHudBtn?.addEventListener("click", togglePerfHud);
  hudElements.toggleUpgradeBarBtn?.addEventListener("click", toggleUpgradeBar);
}

/**
 * Get current HUD state (for external use)
 */
export function getHudState(): HudToggleState {
  return { ...hudState };
}
