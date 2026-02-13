/**
 * Main application entry point
 * 
 * This module bootstraps the application, initializes all modules,
 * and manages the game loop.
 */
import { VERSION } from "./config/constants.ts";
import { createGenerators } from "./config/generators.ts";
import { createUpgrades } from "./config/upgrades.ts";
import { loadSave, saveGame } from "./config/persistence.ts";
import { initAssist } from "./systems/assist.ts";
import { audioManager } from "./systems/audio.ts";
import { formatNumber, updateHud } from "./systems/hud.ts";
import { initSound, playPrestige, playPurchase, setAudioEnabled } from "./systems/sound.ts";
import {
  computeTalentBonuses,
  hydrateTalents,
  unlockTalent
} from "./systems/talents.ts";
import { createInitialState, softReset } from "./systems/gameState.ts";
import { applyProgressionEffects, computeGeneratorRate, refreshGeneratorRates } from "./systems/progression.ts";
import { computeIdleRate as computeIdleRateFromEconomy } from "./systems/economy.ts";
import {
  drawFpsGraph,
  updatePerformanceHud
} from "./systems/performance.ts";
import {
  renderGenerators as renderGeneratorsUI,
  renderUpgrades as renderUpgradesUI,
  renderTalents as renderTalentsUI
} from "./systems/ui.ts";
import { updateLiveValues } from "./systems/tuningPanel.ts";
import { updateLiveValuesHud } from "./systems/liveValuesHud";
import { updateGlobalStatsHud, updateWeaponsHud } from "./systems/additionalHuds";
import * as renderer from "./renderer/index.ts";
import { initDocumentationDialog } from "./renderer/documentation.ts";
import { codeDocumentation, roadmapSections } from "./config/documentation.ts";
import { update as gameUpdate } from "./game.ts";
import { render as gameRender } from "./renderer/render.ts";
import { clampPlayerToBounds } from "./player.ts";
import type { GameState, Generator, Talent, Upgrade, TalentBonuses, AssistUi, HudContext } from "./types/index.ts";
import { initMainUi } from "./core/uiInitialization.ts";
import { startGameLoop } from "./core/gameLoop.ts";
import { getUiElements } from "./core/uiElements.ts";
import { createHudContext } from "./core/hudContext.ts";

// UI boundaries - margins for left/right panels and header/footer
const UI_MARGINS = {
  left: 0,
  right: 16,
  top: 64, // Header height
  bottom: 0
};

// Canvas and renderer setup
const webgl2Canvas = document.getElementById("webgl2") as HTMLCanvasElement;
const webgl2Renderer = webgl2Canvas ? renderer.init(webgl2Canvas) : null;

function buildBackground(width: number, height: number): void {
  if (webgl2Renderer) {
    webgl2Renderer.setGridEnabled(!state.visualsLow);
    if (!state.visualsLow) {
      webgl2Renderer.resize(width, height);
    } else {
      webgl2Renderer.clear();
    }
  }
}

const {
  pauseBtn,
  resetProgressBtn,
  toggleSoundBtn,
  softPrestigeBtn,
  restartRunBtn,
  togglePerfBtn,
  toggleParallaxBtn,
  versionBadge,
  docDialog,
  docTabs,
  docContent,
  docBtn,
  docCloseBtn,
  debugBtns,
  generatorsContainer,
  upgradesContainer,
  talentsContainer,
  resetTalentsBtn,
  talentStatusEl,
  fpsCanvas,
  performanceHudElements,
  toggleFpsBtn,
  assistBubbles,
  tuningPanelContainer
} = getUiElements();

// Game data initialization
const generators = createGenerators();
const upgrades = createUpgrades();
let talents = hydrateTalents();
let talentBonuses = computeTalentBonuses(talents);

// Initialize documentation dialog
initDocumentationDialog({
  dialog: docDialog as HTMLDialogElement | null,
  trigger: docBtn,
  closeButton: docCloseBtn,
  tabs: docTabs,
  content: docContent,
  versionBadge,
  version: VERSION,
  codeDocs: codeDocumentation,
  roadmap: roadmapSections
});

// Create initial game state
const state: GameState = createInitialState(webgl2Canvas.width, webgl2Canvas.height);
state.talents.bonuses = talentBonuses;

