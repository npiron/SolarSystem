# Game Improvement Plan — NES Authenticity & Visual Polish

## Expert Analysis

After thorough code review, here are the key issues and their root causes:

### 🔴 Priority 1: CRT Effect Too Dark (HIGH VISIBILITY)
**Root cause:** Multiple darkening effects stack on top of each other:
- Grain shader applies vignette (`1.0 - dot(center, center) * 0.8`)
- CRT shader applies ANOTHER vignette (`1.0 - edgeDist² * 1.8`)
- CRT reapplies outer vignette (`0.7 + 0.3 * outerVignette`)
- Scanlines reduce brightness by ~25%
- Color quantization to 4-bit (16 levels) — NES was 6-bit (64 levels)
- Barrel distortion at 0.12 is aggressive
- **Result: ~40-50% brightness loss at edges, ~15-20% at center**

**Fix:** Lighten CRT effect, increase color depth, reduce vignette stacking

### 🔴 Priority 2: HUD Not NES-Authentic (HIGH VISIBILITY)
**Root cause:** CSS uses modern glass-morphism (backdrop-blur, oklch gradients, rounded corners, Balatro-style). NES UIs were:
- Sharp-edged rectangles with 2px pixel borders
- Limited color palette (no gradients)
- Blocky pixel fonts (Press Start 2P is available but underused)
- No blur/transparency effects

**Fix:** Redesign HUD CSS to use NES-era styling

### 🟡 Priority 3: Font Accent Rendering (MEDIUM VISIBILITY)
**Root cause:** Font atlas uses "Fredoka, Baloo 2, Nunito" which may not render French accents well at small sizes. The atlas generation clips glyph bounds tightly.

**Fix:** Switch primary font to one with better accent support, increase glyph padding

### 🟡 Priority 4: Too Many Tooltips on Game View (MEDIUM VISIBILITY)
**Root cause:** Floating text system creates emoji-heavy texts (💎⚡💥) with 5-second lifetime. Merge radius is only 40px. No rate limiting.

**Fix:** Reduce lifetime, increase merge radius, simplify text, add rate limiting

### 🟠 Priority 5: Projectiles Need Improvement (GAMEPLAY FEEL)
**Root cause:** Bullets are simple pentagons, missiles are triangles, laser is circles. No muzzle flash, no impact particles, no weapon-specific visual identity.

**Fix:** Add weapon-specific projectile visuals, muzzle flash, impact particles

### 🟠 Priority 6: Weapon Animations & Juice (GAMEPLAY FEEL)
**Root cause:** No recoil, no charge-up, no screen shake on fire, no hit flash beyond `hitThisFrame` flag.

**Fix:** Add screen shake on weapon fire, player recoil, hit spark particles

---

## Implementation Order

1. **CRT Brightness Fix** — Most visible, simplest change (shader tweaks)
2. **NES HUD Redesign** — High visibility, CSS-only changes
3. **Font Accent Fix** — Atlas + font family change
4. **Tooltip Clutter Reduction** — Gameplay code changes
5. **Projectile Visual Improvement** — Renderer + combat code
6. **Weapon Animation & Juice** — Most complex, touches multiple systems
