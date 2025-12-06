/**
 * Weapons UI System
 * Renders weapon cards in the HUD and handles upgrades/unlocks
 */
import type { GameState } from "../types/index.ts";
import { WEAPONS, getWeaponDef, getWeaponStats, getUpgradeCost, type WeaponId, type WeaponState } from "../config/weapons.ts";
import { formatNumber } from "./hud.ts";

let gridContainer: HTMLElement | null = null;

/**
 * Initialize the weapons UI
 */
export function initWeaponsUI(): void {
    gridContainer = document.getElementById("weaponsGrid");
}

/**
 * Render all weapon cards
 */
export function renderWeapons(state: GameState): void {
    if (!gridContainer) return;

    gridContainer.innerHTML = "";

    const weaponIds = Object.keys(WEAPONS) as WeaponId[];

    for (const id of weaponIds) {
        const def = getWeaponDef(id);
        const weaponState = state.weapons.find(w => w.id === id);

        if (!weaponState) continue;

        const card = createWeaponCard(def, weaponState, state);
        gridContainer.appendChild(card);
    }
}

/**
 * Create a weapon card element
 */
function createWeaponCard(
    def: ReturnType<typeof getWeaponDef>,
    weaponState: WeaponState,
    state: GameState
): HTMLElement {
    const card = document.createElement("div");
    card.className = `weapon-card${weaponState.unlocked ? "" : " locked"}`;
    card.dataset.weaponId = def.id;

    const isMaxLevel = weaponState.level >= def.maxLevel;
    const stats = weaponState.unlocked ? getWeaponStats(def, weaponState.level) : def.baseStats;

    // Header with icon, name, and level
    const header = document.createElement("div");
    header.className = "weapon-header";
    header.innerHTML = `
    <span class="weapon-icon">${def.icon}</span>
    <span class="weapon-name">${def.name}</span>
    ${weaponState.unlocked
            ? `<span class="weapon-level${isMaxLevel ? ' max' : ''}">Lv.${weaponState.level}${isMaxLevel ? ' MAX' : ''}</span>`
            : '<span class="weapon-level">🔒</span>'
        }
  `;
    card.appendChild(header);

    // Stats row
    const statsRow = document.createElement("div");
    statsRow.className = "weapon-stats";
    if (weaponState.unlocked) {
        statsRow.textContent = `⚔️ ${stats.damage.toFixed(1)} | ⏱️ ${stats.fireDelay.toFixed(2)}s`;
    } else {
        statsRow.textContent = def.description;
    }
    card.appendChild(statsRow);

    // Action button
    const actionDiv = document.createElement("div");
    actionDiv.className = "weapon-action";

    if (!weaponState.unlocked) {
        // Unlock button
        const cost = def.unlockCost;
        const canAfford = state.resources.fragments >= cost;
        const btn = document.createElement("button");
        btn.className = "unlock-btn";
        btn.disabled = !canAfford;
        btn.innerHTML = `🔓 Débloquer (💎 ${formatNumber(cost)})`;
        btn.onclick = () => unlockWeapon(state, def.id);
        actionDiv.appendChild(btn);
    } else if (isMaxLevel) {
        // Max level
        const btn = document.createElement("button");
        btn.className = "maxed-btn";
        btn.disabled = true;
        btn.textContent = "✓ Niveau Max";
        actionDiv.appendChild(btn);
    } else {
        // Upgrade button
        const cost = getUpgradeCost(def, weaponState.level);
        const canAfford = state.resources.fragments >= cost;
        const btn = document.createElement("button");
        btn.className = "upgrade-btn";
        btn.disabled = !canAfford;
        btn.innerHTML = `⬆️ Améliorer (💎 ${formatNumber(cost)})`;
        btn.onclick = () => upgradeWeapon(state, def.id);
        actionDiv.appendChild(btn);
    }

    card.appendChild(actionDiv);

    return card;
}

/**
 * Unlock a weapon
 */
function unlockWeapon(state: GameState, id: WeaponId): void {
    const def = getWeaponDef(id);
    const weaponState = state.weapons.find(w => w.id === id);

    if (!weaponState || weaponState.unlocked) return;
    if (state.resources.fragments < def.unlockCost) return;

    state.resources.fragments -= def.unlockCost;
    weaponState.unlocked = true;
    weaponState.level = 1;

    renderWeapons(state);
}

/**
 * Upgrade a weapon
 */
function upgradeWeapon(state: GameState, id: WeaponId): void {
    const def = getWeaponDef(id);
    const weaponState = state.weapons.find(w => w.id === id);

    if (!weaponState || !weaponState.unlocked) return;
    if (weaponState.level >= def.maxLevel) return;

    const cost = getUpgradeCost(def, weaponState.level);
    if (state.resources.fragments < cost) return;

    state.resources.fragments -= cost;
    weaponState.level += 1;

    renderWeapons(state);
}

/**
 * Get weapon state helper
 */
export function getWeaponLevel(state: GameState, id: WeaponId): number {
    const weaponState = state.weapons.find(w => w.id === id);
    return weaponState?.level ?? 0;
}

/**
 * Check if weapon is unlocked
 */
export function isWeaponUnlocked(state: GameState, id: WeaponId): boolean {
    const weaponState = state.weapons.find(w => w.id === id);
    return weaponState?.unlocked ?? false;
}
