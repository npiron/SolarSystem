import type { Generator } from "../types/index.ts";

export function createGenerators(): Generator[] {
  return [
    { id: "drone", name: "Drones collecteurs", baseRate: 0.25, rate: 0.25, level: 0, cost: 12 },
    { id: "forge", name: "Forge astrale", baseRate: 1, rate: 1, level: 0, cost: 50 },
    { id: "spires", name: "Spires quantiques", baseRate: 4, rate: 4, level: 0, cost: 220 },
    { id: "nexus", name: "Nexus dimensionnel", baseRate: 16, rate: 16, level: 0, cost: 1000 }
  ];
}
