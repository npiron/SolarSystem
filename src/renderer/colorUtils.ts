/**
 * Convert a CSS hex color string to a WebGL vec4 color array.
 * Pure JavaScript implementation without external dependencies.
 * @param hexStr - Hex color string (e.g., "#fef08a" or "#fff")
 * @param alpha - Alpha value (0-1)
 * @returns RGBA color array with values 0-1
 */
export function hexStringToVec4(hexStr: string, alpha = 1): readonly [number, number, number, number] {
  const hex = hexStr.replace("#", "");
  const fullHex = hex.length === 3
    ? hex.split("").map((c) => c + c).join("")
    : hex;
  const value = parseInt(fullHex, 16);
  return [
    ((value >> 16) & 0xff) / 255,
    ((value >> 8) & 0xff) / 255,
    (value & 0xff) / 255,
    alpha
  ] as const;
}

/**
 * Convert a numeric hex color to a WebGL vec4 color array.
 * @param hex - Numeric hex color (e.g., 0xff0000)
 * @param alpha - Alpha value (0-1)
 * @returns RGBA color array with values 0-1
 */
export function hexToVec4(hex: number, alpha = 1): readonly [number, number, number, number] {
  return [
    ((hex >> 16) & 0xff) / 255,
    ((hex >> 8) & 0xff) / 255,
    (hex & 0xff) / 255,
    alpha
  ] as const;
}
