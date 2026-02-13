import type { PerformanceHudElements } from "../systems/performance.ts";

interface DebugButtons {
  giveEssence: HTMLElement | null;
  giveFragments: HTMLElement | null;
  skipWave: HTMLElement | null;
  nuke: HTMLElement | null;
}

export interface UiElements {
  pauseBtn: HTMLElement | null;
  resetProgressBtn: HTMLElement | null;
  toggleSoundBtn: HTMLElement | null;
  softPrestigeBtn: HTMLElement | null;
  restartRunBtn: HTMLElement | null;
  togglePerfBtn: HTMLElement | null;
  toggleParallaxBtn: HTMLElement | null;
  versionBadge: HTMLElement | null;
  docDialog: HTMLElement | null;
  docTabs: HTMLElement | null;
  docContent: HTMLElement | null;
  docBtn: HTMLElement | null;
  docCloseBtn: HTMLButtonElement | null;
  topbarEl: HTMLElement | null;
  upgradeBarEl: HTMLElement | null;
  debugBtns: DebugButtons;
  generatorsContainer: HTMLElement;
  upgradesContainer: HTMLElement;
  talentsContainer: HTMLElement | null;
  resetTalentsBtn: HTMLButtonElement | null;
  talentStatusEl: HTMLElement | null;
  fpsCanvas: HTMLCanvasElement | null;
  performanceHudElements: PerformanceHudElements;
  toggleFpsBtn: HTMLElement | null;
  quickHelpList: HTMLElement | null;
  milestoneList: HTMLElement | null;
  assistBubbles: HTMLElement | null;
  tuningPanelContainer: HTMLElement | null;
}

function getRequiredElement(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing required UI element: #${id}`);
  }
  return element;
}

export function getUiElements(): UiElements {
  const pauseBtn = document.getElementById("pause");
  const resetProgressBtn = document.getElementById("resetProgress");
  const toggleSoundBtn = document.getElementById("toggleSound");
  const softPrestigeBtn = document.getElementById("softPrestige");
  const restartRunBtn = document.getElementById("restartRun");
  const togglePerfBtn = document.getElementById("togglePerf");
  const toggleParallaxBtn = document.getElementById("toggleParallax");
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
  const generatorsContainer = getRequiredElement("generators");
  const upgradesContainer = (document.getElementById("upgradeBar") || document.getElementById("upgrades"));
  if (!upgradesContainer) {
    throw new Error("Missing required UI element: #upgradeBar or #upgrades");
  }
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

  return {
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
    topbarEl,
    upgradeBarEl,
    debugBtns,
    generatorsContainer,
    upgradesContainer,
    talentsContainer,
    resetTalentsBtn,
    talentStatusEl,
    fpsCanvas,
    performanceHudElements,
    toggleFpsBtn,
    quickHelpList,
    milestoneList,
    assistBubbles,
    tuningPanelContainer
  };
}
