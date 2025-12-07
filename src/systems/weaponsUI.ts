/**
 * Weapons UI System
 * Renders weapon cards in the HUD and handles upgrades/unlocks
 */
import type { GameState } from "../types/index.ts";
import { WEAPONS, getWeaponDef, getWeaponStats, getUpgradeCost, type WeaponId, type WeaponState } from "../config/weapons.ts";
import { icons } from "../config/constants.ts";
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
 * Create a weapon card element (Big Clickable Button Style)
 */
function createWeaponCard(
    def: ReturnType<typeof getWeaponDef>,
    weaponState: WeaponState,
    state: GameState
): HTMLElement {
    // Determine state
    const isUnlocked = weaponState.unlocked;
    const isMaxed = weaponState.level >= def.maxLevel;
    const cost = isUnlocked ? getUpgradeCost(def, weaponState.level) : def.unlockCost;
    const canAfford = state.resources.fragments >= cost;

    // Main Container (Button)
    const card = document.createElement("button");
    card.className = `w-full text-left p-2 rounded-xl border transition-all duration-200 flex items-center gap-3 relative group overflow-hidden
        ${isUnlocked
            ? 'bg-base-100/60 backdrop-blur border-white/10 hover:border-primary/50 hover:bg-base-100/80 active:scale-98'
            : 'bg-black/40 border-white/5 hover:border-white/20 hover:bg-black/60'}
        ${!canAfford && !isMaxed ? 'opacity-70 grayscale-[0.5]' : ''}
    `;

    // Background Progress Bar (Optional visual flair for level?)
    // For now just keep it clean nicely styled glass

    // 1. Icon (Left, Big)
    const iconContainer = document.createElement("div");
    iconContainer.className = `w-10 h-10 rounded-lg flex items-center justify-center text-2xl shadow-inner
        ${isUnlocked ? 'bg-base-300 text-base-content' : 'bg-base-300/20 text-white/20'}
    `;
    iconContainer.innerHTML = def.icon;

    // 2. Info Column (Center)
    const infoCol = document.createElement("div");
    infoCol.className = "flex-1 flex flex-col min-w-0";

    // Name Row
    const nameRow = document.createElement("div");
    nameRow.className = "flex items-baseline gap-2";
    nameRow.innerHTML = `
        <span class="font-bold text-sm truncate ${isUnlocked ? 'text-base-content' : 'text-base-content/50'}">${def.name}</span>
        ${isUnlocked ? `<span class="text-[10px] font-mono opacity-50">Lvl ${weaponState.level}</span>` : ''}
    `;

    // Stats / Desc Row
    const detailsRow = document.createElement("div");
    detailsRow.className = "text-[10px] opacity-70 leading-tight truncate";

    if (isUnlocked) {
        const stats = getWeaponStats(def, weaponState.level);
        const dmg = Math.round(stats.damage);
        const cd = stats.fireDelay > 0 ? stats.fireDelay.toFixed(1) + 's' : 'Rapid';
        detailsRow.innerHTML = `<span class="text-error">⚔️${dmg}</span> <span class="text-info ml-1">⏱️${cd}</span>`;
    } else {
        detailsRow.textContent = "Verrouillé";
    }

    infoCol.appendChild(nameRow);
    infoCol.appendChild(detailsRow);

    // 3. Action Column (Right)
    const actionCol = document.createElement("div");
    actionCol.className = "flex flex-col items-end shrink-0";

    if (isMaxed) {
        actionCol.innerHTML = `<span class="badge badge-xs badge-success badge-outline">MAX</span>`;
    } else {
        const costColor = canAfford ? (isUnlocked ? "text-secondary" : "text-warning") : "text-error";
        const actionLabel = isUnlocked ? "UP" : "UNLOCK";
        actionCol.innerHTML = `
            <span class="text-[10px] font-bold opacity-50 mb-[-2px]">${actionLabel}</span>
            <div class="flex items-center gap-1 font-mono text-xs font-bold ${costColor}">
                ${icons.fragments} ${formatNumber(cost)}
            </div>
        `;
    }

    card.appendChild(iconContainer);
    card.appendChild(infoCol);
    card.appendChild(actionCol);

    // Click Handler
    card.addEventListener("click", (e) => {
        if (isMaxed) return;
        if (!canAfford) return; // Or maybe play "error" sound?

        // Prevent spam
        if (card.disabled) return;

        if (isUnlocked) {
            upgradeWeapon(def.id);
        } else {
            unlockWeapon(def.id);
        }
    });

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
