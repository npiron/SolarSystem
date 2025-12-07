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
  // Player - Black hole aesthetic with fiery accretion disk
  player: string2hex("#0a0c14"),
  playerCore: string2hex("#05060d"),
  playerHorizon: string2hex("#11162a"),
  accretionInner: string2hex("#ff8a3d"),
  accretionOuter: string2hex("#ffca6a"),
  collect: string2hex("#ff9f5a"),
  bulletLow: string2hex("#ffffff"),
  bulletHigh: string2hex("#ffdd00"),
  orbitBullet: string2hex("#bf5fff"),
  fragment: string2hex("#ff4da6"),
  fragmentRing: string2hex("#ff6bc5"),
  elite: string2hex("#ff6b35"),
  // Enemy type colors - High contrast palette for clear differentiation
  enemyWeak: string2hex("#7cff00"),     // Lime green - easy to kill
  enemyNormal: string2hex("#00a8ff"),   // Sky blue - standard threat
  enemyStrong: string2hex("#d400ff"),   // Vivid purple - dangerous
  enemyElite: string2hex("#ff4500"),    // Red-orange - boss-like
  enemyVolatile: string2hex("#ff0044"), // Bright red - explodes on death
  enemySplitter: string2hex("#00ffff"), // Pure cyan - divides into smaller foes
  enemyArtillery: string2hex("#ffff00"), // Pure yellow - fires from afar
  // Boss colors
  boss: string2hex("#ff0044"),          // Hot red - boss
  bossHalo: string2hex("#ff3366"),      // Pink-red glow
  enemyProjectile: string2hex("#ff5722"), // Orange-red - enemy projectile
  // Fragment value colors - Clear progression from low to high value
  fragmentLow: string2hex("#8b7cf6"),   // Light purple - low value
  fragmentMedium: string2hex("#ff66cc"), // Bright pink - medium value
  fragmentHigh: string2hex("#ffaa00"),  // Vibrant gold - high value
  hpBg: string2hex("#0a0e1a"),
  hpFg: string2hex("#00ff66"),
  hudBg: string2hex("#0a0f1f"),
  hudBorder: string2hex("#ffffff"),
  // Weapon colors
  lightning: string2hex("#9f7aea"),
  lightningGlow: string2hex("#c4b5fd"),
  laser: string2hex("#ff3333"),
  laserGlow: string2hex("#ff6666"),
  missile: string2hex("#ff8c00"),
  missileGlow: string2hex("#ffa500"),
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
  playerCore: toVec4(colors.playerCore, 1),
  eventHorizon: toVec4(colors.playerHorizon, 0.9),
  accretionInner: toVec4(colors.accretionInner, 1),
  accretionOuter: toVec4(colors.accretionOuter, 0.7),
  playerHalo: toVec4(colors.accretionOuter, 0.22),
  playerAura: toVec4(colors.playerHorizon, 0.18),
  collectRing: toVec4(colors.collect, 0.32),
  bullet: toVec4(colors.bulletHigh, 1),
  bulletLow: toVec4(colors.bulletLow, 1),
  bulletGlow: toVec4(colors.bulletHigh, 0.35),
  orbitBullet: toVec4(colors.orbitBullet, 1),
  orbitGlow: toVec4(colors.orbitBullet, 0.4),
  fragment: toVec4(colors.fragment, 1),
  fragmentRing: toVec4(colors.fragmentRing, 0.45),
  elite: toVec4(colors.elite, 1),
  // Enemy type colors for WebGL
  enemyWeak: toVec4(colors.enemyWeak, 1),
  enemyNormal: toVec4(colors.enemyNormal, 1),
  enemyStrong: toVec4(colors.enemyStrong, 1),
  enemyElite: toVec4(colors.enemyElite, 1),
  enemyVolatile: toVec4(colors.enemyVolatile, 1),
  enemySplitter: toVec4(colors.enemySplitter, 1),
  enemyArtillery: toVec4(colors.enemyArtillery, 1),
  // Boss colors for WebGL
  boss: toVec4(colors.boss, 1),
  bossHalo: toVec4(colors.bossHalo, 0.4),
  enemyProjectile: toVec4(colors.enemyProjectile, 1),
  enemyProjectileGlow: toVec4(colors.enemyProjectile, 0.5),
  // Fragment value colors for WebGL
  fragmentLow: toVec4(colors.fragmentLow, 1),
  fragmentMedium: toVec4(colors.fragmentMedium, 1),
  fragmentHigh: toVec4(colors.fragmentHigh, 1),
  fragmentRingLow: toVec4(colors.fragmentLow, 0.45),
  fragmentRingMedium: toVec4(colors.fragmentRing, 0.45),
  fragmentRingHigh: toVec4(colors.fragmentHigh, 0.45),
  hpBg: toVec4(colors.hpBg, 0.5),
  hpFg: toVec4(colors.hpFg, 1),
  transparent: [0, 0, 0, 0] as const,
  // Weapon colors for WebGL
  lightning: toVec4(colors.lightning, 1),
  lightningGlow: toVec4(colors.lightningGlow, 0.6),
  laser: toVec4(colors.laser, 1),
  laserGlow: toVec4(colors.laserGlow, 0.5),
  missile: toVec4(colors.missile, 1),
  missileGlow: toVec4(colors.missileGlow, 0.5),
};
