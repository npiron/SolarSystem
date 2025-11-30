import { palette } from "../config/constants.ts";
export { hexStringToVec4, hexToVec4 } from "./colorUtils.ts";

import { hexStringToVec4 } from "./colorUtils.ts";

export const paletteVec4 = palette.map((color) => hexStringToVec4(color));

export const webglColors = {
  player: hexStringToVec4("#7dd3fc", 1),
  playerHalo: hexStringToVec4("#6ee7b7", 0.18),
  playerAura: hexStringToVec4("#7dd3fc", 0.12),
  collectRing: hexStringToVec4("#6ee7b7", 0.22),
  bullet: hexStringToVec4("#ffd166", 0.9),
  bulletLow: hexStringToVec4("#fff7ed", 0.9),
  bulletGlow: hexStringToVec4("#ffd166", 0.22),
  fragment: hexStringToVec4("#ff7ac3", 1),
  fragmentRing: hexStringToVec4("#ff7ac3", 0.35),
  elite: hexStringToVec4("#ff9d6c", 1),
  // Enemy type colors for WebGL
  enemyWeak: hexStringToVec4("#a5d6a7", 1),
  enemyNormal: hexStringToVec4("#90caf9", 1),
  enemyStrong: hexStringToVec4("#ce93d8", 1),
  enemyElite: hexStringToVec4("#ffab91", 1),
  // Fragment value colors for WebGL
  fragmentLow: hexStringToVec4("#b39ddb", 1),
  fragmentMedium: hexStringToVec4("#ff7ac3", 1),
  fragmentHigh: hexStringToVec4("#ffd54f", 1),
  fragmentRingLow: hexStringToVec4("#b39ddb", 0.35),
  fragmentRingMedium: hexStringToVec4("#ff7ac3", 0.35),
  fragmentRingHigh: hexStringToVec4("#ffd54f", 0.35),
  hpBg: hexStringToVec4("#0b1226", 0.4),
  hpFg: hexStringToVec4("#a3e635", 1),
  transparent: [0, 0, 0, 0]
};
