const canvas = document.getElementById("space");
const ctx = canvas.getContext("2d");
const toggleButton = document.getElementById("toggle");
const resetButton = document.getElementById("reset");
const speedSlider = document.getElementById("speed");
const speedValue = document.getElementById("speedValue");

const G = 2.95912208286e-4; // AU^3 / (day^2 * solar mass)
const DT = 0.5; // days per step (fixed timestep for stability)
let daysPerRealSecond = 24; // simulation speed multiplier (adjustable)
let pendingSimDays = 0; // leftover simulated days carried across frames

const palette = [
  "#ffd166",
  "#ef476f",
  "#06d6a0",
  "#118ab2",
  "#c084fc",
  "#f97316",
  "#22d3ee",
  "#a3e635",
  "#e11d48"
];

const baseBodies = [
  { name: "Sun", mass: 1, radius: 14, color: "#ffeb3b", distance: 0, trail: true },
  { name: "Mercury", mass: 1.651e-7, radius: 4, distance: 0.39 },
  { name: "Venus", mass: 2.447e-6, radius: 6, distance: 0.72 },
  { name: "Earth", mass: 3.003e-6, radius: 6, distance: 1 },
  { name: "Mars", mass: 3.227e-7, radius: 5, distance: 1.52 },
  { name: "Jupiter", mass: 9.545e-4, radius: 10, distance: 5.2 },
  { name: "Saturn", mass: 2.857e-4, radius: 9, distance: 9.54 },
  { name: "Uranus", mass: 4.365e-5, radius: 8, distance: 19.19 },
  { name: "Neptune", mass: 5.149e-5, radius: 8, distance: 30.06 }
];

let bodies = [];
let running = true;
let lastTime = performance.now();
const trailLength = 180;

function updateSpeed(value) {
  const parsed = parseFloat(value);
  if (!Number.isNaN(parsed)) {
    daysPerRealSecond = parsed;
    if (speedValue) {
      speedValue.textContent = `${parsed.toFixed(1)} j/s`;
    }
  }
}

function createBodies() {
  return baseBodies.map((body, idx) => {
    if (body.name === "Sun") {
      return {
        ...body,
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        color: body.color,
        history: []
      };
    }

    const r = body.distance;
    const speed = Math.sqrt((G * baseBodies[0].mass) / r);
    return {
      ...body,
      position: { x: r, y: 0 },
      velocity: { x: 0, y: speed },
      color: body.color || palette[idx % palette.length],
      history: []
    };
  });
}

function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * dpr;
  canvas.height = canvas.clientHeight * dpr;
}

function computeAccelerations(currentBodies) {
  const acc = currentBodies.map(() => ({ x: 0, y: 0 }));
  for (let i = 0; i < currentBodies.length; i++) {
    for (let j = i + 1; j < currentBodies.length; j++) {
      const dx = currentBodies[j].position.x - currentBodies[i].position.x;
      const dy = currentBodies[j].position.y - currentBodies[i].position.y;
      const distSq = dx * dx + dy * dy;
      const invDist = 1 / Math.sqrt(distSq);
      const invDist3 = invDist * invDist * invDist;
      const factor = G * invDist3;

      const ax = factor * dx;
      const ay = factor * dy;

      acc[i].x += ax * currentBodies[j].mass;
      acc[i].y += ay * currentBodies[j].mass;
      acc[j].x -= ax * currentBodies[i].mass;
      acc[j].y -= ay * currentBodies[i].mass;
    }
  }
  return acc;
}

function stepSimulation(dt) {
  const acc1 = computeAccelerations(bodies);

  // Kick (half-step)
  bodies.forEach((body, i) => {
    body.velocity.x += acc1[i].x * (dt / 2);
    body.velocity.y += acc1[i].y * (dt / 2);
  });

  // Drift
  bodies.forEach((body) => {
    body.position.x += body.velocity.x * dt;
    body.position.y += body.velocity.y * dt;
  });

  const acc2 = computeAccelerations(bodies);

  // Kick (second half-step)
  bodies.forEach((body, i) => {
    body.velocity.x += acc2[i].x * (dt / 2);
    body.velocity.y += acc2[i].y * (dt / 2);
  });

  // Store trail history
  bodies.forEach((body) => {
    if (!body.history) return;
    body.history.push({ x: body.position.x, y: body.position.y });
    if (body.history.length > trailLength) {
      body.history.shift();
    }
  });
}

function draw() {
  const dpr = window.devicePixelRatio || 1;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.scale(dpr, dpr);

  const viewRadius = 32; // AU to show Neptune comfortably
  const scale = Math.min(canvas.clientWidth, canvas.clientHeight) / (2 * viewRadius);
  const originX = canvas.clientWidth / 2;
  const originY = canvas.clientHeight / 2;

  // Draw trails
  bodies.forEach((body) => {
    if (!body.history?.length) return;
    ctx.beginPath();
    body.history.forEach((p, idx) => {
      const x = originX + p.x * scale;
      const y = originY + p.y * scale;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = 1;
    ctx.stroke();
  });

  // Draw bodies
  bodies.forEach((body) => {
    const x = originX + body.position.x * scale;
    const y = originY + body.position.y * scale;
    const radius = Math.max(2, body.radius);

    const gradient = ctx.createRadialGradient(x - radius / 3, y - radius / 3, 1, x, y, radius * 1.4);
    gradient.addColorStop(0, "white");
    gradient.addColorStop(0.4, body.color || "#89cff0");
    gradient.addColorStop(1, "rgba(0,0,0,0.2)");

    ctx.beginPath();
    ctx.fillStyle = gradient;
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();
}

function loop(now) {
  const elapsed = (now - lastTime) / 1000; // seconds
  lastTime = now;

  if (running) {
    // Simulate fixed steps to keep integrator stable regardless of frame time
    pendingSimDays += elapsed * daysPerRealSecond; // convert real seconds to simulation days
    const maxSteps = 200; // higher cap to keep fast-forward smooth
    let steps = 0;

    while (pendingSimDays >= DT && steps < maxSteps) {
      stepSimulation(DT);
      pendingSimDays -= DT;
      steps++;
    }

    // Consume any small leftover to avoid visible stutter when slider is slow
    if (pendingSimDays > 0 && steps < maxSteps) {
      stepSimulation(pendingSimDays);
      pendingSimDays = 0;
    }
  }

  draw();
  requestAnimationFrame(loop);
}

function reset() {
  bodies = createBodies();
}

function init() {
  resize();
  window.addEventListener("resize", resize);
  canvas.addEventListener("click", reset);

  toggleButton.addEventListener("click", () => {
    running = !running;
    toggleButton.textContent = running ? "⏸ Pause" : "▶️ Reprendre";
  });

  resetButton.addEventListener("click", () => {
    reset();
    if (!running) {
      running = true;
      toggleButton.textContent = "⏸ Pause";
    }
  });

  if (speedSlider) {
    updateSpeed(speedSlider.value || daysPerRealSecond);
    speedSlider.addEventListener("input", (event) => {
      updateSpeed(event.target.value);
    });
  }

  reset();
  requestAnimationFrame(loop);
}

init();
