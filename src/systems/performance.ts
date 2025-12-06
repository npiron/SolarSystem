/**
 * Performance monitoring and FPS tracking.
 * Provides FPS recording and graph drawing utilities.
 */
import type { PerformanceState } from "../types/state.ts";

type PerformanceMemory = { usedJSHeapSize: number; jsHeapSizeLimit: number };

function readMemorySnapshot(perf: Performance): PerformanceMemory | null {
  const perfWithMemory = perf as Performance & { memory?: PerformanceMemory };
  if (!perfWithMemory.memory) return null;
  const { usedJSHeapSize, jsHeapSizeLimit } = perfWithMemory.memory;
  if (typeof usedJSHeapSize !== "number" || typeof jsHeapSizeLimit !== "number") return null;
  return { usedJSHeapSize, jsHeapSizeLimit };
}

/**
 * Record an FPS sample based on frame timing.
 * @param performanceState - The performance state to update
 * @param frameMs - Frame time in milliseconds
 */
export function recordFpsSample(performanceState: PerformanceState, frameMs: number): void {
  const fps = 1000 / Math.max(1, frameMs);
  performanceState.fps = fps;
  performanceState.frameTimeMs = frameMs;
  performanceState.history.push(fps);
  if (performanceState.history.length > performanceState.maxSamples) {
    performanceState.history.shift();
  }
  const averageFps =
    performanceState.history.reduce((sum, value) => sum + value, 0) /
    performanceState.history.length;
  performanceState.avgFps = averageFps;

  const memorySnapshot = readMemorySnapshot(performance);
  if (memorySnapshot) {
    performanceState.memoryUsageMb = memorySnapshot.usedJSHeapSize / 1_048_576;
    performanceState.memoryLimitMb = memorySnapshot.jsHeapSizeLimit / 1_048_576;
  } else {
    performanceState.memoryUsageMb = null;
    performanceState.memoryLimitMb = null;
  }
}

/**
 * Draw the FPS graph on a canvas element.
 * @param fpsCanvas - The canvas element to draw on
 * @param performanceState - The performance state containing FPS history
 */
export function drawFpsGraph(fpsCanvas: HTMLCanvasElement | null, performanceState: PerformanceState): void {
  if (!fpsCanvas || !performanceState.graphVisible) return;
  if (fpsCanvas.width !== fpsCanvas.clientWidth) fpsCanvas.width = fpsCanvas.clientWidth;
  if (fpsCanvas.height !== fpsCanvas.clientHeight) fpsCanvas.height = fpsCanvas.clientHeight;
  const ctx = fpsCanvas.getContext("2d");
  if (!ctx) return;

  const history = performanceState.history;
  const { width, height } = fpsCanvas;
  ctx.clearRect(0, 0, width, height);
  if (!history.length) return;

  const maxFps = Math.max(30, ...history);
  const minFps = Math.min(0, ...history);
  const range = Math.max(1, maxFps - minFps);
  const stepX = history.length > 1 ? width / (history.length - 1) : width;

  const targetFps = 60;
  const targetY = height - ((targetFps - minFps) / range) * height;
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = "rgba(255, 220, 170, 0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, targetY);
  ctx.lineTo(width, targetY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = "#d6b96c";
  ctx.lineWidth = 2;
  ctx.beginPath();
  history.forEach((fpsValue, idx) => {
    const x = idx * stepX;
    const y = height - ((fpsValue - minFps) / range) * height;
    if (idx === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.stroke();

  ctx.fillStyle = "rgba(214, 185, 108, 0.12)";
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();
}

/**
 * Update the performance HUD elements.
 * @param elements - The HUD elements to update
 * @param performanceState - The performance state
 */
export type PerformanceHudElements = {
  fpsValueEl: HTMLElement | null;
  frameTimeEl: HTMLElement | null;
  avgFpsEl: HTMLElement | null;
  memoryEl: HTMLElement | null;
  fpsCanvas: HTMLCanvasElement | null;
};

export function updatePerformanceHud(
  elements: PerformanceHudElements,
  performanceState: PerformanceState
): void {
  const { fpsValueEl, frameTimeEl, avgFpsEl, memoryEl, fpsCanvas } = elements;
  if (fpsValueEl) {
    fpsValueEl.textContent = Math.round(performanceState.fps).toString();
  }
  if (frameTimeEl) {
    frameTimeEl.textContent = `${performanceState.frameTimeMs.toFixed(1)} ms`;
  }
  if (avgFpsEl) {
    avgFpsEl.textContent = Math.round(performanceState.avgFps).toString();
  }
  if (memoryEl) {
    if (performanceState.memoryUsageMb !== null) {
      const usage = performanceState.memoryUsageMb;
      const limit = performanceState.memoryLimitMb;
      const limitText = limit ? ` / ${Math.round(limit)} Mo` : "";
      memoryEl.textContent = `${usage.toFixed(1)} Mo${limitText}`;
    } else {
      memoryEl.textContent = "--";
    }
  }
  if (performanceState.graphVisible) {
    drawFpsGraph(fpsCanvas, performanceState);
  }
}
