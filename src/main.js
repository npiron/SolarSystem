import * as PIXI from "https://cdn.jsdelivr.net/npm/pixi.js@7.4.2/dist/pixi.min.mjs";
import gsap from "https://cdn.jsdelivr.net/npm/gsap@3.12.5/+esm";
import { MAX_OFFLINE_SECONDS, STORAGE_KEY, VERSION, icons } from "./config/constants.ts";
import { createGenerators } from "./config/generators.ts";
import { TALENT_RESET_COST } from "./config/talents.ts";
import { createUpgrades } from "./config/upgrades.ts";
import { updateCombat } from "./systems/combat.ts";
import { initAssist } from "./systems/assist.ts";
import { debugPing, formatNumber, updateFloatingText, updateHud } from "./systems/hud.ts";
import { accelerationFromDirection, applyInertiaStep } from "./systems/movement.ts";
import { updateSpawn } from "./systems/spawn.ts";
import { initSound, playPrestige, playPurchase, playUiToggle, resumeAudio, setAudioEnabled } from "./systems/sound.ts";
import {
  computeTalentBonuses,
  canUnlockTalent,
  hydrateTalents,
  prerequisitesMet,
  resetTalents,
  unlockTalent
} from "./systems/talents.ts";
import { WebGL2Renderer } from "./renderer/webgl2Renderer.ts";
import { acquireFloatingText, releaseFloatingText } from "./renderer/floatingText.ts";
import { colors, hexStringToVec4, paletteHex, paletteVec4, webglColors } from "./renderer/colors.ts";
import { createEffects } from "./renderer/effects.ts";

/**
 * Get the PIXI color for an enemy based on its type.
 * @param {string} type - Enemy type: 'weak', 'normal', 'strong', or 'elite'
 * @returns {number} PIXI hex color value
 */
function getEnemyColor(type) {
  switch (type) {
    case 'weak': return colors.enemyWeak;
    case 'normal': return colors.enemyNormal;
    case 'strong': return colors.enemyStrong;
    case 'elite': return colors.enemyElite;
    default: return colors.enemyNormal;
  }
}

/**
 * Get the WebGL color array for an enemy based on its type.
 * @param {string} type - Enemy type: 'weak', 'normal', 'strong', or 'elite'
 * @returns {number[]} WebGL color as [r, g, b, a] normalized values
 */
function getEnemyColorWebGL(type) {
  switch (type) {
    case 'weak': return webglColors.enemyWeak;
    case 'normal': return webglColors.enemyNormal;
    case 'strong': return webglColors.enemyStrong;
    case 'elite': return webglColors.enemyElite;
    default: return webglColors.enemyNormal;
  }
}

/**
 * Get visual properties for a fragment orb based on its value.
 * Higher value fragments are larger and have brighter colors.
 * @param {number} value - Fragment value
 * @param {boolean} allowFx - Whether effects are enabled
 * @returns {{ color: number[], ringColor: number[], radius: number }}
 */
function getFragmentVisuals(value, allowFx) {
  // Thresholds for fragment value categories
  const LOW_THRESHOLD = 3;
  const HIGH_THRESHOLD = 10;
  
  if (value < LOW_THRESHOLD) {
    return {
      color: webglColors.fragmentLow,
      ringColor: webglColors.fragmentRingLow,
      radius: 5
    };
  } else if (value >= HIGH_THRESHOLD) {
    return {
      color: webglColors.fragmentHigh,
      ringColor: webglColors.fragmentRingHigh,
      radius: 8
    };
  } else {
    return {
      color: webglColors.fragmentMedium,
      ringColor: webglColors.fragmentRingMedium,
      radius: 6
    };
  }
}

/**
 * Get PIXI color for fragment orb based on value (for Canvas fallback).
 * @param {number} value - Fragment value
 * @returns {number} PIXI hex color value
 */
function getFragmentColor(value) {
  const LOW_THRESHOLD = 3;
  const HIGH_THRESHOLD = 10;
  
  if (value < LOW_THRESHOLD) return colors.fragmentLow;
  if (value >= HIGH_THRESHOLD) return colors.fragmentHigh;
  return colors.fragmentMedium;
}

/**
 * Get radius for fragment orb based on value.
 * @param {number} value - Fragment value
 * @returns {number} Radius in pixels
 */
function getFragmentRadius(value) {
  const LOW_THRESHOLD = 3;
  const HIGH_THRESHOLD = 10;
  
  if (value < LOW_THRESHOLD) return 5;
  if (value >= HIGH_THRESHOLD) return 8;
  return 6;
}

const canvas = document.getElementById("arena");
const webgl2Canvas = document.getElementById("webgl2");
const webgl2Renderer = webgl2Canvas ? WebGL2Renderer.create(webgl2Canvas) : null;

const app = new PIXI.Application({
  view: canvas,
  antialias: true,
  backgroundAlpha: 0,
});
app.stop();

const arenaLayers = {
  background: new PIXI.Container(),
  entities: new PIXI.Container(),
  overlay: new PIXI.Container(),
};

const hudTextOptions = {
  fontFamily: "Baloo 2, Fredoka, Nunito, sans-serif",
  fontSize: 15,
  fill: "#fff7ed",
  stroke: "#0b1024",
  strokeThickness: 3,
  dropShadow: true,
  dropShadowColor: "#0b1024",
  dropShadowBlur: 5,
  dropShadowAlpha: 0.9,
  dropShadowDistance: 0,
};

const hudTextStyle = new PIXI.TextStyle(hudTextOptions);

// PIXI v7 n'inclut pas `toJSON` sur TextStyle, mais le constructeur de Text
// tente de l'appeler pour sérialiser le style. Sans ce shim, l'initialisation
// du HUD plante et empêche le jeu de se charger. On ajoute donc une version
// minimale qui renvoie simplement les options actuelles.
if (typeof hudTextStyle.toJSON !== "function") {
  hudTextStyle.toJSON = () => ({ ...hudTextOptions });
}

