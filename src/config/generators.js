export function createGenerators() {
  return [
    { id: "drone", name: "Drones collecteurs", baseRate: 0.2, rate: 0.2, level: 0, cost: 15 },
    { id: "forge", name: "Forge astrale", baseRate: 0.8, rate: 0.8, level: 0, cost: 60 },
    { id: "spires", name: "Spires quantiques", baseRate: 3, rate: 3, level: 0, cost: 250 },
    { id: "nexus", name: "Nexus dimensionnel", baseRate: 12, rate: 12, level: 0, cost: 1200 }
  ];
}
