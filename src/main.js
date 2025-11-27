import { init, GameLoop } from "https://unpkg.com/kontra@9/kontra.mjs";
import { STORAGE_KEY, TAU, icons, palette } from "./config/constants.js";
import { createGenerators } from "./config/generators.js";
import { createUpgrades } from "./config/upgrades.js";
import { updateCombat } from "./systems/combat.js";
import { debugPing, formatNumber, updateFloatingText, updateHud } from "./systems/hud.js";
import { updateSpawn } from "./systems/spawn.js";

const { canvas, context: ctx } = init("arena");
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
const statusEl = document.getElementById("statusMessage");
const generatorsContainer = document.getElementById("generators");
const upgradesContainer = document.getElementById("upgrades");

const generators = createGenerators();
const upgrades = createUpgrades();

const state = {
  running: true,
  wave: 1,
  time: 0,
  enemies: [],
  bullets: [],
  floatingText: [],
  fragmentsOrbs: [],
  gainTicker: { fragments: 0, essence: 0, timer: 0 },
  runStats: {
    kills: 0,
    fragments: 0,
    essence: 0
  },
  player: {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 12,
    hp: 120,
    maxHp: 120,
    speed: 95,
    damage: 12,
    fireDelay: 0.65,
    fireTimer: 0,
    projectiles: 1,
    regen: 2,
    range: 1,
    bulletSpeed: 260,
    damageReduction: 0,
    pierce: 0,
    collectRadius: 90,
    critChance: 0.08,
    critMultiplier: 2,
    spin: 0
  },
  resources: {
    essence: 0,
    fragments: 0,
    idleMultiplier: 1
  },
  spawnTimer: 0,
  overlayFade: 0.12,
  prestigeCooldown: 0,
  dead: false,
  visualsLow: false
};

function clampPlayerToBounds() {
  state.player.x = Math.max(30, Math.min(canvas.width - 30, state.player.x));
  state.player.y = Math.max(30, Math.min(canvas.height - 30, state.player.y));
}

function resizeCanvas(center = false) {
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
  if (center) {
    state.player.x = canvas.width / 2;
    state.player.y = canvas.height / 2;
  }
  clampPlayerToBounds();
}

const uiRefs = {
  generatorButtons: new Map(),
  upgradeButtons: new Map()
};

function loadSave() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const save = JSON.parse(raw);
    Object.assign(state.resources, save.resources || {});
    state.wave = save.wave || state.wave;
    state.player.damage = save.player?.damage ?? state.player.damage;
    state.player.fireDelay = save.player?.fireDelay ?? state.player.fireDelay;
    state.player.projectiles = save.player?.projectiles ?? state.player.projectiles;
    state.player.regen = save.player?.regen ?? state.player.regen;
    state.player.range = save.player?.range ?? state.player.range;
    state.player.bulletSpeed = save.player?.bulletSpeed ?? state.player.bulletSpeed;
    state.player.damageReduction = save.player?.damageReduction ?? state.player.damageReduction;
    state.player.pierce = save.player?.pierce ?? state.player.pierce;
    state.player.collectRadius = save.player?.collectRadius ?? state.player.collectRadius;
    state.player.critChance = save.player?.critChance ?? state.player.critChance;
    state.player.critMultiplier = save.player?.critMultiplier ?? state.player.critMultiplier;
    state.resources.idleMultiplier = save.idleMultiplier || state.resources.idleMultiplier;
    save.generators?.forEach((g, idx) => {
      if (generators[idx]) {
        generators[idx].level = g.level || 0;
        generators[idx].rate = generators[idx].baseRate * Math.pow(1.12, generators[idx].level) * state.resources.idleMultiplier;
        generators[idx].cost = g.cost || generators[idx].cost;
      }
    });
    save.upgrades?.forEach((entry, idx) => {
      const upgrade = upgrades[idx];
      if (!upgrade) return;
      if (typeof entry === "number") {
        upgrade.level = entry;
      } else {
        upgrade.level = entry.level || 0;
        upgrade.cost = entry.cost || upgrade.cost;
      }
    });
    applyUpgradeEffects();
    const now = Date.now();
    if (save.lastSeen) {
      const elapsed = Math.max(0, (now - save.lastSeen) / 1000);
      grantOfflineGains(elapsed);
    }
  } catch (err) {
    console.warn("Save corrupted", err);
  }
}

