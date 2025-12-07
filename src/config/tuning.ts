/**
 * Centralized game tuning configuration
 * Contains all adjustable parameters for fine-tuning gameplay
 */

export interface TuningConfig {
  // Player base stats
  player: {
    damage: number;
    fireDelay: number;
    projectiles: number;
    regen: number;
    range: number;
    bulletSpeed: number;
    damageReduction: number;
    pierce: number;
    collectRadius: number;
    critChance: number;
    critMultiplier: number;
    speed: number;
    orbitProjectiles: number;
    orbitDelay: number;
    initialHp: number;
    radius: number;
  };

  // Orbit visuals & behavior
  orbit: {
    baseDistance: number;
    maxDistance: number;
    ringSpacing: number;
    maxOrbsPerRing: number;
    ringAngleOffset: number;
    spinSpeedBase: number;
    spinSpeedBulletBaseline: number;
    projectileScaling: number;
    maxOrbitProjectiles: number;
  };

  // Graphics sizes
  graphics: {
    enemyRadiusWeak: number;
    enemyRadiusNormal: number;
    enemyRadiusStrong: number;
    enemyRadiusElite: number;
    bossRadius: number;
    bulletRadius: number;
    fragmentOrbRadius: number;
  };

  // Combat parameters
  combat: {
    contactDamageBase: number;
    contactDamageWaveScale: number;
    bossContactDamageBase: number;
    bossProjectileSpeed: number;
    bossProjectileDamage: number;
  };

  // Spawn parameters
  spawn: {
    baseSpawnRate: number;
    spawnRateWaveScale: number;
    maxSpawnRate: number;
    maxPackSize: number;
    baseEliteChance: number;
    eliteChanceWaveScale: number;
    maxEliteChance: number;
    eliteHpMultiplier: number;
    eliteSpeedMultiplier: number;
    eliteRewardMultiplier: number;
  };

  // Enemy parameters
  enemy: {
    baseHp: number;
    hpWaveScale: number;
    hpVariance: number;
    baseSpeed: number;
    speedWaveScale: number;
    baseReward: number;
    rewardWaveScale: number;
    baseFireDelay: number;
    fireDelayWaveScale: number;
    minFireDelay: number;
    eliteFireDelay: number;
  };

  // Boss parameters
  boss: {
    waveInterval: number;
    hpMultiplier: number;
    speed: number;
    fireDelay: number;
    rewardMultiplier: number;
  };

  // Wave progression
  wave: {
    progressionSpeed: number;
  };

  // FX budget
  fx: {
    maxFloatingText: number;
    maxBullets: number;
    maxFragments: number;
  };

  // Bullet limits
  bullet: {
    maxSpeed: number;
    maxLifetime: number;
    offscreenPadding: number;
  };

  // Fragment collection
  fragments: {
    attractionSpeed: number;
    collectDistanceMultiplier: number;
    orbitLifetime: number;
  };

  // Physics
  physics: {
    playerAcceleration: number;
    playerFriction: number;
    maxSpeedMultiplier: number;
    momentumPreservation: number;
    enemyAcceleration: number;
    enemyMaxSpeedRatio: number;
    fragmentGravity: number;
    fragmentDrag: number;
    fragmentBounce: number;
  };
}

// Storage key for tuning config
export const TUNING_STORAGE_KEY = "neo-survivors-tuning";

/**
 * Default tuning configuration
 * All base values extracted from the game systems
 */
