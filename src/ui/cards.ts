/**
 * UI Cards rendering module
 * Handles rendering of generator, upgrade, and talent cards
 */

import type { GameState, Generator, Resources, Talent, Upgrade } from "../types/index.ts";
import { icons } from "../config/constants.ts";
import { formatNumber } from "../systems/hud.ts";
import { canUnlockTalent } from "../systems/talents.ts";
import { TALENT_RESET_COST } from "../config/talents.ts";

/** UI Reference maps for dynamic button updates */
export interface UICardRefs {
  generatorButtons: Map<string, HTMLButtonElement>;
  upgradeButtons: Map<string, HTMLButtonElement>;
  talentButtons: Map<string, HTMLButtonElement>;
}

/**
 * Creates empty UI reference maps
 */
export function createUICardRefs(): UICardRefs {
  return {
    generatorButtons: new Map(),
    upgradeButtons: new Map(),
    talentButtons: new Map(),
  };
}

/** Callbacks for card interactions */
export interface CardCallbacks {
  onGeneratorBuy: (gen: Generator) => void;
  onUpgradeBuy: (upgrade: Upgrade) => void;
  onTalentBuy: (talent: Talent) => boolean;
  onSave: () => void;
}

/**
 * Renders generator cards to a container
 */
export function renderGeneratorCards(
  container: HTMLElement,
  generators: Generator[],
  resources: Resources,
  uiRefs: UICardRefs,
  computeGeneratorRate: (gen: Generator) => number,
  callbacks: Pick<CardCallbacks, "onGeneratorBuy" | "onSave">
): void {
  container.innerHTML = "";
  uiRefs.generatorButtons.clear();

  generators.forEach((gen) => {
    const card = document.createElement("div");
    card.className = "card";

    const info = document.createElement("div");
    gen.rate = computeGeneratorRate(gen);
    const production = gen.rate * gen.level;
    info.innerHTML = `<h3>${gen.name}</h3><p class="muted">Niveau ${gen.level} · Produit ${formatNumber(production)} ${icons.essence}/s</p>`;

    const btn = document.createElement("button");
    btn.textContent = `${icons.essence} Acheter ${formatNumber(gen.cost)}`;
    btn.className = "secondary";
    btn.disabled = resources.essence < gen.cost;
    btn.addEventListener("click", () => {
      callbacks.onGeneratorBuy(gen);
      renderGeneratorCards(container, generators, resources, uiRefs, computeGeneratorRate, callbacks);
      callbacks.onSave();
    });

    card.appendChild(info);
    card.appendChild(btn);
    container.appendChild(card);
    uiRefs.generatorButtons.set(gen.id, btn);
  });
}

/**
 * Renders upgrade cards to a container
 */
export function renderUpgradeCards(
  container: HTMLElement,
  upgrades: Upgrade[],
  resources: Resources,
  uiRefs: UICardRefs,
  callbacks: Pick<CardCallbacks, "onUpgradeBuy" | "onSave">
): void {
  container.innerHTML = "";
  uiRefs.upgradeButtons.clear();

  upgrades.forEach((up) => {
    const card = document.createElement("div");
    card.className = "card";

    const info = document.createElement("div");
    info.innerHTML = `<h3>${up.name}</h3><p>${up.description}</p><p class="muted">Niveau ${up.level}/${up.max}</p>`;

    const btn = document.createElement("button");
    btn.textContent = `${icons.fragments} Acheter ${formatNumber(up.cost)}`;
    btn.className = "primary";
    btn.disabled = up.level >= up.max || resources.fragments < up.cost;
    btn.addEventListener("click", () => {
      callbacks.onUpgradeBuy(up);
      renderUpgradeCards(container, upgrades, resources, uiRefs, callbacks);
      callbacks.onSave();
    });

    card.appendChild(info);
    card.appendChild(btn);
    container.appendChild(card);
    uiRefs.upgradeButtons.set(up.id, btn);
  });
}

/** Options for rendering talent cards */
export interface TalentRenderOptions {
  container: HTMLElement;
  talents: Talent[];
  resources: Resources;
  uiRefs: UICardRefs;
  talentStatusEl: HTMLElement | null;
  resetTalentsBtn: HTMLElement | null;
  callbacks: Pick<CardCallbacks, "onTalentBuy" | "onSave">;
  renderUpgrades: () => void;
}

/**
 * Renders talent node cards to a container
 */
export function renderTalentCards(options: TalentRenderOptions): void {
  const {
    container,
    talents,
    resources,
    uiRefs,
    talentStatusEl,
    resetTalentsBtn,
    callbacks,
    renderUpgrades,
  } = options;

  container.innerHTML = "";
  uiRefs.talentButtons.clear();
  let unlockedCount = 0;

  talents.forEach((talent) => {
    if (talent.unlocked) unlockedCount += 1;

    const card = document.createElement("button");
    card.className = "talent-node";
    if (talent.unlocked) card.classList.add("active");
    card.dataset.synergy = talent.synergy;

    const prereqNames = (talent.requires || [])
      .map((id) => talents.find((t) => t.id === id)?.name)
      .filter(Boolean);
    const canUnlock = canUnlockTalent(talent, talents, resources);

    card.innerHTML = `
      <div class="talent-header">
        <div>
          <p class="eyebrow">${talent.synergy}</p>
          <h3>${talent.name}</h3>
        </div>
        <span class="cost">${icons.fragments} ${formatNumber(talent.cost)}</span>
      </div>
      <p class="muted">${talent.description}</p>
      <p class="prereq">Prérequis : ${prereqNames.length ? prereqNames.join(", ") : "aucun"}</p>
    `;

    card.disabled = talent.unlocked || !canUnlock;

    card.addEventListener("click", () => {
      if (!callbacks.onTalentBuy(talent)) return;
      renderTalentCards(options);
      renderUpgrades();
      callbacks.onSave();
    });

    container.appendChild(card);
    uiRefs.talentButtons.set(talent.id, card);
  });

  if (talentStatusEl) {
    talentStatusEl.textContent = `${unlockedCount}/${talents.length} talents actifs`;
  }

  if (resetTalentsBtn) {
    resetTalentsBtn.textContent = `🔄 Reset (${formatNumber(TALENT_RESET_COST)} ${icons.fragments})`;
    (resetTalentsBtn as HTMLButtonElement).disabled =
      unlockedCount === 0 || resources.fragments < TALENT_RESET_COST;
  }
}
