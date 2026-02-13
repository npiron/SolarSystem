import { recordFpsSample } from "../systems/performance.ts";
import type { GameState } from "../types/index.ts";

interface FrameContext {
  dt: number;
  width: number;
  height: number;
}

export function startGameLoop(state: GameState, onFrame: (context: FrameContext) => void): void {
  let lastFrameTime = performance.now();

  function gameLoop(currentTime: number): void {
    const frameMs = currentTime - lastFrameTime;
    lastFrameTime = currentTime;

    recordFpsSample(state.performance, frameMs);
    const dt = Math.min(0.05, frameMs / 1000);

    const width = window.innerWidth;
    const height = window.innerHeight;

    onFrame({ dt, width, height });
    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);
}