export function getDefaultTuning(): TuningConfig {
  return {
    player: {
      damage: 12,
      fireDelay: 0.65,
      projectiles: 1,
      regen: 2,
      range: 1,
      bulletSpeed: 260,
      damageReduction: 0,
      pierce: 0,
      collectRadius: 90,
      critChance: 0.08,
      critMultiplier: 2,
      speed: 95,
      orbitProjectiles: 8,
      orbitDelay: 1.2,
      initialHp: 120,
      radius: 24
    },
    graphics: {
      enemyRadiusWeak: 6,
      enemyRadiusNormal: 12,
      enemyRadiusStrong: 18,
      enemyRadiusElite: 24,
      bossRadius: 48,
      bulletRadius: 4,
      fragmentOrbRadius: 6
    },
    orbit: {
      baseDistance: 35,
      maxDistance: 120,
      ringSpacing: 16,
      maxOrbsPerRing: 6,
      ringAngleOffset: 0.35,
      spinSpeedBase: 1.2,
      spinSpeedBulletBaseline: 260,
      projectileScaling: 1.5,
      maxOrbitProjectiles: 48
    },
    combat: {
      contactDamageBase: 18,
      contactDamageWaveScale: 0.05,
      bossContactDamageBase: 25,
      bossProjectileSpeed: 180,
      bossProjectileDamage: 15
    },
    spawn: {
      baseSpawnRate: 1.4,
      spawnRateWaveScale: 0.08,
      maxSpawnRate: 8,
      maxPackSize: 5,
      baseEliteChance: 0.10,
      eliteChanceWaveScale: 0.0015,
      maxEliteChance: 0.55,
      eliteHpMultiplier: 2.5,
      eliteSpeedMultiplier: 0.85,
      eliteRewardMultiplier: 2.5
    },
    enemy: {
      baseHp: 25,
      hpWaveScale: 6,
      hpVariance: 0.3,
      baseSpeed: 45,
      speedWaveScale: 1.5,
      baseReward: 2.5,
      rewardWaveScale: 0.6,
      baseFireDelay: 4.2,
      fireDelayWaveScale: 0.05,
      minFireDelay: 1.4,
      eliteFireDelay: 3.2
    },
    boss: {
      waveInterval: 5,
      hpMultiplier: 15,
      speed: 30,
      fireDelay: 1.2,
      rewardMultiplier: 10
    },
    wave: {
      progressionSpeed: 0.15
    },
    fx: {
      maxFloatingText: 80,
      maxBullets: 520,
      maxFragments: 200
    },
    bullet: {
      maxSpeed: 520,
      maxLifetime: 2.4,
      offscreenPadding: 120
    },
    fragments: {
      attractionSpeed: 120,
      collectDistanceMultiplier: 0.15,
      orbitLifetime: 12
    },
    physics: {
      playerAcceleration: 8.0,
      playerFriction: 4.5,
      maxSpeedMultiplier: 1.2,
      momentumPreservation: 0.35,
      enemyAcceleration: 6.0,
      enemyMaxSpeedRatio: 1.15,
      fragmentGravity: 80,
      fragmentDrag: 0.85,
      fragmentBounce: 0.4
    }
  };
}

// Global tuning instance
let currentTuning: TuningConfig = getDefaultTuning();

/**
 * Get current tuning configuration
 */
export function getTuning(): TuningConfig {
  return currentTuning;
}

/**
 * Update tuning configuration
 */
export function setTuning(tuning: Partial<TuningConfig>): void {
  currentTuning = deepMerge(currentTuning, tuning);
}

/**
 * Reset tuning to defaults
 */
export function resetTuning(): void {
  currentTuning = getDefaultTuning();
}

/**
 * Load tuning from localStorage
 */
export function loadTuning(): void {
  try {
    const saved = localStorage.getItem(TUNING_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      currentTuning = deepMerge(getDefaultTuning(), parsed);
    }
  } catch (err) {
    console.warn("Failed to load tuning config:", err);
  }
}

/**
 * Save tuning to localStorage
 */
export function saveTuning(): void {
  try {
    localStorage.setItem(TUNING_STORAGE_KEY, JSON.stringify(currentTuning));
  } catch (err) {
    console.warn("Failed to save tuning config:", err);
  }
}

/**
 * Export tuning as JSON string
 */
export function exportTuning(): string {
  return JSON.stringify(currentTuning, null, 2);
}

/**
 * Import tuning from JSON string
 */
export function importTuning(json: string): boolean {
  try {
    const parsed = JSON.parse(json);
    currentTuning = deepMerge(getDefaultTuning(), parsed);
    saveTuning();
    return true;
  } catch (err) {
    console.warn("Failed to import tuning config:", err);
    return false;
  }
}

/**
 * Deep merge two objects
 */
function deepMerge<T extends object>(target: T, source: Partial<T>): T {
  const result = { ...target };
  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key];
      const targetValue = target[key];
      if (
        sourceValue !== null &&
        typeof sourceValue === "object" &&
        !Array.isArray(sourceValue) &&
        targetValue !== null &&
        typeof targetValue === "object" &&
        !Array.isArray(targetValue)
      ) {
        (result as Record<string, unknown>)[key] = deepMerge(
          targetValue as object,
          sourceValue as Partial<typeof targetValue>
        );
      } else if (sourceValue !== undefined) {
        (result as Record<string, unknown>)[key] = sourceValue;
      }
    }
  }
  return result;
}

/**
 * Parameter metadata for UI rendering
 */
export interface TuningParamMeta {
  label: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
  description?: string;
}

type TuningMetaMap = {
  [K in keyof TuningConfig]: {
    label: string;
    params: {
      [P in keyof TuningConfig[K]]: TuningParamMeta;
    };
  };
};

/**
 * Metadata for all tuning parameters
 * Used to render the tuning panel UI
 */
