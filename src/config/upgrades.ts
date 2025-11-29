import type { PlayerStats, Upgrade } from "../types/index.ts";

export function createUpgrades(): Upgrade[] {
  return [
    {
      id: "attack",
      name: "Projectiles instables",
      description: "+25% dégâts par niveau",
      cost: 30,
      baseCost: 30,
      level: 0,
      max: 50,
      apply: (state: { player: PlayerStats }) => {
        state.player.damage *= 1.25;
      }
    },
    {
      id: "firerate",
      name: "Cadence hypersonique",
      description: "+15% vitesse de tir",
      cost: 45,
      baseCost: 45,
      level: 0,
      max: 40,
      apply: (state: { player: PlayerStats }) => {
        state.player.fireDelay *= 0.85;
      }
    },
    {
      id: "regen",
      name: "Gel réparateur",
      description: "+3 PV/s",
      cost: 50,
      baseCost: 50,
      level: 0,
      max: 15,
      apply: (state: { player: PlayerStats }) => {
        state.player.regen += 3;
      }
    },
    {
      id: "aoe",
      name: "Pulsar chaotique",
      description: "+1 projectile par tir",
      cost: 120,
      baseCost: 120,
      level: 0,
      max: 20,
      apply: (state: { player: PlayerStats }) => {
        state.player.projectiles += 1;
      }
    },
    {
      id: "range",
      name: "Portée fractale",
      description: "+20% portée des projectiles",
      cost: 80,
      baseCost: 80,
      level: 0,
      max: 25,
      apply: (state: { player: PlayerStats }) => {
        state.player.range *= 1.2;
      }
    },
    {
      id: "velocity",
      name: "Balistique ionisée",
      description: "+15% vitesse des projectiles",
      cost: 140,
      baseCost: 140,
      level: 0,
      max: 20,
      apply: (state: { player: PlayerStats }) => {
        state.player.bulletSpeed *= 1.15;
      }
    },
    {
      id: "crit",
      name: "Pointes critiques",
      description: "+4% chance de critique (x2.2)",
      cost: 200,
      baseCost: 200,
      level: 0,
      max: 20,
      apply: (state: { player: PlayerStats }) => {
        state.player.critChance = Math.min(0.9, state.player.critChance + 0.04);
        state.player.critMultiplier = 2.2;
      }
    },
    {
      id: "shield",
      name: "Bouclier prismatique",
      description: "Réduit les dégâts subis de 5%",
      cost: 220,
      baseCost: 220,
      level: 0,
      max: 12,
      apply: (state: { player: PlayerStats }) => {
        state.player.damageReduction = Math.min(0.7, state.player.damageReduction + 0.05);
      }
    },
    {
      id: "pierce",
      name: "Percée quantique",
      description: "+1 traversée de projectile",
      cost: 260,
      baseCost: 260,
      level: 0,
      max: 10,
      apply: (state: { player: PlayerStats }) => {
        state.player.pierce += 1;
      }
    },
    {
      id: "collect",
      name: "Rayon de collecte",
      description: "+12% portée d'aspiration des fragments",
      cost: 140,
      baseCost: 140,
      level: 0,
      max: 25,
      apply: (state: { player: PlayerStats }) => {
        state.player.collectRadius *= 1.12;
      }
    },
    {
      id: "speed",
      name: "Propulseurs quantiques",
      description: "+8% vitesse de déplacement",
      cost: 100,
      baseCost: 100,
      level: 0,
      max: 15,
      apply: (state: { player: PlayerStats }) => {
        state.player.speed *= 1.08;
      }
    }
  ];
}
