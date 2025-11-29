import { FX_BUDGET, icons } from "../config/constants.js";
import { packSize, spawnRate } from "./spawn.js";
import { playCollect } from "./sound.js";

export function formatNumber(value) {
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

export function addFloatingText(state, text, x, y, color = "#fef08a") {
  const rawLabel = typeof text === "string" || typeof text === "number" ? text : text?.label;
  if (rawLabel === undefined || rawLabel === null) return;
  const safeText = typeof rawLabel === "string" || typeof rawLabel === "number" ? rawLabel : "";
  if (!safeText) return;

  if (state.floatingText.length >= FX_BUDGET.floatingText) {
    state.floatingText.shift();
  }

  const life = state.visualsLow ? 0.9 : 1.4;
  state.floatingText.push({ text: safeText, x, y, life, color });
}

export function registerFragmentGain(state, value, x, y, silent = false) {
  state.resources.fragments += value;
  state.runStats.fragments += value;
  if (!silent) {
    playCollect();
  }
  if (silent || state.visualsLow || state.floatingText.length >= FX_BUDGET.floatingText) {
    state.gainTicker.fragments += value;
    state.gainTicker.timer = 1.2;
    return;
  }
  addFloatingText(state, `+${formatNumber(value)} ${icons.fragments}`, x, y, "#f472b6");
}

export function debugPing(state, text, color = "#c7d2fe", onUpdateHud) {
  addFloatingText(state, text, state.player.x, state.player.y - 16, color);
  if (onUpdateHud) onUpdateHud();
}

export function updateFloatingText(state, dt) {
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

export function updateHud(state, { elements, uiRefs, generators, upgrades, talents, computeIdleRate, canUnlockTalent }) {
  const { essenceEl, fragmentsEl, idleRateEl, waveEl, hpEl, dpsEl, damageRow, spawnRateEl, pauseBtn, softPrestigeBtn, statusEl } = elements;

  essenceEl.textContent = formatNumber(state.resources.essence);
  fragmentsEl.textContent = formatNumber(state.resources.fragments);
  idleRateEl.textContent = `${formatNumber(computeIdleRate())} /s`;
  waveEl.textContent = state.wave.toFixed(1);
  hpEl.textContent = `${state.player.hp.toFixed(0)} / ${state.player.maxHp}`;
  const avgDamage = state.player.damage * (1 + state.player.critChance * (state.player.critMultiplier - 1));
  const dps = (avgDamage / state.player.fireDelay) * state.player.projectiles;
  dpsEl.textContent = dps.toFixed(1);
  const shotsPerSecond = 1 / state.player.fireDelay;
  const critPercent = Math.round(state.player.critChance * 100);
  if (damageRow) {
    damageRow.dataset.tooltip = `Dégâts moyens : ${avgDamage.toFixed(1)} · ${shotsPerSecond.toFixed(1)} tirs/s · ${state.player.projectiles} projectile(s) · Critiques : ${critPercent}% x${state.player.critMultiplier.toFixed(1)} · DPS estimé : ${dps.toFixed(1)}`;
  }
  const totalSpawn = spawnRate(state) * packSize(state);
  spawnRateEl.textContent = `${totalSpawn.toFixed(2)} /s`;
  document.getElementById("shield").textContent = `${Math.round(state.player.damageReduction * 100)}%`;
  document.getElementById("crit").textContent = `${Math.round(state.player.critChance * 100)}% x${state.player.critMultiplier.toFixed(1)}`;
  document.getElementById("collect").textContent = `${Math.round(state.player.collectRadius)}px`;

  pauseBtn.textContent = state.running ? "⏸ Pause" : "▶️ Reprendre";

  uiRefs.generatorButtons.forEach((btn, id) => {
    const gen = generators.find((g) => g.id === id);
    if (!gen) return;
    btn.disabled = state.resources.essence < gen.cost;
  });
  uiRefs.upgradeButtons.forEach((btn, id) => {
    const up = upgrades.find((u) => u.id === id);
    if (!up) return;
    btn.disabled = up.level >= up.max || state.resources.fragments < up.cost;
  });

  uiRefs.talentButtons?.forEach((btn, id) => {
    const talent = talents.find((t) => t.id === id);
    if (!talent) return;
    btn.disabled = talent.unlocked || !canUnlockTalent(talent, talents, state.resources);
  });

  if (state.prestigeCooldown > 0) {
    softPrestigeBtn.textContent = `⟳ Consolidation (${state.prestigeCooldown.toFixed(1)}s)`;
    softPrestigeBtn.disabled = true;
  } else {
    softPrestigeBtn.textContent = "⟳ Consolidation";
    softPrestigeBtn.disabled = false;
  }

  if (state.dead) {
    statusEl.textContent = "Vous êtes hors service. Relancez la run pour reprendre.";
    statusEl.classList.add("visible");
  } else {
    statusEl.textContent = "";
    statusEl.classList.remove("visible");
  }
}
