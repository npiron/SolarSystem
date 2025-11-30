/**
 * GPU Particles Demo
 *
 * Demonstrates the GPUParticles system with:
 * - WebGL2 detection and fallback to CPU particles
 * - Mouse click spawning of particle bursts
 * - Toggle button for CPU fallback mode
 * - Automatic animation loop with resize handling
 *
 * Run with: npm run dev (then open examples/gpu-particles.html)
 * Or build with: npm run build (then serve dist folder)
 */

import { GPUParticles, CPUParticles, createOrthoMatrix } from './gpuParticles.ts';

// Type alias for particle system (either GPU or CPU)
type ParticleSystem = GPUParticles | CPUParticles;

// Configuration
const PARTICLE_COUNT = 16384;       // Total particles in the system
const PARTICLE_SIZE = 4;            // Particle render size in pixels
const BURST_SIZE = 200;             // Particles per click burst
const BURST_SPEED = 250;            // Initial velocity magnitude for bursts
const AUTO_SPAWN_RATE = 50;         // Particles spawned per second automatically
const MAX_FRAME_TIME = 0.05;        // Maximum delta time per frame (seconds) to prevent large jumps

/**
 * Detects WebGL2 availability
 * @param canvas Canvas element to test
 * @returns WebGL2 context or null if not supported
 */
function detectWebGL2(canvas: HTMLCanvasElement): WebGL2RenderingContext | null {
  try {
    const gl = canvas.getContext('webgl2', {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: false,
    });
    
    if (!gl) {
      console.warn('WebGL2 not supported by browser');
      return null;
    }
    
    // Check for required extension
    const ext = gl.getExtension('EXT_color_buffer_float');
    if (!ext) {
      console.warn('EXT_color_buffer_float not supported');
      return null;
    }
    
    return gl;
  } catch (e) {
    console.warn('WebGL2 detection failed:', e);
    return null;
  }
}

/**
 * Main demo entry point
 */
