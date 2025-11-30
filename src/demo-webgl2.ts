/**
 * WebGL2 Renderer Demo
 *
 * Demonstrates the WebGL2 renderer with circles, quads, rings, and lines.
 * Allows switching between WebGL2 and Canvas 2D fallback.
 */

import {
  WebGL2Renderer,
  CanvasFallbackRenderer,
  createRenderer,
  isWebGL2Supported,
} from './renderer/index.ts';

// DOM elements
const canvas = document.getElementById('demo-canvas') as HTMLCanvasElement;
const modeEl = document.getElementById('mode') as HTMLElement;
const fpsEl = document.getElementById('fps') as HTMLElement;
const objectsEl = document.getElementById('objects') as HTMLElement;
const toggleModeBtn = document.getElementById('toggle-mode') as HTMLButtonElement;
const addObjectsBtn = document.getElementById('add-objects') as HTMLButtonElement;
const clearObjectsBtn = document.getElementById('clear-objects') as HTMLButtonElement;

// State
interface Circle {
  x: number;
  y: number;
  radius: number;
  color: number;
  vx: number;
  vy: number;
}

interface Quad {
  x: number;
  y: number;
  width: number;
  height: number;
  color: number;
}

interface Ring {
  x: number;
  y: number;
  radius: number;
  thickness: number;
  color: number;
}

let circles: Circle[] = [];
let quads: Quad[] = [];
let rings: Ring[] = [];
let useWebGL2 = isWebGL2Supported();
let renderer: WebGL2Renderer | CanvasFallbackRenderer;

// Colors palette
const COLORS = [
  0x7dd3fc, // light blue (player color)
  0xff7ac3, // pink (fragment color)
  0xffd166, // yellow
  0xa3e635, // green
  0xf472b6, // magenta
  0x60a5fa, // blue
  0x818cf8, // indigo
  0xc084fc, // purple
];

// Initialize
function init() {
  resizeCanvas();
  createRendererInstance();
  window.addEventListener('resize', resizeCanvas);
  
  // Click to spawn circles
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    spawnBurst(x, y, 10);
  });
  
  // Touch support
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = (touch.clientX - rect.left) * (canvas.width / rect.width);
    const y = (touch.clientY - rect.top) * (canvas.height / rect.height);
    spawnBurst(x, y, 10);
  });
  
  toggleModeBtn.addEventListener('click', toggleMode);
  addObjectsBtn.addEventListener('click', addRandomObjects);
  clearObjectsBtn.addEventListener('click', clearObjects);
  
  // Start animation
  requestAnimationFrame(loop);
}

function resizeCanvas() {
  const rect = canvas.parentElement?.getBoundingClientRect();
  canvas.width = rect?.width || 960;
  canvas.height = rect?.height || 600;
  
  if (renderer) {
    renderer.resize(canvas.width, canvas.height);
  }
}

function createRendererInstance() {
  if (renderer) {
    renderer.dispose();
  }
  
  if (useWebGL2) {
    try {
      renderer = new WebGL2Renderer({ canvas });
      modeEl.textContent = 'WebGL2';
      modeEl.style.color = '#4ade80';
      toggleModeBtn.textContent = 'Switch to Canvas 2D';
    } catch {
      console.warn('Failed to create WebGL2 renderer, using fallback');
      useWebGL2 = false;
      renderer = new CanvasFallbackRenderer(canvas);
      modeEl.textContent = 'Canvas 2D (fallback)';
      modeEl.style.color = '#fbbf24';
      toggleModeBtn.textContent = 'Switch to WebGL2';
      toggleModeBtn.disabled = true;
    }
  } else {
    renderer = new CanvasFallbackRenderer(canvas);
    modeEl.textContent = 'Canvas 2D';
    modeEl.style.color = '#fbbf24';
    toggleModeBtn.textContent = 'Switch to WebGL2';
  }
  
  renderer.resize(canvas.width, canvas.height);
}

function toggleMode() {
  useWebGL2 = !useWebGL2;
  createRendererInstance();
}

