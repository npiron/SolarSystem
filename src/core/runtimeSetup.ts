import { initAssist } from "../systems/assist.ts";
import { initMainUi } from "./uiInitialization.ts";
import type { AssistUi, GameState, Generator, HudContext, Upgrade } from "../types/index.ts";

interface WindowLike {
  addEventListener: (type: string, listener: EventListenerOrEventListenerObject, options?: AddEventListenerOptions) => void;
  setInterval: (handler: TimerHandler, timeout?: number) => number;
}

interface RuntimeBindingsOptions {
  windowLike: WindowLike;
  onResize: () => void;
  onFirstInput: () => void;
  onAutosave: () => void;
  autosaveMs?: number;
}

interface InitializeRuntimeOptions {
  state: GameState;
  hudContext: HudContext;
  talents: HudContext["talents"];
  assistBubbles: HTMLElement | null;
  webgl2Canvas: HTMLCanvasElement;
  generatorsContainer: HTMLElement;
  upgradesContainer: HTMLElement;
  softPrestigeBtn: HTMLElement | null;
  upgrades: Upgrade[];
  generators: Generator[];
  uiElements: Parameters<typeof initMainUi>[0]["elements"];
  uiActions: Parameters<typeof initMainUi>[0]["actions"];
  windowLike: WindowLike;
  onResize: () => void;
  onFirstInput: () => void;
  onAutosave: () => void;
}

export function bindRuntimeListeners({
  windowLike,
  onResize,
  onFirstInput,
  onAutosave,
  autosaveMs = 5000
}: RuntimeBindingsOptions): void {
  windowLike.addEventListener("resize", onResize);
  windowLike.setInterval(onAutosave, autosaveMs);
  windowLike.addEventListener("click", onFirstInput, { once: true });
  windowLike.addEventListener("keydown", onFirstInput, { once: true });
}

export function initializeRuntime({
  state,
  hudContext,
  talents,
  assistBubbles,
  webgl2Canvas,
  generatorsContainer,
  upgradesContainer,
  softPrestigeBtn,
  upgrades,
  generators,
  uiElements,
  uiActions,
  windowLike,
  onResize,
  onFirstInput,
  onAutosave
}: InitializeRuntimeOptions): AssistUi {
  const assistUi = initAssist(state, {
    quickHelpList: null,
    milestoneList: null,
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
    elements: uiElements,
    actions: uiActions
  });

  bindRuntimeListeners({
    windowLike,
    onResize,
    onFirstInput,
    onAutosave
  });

  return assistUi;
}
