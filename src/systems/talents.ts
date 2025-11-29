import type { Resources, SavedTalent, Talent, TalentBonuses } from "../types/index.ts";
import { createTalentTree, TALENT_RESET_COST } from "../config/talents.ts";

export { TALENT_RESET_COST };

export function hydrateTalents(saved?: SavedTalent[] | null): Talent[] {
  const tree = createTalentTree();
  if (!saved) return tree.map((t) => ({ ...t, unlocked: false }));
  const saveMap = new Map(saved.map((entry) => [entry.id, entry.unlocked]));
  return tree.map((talent) => ({
    ...talent,
    unlocked: saveMap.get(talent.id) ?? false
  }));
}

export function prerequisitesMet(talent: Talent, talents: Talent[]): boolean {
  if (!talent.requires || talent.requires.length === 0) return true;
  return talent.requires.every((reqId) => {
    const req = talents.find((t) => t.id === reqId);
    return req?.unlocked === true;
  });
}

export function canUnlockTalent(talent: Talent, talents: Talent[], resources: Resources): boolean {
  if (talent.unlocked) return false;
  if (!prerequisitesMet(talent, talents)) return false;
  if (resources.fragments < talent.cost) return false;
  return true;
}

export function unlockTalent(talent: Talent, talents: Talent[], state: { resources: Resources }): boolean {
  if (!canUnlockTalent(talent, talents, state.resources)) return false;
  state.resources.fragments -= talent.cost;
  talent.unlocked = true;
  return true;
}

export function resetTalents(talents: Talent[], state: { resources: Resources }): boolean {
  if (state.resources.fragments < TALENT_RESET_COST) return false;
  state.resources.fragments -= TALENT_RESET_COST;
  talents.forEach((talent) => {
    talent.unlocked = false;
  });
  return true;
}

export function computeTalentBonuses(talents: Talent[]): TalentBonuses {
  const bonuses: TalentBonuses = {
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
  };

  talents.forEach((talent) => {
    if (!talent.unlocked || !talent.effect) return;
    const e = talent.effect;
    if (e.damageMult !== undefined) bonuses.damage *= e.damageMult;
    if (e.fireDelayMult !== undefined) bonuses.fireDelay *= e.fireDelayMult;
    if (e.economy !== undefined) bonuses.economy *= e.economy;
    if (e.collectRadius !== undefined) bonuses.collectRadius *= e.collectRadius;
    if (e.projectiles !== undefined) bonuses.projectiles += e.projectiles;
    if (e.regen !== undefined) bonuses.regen += e.regen;
    if (e.damageReduction !== undefined) bonuses.damageReduction += e.damageReduction;
    if (e.critChance !== undefined) bonuses.critChance += e.critChance;
    if (e.critMultiplier !== undefined) bonuses.critMultiplier *= e.critMultiplier;
    if (e.bulletSpeed !== undefined) bonuses.bulletSpeed *= e.bulletSpeed;
  });

  return bonuses;
}
