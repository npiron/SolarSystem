/**
 * Game Renderer Module
 *
 * Adapts the game state to the WebGL2 renderer for rendering all game entities.
 * This module provides a bridge between the game logic and the WebGL2 renderer.
 */

import { WebGL2Renderer, CanvasFallbackRenderer, createRenderer } from './renderer.ts';
import { GPUParticles, CPUParticles, createOrthoMatrix } from '../gpuParticles.ts';

/** Game state types */
interface Player {
  x: number;
  y: number;
  radius: number;
  collectRadius: number;
}

interface Enemy {
  x: number;
  y: number;
  radius: number;
  hp: number;
  maxHp: number;
  elite?: boolean;
  hitThisFrame?: boolean;
}

interface Bullet {
  x: number;
  y: number;
}

interface Fragment {
  x: number;
  y: number;
}

interface FloatingText {
  x: number;
  y: number;
  text: string | number;
  life: number;
  color?: string;
}

interface GainTicker {
  fragments: number;
  essence: number;
  timer: number;
}

interface RunStats {
  kills: number;
  fragments: number;
  essence: number;
}

interface GameState {
  running: boolean;
  wave: number;
  player: Player;
  enemies: Enemy[];
  bullets: Bullet[];
  fragmentsOrbs: Fragment[];
  floatingText: FloatingText[];
  gainTicker: GainTicker;
  runStats: RunStats;
  visualsLow: boolean;
  addons: {
    glow: boolean;
    bloom: boolean;
    grain: boolean;
    hudPulse: boolean;
  };
}

/** Color palette (as hex numbers) */
const COLORS = {
  player: 0x7dd3fc,
  collect: 0x6ee7b7,
  bulletLow: 0xfff7ed,
  bulletHigh: 0xffd166,
  fragment: 0xff7ac3,
  fragmentRing: 0xff7ac3,
  elite: 0xff9d6c,
  hpBg: 0x0b1226,
  hpFg: 0xa3e635,
  hudBg: 0x0d1530,
  hudBorder: 0xe2e8f0,
  grid: 0xffd166,
  aura: 0x7dd3fc,
};

/** Default enemy palette */
const ENEMY_PALETTE = [
  0xffd166, // yellow
  0xec8385, // coral
  0xff7ac3, // pink
  0xc099e3, // lavender
  0x64d9ff, // cyan
  0xa3e635, // lime
  0xff9d6c, // orange
  0x818cf8, // indigo
];

/**
 * Configuration for the game renderer
 */
export interface GameRendererConfig {
  canvas: HTMLCanvasElement;
  useParticles?: boolean;
  particleCount?: number;
}

/**
 * Game Renderer class
 * 
 * Handles all rendering for the game using WebGL2 with Canvas 2D fallback.
 */
export class GameRenderer {
  private renderer: WebGL2Renderer | CanvasFallbackRenderer;
  private particles: GPUParticles | CPUParticles | null = null;
  private canvas: HTMLCanvasElement;
  private width: number = 0;
  private height: number = 0;
  private textCanvas: HTMLCanvasElement;
  private textCtx: CanvasRenderingContext2D;
  
  constructor(config: GameRendererConfig) {
    this.canvas = config.canvas;
    this.renderer = createRenderer(config.canvas);
    
    // Create text overlay canvas
    this.textCanvas = document.createElement('canvas');
    this.textCanvas.style.position = 'absolute';
    this.textCanvas.style.top = '0';
    this.textCanvas.style.left = '0';
    this.textCanvas.style.pointerEvents = 'none';
    
    const ctx = this.textCanvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to create text canvas context');
    }
    this.textCtx = ctx;
    
    // Insert text canvas after main canvas
    if (config.canvas.parentElement) {
      config.canvas.parentElement.style.position = 'relative';
      config.canvas.parentElement.insertBefore(this.textCanvas, config.canvas.nextSibling);
    }
    
