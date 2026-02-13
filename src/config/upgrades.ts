import type { PlayerStats, Upgrade } from "../types/index.ts";

function scaleLevel(level: number, softcapStart: number, softcapExponent: number): number {
  if (level <= softcapStart) return level;
  const overflow = level - softcapStart;
  return softcapStart + Math.pow(overflow, softcapExponent);
}

export function createUpgrades(): Upgrade[] {
  return [
    {
      id: "attack",
      name: "Dégâts +15%",
      description: "Augmente les dégâts de chaque projectile",
      cost: 25,
      baseCost: 25,
      growth: 1.24,
      level: 0,
      max: Number.POSITIVE_INFINITY,
      apply: (state: { player: PlayerStats }, level: number) => {
        const effectiveLevel = scaleLevel(level, 40, 0.82);
        state.player.damage *= Math.pow(1.15, effectiveLevel);
      }
    },
    {
      id: "firerate",
      name: "Cadence +10%",
      description: "Augmente la vitesse de tir",
      cost: 40,
      baseCost: 40,
      growth: 1.23,
      level: 0,
      max: Number.POSITIVE_INFINITY,
      apply: (state: { player: PlayerStats }, level: number) => {
        const effectiveLevel = scaleLevel(level, 32, 0.8);
        state.player.fireDelay *= Math.pow(0.9, effectiveLevel);
      }
    },
    {
      id: "regen",
      name: "Régénération +2 PV/s",
      description: "Régénère des points de vie chaque seconde",
      cost: 45,
      baseCost: 45,
      growth: 1.18,
      level: 0,
      max: Number.POSITIVE_INFINITY,
      apply: (state: { player: PlayerStats }, level: number) => {
        const effectiveLevel = scaleLevel(level, 28, 0.78);
        state.player.regen += 2 * effectiveLevel;
      }
    },
    {
      id: "aoe",
      name: "Projectile +1",
      description: "Ajoute un projectile supplémentaire par tir",
      cost: 100,
      baseCost: 100,
      growth: 1.35,
      level: 0,
      max: Number.POSITIVE_INFINITY,
      apply: (state: { player: PlayerStats }, level: number) => {
        const effectiveLevel = scaleLevel(level, 18, 0.72);
        state.player.projectiles += Math.floor(effectiveLevel);
      }
    },
    {
      id: "range",
      name: "Portée +15%",
      description: "Augmente la portée des projectiles",
      cost: 70,
      baseCost: 70,
      growth: 1.2,
      level: 0,
      max: Number.POSITIVE_INFINITY,
      apply: (state: { player: PlayerStats }, level: number) => {
        const effectiveLevel = scaleLevel(level, 26, 0.8);
        state.player.range *= Math.pow(1.15, effectiveLevel);
      }
    },
    {
      id: "velocity",
      name: "Vitesse projectile +12%",
      description: "Les projectiles vont plus vite",
      cost: 120,
      baseCost: 120,
      growth: 1.19,
      level: 0,
      max: Number.POSITIVE_INFINITY,
      apply: (state: { player: PlayerStats }, level: number) => {
        const effectiveLevel = scaleLevel(level, 26, 0.82);
        state.player.bulletSpeed *= Math.pow(1.12, effectiveLevel);
      }
    },
    {
      id: "crit",
      name: "Critique +3%",
      description: "Augmente les chances de coup critique (×2.2)",
      cost: 180,
      baseCost: 180,
      growth: 1.26,
      level: 0,
      max: Number.POSITIVE_INFINITY,
      apply: (state: { player: PlayerStats }, level: number) => {
        const effectiveLevel = scaleLevel(level, 24, 0.77);
        state.player.critChance = Math.min(0.95, state.player.critChance + 0.03 * effectiveLevel);
        const multiplierBonus = 0.2 * Math.min(level, 30);
        state.player.critMultiplier = 2 + multiplierBonus;
      }
    },
    {
      id: "shield",
      name: "Armure +4%",
      description: "Réduit les dégâts subis",
      cost: 200,
      baseCost: 200,
      growth: 1.21,
      level: 0,
      max: Number.POSITIVE_INFINITY,
      apply: (state: { player: PlayerStats }, level: number) => {
        const effectiveLevel = scaleLevel(level, 18, 0.7);
        state.player.damageReduction = Math.min(0.8, state.player.damageReduction + 0.04 * effectiveLevel);
      }
    },
    {
      id: "pierce",
      name: "Traversée +1",
      description: "Les projectiles traversent un ennemi de plus",
      cost: 240,
      baseCost: 240,
      growth: 1.34,
      level: 0,
      max: Number.POSITIVE_INFINITY,
      apply: (state: { player: PlayerStats }, level: number) => {
        const effectiveLevel = scaleLevel(level, 10, 0.7);
        state.player.pierce += Math.floor(effectiveLevel);
      }
    },
    {
      id: "collect",
      name: "Collecte +5%",
      description: "Augmente le rayon d'aspiration des fragments",
      cost: 120,
      baseCost: 120,
      growth: 1.17,
      level: 0,
      max: Number.POSITIVE_INFINITY,
      apply: (state: { player: PlayerStats }, level: number) => {
        const effectiveLevel = scaleLevel(level, 30, 0.85);
        state.player.collectRadius *= Math.pow(1.05, effectiveLevel);
      }
    },
    {
      id: "speed",
      name: "Vitesse +6%",
      description: "Augmente la vitesse de déplacement",
      cost: 90,
      baseCost: 90,
      growth: 1.16,
      level: 0,
      max: Number.POSITIVE_INFINITY,
      apply: (state: { player: PlayerStats }, level: number) => {
        const effectiveLevel = scaleLevel(level, 30, 0.9);
        state.player.speed *= Math.pow(1.06, effectiveLevel);
      }
    }
  ];
}
