import { init, GameLoop } from "https://unpkg.com/kontra@9/kontra.mjs";

const { canvas, context: ctx } = init("arena");
const pauseBtn = document.getElementById("pause");
const resetProgressBtn = document.getElementById("resetProgress");
const softPrestigeBtn = document.getElementById("softPrestige");
const restartRunBtn = document.getElementById("restartRun");
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

const STORAGE_KEY = "neo-survivors-save";
const TAU = Math.PI * 2;

const palette = ["#22d3ee", "#a78bfa", "#f472b6", "#f97316", "#34d399"];
const icons = {
  essence: "⚡",
  fragments: "✦",
  wave: "🌊",
  reach: "📡",
  speed: "💨",
  shield: "🧿"
};

const generators = [
  { id: "drone", name: "Drones collecteurs", baseRate: 0.2, rate: 0.2, level: 0, cost: 15 },
  { id: "forge", name: "Forge astrale", baseRate: 0.8, rate: 0.8, level: 0, cost: 60 },
  { id: "spires", name: "Spires quantiques", baseRate: 3, rate: 3, level: 0, cost: 250 }
];

const upgrades = [
  {
    id: "attack",
    name: "Projectiles instables",
    description: "+25% dégâts par niveau",
    cost: 30,
    baseCost: 30,
    level: 0,
    max: 50,
    apply: (state) => {
      state.player.damage *= 1.25;
    }
  },
  {
    id: "firerate",
    name: "Cadence hypersonique",
    description: "+15% vitesse de tir",
    cost: 45,
    baseCost: 45,
    level: 0,
    max: 40,
    apply: (state) => {
      state.player.fireDelay *= 0.85;
    }
  },
  {
    id: "regen",
    name: "Gel réparateur",
    description: "+3 PV/s",
    cost: 50,
    baseCost: 50,
    level: 0,
    max: 15,
    apply: (state) => {
      state.player.regen += 3;
    }
  },
  {
    id: "aoe",
    name: "Pulsar chaotique",
    description: "+1 projectile par tir",
    cost: 120,
    baseCost: 120,
    level: 0,
    max: 20,
    apply: (state) => {
      state.player.projectiles += 1;
    }
  },
  {
    id: "range",
    name: "Portée fractale",
    description: "+20% portée des projectiles",
    cost: 80,
    baseCost: 80,
    level: 0,
    max: 25,
    apply: (state) => {
      state.player.range *= 1.2;
    }
  },
  {
    id: "velocity",
    name: "Balistique ionisée",
    description: "+15% vitesse des projectiles",
    cost: 140,
    baseCost: 140,
    level: 0,
    max: 20,
    apply: (state) => {
      state.player.bulletSpeed *= 1.15;
    }
  },
  {
    id: "shield",
    name: "Bouclier prismatique",
    description: "Réduit les dégâts subis de 5%",
    cost: 220,
    baseCost: 220,
    level: 0,
    max: 12,
    apply: (state) => {
      state.player.damageReduction = Math.min(0.7, state.player.damageReduction + 0.05);
    }
  },
  {
    id: "pierce",
    name: "Percée quantique",
    description: "+1 traversée de projectile",
    cost: 260,
    baseCost: 260,
    level: 0,
    max: 10,
    apply: (state) => {
      state.player.pierce += 1;
    }
  }
];

const state = {
  running: true,
  wave: 1,
  time: 0,
  enemies: [],
  bullets: [],
  floatingText: [],
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
    pierce: 0
  },
  resources: {
    essence: 0,
    fragments: 0,
    idleMultiplier: 1
  },
  spawnTimer: 0,
  overlayFade: 0.12,
  prestigeCooldown: 0,
  enemyBullets: [],
  dead: false
};

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
      pierce: state.player.pierce
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
  return value.toExponential(2);
}

