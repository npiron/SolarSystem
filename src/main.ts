/**
 * Main application entry point
 * 
 * This module bootstraps the application, initializes all modules,
 * and manages the game loop.
 */
import { STORAGE_KEY, VERSION, icons } from "./config/constants.ts";
import { createGenerators } from "./config/generators.ts";
import { TALENT_RESET_COST } from "./config/talents.ts";
import { createUpgrades } from "./config/upgrades.ts";
import { loadSave, saveGame } from "./config/persistence.ts";
import { loadTuning } from "./config/tuning.ts";
import { initAssist } from "./systems/assist.ts";
import { PanelManager } from "./systems/panelManager.ts";
import { debugPing, formatNumber, updateHud } from "./systems/hud.ts";
import { initSound, playPrestige, playPurchase, playUiToggle, resumeAudio, setAudioEnabled } from "./systems/sound.ts";
import {
  computeTalentBonuses,
  canUnlockTalent,
  hydrateTalents,
  resetTalents,
  unlockTalent
} from "./systems/talents.ts";
import { createInitialState, softReset } from "./systems/gameState.ts";
import { applyProgressionEffects, computeGeneratorRate, refreshGeneratorRates } from "./systems/progression.ts";
import { computeIdleRate as computeIdleRateFromEconomy } from "./systems/economy.ts";
import {
  recordFpsSample,
  drawFpsGraph,
  updatePerformanceHud,
  type PerformanceHudElements
} from "./systems/performance.ts";
import { initSidebarSystem } from "./systems/sidebar.ts";
import {
  renderGenerators as renderGeneratorsUI,
  renderUpgrades as renderUpgradesUI,
  renderTalents as renderTalentsUI
} from "./systems/ui.ts";
import { initTuningPanel, updateLiveValues } from "./systems/tuningPanel.ts";
import { initLiveValuesHud, updateLiveValuesHud } from "./systems/liveValuesHud";
import { initAdditionalHuds, updateGlobalStatsHud, updateWeaponsHud } from "./systems/additionalHuds";
import { initWeaponsUI, renderWeapons } from "./systems/weaponsUI";
import * as renderer from "./renderer/index.ts";
import { initDocumentationDialog } from "./renderer/documentation.ts";
import { codeDocumentation, roadmapSections } from "./config/documentation.ts";
import { update as gameUpdate } from "./game.ts";
import { render as gameRender } from "./renderer/render.ts";
import { clampPlayerToBounds } from "./player.ts";
import type { GameState, Generator, Talent, Upgrade, TalentBonuses, AssistUi, HudContext } from "./types/index.ts";

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

// UI Element References
const pauseBtn = document.getElementById("pause");
const resetProgressBtn = document.getElementById("resetProgress");
const toggleSoundBtn = document.getElementById("toggleSound");
const softPrestigeBtn = document.getElementById("softPrestige");
const restartRunBtn = document.getElementById("restartRun");
const togglePerfBtn = document.getElementById("togglePerf");
const versionBadge = document.getElementById("versionBadge");
const docDialog = document.getElementById("docDialog");
const docTabs = document.getElementById("docTabs");
const docContent = document.getElementById("docContent");
const docBtn = document.getElementById("docBtn");
const docCloseBtn = docDialog?.querySelector(".doc-close-btn") as HTMLButtonElement | null;
const topbarEl = document.querySelector(".topbar") as HTMLElement | null;
const upgradeBarEl = document.getElementById("upgradeBar") as HTMLElement | null;
const debugBtns = {
  giveEssence: document.getElementById("debugGiveEssence"),
  giveFragments: document.getElementById("debugGiveFragments"),
  skipWave: document.getElementById("debugSkipWave"),
  nuke: document.getElementById("debugNuke")
};

const essenceEl = document.getElementById("essence");
const fragmentsEl = document.getElementById("fragments");
const idleRateEl = document.getElementById("idleRate");
const waveEl = document.getElementById("wave");
const hpEl = document.getElementById("hp");
const dpsEl = document.getElementById("dps");
const damageRow = document.getElementById("damageRow");
const spawnRateEl = document.getElementById("spawnRate");
const statusEl = document.getElementById("statusMessage");
const generatorsContainer = document.getElementById("generators") as HTMLElement;
// Fallback to 'upgrades' provided by new HTML
const upgradesContainer = (document.getElementById("upgradeBar") || document.getElementById("upgrades")) as HTMLElement;
const talentsContainer = document.getElementById("talents") as HTMLElement | null;
const resetTalentsBtn = document.getElementById("resetTalents") as HTMLButtonElement | null;
const talentStatusEl = document.getElementById("talentStatus");
const fpsValueEl = document.getElementById("hudFpsValue");
const frameTimeEl = document.getElementById("hudFrameTime");
const avgFpsEl = document.getElementById("hudAvgFps");
const memoryEl = document.getElementById("hudMemory");
const fpsCanvas = document.getElementById("fpsGraphHud") as HTMLCanvasElement | null;
const performanceHudElements: PerformanceHudElements = {
  fpsValueEl,
  frameTimeEl,
  avgFpsEl,
  memoryEl,
  fpsCanvas
};
const toggleFpsBtn = document.getElementById("toggleFpsFromHud");
const quickHelpList = document.getElementById("quickHelpList");
const milestoneList = document.getElementById("milestoneList");
const assistBubbles = document.getElementById("assistBubbles");
const tuningPanelContainer = document.getElementById("tuningPanel");

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

