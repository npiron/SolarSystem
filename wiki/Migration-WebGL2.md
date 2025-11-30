# 🚀 Migration vers WebGL2 (sans PixiJS)

Plan d'action pour porter le rendu de **Neo Survivors Idle** vers un pipeline WebGL2 natif.

---

## 📦 Structure à préparer
```
src/
└── renderer/
    ├── webgl2Context.ts    # Initialisation du contexte WebGL2
    ├── shaders.ts          # Shaders GLSL (vertex/fragment)
    ├── buffers.ts          # Gestion des VBOs et VAOs
    └── renderer.ts         # Boucle de rendu principale
```

## 🔍 Éléments à migrer
- `PIXI.Graphics` → Shaders personnalisés (formes géométriques)
- `PIXI.Text` → Overlay canvas 2D ou bibliothèque texte WebGL
- `PIXI.Container` → Matrices de transformation manuelles
- Filtres (glow, blur) → Fragment shaders dédiés

## 🏗️ Phase 1 : Préparation (1-2 jours)
1. Créer le module de rendu WebGL2 (structure ci-dessus).
2. Lister les dépendances Pixi à remplacer par des équivalents WebGL2.

## ⚙️ Phase 2 : Infrastructure WebGL2 (2-3 jours)
1. Initialiser le contexte WebGL2 (ex.: `initWebGL2(canvas)`) avec vérification d'extensions (`EXT_color_buffer_float`).
2. Implémenter les shaders de base, ex. vertex shader pour cercles instanciés :
```glsl
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

## 🔄 Phase 3 : Migration progressive (3-5 jours)
Migrer couche par couche pour limiter les régressions :

| Ordre | Élément | Complexité | Technique |
|-------|---------|------------|-----------|
| 1 | Grille de fond | Faible | `GL_LINES` |
| 2 | Joueur (cercle) | Faible | Cercles instanciés |
| 3 | Projectiles | Faible | Cercles instanciés (batch) |
| 4 | Ennemis | Moyenne | Cercles instanciés + couleurs |
| 5 | Fragments | Moyenne | Intégration `GPUParticles.ts` |
| 6 | Barres de vie | Moyenne | Quads instancés |
| 7 | Texte flottant | Haute | Overlay canvas 2D |
| 8 | Effets (glow) | Haute | Post-processing FBO |

### Exemple de migration (joueur)
Avant (PixiJS)
```typescript
renderObjects.player.beginFill(colors.player, 1);
renderObjects.player.drawCircle(0, 0, state.player.radius);
renderObjects.player.endFill();
```

Après (WebGL2)
```typescript
class CircleRenderer {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private vao: WebGLVertexArrayObject;

  drawCircle(x: number, y: number, radius: number, color: number[]) {
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
    gl.uniform2f(this.uCenter, x, y);
    gl.uniform1f(this.uRadius, radius);
    gl.uniform4fv(this.uColor, color);
    gl.drawArraysInstanced(gl.TRIANGLE_FAN, 0, 32, 1);
  }
}
```

## 🚀 Phase 4 : Optimisations (2-3 jours)
- Batch rendering pour entités multiples (`bufferData` dynamique sur VBO instancié).
- Profiler les draw calls et limiter les changements d'état (programmes, VAO, textures).

## 🖼️ Phase 5 : Texte et UI (2-3 jours)
- Solution hybride : overlay canvas 2D pour le texte flottant et les labels.
- Considérer une atlas bitmap si le coût CPU devient problématique.

## 🛟 Phase 6 : Tests et fallback (1-2 jours)
- Détection de disponibilité WebGL2 (`initWebGL2`).
- Fallback vers PixiJS existant ou un renderer Canvas minimal.

## ✅ Checklist de migration
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
