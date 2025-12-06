import type {
  Bullet,
  Enemy,
  FragmentOrb,
  FloatingText,
  GainTicker,
  Player,
  BossEnemy,
  EnemyProjectile,
  OrbitalOrb,
  LightningBolt,
  LaserBeam,
  HomingMissile,
} from './entities';
import type { WeaponState } from '../config/weapons';

export interface RunStats {
  kills: number;
  fragments: number;
  essence: number;
}

export interface Resources {
  essence: number;
  fragments: number;
  idleMultiplier: number;
}

export interface TalentBonuses {
  damage: number;
  fireDelay: number;
  economy: number;
  collectRadius: number;
  projectiles: number;
  regen: number;
  damageReduction: number;
  critChance: number;
  critMultiplier: number;
  bulletSpeed: number;
}

export interface Assist {
  firstShot: boolean;
  firstPurchase: boolean;
  firstPrestige: boolean;
  bestWave: number;
  completed: string[];
}

export interface Addons {
  glow: boolean;
  bloom: boolean;
  grain: boolean;
}

export interface AudioState {
  enabled: boolean;
}

export interface PerformanceState {
  fps: number;
  history: number[];
  maxSamples: number;
  graphVisible: boolean;
}

export interface GameState {
  running: boolean;
  wave: number;
  time: number;
  enemies: Enemy[];
  bullets: Bullet[];
  floatingText: FloatingText[];
  fragmentsOrbs: FragmentOrb[];
  gainTicker: GainTicker;
  runStats: RunStats;
  player: Player;
  resources: Resources;
  talents: {
    bonuses: TalentBonuses;
  };
  assist: Assist;
  spawnTimer: number;
  overlayFade: number;
  prestigeCooldown: number;
  dead: boolean;
  visualsLow: boolean;
  audio: AudioState;
  performance: PerformanceState;
  addons: Addons;
  bossActive: boolean;
  currentBoss: BossEnemy | null;
  enemyProjectiles: EnemyProjectile[];
  lastBossWave: number;
  orbitalOrbs: OrbitalOrb[];
  // Weapons system
  weapons: WeaponState[];
  lightningBolts: LightningBolt[];
  laserBeams: LaserBeam[];
  missiles: HomingMissile[];
  lightningTimer: number;
  laserTimer: number;
  missileTimer: number;
}
