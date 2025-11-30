declare module "https://cdn.jsdelivr.net/npm/pixi.js@7.4.2/dist/pixi.min.mjs" {
  export class Container {
    [key: string]: any;
    filters?: any;
  }
  export class Graphics {
    [key: string]: any;
    filters?: any;
    scale: any;
  }
  export class Text {
    constructor(options?: any);
    anchor: any;
    style: any;
    toJSON?: () => any;
    [key: string]: any;
  }
  export class TextStyle {
    constructor(options?: any);
    toJSON?: () => any;
    [key: string]: any;
  }
  export namespace filters {
    class NoiseFilter {
      constructor(strength?: number);
    }
  }
  export namespace utils {
    function string2hex(hex: string): number;
  }
  const PIXI: typeof import("https://cdn.jsdelivr.net/npm/pixi.js@7.4.2/dist/pixi.min.mjs");
  export default PIXI;
}

declare module "https://cdn.jsdelivr.net/npm/pixi-filters@5.3.0/dist/browser/pixi-filters.mjs" {
  export type GlowFilter = any;
  export type KawaseBlurFilter = any;
  export const GlowFilter: GlowFilter;
  export const KawaseBlurFilter: KawaseBlurFilter;
}

declare module "https://cdn.jsdelivr.net/npm/gsap@3.12.5/+esm" {
  export interface GsapTween {}
  export interface GsapInstance {
    core: { Tween: GsapTween };
    to: (...args: any[]) => any;
  }
  export as namespace gsap;
  const gsap: GsapInstance;
  export default gsap;
}

declare namespace gsap {
  const core: { Tween: any };
}
