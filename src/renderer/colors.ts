export { hexStringToVec4, hexToVec4 } from "./colorUtils.ts";

/**
 * Convert a CSS hex color string to a numeric hex value.
 * @param hex - Hex color string (e.g., "#fef08a" or "#fff")
 * @returns Numeric hex value (e.g., 0xfef08a)
 */
function string2hex(hex: string): number {
  const clean = hex.replace("#", "");
  const fullHex = clean.length === 3
    ? clean.split("").map((c) => c + c).join("")
    : clean;
  return parseInt(fullHex, 16);
}

export const colors = {
  player: string2hex("#7dd3fc"),
  collect: string2hex("#6ee7b7"),
  bulletLow: string2hex("#fff7ed"),
  bulletHigh: string2hex("#ffd166"),
  fragment: string2hex("#ff7ac3"),
  fragmentRing: string2hex("#ff7ac3"),
  elite: string2hex("#ff9d6c"),
  // Enemy type colors - distinct hues for visual differentiation
  enemyWeak: string2hex("#a5d6a7"),     // Green - easy to kill
  enemyNormal: string2hex("#90caf9"),   // Blue - standard threat
  enemyStrong: string2hex("#ce93d8"),   // Purple - dangerous
  enemyElite: string2hex("#ffab91"),    // Orange - boss-like
  // Fragment value colors - brightness indicates value
  fragmentLow: string2hex("#b39ddb"),   // Light purple - low value
  fragmentMedium: string2hex("#ff7ac3"), // Pink - medium value
  fragmentHigh: string2hex("#ffd54f"),  // Gold - high value
  hpBg: string2hex("#0b1226"),
  hpFg: string2hex("#a3e635"),
  hudBg: string2hex("#0d1530"),
  hudBorder: string2hex("#e2e8f0"),
};

export function toVec4(hex: number | string, alpha = 1): [number, number, number, number] {
  const value = typeof hex === "number" ? hex : string2hex(hex);
  return [
    ((value >> 16) & 0xff) / 255,
    ((value >> 8) & 0xff) / 255,
    (value & 0xff) / 255,
    alpha
  ] as const;
}

export const webglColors = {
  player: toVec4(colors.player, 1),
  playerHalo: toVec4(colors.collect, 0.25),
  playerAura: toVec4(colors.player, 0.18),
  collectRing: toVec4(colors.collect, 0.3),
  bullet: toVec4(colors.bulletHigh, 1),
  bulletLow: toVec4(colors.bulletLow, 1),
  bulletGlow: toVec4(colors.bulletHigh, 0.35),
  fragment: toVec4(colors.fragment, 1),
  fragmentRing: toVec4(colors.fragmentRing, 0.45),
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
  fragmentRingLow: toVec4(colors.fragmentLow, 0.45),
  fragmentRingMedium: toVec4(colors.fragmentRing, 0.45),
  fragmentRingHigh: toVec4(colors.fragmentHigh, 0.45),
  hpBg: toVec4(colors.hpBg, 0.5),
  hpFg: toVec4(colors.hpFg, 1),
  transparent: [0, 0, 0, 0] as const
};
