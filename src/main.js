import * as PIXI from "https://cdn.jsdelivr.net/npm/pixi.js@7.4.2/dist/pixi.min.mjs";
import { STORAGE_KEY, TAU, icons, palette } from "./config/constants.js";
import { createGenerators } from "./config/generators.js";
import { createUpgrades } from "./config/upgrades.js";
import { updateCombat } from "./systems/combat.js";
import { debugPing, formatNumber, updateFloatingText, updateHud } from "./systems/hud.js";
import { updateSpawn } from "./systems/spawn.js";

const canvas = document.getElementById("arena");
const app = new PIXI.Application({
  view: canvas,
  antialias: true,
  backgroundAlpha: 0,
});
app.stop();

const assetPaths = {
  background: new URL("../public/assets/Medieval RTS/Vector/medievalRTS_vector.svg", import.meta.url).href,
  player: new URL("../public/assets/Free - Raven Fantasy Icons/Separated Files/64x64/fc1181.png", import.meta.url).href,
  fragment: new URL("../public/assets/Free - Raven Fantasy Icons/Separated Files/64x64/fc1805.png", import.meta.url).href,
  enemy: new URL("../public/assets/Free - Raven Fantasy Icons/Separated Files/64x64/fc1173.png", import.meta.url).href
};
const textures = {};

const arenaLayers = {
  background: new PIXI.Container(),
  entities: new PIXI.Container(),
  overlay: new PIXI.Container(),
};

app.stage.addChild(arenaLayers.background, arenaLayers.entities, arenaLayers.overlay);

const paletteHex = palette.map((color) => PIXI.utils.string2hex(color));
const colors = {
  player: PIXI.utils.string2hex("#22d3ee"),
  collect: PIXI.utils.string2hex("#34d399"),
  bulletLow: PIXI.utils.string2hex("#e2e8f0"),
  bulletHigh: PIXI.utils.string2hex("#fef3c7"),
  fragment: PIXI.utils.string2hex("#f472b6"),
  fragmentRing: PIXI.utils.string2hex("#f472b6"),
  elite: PIXI.utils.string2hex("#f97316"),
  hpBg: 0x000000,
  hpFg: PIXI.utils.string2hex("#22c55e"),
  hudBg: 0x000000,
  hudBorder: 0xffffff,
};
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
    x: app.renderer.width / 2,
    y: app.renderer.height / 2,
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
  const { width, height } = app.renderer;
  state.player.x = Math.max(30, Math.min(width - 30, state.player.x));
  state.player.y = Math.max(30, Math.min(height - 30, state.player.y));
}

function resizeCanvas(center = false) {
  const rect = canvas.parentElement?.getBoundingClientRect();
  const width = rect?.width || canvas.width || 960;
  const height = rect?.height || canvas.height || 600;
  app.renderer.resize(width, height);
  if (center) {
    state.player.x = width / 2;
    state.player.y = height / 2;
  }
  clampPlayerToBounds();
}

const uiRefs = {
  generatorButtons: new Map(),
  upgradeButtons: new Map()
};

