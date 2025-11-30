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
import * as renderer from "./renderer/index.ts";
import { colors, hexStringToVec4, paletteHex, paletteVec4, webglColors } from "./renderer/colors.ts";
import {
  getEnemyColor,
  getEnemyColorWebGL,
  getFragmentVisuals,
  getFragmentColor,
  getFragmentRadius
} from "./renderer/entityColors.ts";
import { initDocumentationDialog } from "./renderer/documentation.ts";
import { codeDocumentation, roadmapSections } from "./config/documentation.ts";
import { recordFpsSample, drawFpsGraph, updatePerformanceHud } from "./systems/performance.ts";
import { initCollapsibleSections } from "./systems/collapsible.ts";

const webgl2Canvas = document.getElementById("webgl2");
const webgl2Renderer = webgl2Canvas ? renderer.init(webgl2Canvas) : null;

let backgroundReady = false;

const PLAYER_SHAPE = { sides: 6, rotation: Math.PI / 6 };
const FRAGMENT_SHAPE = { sides: 4, rotation: Math.PI / 4 };
const BULLET_SHAPE = { sides: 5, rotation: -Math.PI / 2 };

function getEnemyShape(type) {
  switch (type) {
    case "weak":
      return { sides: 3, rotation: -Math.PI / 2 };
    case "strong":
      return { sides: 5, rotation: Math.PI / 2.5 };
    case "elite":
      return { sides: 6, rotation: Math.PI / 6 };
    default:
      return { sides: 4, rotation: Math.PI / 4 };
  }
}

function buildBackground(width, height) {
  if (webgl2Renderer) {
    webgl2Renderer.setGridEnabled(!state.visualsLow);
    if (!state.visualsLow) {
      webgl2Renderer.resize(width, height);
      backgroundReady = true;
    } else {
      webgl2Renderer.clear();
    }
  }
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
const docDialog = document.getElementById("docDialog");
const docTabs = document.getElementById("docTabs");
const docContent = document.getElementById("docContent");
const docBtn = document.getElementById("docBtn");
const docCloseBtn = docDialog?.querySelector(".doc-close-btn");
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

initDocumentationDialog({
  dialog: docDialog,
  trigger: docBtn,
  closeButton: docCloseBtn,
  tabs: docTabs,
  content: docContent,
  versionBadge,
  version: VERSION,
  codeDocs: codeDocumentation,
  roadmap: roadmapSections
});

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
      x: webgl2Canvas.width / 2,
      y: webgl2Canvas.height / 2,
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
  const { width, height } = webgl2Canvas.getBoundingClientRect();
  state.player.x = Math.max(30, Math.min(width - 30, state.player.x));
  state.player.y = Math.max(30, Math.min(height - 30, state.player.y));
}

function resizeCanvas(center = false) {
  const rect = webgl2Canvas.parentElement?.getBoundingClientRect();
  const width = rect?.width || webgl2Canvas.width || 960;
  const height = rect?.height || webgl2Canvas.height || 600;
  buildBackground(width, height);
  webgl2Renderer?.resize(width, height);
  if (center) {
    state.player.x = width / 2;
    state.player.y = height / 2;
  }
  clampPlayerToBounds();
  if (state.performance.graphVisible) {
    drawFpsGraph(fpsCanvas, state.performance);
  }
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
 * Calculate intelligent player movement direction based on health, threats, and objectives.
 * Implements survival mode when health is low, balances fragment collection with danger.
 * Returns the desired movement direction with magnitude (not scaled by dt).
 * @returns {{ dirX: number, dirY: number }} Object containing directional movement weights:
 *   - dirX: Desired horizontal direction (unitless, centered around -1 to 1)
 *   - dirY: Desired vertical direction (unitless, centered around -1 to 1)
 * @param {number} dt - Delta time in seconds since last frame
 */
function calculatePlayerMovement() {
  const healthRatio = state.player.hp / state.player.maxHp;
  const danger = calculateDangerVector();
  const { width, height } = webgl2Canvas.getBoundingClientRect();

  // Survival mode: prioritize avoiding enemies when health is low
  const survivalThreshold = 0.35;
  const isSurvivalMode = healthRatio < survivalThreshold && danger.threat > 0.2;

  let dirX = 0;
  let dirY = 0;

  if (isSurvivalMode) {
    // In survival mode, heavily weight escape direction
    dirX = danger.dx * 1.3;
    dirY = danger.dy * 1.3;

    // Add some randomness to avoid predictable patterns
    const jitter = 0.2;
    dirX += (Math.random() - 0.5) * jitter;
    dirY += (Math.random() - 0.5) * jitter;
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
      dirX = (fragmentDx / blendMag) * 1.1;
      dirY = (fragmentDy / blendMag) * 1.1;
    } else {
      // No fragments: patrol pattern with danger awareness
      if (danger.threat > 0.3) {
        // Move away from danger
        dirX = danger.dx * 0.9;
        dirY = danger.dy * 0.9;
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
        dirX = (orbitMoveX * (1 - centerPull) + (toCenterX / distToCenter) * centerPull);
        dirY = (orbitMoveY * (1 - centerPull) + (toCenterY / distToCenter) * centerPull);
      }
    }
  }

  return { dirX, dirY };
}

