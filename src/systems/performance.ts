/**
 * Performance monitoring module
 * Handles FPS tracking and visualization
 */

import type { PerformanceState } from "../types/index.ts";

/**
 * Records a new FPS sample from frame delta time
 */
export function recordFpsSample(
  state: PerformanceState,
  deltaMS: number
): void {
  const frameMs = Math.max(1, deltaMS || 0);
  const fps = 1000 / frameMs;
  state.fps = fps;
  state.history.push(fps);
  if (state.history.length > state.maxSamples) {
    state.history.shift();
  }
}

/**
 * Draws the FPS graph on a canvas
 */
export function drawFpsGraph(
  canvas: HTMLCanvasElement | null,
  state: PerformanceState
): void {
  if (!canvas || !state.graphVisible) return;

  // Sync canvas size with CSS size
  if (canvas.width !== canvas.clientWidth) canvas.width = canvas.clientWidth;
  if (canvas.height !== canvas.clientHeight) canvas.height = canvas.clientHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const history = state.history;
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);
  if (!history.length) return;

  const maxFps = Math.max(30, ...history);
  const minFps = Math.min(0, ...history);
  const range = Math.max(1, maxFps - minFps);
  const stepX = history.length > 1 ? width / (history.length - 1) : width;

  // Draw 60 FPS target line
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

  // Draw FPS line
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

  // Fill area under the line
  ctx.fillStyle = "rgba(214, 185, 108, 0.12)";
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();
}

/**
 * Updates the FPS display elements
 */
export function updatePerformanceHud(
  state: PerformanceState,
  fpsValueEl: HTMLElement | null,
  fpsCanvas: HTMLCanvasElement | null
): void {
  if (fpsValueEl) {
    fpsValueEl.textContent = Math.round(state.fps).toString();
  }
  if (state.graphVisible) {
    drawFpsGraph(fpsCanvas, state);
  }
}