    // Initialize particle system if requested
    if (config.useParticles !== false) {
      const count = config.particleCount || 4096;
      if (this.renderer instanceof WebGL2Renderer) {
        try {
          this.particles = new GPUParticles(this.renderer.getContext(), count);
        } catch {
          console.warn('Failed to create GPU particles, using CPU fallback');
          this.particles = new CPUParticles(null, count, config.canvas);
        }
      } else {
        this.particles = new CPUParticles(null, count, config.canvas);
      }
    }
  }
  
  /**
   * Resize the renderer
   */
  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.renderer.resize(width, height);
    
    // Resize text canvas
    this.textCanvas.width = width;
    this.textCanvas.height = height;
    this.textCanvas.style.width = `${width}px`;
    this.textCanvas.style.height = `${height}px`;
    
    // Update particle bounds
    if (this.particles) {
      this.particles.setBounds(width, height);
    }
  }
  
  /**
   * Get canvas dimensions
   */
  getDimensions(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }
  
  /**
   * Render the game state
   */
  render(state: GameState): void {
    this.renderer.clear();
    this.renderer.beginFrame();
    
    // Clear text canvas
    this.textCtx.clearRect(0, 0, this.width, this.height);
    
    // Draw grid background
    if (!state.visualsLow) {
      this.renderGrid();
    }
    
    // Draw player aura
    this.renderPlayerAura(state.player);
    
    // Draw player
    this.renderPlayer(state.player);
    
    // Draw bullets
    this.renderBullets(state.bullets, state.visualsLow);
    
    // Draw fragments
    this.renderFragments(state.fragmentsOrbs, state.visualsLow);
    
    // Draw enemies
    this.renderEnemies(state.enemies, state.visualsLow);
    
    // Draw enemy health bars
    this.renderEnemyHealthBars(state.enemies, state.visualsLow);
    
    // Draw all accumulated shapes
    this.renderer.drawLines(COLORS.grid, 0.08);
    this.renderer.drawQuads();
    this.renderer.drawRings();
    this.renderer.drawCircles();
    
    // Draw floating text on overlay
    this.renderFloatingText(state.floatingText);
    
    // Draw HUD on overlay
    this.renderHUD(state);
  }
  
  /**
   * Render background grid
   */
  private renderGrid(): void {
    const gridSpacing = 64;
    for (let x = 0; x < this.width; x += gridSpacing) {
      this.renderer.addLine(x, 0, x, this.height);
    }
    for (let y = 0; y < this.height; y += gridSpacing) {
      this.renderer.addLine(0, y, this.width, y);
    }
  }
  
  /**
   * Render player aura
   */
  private renderPlayerAura(player: Player): void {
    // Inner aura
    this.renderer.addCircle(player.x, player.y, player.radius + 16, COLORS.aura, 0.12);
    // Collect radius ring
    this.renderer.addRing(player.x, player.y, player.collectRadius * 0.45, 2, COLORS.collect, 0.2);
  }
  
  /**
   * Render player
   */
  private renderPlayer(player: Player): void {
    this.renderer.addCircle(player.x, player.y, player.radius, COLORS.player, 1);
  }
  
  /**
   * Render bullets
   */
  private renderBullets(bullets: Bullet[], visualsLow: boolean): void {
    const color = visualsLow ? COLORS.bulletLow : COLORS.bulletHigh;
    
    for (const bullet of bullets) {
      this.renderer.addCircle(bullet.x, bullet.y, 4, color, 0.9);
      
      // Glow effect for bullets (larger, more transparent circle)
      if (!visualsLow) {
        this.renderer.addCircle(bullet.x, bullet.y, 8, COLORS.bulletHigh, 0.25);
      }
    }
  }
  
  /**
   * Render fragment orbs
   */
  private renderFragments(fragments: Fragment[], visualsLow: boolean): void {
    for (const fragment of fragments) {
      this.renderer.addCircle(fragment.x, fragment.y, 6, COLORS.fragment, 1);
      
      // Fragment rings
      if (!visualsLow) {
        this.renderer.addRing(fragment.x, fragment.y, 11, 2, COLORS.fragmentRing, 0.5);
      }
    }
  }
  
  /**
   * Render enemies
   */
  private renderEnemies(enemies: Enemy[], _visualsLow: boolean): void {
    enemies.forEach((enemy, idx) => {
      const color = enemy.elite ? COLORS.elite : ENEMY_PALETTE[idx % ENEMY_PALETTE.length];
      this.renderer.addCircle(enemy.x, enemy.y, enemy.radius, color, 1);
    });
  }
  
  /**
   * Render enemy health bars
   */
  private renderEnemyHealthBars(enemies: Enemy[], visualsLow: boolean): void {
    for (const enemy of enemies) {
      // Only draw health bars in high quality mode, or when hit
      if (visualsLow && !enemy.hitThisFrame) continue;
      
      const barWidth = enemy.radius * 2;
      const barHeight = 6;
      const barX = enemy.x - enemy.radius;
      const barY = enemy.y - enemy.radius - 12;
      
      // Background
      this.renderer.addQuad(barX, barY, barWidth, barHeight, COLORS.hpBg, 0.4);
      
      // Health fill
      const healthWidth = (enemy.hp / enemy.maxHp) * barWidth;
      this.renderer.addQuad(barX, barY, healthWidth, barHeight, COLORS.hpFg, 1);
    }
  }
  
  /**
   * Render floating text on the overlay canvas
   */
  private renderFloatingText(floatingTexts: FloatingText[]): void {
    this.textCtx.font = '13px "Fredoka", "Baloo 2", "Nunito", sans-serif';
    this.textCtx.textAlign = 'center';
    this.textCtx.textBaseline = 'bottom';
    
    for (const ft of floatingTexts) {
      const label = String(ft.text);
      const alpha = Math.max(0, ft.life);
      const y = ft.y - (1.5 - ft.life) * 24;
      
      // Shadow
      this.textCtx.shadowColor = '#0b1024';
      this.textCtx.shadowBlur = 4;
      this.textCtx.shadowOffsetX = 0;
      this.textCtx.shadowOffsetY = 0;
      
      // Text color
      this.textCtx.fillStyle = ft.color || '#fff7ed';
      this.textCtx.globalAlpha = alpha;
      
      // Stroke
      this.textCtx.strokeStyle = '#0b1024';
      this.textCtx.lineWidth = 3;
      this.textCtx.strokeText(label, ft.x, y);
      
      // Fill
      this.textCtx.fillText(label, ft.x, y);
    }
    
    // Reset alpha
    this.textCtx.globalAlpha = 1;
    this.textCtx.shadowBlur = 0;
  }
  
  /**
   * Render HUD on the overlay canvas
   */
  private renderHUD(state: GameState): void {
    const icons = {
      wave: '🌊',
      kills: '⚔️',
      fragments: '✦',
      essence: '⚡',
    };
    
    const formatNumber = (n: number): string => {
      if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
      if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
      return Math.floor(n).toString();
    };
    
    // HUD background
    const x = 12;
    const y = 12;
    const w = 190;
    const h = 126;
    const r = 10;
    
    this.textCtx.fillStyle = 'rgba(13, 21, 48, 0.45)';
    this.textCtx.strokeStyle = 'rgba(226, 232, 240, 0.08)';
    this.textCtx.lineWidth = 1;
    
    // Rounded rectangle
    this.textCtx.beginPath();
    this.textCtx.roundRect(x, y, w, h, r);
    this.textCtx.fill();
    this.textCtx.stroke();
    
    // HUD text
    this.textCtx.font = '15px "Baloo 2", "Fredoka", "Nunito", sans-serif';
    this.textCtx.textAlign = 'left';
    this.textCtx.textBaseline = 'top';
    this.textCtx.fillStyle = '#fff7ed';
    this.textCtx.shadowColor = '#0b1024';
    this.textCtx.shadowBlur = 5;
    
    const lines = [
      { text: `${icons.wave} Vague ${state.wave.toFixed(1)}`, y: 28 },
      { text: `${icons.kills} Kills ${state.runStats.kills}`, y: 48 },
      { text: `${icons.fragments} Fragments ${formatNumber(state.runStats.fragments)}`, y: 68 },
      { text: `${icons.essence} Essence ${formatNumber(state.runStats.essence)}`, y: 88 },
    ];
    
    for (const line of lines) {
      this.textCtx.strokeStyle = '#0b1024';
      this.textCtx.lineWidth = 3;
      this.textCtx.strokeText(line.text, 24, line.y);
      this.textCtx.fillText(line.text, 24, line.y);
    }
    
    // Gain ticker (pink accent)
    if (state.gainTicker.fragments > 0) {
      this.textCtx.fillStyle = '#f472b6';
      const gainText = `⇡ +${formatNumber(state.gainTicker.fragments)} ✦`;
      this.textCtx.strokeText(gainText, 24, 108);
      this.textCtx.fillText(gainText, 24, 108);
    }
    
    this.textCtx.shadowBlur = 0;
  }
  
  /**
   * Update particle system
   */
  updateParticles(dt: number): void {
    if (this.particles) {
      this.particles.step(dt);
    }
  }
  
  /**
   * Render particles
   */
  renderParticles(size: number = 4): void {
    if (!this.particles) return;
    
    const projection = createOrthoMatrix(0, this.width, this.height, 0);
    this.particles.render(projection, size);
  }
  
  /**
   * Spawn particles at a position
   */
  spawnParticles(x: number, y: number, count: number, speedMultiplier: number = 1): void {
    if (!this.particles) return;
    
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (50 + Math.random() * 100) * speedMultiplier;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      this.particles.spawn(-1, x, y, vx, vy);
    }
  }
  
  /**
   * Clear all particles
   */
  clearParticles(): void {
    if (this.particles) {
      this.particles.clear();
    }
  }
  
  /**
   * Check if using WebGL2
   */
  isWebGL2(): boolean {
    return this.renderer instanceof WebGL2Renderer;
  }
  
  /**
   * Get the underlying renderer
   */
  getRenderer(): WebGL2Renderer | CanvasFallbackRenderer {
    return this.renderer;
  }
  
  /**
   * Clean up resources
   */
  dispose(): void {
    this.renderer.dispose();
    if (this.particles) {
      this.particles.dispose();
    }
    if (this.textCanvas.parentElement) {
      this.textCanvas.parentElement.removeChild(this.textCanvas);
    }
  }
}

/**
 * Create a game renderer
 */
export function createGameRenderer(config: GameRendererConfig): GameRenderer {
  return new GameRenderer(config);
}
