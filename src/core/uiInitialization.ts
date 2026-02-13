import { STORAGE_KEY } from "../config/constants.ts";
import { loadTuning } from "../config/tuning.ts";
import { debugPing, updateHud } from "../systems/hud.ts";
import { initLiveValuesHud } from "../systems/liveValuesHud.ts";
import { drawFpsGraph } from "../systems/performance.ts";
import { PanelManager } from "../systems/panelManager.ts";
import { initAdditionalHuds } from "../systems/additionalHuds.ts";
import { playUiToggle, resumeAudio, setAudioEnabled } from "../systems/sound.ts";
import { resetTalents } from "../systems/talents.ts";
import { initTuningPanel } from "../systems/tuningPanel.ts";
import { initWeaponsUI, renderWeapons } from "../systems/weaponsUI.ts";
import type { GameState, HudContext, Talent } from "../types/index.ts";

interface DebugButtons {
  giveEssence: HTMLElement | null;
  giveFragments: HTMLElement | null;
  skipWave: HTMLElement | null;
  nuke: HTMLElement | null;
}

interface UiElements {
  pauseBtn: HTMLElement | null;
  resetProgressBtn: HTMLElement | null;
  toggleSoundBtn: HTMLElement | null;
  softPrestigeBtn: HTMLElement | null;
  restartRunBtn: HTMLElement | null;
  togglePerfBtn: HTMLElement | null;
  toggleParallaxBtn: HTMLElement | null;
  toggleFpsBtn: HTMLElement | null;
  docDialog: HTMLElement | null;
  webgl2Canvas: HTMLCanvasElement;
  fpsCanvas: HTMLCanvasElement | null;
  assistBubbles: HTMLElement | null;
  tuningPanelContainer: HTMLElement | null;
  generatorsContainer: HTMLElement;
  upgradesContainer: HTMLElement;
  debugBtns: DebugButtons;
  resetTalentsBtn: HTMLButtonElement | null;
}

interface UiActions {
  saveGame: () => void;
  prestige: () => void;
  softReset: () => void;
  applyProgressionEffects: () => void;
  refreshGeneratorRates: () => void;
  renderGenerators: () => void;
  renderUpgrades: () => void;
  renderTalents: () => void;
  updateUiTopMargin: () => void;
  resizeCanvas: () => void;
  buildBackground: (width: number, height: number) => void;
}

interface InitUiOptions {
  state: GameState;
  talents: Talent[];
  hudContext: HudContext;
  elements: UiElements;
  actions: UiActions;
}

