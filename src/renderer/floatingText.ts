import * as PIXI from "https://cdn.jsdelivr.net/npm/pixi.js@7.4.2/dist/pixi.min.mjs";

const floatingTextPool: PIXI.Text[] = [];
const floatingTextStyleCache = new Map<string, PIXI.TextStyle>();

const floatingTextStyleOptions = {
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

function getFloatingTextStyle(color = floatingTextStyleOptions.fill) {
  const key = color || floatingTextStyleOptions.fill;
  if (!floatingTextStyleCache.has(key)) {
    const style = new PIXI.TextStyle({ ...floatingTextStyleOptions, fill: key });
    if (typeof style.toJSON !== "function") {
      style.toJSON = () => ({ ...floatingTextStyleOptions, fill: key });
    }
    floatingTextStyleCache.set(key, style);
  }
  return floatingTextStyleCache.get(key)!;
}

export function acquireFloatingText(color?: string) {
  const text = floatingTextPool.pop() || new PIXI.Text({ text: "", style: getFloatingTextStyle(color) });
  text.anchor.set(0.5, 1);
  text.style = getFloatingTextStyle(color);
  return text;
}

export function releaseFloatingText(text: PIXI.Text) {
  floatingTextPool.push(text);
}
