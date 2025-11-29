import type { PlayerStats, Upgrade } from "../types/index.ts";

export function createUpgrades(): Upgrade[] {
  return [
    {
      id: "attack",
      name: "Projectiles instables",
      description: "+15% dégâts par niveau",
      cost: 25,
      baseCost: 25,
      level: 0,
      max: 40,
      apply: (state: { player: PlayerStats }) => {
        state.player.damage *= 1.15;
      }
    },
    {
      id: "firerate",
      name: "Cadence hypersonique",
      description: "+10% vitesse de tir",
      cost: 40,
      baseCost: 40,
      level: 0,
      max: 30,
      apply: (state: { player: PlayerStats }) => {
        state.player.fireDelay *= 0.90;
      }
    },
    {
      id: "regen",
      name: "Gel réparateur",
      description: "+2 PV/s",
      cost: 45,
      baseCost: 45,
      level: 0,
      max: 20,
      apply: (state: { player: PlayerStats }) => {
        state.player.regen += 2;
      }
    },
    {
      id: "aoe",
      name: "Pulsar chaotique",
      description: "+1 projectile par tir",
      cost: 100,
      baseCost: 100,
      level: 0,
      max: 15,
      apply: (state: { player: PlayerStats }) => {
        state.player.projectiles += 1;
      }
    },
    {
      id: "range",
      name: "Portée fractale",
      description: "+15% portée des projectiles",
      cost: 70,
      baseCost: 70,
      level: 0,
      max: 20,
      apply: (state: { player: PlayerStats }) => {
        state.player.range *= 1.15;
      }
    },
    {
      id: "velocity",
      name: "Balistique ionisée",
      description: "+12% vitesse des projectiles",
      cost: 120,
      baseCost: 120,
      level: 0,
      max: 15,
      apply: (state: { player: PlayerStats }) => {
        state.player.bulletSpeed *= 1.12;
      }
    },
    {
      id: "crit",
      name: "Pointes critiques",
      description: "+3% chance de critique (x2.2)",
      cost: 180,
      baseCost: 180,
      level: 0,
      max: 15,
      apply: (state: { player: PlayerStats }) => {
        state.player.critChance = Math.min(0.9, state.player.critChance + 0.03);
        state.player.critMultiplier = 2.2;
      }
    },
    {
      id: "shield",
      name: "Bouclier prismatique",
      description: "Réduit les dégâts subis de 4%",
      cost: 200,
      baseCost: 200,
      level: 0,
      max: 15,
      apply: (state: { player: PlayerStats }) => {
        state.player.damageReduction = Math.min(0.7, state.player.damageReduction + 0.04);
      }
    },
    {
      id: "pierce",
      name: "Percée quantique",
      description: "+1 traversée de projectile",
      cost: 240,
      baseCost: 240,
      level: 0,
      max: 8,
      apply: (state: { player: PlayerStats }) => {
        state.player.pierce += 1;
      }
    },
    {
      id: "collect",
      name: "Rayon de collecte",
      description: "+10% portée d'aspiration des fragments",
      cost: 120,
      baseCost: 120,
      level: 0,
      max: 20,
      apply: (state: { player: PlayerStats }) => {
        state.player.collectRadius *= 1.10;
      }
    },
    {
      id: "speed",
      name: "Propulseurs quantiques",
      description: "+6% vitesse de déplacement",
      cost: 90,
      baseCost: 90,
      level: 0,
      max: 12,
      apply: (state: { player: PlayerStats }) => {
        state.player.speed *= 1.06;
      }
    }
  ];
}