function saveGame() {
  const data = {
    resources: state.resources,
    wave: state.wave,
    player: {
      damage: state.player.damage,
      fireDelay: state.player.fireDelay,
      projectiles: state.player.projectiles,
      regen: state.player.regen,
      range: state.player.range,
      bulletSpeed: state.player.bulletSpeed,
      damageReduction: state.player.damageReduction,
      pierce: state.player.pierce,
      collectRadius: state.player.collectRadius,
      critChance: state.player.critChance,
      critMultiplier: state.player.critMultiplier
    },
    generators: generators.map((g) => ({ level: g.level, cost: g.cost })),
    upgrades: upgrades.map((u) => ({ level: u.level, cost: u.cost })),
    idleMultiplier: state.resources.idleMultiplier,
    lastSeen: Date.now()
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function grantOfflineGains(seconds) {
  const rate = computeIdleRate();
  const earnedEssence = rate * seconds;
  const earnedFragments = earnedEssence * 0.4;
  state.resources.essence += earnedEssence;
  state.resources.fragments += earnedFragments;
  state.runStats.essence += earnedEssence;
  state.runStats.fragments += earnedFragments;
}

function applyUpgradeEffects() {
  // Reset to base before reapplying
  state.player.damage = 12;
  state.player.fireDelay = 0.65;
  state.player.projectiles = 1;
  state.player.regen = 2;
  state.player.range = 1;
  state.player.bulletSpeed = 260;
  state.player.damageReduction = 0;
  state.player.pierce = 0;
  state.player.collectRadius = 90;
  state.player.critChance = 0.08;
  state.player.critMultiplier = 2;
  upgrades.forEach((upgrade) => {
    for (let i = 0; i < upgrade.level; i++) {
      upgrade.apply(state);
    }
  });
}

function computeIdleRate() {
  return generators.reduce((sum, g) => sum + g.rate * g.level, 0);
}

const hudContext = {
  elements: {
    essenceEl,
    fragmentsEl,
    idleRateEl,
    waveEl,
    hpEl,
    dpsEl,
    spawnRateEl,
    pauseBtn,
    softPrestigeBtn,
    statusEl
  },
  uiRefs,
  generators,
  upgrades,
  computeIdleRate
};

function buyGenerator(gen) {
  if (state.resources.essence < gen.cost) return;
  state.resources.essence -= gen.cost;
  gen.level += 1;
  gen.cost = Math.ceil(gen.cost * 1.35 + gen.level * 2);
  gen.rate = gen.baseRate * Math.pow(1.12, gen.level) * state.resources.idleMultiplier;
}

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

function buyUpgrade(upgrade) {
  if (upgrade.level >= upgrade.max) return;
  if (state.resources.fragments < upgrade.cost) return;
  state.resources.fragments -= upgrade.cost;
  upgrade.level += 1;
  upgrade.cost = Math.ceil(upgrade.cost * 1.45 + upgrade.level * 3);
  upgrade.apply(state);
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

function nearestFragment() {
  let closest = null;
  let bestDist = Infinity;
  state.fragmentsOrbs.forEach((f) => {
    const dx = f.x - state.player.x;
    const dy = f.y - state.player.y;
    const dist = dx * dx + dy * dy;
    if (dist < bestDist) {
      bestDist = dist;
      closest = f;
    }
  });
  return closest;
}

function update(dt) {
  if (!state.running) return;

  state.time += dt;

  updateSpawn(state, dt, canvas);

  const targetFragment = nearestFragment();
  if (targetFragment) {
    const dx = targetFragment.x - state.player.x;
    const dy = targetFragment.y - state.player.y;
    const dist = Math.hypot(dx, dy) || 1;
    state.player.x += (dx / dist) * state.player.speed * dt * 1.1;
    state.player.y += (dy / dist) * state.player.speed * dt * 1.1;
  } else {
    const orbit = Math.sin(state.time * 0.6) * 0.4;
    state.player.x += Math.cos(state.time * 0.8 + orbit) * state.player.speed * dt;
    state.player.y += Math.sin(state.time * 0.5) * state.player.speed * dt;
  }
  clampPlayerToBounds();

  updateCombat(state, dt, canvas);

  state.wave += dt * 0.15;

  if (state.prestigeCooldown > 0) {
    state.prestigeCooldown = Math.max(0, state.prestigeCooldown - dt);
  }

  const idleRate = computeIdleRate();
  const passiveEssence = idleRate * dt;
  const passiveFragments = idleRate * 0.35 * dt;
  state.resources.essence += passiveEssence;
  state.resources.fragments += passiveFragments;
  state.runStats.essence += passiveEssence;
  state.runStats.fragments += passiveFragments;

  updateFloatingText(state, dt);
}

function softReset() {
  state.wave = 1;
  state.player.hp = state.player.maxHp;
  state.player.fireTimer = 0;
  state.player.x = canvas.width / 2;
  state.player.y = canvas.height / 2;
  state.enemies = [];
  state.bullets = [];
  state.floatingText = [];
  state.fragmentsOrbs = [];
  state.gainTicker = { fragments: 0, essence: 0, timer: 0 };
  state.runStats = { kills: 0, fragments: 0, essence: 0 };
  state.spawnTimer = 0;
  state.dead = false;
  state.running = true;
}

function prestige() {
  const bonus = 1 + Math.sqrt(state.wave) * 0.25;
  state.resources.idleMultiplier *= bonus;
  generators.forEach((g) => {
    g.rate = g.baseRate * Math.pow(1.12, g.level) * state.resources.idleMultiplier;
  });
  softReset();
  state.prestigeCooldown = 8;
  saveGame();
  renderGenerators();
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!state.visualsLow) {
    // Background grid
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    for (let x = 0; x < canvas.width; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 60) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Player trail
  ctx.save();
  ctx.fillStyle = "rgba(34,211,238,0.15)";
  ctx.beginPath();
  ctx.arc(state.player.x, state.player.y, state.player.radius + 12, 0, TAU);
  ctx.fill();
  ctx.restore();

  // Player
  if (state.visualsLow) {
    ctx.fillStyle = "#22d3ee";
  } else {
    const gradient = ctx.createRadialGradient(
      state.player.x - 4,
      state.player.y - 4,
      4,
      state.player.x,
      state.player.y,
      state.player.radius * 1.4
    );
    gradient.addColorStop(0, "#fff");
    gradient.addColorStop(0.3, palette[0]);
    gradient.addColorStop(1, "rgba(255,255,255,0.1)");
    ctx.fillStyle = gradient;
  }
  ctx.beginPath();
  ctx.arc(state.player.x, state.player.y, state.player.radius, 0, TAU);
  ctx.fill();

  // Collect radius cue
  ctx.strokeStyle = "rgba(52,211,153,0.18)";
  ctx.beginPath();
  ctx.arc(state.player.x, state.player.y, state.player.collectRadius * 0.4, 0, TAU);
  ctx.stroke();

  // Bullets
  ctx.fillStyle = state.visualsLow ? "#e2e8f0" : "#fef3c7";
  state.bullets.forEach((b) => {
    ctx.beginPath();
    ctx.arc(b.x, b.y, 4, 0, TAU);
    ctx.fill();
  });

  // Fragments
  state.fragmentsOrbs.forEach((f) => {
    ctx.fillStyle = "#f472b6";
    ctx.beginPath();
    ctx.arc(f.x, f.y, 6, 0, TAU);
    ctx.fill();
    if (!state.visualsLow) {
      ctx.strokeStyle = "rgba(244,114,182,0.4)";
      ctx.beginPath();
      ctx.arc(f.x, f.y, 10, 0, TAU);
      ctx.stroke();
    }
  });

  // Enemies
  state.enemies.forEach((e, idx) => {
    ctx.fillStyle = e.elite ? "#f97316" : palette[idx % palette.length];
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius, 0, TAU);
    ctx.fill();
    if (!state.visualsLow || e.hitThisFrame) {
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillRect(e.x - e.radius, e.y - e.radius - 10, e.radius * 2, 6);
      ctx.fillStyle = "#22c55e";
      ctx.fillRect(e.x - e.radius, e.y - e.radius - 10, (e.hp / e.maxHp) * e.radius * 2, 6);
    }
  });

  // Floating texts
  ctx.font = "14px 'Space Grotesk', sans-serif";
  state.floatingText.forEach((f) => {
    ctx.globalAlpha = Math.max(0, f.life);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y - (1.5 - f.life) * 24);
  });
  ctx.globalAlpha = 1;

  // HUD overlay
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  const x = 12;
  const y = 12;
  const w = 210;
  const h = 150;
  const r = 10;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "16px 'Space Grotesk', sans-serif";
  ctx.fillText(`${icons.wave} Vague ${state.wave.toFixed(1)}`, 24, 40);
  ctx.fillText(`⚔️ Kills ${state.runStats.kills}`, 24, 64);
  ctx.fillText(`${icons.fragments} Fragments ${formatNumber(state.runStats.fragments)}`, 24, 88);
  ctx.fillText(`${icons.essence} Essence ${formatNumber(state.runStats.essence)}`, 24, 112);
  if (state.gainTicker.fragments > 0) {
    ctx.fillStyle = "#f472b6";
    ctx.fillText(`⇡ +${formatNumber(state.gainTicker.fragments)} ✦`, 24, 136);
  }
  ctx.restore();
}

const loop = GameLoop({
  update(dt) {
    const clamped = Math.min(0.05, dt);
    update(clamped);
    updateHud(state, hudContext);
  },
  render() {
    render();
  }
});

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
    debugPing(state, state.visualsLow ? "Mode perfo" : "Mode flair", state.visualsLow ? "#22c55e" : "#a78bfa", () =>
      updateHud(state, hudContext)
    );
  });

  debugBtns.giveEssence?.addEventListener("click", () => {
    state.resources.essence += 1_000_000;
    renderGenerators();
    saveGame();
    debugPing(state, "+1M ⚡", undefined, () => updateHud(state, hudContext));
  });
  debugBtns.giveFragments?.addEventListener("click", () => {
    state.resources.fragments += 1_000_000;
    renderUpgrades();
    saveGame();
    debugPing(state, "+1M ✦", undefined, () => updateHud(state, hudContext));
  });
  debugBtns.skipWave?.addEventListener("click", () => {
    state.wave += 10;
    state.spawnTimer = 0;
    saveGame();
    debugPing(state, "+10 vagues", undefined, () => updateHud(state, hudContext));
  });
  debugBtns.nuke?.addEventListener("click", () => {
    state.enemies = [];
    state.fragmentsOrbs = [];
    debugPing(state, "☄️ Nuke", "#f472b6", () => updateHud(state, hudContext));
  });

  renderGenerators();
  renderUpgrades();
}

function bootstrap() {
  resizeCanvas(true);
  loadSave();
  initUI();
  window.addEventListener("resize", () => resizeCanvas());
  loop.start();
  setInterval(saveGame, 5000);
}

bootstrap();
