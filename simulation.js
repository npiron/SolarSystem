const canvas = document.getElementById("arena");
const ctx = canvas.getContext("2d");
const pauseBtn = document.getElementById("pause");
const resetProgressBtn = document.getElementById("resetProgress");
const softPrestigeBtn = document.getElementById("softPrestige");

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
  }
];

const state = {
  running: true,
  wave: 1,
  time: 0,
  lastFrame: performance.now(),
  enemies: [],
  bullets: [],
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
    regen: 2
  },
  resources: {
    essence: 0,
    fragments: 0,
    idleMultiplier: 1
  },
  spawnTimer: 0,
  overlayFade: 0.12
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
      regen: state.player.regen
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

function applyUpgradeEffects() {
  // Reset to base before reapplying
  state.player.damage = 12;
  state.player.fireDelay = 0.65;
  state.player.projectiles = 1;
  state.player.regen = 2;
  upgrades.forEach((upgrade) => {
    for (let i = 0; i < upgrade.level; i++) {
      upgrade.apply(state);
    }
  });
}

function formatNumber(value) {
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
  return value.toFixed(0);
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
  generators.forEach((gen) => {
    const card = document.createElement("div");
    card.className = "card";
    const info = document.createElement("div");
    info.innerHTML = `<h3>${gen.name}</h3><p>${gen.level} niveau(x) · ${gen.rate.toFixed(2)} /s</p>`;
    const btn = document.createElement("button");
    btn.textContent = `Acheter ${formatNumber(gen.cost)} ⚡`;
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
  upgrades.forEach((up) => {
    const card = document.createElement("div");
    card.className = "card";
    const info = document.createElement("div");
    info.innerHTML = `<h3>${up.name}</h3><p>${up.description}</p><p class="muted">Niveau ${up.level}/${up.max}</p>`;
    const btn = document.createElement("button");
    btn.textContent = `Acheter ${formatNumber(up.cost)} ✦`;
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

  const hp = 20 + state.wave * 6;
  const speed = 40 + state.wave * 1.6;
  state.enemies.push({ x, y, radius: 10, hp, maxHp: hp, speed, reward: 2 + state.wave * 0.6 });
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
      dx: Math.cos(angle + spread) * 260,
      dy: Math.sin(angle + spread) * 260,
      life: 1.2
    });
  }
}

function update(dt) {
  if (!state.running) return;

  state.time += dt;
  state.player.fireTimer -= dt;
  state.spawnTimer -= dt;

  if (state.spawnTimer <= 0) {
    const rate = Math.min(2.2, 0.6 + state.wave * 0.04);
    spawnEnemy();
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
  });

  // Collisions bullets
  state.enemies.forEach((enemy) => {
    state.bullets.forEach((b) => {
      const dx = enemy.x - b.x;
      const dy = enemy.y - b.y;
      if (dx * dx + dy * dy < (enemy.radius + 4) ** 2) {
        enemy.hp -= state.player.damage;
        b.life = -1;
      }
    });
  });

  // Remove bullets consumed
  state.bullets = state.bullets.filter((b) => b.life > 0);

  // Remove dead enemies
  state.enemies = state.enemies.filter((e) => {
    if (e.hp <= 0) {
      state.resources.essence += e.reward;
      state.resources.fragments += e.reward * 0.35;
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
      state.player.hp -= 18 * dt * (1 + state.wave * 0.05);
    }
  });

  if (state.player.hp <= 0) {
    softReset();
  }

  // Progress wave based on time alive
  state.wave += dt * 0.15;

  // Idle gains
  const idleRate = computeIdleRate();
  state.resources.essence += idleRate * dt;
  state.resources.fragments += idleRate * 0.35 * dt;
}

function softReset() {
  state.wave = 1;
  state.player.hp = state.player.maxHp;
  state.player.x = canvas.width / 2;
  state.player.y = canvas.height / 2;
  state.enemies = [];
  state.bullets = [];
}

function prestige() {
  const bonus = 1 + Math.sqrt(state.wave) * 0.25;
  state.resources.idleMultiplier *= bonus;
  generators.forEach((g) => {
    g.rate = g.baseRate * Math.pow(1.12, g.level) * state.resources.idleMultiplier;
  });
  softReset();
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
    ctx.fillStyle = palette[idx % palette.length];
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(e.x - e.radius, e.y - e.radius - 10, e.radius * 2, 6);
    ctx.fillStyle = "#22c55e";
    ctx.fillRect(e.x - e.radius, e.y - e.radius - 10, (e.hp / e.maxHp) * e.radius * 2, 6);
  });
}

function updateHud() {
  essenceEl.textContent = formatNumber(state.resources.essence);
  fragmentsEl.textContent = formatNumber(state.resources.fragments);
  idleRateEl.textContent = `${computeIdleRate().toFixed(2)} /s`;
  waveEl.textContent = state.wave.toFixed(1);
  hpEl.textContent = `${state.player.hp.toFixed(0)} / ${state.player.maxHp}`;
  const dps = (state.player.damage / state.player.fireDelay) * state.player.projectiles;
  dpsEl.textContent = dps.toFixed(1);
  spawnRateEl.textContent = `${Math.min(2.2, 0.6 + state.wave * 0.04).toFixed(2)} /s`;
}

function loop(now) {
  const dt = Math.min(0.05, (now - state.lastFrame) / 1000);
  state.lastFrame = now;
  update(dt);
  render();
  updateHud();
  requestAnimationFrame(loop);
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
    prestige();
  });

  renderGenerators();
  renderUpgrades();
}

function bootstrap() {
  loadSave();
  initUI();
  renderGenerators();
  renderUpgrades();
  state.lastFrame = performance.now();
  requestAnimationFrame(loop);
  setInterval(saveGame, 5000);
}

bootstrap();
