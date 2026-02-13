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
import { audioManager } from "./systems/audio.ts";
import { updateHud } from "./systems/hud.ts";
import { initSound, playPrestige, playPurchase, setAudioEnabled } from "./systems/sound.ts";
import {
  computeTalentBonuses,
  hydrateTalents
} from "./systems/talents.ts";
import { createInitialState, softReset } from "./systems/gameState.ts";
import { applyProgressionEffects, computeGeneratorRate, refreshGeneratorRates } from "./systems/progression.ts";
import { computeIdleRate as computeIdleRateFromEconomy } from "./systems/economy.ts";
import {
  drawFpsGraph,
  updatePerformanceHud
} from "./systems/performance.ts";
import {
  updateLiveValues
} from "./systems/tuningPanel.ts";
import { updateLiveValuesHud } from "./systems/liveValuesHud";
import { updateGlobalStatsHud, updateWeaponsHud } from "./systems/additionalHuds";
import * as renderer from "./renderer/index.ts";
import { initDocumentationDialog } from "./renderer/documentation.ts";
import { codeDocumentation, roadmapSections } from "./config/documentation.ts";
import { update as gameUpdate } from "./game.ts";
import { render as gameRender } from "./renderer/render.ts";
import { clampPlayerToBounds } from "./player.ts";
import type { GameState, Generator, TalentBonuses, AssistUi, HudContext } from "./types/index.ts";
import { startGameLoop } from "./core/gameLoop.ts";
import { getUiElements } from "./core/uiElements.ts";
import { createHudContext } from "./core/hudContext.ts";
import { createProgressionActions } from "./core/progressionActions.ts";
import { initializeRuntime } from "./core/runtimeSetup.ts";

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

function softResetLocal(): void {
  const width = window.innerWidth;
  const height = window.innerHeight;
  softReset(state, width, height);
}

const progressionActions = createProgressionActions({
  state,
  generators,
  upgrades,
  getTalents: () => talents,
  uiRefs,
  generatorsContainer,
  upgradesContainer,
  talentsContainer,
  talentStatusEl,
  resetTalentsBtn,
  computeGeneratorRate: computeGeneratorRateLocal,
  applyProgressionEffects: applyProgressionEffectsLocal,
  refreshGeneratorRates: refreshGeneratorRatesLocal,
  softReset: softResetLocal,
  saveGame: saveGameLocal,
  onPurchase: () => {
    playPurchase();
    assistUi.recordPurchase();
  },
  onPrestige: () => {
    playPrestige();
    assistUi.recordPrestige();
  }
});

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
  assistUi = initializeRuntime({
    state,
    hudContext,
    talents,
    assistBubbles,
    upgrades,
    generators,
    uiElements: {
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
    uiActions: {
      saveGame: saveGameLocal,
      prestige: progressionActions.prestige,
      softReset: softResetLocal,
      applyProgressionEffects: applyProgressionEffectsLocal,
      refreshGeneratorRates: refreshGeneratorRatesLocal,
      renderGenerators: progressionActions.renderGenerators,
      renderUpgrades: progressionActions.renderUpgrades,
      renderTalents: progressionActions.renderTalents,
      updateUiTopMargin,
      resizeCanvas,
      buildBackground
    },
    windowLike: window,
    onResize: () => resizeCanvas(),
    onFirstInput: () => {
      audioManager.init();
      audioManager.resume();
    },
    onAutosave: saveGameLocal
  });

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
