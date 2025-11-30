/**
 * Performance monitoring and FPS tracking.
 * Provides FPS recording and graph drawing utilities.
 */

type PerformanceState = {
  fps: number;
  history: number[];
  maxSamples: number;
  graphVisible: boolean;
};

/**
 * Record an FPS sample based on frame timing.
 * @param performanceState - The performance state to update
 * @param frameMs - Frame time in milliseconds
 */
export function recordFpsSample(performanceState: PerformanceState, frameMs: number): void {
  const fps = 1000 / Math.max(1, frameMs);
  performanceState.fps = fps;
  performanceState.history.push(fps);
  if (performanceState.history.length > performanceState.maxSamples) {
    performanceState.history.shift();
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
 * @param fpsValueEl - The element showing the FPS value
 * @param fpsCanvas - The canvas element for the FPS graph
 * @param performanceState - The performance state
 */
export function updatePerformanceHud(
  fpsValueEl: HTMLElement | null,
  fpsCanvas: HTMLCanvasElement | null,
  performanceState: PerformanceState
): void {
  if (fpsValueEl) {
    fpsValueEl.textContent = Math.round(performanceState.fps).toString();
  }
  if (performanceState.graphVisible) {
    drawFpsGraph(fpsCanvas, performanceState);
  }
}
