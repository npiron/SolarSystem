# Neo Survivors Idle

[![Tests](https://github.com/OWNER/SolarSystem/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/OWNER/SolarSystem/actions/workflows/test.yml)
[![Pages](https://github.com/OWNER/SolarSystem/actions/workflows/deploy-pages.yml/badge.svg?branch=main)](https://github.com/OWNER/SolarSystem/actions/workflows/deploy-pages.yml)
[![Release](https://github.com/OWNER/SolarSystem/actions/workflows/release.yml/badge.svg)](https://github.com/OWNER/SolarSystem/actions/workflows/release.yml)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Wiki](https://img.shields.io/badge/📖_Wiki-Documentation-blue)](wiki/Home.md)

Jeu incremental/auto-battler 100% client-side (HTML/JS/CSS). Aucun serveur : progression sauvegardée dans le navigateur via `localStorage`.

## 📖 Documentation

Une documentation complète du jeu est disponible dans le [**Wiki**](wiki/Home.md) :

- 🚀 [Démarrage rapide](wiki/Démarrage-Rapide.md) - Comment lancer et jouer
- ⚔️ [Système de combat](wiki/Système-de-Combat.md) - Mécaniques de combat
- 💰 [Ressources et économie](wiki/Ressources-et-Économie.md) - Gestion des ressources
- 🏭 [Générateurs](wiki/Générateurs.md) - Production passive
- ⬆️ [Améliorations](wiki/Améliorations.md) - Upgrades de combat
- 🌳 [Arbre de talents](wiki/Arbre-de-Talents.md) - Synergies persistantes
- ⟳ [Prestige](wiki/Prestige-Consolidation.md) - Système de Consolidation
- ❓ [FAQ](wiki/FAQ.md) - Questions fréquentes

## Lancer

- Ouvrir `index.html` à la racine du dépôt ou démarrer un petit serveur statique (`python -m http.server 8000`) puis visiter [http://localhost:8000](http://localhost:8000).
- Le personnage se déplace/tire automatiquement, les ennemis arrivent en vagues infinies, et les gains passifs continuent hors ligne.

## Déployer sur GitHub Pages

Le dépôt contient un workflow GitHub Actions (`Deploy Pages`) qui publie automatiquement le site statique depuis la racine.

1. Dans l'onglet **Settings > Pages** du dépôt, choisir **Source: GitHub Actions**.
2. Pousser sur `main` (ou `work`) : le workflow génère l'artefact et déploie sur GitHub Pages.
3. L'URL finale est de la forme `https://<utilisateur>.github.io/<nom-du-depot>/` et sert directement `index.html` à la racine.

## Automatisation CI/CD

- **Tests** : le workflow `Test` (branches `main` et `work`, PR) installe les dépendances via `npm ci` et exécute `npm test`.
- **Pages** : `Deploy Pages` publie automatiquement la version statique dès qu'un commit arrive sur `main` ou `work`.
- **Release** : pousser un tag `v*.*.*` déclenche `Release` qui archive le dépôt et génère une Release GitHub avec notes automatiques.
- **Maintenance** : Dependabot (`.github/dependabot.yml`) peut être activé pour tenir `npm` et les actions GitHub à jour de manière hebdomadaire.

## Releases, tags et patch notes

- Le versionnement suit SemVer (`vMAJOR.MINOR.PATCH`).
- Pousser un tag `v*.*.*` déclenche le workflow `.github/workflows/release.yml` : il archive l'état du dépôt (`release.zip`), crée la Release GitHub et génère les notes automatiquement.
- Le fichier `CHANGELOG.md` peut être complété avant de taguer : déplacez les entrées de la section « Unreleased » vers la version en cours avec la date du jour.
- Le détail complet du flux est décrit dans `RELEASE_PROCESS.md`.

```
.
├── index.html           # Point d'entrée statique servi à la racine
├── public/              # Assets livrables (HTML + CSS)
│   ├── assets/styles/   # Styles globaux
│   └── index.html       # Redirection vers la racine (compatibilité)
└── src/                 # Code source JS (modules et configuration)
    ├── config/          # Constantes, générateurs et upgrades déclarés
    └── main.js          # Boucle de jeu, état et logique UI
```

Le canvas de l'arène tourne sur [PixiJS](https://pixijs.com/), une bibliothèque WebGL/Canvas open source qui gère la boucle de rendu 2D côté client sans dépendances serveur.

Un bouton « Mode perfo » dans le header coupe certains effets visuels, regroupe les gains flottants et maintient la lisibilité même quand des centaines d'entités sont actives.

## Aperçu rapide

L'interface affiche trois colonnes pleine hauteur : statistiques et production passive à gauche, l'arène centrale plein écran où le personnage auto-mouvant survit en boucle, puis les améliorations et le bouton de prestige doux à droite. Tout tourne en local (HTML/CSS/JS) et se sauvegarde dans `localStorage` sans serveur.

## Aide contextuelle et jalons

- Un panneau « Aide rapide » coche automatiquement tes premières étapes (tir auto, premier achat, première consolidation) grâce à des bulles qui s'affichent sur l'arène, les boutons d'achat et la Consolidation.
- Un tracker de jalons dans la colonne de droite rappelle les vagues franchies et les upgrades clés (Pulsar chaotique, rayon de collecte niveau 3) pour garder l'économie et le prestige alignés.

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
- 🚀 **Performance** : un spatial hash réduit les collisions à tester et des budgets limitent projectiles/particules. Active le mode perfo pour des effets allégés et des gains regroupés en ticker.

Tout est sauvegardé automatiquement toutes les quelques secondes (cookies/localStorage). Les valeurs sont abrégées (K, M, B…) puis passent en notation scientifique pour les très grands nombres. Pas de backend requis.
