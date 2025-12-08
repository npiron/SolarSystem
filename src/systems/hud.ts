import type { GameState, HudContext } from "../types/index.ts";
import { FX_BUDGET } from "../config/constants.ts";
import { packSize, spawnRate } from "./spawn.ts";
import { playCollect } from "./sound.ts";

export function formatNumber(value: number): string {
  const suffixes = [
    "",
    "K",
    "M",
    "B",
    "T",
    "Qa",
    "Qi",
    "Sx",
    "Sp",
    "Oc",
    "No",
    "De",
    "Ud",
    "Dd",
    "Td",
    "Qad",
    "Qid",
    "Sxd",
    "Spd",
    "Ocd",
    "Nod",
    "Vg",
    "Uv",
    "Dv",
    "Tv",
    "Qav",
    "Qiv",
    "Sxv",
    "Spv",
    "Ocv",
    "Nov"
  ];
  if (Math.abs(value) < 1000) return value.toFixed(0);
  const tier = Math.floor(Math.log10(Math.abs(value)) / 3);
  if (tier < suffixes.length) {
    const suffix = suffixes[tier];
    const scaled = value / Math.pow(10, tier * 3);
    return `${scaled.toFixed(2)}${suffix}`;
  }
  const exp = value.toExponential(2).replace("e", "E");
  return exp;
}

export function addFloatingText(state: GameState, text: string | number, x: number, y: number, color = "#fef08a", scale = 1.8): void {
  const rawLabel = typeof text === "string" || typeof text === "number" ? text : (text as { label?: string })?.label;
  if (rawLabel === undefined || rawLabel === null) return;
  const safeText = typeof rawLabel === "string" || typeof rawLabel === "number" ? String(rawLabel) : "";
  if (!safeText) return;

  if (state.floatingText.length >= FX_BUDGET.floatingText) {
    state.floatingText.shift();
  }

  const life = state.visualsLow ? 3.0 : 5.0; // AUGMENTÉ: 5 secondes pour bien voir !
  state.floatingText.push({ text: safeText, x, y, life, color, scale });
}

export function registerFragmentGain(state: GameState, value: number, x: number, y: number, silent = false): void {
  state.resources.fragments += value;
  state.runStats.fragments += value;
  if (!silent) {
    playCollect();
  }
  if (silent || state.visualsLow) {
    state.gainTicker.fragments += value;
    state.gainTicker.timer = 1.2;
    return;
  }

  // Smart grouping: check if there's a nearby fragment text to merge with
  const mergeRadius = 40; // Pixels - fragments this close get merged
  let merged = false;

  for (const text of state.floatingText) {
    const dx = text.x - x;
    const dy = text.y - y;
    const dist = Math.hypot(dx, dy);

    // Check if it's a fragment text nearby (contains 💎)
    if (dist < mergeRadius && String(text.text).includes('💎')) {
      // Extract current value and add new value
      const match = String(text.text).match(/\+([0-9.KMBTQa-z]+)/);
      if (match) {
        // Update the text with combined value
        const newTotal = value; // Just show the new amount for simplicity
        text.text = `+${formatNumber(value)} 💎`;
        text.life = 5.0; // Reset lifetime

        // Choose color based on value
        if (value >= 10) {
          text.color = "#a855f7"; // Purple for high value
        } else if (value >= 3) {
          text.color = "#22d3ee"; // Cyan for medium
        } else {
          text.color = "#60a5fa"; // Blue for low
        }

        merged = true;
        break;
      }
    }
  }

  // If not merged, create new text with value-based color
  if (!merged) {
    let color = "#60a5fa"; // Default blue for low value
    if (value >= 10) {
      color = "#a855f7"; // Purple for high value
    } else if (value >= 3) {
      color = "#22d3ee"; // Cyan for medium value
    }

    addFloatingText(state, `+${formatNumber(value)} 💎`, x, y, color, 2.0);
  }
}

export function debugPing(state: GameState, text: string, color = "#c7d2fe", onUpdateHud?: () => void): void {
  addFloatingText(state, text, state.player.x, state.player.y - 16, color);
  if (onUpdateHud) onUpdateHud();
}

