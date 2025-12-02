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

## Plan d'action : Migration vers WebGL2

Voici un plan étape par étape pour migrer Neo Survivors Idle vers WebGL2 natif (sans PixiJS) :

### Phase 1 : Préparation (1-2 jours)

1. **Créer un nouveau module de rendu WebGL2**
   ```
   src/
   ├── renderer/
   │   ├── webgl2Context.ts    # Initialisation du contexte WebGL2
   │   ├── shaders.ts          # Vertex/Fragment shaders GLSL
   │   ├── buffers.ts          # Gestion des VBOs et VAOs
   │   └── renderer.ts         # Boucle de rendu principale
   ```

2. **Identifier les éléments à migrer**
   - `PIXI.Graphics` → Shaders personnalisés pour formes géométriques
   - `PIXI.Text` → Canvas 2D overlay ou bibliothèque de texte WebGL
   - `PIXI.Container` → Matrices de transformation manuelles
   - Filtres (Glow, Blur) → Fragment shaders personnalisés

### Phase 2 : Infrastructure WebGL2 (2-3 jours)

3. **Initialiser le contexte WebGL2**
   ```typescript
   // src/renderer/webgl2Context.ts
   export function initWebGL2(canvas: HTMLCanvasElement) {
     const gl = canvas.getContext('webgl2', {
       alpha: true,
       antialias: true,
       depth: false,
       stencil: false,
     });
     
     if (!gl) {
       console.error('WebGL2 non supporté');
       return null;
     }
     
     // Vérifier les extensions nécessaires
     const ext = gl.getExtension('EXT_color_buffer_float');
     
     return { gl, extensions: { floatBuffer: ext } };
   }
   ```

4. **Créer les shaders de base**
   ```glsl
   // Vertex shader pour les cercles (joueur, ennemis, projectiles)
   #version 300 es
   precision highp float;
   
   in vec2 a_position;
   in vec2 a_center;
   in float a_radius;
   in vec4 a_color;
   
   uniform mat4 u_projection;
   
   out vec4 v_color;
   out vec2 v_localPos;
   
   void main() {
     vec2 worldPos = a_center + a_position * a_radius;
     gl_Position = u_projection * vec4(worldPos, 0.0, 1.0);
     v_color = a_color;
     v_localPos = a_position;
   }
   ```

### Phase 3 : Migration Progressive (3-5 jours)

5. **Migrer par couche (ordre recommandé)**
   
   | Ordre | Élément | Complexité | Technique |
   |-------|---------|------------|-----------|
   | 1 | Grille de fond | Faible | Line drawing avec GL_LINES |
   | 2 | Joueur (cercle) | Faible | Instanced circles |
   | 3 | Projectiles | Faible | Instanced circles (batch) |
   | 4 | Ennemis | Moyenne | Instanced circles + couleurs |
   | 5 | Fragments | Moyenne | Intégrer GPUParticles.ts |
   | 6 | Barres de vie | Moyenne | Quads instancés |
   | 7 | Texte flottant | Haute | Canvas 2D overlay |
   | 8 | Effets (glow) | Haute | Post-processing FBO |

6. **Exemple de migration du joueur**
   ```typescript
   // Avant (PixiJS)
   renderObjects.player.beginFill(colors.player, 1);
   renderObjects.player.drawCircle(0, 0, state.player.radius);
   renderObjects.player.endFill();
   
   // Après (WebGL2)
   class CircleRenderer {
     private gl: WebGL2RenderingContext;
     private program: WebGLProgram;
     private vao: WebGLVertexArrayObject;
     
     drawCircle(x: number, y: number, radius: number, color: number[]) {
       // Utiliser instanced rendering pour dessiner un cercle
       gl.useProgram(this.program);
       gl.bindVertexArray(this.vao);
       gl.uniform2f(this.uCenter, x, y);
       gl.uniform1f(this.uRadius, radius);
       gl.uniform4fv(this.uColor, color);
       gl.drawArraysInstanced(gl.TRIANGLE_FAN, 0, 32, 1);
     }
   }
   ```

### Phase 4 : Optimisations (2-3 jours)

7. **Batch rendering pour les entités multiples**
   ```typescript
   // Regrouper tous les ennemis en un seul draw call
   updateEnemyBuffer(enemies: Enemy[]) {
     const data = new Float32Array(enemies.length * 6); // x, y, radius, r, g, b
     enemies.forEach((e, i) => {
       const offset = i * 6;
       data[offset] = e.x;
       data[offset + 1] = e.y;
       data[offset + 2] = e.radius;
       // ...couleurs
     });
     gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
   }
   ```

8. **Intégrer le système de particules GPU**
   - Remplacer les fragments visuels par `GPUParticles`
   - Utiliser pour les effets d'explosion et de collecte

### Phase 5 : Texte et UI (2-3 jours)

9. **Solution hybride pour le texte**
   ```typescript
   // Utiliser un canvas 2D superposé pour le texte
   const textCanvas = document.createElement('canvas');
   const textCtx = textCanvas.getContext('2d');
   
   // Dessiner le texte sur le canvas 2D
   function drawFloatingText(text: string, x: number, y: number) {
     textCtx.clearRect(0, 0, textCanvas.width, textCanvas.height);
     textCtx.font = '13px Fredoka';
     textCtx.fillStyle = '#fff7ed';
     textCtx.fillText(text, x, y);
   }
   ```

### Phase 6 : Tests et Fallback (1-2 jours)

10. **Ajouter la détection et le fallback**
    ```typescript
    export function createRenderer(canvas: HTMLCanvasElement) {
      const webgl2 = initWebGL2(canvas);
      
      if (webgl2) {
        return new WebGL2Renderer(webgl2.gl);
      }
      
      // Fallback vers PixiJS ou Canvas 2D
      console.warn('WebGL2 non disponible, utilisation du fallback');
      return new CanvasFallbackRenderer(canvas);
    }
    ```

### Checklist de migration

- [ ] Phase 1 : Structure des fichiers créée
- [ ] Phase 2 : Contexte WebGL2 initialisé
- [ ] Phase 3.1 : Grille de fond migrée
- [ ] Phase 3.2 : Joueur migré
- [ ] Phase 3.3 : Projectiles migrés
- [ ] Phase 3.4 : Ennemis migrés
- [ ] Phase 3.5 : Fragments intégrés avec GPUParticles
- [ ] Phase 3.6 : Barres de vie migrées
- [ ] Phase 3.7 : Texte flottant (overlay Canvas 2D)
- [ ] Phase 3.8 : Effets post-processing
- [ ] Phase 4 : Optimisations batch rendering
- [ ] Phase 5 : UI hybride fonctionnelle
- [ ] Phase 6 : Fallback testé

### Estimation totale : 10-15 jours

**Note** : PixiJS 7.x utilise déjà WebGL2 par défaut. Cette migration est utile si vous voulez :
- Plus de contrôle sur le rendu
- Réduire la taille du bundle (PixiJS ≈ 500KB)
- Apprendre WebGL2 en profondeur
- Optimisations spécifiques impossibles avec PixiJS