async function loadTextures() {
  const entries = await Promise.all(
    Object.entries(assetPaths).map(async ([key, url]) => {
      const texture = await PIXI.Assets.load(url);
      return [key, texture];
    })
  );
  entries.forEach(([key, texture]) => {
    textures[key] = texture;
  });
}

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
  state.player.x = app.renderer.width / 2;
  state.player.y = app.renderer.height / 2;
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
  const { width, height } = app.renderer;

  arenaLayers.background.removeChildren();
  arenaLayers.entities.removeChildren();
  arenaLayers.overlay.removeChildren();

  if (!state.visualsLow) {
    const background = new PIXI.Container();
    if (textures.background) {
      const pattern = new PIXI.TilingSprite(textures.background, width, height);
      pattern.alpha = 0.12;
      pattern.tint = 0xe8dfce;
      background.addChild(pattern);
    }
    const grid = new PIXI.Graphics();
    grid.lineStyle({ color: 0xffffff, alpha: 0.04, width: 1 });
    for (let x = 0; x < width; x += 60) {
      grid.moveTo(x, 0);
      grid.lineTo(x, height);
    }
    for (let y = 0; y < height; y += 60) {
      grid.moveTo(0, y);
      grid.lineTo(width, y);
    }
    background.addChild(grid);
    arenaLayers.background.addChild(background);
  }

  const entities = new PIXI.Container();
  const playerContainer = new PIXI.Container();
  const aura = new PIXI.Graphics();
  aura.beginFill(colors.player, 0.12);
  aura.drawCircle(0, 0, state.player.radius + 16);
  aura.endFill();
  aura.lineStyle({ color: colors.collect, alpha: 0.2, width: 2 });
  aura.drawCircle(0, 0, state.player.collectRadius * 0.45);
  aura.lineStyle(0);
  aura.position.set(state.player.x, state.player.y);
  playerContainer.addChild(aura);

  if (textures.player) {
    const player = new PIXI.Sprite(textures.player);
    player.anchor.set(0.5);
    player.tint = colors.player;
    player.width = state.player.radius * 3;
    player.height = state.player.radius * 3;
    player.position.set(state.player.x, state.player.y);
    playerContainer.addChild(player);
  } else {
    const fallback = new PIXI.Graphics();
    fallback.beginFill(colors.player, 1);
    fallback.drawCircle(0, 0, state.player.radius);
    fallback.endFill();
    fallback.position.set(state.player.x, state.player.y);
    playerContainer.addChild(fallback);
  }

  entities.addChild(playerContainer);

  const bulletsLayer = new PIXI.Graphics();
  bulletsLayer.beginFill(state.visualsLow ? colors.bulletLow : colors.bulletHigh, 0.9);
  state.bullets.forEach((b) => {
    bulletsLayer.drawCircle(b.x, b.y, 4);
  });
  bulletsLayer.endFill();
  if (!state.visualsLow) {
    bulletsLayer.beginFill(colors.bulletHigh, 0.25);
    state.bullets.forEach((b) => {
      bulletsLayer.drawCircle(b.x, b.y, 8);
    });
    bulletsLayer.endFill();
  }
  entities.addChild(bulletsLayer);

  const fragmentsLayer = new PIXI.Container();
  state.fragmentsOrbs.forEach((f) => {
    if (textures.fragment) {
      const frag = new PIXI.Sprite(textures.fragment);
      frag.anchor.set(0.5);
      frag.tint = colors.fragment;
      frag.width = 14;
      frag.height = 14;
      frag.position.set(f.x, f.y);
      fragmentsLayer.addChild(frag);
    } else {
      const frag = new PIXI.Graphics();
      frag.beginFill(colors.fragment);
      frag.drawCircle(0, 0, 6);
      frag.endFill();
      frag.position.set(f.x, f.y);
      fragmentsLayer.addChild(frag);
    }
    if (!state.visualsLow) {
      const ring = new PIXI.Graphics();
      ring.lineStyle({ color: colors.fragmentRing, alpha: 0.5, width: 2 });
      ring.drawCircle(f.x, f.y, 11);
      fragmentsLayer.addChild(ring);
    }
  });
  entities.addChild(fragmentsLayer);

  const enemiesLayer = new PIXI.Container();
  state.enemies.forEach((e, idx) => {
    if (textures.enemy) {
      const enemy = new PIXI.Sprite(textures.enemy);
      enemy.anchor.set(0.5);
      enemy.tint = e.elite ? colors.elite : paletteHex[idx % paletteHex.length];
      enemy.width = e.radius * 2.4;
      enemy.height = e.radius * 2.4;
      enemy.position.set(e.x, e.y);
      enemiesLayer.addChild(enemy);
    } else {
      const enemy = new PIXI.Graphics();
      enemy.beginFill(e.elite ? colors.elite : paletteHex[idx % paletteHex.length]);
      enemy.drawCircle(0, 0, e.radius);
      enemy.endFill();
      enemy.position.set(e.x, e.y);
      enemiesLayer.addChild(enemy);
    }
    if (!state.visualsLow || e.hitThisFrame) {
      const hpBg = new PIXI.Graphics();
      hpBg.beginFill(colors.hpBg, 0.4);
      hpBg.drawRect(e.x - e.radius, e.y - e.radius - 12, e.radius * 2, 6);
      hpBg.endFill();
      enemiesLayer.addChild(hpBg);

      const hpFg = new PIXI.Graphics();
      hpFg.beginFill(colors.hpFg);
      hpFg.drawRect(e.x - e.radius, e.y - e.radius - 12, (e.hp / e.maxHp) * e.radius * 2, 6);
      hpFg.endFill();
      enemiesLayer.addChild(hpFg);
    }
  });
  entities.addChild(enemiesLayer);

  arenaLayers.entities.addChild(entities);

  const floatingLayer = new PIXI.Container();
  state.floatingText.forEach((f) => {
    const text = new PIXI.Text({
      text: f.text,
      style: {
        fontFamily: "Space Grotesk",
        fontSize: 14,
        fill: f.color
      }
    });
    text.alpha = Math.max(0, f.life);
    text.x = f.x;
    text.y = f.y - (1.5 - f.life) * 24;
    floatingLayer.addChild(text);
  });
  arenaLayers.overlay.addChild(floatingLayer);

  const hudLayer = new PIXI.Container();
  const hud = new PIXI.Graphics();
  const x = 12;
  const y = 12;
  const w = 210;
  const h = 150;
  const r = 10;
  hud.beginFill(colors.hudBg, 0.45);
  hud.lineStyle({ color: colors.hudBorder, alpha: 0.08, width: 1 });
  hud.drawRoundedRect(x, y, w, h, r);
  hud.endFill();
  hudLayer.addChild(hud);

  const hudTexts = [
    { text: `${icons.wave} Vague ${state.wave.toFixed(1)}`, y: 40, color: "#e2e8f0" },
    { text: `⚔️ Kills ${state.runStats.kills}`, y: 64, color: "#e2e8f0" },
    { text: `${icons.fragments} Fragments ${formatNumber(state.runStats.fragments)}`, y: 88, color: "#e2e8f0" },
    { text: `${icons.essence} Essence ${formatNumber(state.runStats.essence)}`, y: 112, color: "#e2e8f0" }
  ];

  if (state.gainTicker.fragments > 0) {
    hudTexts.push({ text: `⇡ +${formatNumber(state.gainTicker.fragments)} ✦`, y: 136, color: "#f472b6" });
  }

  hudTexts.forEach(({ text, y: ty, color }) => {
    const label = new PIXI.Text({
      text,
      style: {
        fontFamily: "Space Grotesk",
        fontSize: 16,
        fill: color
      }
    });
    label.x = 24;
    label.y = ty;
    hudLayer.addChild(label);
  });

  arenaLayers.overlay.addChild(hudLayer);
}

app.ticker.add((delta) => {
  const dt = Math.min(0.05, delta / 60);
  update(dt);
  updateHud(state, hudContext);
  render();
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

async function bootstrap() {
  resizeCanvas(true);
  await loadTextures();
  loadSave();
  initUI();
  window.addEventListener("resize", () => resizeCanvas());
  app.start();
  setInterval(saveGame, 5000);
}

bootstrap();
