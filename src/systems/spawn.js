const MAX_PACK_SIZE = 6;

export function spawnRate(state) {
  return Math.min(10, 1.6 + state.wave * 0.1);
}

export function packSize(state) {
  const growth = Math.pow(Math.max(0, state.wave - 1) / 12, 0.65);
  return Math.min(MAX_PACK_SIZE, Math.max(1, Math.floor(1 + growth)));
}

function eliteChance(state, pack) {
  const packPressure = pack >= MAX_PACK_SIZE ? 0.05 : (pack / MAX_PACK_SIZE) * 0.02;
  const chance = 0.12 + state.wave * 0.0018 + packPressure;
  return Math.min(0.65, chance);
}

export function spawnEnemy(state, canvas, chance) {
  const margin = 20;
  const side = Math.floor(Math.random() * 4);
  let x = 0;
  let y = 0;
  if (side === 0) { x = Math.random() * canvas.width; y = margin; }
  if (side === 1) { x = Math.random() * canvas.width; y = canvas.height - margin; }
  if (side === 2) { x = margin; y = Math.random() * canvas.height; }
  if (side === 3) { x = canvas.width - margin; y = Math.random() * canvas.height; }

  const elite = Math.random() < chance;
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

export function updateSpawn(state, dt, canvas) {
  state.spawnTimer -= dt;
  if (state.spawnTimer > 0) return;

  const rate = spawnRate(state);
  const pack = packSize(state);
  const chance = eliteChance(state, pack);
  for (let i = 0; i < pack; i++) {
    spawnEnemy(state, canvas, chance);
  }
  state.spawnTimer = 1 / rate;
}
