/**
 * Type definitions for game state and configuration
 */

export interface PlayerStats {
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
}

export interface Player extends PlayerStats {
  x: number;
  y: number;
  radius: number;
  hp: number;
  maxHp: number;
  fireTimer: number;
  spin: number;
}

export interface Bullet {
  x: number;
  y: number;
  dx: number;
  dy: number;
  life: number;
  pierce: number;
}

export interface Enemy {
  x: number;
  y: number;
  radius: number;
  hp: number;
  maxHp: number;
  speed: number;
  reward: number;
  fireTimer: number;
  fireDelay: number;
  elite: boolean;
  hitThisFrame?: boolean;
}

export interface FragmentOrb {
  x: number;
  y: number;
  value: number;
  vx: number;
  vy: number;
  life: number;
}

export interface FloatingText {
  text: string;
  x: number;
  y: number;
  life: number;
  color: string;
}

export interface GainTicker {
  fragments: number;
  essence: number;
  timer: number;
}

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
  hudPulse: boolean;
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
}

export interface Generator {
  id: string;
  name: string;
  baseRate: number;
  rate: number;
  level: number;
  cost: number;
}

export interface Upgrade {
  id: string;
  name: string;
  description: string;
  cost: number;
  baseCost: number;
  level: number;
  max: number;
  apply: (state: { player: PlayerStats }) => void;
}

export interface TalentEffect {
  damageMult?: number;
  fireDelayMult?: number;
  economy?: number;
  collectRadius?: number;
  projectiles?: number;
  regen?: number;
  damageReduction?: number;
  critChance?: number;
  critMultiplier?: number;
  bulletSpeed?: number;
}

export interface Talent {
  id: string;
  name: string;
  description: string;
  synergy: string;
  cost: number;
  requires: string[];
  effect?: TalentEffect;
  unlocked?: boolean;
}

export interface SavedTalent {
  id: string;
  unlocked: boolean;
}

export interface HudElements {
  essenceEl: HTMLElement | null;
  fragmentsEl: HTMLElement | null;
  idleRateEl: HTMLElement | null;
  waveEl: HTMLElement | null;
  hpEl: HTMLElement | null;
  dpsEl: HTMLElement | null;
  damageRow: HTMLElement | null;
  spawnRateEl: HTMLElement | null;
  pauseBtn: HTMLElement | null;
  softPrestigeBtn: HTMLElement | null;
  statusEl: HTMLElement | null;
}

export interface HudContext {
  elements: HudElements;
  uiRefs: {
    generatorButtons: Map<string, HTMLButtonElement>;
    upgradeButtons: Map<string, HTMLButtonElement>;
    talentButtons: Map<string, HTMLButtonElement>;
  };
  generators: Generator[];
  upgrades: Upgrade[];
  talents: Talent[];
  computeIdleRate: () => number;
  canUnlockTalent: (
    talent: Talent,
    talents: Talent[],
    resources: Resources
  ) => boolean;
}

export interface FxBudget {
  floatingText: number;
  bullets: number;
  fragments: number;
}

export interface BulletLimits {
  maxSpeed: number;
  maxLifetime: number;
  offscreenPadding: number;
}

export interface Icons {
  essence: string;
  fragments: string;
  wave: string;
  reach: string;
  speed: string;
  shield: string;
  crit: string;
  magnet: string;
}

export interface Canvas {
  width: number;
  height: number;
}

export interface AssistUi {
  recordShot: () => void;
  recordPurchase: () => void;
  recordPrestige: () => void;
  trackWave: (wave: number) => void;
  refreshMilestones: () => void;
}

export interface AssistAnchors {
  arena?: HTMLElement | null;
  generators?: HTMLElement | null;
  upgrades?: HTMLElement | null;
  prestige?: HTMLElement | null;
}

export interface AssistConfig {
  quickHelpList: HTMLElement | null;
  milestoneList: HTMLElement | null;
  bubbleContainer: HTMLElement | null;
  anchors: AssistAnchors;
  upgrades: Upgrade[];
  generators?: Generator[];
}
