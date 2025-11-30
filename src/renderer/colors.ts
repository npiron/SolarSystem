import * as PIXI from "https://cdn.jsdelivr.net/npm/pixi.js@7.4.2/dist/pixi.min.mjs";
import { palette } from "../config/constants.ts";

export const paletteHex = palette.map((color) => PIXI.utils.string2hex(color));

export const colors = {
  player: PIXI.utils.string2hex("#7dd3fc"),
  collect: PIXI.utils.string2hex("#6ee7b7"),
  bulletLow: PIXI.utils.string2hex("#fff7ed"),
  bulletHigh: PIXI.utils.string2hex("#ffd166"),
  fragment: PIXI.utils.string2hex("#ff7ac3"),
  fragmentRing: PIXI.utils.string2hex("#ff7ac3"),
  elite: PIXI.utils.string2hex("#ff9d6c"),
  hpBg: PIXI.utils.string2hex("#0b1226"),
  hpFg: PIXI.utils.string2hex("#a3e635"),
  hudBg: PIXI.utils.string2hex("#0d1530"),
  hudBorder: PIXI.utils.string2hex("#e2e8f0"),
};

export function toVec4(hex: number | string, alpha = 1) {
  const value = typeof hex === "number" ? hex : PIXI.utils.string2hex(hex);
  return [
    ((value >> 16) & 0xff) / 255,
    ((value >> 8) & 0xff) / 255,
    (value & 0xff) / 255,
    alpha
  ];
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
  transparent: [0, 0, 0, 0]
};
