/**
 * Render configuration and color palette
 * Contains all color definitions and visual constants for PIXI rendering
 */

/** Asset paths for game textures */
export interface AssetPaths {
  background: string;
  player: string;
  fragment: string;
  enemy: string;
}

/** Sprite scale factors */
export interface SpriteScales {
  player: number;
  enemy: number;
  fragment: number;
}

/** Game color palette (hex values) */
export interface GameColors {
  player: number;
  collect: number;
  bulletLow: number;
  bulletHigh: number;
  fragment: number;
  fragmentRing: number;
  elite: number;
  hpBg: number;
  hpFg: number;
  hudBg: number;
  hudBorder: number;
}

/** Text style options for floating text */
export interface FloatingTextStyleOptions {
  fontFamily: string;
  fontSize: number;
  fill: string;
  stroke: string;
  strokeThickness: number;
  dropShadow: boolean;
  dropShadowColor: string;
  dropShadowBlur: number;
  dropShadowAlpha: number;
  dropShadowDistance: number;
}

/** Text style options for HUD text */
export interface HudTextStyleOptions {
  fontFamily: string;
  fontSize: number;
  fill: string;
  stroke: string;
  strokeThickness: number;
  dropShadow: boolean;
  dropShadowColor: string;
  dropShadowBlur: number;
  dropShadowAlpha: number;
  dropShadowDistance: number;
}

/** Default sprite scales */
export const DEFAULT_SPRITE_SCALES: SpriteScales = {
  player: 1.2,
  enemy: 1.1,
  fragment: 1.4,
};

/** Default floating text style options */
export const DEFAULT_FLOATING_TEXT_STYLE: FloatingTextStyleOptions = {
  fontFamily: "Fredoka, Baloo 2, Nunito, sans-serif",
  fontSize: 13,
  fill: "#fff7ed",
  stroke: "#0b1024",
  strokeThickness: 3,
  dropShadow: true,
  dropShadowColor: "#0b1024",
  dropShadowBlur: 4,
  dropShadowAlpha: 0.75,
  dropShadowDistance: 0,
};

/** Default HUD text style options */
export const DEFAULT_HUD_TEXT_STYLE: HudTextStyleOptions = {
  fontFamily: "Baloo 2, Fredoka, Nunito, sans-serif",
  fontSize: 15,
  fill: "#fff7ed",
  stroke: "#0b1024",
  strokeThickness: 3,
  dropShadow: true,
  dropShadowColor: "#0b1024",
  dropShadowBlur: 5,
  dropShadowAlpha: 0.9,
  dropShadowDistance: 0,
};

/** Color string definitions for conversion to hex */
export const COLOR_STRINGS = {
  player: "#7dd3fc",
  collect: "#6ee7b7",
  bulletLow: "#fff7ed",
  bulletHigh: "#ffd166",
  fragment: "#ff7ac3",
  fragmentRing: "#ff7ac3",
  elite: "#ff9d6c",
  hpBg: "#0b1226",
  hpFg: "#a3e635",
  hudBg: "#0d1530",
  hudBorder: "#e2e8f0",
} as const;

/**
 * Creates asset paths using import.meta.url for bundler compatibility
 * @param baseUrl - Base URL from import.meta.url
 */
export function createAssetPaths(baseUrl: string): AssetPaths {
  return {
    background: new URL("../../public/assets/Medieval RTS/Preview_KenneyNL.png", baseUrl).href,
    player: new URL("../../public/assets/Free - Raven Fantasy Icons/Separated Files/64x64/fc1181.png", baseUrl).href,
    fragment: new URL("../../public/assets/Free - Raven Fantasy Icons/Separated Files/64x64/fc1805.png", baseUrl).href,
    enemy: new URL("../../public/assets/Free - Raven Fantasy Icons/Separated Files/64x64/fc1173.png", baseUrl).href,
  };
}
