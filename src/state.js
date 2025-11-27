export function createInitialState(canvas) {
  return {
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
}

export function clampPlayerToBounds(state, canvas) {
  state.player.x = Math.max(30, Math.min(canvas.width - 30, state.player.x));
  state.player.y = Math.max(30, Math.min(canvas.height - 30, state.player.y));
}

export function resizeCanvas(canvas, state, center = false) {
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
  if (center) {
    state.player.x = canvas.width / 2;
    state.player.y = canvas.height / 2;
  }
  clampPlayerToBounds(state, canvas);
}

export function resetPlayerStats(state) {
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
}
