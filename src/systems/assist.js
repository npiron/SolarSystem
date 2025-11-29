const quickSteps = [
  { id: "shot", label: "Tir auto lancé : vise les vagues pour ramasser des ✦" },
  { id: "purchase", label: "Acheter un générateur ⚡ ou une upgrade ✦" },
  { id: "prestige", label: "Lancer une Consolidation quand les vagues coincent" }
];

const milestoneDefinitions = [
  { id: "wave10", label: "Atteindre la vague 10", detail: "Les ennemis deviennent sérieux, pense aux dégâts.", check: (state) => state.assist.bestWave >= 10 },
  { id: "wave25", label: "Atteindre la vague 25", detail: "Zone idéale pour consolider et doubler le passif.", check: (state) => state.assist.bestWave >= 25 },
  { id: "wave50", label: "Atteindre la vague 50", detail: "Ton build devient vraiment puissant à ce stade.", check: (state) => state.assist.bestWave >= 50 },
  { id: "aoe", label: "Débloquer Pulsar chaotique", detail: "+1 projectile pour snowball les vagues.", check: (_, upgrades) => (upgrades?.find((u) => u.id === "aoe")?.level || 0) >= 1 },
  { id: "collect", label: "Rayon de collecte niveau 3", detail: "Aspire les ✦ sans traverser l'arène.", check: (_, upgrades) => (upgrades?.find((u) => u.id === "collect")?.level || 0) >= 3 },
  { id: "speed", label: "Propulseurs niveau 3", detail: "Esquive plus vite pour survivre plus longtemps.", check: (_, upgrades) => (upgrades?.find((u) => u.id === "speed")?.level || 0) >= 3 },
  { id: "prestige", label: "Première Consolidation", detail: "Le multiplicateur passif se cumule run après run.", check: (state) => state.assist.firstPrestige }
];

function isStepDone(state, id) {
  switch (id) {
    case "shot":
      return state.assist.firstShot;
    case "purchase":
      return state.assist.firstPurchase;
    case "prestige":
      return state.assist.firstPrestige;
    default:
      return false;
  }
}

function renderQuickHelp(state, quickHelpList) {
  if (!quickHelpList) return;
  quickHelpList.innerHTML = "";
  quickSteps.forEach((step) => {
    const li = document.createElement("li");
    li.className = isStepDone(state, step.id) ? "done" : "";
    li.textContent = step.label;
    quickHelpList.appendChild(li);
  });
}

function renderMilestones(state, milestoneList, upgrades) {
  if (!milestoneList) return;
  milestoneList.innerHTML = "";
  milestoneDefinitions.forEach((def) => {
    const complete = def.check(state, upgrades);
    if (complete && !state.assist.completed.includes(def.id)) {
      state.assist.completed.push(def.id);
    }
    const item = document.createElement("li");
    item.className = complete ? "done" : "pending";
    item.innerHTML = `<div><strong>${def.label}</strong><p class="muted">${def.detail}</p></div><span class="status">${complete ? "✔" : "…"}</span>`;
    milestoneList.appendChild(item);
  });
}

function showBubble(container, target, text) {
  if (!container || !target) return;
  const rect = target.getBoundingClientRect();
  const bubble = document.createElement("div");
  bubble.className = "assist-bubble";
  bubble.textContent = text;
  bubble.style.left = `${rect.left + rect.width / 2}px`;
  bubble.style.top = `${rect.top - 10 + window.scrollY}px`;
  container.appendChild(bubble);
  requestAnimationFrame(() => bubble.classList.add("visible"));
  setTimeout(() => {
    bubble.classList.remove("visible");
    setTimeout(() => bubble.remove(), 220);
  }, 4200);
}

export function initAssist(state, { quickHelpList, milestoneList, bubbleContainer, anchors, upgrades }) {
  renderQuickHelp(state, quickHelpList);
  renderMilestones(state, milestoneList, upgrades);

  function recordShot() {
    if (state.assist.firstShot) return;
    state.assist.firstShot = true;
    renderQuickHelp(state, quickHelpList);
    showBubble(bubbleContainer, anchors?.arena, "Tir automatique en route ! Vise les drops ✦");
  }

  function recordPurchase() {
    const firstPurchase = !state.assist.firstPurchase;
    if (firstPurchase) {
      state.assist.firstPurchase = true;
      renderQuickHelp(state, quickHelpList);
      const target = anchors?.generators || anchors?.upgrades;
      showBubble(bubbleContainer, target, "Achats validés : ta production monte.");
    }
    renderMilestones(state, milestoneList, upgrades);
  }

  function recordPrestige() {
    const firstPrestige = !state.assist.firstPrestige;
    if (firstPrestige) {
      state.assist.firstPrestige = true;
      renderQuickHelp(state, quickHelpList);
      showBubble(bubbleContainer, anchors?.prestige, "Prestige doux : multiplicateur passif gagné !");
    }
    renderMilestones(state, milestoneList, upgrades);
  }

  function trackWave(wave) {
    const rounded = Math.floor(wave);
    if (rounded > (state.assist.bestWave || 1)) {
      state.assist.bestWave = rounded;
      renderMilestones(state, milestoneList, upgrades);
    }
  }

  function refreshMilestones() {
    renderMilestones(state, milestoneList, upgrades);
  }

  return {
    recordShot,
    recordPurchase,
    recordPrestige,
    trackWave,
    refreshMilestones
  };
}
