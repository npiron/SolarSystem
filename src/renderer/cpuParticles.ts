/**
 * CPUParticles - Simple CPU fallback particle system
 *
 * Used when WebGL2 is not available. Provides the same interface as GPUParticles
 * but simulates particles on the CPU using a simple particle pool.
 */
export class CPUParticles {
  private particles: Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    active: boolean;
  }>;
  private count: number;
  private nextSpawnIndex: number = 0;
  private bounds: { width: number; height: number } = { width: 800, height: 600 };
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  constructor(_gl: WebGL2RenderingContext | null, count: number, canvas?: HTMLCanvasElement) {
    this.count = count;
    this.particles = new Array(count);
    for (let i = 0; i < count; i++) {
      this.particles[i] = { x: 0, y: 0, vx: 0, vy: 0, active: false };
    }

    if (canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
    }

    console.log(`CPUParticles: Initialized with ${count} particles (CPU fallback)`);
  }

  spawn(index: number, x: number, y: number, vx: number, vy: number): void {
    if (index < 0) {
      index = this.nextSpawnIndex;
      this.nextSpawnIndex = (this.nextSpawnIndex + 1) % this.count;
    }
    if (index >= this.count) return;

    const p = this.particles[index];
    p.x = x;
    p.y = y;
    p.vx = vx;
    p.vy = vy;
    p.active = true;
  }

  spawnBatch(particles: number[]): void {
    const numParticles = Math.floor(particles.length / 4);
    for (let i = 0; i < numParticles; i++) {
      const offset = i * 4;
      this.spawn(-1, particles[offset], particles[offset + 1], particles[offset + 2], particles[offset + 3]);
    }
  }

  setBounds(width: number, height: number): void {
    this.bounds.width = width;
    this.bounds.height = height;
  }

  step(dt: number): void {
    const DAMPING = 0.995;
    const GRAVITY = 50.0;

    for (const p of this.particles) {
      if (!p.active) continue;

      // Apply gravity and damping
      p.vy += GRAVITY * dt;
      p.vx *= DAMPING;
      p.vy *= DAMPING;

      // Integrate position
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Bounce off boundaries
      if (p.x < 0) {
        p.x = 0;
        p.vx = -p.vx * 0.7;
      } else if (p.x > this.bounds.width) {
        p.x = this.bounds.width;
        p.vx = -p.vx * 0.7;
      }

      if (p.y < 0) {
        p.y = 0;
        p.vy = -p.vy * 0.6;
      } else if (p.y > this.bounds.height) {
        p.y = this.bounds.height;
        p.vy = -p.vy * 0.6;
      }

      // Kill stationary particles at bottom
      if (Math.abs(p.vx) < 0.5 && Math.abs(p.vy) < 0.5 && p.y > this.bounds.height - 2) {
        p.active = false;
      }
    }
  }

  render(_proj: Float32Array, size: number): void {
    if (!this.ctx) return;

    for (const p of this.particles) {
      if (!p.active) continue;

      // Color based on velocity (matching GPU shader gradient)
      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      const t = Math.min(speed / 300, 1);

      // Gradient: blue (slow) -> cyan -> white -> orange -> red (fast)
      let r: number, g: number, b: number;
      if (t < 0.25) {
        // Blue to cyan
        r = 51;
        g = Math.floor(102 + (179 - 102) * t * 4);
        b = Math.floor(204 + (230 - 204) * t * 4);
      } else if (t < 0.5) {
        // Cyan to white
        r = Math.floor(51 + (230 - 51) * (t - 0.25) * 4);
        g = Math.floor(179 + (230 - 179) * (t - 0.25) * 4);
        b = 230;
      } else if (t < 0.75) {
        // White to orange
        r = Math.floor(230 + (255 - 230) * (t - 0.5) * 4);
        g = Math.floor(230 + (153 - 230) * (t - 0.5) * 4);
        b = Math.floor(230 + (51 - 230) * (t - 0.5) * 4);
      } else {
        // Orange to red
        r = 255;
        g = Math.floor(153 + (51 - 153) * (t - 0.75) * 4);
        b = Math.floor(51 + (26 - 51) * (t - 0.75) * 4);
      }

      this.ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.85)`;
      this.ctx.fillRect(p.x - size / 2, p.y - size / 2, size, size);
    }
  }

  clear(): void {
    for (const p of this.particles) {
      p.active = false;
    }
    this.nextSpawnIndex = 0;
  }

  getCount(): number {
    return this.count;
  }

  dispose(): void {
    // Nothing to clean up for CPU particles
  }
}

/**
 * Creates an orthographic projection matrix
 * @param left Left boundary
 * @param right Right boundary
 * @param bottom Bottom boundary
 * @param top Top boundary
 * @returns Float32Array containing 4x4 projection matrix
 */
export function createOrthoMatrix(left: number, right: number, bottom: number, top: number): Float32Array {
  const out = new Float32Array(16);
  const lr = 1 / (left - right);
  const bt = 1 / (bottom - top);

  out[0] = -2 * lr;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = -2 * bt;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = -1;
  out[11] = 0;
  out[12] = (left + right) * lr;
  out[13] = (top + bottom) * bt;
  out[14] = 0;
  out[15] = 1;

  return out;
}
