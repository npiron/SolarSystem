/**
 * Weapons System Configuration
 * Defines all 6 weapons with their stats and upgrade paths
 */

export type WeaponId = 'mainGun' | 'orbitalShield' | 'circularBlast' | 'lightning' | 'laser' | 'missiles';

export interface WeaponStats {
    damage: number;
    fireDelay: number;
    range: number;
    projectiles?: number;
    chainCount?: number;
    duration?: number;
}

export interface WeaponDefinition {
    id: WeaponId;
    name: string;
    description: string;
    icon: string;
    unlockCost: number;
    upgradeCostBase: number;
    upgradeCostGrowth: number;
    maxLevel: number;
    baseStats: WeaponStats;
    // Level multipliers: how much stats improve per level
    levelMultipliers: {
        damage: number;
        fireDelay: number;
        range?: number;
        projectiles?: number;
    };
}

export interface WeaponState {
    id: WeaponId;
    level: number;
    unlocked: boolean;
}

/**
 * Calculate weapon stats at a given level
 */
export function getWeaponStats(def: WeaponDefinition, level: number): WeaponStats {
    const effectiveLevel = Math.max(0, level - 1);
    return {
        damage: def.baseStats.damage * Math.pow(def.levelMultipliers.damage, effectiveLevel),
        fireDelay: def.baseStats.fireDelay * Math.pow(def.levelMultipliers.fireDelay, effectiveLevel),
        range: def.baseStats.range * Math.pow(def.levelMultipliers.range ?? 1, effectiveLevel),
        projectiles: def.baseStats.projectiles
            ? Math.floor(def.baseStats.projectiles + effectiveLevel * (def.levelMultipliers.projectiles ?? 0))
            : undefined,
        chainCount: def.baseStats.chainCount,
        duration: def.baseStats.duration,
    };
}

/**
 * Calculate upgrade cost for a weapon at a given level
 */
export function getUpgradeCost(def: WeaponDefinition, currentLevel: number): number {
    if (currentLevel >= def.maxLevel) return Infinity;
    return Math.floor(def.upgradeCostBase * Math.pow(def.upgradeCostGrowth, currentLevel));
}

/**
 * All weapon definitions
 */
export const WEAPONS: Record<WeaponId, WeaponDefinition> = {
    mainGun: {
        id: 'mainGun',
        name: 'Main Gun',
        description: 'Tir shotgun vers l\'ennemi le plus proche',
        icon: '🔫',
        unlockCost: 0, // Starts unlocked
        upgradeCostBase: 50,
        upgradeCostGrowth: 1.5,
        maxLevel: 10,
        baseStats: {
            damage: 12,
            fireDelay: 0.65,
            range: 1,
            projectiles: 1,
        },
        levelMultipliers: {
            damage: 1.15,
            fireDelay: 0.95,
            projectiles: 0.3, // +0.3 projectiles per level (rounded)
        },
    },

    orbitalShield: {
        id: 'orbitalShield',
        name: 'Orbital Shield',
        description: 'Orbes qui tournent et infligent dégâts au contact',
        icon: '🔮',
        unlockCost: 0, // Starts unlocked
        upgradeCostBase: 80,
        upgradeCostGrowth: 1.55,
        maxLevel: 10,
        baseStats: {
            damage: 8,
            fireDelay: 0, // Continuous
            range: 50,
            projectiles: 4,
        },
        levelMultipliers: {
            damage: 1.18,
            fireDelay: 1,
            range: 1.05,
            projectiles: 0.4,
        },
    },

    circularBlast: {
        id: 'circularBlast',
        name: 'Circular Blast',
        description: 'Tir à 360° autour du joueur',
        icon: '💫',
        unlockCost: 0, // Starts unlocked
        upgradeCostBase: 60,
        upgradeCostGrowth: 1.5,
        maxLevel: 10,
        baseStats: {
            damage: 10,
            fireDelay: 1.2,
            range: 1.5,
            projectiles: 8,
        },
        levelMultipliers: {
            damage: 1.12,
            fireDelay: 0.93,
            projectiles: 0.5,
        },
    },

    lightning: {
        id: 'lightning',
        name: 'Lightning',
        description: 'Frappe aléatoire avec chaînes vers ennemis proches',
        icon: '⚡',
        unlockCost: 200,
        upgradeCostBase: 100,
        upgradeCostGrowth: 1.6,
        maxLevel: 10,
        baseStats: {
            damage: 25,
            fireDelay: 2.5,
            range: 200,
            chainCount: 2,
        },
        levelMultipliers: {
            damage: 1.2,
            fireDelay: 0.92,
            range: 1.08,
        },
    },

    laser: {
        id: 'laser',
        name: 'Laser Beam',
        description: 'Rayon continu vers l\'ennemi le plus proche',
        icon: '🔴',
        unlockCost: 350,
        upgradeCostBase: 120,
        upgradeCostGrowth: 1.6,
        maxLevel: 10,
        baseStats: {
            damage: 15, // DPS
            fireDelay: 0, // Continuous
            range: 250,
            duration: 0.8,
        },
        levelMultipliers: {
            damage: 1.18,
            fireDelay: 1,
            range: 1.06,
        },
    },

    missiles: {
        id: 'missiles',
        name: 'Homing Missiles',
        description: 'Missiles guidés qui suivent les ennemis',
        icon: '🚀',
        unlockCost: 500,
        upgradeCostBase: 150,
        upgradeCostGrowth: 1.65,
        maxLevel: 10,
        baseStats: {
            damage: 35,
            fireDelay: 3.0,
            range: 300,
            projectiles: 1,
        },
        levelMultipliers: {
            damage: 1.22,
            fireDelay: 0.9,
            projectiles: 0.2,
        },
    },
};

/**
 * Create initial weapon states
 */
export function createInitialWeaponStates(): WeaponState[] {
    return Object.values(WEAPONS).map((def) => ({
        id: def.id,
        level: def.unlockCost === 0 ? 1 : 0,
        unlocked: def.unlockCost === 0,
    }));
}

/**
 * Get weapon definition by ID
 */
export function getWeaponDef(id: WeaponId): WeaponDefinition {
    return WEAPONS[id];
}