const PLAYER_ACCELERATION_MULT = 4.2;
const PLAYER_FRICTION = 2.5;
const PLAYER_MAX_SPEED_MULT = 1.8;

function update(dt) {
  if (!state.running) return;

  state.time += dt;

  updateSpawn(state, dt, webgl2Canvas);

  // Space-like inertia movement system
  // Acceleration: how quickly the player reaches target velocity
  // Friction: how quickly the player slows down (higher = more friction)
  const ACCELERATION = 8.0; // How fast the player accelerates toward target direction
  const FRICTION = 4.5; // Drag coefficient for smooth deceleration

  // Get the desired movement direction
  const movement = calculatePlayerMovement();
  const targetVx = movement.dirX * state.player.speed;
  const targetVy = movement.dirY * state.player.speed;

  // Calculate acceleration toward target velocity with smooth interpolation
  const ax = (targetVx - state.player.vx) * ACCELERATION;
  const ay = (targetVy - state.player.vy) * ACCELERATION;

  // Apply acceleration to velocity
  state.player.vx += ax * dt;
  state.player.vy += ay * dt;

  // Apply friction to velocity (damping effect for space-like feel)
  const frictionFactor = 1 - FRICTION * dt;
  state.player.vx *= Math.max(0, frictionFactor);
  state.player.vy *= Math.max(0, frictionFactor);

  // Clamp velocity to max speed
  const currentSpeed = Math.hypot(state.player.vx, state.player.vy);
  const maxSpeed = state.player.speed * 1.2;
  if (currentSpeed > maxSpeed) {
    state.player.vx = (state.player.vx / currentSpeed) * maxSpeed;
    state.player.vy = (state.player.vy / currentSpeed) * maxSpeed;
  }

  // Update position based on velocity
  state.player.x += state.player.vx * dt;
  state.player.y += state.player.vy * dt;
  clampPlayerToBounds();

  updateCombat(state, dt, webgl2Canvas);

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
  state.player.x = webgl2Canvas.width / 2;
  state.player.y = webgl2Canvas.height / 2;
  state.player.vx = 0;
  state.player.vy = 0;
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
  const { width, height } = webgl2Canvas.getBoundingClientRect();
  const usingWebgl2 = Boolean(webgl2Renderer);
  const allowFx = !state.visualsLow;

  if (usingWebgl2) {
    renderer.resize(width, height);
  }

  if (webgl2Renderer) {
    renderer.pushCircle({
      x: 12 + 190 / 2,
      y: 12 + 126 / 2,
      radius: 100,
      color: [0.1, 0.1, 0.1, 0.45],
      sides: 6
    });
    const auraHalo = allowFx ? { color: webglColors.playerHalo, scale: 1.24 } : undefined;
    const collectRing = { color: webglColors.collectRing, scale: 1.04 };
    const playerHalo = allowFx ? { color: webglColors.playerHalo, scale: 1.35 } : undefined;
    const bulletColor = state.visualsLow ? webglColors.bulletLow : webglColors.bullet;
    const bulletHalo = allowFx ? { color: webglColors.bulletGlow, scale: 1.8 } : undefined;

    renderer.beginFrame();
    renderer.pushCircle({
      x: state.player.x,
      y: state.player.y,
      radius: state.player.radius + 16,
      color: webglColors.playerAura,
      sides: PLAYER_SHAPE.sides,
      rotation: PLAYER_SHAPE.rotation,
      halo: auraHalo
    });
    renderer.pushCircle({
      x: state.player.x,
      y: state.player.y,
      radius: state.player.collectRadius * 0.45,
      color: webglColors.transparent,
      sides: PLAYER_SHAPE.sides,
      rotation: PLAYER_SHAPE.rotation,
      halo: collectRing
    });
    renderer.pushCircle({
      x: state.player.x,
      y: state.player.y,
      radius: state.player.radius,
      color: webglColors.player,
      sides: PLAYER_SHAPE.sides,
      rotation: PLAYER_SHAPE.rotation,
      halo: playerHalo
    });

    state.bullets.forEach((b) =>
      renderer.pushCircle({
        x: b.x,
        y: b.y,
        radius: 4,
        color: bulletColor,
        sides: BULLET_SHAPE.sides,
        rotation: BULLET_SHAPE.rotation,
        halo: bulletHalo
      })
    );

    // Render fragments with value-based colors and sizes
    state.fragmentsOrbs.forEach((f) => {
      const { color, ringColor, radius } = getFragmentVisuals(f.value);
      const fragmentHalo = allowFx ? { color: ringColor, scale: 1.65 } : undefined;
      renderer.pushCircle({
        x: f.x,
        y: f.y,
        radius,
        color,
        sides: FRAGMENT_SHAPE.sides,
        rotation: FRAGMENT_SHAPE.rotation,
        halo: fragmentHalo
      });
    });

    // Render enemies with type-based colors
    state.enemies.forEach((e) => {
      const enemyColor = getEnemyColorWebGL(e.type);
      const enemyShape = getEnemyShape(e.type);
      renderer.pushCircle({
        x: e.x,
        y: e.y,
        radius: e.radius,
        color: enemyColor,
        sides: enemyShape.sides,
        rotation: enemyShape.rotation
      });

      if (!state.visualsLow || e.hitThisFrame) {
        renderer.pushHealthBar({
          x: e.x,
          y: e.y - e.radius,
          width: e.radius * 2,
          ratio: e.hp / e.maxHp
        });
      }
    });

    // Render floating text using native WebGL2 text renderer
    state.floatingText.forEach((f) => {
      const label = typeof f.text === "string" || typeof f.text === "number" ? String(f.text) : "";
      if (!label) return;
      const textColor = hexStringToVec4(f.color || "#fef08a", Math.max(0, f.life));
      renderer.pushText({
        text: label,
        x: f.x,
        y: f.y - (1.5 - f.life) * 24,
        color: textColor,
        alpha: Math.max(0, f.life)
      });
    });

    renderer.render();
  }

  const hudTexts = [
    { text: `${icons.wave} Vague ${state.wave.toFixed(1)}`, x: 24, y: 28 },
    { text: `⚔️ Kills ${state.runStats.kills}`, x: 24, y: 48 },
    { text: `${icons.fragments} Fragments ${formatNumber(state.runStats.fragments)}`, x: 24, y: 68 },
    { text: `${icons.essence} Essence ${formatNumber(state.runStats.essence)}`, x: 24, y: 88 },
  ];

  if (state.gainTicker.fragments > 0) {
    hudTexts.push({ text: `⇡ +${formatNumber(state.gainTicker.fragments)} ✦`, x: 24, y: 108 });
  }

  hudTexts.forEach(({ text, x, y }) => {
    renderer.pushText({
      text,
      x,
      y,
      color: [1, 1, 1, 1],
      alpha: 1,
    });
  });
}

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
    buildBackground(webgl2Canvas.width, webgl2Canvas.height);
    webgl2Renderer?.setEnabled(!state.visualsLow);
    playUiToggle();
    debugPing(state, state.visualsLow ? "Mode perfo" : "Mode flair", state.visualsLow ? "#22c55e" : "#a78bfa", () =>
      updateHud(state, hudContext)
    );
  });

  toggleFpsBtn?.addEventListener("click", () => {
    state.performance.graphVisible = !state.performance.graphVisible;
    fpsCanvas?.classList.toggle("visible", state.performance.graphVisible);
    toggleFpsBtn.textContent = state.performance.graphVisible ? "📉 Masquer le graph" : "📈 Afficher le graph";
    drawFpsGraph(fpsCanvas, state.performance);
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
  initCollapsibleSections();
}

async function bootstrap() {
  resizeCanvas(true);
  buildBackground(webgl2Canvas.width, webgl2Canvas.height);
  loadSave();
  initSound(state.audio.enabled);
  setAudioEnabled(state.audio.enabled);
  assistUi = initAssist(state, {
    quickHelpList,
    milestoneList,
    bubbleContainer: assistBubbles,
    anchors: {
      arena: webgl2Canvas,
      generators: generatorsContainer,
      upgrades: upgradesContainer,
      prestige: softPrestigeBtn
    },
    upgrades,
    generators
  });
  initUI();
  window.addEventListener("resize", () => resizeCanvas());
  setInterval(saveGame, 5000);

  let lastTime = performance.now();

  function gameLoop(currentTime) {
    const frameMs = currentTime - lastTime;
    lastTime = currentTime;

    recordFpsSample(state.performance, frameMs);
    const dt = Math.min(0.05, frameMs / 1000);

    update(dt);
    updateHud(state, hudContext);
    updatePerformanceHud(fpsValueEl, fpsCanvas, state.performance);
    render();

    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);
}

bootstrap();