const hudAccentStyle = new PIXI.TextStyle({
  ...hudTextOptions,
  fill: "#f472b6",
});

if (typeof hudAccentStyle.toJSON !== "function") {
  hudAccentStyle.toJSON = () => ({ ...hudTextOptions, fill: "#f472b6" });
}

const renderObjects = {
  backgroundContainer: new PIXI.Container(),
  grid: new PIXI.Graphics(),
  aura: new PIXI.Graphics(),
  playerContainer: null,
  player: new PIXI.Graphics(),
  bullets: new PIXI.Graphics(),
  bulletsGlow: new PIXI.Graphics(),
  fragments: new PIXI.Graphics(),
  fragmentRings: new PIXI.Graphics(),
  enemies: new PIXI.Graphics(),
  enemyHp: new PIXI.Graphics(),
  floatingLayer: new PIXI.Container(),
  hudLayer: new PIXI.Container(),
  hudBg: new PIXI.Graphics(),
  hudLabels: {
    wave: null,
    kills: null,
    fragments: null,
    essence: null,
    gain: null,
  },
};

let backgroundReady = false;

app.stage.addChild(arenaLayers.background, arenaLayers.entities, arenaLayers.overlay);

const { applyAddonFilters } = createEffects(colors);

function buildBackground(width, height) {
  backgroundReady = false;
  renderObjects.backgroundContainer.removeChildren();

  if (webgl2Renderer) {
    webgl2Renderer.setGridEnabled(!state.visualsLow);
    if (!state.visualsLow) {
      webgl2Renderer.resize(width, height);
      backgroundReady = true;
    } else {
      webgl2Renderer.clear();
    }
    return;
  }

  if (!state.visualsLow) {
    renderObjects.grid.clear();
    renderObjects.grid.lineStyle({ color: 0xffd166, alpha: 0.08, width: 2 });
    for (let x = 0; x < width; x += 64) {
      renderObjects.grid.moveTo(x, 0);
      renderObjects.grid.lineTo(x, height);
    }
    for (let y = 0; y < height; y += 64) {
      renderObjects.grid.moveTo(0, y);
      renderObjects.grid.lineTo(width, y);
    }
    renderObjects.backgroundContainer.addChild(renderObjects.grid);
    backgroundReady = true;
  }
}

function setupScene() {
  arenaLayers.background.addChild(renderObjects.backgroundContainer);

  renderObjects.aura.beginFill(colors.player, 0.18);
  renderObjects.aura.drawCircle(0, 0, state.player.radius + 16);
  renderObjects.aura.endFill();
  renderObjects.aura.lineStyle({ color: colors.collect, alpha: 0.28, width: 3 });
  renderObjects.aura.drawCircle(0, 0, state.player.collectRadius * 0.45);
  renderObjects.aura.lineStyle(0);

  // Draw the player as a vector circle
  renderObjects.player.beginFill(colors.player, 1);
  renderObjects.player.drawCircle(0, 0, state.player.radius);
  renderObjects.player.endFill();

  const playerContainer = new PIXI.Container();
  playerContainer.addChild(renderObjects.aura);
  playerContainer.addChild(renderObjects.player);
  renderObjects.playerContainer = playerContainer;

  arenaLayers.entities.addChild(
    playerContainer,
    renderObjects.bullets,
    renderObjects.bulletsGlow,
    renderObjects.fragments,
    renderObjects.fragmentRings,
    renderObjects.enemies,
    renderObjects.enemyHp
  );

  renderObjects.hudLayer.addChild(renderObjects.hudBg);
  renderObjects.hudLabels.wave = new PIXI.Text({ text: "", style: hudTextStyle });
  renderObjects.hudLabels.kills = new PIXI.Text({ text: "", style: hudTextStyle });
  renderObjects.hudLabels.fragments = new PIXI.Text({ text: "", style: hudTextStyle });
  renderObjects.hudLabels.essence = new PIXI.Text({ text: "", style: hudTextStyle });
  renderObjects.hudLabels.gain = new PIXI.Text({ text: "", style: hudAccentStyle });

  const hudEntries = [
    { label: renderObjects.hudLabels.wave, y: 28 },
    { label: renderObjects.hudLabels.kills, y: 48 },
    { label: renderObjects.hudLabels.fragments, y: 68 },
    { label: renderObjects.hudLabels.essence, y: 88 },
    { label: renderObjects.hudLabels.gain, y: 108 },
  ];

  hudEntries.forEach(({ label, y }) => {
    label.x = 24;
    label.y = y;
    renderObjects.hudLayer.addChild(label);
  });

  const x = 12;
  const y = 12;
  const w = 190;
  const h = 126;
  const r = 10;
  renderObjects.hudBg.beginFill(colors.hudBg, 0.45);
  renderObjects.hudBg.lineStyle({ color: colors.hudBorder, alpha: 0.08, width: 1 });
  renderObjects.hudBg.drawRoundedRect(x, y, w, h, r);
  renderObjects.hudBg.endFill();

  // Scale down the HUD block so it doesn't eat too much screen real estate
  renderObjects.hudLayer.scale.set(0.82);
  renderObjects.hudLayer.position.set(4, 4);

  arenaLayers.overlay.addChild(renderObjects.floatingLayer, renderObjects.hudLayer);
}