export function initMainUi({ state, talents, hudContext, elements, actions }: InitUiOptions): void {
  const {
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
    debugBtns,
    resetTalentsBtn,
    tuningPanelContainer
  } = elements;
  const {
    saveGame,
    prestige,
    softReset,
    applyProgressionEffects,
    refreshGeneratorRates,
    renderGenerators,
    renderUpgrades,
    renderTalents,
    updateUiTopMargin,
    resizeCanvas,
    buildBackground
  } = actions;

  const syncSoundToggle = (): void => {
    if (!toggleSoundBtn) return;
    toggleSoundBtn.innerHTML = state.audio.enabled ? '<i class="ti ti-volume"></i>' : '<i class="ti ti-volume-off"></i>';
  };

  const syncParallaxToggle = (): void => {
    if (!toggleParallaxBtn) return;
    toggleParallaxBtn.innerHTML = state.visualsParallax
      ? '<i class="ti ti-photo"></i> Fond réaliste'
      : '<i class="ti ti-photo-off"></i> Fond simple';
    toggleParallaxBtn.title = state.visualsLow
      ? "Fond désactivé en mode perfo"
      : "Activer/désactiver le fond réaliste";
  };

  const armAudioUnlock = (): void => {
    const unlock = () => resumeAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
  };

  armAudioUnlock();
  syncSoundToggle();
  syncParallaxToggle();

  pauseBtn?.addEventListener("click", () => {
    state.running = !state.running;
    if (pauseBtn) pauseBtn.innerHTML = state.running ? '<i class="ti ti-player-pause"></i> PAUSE' : '<i class="ti ti-player-play"></i> REPRENDRE';
    saveGame();
  });

  toggleSoundBtn?.addEventListener("click", () => {
    state.audio.enabled = !state.audio.enabled;
    resumeAudio();
    setAudioEnabled(state.audio.enabled);
    syncSoundToggle();
    playUiToggle();
    saveGame();
  });

  resetProgressBtn?.addEventListener("click", () => {
    if (confirm("Effacer la sauvegarde et recommencer ?")) {
      localStorage.removeItem(STORAGE_KEY);
      window.location.reload();
    }
  });

  softPrestigeBtn?.addEventListener("click", () => {
    prestige();
  });

  restartRunBtn?.addEventListener("click", () => {
    softReset();
    saveGame();
  });

  resetTalentsBtn?.addEventListener("click", () => {
    if (!resetTalents(talents, state)) return;
    applyProgressionEffects();
    refreshGeneratorRates();
    renderTalents();
    renderGenerators();
    renderUpgrades();
    saveGame();
  });

  togglePerfBtn?.addEventListener("click", () => {
    state.visualsLow = !state.visualsLow;
    if (togglePerfBtn) togglePerfBtn.textContent = state.visualsLow ? "🚀 Perfo ON" : "⚙️ Mode perfo";

    document.body.classList.toggle("performance-mode", state.visualsLow);
    syncParallaxToggle();

    buildBackground(webgl2Canvas.width, webgl2Canvas.height);
    playUiToggle();
    debugPing(state, state.visualsLow ? "Mode perfo" : "Mode flair", state.visualsLow ? "#22c55e" : "#a78bfa", () =>
      updateHud(state, hudContext)
    );
  });

  toggleParallaxBtn?.addEventListener("click", () => {
    state.visualsParallax = !state.visualsParallax;
    syncParallaxToggle();
    playUiToggle();
    saveGame();
  });

  toggleFpsBtn?.addEventListener("click", () => {
    state.performance.graphVisible = !state.performance.graphVisible;
    fpsCanvas?.classList.toggle("visible", state.performance.graphVisible);
    if (fpsCanvas) drawFpsGraph(fpsCanvas, state.performance);
  });

  debugBtns.giveEssence?.addEventListener("click", () => {
    state.resources.essence += 1_000_000;
    renderGenerators();
    saveGame();
    debugPing(state, "+1M ⚡", undefined, () => updateHud(state, hudContext));
  });
  debugBtns.giveFragments?.addEventListener("click", () => {
    state.resources.fragments += 1_000_000;
    renderUpgrades();
    renderTalents();
    saveGame();
    debugPing(state, "+1M ✦", undefined, () => updateHud(state, hudContext));
  });
  debugBtns.skipWave?.addEventListener("click", () => {
    state.wave += 10;
    state.spawnTimer = 0;
    saveGame();
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

  initWeaponsUI();
  renderWeapons(state);

  const panelMgr = new PanelManager();

  // Quick-access production button in the HUD
  const quickProdBtn = document.getElementById("quickProduction");
  if (quickProdBtn) {
    quickProdBtn.addEventListener("click", () => {
      panelMgr.togglePanel("production");
      playUiToggle();
    });
  }

  const toggleGuideBtn = document.getElementById("toggle-guide");
  if (toggleGuideBtn && docDialog) {
    toggleGuideBtn.addEventListener("click", () => {
      (docDialog as HTMLDialogElement).showModal();
      playUiToggle();
    });
  }

  updateUiTopMargin();
  resizeCanvas();

  loadTuning();
  initTuningPanel({
    container: tuningPanelContainer,
    state,
    onUpdate: () => {
      updateHud(state, hudContext);
    },
    onTuningChange: () => {
      softReset();
      saveGame();
    }
  });

  initLiveValuesHud();
  initAdditionalHuds();
}
