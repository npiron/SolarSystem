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
