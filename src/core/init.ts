/**
 * Core Initialization
 * Canvas setup, renderer initialization, and state creation
 */

import * as renderer from "../renderer/index.ts";
import { createInitialState } from "../systems/gameState.ts";
import type { GameState } from "../types/index.ts";

export interface InitResult {
    webgl2Canvas: HTMLCanvasElement | null;
    webgl2Renderer: ReturnType<typeof renderer.init> | null;
    state: GameState;
}

/**
 * Initialize canvas and create game state
 */
export function initializeGame(): InitResult {
    // Canvas and renderer setup
    const webgl2Canvas = document.getElementById("webgl2") as HTMLCanvasElement;
    const webgl2Renderer = webgl2Canvas ? renderer.init(webgl2Canvas) : null;

    // Create initial game state
    const state: GameState = createInitialState(
        webgl2Canvas?.width || 1920,
        webgl2Canvas?.height || 1080
    );

    return {
        webgl2Canvas,
        webgl2Renderer,
        state
    };
}

/**
 * Build/rebuild background based on visuals settings
 */
export function buildBackground(
    webgl2Renderer: ReturnType<typeof renderer.init> | null,
    state: GameState,
    width: number,
    height: number
): void {
    if (webgl2Renderer) {
        webgl2Renderer.setGridEnabled(!state.visualsLow);
        if (!state.visualsLow) {
            webgl2Renderer.resize(width, height);
        } else {
            webgl2Renderer.clear();
        }
    }
}

/**
 * Resize canvas maintaining aspect ratio
 */
export function resizeCanvas(
    webgl2Canvas: HTMLCanvasElement | null,
    webgl2Renderer: ReturnType<typeof renderer.init> | null,
    state: GameState,
    center = false
): void {
    if (!webgl2Canvas || !webgl2Renderer) return;

    const w = window.innerWidth;
    const h = window.innerHeight;

    if (center) {
        state.player.x = w / 2;
        state.player.y = h / 2;
    }

    buildBackground(webgl2Renderer, state, w, h);
}
