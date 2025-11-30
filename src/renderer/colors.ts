import * as PIXI from "https://cdn.jsdelivr.net/npm/pixi.js@7.4.2/dist/pixi.min.mjs";
import { palette } from "../config/constants.ts";
export { hexStringToVec4, hexToVec4 } from "./colorUtils.ts";

export const paletteHex = palette.map((color) => PIXI.utils.string2hex(color));

export const colors = {
  player: PIXI.utils.string2hex("#7dd3fc"),
  collect: PIXI.utils.string2hex("#6ee7b7"),
  bulletLow: PIXI.utils.string2hex("#fff7ed"),
  bulletHigh: PIXI.utils.string2hex("#ffd166"),
  fragment: PIXI.utils.string2hex("#ff7ac3"),
  fragmentRing: PIXI.utils.string2hex("#ff7ac3"),
  elite: PIXI.utils.string2hex("#ff9d6c"),
  // Enemy type colors - distinct hues for visual differentiation
  enemyWeak: PIXI.utils.string2hex("#a5d6a7"),     // Green - easy to kill
  enemyNormal: PIXI.utils.string2hex("#90caf9"),   // Blue - standard threat
  enemyStrong: PIXI.utils.string2hex("#ce93d8"),   // Purple - dangerous
  enemyElite: PIXI.utils.string2hex("#ffab91"),    // Orange - boss-like
  // Fragment value colors - brightness indicates value
  fragmentLow: PIXI.utils.string2hex("#b39ddb"),   // Light purple - low value
  fragmentMedium: PIXI.utils.string2hex("#ff7ac3"), // Pink - medium value
  fragmentHigh: PIXI.utils.string2hex("#ffd54f"),  // Gold - high value
  hpBg: PIXI.utils.string2hex("#0b1226"),
  hpFg: PIXI.utils.string2hex("#a3e635"),
  hudBg: PIXI.utils.string2hex("#0d1530"),
  hudBorder: PIXI.utils.string2hex("#e2e8f0"),
};

export function toVec4(hex: number | string, alpha = 1): [number, number, number, number] {
  const value = typeof hex === "number" ? hex : PIXI.utils.string2hex(hex);
  return [
    ((value >> 16) & 0xff) / 255,
    ((value >> 8) & 0xff) / 255,
    (value & 0xff) / 255,
    alpha
  ] as const;
}

export const paletteVec4 = palette.map((color) => toVec4(color));

export const webglColors = {
  player: toVec4(colors.player, 1),
  playerHalo: toVec4(colors.collect, 0.18),
  playerAura: toVec4(colors.player, 0.12),
  collectRing: toVec4(colors.collect, 0.22),
  bullet: toVec4(colors.bulletHigh, 0.9),
  bulletLow: toVec4(colors.bulletLow, 0.9),
  bulletGlow: toVec4(colors.bulletHigh, 0.22),
  fragment: toVec4(colors.fragment, 1),
  fragmentRing: toVec4(colors.fragmentRing, 0.35),
  elite: toVec4(colors.elite, 1),
  // Enemy type colors for WebGL
  enemyWeak: toVec4(colors.enemyWeak, 1),
  enemyNormal: toVec4(colors.enemyNormal, 1),
  enemyStrong: toVec4(colors.enemyStrong, 1),
  enemyElite: toVec4(colors.enemyElite, 1),
  // Fragment value colors for WebGL
  fragmentLow: toVec4(colors.fragmentLow, 1),
  fragmentMedium: toVec4(colors.fragmentMedium, 1),
  fragmentHigh: toVec4(colors.fragmentHigh, 1),
  fragmentRingLow: toVec4(colors.fragmentLow, 0.35),
  fragmentRingMedium: toVec4(colors.fragmentRing, 0.35),
  fragmentRingHigh: toVec4(colors.fragmentHigh, 0.35),
  hpBg: toVec4(colors.hpBg, 0.4),
  hpFg: toVec4(colors.hpFg, 1),
  transparent: [0, 0, 0, 0] as const
};
