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
import { formatNumber } from "../systems/hud.ts";
import { getTuning } from "../config/tuning.ts";

// Shape definitions for different entity types
const PLAYER_SHAPE = { sides: 24, rotation: 0 };
const FRAGMENT_SHAPE = { sides: 6, rotation: 0 }; // Hexagonal coin/token shape
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
    const playerScale = 1 + oscillate(time, 2.4, 0.08) + playerMotion * 0.06;
    const playerRotation = PLAYER_SHAPE.rotation + oscillate(time, 1.8, 0.3 * (0.4 + playerMotion * 0.6));

    // Enhanced halo colors with stronger glow
    const auraHalo = allowFx ? { color: webglColors.eventHorizon, scale: 1.45 + oscillate(time, 1.1, 0.1) } : undefined;
    const collectRing = { color: webglColors.collectRing, scale: 1.15 };
    const playerHalo = allowFx ? { color: webglColors.playerHalo, scale: 1.55 + oscillate(time, 2.2, 0.15) } : undefined;
    const bulletColor = state.visualsLow ? webglColors.bulletLow : webglColors.bullet;
    const bulletHalo = allowFx ? { color: webglColors.bulletGlow, scale: 2.2 } : undefined;

    renderer.beginFrame();

    // Render player aura
    renderer.pushCircle({
      x: state.player.x,
      y: state.player.y,
      radius: (state.player.radius + 18) * (1 + oscillate(time, 1.1, 0.05)),
      color: webglColors.playerAura,
      sides: PLAYER_SHAPE.sides,
      rotation: playerRotation,
      halo: auraHalo
    });

    // Render collect radius indicator (match actual collection distance)
    const { collectDistanceMultiplier } = getTuning().fragments;
    const actualCollectRadius = state.player.radius + 6 + state.player.collectRadius * collectDistanceMultiplier;
    renderer.pushCircle({
      x: state.player.x,
      y: state.player.y,
      radius: actualCollectRadius,
      color: webglColors.transparent,
      sides: PLAYER_SHAPE.sides,
      rotation: playerRotation,
      halo: collectRing
    });

    // Render orbital orbs with enhanced glow
    const orbitalOrbColor = state.visualsLow ? webglColors.bulletLow : webglColors.orbitBullet;
    const orbitalHalo = allowFx ? { color: webglColors.orbitGlow, scale: 2.0 + oscillate(time, 3, 0.15) } : undefined;
    state.orbitalOrbs.forEach((orb) => {
      const orbX = state.player.x + Math.cos(orb.angle) * orb.distance;
      const orbY = state.player.y + Math.sin(orb.angle) * orb.distance;
      const orbPulse = 1 + oscillate(time + orb.angle, 4, 0.1);

      // Trail effect for orbital orbs
      if (allowFx) {
        const trailAngle = orb.angle - 0.3;
        const trailX = state.player.x + Math.cos(trailAngle) * orb.distance;
        const trailY = state.player.y + Math.sin(trailAngle) * orb.distance;
        renderer.pushCircle({
          x: trailX,
          y: trailY,
          radius: 4,
          color: [orbitalOrbColor[0], orbitalOrbColor[1], orbitalOrbColor[2], 0.3] as const,
          sides: ORBIT_SHAPE.sides,
          rotation: trailAngle + ORBIT_SHAPE.rotation,
          halo: { color: webglColors.orbitGlow, scale: 1.3 }
        });
      }

      renderer.pushCircle({
        x: orbX,
        y: orbY,
        radius: 7 * orbPulse,
        color: orbitalOrbColor,
        sides: ORBIT_SHAPE.sides,
        rotation: orb.angle + ORBIT_SHAPE.rotation + oscillate(time + orb.angle, 2.5, 0.25),
        halo: orbitalHalo
      });
    });

    // Motion trail effect - multiple trailing afterimages
    if (allowFx && playerMotion > 0.1) {
      const trailColors = [
        [webglColors.playerAura[0], webglColors.playerAura[1], webglColors.playerAura[2], 0.4] as const,
        [webglColors.playerAura[0], webglColors.playerAura[1], webglColors.playerAura[2], 0.25] as const,
        [webglColors.playerAura[0], webglColors.playerAura[1], webglColors.playerAura[2], 0.12] as const,
      ];
      const trailOffsets = [0.06, 0.12, 0.2];

      for (let i = 0; i < 3; i++) {
        renderer.pushCircle({
          x: state.player.x - state.player.vx * trailOffsets[i],
          y: state.player.y - state.player.vy * trailOffsets[i],
          radius: state.player.radius * (0.9 - i * 0.15 + playerMotion * 0.3),
          color: trailColors[i],
          sides: PLAYER_SHAPE.sides,
          rotation: playerRotation - i * 0.1,
          halo: i === 0 ? { color: webglColors.playerHalo, scale: 1.3 } : undefined
        });
      }
    }

    // Accretion disk layers
    const diskPulse = 1 + oscillate(time, 2.6, 0.1 + playerMotion * 0.05);
    renderer.pushCircle({
      x: state.player.x,
      y: state.player.y,
      radius: state.player.radius * (1.35 * playerScale * diskPulse),
      color: webglColors.accretionOuter,
      sides: PLAYER_SHAPE.sides,
      rotation: -playerRotation * 0.6,
      halo: allowFx ? { color: webglColors.accretionOuter, scale: 1.8 + playerMotion * 0.4 } : undefined
    });

    renderer.pushCircle({
      x: state.player.x,
      y: state.player.y,
      radius: state.player.radius * (1.05 * playerScale * diskPulse),
      color: webglColors.accretionInner,
      sides: PLAYER_SHAPE.sides,
      rotation: playerRotation * 0.8,
      halo: playerHalo
    });

    // Event horizon and singularity core
    const horizonPulse = 1 + oscillate(time, 1.4, 0.06);
    renderer.pushCircle({
      x: state.player.x,
      y: state.player.y,
      radius: state.player.radius * playerScale * horizonPulse,
      color: webglColors.eventHorizon,
      sides: PLAYER_SHAPE.sides,
      rotation: -playerRotation * 0.5,
      halo: allowFx ? { color: webglColors.playerHalo, scale: 1.2 + oscillate(time, 1.7, 0.1) } : undefined
    });

    renderer.pushCircle({
      x: state.player.x,
      y: state.player.y,
      radius: state.player.radius * 0.6 * playerScale,
      color: webglColors.playerCore,
      sides: PLAYER_SHAPE.sides,
      rotation: playerRotation
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

    // Render fragments as mini black holes with accretion disks
    state.fragmentsOrbs.forEach((f, index) => {
      const { color, ringColor, radius } = getFragmentVisuals(f.value);
      const fragmentPhase = time + index * 0.3;
      const fragmentPulse = 1 + oscillate(fragmentPhase, 3, 0.08);
      const fragmentRotation = time * 3 + index * 0.8;
      const floatY = oscillate(fragmentPhase, 2, 2);

      // Layer 1: Accretion disk (compact halo)
      const haloScale = f.value >= 10 ? 2.2 : f.value >= 3 ? 1.8 : 1.5;
      renderer.pushCircle({
        x: f.x,
        y: f.y + floatY,
        radius: radius * fragmentPulse * 0.9,
        color: [ringColor[0] * 0.4, ringColor[1] * 0.4, ringColor[2] * 0.4, 0.5] as const,
        sides: FRAGMENT_SHAPE.sides,
        rotation: fragmentRotation,
        halo: allowFx ? { color: ringColor, scale: haloScale + oscillate(fragmentPhase, 2, 0.3) } : undefined
      });

      // Layer 2: Event horizon (dark core)
      renderer.pushCircle({
        x: f.x,
        y: f.y + floatY,
        radius: radius * fragmentPulse * 0.5,
        color: color,
        sides: FRAGMENT_SHAPE.sides * 2,
        rotation: -fragmentRotation * 0.5
      });

      // Layer 3: Singularity (pure black center)
      renderer.pushCircle({
        x: f.x,
        y: f.y + floatY,
        radius: radius * fragmentPulse * 0.25,
        color: [0, 0, 0, 1] as const, // Pure black
        sides: 24,
        rotation: 0
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

      // Enhanced halo for variants - larger and more visible
      const haloScale = variantHaloColor ? 1.6 + enemyPulse * 0.4 : 1.15 + enemyPulse * 0.3;
      const enemyHalo = allowFx
        ? { color: variantHaloColor ?? enemyColor, scale: haloScale }
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

    // Render enemy projectiles with enhanced visibility
    state.enemyProjectiles.forEach((p) => {
      const projHalo = allowFx ? { color: webglColors.enemyProjectileGlow, scale: 2.2 } : undefined;
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

    // Render Lightning bolts
    state.lightningBolts.forEach((bolt) => {
      if (bolt.segments.length < 2) return;
      const alpha = Math.min(1, bolt.life * 5);
      const lightningColor: readonly [number, number, number, number] = [0.4, 0.9, 1, alpha];
      const lightningGlow: readonly [number, number, number, number] = [0.2, 0.6, 1, alpha * 0.5];

      for (let i = 0; i < bolt.segments.length - 1; i++) {
        const seg = bolt.segments[i];
        const next = bolt.segments[i + 1];
        // Draw lightning segment as small circles along the path
        const steps = 3;
        for (let j = 0; j <= steps; j++) {
          const t = j / steps;
          const x = seg.x + (next.x - seg.x) * t;
          const y = seg.y + (next.y - seg.y) * t;
          renderer.pushCircle({
            x,
            y,
            radius: 3 + Math.random() * 2,
            color: lightningColor,
            sides: 6,
            rotation: Math.random() * Math.PI,
            halo: allowFx ? { color: lightningGlow, scale: 2.5 } : undefined
          });
        }
      }
    });

    // Render Laser beams
    state.laserBeams.forEach((beam) => {
      const alpha = Math.min(1, beam.life * 10);
      const laserColor: readonly [number, number, number, number] = [1, 0.2, 0.2, alpha];
      const laserGlow: readonly [number, number, number, number] = [1, 0.1, 0.1, alpha * 0.4];

      // Draw laser beam as series of circles along the path
      const dx = beam.endX - beam.startX;
      const dy = beam.endY - beam.startY;
      const dist = Math.hypot(dx, dy);
      const steps = Math.ceil(dist / 10);

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = beam.startX + dx * t;
        const y = beam.startY + dy * t;
        // Core beam
        renderer.pushCircle({
          x,
          y,
          radius: 4,
          color: laserColor,
          sides: 8,
          rotation: 0,
          halo: allowFx ? { color: laserGlow, scale: 3 } : undefined
        });
      }
    });

    // Render Homing missiles
    const missileColor: readonly [number, number, number, number] = [1, 0.5, 0.1, 1];
    const missileTrailColor: readonly [number, number, number, number] = [1, 0.3, 0, 0.6];
    const missileGlow = allowFx ? { color: [1, 0.4, 0, 0.5] as const, scale: 2.5 } : undefined;

    state.missiles.forEach((m) => {
      const angle = Math.atan2(m.dy, m.dx);

      // Trail effect
      if (allowFx) {
        for (let i = 1; i <= 3; i++) {
          const trailX = m.x - m.dx * 0.02 * i;
          const trailY = m.y - m.dy * 0.02 * i;
          renderer.pushCircle({
            x: trailX,
            y: trailY,
            radius: 3 - i * 0.5,
            color: [missileTrailColor[0], missileTrailColor[1], missileTrailColor[2], missileTrailColor[3] / i] as const,
            sides: 3,
            rotation: angle + Math.PI
          });
        }
      }

      // Missile body (triangle pointing in direction of travel)
      renderer.pushCircle({
        x: m.x,
        y: m.y,
        radius: 6,
        color: missileColor,
        sides: 3,
        rotation: angle - Math.PI / 2,
        halo: missileGlow
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

    // Pass player position to renderer for grid centering
    renderer.render(state.addons, state.time, { x: state.player.x, y: state.player.y });
  }

  // Render HUD text overlay
  renderHudText(state);
}

/**
 * Render HUD text elements
 */
function renderHudText(state: GameState): void {
  const hudTexts = [
    { text: `〰️ Vague ${state.wave.toFixed(1)}`, x: 24, y: 28 },
    { text: `⚔️ Kills ${state.runStats.kills}`, x: 24, y: 48 },
    { text: `💎 Fragments ${formatNumber(state.runStats.fragments)}`, x: 24, y: 68 },
    { text: `💧 Essence ${formatNumber(state.runStats.essence)}`, x: 24, y: 88 },
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
