# Pistes de librairies pour enrichir le design

Ce projet utilise déjà **PixiJS** pour le rendu 2D et **Tailwind/DaisyUI** pour l'interface.
Les propositions ci-dessous ciblent des bibliothèques compatibles TypeScript et 100% client-side
pour augmenter la richesse visuelle sans alourdir l'architecture.

## HUD et mise en page
- **@pixi/ui** : widgets (barres, boutons, sliders) prévus pour Pixi, utiles pour unifier les panneaux HUD
  et séparer le layout de `renderer/` du cœur de jeu. Idéal pour garder la logique de scène isolée
  de la gestion d'état dans `systems/`.
  - Intégration : `npm i @pixi/ui` puis instancier les contrôles dans un helper `renderer/uiFactory.ts`
    pour garder la création de HUD centralisée.
- **pixi-viewport** : gestion du zoom/déplacement caméra et du parallax pour donner de la profondeur
  aux arènes. Le viewport peut être alimenté par les positions d'entités déjà gérées dans `systems/`.
  - Intégration : `npm i pixi-viewport` ; envelopper la scène principale dans un viewport configuré
    (damping, décélération) et exposer une API `systems/camera.ts` pour suivre une entité.
- **tailwindcss-animate** : pack de micro-animations CSS (fade, slide, pulse) pour adoucir les transitions
  des menus et overlays. Compatible avec la config Tailwind existante.
  - Intégration : `npm i tailwindcss-animate` puis ajouter le plugin dans `tailwind.config.js` ;
    appliquer les classes d'animation dans les composants UI existants.

## Effets visuels et détails
- **@pixi/particle-emitter** : émetteur GPU-friendly pour explosions, impacts et traînées.
  Les presets peuvent être stockés dans `src/config/` et instanciés via des helpers dans `renderer/`.
  - Intégration : `npm i @pixi/particle-emitter` ; charger les presets via `@pixi/assets` puis
    instancier/détruire les émetteurs dans `renderer/effects.ts`.
- **pixi-filters** (bloom, glow, crt, shockwave…) : collection officielle de filtres Pixi pour
  donner du relief aux projectiles, impacts et écrans de statut. À appliquer sur des conteneurs
  spécifiques afin d’éviter de toucher aux couches UI.
  - Intégration : `npm i pixi-filters` ; créer une map de filtres dans `src/config/filters.ts`
    pour éviter les recharges et permettre l'activation conditionnelle par scène.
- **@pixi/graphics-smooth** : améliore le rendu vectoriel (shapes, arcs) pour des halos ou boucliers
  plus nets sans multiplier les textures.
  - Intégration : `npm i @pixi/graphics-smooth` ; remplacer `PIXI.Graphics` par la variante smooth
    dans les helpers de dessin pour bénéficier de l'antialiasing.

## Audio et feedback
- **@pixi/sound** : lecture audio synchronisée à la boucle Pixi (spatialisation, gestion du volume
  global) pour renforcer l’impact des tirs et alerts HUD. Peut charger les assets via `@pixi/assets`.
  - Intégration : `npm i @pixi/sound`; prévoir un module `systems/audio.ts` pour router effets et
    musique avec un canal master et des volumes par catégorie.
- **howler** : alternative légère si l’on souhaite dissocier audio/renderer tout en gardant une API simple
  pour la musique d’ambiance et les effets courts.
  - Intégration : `npm i howler`; créer un wrapper minimal pour normaliser les appels (play/loop/stop)
    et centraliser le préchargement.

## Pipeline et assets
- **pixi-compressed-textures** : support des atlases compressés (basis/ktx) pour réduire la taille
  des sprites haute résolution sans pénaliser le chargement.
  - Intégration : `npm i pixi-compressed-textures`; déclarer les formats supportés dans la config Pixi
    et ajouter un script de conversion basis/ktx dans la pipeline assets.
- **lil-gui** (dev-only) : panneau de réglage temps-réel pour les paramètres d’effets (intensité du bloom,
  densité de particules) facilitant le tuning des presets stockés dans `src/config/`.
  - Intégration : `npm i lil-gui -D`; exposer un panneau derrière un flag debug (ex : `import.meta.env.DEV`)
    pour ajuster en direct les presets sans impacter le build prod.
