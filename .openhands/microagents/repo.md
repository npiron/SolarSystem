# Neo Survivors Idle - Description du Dépôt

## Vue d'ensemble

**Neo Survivors Idle** est un jeu incrémental/auto-battler 100% client-side développé en HTML/JavaScript/CSS avec TypeScript. Le jeu combine les mécaniques d'un jeu de survie automatique avec un système de progression incrémentale, le tout fonctionnant entièrement dans le navigateur sans serveur backend.

## Caractéristiques principales

- **100% Client-side** : Aucun serveur requis, toute la progression est sauvegardée dans `localStorage`
- **Auto-battler** : Le personnage se déplace et tire automatiquement
- **Système incrémental** : Production passive de ressources et améliorations permanentes
- **Rendu WebGL2** : Utilise un moteur de rendu WebGL2 personnalisé pour les performances
- **Système de prestige** : Mécanisme de "Consolidation" pour redémarrer avec des bonus
- **Arbre de talents** : Synergies persistantes pour personnaliser le gameplay
- **Vagues infinies** : Combat contre des ennemis en vagues progressivement plus difficiles

## Architecture technique

### Structure des fichiers

```
SolarSystem/
├── index.html              # Point d'entrée principal
├── package.json            # Configuration npm et scripts
├── vite.config.js          # Configuration Vite pour le build
├── tsconfig.json           # Configuration TypeScript
├── vitest.config.js        # Configuration des tests
├── public/                 # Assets statiques (CSS, images)
│   └── assets/styles/      # Feuilles de style
├── src/                    # Code source TypeScript
│   ├── main.ts            # Point d'entrée principal
│   ├── game.ts            # Boucle de jeu principale
│   ├── player.ts          # Logique du joueur
│   ├── config/            # Configuration du jeu
│   │   ├── constants.ts   # Constantes globales
│   │   ├── generators.ts  # Configuration des générateurs
│   │   ├── upgrades.ts    # Configuration des améliorations
│   │   ├── talents.ts     # Arbre de talents
│   │   └── tuning.ts      # Paramètres de gameplay
│   ├── systems/           # Systèmes de jeu
│   │   ├── combat.ts      # Système de combat
│   │   ├── economy.ts     # Système économique
│   │   ├── movement.ts    # Système de mouvement
│   │   ├── spawn.ts       # Génération d'ennemis
│   │   └── ui.ts          # Interface utilisateur
│   ├── renderer/          # Moteur de rendu WebGL2
│   │   ├── webgl2Renderer.ts
│   │   ├── webgl2Shaders.ts
│   │   ├── webgl2Text.ts
│   │   └── gpu/           # Particules GPU
│   └── types/             # Définitions TypeScript
├── tests/                 # Tests unitaires
├── examples/              # Exemples et démos
└── wiki/                  # Documentation du jeu
```

### Technologies utilisées

- **TypeScript** : Langage principal pour le type safety
- **Vite** : Build tool et serveur de développement
- **Vitest** : Framework de tests
- **WebGL2** : Rendu graphique haute performance
- **CSS3** : Styling avec animations et transitions
- **LocalStorage** : Persistance des données côté client

## Comment exécuter le code

### Prérequis

- **Node.js** (version 18 ou supérieure)
- **npm** (inclus avec Node.js)

### Installation et lancement

1. **Cloner le dépôt** :
   ```bash
   git clone https://github.com/npiron/SolarSystem.git
   cd SolarSystem
   ```

2. **Installer les dépendances** :
   ```bash
   npm install
   ```

3. **Lancer en mode développement** :
   ```bash
   npm run dev
   ```
   Le jeu sera accessible à l'adresse `http://localhost:5173`

4. **Alternative simple** (sans serveur de développement) :
   ```bash
   # Ouvrir directement index.html dans un navigateur
   # ou utiliser un serveur HTTP simple
   python -m http.server 8000
   ```
   Puis visiter `http://localhost:8000`

### Scripts disponibles

- `npm run dev` : Lance le serveur de développement Vite
- `npm run build` : Compile le projet pour la production
- `npm run preview` : Prévisualise la version de production
- `npm run test` : Exécute les tests unitaires avec couverture
- `npm run typecheck` : Vérifie les types TypeScript
- `npm run demo:particles` : Lance une démo des particules GPU

### Tests

```bash
# Exécuter tous les tests
npm test

# Tests en mode watch
npm run test -- --watch

# Tests avec couverture détaillée
npm run test -- --coverage --reporter=verbose
```

## Gameplay et mécaniques

### Ressources principales

- **Essence** : Générée passivement par les bâtiments, utilisée pour améliorer la production
- **Fragments** : Obtenus en combat, utilisés pour les améliorations offensives

### Systèmes de jeu

1. **Combat automatique** : Le héros tire automatiquement sur les ennemis
2. **Production passive** : Génération continue de ressources
3. **Système d'améliorations** : Upgrades pour dégâts, défense, collecte
4. **Consolidation** : Prestige doux qui remet à zéro avec des bonus permanents
5. **Arbre de talents** : Synergies persistantes entre les runs

### Interface utilisateur

- **Panneau gauche** : Statistiques, ressources, production passive
- **Zone centrale** : Arène de combat en temps réel
- **Panneau droit** : Améliorations, talents, prestige

## Déploiement

### GitHub Pages

Le projet est configuré pour un déploiement automatique sur GitHub Pages :

1. Activer GitHub Pages dans les paramètres du dépôt
2. Choisir "GitHub Actions" comme source
3. Pousser sur la branche `main` déclenche automatiquement le déploiement

### Build de production

```bash
npm run build
```

Génère un dossier `dist/` avec tous les fichiers optimisés pour la production.

## CI/CD et automatisation

- **Tests automatiques** : Exécutés sur chaque PR et push
- **Déploiement automatique** : GitHub Pages mis à jour automatiquement
- **Releases** : Création automatique de releases avec tags `v*.*.*`
- **Synchronisation Wiki** : Le contenu du dossier `wiki/` peut être synchronisé avec le Wiki GitHub

## Développement et contribution

### Structure du code

Le code est organisé en modules TypeScript avec une séparation claire des responsabilités :

- **Systèmes** : Logique de jeu modulaire
- **Renderer** : Moteur de rendu WebGL2 optimisé
- **Config** : Configuration centralisée du gameplay
- **Types** : Définitions TypeScript strictes

### Performance

- **Spatial hashing** : Optimisation des collisions
- **Budgets de particules** : Limitation des effets visuels
- **Mode performance** : Réduction des effets pour les appareils moins puissants
- **WebGL2** : Rendu accéléré par GPU

### Debugging

Le jeu inclut des outils de debug intégrés :
- Ajout rapide de ressources
- Avancement forcé des vagues
- Nettoyage d'ennemis
- Panneau de tuning en temps réel

## Documentation complète

Une documentation détaillée est disponible dans le [Wiki GitHub](../../wiki) couvrant :
- Guide de démarrage rapide
- Mécaniques de combat détaillées
- Système économique
- Arbre de talents
- FAQ et stratégies

## Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.