export function updateFloatingText(state: GameState, dt: number): void {
  state.floatingText = state.floatingText
    .map((f) => ({ ...f, y: f.y - 18 * dt, life: f.life - dt }))
    .filter((f) => f.life > 0);

  if (state.gainTicker.timer > 0) {
    state.gainTicker.timer = Math.max(0, state.gainTicker.timer - dt);
    if (state.gainTicker.timer === 0) {
      state.gainTicker.fragments = 0;
      state.gainTicker.essence = 0;
    }
  }
}

export function updateHud(state: GameState, { elements, uiRefs, generators, upgrades, talents, computeIdleRate, canUnlockTalent }: HudContext): void {
  const { essenceEl, fragmentsEl, idleRateEl, waveEl, hpEl, dpsEl, damageRow, spawnRateEl, pauseBtn, softPrestigeBtn, statusEl } = elements;

  if (essenceEl) essenceEl.textContent = formatNumber(state.resources.essence);
  if (fragmentsEl) fragmentsEl.textContent = formatNumber(state.resources.fragments);
  if (idleRateEl) idleRateEl.textContent = `${formatNumber(computeIdleRate())} /s`;
  if (waveEl) waveEl.textContent = state.wave.toFixed(1);
  if (hpEl) hpEl.textContent = `${state.player.hp.toFixed(0)} / ${state.player.maxHp}`;
  const avgDamage = state.player.damage * (1 + state.player.critChance * (state.player.critMultiplier - 1));
  const dps = (avgDamage / state.player.fireDelay) * state.player.projectiles;
  if (dpsEl) dpsEl.textContent = formatNumber(dps);
  const shotsPerSecond = 1 / state.player.fireDelay;
  const critPercent = Math.round(state.player.critChance * 100);
  if (damageRow) {
    damageRow.dataset.tooltip = `Dégâts moyens : ${avgDamage.toFixed(1)} · ${shotsPerSecond.toFixed(1)} tirs/s · ${state.player.projectiles} projectile(s) · Critiques : ${critPercent}% x${state.player.critMultiplier.toFixed(1)} · DPS estimé : ${dps.toFixed(1)}`;
  }
  const totalSpawn = spawnRate(state) * packSize(state);
  if (spawnRateEl) spawnRateEl.textContent = `${totalSpawn.toFixed(2)} /s`;
  const shieldEl = document.getElementById("shield");
  const critEl = document.getElementById("crit");
  const collectEl = document.getElementById("collect");
  if (shieldEl) shieldEl.textContent = `${Math.round(state.player.damageReduction * 100)}%`;
  if (critEl) critEl.textContent = `${Math.round(state.player.critChance * 100)}% x${state.player.critMultiplier.toFixed(1)}`;
  if (collectEl) collectEl.textContent = `${Math.round(state.player.collectRadius)}px`;

  if (pauseBtn) pauseBtn.textContent = state.running ? "⏸ Pause" : "▶️ Reprendre";

  uiRefs.generatorButtons.forEach((btn, id) => {
    const gen = generators.find((g) => g.id === id);
    if (!gen) return;
    btn.disabled = state.resources.essence < gen.cost;
  });
  uiRefs.upgradeButtons.forEach((btn, id) => {
    const up = upgrades.find((u) => u.id === id);
    if (!up) return;
    const reachedCap = Number.isFinite(up.max) && up.level >= up.max;
    btn.disabled = reachedCap || state.resources.fragments < up.cost;
  });

  uiRefs.talentButtons?.forEach((btn, id) => {
    const talent = talents.find((t) => t.id === id);
    if (!talent) return;
    btn.disabled = talent.unlocked || !canUnlockTalent(talent, talents, state.resources);
  });

  if (softPrestigeBtn) {
    if (state.prestigeCooldown > 0) {
      softPrestigeBtn.textContent = `⟳ Consolidation (${state.prestigeCooldown.toFixed(1)}s)`;
      (softPrestigeBtn as HTMLButtonElement).disabled = true;
    } else {
      softPrestigeBtn.textContent = "⟳ Consolidation";
      (softPrestigeBtn as HTMLButtonElement).disabled = false;
    }
  }

  if (statusEl) {
    if (state.dead) {
      statusEl.textContent = "Vous êtes hors service. Relancez la run pour reprendre.";
      statusEl.classList.add("visible");
    } else {
      statusEl.textContent = "";
      statusEl.classList.remove("visible");
    }
  }
}
