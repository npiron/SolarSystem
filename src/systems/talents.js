import { TALENT_RESET_COST, createTalentTree } from "../config/talents.js";

export function hydrateTalents(saved = []) {
  const tree = createTalentTree();
  const saveMap = new Map((saved || []).map((entry) => [entry.id, entry.unlocked]));
  return tree.map((node) => ({
    ...node,
    unlocked: saveMap.get(node.id) || false,
  }));
}

export function prerequisitesMet(talent, talents) {
  return (talent.requires || []).every((req) => talents.find((t) => t.id === req)?.unlocked);
}

export function canUnlockTalent(talent, talents, resources) {
  if (talent.unlocked) return false;
  if (resources.fragments < talent.cost) return false;
  return prerequisitesMet(talent, talents);
}

export function unlockTalent(talent, talents, state) {
  if (!canUnlockTalent(talent, talents, state.resources)) return false;
  state.resources.fragments -= talent.cost;
  talent.unlocked = true;
  return true;
}

export function resetTalents(talents, state) {
  if (state.resources.fragments < TALENT_RESET_COST) return false;
  state.resources.fragments -= TALENT_RESET_COST;
  talents.forEach((talent) => {
    talent.unlocked = false;
  });
  return true;
}

export function computeTalentBonuses(talents) {
  return talents
    .filter((talent) => talent.unlocked)
    .reduce(
      (acc, talent) => {
        const effect = talent.effect || {};
        if (effect.damageMult) acc.damage *= effect.damageMult;
        if (effect.fireDelayMult) acc.fireDelay *= effect.fireDelayMult;
        if (effect.economy) acc.economy *= effect.economy;
        if (effect.collectRadius) acc.collectRadius *= effect.collectRadius;
        if (effect.projectiles) acc.projectiles += effect.projectiles;
        if (effect.regen) acc.regen += effect.regen;
        if (effect.damageReduction) acc.damageReduction += effect.damageReduction;
        if (effect.critChance) acc.critChance += effect.critChance;
        if (effect.critMultiplier) acc.critMultiplier *= effect.critMultiplier;
        if (effect.bulletSpeed) acc.bulletSpeed *= effect.bulletSpeed;
        return acc;
      },
      {
        damage: 1,
        fireDelay: 1,
        economy: 1,
        collectRadius: 1,
        projectiles: 0,
        regen: 0,
        damageReduction: 0,
        critChance: 0,
        critMultiplier: 1,
        bulletSpeed: 1,
      }
    );
}
