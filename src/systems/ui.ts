/**
 * UI rendering for generators, upgrades, and talents.
 * Handles the creation and updating of purchase cards in the sidebar.
 */

import type { Generator, Upgrade, Talent, Resources } from "../types/index.ts";
import { formatNumber } from "./hud.ts";
import { icons } from "../config/constants.ts";
import { canUnlockTalent, prerequisitesMet } from "./talents.ts";
import { TALENT_RESET_COST } from "../config/talents.ts";

type UiRefs = {
  generatorButtons: Map<string, HTMLButtonElement>;
  upgradeButtons: Map<string, HTMLButtonElement>;
  talentButtons: Map<string, HTMLButtonElement>;
};

type BuyGeneratorFn = (gen: Generator) => void;
type BuyUpgradeFn = (up: Upgrade) => void;
type BuyTalentFn = (talent: Talent) => boolean;

/**
 * Render generators list in the UI.
 * @param container - The container element for generators
 * @param generators - Array of generators
 * @param uiRefs - UI references for button tracking
 * @param resources - Current resources
 * @param computeGeneratorRate - Function to compute generator rate
 * @param buyGenerator - Function to buy a generator
 * @param saveGame - Function to save the game
 */
export function renderGenerators(
  container: HTMLElement,
  generators: Generator[],
  uiRefs: UiRefs,
  resources: Resources,
  computeGeneratorRate: (gen: Generator) => number,
  buyGenerator: BuyGeneratorFn,
  saveGame: () => void
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
    btn.innerHTML = `${icons.essence} Acheter ${formatNumber(gen.cost)}`;
    btn.className = "secondary";
    btn.disabled = resources.essence < gen.cost;
    btn.addEventListener("click", () => {
      buyGenerator(gen);
      renderGenerators(container, generators, uiRefs, resources, computeGeneratorRate, buyGenerator, saveGame);
      saveGame();
    });
    card.appendChild(info);
    card.appendChild(btn);
    container.appendChild(card);
    uiRefs.generatorButtons.set(gen.id, btn);
  });
}

/**
 * Render upgrades list in the UI.
 * @param container - The container element for upgrades
 * @param upgrades - Array of upgrades
 * @param uiRefs - UI references for button tracking
 * @param resources - Current resources
 * @param buyUpgrade - Function to buy an upgrade
 * @param saveGame - Function to save the game
 */
export function renderUpgrades(
  container: HTMLElement,
  upgrades: Upgrade[],
  uiRefs: UiRefs,
  resources: Resources,
  buyUpgrade: BuyUpgradeFn,
  saveGame: () => void
): void {
  container.innerHTML = "";
  uiRefs.upgradeButtons.clear();
  upgrades.forEach((up) => {
    const maxLabel = Number.isFinite(up.max) ? up.max : "∞";
    const reachedCap = Number.isFinite(up.max) && up.level >= up.max;

    // Create main card container
    const card = document.createElement("div");
    card.className = "flex items-center gap-3 p-3 bg-base-100/40 backdrop-blur-sm border border-white/5 rounded-xl hover:bg-base-100/60 transition-colors group";

    // Content Section (Left)
    const info = document.createElement("div");
    info.className = "flex-1 min-w-0 flex flex-col gap-1";

    // Header line: Name + Level
    const header = document.createElement("div");
    header.className = "flex justify-between items-baseline";
    header.innerHTML = `
      <h3 class="font-bold text-base text-base-content leading-tight group-hover:text-primary transition-colors">${up.name}</h3>
      <span class="text-[10px] font-mono opacity-50 whitespace-nowrap ml-2">Lvl ${up.level}/${maxLabel}</span>
    `;

    // Description (Larger as requested)
    const desc = document.createElement("p");
    desc.className = "text-sm text-base-content/80 leading-snug";
    desc.textContent = up.description;

    info.appendChild(header);
    info.appendChild(desc);

    // Button Section (Right)
    // "Square" button with just Number + Icon
    const btn = document.createElement("button");
    btn.className = "btn btn-square btn-lg bg-base-300 border-white/10 hover:border-primary/50 hover:bg-base-300 group-hover:shadow-lg transition-all flex flex-col items-center justify-center gap-0 w-16 h-16 shrink-0";

    // Icon and Cost
    btn.innerHTML = `
      <span class="text-lg mb-[-2px]">${icons.fragments}</span>
      <span class="font-mono text-xs font-bold ${resources.fragments >= up.cost ? 'text-secondary' : 'opacity-50'}">${formatNumber(up.cost)}</span>
    `;

    btn.disabled = reachedCap || resources.fragments < up.cost;

    if (reachedCap) {
      btn.innerHTML = `<i class="ti ti-check text-success text-xl"></i>`;
      btn.classList.add("opacity-50", "cursor-not-allowed");
    }

    btn.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent card click if any
      buyUpgrade(up);
      renderUpgrades(container, upgrades, uiRefs, resources, buyUpgrade, saveGame);
      saveGame();
    });

    card.appendChild(info);
    card.appendChild(btn);

    container.appendChild(card);
    uiRefs.upgradeButtons.set(up.id, btn);
  });
}

/**
 * Render talents list in the UI.
 * @param container - The container element for talents
 * @param talents - Array of talents
 * @param uiRefs - UI references for button tracking
 * @param resources - Current resources
 * @param buyTalent - Function to buy a talent
 * @param saveGame - Function to save the game
 * @param talentStatusEl - Optional element to show talent status
 * @param resetTalentsBtn - Optional button to reset talents
 */
export function renderTalents(
  container: HTMLElement | null,
  talents: Talent[],
  uiRefs: UiRefs,
  resources: Resources,
  buyTalent: BuyTalentFn,
  saveGame: () => void,
  renderUpgradesFn: () => void,
  talentStatusEl?: HTMLElement | null,
  resetTalentsBtn?: HTMLButtonElement | null
): void {
  if (!container) return;
  container.innerHTML = "";
  uiRefs.talentButtons.clear();
  let unlockedCount = 0;

  talents.forEach((talent) => {
    if (talent.unlocked) unlockedCount += 1;
    const card = document.createElement("button") as HTMLButtonElement;
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
      if (!buyTalent(talent)) return;
      renderTalents(container, talents, uiRefs, resources, buyTalent, saveGame, renderUpgradesFn, talentStatusEl, resetTalentsBtn);
      renderUpgradesFn();
      saveGame();
    });

    container.appendChild(card);
    uiRefs.talentButtons.set(talent.id, card);
  });

  if (talentStatusEl) {
    talentStatusEl.textContent = `${unlockedCount}/${talents.length} talents actifs`;
  }
  if (resetTalentsBtn) {
    resetTalentsBtn.innerHTML = `<i class="ti ti-refresh"></i> Reset (${formatNumber(TALENT_RESET_COST)} ${icons.fragments})`;
    resetTalentsBtn.disabled = unlockedCount === 0 || resources.fragments < TALENT_RESET_COST;
  }
}
