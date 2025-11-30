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