export const tuningMeta: TuningMetaMap = {
  player: {
    label: "Joueur",
    params: {
      damage: { label: "Dégâts de base", min: 1, max: 100, step: 1 },
      fireDelay: { label: "Délai de tir", min: 0.1, max: 2, step: 0.05, unit: "s" },
      projectiles: { label: "Projectiles", min: 1, max: 20, step: 1 },
      regen: { label: "Régénération", min: 0, max: 50, step: 1, unit: "PV/s" },
      range: { label: "Portée", min: 0.5, max: 3, step: 0.1 },
      bulletSpeed: { label: "Vitesse des projectiles", min: 50, max: 800, step: 10 },
      damageReduction: { label: "Réduction de dégâts", min: 0, max: 0.9, step: 0.05, unit: "%" },
      pierce: { label: "Perçage", min: 0, max: 10, step: 1 },
      collectRadius: { label: "Rayon de collecte", min: 20, max: 300, step: 10 },
      critChance: { label: "Chance de critique", min: 0, max: 1, step: 0.01, unit: "%" },
      critMultiplier: { label: "Multiplicateur critique", min: 1, max: 10, step: 0.1 },
      speed: { label: "Vitesse de déplacement", min: 20, max: 300, step: 5 },
      orbitProjectiles: { label: "Projectiles orbitaux", min: 0, max: 16, step: 1 },
      orbitDelay: { label: "Délai orbital", min: 0.2, max: 3, step: 0.1, unit: "s" },
      initialHp: { label: "PV initiaux", min: 10, max: 500, step: 10 },
      radius: { label: "Rayon du joueur", min: 10, max: 60, step: 2 }
    }
  },
  graphics: {
    label: "Graphismes",
    params: {
      enemyRadiusWeak: { label: "Rayon ennemi faible", min: 2, max: 20, step: 1 },
      enemyRadiusNormal: { label: "Rayon ennemi normal", min: 4, max: 30, step: 1 },
      enemyRadiusStrong: { label: "Rayon ennemi fort", min: 8, max: 40, step: 1 },
      enemyRadiusElite: { label: "Rayon ennemi élite", min: 10, max: 50, step: 1 },
      bossRadius: { label: "Rayon du boss", min: 20, max: 100, step: 2 },
      bulletRadius: { label: "Rayon des projectiles", min: 1, max: 15, step: 1 },
      fragmentOrbRadius: { label: "Rayon des fragments", min: 2, max: 20, step: 1 }
    }
  },
  orbit: {
    label: "Orbite",
    params: {
      baseDistance: { label: "Distance de base", min: 10, max: 80, step: 1 },
      maxDistance: { label: "Distance maximale", min: 40, max: 200, step: 5 },
      ringSpacing: { label: "Espacement des anneaux", min: 4, max: 40, step: 1 },
      maxOrbsPerRing: { label: "Orbes par anneau", min: 1, max: 12, step: 1 },
      ringAngleOffset: { label: "Décalage angulaire", min: 0, max: 1.5, step: 0.05, unit: "rad" },
      spinSpeedBase: { label: "Vitesse de rotation", min: 0.2, max: 4, step: 0.1 },
      spinSpeedBulletBaseline: { label: "Référence vitesse tir", min: 50, max: 400, step: 10 },
      projectileScaling: { label: "Scaling projectiles orbitaux", min: 0, max: 4, step: 0.1 },
      maxOrbitProjectiles: { label: "Projectiles orbitaux max", min: 1, max: 64, step: 1 }
    }
  },
  combat: {
    label: "Combat",
    params: {
      contactDamageBase: { label: "Dégâts de contact (base)", min: 1, max: 100, step: 1 },
      contactDamageWaveScale: { label: "Échelle vague (contact)", min: 0, max: 0.5, step: 0.01 },
      bossContactDamageBase: { label: "Dégâts contact boss", min: 1, max: 150, step: 1 },
      bossProjectileSpeed: { label: "Vitesse projectile boss", min: 50, max: 500, step: 10 },
      bossProjectileDamage: { label: "Dégâts projectile boss", min: 1, max: 100, step: 1 }
    }
  },
  spawn: {
    label: "Apparition",
    params: {
      baseSpawnRate: { label: "Taux d'apparition (base)", min: 0.1, max: 5, step: 0.1, unit: "/s" },
      spawnRateWaveScale: { label: "Échelle vague (spawn)", min: 0, max: 0.5, step: 0.01 },
      maxSpawnRate: { label: "Taux max", min: 1, max: 20, step: 0.5, unit: "/s" },
      maxPackSize: { label: "Taille max du groupe", min: 1, max: 15, step: 1 },
      baseEliteChance: { label: "Chance élite (base)", min: 0, max: 0.5, step: 0.01, unit: "%" },
      eliteChanceWaveScale: { label: "Échelle vague (élite)", min: 0, max: 0.01, step: 0.0005 },
      maxEliteChance: { label: "Chance élite max", min: 0.1, max: 1, step: 0.05, unit: "%" },
      eliteHpMultiplier: { label: "Multiplicateur PV élite", min: 1, max: 10, step: 0.5 },
      eliteSpeedMultiplier: { label: "Multiplicateur vitesse élite", min: 0.5, max: 2, step: 0.05 },
      eliteRewardMultiplier: { label: "Multiplicateur récomp. élite", min: 1, max: 10, step: 0.5 }
    }
  },
  enemy: {
    label: "Ennemis",
    params: {
      baseHp: { label: "PV de base", min: 5, max: 200, step: 5 },
      hpWaveScale: { label: "PV par vague", min: 0, max: 30, step: 1 },
      hpVariance: { label: "Variance PV", min: 0, max: 0.5, step: 0.05, unit: "%" },
      baseSpeed: { label: "Vitesse de base", min: 10, max: 150, step: 5 },
      speedWaveScale: { label: "Vitesse par vague", min: 0, max: 5, step: 0.1 },
      baseReward: { label: "Récompense de base", min: 0.5, max: 20, step: 0.5 },
      rewardWaveScale: { label: "Récompense par vague", min: 0, max: 3, step: 0.1 },
      baseFireDelay: { label: "Délai de tir (base)", min: 0.5, max: 10, step: 0.1, unit: "s" },
      fireDelayWaveScale: { label: "Réduction tir/vague", min: 0, max: 0.2, step: 0.005 },
      minFireDelay: { label: "Délai de tir min", min: 0.5, max: 5, step: 0.1, unit: "s" },
      eliteFireDelay: { label: "Délai tir élite", min: 0.5, max: 8, step: 0.1, unit: "s" }
    }
  },
  boss: {
    label: "Boss",
    params: {
      waveInterval: { label: "Intervalle d'apparition", min: 1, max: 20, step: 1, unit: "vagues" },
      hpMultiplier: { label: "Multiplicateur PV", min: 5, max: 50, step: 1 },
      speed: { label: "Vitesse", min: 10, max: 100, step: 5 },
      fireDelay: { label: "Délai de tir", min: 0.2, max: 5, step: 0.1, unit: "s" },
      rewardMultiplier: { label: "Multiplicateur récompense", min: 1, max: 50, step: 1 }
    }
  },
  wave: {
    label: "Progression",
    params: {
      progressionSpeed: { label: "Vitesse de progression", min: 0.01, max: 0.5, step: 0.01, unit: "/s" }
    }
  },
  fx: {
    label: "Effets visuels",
    params: {
      maxFloatingText: { label: "Texte flottant max", min: 10, max: 200, step: 10 },
      maxBullets: { label: "Projectiles max", min: 50, max: 1000, step: 50 },
      maxFragments: { label: "Fragments max", min: 20, max: 500, step: 20 }
    }
  },
  bullet: {
    label: "Projectiles",
    params: {
      maxSpeed: { label: "Vitesse max", min: 100, max: 1000, step: 20 },
      maxLifetime: { label: "Durée de vie max", min: 0.5, max: 5, step: 0.1, unit: "s" },
      offscreenPadding: { label: "Marge hors-écran", min: 20, max: 300, step: 20 }
    }
  },
  fragments: {
    label: "Fragments",
    params: {
      attractionSpeed: { label: "Vitesse d'attraction", min: 30, max: 300, step: 10 },
      collectDistanceMultiplier: { label: "Multiplicateur de collecte", min: 0.05, max: 0.5, step: 0.05 },
      orbitLifetime: { label: "Durée de vie orbite", min: 3, max: 30, step: 1, unit: "s" }
    }
  },
  physics: {
    label: "Physique",
    params: {
      playerAcceleration: { label: "Accélération joueur", min: 1, max: 20, step: 0.5 },
      playerFriction: { label: "Friction joueur", min: 1, max: 10, step: 0.5 },
      maxSpeedMultiplier: { label: "Multiplicateur vitesse max", min: 1, max: 2, step: 0.1 },
      momentumPreservation: { label: "Conservation du momentum", min: 0, max: 0.8, step: 0.05, description: "Préserve la vitesse en mouvement" },
      enemyAcceleration: { label: "Accélération ennemis", min: 1, max: 20, step: 0.5 },
      enemyMaxSpeedRatio: { label: "Ratio vitesse max ennemis", min: 1, max: 1.5, step: 0.05 },
      fragmentGravity: { label: "Gravité fragments", min: 0, max: 200, step: 10, description: "Force vers le bas sur les fragments" },
      fragmentDrag: { label: "Traînée fragments", min: 0.5, max: 1, step: 0.05, description: "Résistance de l'air" },
      fragmentBounce: { label: "Rebond fragments", min: 0, max: 0.9, step: 0.05, description: "Élasticité des rebonds" }
    }
  }
};