function randomColor(): number {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

function spawnBurst(x: number, y: number, count: number) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count;
    const speed = 50 + Math.random() * 100;
    circles.push({
      x,
      y,
      radius: 4 + Math.random() * 8,
      color: randomColor(),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
    });
  }
}

function addRandomObjects() {
  const { width, height } = renderer.getDimensions();
  
  // Add circles
  for (let i = 0; i < 20; i++) {
    circles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: 5 + Math.random() * 15,
      color: randomColor(),
      vx: (Math.random() - 0.5) * 100,
      vy: (Math.random() - 0.5) * 100,
    });
  }
  
  // Add quads
  for (let i = 0; i < 10; i++) {
    const w = 20 + Math.random() * 40;
    const h = 10 + Math.random() * 20;
    quads.push({
      x: Math.random() * (width - w),
      y: Math.random() * (height - h),
      width: w,
      height: h,
      color: randomColor(),
    });
  }
  
  // Add rings
  for (let i = 0; i < 5; i++) {
    rings.push({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: 15 + Math.random() * 25,
      thickness: 2 + Math.random() * 3,
      color: randomColor(),
    });
  }
}

function clearObjects() {
  circles = [];
  quads = [];
  rings = [];
}

// Animation state
let lastTime = 0;
let frameCount = 0;
let fpsTime = 0;

function loop(time: number) {
  // Calculate delta time
  const dt = Math.min(0.05, (time - lastTime) / 1000);
  lastTime = time;
  
  // FPS calculation
  frameCount++;
  if (time - fpsTime > 1000) {
    fpsEl.textContent = `FPS: ${Math.round(frameCount * 1000 / (time - fpsTime))}`;
    frameCount = 0;
    fpsTime = time;
  }
  
  // Update circles (simple physics)
  const { width, height } = renderer.getDimensions();
  const gravity = 100;
  const damping = 0.99;
  
  circles = circles.filter((c) => {
    // Apply gravity
    c.vy += gravity * dt;
    
    // Apply damping
    c.vx *= damping;
    c.vy *= damping;
    
    // Move
    c.x += c.vx * dt;
    c.y += c.vy * dt;
    
    // Bounce off walls
    if (c.x < c.radius) {
      c.x = c.radius;
      c.vx = -c.vx * 0.7;
    } else if (c.x > width - c.radius) {
      c.x = width - c.radius;
      c.vx = -c.vx * 0.7;
    }
    
    if (c.y < c.radius) {
      c.y = c.radius;
      c.vy = -c.vy * 0.7;
    } else if (c.y > height - c.radius) {
      c.y = height - c.radius;
      c.vy = -c.vy * 0.6;
    }
    
    // Remove nearly stationary circles at bottom
    const speed = Math.sqrt(c.vx * c.vx + c.vy * c.vy);
    return speed > 0.5 || c.y < height - c.radius - 2;
  });
  
  // Render
  render();
  
  // Update object count
  objectsEl.textContent = `${circles.length + quads.length + rings.length}`;
  
  requestAnimationFrame(loop);
}

function render() {
  const { width, height } = renderer.getDimensions();
  
  renderer.clear();
  renderer.beginFrame();
  
  // Draw grid
  const gridSpacing = 64;
  for (let x = 0; x < width; x += gridSpacing) {
    renderer.addLine(x, 0, x, height);
  }
  for (let y = 0; y < height; y += gridSpacing) {
    renderer.addLine(0, y, width, y);
  }
  renderer.drawLines(0xffd166, 0.08);
  
  // Draw quads (health bars, etc.)
  for (const quad of quads) {
    renderer.addQuad(quad.x, quad.y, quad.width, quad.height, quad.color, 0.8);
  }
  renderer.drawQuads();
  
  // Draw rings
  for (const ring of rings) {
    renderer.addRing(ring.x, ring.y, ring.radius, ring.thickness, ring.color, 0.6);
  }
  renderer.drawRings();
  
  // Draw circles
  for (const circle of circles) {
    renderer.addCircle(circle.x, circle.y, circle.radius, circle.color, 0.9);
  }
  renderer.drawCircles();
}

// Start
init();
