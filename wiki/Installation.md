# 📦 Installation

Guide complet pour installer et déployer **Neo Survivors Idle**.

---

## 🖥️ Prérequis

### Pour jouer localement
- Un navigateur web moderne (Chrome, Firefox, Edge, Safari)
- Support WebGL recommandé pour de meilleures performances

### Pour le développement
- Node.js 18+ (recommandé)
- npm ou yarn

---

## 📥 Installation Locale

### 1. Cloner le dépôt

```bash
git clone https://github.com/OWNER/SolarSystem.git
cd SolarSystem
```

### 2. Installer les dépendances (développement)

```bash
npm install
```

### 3. Lancer le serveur de développement

```bash
npm run dev
```

Le jeu sera accessible sur `http://localhost:5173`

---

## 🏗️ Build de Production

### Construire le projet

```bash
npm run build
```

Les fichiers optimisés seront générés dans le dossier `dist/`.

### Prévisualiser le build

```bash
npm run preview
```

---

## 🌐 Déploiement sur GitHub Pages

Le dépôt inclut un workflow GitHub Actions qui déploie automatiquement le jeu.

### Configuration

1. **Allez dans Settings > Pages** de votre dépôt
2. **Choisissez Source: GitHub Actions**
3. **Poussez sur `main` ou `work`**

Le workflow `Deploy Pages` se déclenche automatiquement et publie le site.

### URL du déploiement

```
https://<utilisateur>.github.io/<nom-du-depot>/
```

---

## 📦 Structure du Projet

```
SolarSystem/
├── index.html              # Point d'entrée
├── package.json            # Configuration npm
├── vite.config.js          # Configuration Vite
├── vitest.config.js        # Configuration des tests
│
├── public/                 # Assets statiques
│   ├── assets/
│   │   ├── styles/         # CSS
│   │   └── ...             # Images, icônes
│   └── index.html          # Redirection compatibilité
│
├── src/                    # Code source JavaScript
│   ├── main.js             # Point d'entrée JS, boucle de jeu
│   ├── config/             # Configuration du jeu
│   │   ├── constants.js    # Constantes globales
│   │   ├── generators.js   # Définition des générateurs
│   │   ├── upgrades.js     # Définition des upgrades
│   │   └── talents.js      # Arbre de talents
│   └── systems/            # Systèmes de jeu
│       ├── combat.js       # Logique de combat
│       ├── spawn.js        # Spawn des ennemis
│       ├── hud.js          # Interface utilisateur
│       ├── assist.js       # Aide contextuelle
│       ├── talents.js      # Logique des talents
│       └── sound.js        # Audio procédural
│
├── tests/                  # Tests unitaires
│   ├── config.test.js
│   └── talents.test.js
│
├── wiki/                   # Documentation (ce wiki)
│
└── .github/
    └── workflows/          # CI/CD GitHub Actions
        ├── test.yml        # Tests automatiques
        ├── deploy-pages.yml# Déploiement Pages
        └── release.yml     # Création de releases
```

---

## 🧪 Tests

### Lancer les tests

```bash
npm test
```

### Avec couverture de code

```bash
npm run test -- --coverage
```

---

## 🔄 CI/CD

Le projet utilise GitHub Actions pour l'automatisation :

| Workflow | Déclencheur | Action |
|----------|-------------|--------|
| **Test** | Push sur `main`/`work`, PR | Exécute `npm test` |
| **Deploy Pages** | Push sur `main`/`work` | Déploie sur GitHub Pages |
| **Release** | Tag `v*.*.*` | Crée une release avec archive |

---

## 📝 Releases

### Créer une release

```bash
# 1. Mettre à jour CHANGELOG.md
# 2. Créer et pousser un tag
git tag v1.0.0
git push origin v1.0.0
```

Le workflow `release.yml` :
1. Archive le dépôt (`release.zip`)
2. Crée une Release GitHub
3. Génère les notes automatiquement

Voir [[RELEASE_PROCESS.md|../RELEASE_PROCESS.md]] pour plus de détails.

---

## 🔧 Configuration

### Variables d'environnement

Le jeu est 100% client-side et ne nécessite aucune variable d'environnement.

### Personnalisation

Les fichiers de configuration principaux :

| Fichier | Description |
|---------|-------------|
| `src/config/constants.js` | Version, limites, palettes |
| `src/config/generators.js` | Générateurs de production |
| `src/config/upgrades.js` | Améliorations disponibles |
| `src/config/talents.js` | Arbre de talents |

---

## 🐛 Dépannage

### Le jeu ne se charge pas

1. Vérifiez que JavaScript est activé
2. Ouvrez la console du navigateur (F12)
3. Vérifiez les erreurs de chargement de ressources

### Performances faibles

1. Activez le **Mode perfo** (bouton ⚙️)
2. Réduisez la taille de la fenêtre
3. Désactivez les addons visuels (Aura, Bloom)

### Sauvegarde perdue

Les données sont dans `localStorage`. Vérifiez :
```javascript
localStorage.getItem("neo-survivors-save")
```

---

## ➡️ Prochaine Étape

Consultez [[Démarrage-Rapide]] pour apprendre à jouer !
