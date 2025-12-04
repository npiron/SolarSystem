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
      name: "Projectiles instables",
      description: "+15% dégâts par niveau",
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
      name: "Cadence hypersonique",
      description: "+10% vitesse de tir",
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
      name: "Gel réparateur",
      description: "+2 PV/s",
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
      name: "Pulsar chaotique",
      description: "+1 projectile par tir",
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
      name: "Portée fractale",
      description: "+15% portée des projectiles",
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
      name: "Balistique ionisée",
      description: "+12% vitesse des projectiles",
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
      name: "Pointes critiques",
      description: "+3% chance de critique (x2.2)",
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
      name: "Bouclier prismatique",
      description: "Réduit les dégâts subis de 4%",
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
      name: "Percée quantique",
      description: "+1 traversée de projectile",
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
      name: "Rayon de collecte",
      description: "+10% portée d'aspiration des fragments",
      cost: 120,
      baseCost: 120,
      growth: 1.17,
      level: 0,
      max: Number.POSITIVE_INFINITY,
      apply: (state: { player: PlayerStats }, level: number) => {
        const effectiveLevel = scaleLevel(level, 30, 0.85);
        state.player.collectRadius *= Math.pow(1.1, effectiveLevel);
      }
    },
    {
      id: "speed",
      name: "Propulseurs quantiques",
      description: "+6% vitesse de déplacement",
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
