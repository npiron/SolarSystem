import type { EnemyVariant } from "../types/index.ts";

interface ExplosionConfig {
  radius: number;
  damage: number;
}

interface SplitConfig {
  count: number;
  maxGenerations: number;
  hpScale: number;
  speedScale: number;
  rewardScale: number;
  radiusScale: number;
  spread: number;
}

interface ProjectileConfig {
  speed: number;
  damage: number;
  life: number;
}

export interface EnemyVariantDefinition {
  variant: EnemyVariant;
  weight: number;
  minWave: number;
  weightGrowth?: number;
  hpMultiplier: number;
  speedMultiplier: number;
  rewardMultiplier: number;
  fireDelayMultiplier?: number;
  explosion?: ExplosionConfig;
  split?: SplitConfig;
  projectile?: ProjectileConfig;
}

const BASE_VARIANT: EnemyVariantDefinition = {
  variant: "chaser",
  weight: 1,
  minWave: 1,
  hpMultiplier: 1,
  speedMultiplier: 1,
  rewardMultiplier: 1
};

const VARIANT_TABLE: EnemyVariantDefinition[] = [
  BASE_VARIANT,
  {
    variant: "volatile",
    weight: 0.22,
    weightGrowth: 0.01,
    minWave: 2,
    hpMultiplier: 0.9,
    speedMultiplier: 1.08,
    rewardMultiplier: 1.1,
    explosion: {
      radius: 70,
      damage: 24
    }
  },
  {
    variant: "splitter",
    weight: 0.18,
    weightGrowth: 0.012,
    minWave: 3,
    hpMultiplier: 0.85,
    speedMultiplier: 0.95,
    rewardMultiplier: 1,
    split: {
      count: 2,
      maxGenerations: 2,
      hpScale: 0.6,
      speedScale: 1.08,
      rewardScale: 0.45,
      radiusScale: 0.75,
      spread: 18
    }
  },
  {
    variant: "artillery",
    weight: 0.16,
    weightGrowth: 0.009,
    minWave: 4,
    hpMultiplier: 1,
    speedMultiplier: 0.82,
    rewardMultiplier: 1.25,
    fireDelayMultiplier: 0.85,
    projectile: {
      speed: 190,
      damage: 10,
      life: 3.4
    }
  }
];

export function getVariantDefinition(variant: EnemyVariant): EnemyVariantDefinition {
  return VARIANT_TABLE.find((entry) => entry.variant === variant) ?? BASE_VARIANT;
}

export function chooseEnemyVariant(wave: number): EnemyVariantDefinition {
  const eligible = VARIANT_TABLE.filter((entry) => wave >= entry.minWave);
  const weights = eligible.map((entry) => {
    const growth = entry.weightGrowth ?? 0;
    return Math.max(0, entry.weight + Math.max(0, wave - entry.minWave) * growth);
  });
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  if (totalWeight <= 0) return BASE_VARIANT;

  let roll = Math.random() * totalWeight;
  for (let i = 0; i < eligible.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return eligible[i];
  }
  return eligible[0];
}
