# GPU Particles Demo

A WebGL2-based particle system demonstrating GPU ping-pong simulation and instanced rendering.

## Running the Demo

### Development Mode (recommended)

The easiest way to run the demo is using Vite's development server:

```bash
# From the project root directory
npm install
npm run dev
```

Then open your browser to:
```
http://localhost:5173/examples/gpu-particles.html
```

### Production Build

To build and serve the production version:

```bash
npm run build
npm run preview
```

Then navigate to the examples page in the preview server.

### Direct File Access

If you want to open the HTML file directly, you'll need to serve it from a local server due to ES module restrictions. You can use any static file server:

```bash
# Using Python
python -m http.server 8000

# Using Node.js npx
npx serve .

# Using PHP
php -S localhost:8000
```

Then open `http://localhost:8000/examples/gpu-particles.html`

## Features

- **GPU-accelerated simulation**: Particle physics computed entirely on the GPU using fragment shaders
- **Ping-pong technique**: State stored in RGBA32F textures, alternating read/write each frame
- **Instanced rendering**: All particles drawn with a single draw call using `drawArraysInstanced`
- **CPU fallback**: Automatic detection of WebGL2 support with graceful fallback to Canvas 2D
- **Interactive**: Click/tap to spawn particle bursts

## Controls

- **Click/Tap** on the canvas to spawn a burst of particles
- **Switch to CPU** button toggles between GPU and CPU rendering modes
- **Clear Particles** button resets all particles

## Browser Support

The GPU version requires a browser with:
- WebGL2 support
- `EXT_color_buffer_float` extension

All modern browsers (Chrome 56+, Firefox 51+, Safari 15+, Edge 79+) should work.
If WebGL2 is not available, the demo automatically falls back to CPU rendering.

## Technical Implementation

See the source files for detailed comments:
- `src/gpuParticles.ts` - Main particle system implementation
- `src/demo-gpu.ts` - Demo application and WebGL2 detection

## Using in Your Own Video Game

This GPU particle system is available under the **Apache 2.0 license**, which means you can freely use, modify, and integrate it into your own video game projects (commercial or personal).

### Quick Integration

1. **Copy the particle system module** to your project:
   ```bash
   cp src/gpuParticles.ts your-game/src/
   ```

2. **Import and initialize** in your game code:
   ```typescript
   import { GPUParticles, CPUParticles, createOrthoMatrix } from './gpuParticles';

   // Initialize with WebGL2 context
   const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
   const gl = canvas.getContext('webgl2');
   
   // Create particle system with fallback for browsers without WebGL2
   let particles: GPUParticles | CPUParticles;
   if (gl) {
     particles = new GPUParticles(gl, 16384);
   } else {
     // Fallback to CPU-based particles (fewer particles for performance)
     particles = new CPUParticles(null, 4096, canvas);
   }
   particles.setBounds(canvas.width, canvas.height);
   ```

3. **Spawn particles** in your game loop:
   ```typescript
   // Spawn a single particle at position (x, y) with velocity (vx, vy)
   // The first parameter (-1) means auto-assign to the next available slot
   // You can also specify a specific index (0 to count-1) to replace a particle
   particles.spawn(-1, x, y, vx, vy);

   // Or spawn a batch for explosions/effects
   const burst = [
     100, 200, 50, -100,  // particle 1: x, y, vx, vy
     110, 200, -30, -120, // particle 2
     // ...more particles
   ];
   particles.spawnBatch(burst);
   ```

4. **Update and render** each frame:
   ```typescript
   function gameLoop(deltaTime: number) {
     // Update particle physics
     particles.step(deltaTime);
     
     // Render particles
     const projMatrix = createOrthoMatrix(0, canvas.width, canvas.height, 0);
     particles.render(projMatrix, 4); // 4 = particle size in pixels
   }
   ```

### Customization

The particle system is designed to be extensible:

- **Modify physics**: Edit the `SIM_FRAG` shader in `gpuParticles.ts` to change gravity, damping, or add forces
- **Change colors**: Edit the `RENDER_FRAG` shader to customize the color gradient based on velocity
- **Adjust particle count**: Pass a different count to the constructor (GPU supports up to 16M particles)
- **CPU fallback**: Use `CPUParticles` for browsers without WebGL2 support

### License

This code is licensed under the [Apache License 2.0](../LICENSE). You are free to:
- ✅ Use in personal and commercial projects
- ✅ Modify and adapt for your needs
- ✅ Distribute in your games
- ✅ Use without attribution (though attribution is appreciated)

See the full license text in the [LICENSE](../LICENSE) file at the repository root.
