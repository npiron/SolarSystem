import { STORAGE_KEY, icons } from "./config/constants.js";
import { formatNumber } from "./utils/format.js";

export function createUI(state, generators, upgrades, deps) {
  const {
    buyGenerator,
    buyUpgrade,
    saveGame,
    computeIdleRate,
    spawnRate,
    packSize,
    prestige,
    softReset,
    debugPing
  } = deps;

  const pauseBtn = document.getElementById("pause");
  const resetProgressBtn = document.getElementById("resetProgress");
  const softPrestigeBtn = document.getElementById("softPrestige");
  const restartRunBtn = document.getElementById("restartRun");
  const togglePerfBtn = document.getElementById("togglePerf");
  const debugBtns = {
    giveEssence: document.getElementById("debugGiveEssence"),
    giveFragments: document.getElementById("debugGiveFragments"),
    skipWave: document.getElementById("debugSkipWave"),
    nuke: document.getElementById("debugNuke")
  };

  const essenceEl = document.getElementById("essence");
  const fragmentsEl = document.getElementById("fragments");
  const idleRateEl = document.getElementById("idleRate");
  const waveEl = document.getElementById("wave");
  const hpEl = document.getElementById("hp");
  const dpsEl = document.getElementById("dps");
  const spawnRateEl = document.getElementById("spawnRate");
  const generatorsContainer = document.getElementById("generators");
  const upgradesContainer = document.getElementById("upgrades");

  const uiRefs = {
    generatorButtons: new Map(),
    upgradeButtons: new Map()
  };

  function renderGenerators() {
    generatorsContainer.innerHTML = "";
    uiRefs.generatorButtons.clear();
    generators.forEach((gen) => {
      const card = document.createElement("div");
      card.className = "card";
      const info = document.createElement("div");
      const production = gen.rate * gen.level;
      info.innerHTML = `<h3>${gen.name}</h3><p class="muted">Niveau ${gen.level} · Produit ${formatNumber(production)} ${icons.essence}/s</p>`;
      const btn = document.createElement("button");
      btn.textContent = `${icons.essence} Acheter ${formatNumber(gen.cost)}`;
      btn.className = "secondary";
      btn.disabled = state.resources.essence < gen.cost;
      btn.addEventListener("click", () => {
        buyGenerator(gen);
        renderGenerators();
        saveGame();
      });
      card.appendChild(info);
      card.appendChild(btn);
      generatorsContainer.appendChild(card);
      uiRefs.generatorButtons.set(gen.id, btn);
    });
  }

  function renderUpgrades() {
    upgradesContainer.innerHTML = "";
    uiRefs.upgradeButtons.clear();
    upgrades.forEach((up) => {
      const card = document.createElement("div");
      card.className = "card";
      const info = document.createElement("div");
      info.innerHTML = `<h3>${up.name}</h3><p>${up.description}</p><p class="muted">Niveau ${up.level}/${up.max}</p>`;
      const btn = document.createElement("button");
      btn.textContent = `${icons.fragments} Acheter ${formatNumber(up.cost)}`;
      btn.className = "primary";
      btn.disabled = up.level >= up.max || state.resources.fragments < up.cost;
      btn.addEventListener("click", () => {
        buyUpgrade(up);
        renderUpgrades();
        saveGame();
      });
      card.appendChild(info);
      card.appendChild(btn);
      upgradesContainer.appendChild(card);
      uiRefs.upgradeButtons.set(up.id, btn);
    });
  }

  function updateHud() {
    essenceEl.textContent = formatNumber(state.resources.essence);
    fragmentsEl.textContent = formatNumber(state.resources.fragments);
    idleRateEl.textContent = `${formatNumber(computeIdleRate())} /s`;
    waveEl.textContent = state.wave.toFixed(1);
    hpEl.textContent = `${state.player.hp.toFixed(0)} / ${state.player.maxHp}`;
    const avgDamage = state.player.damage * (1 + state.player.critChance * (state.player.critMultiplier - 1));
    const dps = (avgDamage / state.player.fireDelay) * state.player.projectiles;
    dpsEl.textContent = dps.toFixed(1);
    const totalSpawn = spawnRate() * packSize();
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

    if (state.prestigeCooldown > 0) {
      softPrestigeBtn.textContent = `⟳ Consolidation (${state.prestigeCooldown.toFixed(1)}s)`;
      softPrestigeBtn.disabled = true;
    } else {
      softPrestigeBtn.textContent = "⟳ Consolidation";
      softPrestigeBtn.disabled = false;
    }

    const status = document.getElementById("statusMessage");
    if (state.dead) {
      status.textContent = "Vous êtes hors service. Relancez la run pour reprendre.";
      status.classList.add("visible");
    } else {
      status.textContent = "";
      status.classList.remove("visible");
    }
  }

  function initUI() {
    pauseBtn.addEventListener("click", () => {
      state.running = !state.running;
      pauseBtn.textContent = state.running ? "⏸ Pause" : "▶️ Reprendre";
      saveGame();
    });

    resetProgressBtn.addEventListener("click", () => {
      if (confirm("Effacer la sauvegarde et recommencer ?")) {
        localStorage.removeItem(STORAGE_KEY);
        window.location.reload();
      }
    });

    softPrestigeBtn.addEventListener("click", () => {
      if (state.prestigeCooldown > 0) return;
      prestige();
    });

    restartRunBtn.addEventListener("click", () => {
      softReset();
      saveGame();
    });

    togglePerfBtn.addEventListener("click", () => {
      state.visualsLow = !state.visualsLow;
      togglePerfBtn.textContent = state.visualsLow ? "🚀 Perfo ON" : "⚙️ Mode perfo";
      debugPing(state.visualsLow ? "Mode perfo" : "Mode flair", state.visualsLow ? "#22c55e" : "#a78bfa");
    });

    debugBtns.giveEssence?.addEventListener("click", () => {
      state.resources.essence += 1_000_000;
      renderGenerators();
      saveGame();
      debugPing("+1M ⚡");
    });
    debugBtns.giveFragments?.addEventListener("click", () => {
      state.resources.fragments += 1_000_000;
      renderUpgrades();
      saveGame();
      debugPing("+1M ✦");
    });
    debugBtns.skipWave?.addEventListener("click", () => {
      state.wave += 10;
      state.spawnTimer = 0;
      saveGame();
      debugPing("+10 vagues");
    });
    debugBtns.nuke?.addEventListener("click", () => {
      state.enemies = [];
      state.fragmentsOrbs = [];
      debugPing("☄️ Nuke", "#f472b6");
    });

    renderGenerators();
    renderUpgrades();
  }

  return { renderGenerators, renderUpgrades, updateHud, initUI };
}
