import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "../src/renderer/render.ts";
import * as renderer from "../src/renderer/index.ts";
import { createInitialState } from "../src/systems/gameState.ts";

describe("render", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("draws layered black hole visuals for the player", () => {
    const beginFrameSpy = vi.spyOn(renderer, "beginFrame").mockImplementation(() => {});
    const pushCircleSpy = vi.spyOn(renderer, "pushCircle").mockImplementation(() => {});

    const state = createInitialState(800, 600);
    const context = { canvasWidth: 800, canvasHeight: 600, webgl2Renderer: {} as unknown as WebGL2RenderingContext } as const;

    render(state, context);

    expect(beginFrameSpy).toHaveBeenCalled();

    const playerCircleCalls = pushCircleSpy.mock.calls.filter(([circle]) =>
      circle?.x === state.player.x && circle?.y === state.player.y
    );

    expect(playerCircleCalls.length).toBeGreaterThanOrEqual(4);
  });
});
