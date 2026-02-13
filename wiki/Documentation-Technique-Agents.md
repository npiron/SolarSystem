# 🧠 Documentation Technique (Contributeurs & Agents)

Ce guide sert d’orientation rapide pour tout agent (ou développeur) qui intervient sur le code.

---

## 🎯 Entrées principales

- `index.html` : structure UI (panneaux, HUD, canvas)
- `src/main.ts` : bootstrap applicatif, wiring des systèmes, boucle principale, sauvegarde périodique
- `src/game.ts` : update frame par frame (spawn, déplacement, combat, économie passive)
- `src/renderer/render.ts` : rendu visuel des entités et effets

Boucle simplifiée :

1. `main.ts` initialise l’état + UI + renderer
2. `game.ts:update(...)` fait évoluer l’état
3. `renderer/render.ts:render(...)` dessine la frame
4. `systems/hud.ts:updateHud(...)` met à jour l’interface
5. `config/persistence.ts:saveGame(...)` sauvegarde régulièrement

---

## 🗂️ Où modifier quoi

| Besoin | Fichier(s) recommandé(s) |
| --- | --- |
| Nouvelles valeurs d’équilibrage | `src/config/constants.ts`, `src/config/tuning.ts` |
| Nouveau générateur | `src/config/generators.ts` + `src/systems/ui.ts` |
| Nouvelle upgrade | `src/config/upgrades.ts` + `src/systems/progression.ts` |
| Nouveau talent | `src/config/talents.ts` + `src/systems/talents.ts` |
| Nouvelle logique de combat | `src/systems/combat/*` + boucle `updateCombat` actuelle dans `src/systems/combat_old.ts` (ré-exportée par `src/systems/combat/index.ts`) |
| Nouveau comportement de vague/ennemis | `src/systems/spawn.ts`, `src/config/enemyVariants.ts` |
| Affichage HUD/panneaux | `src/systems/hud.ts`, `src/systems/ui.ts`, `src/systems/*Hud*.ts` |
| Rendu GPU/WebGL2 | `src/renderer/*` |
| Persistance localStorage | `src/config/persistence.ts` (`STORAGE_KEY` dans `src/config/constants.ts`) |

---

## 🧩 État global

La source de vérité est `GameState` dans `src/types/state.ts`.

Zones importantes :
- `resources` (essence, fragments, multiplicateurs)
- `player` (position, vitesse, stats combat)
- `enemies`, `bullets`, `fragmentsOrbs`
- `talents`, `weapons`, `runStats`, `performance`

Règle pratique : les transitions de gameplay vont dans `src/systems/`, pas dans le renderer.

---

## 💾 Persistance

- Sauvegarde : `saveGame(...)` dans `src/config/persistence.ts`
- Chargement : `loadSave(...)` dans le même module
- Stockage : `localStorage` uniquement (aucun backend)
- Les gains hors-ligne sont appliqués au chargement

Quand vous ajoutez une donnée persistée :
1. ajoutez-la au schéma de save/load
2. gardez une valeur par défaut robuste pour les anciennes saves

---

## ✅ Vérifications locales utiles

```bash
npm test
npm run typecheck
npm run build
```

---

## ⚠️ Notes de maintenance

- Le projet est en TypeScript (ES modules) ; suivre le style d’import existant (avec ou sans extension selon le contexte/outils)
- Des fichiers historiques existent (`combat_old.ts`, `combat_backup.ts`) : préférez les modules actifs importés depuis `src/main.ts` et `src/game.ts`
- Garder le projet 100% client-side : ne pas introduire de dépendance serveur
