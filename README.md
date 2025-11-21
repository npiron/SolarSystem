# Neo Survivors Idle

Jeu incremental/auto-battler 100% client-side (HTML/JS/CSS). Aucun serveur : progression sauvegardée dans le navigateur via `localStorage`.

## Lancer

Ouvrir `index.html` dans le navigateur. Le personnage se déplace/tire automatiquement, les ennemis arrivent en vagues infinies, et les gains passifs continuent hors ligne.

Le canvas de l'arène tourne sur [Kontra.js](https://straker.github.io/kontra/), une micro-bibliothèque open source (~10k) qui gère la boucle de jeu et le rendu 2D sans dépendances serveur.

## Aperçu rapide

L'interface affiche trois colonnes pleine hauteur : statistiques et production passive à gauche, l'arène centrale plein écran où le personnage auto-mouvant survit en boucle, puis les améliorations et le bouton de prestige doux à droite. Tout tourne en local (HTML/CSS/JS) et se sauvegarde dans `localStorage` sans serveur.

## Comment jouer

- ⚡ **Essence** : générée passivement par les bâtiments (Drones, Forge, Spires). Investis-la pour augmenter la production par seconde.
- ✦ **Fragments** : drop en combat, matérialisés par de petits orbes aspirés automatiquement dans l'arène grâce au rayon de collecte. Servez-vous-en pour acheter des upgrades offensives (dégâts, cadence, régén, projectiles, portée, critiques).
- 🌊 **Vagues infinies** : le HUD de l'arène affiche la vague courante, les kills et les ressources gagnées pendant le run.
- ⟳ **Consolidation** : un prestige doux avec un petit temps de recharge qui remet la vague à 1 et augmente le multiplicateur passif permanent.
- ☠️ **Mort & reprise** : quand les PV tombent à zéro, la run se met en pause et un bouton « Relancer la run » permet de repartir.
- 🎯 **Critiques & tirs rotatifs** : les projectiles tournent en continu autour du héros et peuvent infliger des coups critiques massifs grâce aux upgrades dédiées.
- 🧿 **Défense & contrôle** : des améliorations ajoutent un bouclier (réduction de dégâts), de la perforation, de la portée et un aimant de collecte. Le HUD affiche aussi la vitesse de spawn effective.
- 🌀 **Tirs circulaires** : chaque niveau de projectiles génère un éventail circulaire autour du héros pour nettoyer toutes les directions, avec une rotation progressive.
- 🧪 **Debug local** : quelques boutons permettent de tester rapidement (ajout de ressources, avance de vagues, nettoyage d'ennemis) sans impacter la sauvegarde.

Tout est sauvegardé automatiquement toutes les quelques secondes (cookies/localStorage). Les valeurs sont abrégées (K, M, B…) puis passent en notation scientifique pour les très grands nombres. Pas de backend requis.
