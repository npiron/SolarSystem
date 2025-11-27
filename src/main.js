import { init, GameLoop } from "https://unpkg.com/kontra@9/kontra.mjs";
import { CELL_SIZE, FX_BUDGET, STORAGE_KEY, TAU, icons, palette } from "./config/constants.js";
import { createGenerators } from "./config/generators.js";
import { createUpgrades } from "./config/upgrades.js";

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
  const earned = rate * seconds;
  state.resources.essence += earned;
  state.resources.fragments += earned * 0.4;
}

function spawnRate() {
  return Math.min(10, 1.6 + state.wave * 0.1);
}

function packSize() {
  return Math.max(1, Math.floor(state.wave / 10));
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

function formatNumber(value) {
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

function addFloatingText(text, x, y, color = "#fef08a") {
  if (state.floatingText.length >= FX_BUDGET.floatingText) {
    state.floatingText.shift();
  }
  const life = state.visualsLow ? 0.9 : 1.4;
  state.floatingText.push({ text, x, y, life, color });
}

function debugPing(text, color = "#c7d2fe") {
  addFloatingText(text, state.player.x, state.player.y - 16, color);
  updateHud();
}

function registerFragmentGain(value, x, y, silent = false) {
  state.resources.fragments += value;
  state.runStats.fragments += value;
  if (silent || state.visualsLow || state.floatingText.length >= FX_BUDGET.floatingText) {
    state.gainTicker.fragments += value;
    state.gainTicker.timer = 1.2;
    return;
  }
  addFloatingText(`+${formatNumber(value)} ${icons.fragments}`, x, y, "#f472b6");
}

function computeIdleRate() {
  return generators.reduce((sum, g) => sum + g.rate * g.level, 0);
}

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

function spawnEnemy() {
  const margin = 20;
  const side = Math.floor(Math.random() * 4);
  let x = 0;
  let y = 0;
  if (side === 0) { x = Math.random() * canvas.width; y = margin; }
  if (side === 1) { x = Math.random() * canvas.width; y = canvas.height - margin; }
  if (side === 2) { x = margin; y = Math.random() * canvas.height; }
  if (side === 3) { x = canvas.width - margin; y = Math.random() * canvas.height; }

  const elite = Math.random() < 0.12 + state.wave * 0.002;
  const hp = (20 + state.wave * 7) * (elite ? 2.8 : 1);
  const speed = (40 + state.wave * 1.8) * (elite ? 0.9 : 1);
  const fireDelay = Math.max(1.2, (elite ? 3 : 4) - state.wave * 0.06);
  state.enemies.push({
    x,
    y,
    radius: 10,
    hp,
    maxHp: hp,
    speed,
    reward: (2 + state.wave * 0.7) * (elite ? 3 : 1),
    fireTimer: fireDelay * Math.random(),
    fireDelay,
    elite
  });
}

function nearestEnemy() {
  let closest = null;
  let bestDist = Infinity;
  state.enemies.forEach((e) => {
    const dx = e.x - state.player.x;
    const dy = e.y - state.player.y;
    const dist = dx * dx + dy * dy;
    if (dist < bestDist) {
      bestDist = dist;
      closest = e;
    }
  });
  return closest;
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

function fire() {
  const target = nearestEnemy();
  const count = Math.max(1, state.player.projectiles);
  const baseTrack = target ? Math.atan2(target.y - state.player.y, target.x - state.player.x) : state.time * 0.9;
  const baseAngle = baseTrack + state.player.spin;
  const ringStep = TAU / count;

  for (let i = 0; i < count; i++) {
    if (state.bullets.length >= FX_BUDGET.bullets) break;
    const angle = count > 1 ? baseAngle + i * ringStep : baseAngle;
    state.bullets.push({
      x: state.player.x,
      y: state.player.y,
      dx: Math.cos(angle) * state.player.bulletSpeed,
      dy: Math.sin(angle) * state.player.bulletSpeed,
      life: 1.2 * state.player.range,
      pierce: state.player.pierce
    });
  }
}

function update(dt) {
  if (!state.running) return;

  state.time += dt;
  state.player.fireTimer -= dt;
  state.spawnTimer -= dt;
  state.player.spin = (state.player.spin + dt * 1.2) % TAU;

  if (state.spawnTimer <= 0) {
    const rate = spawnRate();
    const pack = packSize();
    for (let i = 0; i < pack; i++) {
      spawnEnemy();
    }
    state.spawnTimer = 1 / rate;
  }

  // Auto movement : chase fragments if any, otherwise orbiting drift
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

  if (state.player.fireTimer <= 0) {
    fire();
    state.player.fireTimer = state.player.fireDelay;
  }

  // Regen
  state.player.hp = Math.min(state.player.maxHp, state.player.hp + state.player.regen * dt);

  // Bullets
  state.bullets.forEach((b) => {
    b.x += b.dx * dt;
    b.y += b.dy * dt;
    b.life -= dt;
  });
  if (state.bullets.length > FX_BUDGET.bullets) {
    state.bullets.splice(0, state.bullets.length - FX_BUDGET.bullets);
  }
  state.bullets = state.bullets.filter((b) => b.life > 0);

  // Fragments drift
  state.fragmentsOrbs.forEach((f) => {
    f.life -= dt;
    const dx = state.player.x - f.x;
    const dy = state.player.y - f.y;
    const dist = Math.hypot(dx, dy) || 1;
    if (dist < state.player.collectRadius) {
      f.vx += (dx / dist) * 120 * dt;
      f.vy += (dy / dist) * 120 * dt;
    }
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    const collectDist = state.player.radius + 6 + state.player.collectRadius * 0.15;
    if (dist < collectDist) {
      registerFragmentGain(f.value, f.x, f.y - 6);
      f.life = -1;
    }
  });
  state.fragmentsOrbs = state.fragmentsOrbs.filter((f) => f.life > 0);

  if (state.fragmentsOrbs.length > FX_BUDGET.fragments) {
    const overflow = state.fragmentsOrbs.splice(0, state.fragmentsOrbs.length - FX_BUDGET.fragments);
    const merged = overflow.reduce((sum, f) => sum + f.value, 0);
    registerFragmentGain(merged, state.player.x, state.player.y - 10, true);
  }

  // Enemies
  state.enemies.forEach((e) => {
    const angle = Math.atan2(state.player.y - e.y, state.player.x - e.x);
    e.x += Math.cos(angle) * e.speed * dt;
    e.y += Math.sin(angle) * e.speed * dt;
  });

  // Spatial hash for collisions
  const enemyBuckets = new Map();
  const bucketKey = (x, y) => `${Math.floor(x / CELL_SIZE)},${Math.floor(y / CELL_SIZE)}`;
  const neighborKeys = (x, y) => {
    const cx = Math.floor(x / CELL_SIZE);
    const cy = Math.floor(y / CELL_SIZE);
    const keys = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        keys.push(`${cx + dx},${cy + dy}`);
      }
    }
    return keys;
  };

  state.enemies.forEach((enemy) => {
    const key = bucketKey(enemy.x, enemy.y);
    if (!enemyBuckets.has(key)) enemyBuckets.set(key, []);
    enemyBuckets.get(key).push(enemy);
  });

  // Collisions bullets
  state.enemies.forEach((enemy) => (enemy.hitThisFrame = false));
  state.bullets.forEach((b) => {
    const keys = neighborKeys(b.x, b.y);
    for (const key of keys) {
      const bucket = enemyBuckets.get(key);
      if (!bucket) continue;
      for (const enemy of bucket) {
        const dx = enemy.x - b.x;
        const dy = enemy.y - b.y;
        if (dx * dx + dy * dy < (enemy.radius + 4) ** 2) {
          const crit = Math.random() < state.player.critChance;
          const dmg = crit ? state.player.damage * state.player.critMultiplier : state.player.damage;
          enemy.hp -= dmg;
          enemy.hitThisFrame = true;
          if (!state.visualsLow) {
            if (crit) addFloatingText("CRIT", enemy.x, enemy.y - 4, "#f472b6");
          }
          if (b.pierce > 0) {
            b.pierce -= 1;
          } else {
            b.life = -1;
            return;
          }
        }
      }
    }
  });

  // Remove bullets consumed
  state.bullets = state.bullets.filter((b) => b.life > 0);

  // Remove dead enemies & spawn fragments
  state.enemies = state.enemies.filter((e) => {
    if (e.hp <= 0) {
      const fragReward = e.reward * 0.35;
      state.resources.essence += e.reward;
      state.runStats.kills += 1;
      state.runStats.essence += e.reward;
      if (state.fragmentsOrbs.length < FX_BUDGET.fragments) {
        state.fragmentsOrbs.push({
          x: e.x,
          y: e.y,
          value: fragReward,
          vx: (Math.random() - 0.5) * 30,
          vy: (Math.random() - 0.5) * 30,
          life: 12
        });
      } else {
        registerFragmentGain(fragReward, e.x, e.y, true);
      }
      return false;
    }
    return true;
  });

  // Enemy collisions with player
  state.enemies.forEach((e) => {
    const dx = e.x - state.player.x;
    const dy = e.y - state.player.y;
    const distSq = dx * dx + dy * dy;
    const radius = e.radius + state.player.radius;
    if (distSq < radius * radius) {
      const dmg = 18 * dt * (1 + state.wave * 0.05) * (1 - state.player.damageReduction);
      state.player.hp -= dmg;
    }
  });

  if (state.player.hp <= 0 && !state.dead) {
    state.dead = true;
    state.running = false;
  }

  // Progress wave based on time alive
  state.wave += dt * 0.15;

  // Prestige cooldown
  if (state.prestigeCooldown > 0) {
    state.prestigeCooldown = Math.max(0, state.prestigeCooldown - dt);
  }

  // Idle gains
  const idleRate = computeIdleRate();
  state.resources.essence += idleRate * dt;
  state.resources.fragments += idleRate * 0.35 * dt;

  // Floating texts motion & ticker decay
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

function softReset() {
  state.wave = 1;
  state.player.hp = state.player.maxHp;
  state.player.x = canvas.width / 2;
  state.player.y = canvas.height / 2;
  state.enemies = [];
  state.bullets = [];
  state.floatingText = [];
  state.fragmentsOrbs = [];
  state.runStats = { kills: 0, fragments: 0, essence: 0 };
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

  // Update affordability without re-rendering cards
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

  // Prestige cooldown label
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

const loop = GameLoop({
  update(dt) {
    const clamped = Math.min(0.05, dt);
    update(clamped);
    updateHud();
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

function bootstrap() {
  resizeCanvas(true);
  loadSave();
  initUI();
  window.addEventListener("resize", () => resizeCanvas());
  loop.start();
  setInterval(saveGame, 5000);
}

bootstrap();