const hudContext: HudContext = {
  elements: {
    essenceEl,
    fragmentsEl,
    idleRateEl,
    waveEl,
    hpEl,
    dpsEl,
    damageRow,
    spawnRateEl,
    pauseBtn,
    softPrestigeBtn,
    statusEl
  },
  uiRefs,
  generators,
  upgrades,
  talents,
  computeIdleRate,
  canUnlockTalent
};

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

function initUI(): void {
  const syncSoundToggle = (): void => {
    if (!toggleSoundBtn) return;
    toggleSoundBtn.innerHTML = state.audio.enabled ? '<i class="ti ti-volume"></i>' : '<i class="ti ti-volume-off"></i>';
  };

  const armAudioUnlock = (): void => {
    const unlock = () => resumeAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
  };

  armAudioUnlock();
  syncSoundToggle();

  pauseBtn?.addEventListener("click", () => {
    state.running = !state.running;
    if (pauseBtn) pauseBtn.innerHTML = state.running ? '<i class="ti ti-player-pause"></i> PAUSE' : '<i class="ti ti-player-play"></i> REPRENDRE';
    saveGameLocal();
  });

  toggleSoundBtn?.addEventListener("click", () => {
    state.audio.enabled = !state.audio.enabled;
    resumeAudio();
    setAudioEnabled(state.audio.enabled);
    syncSoundToggle();
    playUiToggle();
    saveGameLocal();
  });


  resetProgressBtn?.addEventListener("click", () => {
    if (confirm("Effacer la sauvegarde et recommencer ?")) {
      localStorage.removeItem(STORAGE_KEY);
      window.location.reload();
    }
  });

  softPrestigeBtn?.addEventListener("click", () => {
    // if (state.prestigeCooldown > 0) return; // Disabled for testing
    prestige();
  });

  restartRunBtn?.addEventListener("click", () => {
    softResetLocal();
    saveGameLocal();
  });

  resetTalentsBtn?.addEventListener("click", () => {
    if (!resetTalents(talents, state)) return;
    applyProgressionEffectsLocal();
    refreshGeneratorRatesLocal();
    renderTalents();
    renderGenerators();
    renderUpgrades();
    saveGameLocal();
  });

  togglePerfBtn?.addEventListener("click", () => {
    state.visualsLow = !state.visualsLow;
    if (togglePerfBtn) togglePerfBtn.textContent = state.visualsLow ? "🚀 Perfo ON" : "⚙️ Mode perfo";

    // Toggle CSS class for performance mode decorations
    document.body.classList.toggle("performance-mode", state.visualsLow);

    buildBackground(webgl2Canvas.width, webgl2Canvas.height);
    // REMOVED: webgl2Renderer?.setEnabled(!state.visualsLow);
    playUiToggle();
    debugPing(state, state.visualsLow ? "Mode perfo" : "Mode flair", state.visualsLow ? "#22c55e" : "#a78bfa", () =>
      updateHud(state, hudContext)
    );
  });

  toggleFpsBtn?.addEventListener("click", () => {
    state.performance.graphVisible = !state.performance.graphVisible;
    fpsCanvas?.classList.toggle("visible", state.performance.graphVisible);
    if (fpsCanvas) drawFpsGraph(fpsCanvas, state.performance);
  });

  debugBtns.giveEssence?.addEventListener("click", () => {
    state.resources.essence += 1_000_000;
    renderGenerators();
    saveGameLocal();
    debugPing(state, "+1M ⚡", undefined, () => updateHud(state, hudContext));
  });
  debugBtns.giveFragments?.addEventListener("click", () => {
    state.resources.fragments += 1_000_000;
    renderUpgrades();
    renderTalents();
    saveGameLocal();
    debugPing(state, "+1M ✦", undefined, () => updateHud(state, hudContext));
  });
  debugBtns.skipWave?.addEventListener("click", () => {
    state.wave += 10;
    state.spawnTimer = 0;
    saveGameLocal();
    debugPing(state, "+10 vagues", undefined, () => updateHud(state, hudContext));
  });
  debugBtns.nuke?.addEventListener("click", () => {
    state.enemies = [];
    state.fragmentsOrbs = [];
    debugPing(state, "☄️ Nuke", "#f472b6", () => updateHud(state, hudContext));
  });

  renderGenerators();
  renderUpgrades();
  renderTalents();

  // Initialize weapons UI
  initWeaponsUI();
  renderWeapons(state);

  // Initialize Panel Manager
  new PanelManager();

  // Wire up Guide button
  const toggleGuideBtn = document.getElementById("toggle-guide");
  if (toggleGuideBtn && docDialog) {
    toggleGuideBtn.addEventListener("click", () => {
      (docDialog as HTMLDialogElement).showModal();
      playUiToggle();
    });
  }

  // After layout, recompute UI top margin and clamp bounds
  updateUiTopMargin();
  resizeCanvas();

  // Initialize tuning panel
  loadTuning();
  initTuningPanel({
    container: tuningPanelContainer,
    state,
    onUpdate: () => {
      // Refresh UI when tuning changes
      updateHud(state, hudContext);
    },
    onTuningChange: () => {
      // Reset game when tuning values change (to avoid inconsistencies)
      softResetLocal();
      saveGameLocal();
    }
  });

  // Initialize live values HUD
  initLiveValuesHud();

  // Initialize additional huds
  initAdditionalHuds();
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
  initUI();
  window.addEventListener("resize", () => resizeCanvas());
  setInterval(saveGameLocal, 5000);

  let lastTime = performance.now();

  function gameLoop(currentTime: number): void {
    const frameMs = currentTime - lastTime;
    lastTime = currentTime;

    recordFpsSample(state.performance, frameMs);
    const dt = Math.min(0.05, frameMs / 1000);

    const width = window.innerWidth;
    const height = window.innerHeight;

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

    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);
}

bootstrap();
