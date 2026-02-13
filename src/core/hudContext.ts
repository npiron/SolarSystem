import { canUnlockTalent } from "../systems/talents.ts";
import type { Generator, HudContext, Talent, Upgrade } from "../types/index.ts";

interface CreateHudContextOptions {
  uiRefs: HudContext["uiRefs"];
  generators: Generator[];
  upgrades: Upgrade[];
  talents: Talent[];
  computeIdleRate: () => number;
}

export function createHudContext({
  uiRefs,
  generators,
  upgrades,
  talents,
  computeIdleRate
}: CreateHudContextOptions): HudContext {
  return {
    elements: {
      essenceEl: document.getElementById("essence"),
      fragmentsEl: document.getElementById("fragments"),
      idleRateEl: document.getElementById("idleRate"),
      waveEl: document.getElementById("wave"),
      hpEl: document.getElementById("hp"),
      dpsEl: document.getElementById("dps"),
      damageRow: document.getElementById("damageRow"),
      spawnRateEl: document.getElementById("spawnRate"),
      pauseBtn: document.getElementById("pause"),
      softPrestigeBtn: document.getElementById("softPrestige"),
      statusEl: document.getElementById("statusMessage")
    },
    uiRefs,
    generators,
    upgrades,
    talents,
    computeIdleRate,
    canUnlockTalent
  };
}
