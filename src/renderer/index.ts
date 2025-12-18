import { WebGL2Renderer, type ShapeInstance, type TextInstance, type HealthBarInstance } from "./webgl2Renderer.ts";

let renderer: WebGL2Renderer | null = null;

export function init(canvas: HTMLCanvasElement) {
  renderer = WebGL2Renderer.create(canvas);
  return renderer;
}

export const createRenderer = init;

export function getRenderer() {
  return renderer;
}

export function resize(width: number, height: number) {
  renderer?.resize(width, height);
}

export function beginFrame() {
  renderer?.beginFrame();
}

export function render(
  addons?: { glow: boolean; bloom: boolean; grain: boolean },
  time?: number,
  camera?: { x: number; y: number },
  parallaxEnabled?: boolean
) {
  renderer?.render(
    addons ?? { glow: false, bloom: false, grain: false },
    time ?? 0,
    camera ?? { x: 0, y: 0 },
    parallaxEnabled ?? true
  );
}

export function pushCircle(options: ShapeInstance) {
  renderer?.pushCircle(options);
}

export function pushText(options: TextInstance) {
  renderer?.pushText(options);
}

export function pushHealthBar(options: HealthBarInstance) {
  renderer?.pushHealthBar(options);
}
