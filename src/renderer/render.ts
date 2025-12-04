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
import { getEnemyColorWebGL, getFragmentVisuals, getVariantHaloColor } from "./entityColors.ts";
import { icons } from "../config/constants.ts";
import { formatNumber } from "../systems/hud.ts";

// Shape definitions for different entity types
const PLAYER_SHAPE = { sides: 6, rotation: Math.PI / 6 };
const FRAGMENT_SHAPE = { sides: 4, rotation: Math.PI / 4 };
const BULLET_SHAPE = { sides: 5, rotation: -Math.PI / 2 };
const ORBIT_SHAPE = { sides: 7, rotation: Math.PI / 7 };
const BOSS_SHAPE = { sides: 8, rotation: 0 };
const ENEMY_PROJECTILE_SHAPE = { sides: 3, rotation: Math.PI / 2 };

function oscillate(time: number, speed: number, amplitude: number): number {
  return Math.sin(time * speed) * amplitude;
}

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
  const time = state.time;

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

    const playerMotion = Math.min(1, Math.hypot(state.player.vx, state.player.vy) / Math.max(1, state.player.speed));
    const playerScale = 1 + oscillate(time, 2.4, 0.06) + playerMotion * 0.04;
    const playerRotation = PLAYER_SHAPE.rotation + oscillate(time, 1.8, 0.25 * (0.4 + playerMotion * 0.6));

    const auraHalo = allowFx ? { color: webglColors.playerHalo, scale: 1.24 + oscillate(time, 1.2, 0.08) } : undefined;
    const collectRing = { color: webglColors.collectRing, scale: 1.04 };
    const playerHalo = allowFx ? { color: webglColors.playerHalo, scale: 1.35 + oscillate(time, 2.2, 0.1) } : undefined;
    const bulletColor = state.visualsLow ? webglColors.bulletLow : webglColors.bullet;
    const bulletHalo = allowFx ? { color: webglColors.bulletGlow, scale: 1.8 } : undefined;

    renderer.beginFrame();

    // Render player aura
    renderer.pushCircle({
      x: state.player.x,
      y: state.player.y,
      radius: (state.player.radius + 16) * (1 + oscillate(time, 1.1, 0.04)),
      color: webglColors.playerAura,
      sides: PLAYER_SHAPE.sides,
      rotation: playerRotation,
      halo: auraHalo
    });

    // Render collect radius indicator
    renderer.pushCircle({
      x: state.player.x,
      y: state.player.y,
      radius: state.player.collectRadius * 0.45,
      color: webglColors.transparent,
      sides: PLAYER_SHAPE.sides,
      rotation: playerRotation,
      halo: collectRing
    });

    // Render orbital orbs
    const orbitalOrbColor = state.visualsLow ? webglColors.bulletLow : webglColors.orbitBullet;
    const orbitalHalo = allowFx ? { color: webglColors.orbitGlow, scale: 1.6 } : undefined;
    state.orbitalOrbs.forEach((orb) => {
      const orbX = state.player.x + Math.cos(orb.angle) * orb.distance;
      const orbY = state.player.y + Math.sin(orb.angle) * orb.distance;
      renderer.pushCircle({
        x: orbX,
        y: orbY,
        radius: 6,
        color: orbitalOrbColor,
        sides: ORBIT_SHAPE.sides,
        rotation: orb.angle + ORBIT_SHAPE.rotation + oscillate(time + orb.angle, 2.5, 0.2),
        halo: orbitalHalo
      });
    });

    if (allowFx && playerMotion > 0.15) {
      renderer.pushCircle({
        x: state.player.x - state.player.vx * 0.08,
        y: state.player.y - state.player.vy * 0.08,
        radius: state.player.radius * (0.9 + playerMotion * 0.4),
        color: webglColors.playerAura,
        sides: PLAYER_SHAPE.sides,
        rotation: playerRotation,
        halo: playerHalo
      });
    }

    // Render player
    renderer.pushCircle({
      x: state.player.x,
      y: state.player.y,
      radius: state.player.radius * playerScale,
      color: webglColors.player,
      sides: PLAYER_SHAPE.sides,
      rotation: playerRotation,
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
      const variantHaloColor = getVariantHaloColor(e.variant);
      const enemyShape = getEnemyShape(e.type);
      const wobblePhase = time + (e.x + e.y) * 0.01;
      const enemyPulse = 1 + oscillate(wobblePhase, 1.6, 0.08);
      const enemyRotation = enemyShape.rotation + oscillate(wobblePhase, 1.1, 0.3);
      const enemyHalo = allowFx
        ? { color: variantHaloColor ?? enemyColor, scale: 1.15 + enemyPulse * 0.3 }
        : undefined;
      const flash = e.hitThisFrame ? 0.3 : 0;
      const tintedEnemyColor = [
        Math.min(1, enemyColor[0] + flash),
        Math.min(1, enemyColor[1] + flash * 0.6),
        Math.min(1, enemyColor[2] + flash * 0.4),
        enemyColor[3]
      ] as const;
      renderer.pushCircle({
        x: e.x,
        y: e.y,
        radius: e.radius * enemyPulse,
        color: tintedEnemyColor,
        sides: enemyShape.sides,
        rotation: enemyRotation,
        halo: enemyHalo
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

    // Render boss if active
    if (state.bossActive && state.currentBoss) {
      const boss = state.currentBoss;
      const bossHalo = allowFx ? { color: webglColors.bossHalo, scale: 1.5 } : undefined;
      renderer.pushCircle({
        x: boss.x,
        y: boss.y,
        radius: boss.radius,
        color: webglColors.boss,
        sides: BOSS_SHAPE.sides,
        rotation: BOSS_SHAPE.rotation,
        halo: bossHalo
      });

      // Render boss health bar
      renderer.pushHealthBar({
        x: boss.x,
        y: boss.y - boss.radius,
        width: boss.radius * 2,
        ratio: boss.hp / boss.maxHp
      });
    }

    // Render enemy projectiles
    state.enemyProjectiles.forEach((p) => {
      const projHalo = allowFx ? { color: webglColors.enemyProjectileGlow, scale: 1.6 } : undefined;
      renderer.pushCircle({
        x: p.x,
        y: p.y,
        radius: 6,
        color: webglColors.enemyProjectile,
        sides: ENEMY_PROJECTILE_SHAPE.sides,
        rotation: ENEMY_PROJECTILE_SHAPE.rotation,
        halo: projHalo
      });
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