const pauseBtn = document.getElementById("pause");
const resetProgressBtn = document.getElementById("resetProgress");
const toggleSoundBtn = document.getElementById("toggleSound");
const softPrestigeBtn = document.getElementById("softPrestige");
const restartRunBtn = document.getElementById("restartRun");
const togglePerfBtn = document.getElementById("togglePerf");
const toggleFpsBtn = document.getElementById("toggleFps");
const toggleGlowFxBtn = document.getElementById("toggleGlowFx");
const toggleBloomFxBtn = document.getElementById("toggleBloomFx");
const toggleGrainFxBtn = document.getElementById("toggleGrainFx");
const toggleHudPulseBtn = document.getElementById("toggleHudPulse");
const versionBadge = document.getElementById("versionBadge");
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
const damageRow = document.getElementById("damageRow");
const spawnRateEl = document.getElementById("spawnRate");
const statusEl = document.getElementById("statusMessage");
const generatorsContainer = document.getElementById("generators");
const upgradesContainer = document.getElementById("upgrades");
const talentsContainer = document.getElementById("talents");
const resetTalentsBtn = document.getElementById("resetTalents");
const talentStatusEl = document.getElementById("talentStatus");
const fpsValueEl = document.getElementById("fpsValue");
const fpsCanvas = document.getElementById("fpsGraph");
const quickHelpList = document.getElementById("quickHelpList");
const milestoneList = document.getElementById("milestoneList");
const assistBubbles = document.getElementById("assistBubbles");

const generators = createGenerators();
const upgrades = createUpgrades();
let talents = hydrateTalents();
let talentBonuses = computeTalentBonuses(talents);

const BASE_PLAYER_STATS = {
  damage: 12,
  fireDelay: 0.65,
  projectiles: 1,
  regen: 2,
  range: 1,
  bulletSpeed: 260,
  damageReduction: 0,
  pierce: 0,
  collectRadius: 90,
  critChance: 0.08,
  critMultiplier: 2,
  speed: 95
};

if (versionBadge) {
  versionBadge.textContent = VERSION;
}

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
    vx: 0,
    vy: 0,
    radius: 12,
    ...BASE_PLAYER_STATS,
    hp: 120,
    maxHp: 120,
    fireTimer: 0,
    spin: 0
  },
  resources: {
    essence: 0,
    fragments: 0,
    idleMultiplier: 1
  },
  talents: {
    bonuses: talentBonuses,
  },
  assist: {
    firstShot: false,
    firstPurchase: false,
    firstPrestige: false,
    bestWave: 1,
    completed: []
  },
  spawnTimer: 0,
  overlayFade: 0.12,
  prestigeCooldown: 0,
  dead: false,
  visualsLow: false,
  audio: {
    enabled: true,
  },
  performance: {
    fps: 0,
    history: [],
    maxSamples: 240,
    graphVisible: false
  },
  addons: {
    glow: true,
    bloom: true,
    grain: false,
    hudPulse: true
  }
};

let assistUi = {
  recordShot: () => {},
  recordPurchase: () => {},
  recordPrestige: () => {},
  trackWave: () => {},
  refreshMilestones: () => {}
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
  buildBackground(width, height);
  webgl2Renderer?.resize(width, height);
  if (center) {
    state.player.x = width / 2;
    state.player.y = height / 2;
  }
  clampPlayerToBounds();
  if (state.performance.graphVisible) {
    drawFpsGraph();
  }
  applyAddonFilters(state, renderObjects);
}

const uiRefs = {
  generatorButtons: new Map(),
  upgradeButtons: new Map(),
  talentButtons: new Map()
};

function formatDuration(seconds) {
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const parts = [];
  if (hours) parts.push(`${hours}h`);
  if (minutes || !parts.length) parts.push(`${minutes}m`);
  return parts.join(" ");
}