function addFloatingText(text, x, y, color = "#fef08a") {
  state.floatingText.push({ text, x, y, life: 1.4, color });
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

function fire() {
  const target = state.enemies[0];
  if (!target) return;
  const angle = Math.atan2(target.y - state.player.y, target.x - state.player.x);
  for (let i = 0; i < state.player.projectiles; i++) {
    const spread = (i - (state.player.projectiles - 1) / 2) * 0.12;
    state.bullets.push({
      x: state.player.x,
      y: state.player.y,
      dx: Math.cos(angle + spread) * state.player.bulletSpeed,
      dy: Math.sin(angle + spread) * state.player.bulletSpeed,
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

  if (state.spawnTimer <= 0) {
    const rate = spawnRate();
    const pack = packSize();
    for (let i = 0; i < pack; i++) {
      spawnEnemy();
    }
    state.spawnTimer = 1 / rate;
  }

  // Auto movement : orbiting drift
  const orbit = Math.sin(state.time * 0.6) * 0.4;
  state.player.x += Math.cos(state.time * 0.8 + orbit) * state.player.speed * dt;
  state.player.y += Math.sin(state.time * 0.5) * state.player.speed * dt;
  state.player.x = Math.max(30, Math.min(canvas.width - 30, state.player.x));
  state.player.y = Math.max(30, Math.min(canvas.height - 30, state.player.y));

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
  state.bullets = state.bullets.filter((b) => b.life > 0);

  // Enemies
  state.enemies.forEach((e) => {
    const angle = Math.atan2(state.player.y - e.y, state.player.x - e.x);
    e.x += Math.cos(angle) * e.speed * dt;
    e.y += Math.sin(angle) * e.speed * dt;

    if (state.wave >= 3) {
      e.fireTimer -= dt;
      if (e.fireTimer <= 0) {
        const bulletAngle = Math.atan2(state.player.y - e.y, state.player.x - e.x);
        const speed = 160 + state.wave * 4;
        state.enemyBullets.push({
          x: e.x,
          y: e.y,
          dx: Math.cos(bulletAngle) * speed,
          dy: Math.sin(bulletAngle) * speed,
          life: 4
        });
        e.fireTimer = Math.max(1, e.fireDelay + Math.random());
      }
    }
  });

  // Collisions bullets
  state.enemies.forEach((enemy) => {
    state.bullets.forEach((b) => {
      const dx = enemy.x - b.x;
      const dy = enemy.y - b.y;
      if (dx * dx + dy * dy < (enemy.radius + 4) ** 2) {
        enemy.hp -= state.player.damage;
        if (b.pierce > 0) {
          b.pierce -= 1;
        } else {
          b.life = -1;
        }
      }
    });
  });

  // Remove bullets consumed
  state.bullets = state.bullets.filter((b) => b.life > 0);

  // Remove dead enemies
  state.enemies = state.enemies.filter((e) => {
    if (e.hp <= 0) {
      const fragReward = e.reward * 0.35;
      state.resources.essence += e.reward;
      state.resources.fragments += fragReward;
      state.runStats.kills += 1;
      state.runStats.fragments += fragReward;
      state.runStats.essence += e.reward;
      addFloatingText(`+${formatNumber(fragReward)} ${icons.fragments}`, e.x, e.y - 12, "#f472b6");
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

  // Enemy bullet collisions with player
  state.enemyBullets.forEach((b) => {
    const dx = b.x - state.player.x;
    const dy = b.y - state.player.y;
    if (dx * dx + dy * dy < (state.player.radius + 3) ** 2) {
      const dmg = 25 * dt * (1 - state.player.damageReduction);
      state.player.hp -= dmg;
      b.life = -1;
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

  // Floating texts motion
  state.floatingText = state.floatingText
    .map((f) => ({ ...f, y: f.y - 18 * dt, life: f.life - dt }))
    .filter((f) => f.life > 0);

  // Enemy bullets
  state.enemyBullets.forEach((b) => {
    b.x += b.dx * dt;
    b.y += b.dy * dt;
    b.life -= dt;
  });
  state.enemyBullets = state.enemyBullets.filter((b) => b.life > 0);
}

function softReset() {
  state.wave = 1;
  state.player.hp = state.player.maxHp;
  state.player.x = canvas.width / 2;
  state.player.y = canvas.height / 2;
  state.enemies = [];
  state.bullets = [];
  state.enemyBullets = [];
  state.floatingText = [];
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

  // Player trail
  ctx.save();
  ctx.fillStyle = "rgba(34,211,238,0.15)";
  ctx.beginPath();
  ctx.arc(state.player.x, state.player.y, state.player.radius + 12, 0, TAU);
  ctx.fill();
  ctx.restore();

  // Player
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
  ctx.beginPath();
  ctx.arc(state.player.x, state.player.y, state.player.radius, 0, TAU);
  ctx.fill();

  // Bullets
  ctx.fillStyle = "#fef3c7";
  state.bullets.forEach((b) => {
    ctx.beginPath();
    ctx.arc(b.x, b.y, 4, 0, TAU);
    ctx.fill();
  });

  // Enemies
  state.enemies.forEach((e, idx) => {
    ctx.fillStyle = e.elite ? "#f97316" : palette[idx % palette.length];
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(e.x - e.radius, e.y - e.radius - 10, e.radius * 2, 6);
    ctx.fillStyle = "#22c55e";
    ctx.fillRect(e.x - e.radius, e.y - e.radius - 10, (e.hp / e.maxHp) * e.radius * 2, 6);
  });

  // Enemy bullets
  ctx.fillStyle = "#f87171";
  state.enemyBullets.forEach((b) => {
    ctx.beginPath();
    ctx.arc(b.x, b.y, 3, 0, TAU);
    ctx.fill();
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
  const h = 110;
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
  ctx.restore();
}

function updateHud() {
  essenceEl.textContent = formatNumber(state.resources.essence);
  fragmentsEl.textContent = formatNumber(state.resources.fragments);
  idleRateEl.textContent = `${formatNumber(computeIdleRate())} /s`;
  waveEl.textContent = state.wave.toFixed(1);
  hpEl.textContent = `${state.player.hp.toFixed(0)} / ${state.player.maxHp}`;
  const dps = (state.player.damage / state.player.fireDelay) * state.player.projectiles;
  dpsEl.textContent = dps.toFixed(1);
  const totalSpawn = spawnRate() * packSize();
  spawnRateEl.textContent = `${totalSpawn.toFixed(2)} /s`;
  document.getElementById("shield").textContent = `${Math.round(state.player.damageReduction * 100)}%`;

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

  debugBtns.giveEssence?.addEventListener("click", () => {
    state.resources.essence += 1_000_000;
    renderGenerators();
    saveGame();
  });
  debugBtns.giveFragments?.addEventListener("click", () => {
    state.resources.fragments += 1_000_000;
    renderUpgrades();
    saveGame();
  });
  debugBtns.skipWave?.addEventListener("click", () => {
    state.wave += 10;
    saveGame();
  });
  debugBtns.nuke?.addEventListener("click", () => {
    state.enemies = [];
    state.enemyBullets = [];
  });

  renderGenerators();
  renderUpgrades();
}

function bootstrap() {
  loadSave();
  initUI();
  renderGenerators();
  renderUpgrades();
  loop.start();
  setInterval(saveGame, 5000);
}

bootstrap();
