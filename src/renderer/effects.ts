import * as PIXI from "https://cdn.jsdelivr.net/npm/pixi.js@7.4.2/dist/pixi.min.mjs";
import { GlowFilter, KawaseBlurFilter } from "https://cdn.jsdelivr.net/npm/pixi-filters@5.3.0/dist/browser/pixi-filters.mjs";
import gsap from "https://cdn.jsdelivr.net/npm/gsap@3.12.5/+esm";
import type { Colors } from "./types.ts";

type AddonState = {
  addons: {
    glow: boolean;
    bloom: boolean;
    grain: boolean;
    hudPulse: boolean;
  };
  visualsLow: boolean;
};

type RenderObjects = {
  playerContainer: PIXI.Container | null;
  fragments: PIXI.Graphics;
  fragmentRings: PIXI.Graphics;
  bulletsGlow: PIXI.Graphics;
  backgroundContainer: PIXI.Container;
  hudLayer: PIXI.Container;
  hudBg: PIXI.Graphics | null;
  aura: PIXI.Graphics;
};

export function createEffects(colors: Colors) {
  const fx = {
    auraGlow: null as GlowFilter | null,
    hudGlow: null as GlowFilter | null,
    bloom: new KawaseBlurFilter([0, 1], 6),
    noise: new PIXI.filters.NoiseFilter(0.05)
  };

  let auraPulseTween: ReturnType<typeof gsap.to> | null = null;

  function ensureFilters() {
    if (!fx.auraGlow) {
      fx.auraGlow = new GlowFilter({
        distance: 16,
        outerStrength: 2.6,
        innerStrength: 0.6,
        color: colors.player,
        quality: 0.25
      });
    }
    if (!fx.hudGlow) {
      fx.hudGlow = new GlowFilter({
        distance: 10,
        outerStrength: 1.6,
        innerStrength: 0.4,
        color: colors.hudBorder,
        quality: 0.2
      });
    }
  }

  function refreshHudPulse(state: AddonState, renderObjects: RenderObjects) {
    if (auraPulseTween) {
      auraPulseTween.kill();
      auraPulseTween = null;
    }
    if (!renderObjects.aura) return;
    renderObjects.aura.scale.set(1);
    if (state.addons.hudPulse && state.addons.glow && !state.visualsLow) {
      auraPulseTween = gsap.to(renderObjects.aura.scale, {
        x: 1.08,
        y: 1.08,
        duration: 1.6,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut"
      });
    }
  }

  function applyAddonFilters(state: AddonState, renderObjects: RenderObjects) {
    ensureFilters();
    const allowHeavyFx = !state.visualsLow;
    if (renderObjects.playerContainer) {
      renderObjects.playerContainer.filters = allowHeavyFx && state.addons.glow ? [fx.auraGlow] : null;
    }

    const bloomFilters = allowHeavyFx && state.addons.bloom ? [fx.bloom] : null;
    renderObjects.fragments.filters = bloomFilters;
    renderObjects.fragmentRings.filters = bloomFilters;
    renderObjects.bulletsGlow.filters = bloomFilters;

    renderObjects.backgroundContainer.filters = state.addons.grain ? [fx.noise] : null;
    renderObjects.hudLayer.filters = allowHeavyFx && state.addons.glow ? [fx.hudGlow] : null;

    if (renderObjects.hudBg) {
      gsap.to(renderObjects.hudBg, {
        alpha: state.addons.glow ? 0.54 : 0.36,
        duration: 0.3,
        ease: "sine.out"
      });
    }

    refreshHudPulse(state, renderObjects);
  }

  return {
    applyAddonFilters,
  };
}