function main(): void {
  // Get DOM elements
  const canvas = document.getElementById('particle-canvas') as HTMLCanvasElement;
  const fallbackToggle = document.getElementById('fallback-toggle') as HTMLButtonElement;
  const statusEl = document.getElementById('status') as HTMLElement;
  const fpsEl = document.getElementById('fps') as HTMLElement;
  const countEl = document.getElementById('count') as HTMLElement;
  const clearBtn = document.getElementById('clear-btn') as HTMLButtonElement;
  
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }
  
  // Detect WebGL2
  const gl = detectWebGL2(canvas);
  const hasWebGL2 = gl !== null;
  
  // Create 2D context for CPU fallback
  let ctx2d: CanvasRenderingContext2D | null = null;
  
  // Current particle system
  let particles: ParticleSystem;
  let usingGPU = hasWebGL2;
  
  // Projection matrix
  let projMatrix: Float32Array = new Float32Array(16);
  
  /**
   * Initializes the particle system (GPU or CPU)
   */
  function initParticleSystem(): void {
    if (usingGPU && gl) {
      particles = new GPUParticles(gl, PARTICLE_COUNT);
      statusEl.textContent = `GPU Mode (WebGL2) - ${particles.getCount()} particles`;
      statusEl.style.color = '#4ade80';
    } else {
      // Get 2D context for CPU rendering
      if (!ctx2d) {
        // Need to recreate canvas context if switching from WebGL
        const parent = canvas.parentElement;
        const oldCanvas = canvas;
        const newCanvas = document.createElement('canvas');
        newCanvas.id = 'particle-canvas';
        newCanvas.width = oldCanvas.width;
        newCanvas.height = oldCanvas.height;
        newCanvas.style.cssText = oldCanvas.style.cssText;
        parent?.replaceChild(newCanvas, oldCanvas);
        ctx2d = newCanvas.getContext('2d');
      }
      particles = new CPUParticles(null, Math.min(PARTICLE_COUNT, 4096), canvas);
      statusEl.textContent = `CPU Mode (Fallback) - ${particles.getCount()} particles`;
      statusEl.style.color = '#fbbf24';
      
      if (!hasWebGL2) {
        statusEl.textContent += ' (WebGL2 unavailable)';
      }
    }
    
    countEl.textContent = `Active: ${particles.getCount()}`;
    updateBounds();
  }
  
  /**
   * Updates canvas size and projection matrix
   */
  function updateBounds(): void {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      
      if (gl && usingGPU) {
        gl.viewport(0, 0, width, height);
      }
    }
    
    particles.setBounds(width, height);
    
    // Create orthographic projection matrix (0,0 at top-left)
    projMatrix = createOrthoMatrix(0, width, height, 0);
  }
  
  /**
   * Spawns a burst of particles at the given position
   */
  function spawnBurst(x: number, y: number, count: number): void {
    const batch: number[] = [];
    
    for (let i = 0; i < count; i++) {
      // Random angle
      const angle = Math.random() * Math.PI * 2;
      // Random speed with some variation
      const speed = BURST_SPEED * (0.5 + Math.random() * 0.5);
      
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed - 100; // Slight upward bias
      
      batch.push(x, y, vx, vy);
    }
    
    particles.spawnBatch(batch);
  }
  
  // Initialize
  initParticleSystem();
  
  // Handle window resize
  window.addEventListener('resize', () => {
    updateBounds();
  });
  
  // Handle mouse clicks for burst spawning
  canvas.addEventListener('click', (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    spawnBurst(x, y, BURST_SIZE);
  });
  
  // Handle touch for mobile
  canvas.addEventListener('touchstart', (e: TouchEvent) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    
    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      spawnBurst(x, y, BURST_SIZE);
    }
  }, { passive: false });
  
  // Handle fallback toggle button
  if (fallbackToggle) {
    fallbackToggle.disabled = !hasWebGL2;
    fallbackToggle.textContent = hasWebGL2 ? 'Switch to CPU' : 'CPU Only (No WebGL2)';
    
    fallbackToggle.addEventListener('click', () => {
      if (!hasWebGL2) return;
      
      usingGPU = !usingGPU;
      particles.dispose();
      
      initParticleSystem();
      fallbackToggle.textContent = usingGPU ? 'Switch to CPU' : 'Switch to GPU';
    });
  }
  
  // Handle clear button
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      particles.clear();
    });
  }
  
  // Animation loop
  let lastTime = performance.now();
  let frameCount = 0;
  let fpsTime = 0;
  let autoSpawnAccum = 0;
  
  function animate(currentTime: number): void {
    const dt = Math.min((currentTime - lastTime) / 1000, MAX_FRAME_TIME);
    lastTime = currentTime;
    
    // FPS counter
    frameCount++;
    fpsTime += dt;
    if (fpsTime >= 1.0) {
      const fps = Math.round(frameCount / fpsTime);
      fpsEl.textContent = `FPS: ${fps}`;
      frameCount = 0;
      fpsTime = 0;
    }
    
    // Auto-spawn particles from top center
    autoSpawnAccum += dt * AUTO_SPAWN_RATE;
    while (autoSpawnAccum >= 1) {
      autoSpawnAccum -= 1;
      const x = canvas.width / 2 + (Math.random() - 0.5) * 100;
      const y = 10;
      const vx = (Math.random() - 0.5) * 100;
      const vy = Math.random() * 50;
      particles.spawn(-1, x, y, vx, vy);
    }
    
    // Update bounds (handles resize)
    updateBounds();
    
    // Simulation step
    particles.step(dt);
    
    // Clear canvas
    if (usingGPU && gl) {
      gl.clearColor(0.06, 0.08, 0.12, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    } else if (ctx2d) {
      ctx2d.fillStyle = '#0f141f';
      ctx2d.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // Render particles
    particles.render(projMatrix, PARTICLE_SIZE);
    
    requestAnimationFrame(animate);
  }
  
  // Start animation
  requestAnimationFrame(animate);
  
  // Initial burst at center
  setTimeout(() => {
    spawnBurst(canvas.width / 2, canvas.height / 2, BURST_SIZE * 2);
  }, 100);
  
  console.log('GPU Particles Demo initialized');
  console.log('Click anywhere to spawn particle bursts!');
}

// Run demo when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
