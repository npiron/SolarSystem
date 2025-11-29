/**
 * DOM Elements module
 * Centralized management of DOM element references
 */

/** UI button references */
export interface UIButtons {
  pause: HTMLElement | null;
  resetProgress: HTMLElement | null;
  toggleSound: HTMLElement | null;
  softPrestige: HTMLElement | null;
  restartRun: HTMLElement | null;
  togglePerf: HTMLElement | null;
  toggleFps: HTMLElement | null;
  toggleGlowFx: HTMLElement | null;
  toggleBloomFx: HTMLElement | null;
  toggleGrainFx: HTMLElement | null;
  toggleHudPulse: HTMLElement | null;
  resetTalents: HTMLElement | null;
}

/** Debug button references */
export interface DebugButtons {
  giveEssence: HTMLElement | null;
  giveFragments: HTMLElement | null;
  skipWave: HTMLElement | null;
  nuke: HTMLElement | null;
}

/** Statistics display elements */
export interface StatElements {
  essence: HTMLElement | null;
  fragments: HTMLElement | null;
  idleRate: HTMLElement | null;
  wave: HTMLElement | null;
  hp: HTMLElement | null;
  dps: HTMLElement | null;
  damageRow: HTMLElement | null;
  spawnRate: HTMLElement | null;
  status: HTMLElement | null;
  talentStatus: HTMLElement | null;
  fpsValue: HTMLElement | null;
  fpsCanvas: HTMLCanvasElement | null;
  versionBadge: HTMLElement | null;
}

/** Container elements for dynamic content */
export interface ContainerElements {
  generators: HTMLElement | null;
  upgrades: HTMLElement | null;
  talents: HTMLElement | null;
  quickHelpList: HTMLElement | null;
  milestoneList: HTMLElement | null;
  assistBubbles: HTMLElement | null;
  canvas: HTMLCanvasElement | null;
}

/** All DOM element references */
export interface DOMElements {
  buttons: UIButtons;
  debug: DebugButtons;
  stats: StatElements;
  containers: ContainerElements;
}

/**
 * Retrieves all DOM element references
 * Should be called once during initialization
 */
export function getDOMElements(): DOMElements {
  return {
    buttons: {
      pause: document.getElementById("pause"),
      resetProgress: document.getElementById("resetProgress"),
      toggleSound: document.getElementById("toggleSound"),
      softPrestige: document.getElementById("softPrestige"),
      restartRun: document.getElementById("restartRun"),
      togglePerf: document.getElementById("togglePerf"),
      toggleFps: document.getElementById("toggleFps"),
      toggleGlowFx: document.getElementById("toggleGlowFx"),
      toggleBloomFx: document.getElementById("toggleBloomFx"),
      toggleGrainFx: document.getElementById("toggleGrainFx"),
      toggleHudPulse: document.getElementById("toggleHudPulse"),
      resetTalents: document.getElementById("resetTalents")
    },
    debug: {
      giveEssence: document.getElementById("debugGiveEssence"),
      giveFragments: document.getElementById("debugGiveFragments"),
      skipWave: document.getElementById("debugSkipWave"),
      nuke: document.getElementById("debugNuke")
    },
    stats: {
      essence: document.getElementById("essence"),
      fragments: document.getElementById("fragments"),
      idleRate: document.getElementById("idleRate"),
      wave: document.getElementById("wave"),
      hp: document.getElementById("hp"),
      dps: document.getElementById("dps"),
      damageRow: document.getElementById("damageRow"),
      spawnRate: document.getElementById("spawnRate"),
      status: document.getElementById("statusMessage"),
      talentStatus: document.getElementById("talentStatus"),
      fpsValue: document.getElementById("fpsValue"),
      fpsCanvas: document.getElementById("fpsGraph") as HTMLCanvasElement | null,
      versionBadge: document.getElementById("versionBadge")
    },
    containers: {
      generators: document.getElementById("generators"),
      upgrades: document.getElementById("upgrades"),
      talents: document.getElementById("talents"),
      quickHelpList: document.getElementById("quickHelpList"),
      milestoneList: document.getElementById("milestoneList"),
      assistBubbles: document.getElementById("assistBubbles"),
      canvas: document.getElementById("arena") as HTMLCanvasElement | null
    }
  };
}

/** UI reference maps for dynamic button updates */
export interface UIRefs {
  generatorButtons: Map<string, HTMLButtonElement>;
  upgradeButtons: Map<string, HTMLButtonElement>;
  talentButtons: Map<string, HTMLButtonElement>;
}

/**
 * Creates empty UI reference maps
 */
export function createUIRefs(): UIRefs {
  return {
    generatorButtons: new Map(),
    upgradeButtons: new Map(),
    talentButtons: new Map()
  };
}
