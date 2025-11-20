# Neo Survivors Idle

Jeu incremental/auto-battler 100% client-side (HTML/JS/CSS). Aucun serveur : progression sauvegardée dans le navigateur via `localStorage`.

## Lancer

Ouvrir `index.html` dans le navigateur. Le personnage se déplace/tire automatiquement, les ennemis arrivent en vagues infinies, et les gains passifs continuent hors ligne.

## Aperçu rapide

L'interface affiche trois colonnes : statistiques et production passive à gauche, l'arène centrale avec le personnage auto-mouvant, puis les améliorations et le bouton de prestige doux à droite. Tout tourne en local (HTML/CSS/JS) et se sauvegarde dans `localStorage` sans serveur.

## Comment jouer

- ⚡ **Essence** : générée passivement par les bâtiments (Drones, Forge, Spires). Investis-la pour augmenter la production par seconde.
- ✦ **Fragments** : drop en combat et visibles dans l'arène. Servez-vous-en pour acheter des upgrades offensives (dégâts, cadence, régén, projectiles, portée).
- 🌊 **Vagues infinies** : le HUD de l'arène affiche la vague courante, les kills et les ressources gagnées pendant le run.
- ⟳ **Consolidation** : un prestige doux avec un petit temps de recharge qui remet la vague à 1 et augmente le multiplicateur passif permanent.

Tout est sauvegardé automatiquement toutes les quelques secondes (cookies/localStorage). Pas de backend requis.
