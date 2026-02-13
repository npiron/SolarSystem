import { describe, expect, it, vi } from "vitest";

const initAssistMock = vi.fn(() => ({
  recordShot: () => { },
  recordPurchase: () => { },
  recordPrestige: () => { },
  trackWave: () => { },
  refreshMilestones: () => { }
}));
const initMainUiMock = vi.fn();

vi.mock("../src/systems/assist.ts", () => ({
  initAssist: initAssistMock
}));

vi.mock("../src/core/uiInitialization.ts", () => ({
  initMainUi: initMainUiMock
}));

describe("runtimeSetup", () => {
  it("should register resize, autosave, and first-input listeners", async () => {
    const { bindRuntimeListeners } = await import("../src/core/runtimeSetup.ts");
    const addEventListener = vi.fn();
    const setInterval = vi.fn();
    const windowLike = { addEventListener, setInterval };

    const onResize = vi.fn();
    const onFirstInput = vi.fn();
    const onAutosave = vi.fn();

    bindRuntimeListeners({
      windowLike,
      onResize,
      onFirstInput,
      onAutosave
    });

    expect(addEventListener).toHaveBeenCalledWith("resize", onResize);
    expect(setInterval).toHaveBeenCalledWith(onAutosave, 5000);
    expect(addEventListener).toHaveBeenCalledWith("click", onFirstInput, { once: true });
    expect(addEventListener).toHaveBeenCalledWith("keydown", onFirstInput, { once: true });
  });

  it("should initialize assist UI and delegate UI/runtime wiring", async () => {
    const { initializeRuntime } = await import("../src/core/runtimeSetup.ts");
    const windowLike = {
      addEventListener: vi.fn(),
      setInterval: vi.fn()
    };
    const state = {
      resources: { idleMultiplier: 1 },
      visualsLow: false
    } as never;
    const uiElements = {
      webgl2Canvas: {} as HTMLCanvasElement,
      generatorsContainer: {} as HTMLElement,
      upgradesContainer: {} as HTMLElement,
      softPrestigeBtn: null
    } as never;

    const assistUi = initializeRuntime({
      state,
      hudContext: {} as never,
      talents: [],
      assistBubbles: null,
      upgrades: [],
      generators: [],
      uiElements,
      uiActions: {} as never,
      windowLike,
      onResize: vi.fn(),
      onFirstInput: vi.fn(),
      onAutosave: vi.fn()
    });

    expect(initAssistMock).toHaveBeenCalledTimes(1);
    expect(initMainUiMock).toHaveBeenCalledTimes(1);
    expect(windowLike.addEventListener).toHaveBeenCalledTimes(3);
    expect(windowLike.setInterval).toHaveBeenCalledTimes(1);
    expect(assistUi).toBe(initAssistMock.mock.results[0].value);
  });
});