let assistUi: AssistUi = {
  recordShot: () => { },
  recordPurchase: () => { },
  recordPrestige: () => { },
  trackWave: () => { },
  refreshMilestones: () => { }
};

// UI reference maps
const uiRefs = {
  generatorButtons: new Map<string, HTMLButtonElement>(),
  upgradeButtons: new Map<string, HTMLButtonElement>(),
  talentButtons: new Map<string, HTMLButtonElement>()
};

function updateUiTopMargin(): void {
  // New UI has fixed header size approx 64px
  UI_MARGINS.top = 64;
}


function resizeCanvas(center = false): void {
  updateUiTopMargin();
  const width = window.innerWidth;
  const height = window.innerHeight;
  webgl2Canvas.width = width;
  webgl2Canvas.height = height;
  buildBackground(width, height);
  webgl2Renderer?.resize(width, height);

  if (center) {
    // Center in playable area (accounting for UI margins)
    state.player.x = UI_MARGINS.left + (width - UI_MARGINS.left - UI_MARGINS.right) / 2;
    state.player.y = UI_MARGINS.top + (height - UI_MARGINS.top - UI_MARGINS.bottom) / 2;
  }
  // Add UI margins to canvas for proper player clamping
  clampPlayerToBounds(state, { width, height, uiMargins: UI_MARGINS });
  if (state.performance.graphVisible && fpsCanvas) {
    drawFpsGraph(fpsCanvas, state.performance);
  }
}

// Wrapper for computeIdleRate that uses current state
function computeIdleRate(): number {
  return computeIdleRateFromEconomy(generators, state.resources.idleMultiplier, talentBonuses);
}

// Wrapper for computeGeneratorRate that uses current state
function computeGeneratorRateLocal(generator: Generator): number {
  return computeGeneratorRate(generator, state.resources.idleMultiplier, talentBonuses.economy);
}

function applyProgressionEffectsLocal(): void {
  talentBonuses = applyProgressionEffects(state, upgrades, talents);
}

function refreshGeneratorRatesLocal(): void {
  refreshGeneratorRates(generators, state.resources.idleMultiplier, talentBonuses.economy);
}

function saveGameLocal(): void {
  saveGame(state, generators, upgrades, talents);
}

const hudContext: HudContext = createHudContext({
  uiRefs,
  generators,
  upgrades,
  talents,
  computeIdleRate
});

function buyGenerator(gen: Generator): void {
  if (state.resources.essence < gen.cost) return;
  state.resources.essence -= gen.cost;
  gen.level += 1;
  gen.cost = Math.ceil(gen.cost * 1.30 + gen.level * 1.5);
  gen.rate = computeGeneratorRateLocal(gen);
  refreshGeneratorRatesLocal();
  playPurchase();
  assistUi.recordPurchase();
}

function renderGenerators(): void {
  renderGeneratorsUI(
    generatorsContainer,
    generators,
    uiRefs,
    state.resources,
    computeGeneratorRateLocal,
    buyGenerator,
    saveGameLocal
  );
}

function isUpgradeCapped(upgrade: Upgrade): boolean {
  return Number.isFinite(upgrade.max) && upgrade.level >= upgrade.max;
}

function computeNextUpgradeCost(upgrade: Upgrade): number {
  const baseGrowth = Math.max(1.05, upgrade.growth ?? 1.4);
  const ramp = 1 + Math.max(0, upgrade.level - 25) * 0.012;
  const scaling = baseGrowth * ramp;
  return Math.ceil(upgrade.baseCost * Math.pow(scaling, upgrade.level + 1));
}

function buyUpgrade(upgrade: Upgrade): void {
  if (isUpgradeCapped(upgrade)) return;
  if (state.resources.fragments < upgrade.cost) return;
  state.resources.fragments -= upgrade.cost;
  upgrade.level += 1;
  upgrade.cost = computeNextUpgradeCost(upgrade);
  applyProgressionEffectsLocal();
  playPurchase();
  assistUi.recordPurchase();
}

function renderUpgrades(): void {
  renderUpgradesUI(
    upgradesContainer,
    upgrades,
    uiRefs,
    state.resources,
    buyUpgrade,
    saveGameLocal
  );
}

