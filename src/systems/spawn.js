export function spawnRate(state) {
  return Math.min(10, 1.6 + state.wave * 0.1);
}

export function packSize(state) {
  return Math.max(1, Math.floor(state.wave / 10));
}

export const phaseMilestones = [
  {
    id: "ember-herald",
    wave: 10,
    name: "Héraut solaire",
    type: "boss",
    count: 1,
    stats: { hpMultiplier: 3.6, speedMultiplier: 0.9, radius: 16 },
    specialAttack: {
      kind: "shockwave",
      radius: 120,
      damage: 28,
      cooldown: 6,
      telegraph: 1.4,
      color: 0xf97316
    },
    loot: { essence: 240, fragments: 160, name: "Noyau incandescent" },
    spawnDelay: 1.2,
    variant: "boss"
  },
  {
    id: "crystal-caravan",
    wave: 25,
    name: "Caravane cristalline",
    type: "mini-event",
    count: 3,
    stats: { hpMultiplier: 1.9, speedMultiplier: 1.15, radius: 12 },
    specialAttack: {
      kind: "fragment-burst",
      radius: 80,
      shards: 5,
      cooldown: 4.2,
      telegraph: 1,
      color: 0x22d3ee
    },
    loot: { essence: 180, fragments: 120, name: "Éclat prismatique" },
    spawnDelay: 0.9,
    variant: "event"
  },
  {
    id: "void-anchor",
    wave: 40,
    name: "Ancre du Vide",
    type: "boss",
    count: 1,
    stats: { hpMultiplier: 5, speedMultiplier: 0.8, radius: 18 },
    specialAttack: {
      kind: "beam",
      radius: 140,
      damage: 36,
      cooldown: 7,
      telegraph: 1.8,
      color: 0xa855f7
    },
    loot: { essence: 320, fragments: 220, name: "Relique abyssale" },
    spawnDelay: 1.4,
    variant: "boss"
  }
];

export function getNextPhase(currentWave, completed = []) {
  return phaseMilestones.find((phase) => currentWave < phase.wave && !completed.includes(phase.id));
}

export function spawnEnemy(state, canvas, options = {}) {
  const margin = 20;
  const side = Math.floor(Math.random() * 4);
  let x = 0;
  let y = 0;
  if (side === 0) { x = Math.random() * canvas.width; y = margin; }
  if (side === 1) { x = Math.random() * canvas.width; y = canvas.height - margin; }
  if (side === 2) { x = margin; y = Math.random() * canvas.height; }
  if (side === 3) { x = canvas.width - margin; y = Math.random() * canvas.height; }

  const elite = options.forceElite ?? Math.random() < 0.12 + state.wave * 0.002;
  const hpMultiplier = options.stats?.hpMultiplier ?? 1;
  const speedMultiplier = options.stats?.speedMultiplier ?? 1;
  const hp = (20 + state.wave * 7) * (elite ? 2.8 : 1) * hpMultiplier;
  const speed = (40 + state.wave * 1.8) * (elite ? 0.9 : 1) * speedMultiplier;
  const fireDelay = Math.max(1.2, (elite ? 3 : 4) - state.wave * 0.06);
  state.enemies.push({
    x,
    y,
    radius: options.stats?.radius ?? 10,
    hp,
    maxHp: hp,
    speed,
    reward: (2 + state.wave * 0.7) * (elite ? 3 : 1) * (options.loot?.multiplier ?? 1),
    fireTimer: fireDelay * Math.random(),
    fireDelay,
    elite,
    variant: options.variant || "grunt",
    phaseId: options.phaseId,
    specialAttack: options.specialAttack || null,
    specialTimer: options.specialAttack ? options.specialAttack.cooldown * (0.6 + Math.random() * 0.5) : null,
    telegraph: 0,
    telegraphColor: options.specialAttack?.color,
    lootBonus: options.loot,
  });
}

export function updateSpawn(state, dt, canvas) {
  if (!state.phase) {
    state.phase = {
      active: null,
      completed: [],
      announcement: "",
      hudTimer: 0,
      lastReward: null
    };
  }

  state.phase.hudTimer = Math.max(0, state.phase.hudTimer - dt);

  const nextPhase = phaseMilestones.find(
    (phase) => state.wave >= phase.wave && !state.phase.completed.includes(phase.id) && (!state.phase.active || state.phase.active.id !== phase.id)
  );

  if (!state.phase.active && nextPhase) {
    state.phase.active = { ...nextPhase, spawned: 0 };
    state.phase.announcement = `${nextPhase.name} (${nextPhase.type}) en approche !`;
    state.phase.hudTimer = 5.5;
    state.phase.lastReward = null;
  }

  if (state.phase.active) {
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0 && state.phase.active.spawned < state.phase.active.count) {
      spawnEnemy(state, canvas, {
        stats: state.phase.active.stats,
        specialAttack: state.phase.active.specialAttack,
        loot: { multiplier: 1.6 },
        variant: state.phase.active.variant,
        phaseId: state.phase.active.id,
        forceElite: true
      });
      state.phase.active.spawned += 1;
      state.spawnTimer = state.phase.active.spawnDelay || 1;
    }

    const remaining = state.enemies.some((enemy) => enemy.phaseId === state.phase.active.id);
    if (!remaining && state.phase.active.spawned >= state.phase.active.count) {
      state.phase.completed.push(state.phase.active.id);
      state.phase.lastReward = state.phase.active.loot;
      state.phase.announcement = `${state.phase.active.name} neutralisé !`;
      state.phase.hudTimer = 6;
      state.resources.essence += state.phase.active.loot.essence;
      state.resources.fragments += state.phase.active.loot.fragments;
      state.runStats.essence += state.phase.active.loot.essence;
      state.runStats.fragments += state.phase.active.loot.fragments;
      state.gainTicker.essence += state.phase.active.loot.essence;
      state.gainTicker.fragments += state.phase.active.loot.fragments;
      state.gainTicker.timer = 1.4;
      state.phase.active = null;
      state.spawnTimer = 1;
    }
    return;
  }

  state.spawnTimer -= dt;
  if (state.spawnTimer > 0) return;

  const rate = spawnRate(state);
  const pack = packSize(state);
  for (let i = 0; i < pack; i++) {
    spawnEnemy(state, canvas);
  }
  state.spawnTimer = 1 / rate;
}
