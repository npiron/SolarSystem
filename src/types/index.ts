/**
 * Type definitions for game state and configuration
 */

export * from './entities';
export * from './state';
export * from './documentation';

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
  apply: (state: { player: import('./entities').PlayerStats }) => void;
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
    resources: import('./state').Resources
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
  uiMargins?: {
    left: number;
    right: number;
    top: number;
    bottom: number;
  };
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
