/**
 * Type declarations for external CDN modules
 * These modules are loaded via importmap in index.html
 */

// PIXI.js types - core types used in main.ts
declare module "https://cdn.jsdelivr.net/npm/pixi.js@7.4.2/dist/pixi.min.mjs" {
  export * from "pixi.js";
}

// PIXI Filters types
declare module "https://cdn.jsdelivr.net/npm/pixi-filters@5.3.0/dist/browser/pixi-filters.mjs" {
  import * as PIXI from "pixi.js";
  
  export class GlowFilter extends PIXI.Filter {
    constructor(options?: {
      distance?: number;
      outerStrength?: number;
      innerStrength?: number;
      color?: number;
      quality?: number;
    });
  }
  
  export class KawaseBlurFilter extends PIXI.Filter {
    constructor(blur?: number | number[], quality?: number);
  }
}

// GSAP types
declare module "https://cdn.jsdelivr.net/npm/gsap@3.12.5/+esm" {
  interface TweenConfig {
    x?: number;
    y?: number;
    alpha?: number;
    duration?: number;
    repeat?: number;
    yoyo?: boolean;
    ease?: string;
  }
  
  interface TweenInstance {
    kill(): void;
  }
  
  const gsap: {
    to(target: unknown, config: TweenConfig): TweenInstance;
  };
  
  export default gsap;
}
