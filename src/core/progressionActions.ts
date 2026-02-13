import { unlockTalent } from "../systems/talents.ts";
import {
  renderGenerators as renderGeneratorsUI,
  renderUpgrades as renderUpgradesUI,
  renderTalents as renderTalentsUI
} from "../systems/ui.ts";
import type { GameState, Generator, Talent, Upgrade } from "../types/index.ts";

interface UiRefs {
  generatorButtons: Map<string, HTMLButtonElement>;
  upgradeButtons: Map<string, HTMLButtonElement>;
  talentButtons: Map<string, HTMLButtonElement>;
}

interface CreateProgressionActionsOptions {
  state: GameState;
  generators: Generator[];
  upgrades: Upgrade[];
  getTalents: () => Talent[];
  uiRefs: UiRefs;
  generatorsContainer: HTMLElement;
  upgradesContainer: HTMLElement;
  talentsContainer: HTMLElement | null;
  talentStatusEl: HTMLElement | null;
  resetTalentsBtn: HTMLButtonElement | null;
  computeGeneratorRate: (generator: Generator) => number;
  applyProgressionEffects: () => void;
  refreshGeneratorRates: () => void;
  softReset: () => void;
  saveGame: () => void;
  onPurchase: () => void;
  onPrestige: () => void;
}

export interface ProgressionActions {
  buyGenerator: (generator: Generator) => void;
  buyUpgrade: (upgrade: Upgrade) => void;
  buyTalent: (talent: Talent) => boolean;
  renderGenerators: () => void;
  renderUpgrades: () => void;
  renderTalents: () => void;
  prestige: () => void;
}

export function isUpgradeCapped(upgrade: Upgrade): boolean {
  return Number.isFinite(upgrade.max) && upgrade.level >= upgrade.max;
}

export function computeNextUpgradeCost(upgrade: Upgrade): number {
  const baseGrowth = Math.max(1.05, upgrade.growth ?? 1.4);
  const ramp = 1 + Math.max(0, upgrade.level - 25) * 0.012;
  const scaling = baseGrowth * ramp;
  return Math.ceil(upgrade.baseCost * Math.pow(scaling, upgrade.level + 1));
}

export function createProgressionActions(options: CreateProgressionActionsOptions): ProgressionActions {
  const {
    state,
    generators,
    upgrades,
    getTalents,
    uiRefs,
    generatorsContainer,
    upgradesContainer,
    talentsContainer,
    talentStatusEl,
    resetTalentsBtn,
    computeGeneratorRate,
    applyProgressionEffects,
    refreshGeneratorRates,
    softReset,
    saveGame,
    onPurchase,
    onPrestige
  } = options;

  const buyGenerator = (generator: Generator): void => {
    if (state.resources.essence < generator.cost) return;
    state.resources.essence -= generator.cost;
    generator.level += 1;
    generator.cost = Math.ceil(generator.cost * 1.30 + generator.level * 1.5);
    generator.rate = computeGeneratorRate(generator);
    refreshGeneratorRates();
    onPurchase();
  };

  const buyUpgrade = (upgrade: Upgrade): void => {
    if (isUpgradeCapped(upgrade)) return;
    if (state.resources.fragments < upgrade.cost) return;
    state.resources.fragments -= upgrade.cost;
    upgrade.level += 1;
    upgrade.cost = computeNextUpgradeCost(upgrade);
    applyProgressionEffects();
    onPurchase();
  };

  const buyTalent = (talent: Talent): boolean => {
    const talents = getTalents();
    if (!unlockTalent(talent, talents, state)) return false;
    applyProgressionEffects();
    refreshGeneratorRates();
    onPurchase();
    return true;
  };

  const renderGenerators = (): void => {
    renderGeneratorsUI(
      generatorsContainer,
      generators,
      uiRefs,
      state.resources,
      computeGeneratorRate,
      buyGenerator,
      saveGame
    );
  };

  const renderUpgrades = (): void => {
    renderUpgradesUI(
      upgradesContainer,
      upgrades,
      uiRefs,
      state.resources,
      buyUpgrade,
      saveGame
    );
  };

  const renderTalents = (): void => {
    renderTalentsUI(
      talentsContainer,
      getTalents(),
      uiRefs,
      state.resources,
      buyTalent,
      saveGame,
      renderUpgrades,
      talentStatusEl,
      resetTalentsBtn
    );
  };

  const prestige = (): void => {
    const bonus = 1 + Math.pow(state.wave, 0.45) * 0.20;
    state.resources.idleMultiplier *= bonus;
    refreshGeneratorRates();
    softReset();
    onPrestige();
    saveGame();
    renderGenerators();
  };

  return {
    buyGenerator,
    buyUpgrade,
    buyTalent,
    renderGenerators,
    renderUpgrades,
    renderTalents,
    prestige
  };
}