function loadSave() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const save = JSON.parse(raw);
    Object.assign(state.resources, save.resources || {});
    state.wave = save.wave || state.wave;
    state.audio.enabled = save.audio?.enabled ?? state.audio.enabled;
    state.addons = { ...state.addons, ...save.addons };
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
    state.player.speed = save.player?.speed ?? state.player.speed;
    state.resources.idleMultiplier = save.idleMultiplier || state.resources.idleMultiplier;
    save.generators?.forEach((g, idx) => {
      if (generators[idx]) {
        generators[idx].level = g.level || 0;
        generators[idx].rate = computeGeneratorRate(generators[idx]);
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
    talents = hydrateTalents(save.talents);
    hudContext.talents = talents;
    talentBonuses = computeTalentBonuses(talents);
    state.talents.bonuses = talentBonuses;
    applyProgressionEffects();
    refreshGeneratorRates();
    applyUpgradeEffects();
    state.assist = {
      ...state.assist,
      ...save.assist,
      completed: save.assist?.completed || []
    };
    state.assist.bestWave = Math.max(state.assist.bestWave || 1, state.wave || 1);
    const now = Date.now();
    if (save.lastSeen) {
      const elapsed = Math.max(0, (now - save.lastSeen) / 1000);
      const offlineSeconds = Math.min(MAX_OFFLINE_SECONDS, elapsed);
      grantOfflineGains(offlineSeconds);
      if (elapsed > MAX_OFFLINE_SECONDS) {
        debugPing(state, `⏳ Gains hors-ligne plafonnés à ${formatDuration(MAX_OFFLINE_SECONDS)}`, "#fbbf24");
      }
    }
  } catch (err) {
    console.warn("Save corrupted", err);
  }
}

function saveGame() {
  const data = {
    resources: state.resources,
    wave: state.wave,
    audio: { enabled: state.audio.enabled },
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
      critMultiplier: state.player.critMultiplier,
      speed: state.player.speed
    },
    generators: generators.map((g) => ({ level: g.level, cost: g.cost })),
    upgrades: upgrades.map((u) => ({ level: u.level, cost: u.cost })),
    talents: talents.map((talent) => ({ id: talent.id, unlocked: talent.unlocked })),
    idleMultiplier: state.resources.idleMultiplier,
    assist: {
      firstShot: state.assist.firstShot,
      firstPurchase: state.assist.firstPurchase,
      firstPrestige: state.assist.firstPrestige,
      bestWave: state.assist.bestWave,
      completed: state.assist.completed
    },
    addons: state.addons,
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

function applyProgressionEffects() {
  Object.entries(BASE_PLAYER_STATS).forEach(([key, value]) => {
    state.player[key] = value;
  });

  upgrades.forEach((upgrade) => {
    for (let i = 0; i < upgrade.level; i++) {
      upgrade.apply(state);
    }
  });

  talentBonuses = computeTalentBonuses(talents);
  state.talents.bonuses = talentBonuses;

  state.player.damage *= talentBonuses.damage;
  state.player.fireDelay *= talentBonuses.fireDelay;
  state.player.projectiles += talentBonuses.projectiles;
  state.player.regen += talentBonuses.regen;
  state.player.damageReduction = Math.min(0.85, state.player.damageReduction + talentBonuses.damageReduction);
  state.player.collectRadius *= talentBonuses.collectRadius;
  state.player.critChance = Math.min(0.95, state.player.critChance + talentBonuses.critChance);
  state.player.critMultiplier *= talentBonuses.critMultiplier;
  state.player.bulletSpeed *= talentBonuses.bulletSpeed;
}

function computeGeneratorRate(generator) {
  return generator.baseRate * Math.pow(1.10, generator.level) * state.resources.idleMultiplier * talentBonuses.economy;
}

function refreshGeneratorRates() {
  generators.forEach((gen) => {
    gen.rate = computeGeneratorRate(gen);
  });
}

function computeIdleRate() {
  return generators.reduce((sum, g) => sum + computeGeneratorRate(g) * g.level, 0);
}

function recordFpsSample() {
  const frameMs = Math.max(1, app.ticker.deltaMS || 0);
  const fps = 1000 / frameMs;
  state.performance.fps = fps;
  state.performance.history.push(fps);
  if (state.performance.history.length > state.performance.maxSamples) {
    state.performance.history.shift();
  }
}

function drawFpsGraph() {
  if (!fpsCanvas || !state.performance.graphVisible) return;
  if (fpsCanvas.width !== fpsCanvas.clientWidth) fpsCanvas.width = fpsCanvas.clientWidth;
  if (fpsCanvas.height !== fpsCanvas.clientHeight) fpsCanvas.height = fpsCanvas.clientHeight;
  const ctx = fpsCanvas.getContext("2d");
  if (!ctx) return;

  const history = state.performance.history;
  const { width, height } = fpsCanvas;
  ctx.clearRect(0, 0, width, height);
  if (!history.length) return;

  const maxFps = Math.max(30, ...history);
  const minFps = Math.min(0, ...history);
  const range = Math.max(1, maxFps - minFps);
  const stepX = history.length > 1 ? width / (history.length - 1) : width;

  const targetFps = 60;
  const targetY = height - ((targetFps - minFps) / range) * height;
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = "rgba(255, 220, 170, 0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, targetY);
  ctx.lineTo(width, targetY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = "#d6b96c";
  ctx.lineWidth = 2;
  ctx.beginPath();
  history.forEach((fpsValue, idx) => {
    const x = idx * stepX;
    const y = height - ((fpsValue - minFps) / range) * height;
    if (idx === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.stroke();

  ctx.fillStyle = "rgba(214, 185, 108, 0.12)";
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();
}

function updatePerformanceHud() {
  if (fpsValueEl) {
    fpsValueEl.textContent = Math.round(state.performance.fps).toString();
  }
  if (state.performance.graphVisible) {
    drawFpsGraph();
  }
}

const hudContext = {
  elements: {
    essenceEl,
    fragmentsEl,
    idleRateEl,
    waveEl,
    hpEl,
    dpsEl,
    damageRow,
    spawnRateEl,
    pauseBtn,
    softPrestigeBtn,
    statusEl
  },
  uiRefs,
  generators,
  upgrades,
  talents,
  computeIdleRate,
  canUnlockTalent
};

function buyGenerator(gen) {
  if (state.resources.essence < gen.cost) return;
  state.resources.essence -= gen.cost;
  gen.level += 1;
  gen.cost = Math.ceil(gen.cost * 1.30 + gen.level * 1.5);
  gen.rate = computeGeneratorRate(gen);
  refreshGeneratorRates();
  playPurchase();
  assistUi.recordPurchase();
}

function renderGenerators() {
  generatorsContainer.innerHTML = "";
  uiRefs.generatorButtons.clear();
  generators.forEach((gen) => {
    const card = document.createElement("div");
    card.className = "card";
    const info = document.createElement("div");
    gen.rate = computeGeneratorRate(gen);
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
  upgrade.cost = Math.ceil(upgrade.cost * 1.40 + upgrade.level * 2.5);
  applyProgressionEffects();
  playPurchase();
  assistUi.recordPurchase();
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

function buyTalent(talent) {
  if (!unlockTalent(talent, talents, state)) return false;
  applyProgressionEffects();
  refreshGeneratorRates();
  playPurchase();
  return true;
}

function renderTalents() {
  if (!talentsContainer) return;
  talentsContainer.innerHTML = "";
  uiRefs.talentButtons.clear();
  let unlockedCount = 0;

  talents.forEach((talent) => {
    if (talent.unlocked) unlockedCount += 1;
    const card = document.createElement("button");
    card.className = "talent-node";
    if (talent.unlocked) card.classList.add("active");
    card.dataset.synergy = talent.synergy;

    const prereqNames = (talent.requires || [])
      .map((id) => talents.find((t) => t.id === id)?.name)
      .filter(Boolean);
    const canUnlock = canUnlockTalent(talent, talents, state.resources);

    card.innerHTML = `
      <div class="talent-header">
        <div>
          <p class="eyebrow">${talent.synergy}</p>
          <h3>${talent.name}</h3>
        </div>
        <span class="cost">${icons.fragments} ${formatNumber(talent.cost)}</span>
      </div>
      <p class="muted">${talent.description}</p>
      <p class="prereq">Prérequis : ${prereqNames.length ? prereqNames.join(", ") : "aucun"}</p>
    `;

    card.disabled = talent.unlocked || !canUnlock;

    card.addEventListener("click", () => {
      if (!buyTalent(talent)) return;
      renderTalents();
      renderUpgrades();
      saveGame();
    });

    talentsContainer.appendChild(card);
    uiRefs.talentButtons.set(talent.id, card);
  });

  if (talentStatusEl) {
    talentStatusEl.textContent = `${unlockedCount}/${talents.length} talents actifs`;
  }
  if (resetTalentsBtn) {
    resetTalentsBtn.textContent = `🔄 Reset (${formatNumber(TALENT_RESET_COST)} ${icons.fragments})`;
    resetTalentsBtn.disabled = unlockedCount === 0 || state.resources.fragments < TALENT_RESET_COST;
  }
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

/**
 * Calculate a danger repulsion vector from nearby enemies.
 * Returns normalized direction away from danger center of mass.
 * @returns {{ dx: number, dy: number, threat: number }} Object containing:
 *   - dx: Normalized x-direction away from threats (-1 to 1)
 *   - dy: Normalized y-direction away from threats (-1 to 1)
 *   - threat: Normalized threat level (0 to 1) indicating danger intensity
 */
function calculateDangerVector() {
  if (state.enemies.length === 0) return { dx: 0, dy: 0, threat: 0 };

  const DANGER_RADIUS = 150; // Distance at which enemies become threatening
  let threatDx = 0;
  let threatDy = 0;
  let totalThreat = 0;

  state.enemies.forEach((e) => {
    const dx = e.x - state.player.x;
    const dy = e.y - state.player.y;
    const dist = Math.hypot(dx, dy);

    if (dist < DANGER_RADIUS && dist > 0) {
      // Closer enemies are more threatening (inverse square relationship)
      const threat = Math.pow((DANGER_RADIUS - dist) / DANGER_RADIUS, 2);
      // Elite enemies are more threatening
      const eliteMult = e.elite ? 1.8 : 1;
      const weight = threat * eliteMult;

      threatDx += (dx / dist) * weight;
      threatDy += (dy / dist) * weight;
      totalThreat += weight;
    }
  });

  if (totalThreat === 0) return { dx: 0, dy: 0, threat: 0 };

  // Normalize and return the direction away from threats (negative)
  const mag = Math.hypot(threatDx, threatDy) || 1;
  return {
    dx: -threatDx / mag,
    dy: -threatDy / mag,
    threat: Math.min(1, totalThreat / 3) // Normalized threat level
  };
}

/**
 * Find the safest fragment to collect, considering both distance and danger.
 * Balances proximity to fragment with enemy threat at the fragment's location.
 * @returns {Object|null} The best fragment orb to collect, or null if no fragments exist
 */
function findBestFragment() {
  if (state.fragmentsOrbs.length === 0) return null;

  const DANGER_WEIGHT = 0.4; // How much danger affects fragment choice
  let bestFragment = null;
  let bestScore = -Infinity;

  state.fragmentsOrbs.forEach((f) => {
    const dx = f.x - state.player.x;
    const dy = f.y - state.player.y;
    const distToFragment = Math.hypot(dx, dy) || 1;

    // Calculate danger at fragment's position
    let dangerAtFragment = 0;
    state.enemies.forEach((e) => {
      const eDx = e.x - f.x;
      const eDy = e.y - f.y;
      const eDist = Math.hypot(eDx, eDy);
      if (eDist < 120) {
        dangerAtFragment += (120 - eDist) / 120;
      }
    });

    // Score: prefer close fragments with low danger
    // Higher score = better choice
    const distScore = 1 / (1 + distToFragment / 100); // Close is better
    const safetyScore = 1 / (1 + dangerAtFragment); // Less danger is better
    const valueScore = f.value / 10; // Higher value fragments preferred slightly

    const score = distScore * (1 - DANGER_WEIGHT) + safetyScore * DANGER_WEIGHT + valueScore * 0.1;

    if (score > bestScore) {
      bestScore = score;
      bestFragment = f;
    }
  });

  return bestFragment;
}

/**
 * Calculate intelligent player movement based on health, threats, and objectives.
 * Implements survival mode when health is low, balances fragment collection with danger.
 * @param {number} dt - Delta time in seconds since last frame
 * @returns {{ moveX: number, moveY: number }} Object containing directional movement weights:
 *   - moveX: Horizontal movement weight for this frame (unitless direction)
 *   - moveY: Vertical movement weight for this frame (unitless direction)
 */
function calculatePlayerMovement(dt) {
  const healthRatio = state.player.hp / state.player.maxHp;
  const danger = calculateDangerVector();
  const { width, height } = app.renderer;

  // Survival mode: prioritize avoiding enemies when health is low
  const survivalThreshold = 0.35;
  const isSurvivalMode = healthRatio < survivalThreshold && danger.threat > 0.2;

  let moveX = 0;
  let moveY = 0;

  if (isSurvivalMode) {
    // In survival mode, heavily weight escape direction
    moveX = danger.dx * 1.3;
    moveY = danger.dy * 1.3;

    // Add some randomness to avoid predictable patterns
    const jitter = 0.2;
    moveX += (Math.random() - 0.5) * jitter;
    moveY += (Math.random() - 0.5) * jitter;
  } else {
    // Normal mode: balance fragment collection with safety
    const targetFragment = findBestFragment();

    if (targetFragment) {
      const dx = targetFragment.x - state.player.x;
      const dy = targetFragment.y - state.player.y;
      const dist = Math.hypot(dx, dy) || 1;

      // Direction toward fragment
      let fragmentDx = dx / dist;
      let fragmentDy = dy / dist;

      // Blend with danger avoidance based on threat level and health
      const dangerBlend = danger.threat * (1.2 - healthRatio);
      fragmentDx = fragmentDx * (1 - dangerBlend) + danger.dx * dangerBlend;
      fragmentDy = fragmentDy * (1 - dangerBlend) + danger.dy * dangerBlend;

      // Normalize blended direction
      const blendMag = Math.hypot(fragmentDx, fragmentDy) || 1;
      moveX = (fragmentDx / blendMag) * 1.1;
      moveY = (fragmentDy / blendMag) * 1.1;
    } else {
      // No fragments: patrol pattern with danger awareness
      if (danger.threat > 0.3) {
        // Move away from danger
        moveX = danger.dx * 0.9;
        moveY = danger.dy * 0.9;
      } else {
        // Patrol in smooth orbit pattern toward center
        const centerX = width / 2;
        const centerY = height / 2;
        const toCenterX = centerX - state.player.x;
        const toCenterY = centerY - state.player.y;
        const distToCenter = Math.hypot(toCenterX, toCenterY) || 1;

        // Mix orbital movement with drift toward center
        const orbit = Math.sin(state.time * 0.6) * 0.4;
        const orbitMoveX = Math.cos(state.time * 0.8 + orbit);
        const orbitMoveY = Math.sin(state.time * 0.5);

        // Stronger pull toward center when far from it
        const centerPull = Math.min(0.5, distToCenter / 300);
        moveX = (orbitMoveX * (1 - centerPull) + (toCenterX / distToCenter) * centerPull);
        moveY = (orbitMoveY * (1 - centerPull) + (toCenterY / distToCenter) * centerPull);
      }
    }
  }

  return { moveX, moveY };
}

const PLAYER_ACCELERATION_MULT = 4.2;
const PLAYER_FRICTION = 2.5;
const PLAYER_MAX_SPEED_MULT = 1.8;

function update(dt) {
  if (!state.running) return;

  state.time += dt;

  updateSpawn(state, dt, canvas);

  // Use intelligent movement system
  const movement = calculatePlayerMovement(dt);
  const acceleration = accelerationFromDirection(
    movement,
    state.player.speed * PLAYER_ACCELERATION_MULT
  );
  const nextVelocity = applyInertiaStep({
    velocity: { vx: state.player.vx, vy: state.player.vy },
    acceleration,
    friction: PLAYER_FRICTION,
    maxSpeed: state.player.speed * PLAYER_MAX_SPEED_MULT,
    dt
  });

  state.player.vx = nextVelocity.vx;
  state.player.vy = nextVelocity.vy;
  state.player.x += state.player.vx * dt;
  state.player.y += state.player.vy * dt;
  clampPlayerToBounds();

  updateCombat(state, dt, canvas);

  if (!state.assist.firstShot && state.bullets.length > 0) {
    assistUi.recordShot();
  }

  state.wave += dt * 0.15;
  assistUi.trackWave(state.wave);

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
  state.player.vx = 0;
  state.player.vy = 0;
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
  const bonus = 1 + Math.pow(state.wave, 0.45) * 0.20;
  state.resources.idleMultiplier *= bonus;
  refreshGeneratorRates();
  softReset();
  state.prestigeCooldown = 10;
  playPrestige();
  assistUi.recordPrestige();
  saveGame();
  renderGenerators();
}

function render() {
  const { width, height } = app.renderer;
  const usingWebgl2 = Boolean(webgl2Renderer);
  const allowFx = !state.visualsLow;

  webgl2Renderer?.setEnabled(usingWebgl2);
  if (usingWebgl2 && webgl2Renderer) {
    webgl2Renderer.resize(width, height);
  }

  if (state.visualsLow) {
    backgroundReady = false;
    renderObjects.backgroundContainer.removeChildren();
    webgl2Renderer?.setGridEnabled(false);
  } else if (!backgroundReady) {
    buildBackground(width, height);
  } else if (webgl2Renderer) {
    // Grid is rendered as part of webgl2Renderer.render()
  } else if (!renderObjects.backgroundContainer.children.length) {
    buildBackground(width, height);
  }

  renderObjects.player.visible = !usingWebgl2;
  renderObjects.bullets.visible = !usingWebgl2;
  renderObjects.bulletsGlow.visible = !usingWebgl2;
  renderObjects.fragments.visible = !usingWebgl2;
  renderObjects.fragmentRings.visible = !usingWebgl2;
  renderObjects.enemies.visible = !usingWebgl2;

  renderObjects.aura.visible = !usingWebgl2;

  if (!usingWebgl2) {
    renderObjects.aura.clear();
    renderObjects.aura.beginFill(colors.player, 0.12);
    renderObjects.aura.drawCircle(0, 0, state.player.radius + 16);
    renderObjects.aura.endFill();
    renderObjects.aura.lineStyle({ color: colors.collect, alpha: 0.2, width: 2 });
    renderObjects.aura.drawCircle(0, 0, state.player.collectRadius * 0.45);
    renderObjects.aura.lineStyle(0);
    renderObjects.aura.position.set(state.player.x, state.player.y);
  } else {
    renderObjects.aura.clear();
  }

  // Update player position using vector graphics
  renderObjects.player.position.set(state.player.x, state.player.y);

  if (!usingWebgl2) {
    renderObjects.bullets.clear();
    renderObjects.bullets.beginFill(state.visualsLow ? colors.bulletLow : colors.bulletHigh, 0.9);
    state.bullets.forEach((b) => renderObjects.bullets.drawCircle(b.x, b.y, 4));
    renderObjects.bullets.endFill();

    renderObjects.bulletsGlow.clear();
    if (!state.visualsLow) {
      renderObjects.bulletsGlow.beginFill(colors.bulletHigh, 0.25);
      state.bullets.forEach((b) => renderObjects.bulletsGlow.drawCircle(b.x, b.y, 8));
      renderObjects.bulletsGlow.endFill();
    }

    // Render fragments using vector graphics with value-based colors and sizes
    renderObjects.fragments.clear();
    state.fragmentsOrbs.forEach((f) => {
      const fragColor = getFragmentColor(f.value);
      const fragRadius = getFragmentRadius(f.value);
      renderObjects.fragments.beginFill(fragColor);
      renderObjects.fragments.drawCircle(f.x, f.y, fragRadius);
      renderObjects.fragments.endFill();
    });

    renderObjects.fragmentRings.clear();
    if (!state.visualsLow) {
      state.fragmentsOrbs.forEach((f) => {
        const fragColor = getFragmentColor(f.value);
        const fragRadius = getFragmentRadius(f.value);
        renderObjects.fragmentRings.lineStyle({ color: fragColor, alpha: 0.5, width: 2 });
        renderObjects.fragmentRings.drawCircle(f.x, f.y, fragRadius + 5);
      });
      renderObjects.fragmentRings.lineStyle(0);
    }

    // Render enemies using vector graphics with type-based colors
    renderObjects.enemies.clear();
    state.enemies.forEach((e) => {
      const enemyColor = getEnemyColor(e.type);
      renderObjects.enemies.beginFill(enemyColor);
      renderObjects.enemies.drawCircle(e.x, e.y, e.radius);
      renderObjects.enemies.endFill();
    });
  } else if (webgl2Renderer) {
    const auraHalo = allowFx ? { color: webglColors.playerHalo, scale: 1.24 } : undefined;
    const collectRing = { color: webglColors.collectRing, scale: 1.04 };
    const playerHalo = allowFx ? { color: webglColors.playerHalo, scale: 1.35 } : undefined;
    const bulletColor = state.visualsLow ? webglColors.bulletLow : webglColors.bullet;
    const bulletHalo = allowFx ? { color: webglColors.bulletGlow, scale: 1.8 } : undefined;

    webgl2Renderer.beginFrame();
    webgl2Renderer.pushCircle({
      x: state.player.x,
      y: state.player.y,
      radius: state.player.radius + 16,
      color: webglColors.playerAura,
      halo: auraHalo
    });
    webgl2Renderer.pushCircle({
      x: state.player.x,
      y: state.player.y,
      radius: state.player.collectRadius * 0.45,
      color: webglColors.transparent,
      halo: collectRing
    });
    webgl2Renderer.pushCircle({
      x: state.player.x,
      y: state.player.y,
      radius: state.player.radius,
      color: webglColors.player,
      halo: playerHalo
    });

    state.bullets.forEach((b) =>
      webgl2Renderer.pushCircle({
        x: b.x,
        y: b.y,
        radius: 4,
        color: bulletColor,
        halo: bulletHalo
      })
    );

    // Render fragments with value-based colors and sizes
    state.fragmentsOrbs.forEach((f) => {
      const { color, ringColor, radius } = getFragmentVisuals(f.value, allowFx);
      const fragmentHalo = allowFx ? { color: ringColor, scale: 1.65 } : undefined;
      webgl2Renderer.pushCircle({
        x: f.x,
        y: f.y,
        radius,
        color,
        halo: fragmentHalo
      });
    });

    // Render enemies with type-based colors
    state.enemies.forEach((e) => {
      const enemyColor = getEnemyColorWebGL(e.type);
      webgl2Renderer.pushCircle({
        x: e.x,
        y: e.y,
        radius: e.radius,
        color: enemyColor
      });
    });

    // Render floating text using native WebGL2 text renderer
    state.floatingText.forEach((f) => {
      const label = typeof f.text === "string" || typeof f.text === "number" ? String(f.text) : "";
      if (!label) return;
      const textColor = hexStringToVec4(f.color || "#fef08a", Math.max(0, f.life));
      webgl2Renderer.pushText({
        text: label,
        x: f.x,
        y: f.y - (1.5 - f.life) * 24,
        color: textColor,
        alpha: Math.max(0, f.life)
      });
    });

    webgl2Renderer.render();
  }

  renderObjects.enemyHp.clear();
  state.enemies.forEach((e) => {
    if (!state.visualsLow || e.hitThisFrame) {
      renderObjects.enemyHp.beginFill(colors.hpBg, 0.4);
      renderObjects.enemyHp.drawRect(e.x - e.radius, e.y - e.radius - 12, e.radius * 2, 6);
      renderObjects.enemyHp.endFill();

      renderObjects.enemyHp.beginFill(colors.hpFg);
      renderObjects.enemyHp.drawRect(e.x - e.radius, e.y - e.radius - 12, (e.hp / e.maxHp) * e.radius * 2, 6);
      renderObjects.enemyHp.endFill();
    }
  });

  // Only use PixiJS floating text when WebGL2 is not available
  if (!usingWebgl2) {
    const recycledFloatingText = renderObjects.floatingLayer.removeChildren();
    recycledFloatingText.forEach((text) => releaseFloatingText(text));

    state.floatingText.forEach((f) => {
      const label = typeof f.text === "string" || typeof f.text === "number" ? String(f.text) : "";
      const text = acquireFloatingText(f.color);
      text.text = label;
      text.alpha = Math.max(0, f.life);
      text.x = f.x;
      text.y = f.y - (1.5 - f.life) * 24;
      renderObjects.floatingLayer.addChild(text);
    });
  } else {
    // Clear PixiJS floating text layer when using WebGL2
    const recycledFloatingText = renderObjects.floatingLayer.removeChildren();
    recycledFloatingText.forEach((text) => releaseFloatingText(text));
  }

  renderObjects.hudLabels.wave.text = `${icons.wave} Vague ${state.wave.toFixed(1)}`;
  renderObjects.hudLabels.kills.text = `⚔️ Kills ${state.runStats.kills}`;
  renderObjects.hudLabels.fragments.text = `${icons.fragments} Fragments ${formatNumber(state.runStats.fragments)}`;
  renderObjects.hudLabels.essence.text = `${icons.essence} Essence ${formatNumber(state.runStats.essence)}`;
  renderObjects.hudLabels.gain.text = `⇡ +${formatNumber(state.gainTicker.fragments)} ✦`;
  renderObjects.hudLabels.gain.visible = state.gainTicker.fragments > 0;
}

app.ticker.add((delta) => {
  recordFpsSample();
  const dt = Math.min(0.05, delta / 60);
  update(dt);
  updateHud(state, hudContext);
  updatePerformanceHud();
  render();
});

function initUI() {
  const syncSoundToggle = () => {
    if (!toggleSoundBtn) return;
    toggleSoundBtn.textContent = state.audio.enabled ? "🔊 Son ON" : "🔇 Son coupé";
  };

  const syncAddonToggles = () => {
    if (toggleGlowFxBtn) toggleGlowFxBtn.textContent = state.addons.glow ? "✨ Aura ON" : "✨ Aura OFF";
    if (toggleBloomFxBtn) toggleBloomFxBtn.textContent = state.addons.bloom ? "🌟 Bloom ON" : "🌟 Bloom OFF";
    if (toggleGrainFxBtn) toggleGrainFxBtn.textContent = state.addons.grain ? "🎞️ Grain ON" : "🎞️ Grain OFF";
    if (toggleHudPulseBtn) toggleHudPulseBtn.textContent = state.addons.hudPulse ? "💫 Pulse ON" : "💫 Pulse OFF";
  };

  const toggleAddon = (key) => {
    state.addons[key] = !state.addons[key];
    syncAddonToggles();
    applyAddonFilters(state, renderObjects);
    playUiToggle();
    saveGame();
  };

  const armAudioUnlock = () => {
    const unlock = () => resumeAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
  };

  armAudioUnlock();
  syncSoundToggle();
  syncAddonToggles();

  pauseBtn.addEventListener("click", () => {
    state.running = !state.running;
    pauseBtn.textContent = state.running ? "⏸ Pause" : "▶️ Reprendre";
    saveGame();
  });

  toggleSoundBtn?.addEventListener("click", () => {
    state.audio.enabled = !state.audio.enabled;
    resumeAudio();
    setAudioEnabled(state.audio.enabled);
    syncSoundToggle();
    playUiToggle();
    saveGame();
  });

  toggleGlowFxBtn?.addEventListener("click", () => toggleAddon("glow"));
  toggleBloomFxBtn?.addEventListener("click", () => toggleAddon("bloom"));
  toggleGrainFxBtn?.addEventListener("click", () => toggleAddon("grain"));
  toggleHudPulseBtn?.addEventListener("click", () => toggleAddon("hudPulse"));

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

  resetTalentsBtn?.addEventListener("click", () => {
    if (!resetTalents(talents, state)) return;
    applyProgressionEffects();
    refreshGeneratorRates();
    renderTalents();
    renderGenerators();
    renderUpgrades();
    saveGame();
  });

  togglePerfBtn.addEventListener("click", () => {
    state.visualsLow = !state.visualsLow;
    togglePerfBtn.textContent = state.visualsLow ? "🚀 Perfo ON" : "⚙️ Mode perfo";
    buildBackground(app.renderer.width, app.renderer.height);
    webgl2Renderer?.setEnabled(!state.visualsLow);
    applyAddonFilters(state, renderObjects);
    playUiToggle();
    debugPing(state, state.visualsLow ? "Mode perfo" : "Mode flair", state.visualsLow ? "#22c55e" : "#a78bfa", () =>
      updateHud(state, hudContext)
    );
  });

  toggleFpsBtn?.addEventListener("click", () => {
    state.performance.graphVisible = !state.performance.graphVisible;
    fpsCanvas?.classList.toggle("visible", state.performance.graphVisible);
    toggleFpsBtn.textContent = state.performance.graphVisible ? "📉 Masquer le graph" : "📈 Afficher le graph";
    drawFpsGraph();
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
    renderTalents();
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
  renderTalents();

  // Initialize collapsible sections with state persistence
  const COLLAPSIBLE_KEY = 'neo-survivors-collapsible';
  let collapsibleStates = {};
  try {
    const saved = localStorage.getItem(COLLAPSIBLE_KEY);
    if (saved) {
      collapsibleStates = JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Failed to load collapsible states:', e);
  }

  document.querySelectorAll('.stat-block.collapsible').forEach((block, index) => {
    const header = block.querySelector('h2');
    if (!header) return;
    
    const key = header.textContent.replace(/[▶▼\s]/g, '').trim() || `section-${index}`;
    
    // Restore saved state if available
    if (collapsibleStates[key] !== undefined) {
      block.classList.toggle('collapsed', collapsibleStates[key]);
    }
    
    // Add keyboard accessibility attributes
    header.setAttribute('tabindex', '0');
    header.setAttribute('role', 'button');
    header.setAttribute('aria-expanded', !block.classList.contains('collapsed'));
    
    const toggleCollapsed = () => {
      block.classList.toggle('collapsed');
      header.setAttribute('aria-expanded', !block.classList.contains('collapsed'));
      
      // Save state
      try {
        collapsibleStates[key] = block.classList.contains('collapsed');
        localStorage.setItem(COLLAPSIBLE_KEY, JSON.stringify(collapsibleStates));
      } catch (err) {
        console.warn('Failed to save collapsible state:', err);
      }
    };
    
    header.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleCollapsed();
    });
    
    // Add keyboard support for Enter and Space keys
    header.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleCollapsed();
      }
    });
  });
}

async function bootstrap() {
  resizeCanvas(true);
  setupScene();
  buildBackground(app.renderer.width, app.renderer.height);
  loadSave();
  applyAddonFilters(state, renderObjects);
  initSound(state.audio.enabled);
  setAudioEnabled(state.audio.enabled);
  assistUi = initAssist(state, {
    quickHelpList,
    milestoneList,
    bubbleContainer: assistBubbles,
    anchors: {
      arena: canvas,
      generators: generatorsContainer,
      upgrades: upgradesContainer,
      prestige: softPrestigeBtn
    },
    upgrades,
    generators
  });
  initUI();
  window.addEventListener("resize", () => resizeCanvas());
  app.start();
  setInterval(saveGame, 5000);
}

bootstrap();
