/**
 * Game rendering logic
 * 
 * This module handles all visual rendering of the game state,
 * including player, enemies, bullets, fragments, and HUD elements.
 */
import type { GameState, EnemyType } from "../types/index.ts";
import type { WebGL2Renderer } from "./webgl2Renderer.ts";
import * as renderer from "./index.ts";
import { webglColors, hexStringToVec4 } from "./colors.ts";
import { getEnemyColorWebGL, getFragmentVisuals } from "./entityColors.ts";
import { icons } from "../config/constants.ts";
import { formatNumber } from "../systems/hud.ts";

// Shape definitions for different entity types
const PLAYER_SHAPE = { sides: 6, rotation: Math.PI / 6 };
const FRAGMENT_SHAPE = { sides: 4, rotation: Math.PI / 4 };
const BULLET_SHAPE = { sides: 5, rotation: -Math.PI / 2 };

/**
 * Get the shape definition for an enemy type
 */
function getEnemyShape(type: EnemyType): { sides: number; rotation: number } {
  switch (type) {
    case "weak":
      return { sides: 3, rotation: -Math.PI / 2 };
    case "strong":
      return { sides: 5, rotation: Math.PI / 2.5 };
    case "elite":
      return { sides: 6, rotation: Math.PI / 6 };
    default:
      return { sides: 4, rotation: Math.PI / 4 };
  }
}

interface RenderContext {
  canvasWidth: number;
  canvasHeight: number;
  webgl2Renderer: WebGL2Renderer | null;
}

/**
 * Main render function - draws all game entities to the canvas
 * @param state The current game state
 * @param context Rendering context with canvas and renderer info
 */
export function render(state: GameState, context: RenderContext): void {
  const { canvasWidth, canvasHeight, webgl2Renderer } = context;
  const allowFx = !state.visualsLow;

  if (webgl2Renderer) {
    renderer.resize(canvasWidth, canvasHeight);
  }

  if (webgl2Renderer) {
    // HUD background
    renderer.pushCircle({
      x: 12 + 190 / 2,
      y: 12 + 126 / 2,
      radius: 100,
      color: [0.1, 0.1, 0.1, 0.45],
      sides: 6
    });

    const auraHalo = allowFx ? { color: webglColors.playerHalo, scale: 1.24 } : undefined;
    const collectRing = { color: webglColors.collectRing, scale: 1.04 };
    const playerHalo = allowFx ? { color: webglColors.playerHalo, scale: 1.35 } : undefined;
    const bulletColor = state.visualsLow ? webglColors.bulletLow : webglColors.bullet;
    const bulletHalo = allowFx ? { color: webglColors.bulletGlow, scale: 1.8 } : undefined;

    renderer.beginFrame();

    // Render player aura
    renderer.pushCircle({
      x: state.player.x,
      y: state.player.y,
      radius: state.player.radius + 16,
      color: webglColors.playerAura,
      sides: PLAYER_SHAPE.sides,
      rotation: PLAYER_SHAPE.rotation,
      halo: auraHalo
    });

    // Render collect radius indicator
    renderer.pushCircle({
      x: state.player.x,
      y: state.player.y,
      radius: state.player.collectRadius * 0.45,
      color: webglColors.transparent,
      sides: PLAYER_SHAPE.sides,
      rotation: PLAYER_SHAPE.rotation,
      halo: collectRing
    });

    // Render player
    renderer.pushCircle({
      x: state.player.x,
      y: state.player.y,
      radius: state.player.radius,
      color: webglColors.player,
      sides: PLAYER_SHAPE.sides,
      rotation: PLAYER_SHAPE.rotation,
      halo: playerHalo
    });

    // Render bullets
    state.bullets.forEach((b) =>
      renderer.pushCircle({
        x: b.x,
        y: b.y,
        radius: 4,
        color: bulletColor,
        sides: BULLET_SHAPE.sides,
        rotation: BULLET_SHAPE.rotation,
        halo: bulletHalo
      })
    );

    // Render fragments with value-based colors and sizes
    state.fragmentsOrbs.forEach((f) => {
      const { color, ringColor, radius } = getFragmentVisuals(f.value);
      const fragmentHalo = allowFx ? { color: ringColor, scale: 1.65 } : undefined;
      renderer.pushCircle({
        x: f.x,
        y: f.y,
        radius,
        color,
        sides: FRAGMENT_SHAPE.sides,
        rotation: FRAGMENT_SHAPE.rotation,
        halo: fragmentHalo
      });
    });

    // Render enemies with type-based colors
    state.enemies.forEach((e) => {
      const enemyColor = getEnemyColorWebGL(e.type);
      const enemyShape = getEnemyShape(e.type);
      renderer.pushCircle({
        x: e.x,
        y: e.y,
        radius: e.radius,
        color: enemyColor,
        sides: enemyShape.sides,
        rotation: enemyShape.rotation
      });

      // Render health bars
      if (!state.visualsLow || e.hitThisFrame) {
        renderer.pushHealthBar({
          x: e.x,
          y: e.y - e.radius,
          width: e.radius * 2,
          ratio: e.hp / e.maxHp
        });
      }
    });

    // Render floating text using native WebGL2 text renderer
    state.floatingText.forEach((f) => {
      const label = typeof f.text === "string" || typeof f.text === "number" ? String(f.text) : "";
      if (!label) return;
      const textColor = hexStringToVec4(f.color || "#fef08a", Math.max(0, f.life));
      renderer.pushText({
        text: label,
        x: f.x,
        y: f.y - (1.5 - f.life) * 24,
        color: textColor,
        alpha: Math.max(0, f.life),
        scale: f.scale ?? 1.8
      });
    });

    renderer.render(state.addons, state.time);
  }

  // Render HUD text overlay
  renderHudText(state);
}

/**
 * Render HUD text elements
 */
function renderHudText(state: GameState): void {
  const hudTexts = [
    { text: `${icons.wave} Vague ${state.wave.toFixed(1)}`, x: 24, y: 28 },
    { text: `⚔️ Kills ${state.runStats.kills}`, x: 24, y: 48 },
    { text: `${icons.fragments} Fragments ${formatNumber(state.runStats.fragments)}`, x: 24, y: 68 },
    { text: `${icons.essence} Essence ${formatNumber(state.runStats.essence)}`, x: 24, y: 88 },
  ];

  if (state.gainTicker.fragments > 0) {
    hudTexts.push({ text: `⇡ +${formatNumber(state.gainTicker.fragments)} ✦`, x: 24, y: 108 });
  }

  hudTexts.forEach(({ text, x, y }) => {
    renderer.pushText({
      text,
      x,
      y,
      color: [1, 1, 1, 1],
      alpha: 1,
    });
  });
}
