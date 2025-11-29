import type { Talent } from "../types/index.ts";

export function createTalentTree(): Talent[] {
  return [
    {
      id: "focus_fulgurant",
      name: "Focalisation fulgurante",
      description: "+12% dégâts de base",
      synergy: "dégâts",
      cost: 320,
      requires: [],
      effect: { damageMult: 1.12 },
    },
    {
      id: "cascade_critique",
      name: "Cascade critique",
      description: "+3% chances de critique et +10% multiplicateur",
      synergy: "dégâts",
      cost: 520,
      requires: ["focus_fulgurant"],
      effect: { critChance: 0.03, critMultiplier: 1.1 },
    },
    {
      id: "anneau_fulgurant",
      name: "Anneau fulgurant",
      description: "-8% délai de tir et +1 projectile",
      synergy: "cadence",
      cost: 580,
      requires: ["focus_fulgurant"],
      effect: { fireDelayMult: 0.92, projectiles: 1 },
    },
    {
      id: "polarite_stable",
      name: "Polarité stable",
      description: "Bouclier +7% et +1.5 régénération",
      synergy: "défense",
      cost: 450,
      requires: ["focus_fulgurant"],
      effect: { damageReduction: 0.07, regen: 1.5 },
    },
    {
      id: "logistique_quantique",
      name: "Logistique quantique",
      description: "+18% production passive et +10% portée de collecte",
      synergy: "économie",
      cost: 500,
      requires: [],
      effect: { economy: 1.18, collectRadius: 1.1 },
    },
    {
      id: "prospection_runique",
      name: "Prospection runique",
      description: "+12% production passive supplémentaire",
      synergy: "économie",
      cost: 760,
      requires: ["logistique_quantique"],
      effect: { economy: 1.12 },
    },
    {
      id: "flux_conducteur",
      name: "Flux conducteur",
      description: "-10% délai de tir et +15% vitesse des projectiles",
      synergy: "cadence",
      cost: 720,
      requires: ["anneau_fulgurant"],
      effect: { fireDelayMult: 0.9, bulletSpeed: 1.15 },
    },
    {
      id: "cortex_adamant",
      name: "Cortex adamant",
      description: "Bouclier +8% et +18% portée de collecte",
      synergy: "défense",
      cost: 820,
      requires: ["polarite_stable", "logistique_quantique"],
      effect: { damageReduction: 0.08, collectRadius: 1.18 },
    },
    {
      id: "catapulte_d_energie",
      name: "Catapulte d'énergie",
      description: "+24% dégâts, +1 projectile, +6% critique",
      synergy: "dégâts",
      cost: 1100,
      requires: ["flux_conducteur", "cascade_critique"],
      effect: { damageMult: 1.24, projectiles: 1, critChance: 0.06 },
    },
  ];
}

export const TALENT_RESET_COST = 1200;
