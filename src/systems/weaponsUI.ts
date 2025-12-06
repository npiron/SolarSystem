/**
 * Weapons UI System
 * Renders weapon cards in the HUD and handles upgrades/unlocks
 */
import type { GameState } from "../types/index.ts";
import { WEAPONS, getWeaponDef, getWeaponStats, getUpgradeCost, type WeaponId, type WeaponState } from "../config/weapons.ts";
import { formatNumber } from "./hud.ts";

let gridContainer: HTMLElement | null = null;
let lastRenderHash = "";
let currentStateRef: GameState | null = null;

/**
 * Initialize the weapons UI
 */
export function initWeaponsUI(): void {
    gridContainer = document.getElementById("weaponsGrid");
}

/**
 * Generate a hash of the current weapon state for comparison
 */
function getStateHash(state: GameState): string {
    const weaponHash = state.weapons.map(w => `${w.id}:${w.level}:${w.unlocked}`).join("|");
    const fragmentsHash = Math.floor(state.resources.fragments / 10); // Round to avoid too frequent updates
    return `${weaponHash}::${fragmentsHash}`;
}

/**
 * Render all weapon cards (optimized to only update when state changes)
 */
export function renderWeapons(state: GameState): void {
    if (!gridContainer) return;

    // Store state reference for event handlers
    currentStateRef = state;

    // Only re-render if state actually changed
    const stateHash = getStateHash(state);
    if (stateHash === lastRenderHash) {
        return;
    }
    lastRenderHash = stateHash;

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
 * Force re-render (call after unlock/upgrade)
 */
function forceRender(): void {
    lastRenderHash = "";
    if (currentStateRef) {
        renderWeapons(currentStateRef);
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

    // Stats row with detailed info
    const statsRow = document.createElement("div");
    statsRow.className = "weapon-stats-row";
    if (weaponState.unlocked) {
        const projectilesText = stats.projectiles ? `🎯 ${Math.floor(stats.projectiles)}` : '';
        const damageText = `⚔️ ${stats.damage.toFixed(0)}`;
        const delayText = stats.fireDelay > 0 ? `⏱️ ${stats.fireDelay.toFixed(1)}s` : '⏱️ ∞';
        statsRow.innerHTML = `
      <span class="weapon-stat"><span class="weapon-stat-icon">${damageText}</span></span>
      <span class="weapon-stat"><span class="weapon-stat-icon">${delayText}</span></span>
      ${projectilesText ? `<span class="weapon-stat"><span class="weapon-stat-icon">${projectilesText}</span></span>` : ''}
    `;
    } else {
        statsRow.innerHTML = `<span style="font-size: 0.6rem; color: oklch(var(--bc) / 50%)">${def.description}</span>`;
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
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            unlockWeapon(def.id);
        });
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
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            upgradeWeapon(def.id);
        });
        actionDiv.appendChild(btn);
    }

    card.appendChild(actionDiv);

    return card;
}

/**
 * Unlock a weapon
 */
function unlockWeapon(id: WeaponId): void {
    console.log("[WeaponsUI] unlockWeapon called for:", id);
    console.log("[WeaponsUI] currentStateRef:", currentStateRef);

    if (!currentStateRef) {
        console.log("[WeaponsUI] No state ref!");
        return;
    }

    const def = getWeaponDef(id);
    const weaponState = currentStateRef.weapons.find(w => w.id === id);

    console.log("[WeaponsUI] Weapon state:", weaponState);
    console.log("[WeaponsUI] Fragments:", currentStateRef.resources.fragments);
    console.log("[WeaponsUI] Unlock cost:", def.unlockCost);

    if (!weaponState || weaponState.unlocked) {
        console.log("[WeaponsUI] Already unlocked or not found");
        return;
    }
    if (currentStateRef.resources.fragments < def.unlockCost) {
        console.log("[WeaponsUI] Not enough fragments");
        return;
    }

    console.log("[WeaponsUI] Unlocking weapon!");
    currentStateRef.resources.fragments -= def.unlockCost;
    weaponState.unlocked = true;
    weaponState.level = 1;

    forceRender();
}

/**
 * Upgrade a weapon
 */
function upgradeWeapon(id: WeaponId): void {
    if (!currentStateRef) return;

    const def = getWeaponDef(id);
    const weaponState = currentStateRef.weapons.find(w => w.id === id);

    if (!weaponState || !weaponState.unlocked) return;
    if (weaponState.level >= def.maxLevel) return;

    const cost = getUpgradeCost(def, weaponState.level);
    if (currentStateRef.resources.fragments < cost) return;

    currentStateRef.resources.fragments -= cost;
    weaponState.level += 1;

    forceRender();
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