function buyTalent(talent: Talent): boolean {
  if (!unlockTalent(talent, talents, state)) return false;
  applyProgressionEffectsLocal();
  refreshGeneratorRatesLocal();
  playPurchase();
  return true;
}

function renderTalents(): void {
  renderTalentsUI(
    talentsContainer,
    talents,
    uiRefs,
    state.resources,
    buyTalent,
    saveGameLocal,
    renderUpgrades,
    talentStatusEl,
    resetTalentsBtn
  );
}

function softResetLocal(): void {
  const width = window.innerWidth;
  const height = window.innerHeight;
  softReset(state, width, height);
}

function prestige(): void {
  const bonus = 1 + Math.pow(state.wave, 0.45) * 0.20;
  state.resources.idleMultiplier *= bonus;
  refreshGeneratorRatesLocal();
  softResetLocal();
  refreshGeneratorRatesLocal();
  softResetLocal();
  // state.prestigeCooldown = 10; // Disabled for testing
  playPrestige();
  assistUi.recordPrestige();
  saveGameLocal();
  renderGenerators();
}

async function bootstrap(): Promise<void> {
  resizeCanvas(true);
  buildBackground(webgl2Canvas.width, webgl2Canvas.height);

  // Load saved game state
  talents = loadSave(state, {
    generators,
    upgrades,
    talents,
    computeGeneratorRate: computeGeneratorRateLocal,
    applyProgressionEffects: applyProgressionEffectsLocal,
    refreshGeneratorRates: refreshGeneratorRatesLocal,
    updateHud: () => updateHud(state, hudContext)
  }, computeIdleRate);
  hudContext.talents = talents;
  talentBonuses = computeTalentBonuses(talents);
  state.talents.bonuses = talentBonuses;

  // Initialize performance mode CSS class
  document.body.classList.toggle("performance-mode", state.visualsLow);
  buildBackground(webgl2Canvas.width, webgl2Canvas.height);

  initSound(state.audio.enabled);
  setAudioEnabled(state.audio.enabled);
  assistUi = initAssist(state, {
    quickHelpList: null, // Removed in UI redesign
    milestoneList: null, // Removed in UI redesign
    bubbleContainer: assistBubbles,
    anchors: {
      arena: webgl2Canvas,
      generators: generatorsContainer,
      upgrades: upgradesContainer,
      prestige: softPrestigeBtn
    },
    upgrades,
    generators
  });
  initMainUi({
    state,
    talents,
    hudContext,
    elements: {
      pauseBtn,
      resetProgressBtn,
      toggleSoundBtn,
      softPrestigeBtn,
      restartRunBtn,
      togglePerfBtn,
      toggleParallaxBtn,
      toggleFpsBtn,
      docDialog,
      webgl2Canvas,
      fpsCanvas,
      assistBubbles,
      tuningPanelContainer,
      generatorsContainer,
      upgradesContainer,
      debugBtns,
      resetTalentsBtn
    },
    actions: {
      saveGame: saveGameLocal,
      prestige,
      softReset: softResetLocal,
      applyProgressionEffects: applyProgressionEffectsLocal,
      refreshGeneratorRates: refreshGeneratorRatesLocal,
      renderGenerators,
      renderUpgrades,
      renderTalents,
      updateUiTopMargin,
      resizeCanvas,
      buildBackground
    }
  });
  window.addEventListener("resize", () => resizeCanvas());
  setInterval(saveGameLocal, 5000);
  // Initialize audio on first user interaction
  window.addEventListener('click', () => {
    audioManager.init();
    audioManager.resume();
  }, { once: true });

  window.addEventListener('keydown', () => {
    audioManager.init();
    audioManager.resume();
  }, { once: true });

  startGameLoop(state, ({ dt, width, height }) => {
    gameUpdate(state, dt, {
      canvasWidth: width,
      canvasHeight: height,
      generators,
      talentBonuses,
      assistUi
    });
    updateHud(state, hudContext);
    updatePerformanceHud(performanceHudElements, state.performance);
    updateLiveValues(state);
    updateLiveValuesHud(state);
    updateGlobalStatsHud(state);
    updateWeaponsHud(state);
    // Note: renderWeapons is not called here - it's called once at init and on unlock/upgrade
    gameRender(state, {
      canvasWidth: width,
      canvasHeight: height,
      webgl2Renderer
    });
  });
}

bootstrap();
