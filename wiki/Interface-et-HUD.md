# 🖥️ Interface et HUD

Guide de l'interface utilisateur de **Neo Survivors Idle**.

---

## 📐 Structure Globale

L'interface est organisée en **trois colonnes** principales :

```
┌──────────────────────────────────────────────────────────────┐
│                        BARRE SUPÉRIEURE                       │
│  [Réinitialiser] [Son] [Mode perfo] [Pause]                  │
├───────────────┬──────────────────────┬───────────────────────┤
│               │                      │                       │
│   PANNEAU     │        ARÈNE         │      PANNEAU          │
│   GAUCHE      │       CENTRALE       │       DROIT           │
│               │                      │                       │
│  Statistiques │   Zone de combat     │   Améliorations       │
│  Production   │   Canvas WebGL2      │   Talents             │
│  Performance  │                      │   Prestige            │
│  Générateurs  │                      │   Aide                │
│               │                      │                       │
├───────────────┴──────────────────────┴───────────────────────┤
│                        PIED DE PAGE                           │
└──────────────────────────────────────────────────────────────┘
```

---

## 🔝 Barre Supérieure

### Éléments

| Bouton | Fonction |
|--------|----------|
| 🔄 Réinitialiser la progression | Efface la sauvegarde |
| 🔊 Son ON / 🔇 Son coupé | Toggle audio |
| ⚙️ Mode perfo / 🚀 Perfo ON | Toggle performances |
| ⏸ Pause / ▶️ Reprendre | Pause/reprend le jeu |

### Badge de Version

En bas à droite, un badge affiche la version actuelle : `v0.1.0`

---

## ◀️ Panneau Gauche

### Section Ressources

| Affichage | Description |
|-----------|-------------|
| ⚡ Essence | Quantité actuelle |
| ✦ Fragments | Quantité actuelle |
| ⏱ Gain passif | Production par seconde |

### Section Run en Cours

| Affichage | Description |
|-----------|-------------|
| 🌊 Vague | Numéro de vague actuelle |
| ❤️ Vie | HP actuel / HP max |
| 🔥 Dégâts | DPS estimé |
| 🎯 Critiques | Chance % × multiplicateur |
| 🧿 Bouclier | Réduction de dégâts % |
| 🧲 Collecte | Rayon en pixels |
| 🌀 Spawn | Taux de spawn effectif |

### Section Performance (Repliable)

| Affichage | Description |
|-----------|-------------|
| 🎞️ FPS | Images par seconde |
| 📈 Graphique | Historique FPS (toggle) |

### Section Addons Visuels (Repliable)

| Bouton | Effet |
|--------|-------|
| ✨ Aura | Toggle glow joueur |
| 🌟 Bloom | Toggle bloom projectiles |
| 🎞️ Grain | Toggle effet grain |
| 💫 Pulse | Toggle pulsation aura |

### Section Production Passive

Liste des **générateurs** avec :
- Nom et niveau
- Production actuelle
- Bouton d'achat avec coût

---

## 🎮 Arène Centrale

### Canvas

Zone de combat rendue avec WebGL2.

### Éléments Affichés

| Élément | Visuel |
|---------|--------|
| Joueur | Sprite circulaire bleu avec aura |
| Projectiles | Petits cercles jaunes/blancs |
| Ennemis | Sprites colorés avec barre HP |
| Fragments | Orbes roses avec anneau |
| Textes flottants | Dégâts, gains, critiques |

### HUD Intégré

En haut à gauche de l'arène :
- 🌊 Vague X.X
- ⚔️ Kills N
- ✦ Fragments N
- ⚡ Essence N
- (Ticker de gains récents)

### Zone d'Overlay

Sous l'arène, informations contextuelles :
- Instructions de jeu
- Message de statut (ex: "Vous êtes hors service")

---

## ▶️ Panneau Droit

### Section Aide Rapide

Checklist des premières étapes :
- ✓/○ Tir auto lancé
- ✓/○ Premier achat
- ✓/○ Première Consolidation

### Section Jalons

Liste des objectifs à atteindre :
- Vague 10, 25, 50
- Pulsar chaotique
- Rayon niveau 3
- etc.

### Section Arbre de Talents (Repliable)

Grille de talents avec :
- État (actif/inactif)
- Coût
- Prérequis
- Bouton de reset

### Section Améliorations

Liste des **upgrades** avec :
- Nom et description
- Niveau actuel / max
- Bouton d'achat avec coût

### Section Prestige

| Bouton | Fonction |
|--------|----------|
| ⟳ Consolidation | Lance le prestige (avec cooldown) |
| ↻ Relancer | Redémarre la run sans bonus |

### Section Comment Jouer (Repliable)

Guide résumé des mécaniques.

### Section Debug (Repliable)

Outils de test pour développeurs :
- +1M ⚡
- +1M ✦
- +10 vagues
- ☄️ Clear ennemis

---

## 📱 Sections Repliables

### Fonctionnement

- Cliquez sur l'en-tête **h2** pour replier/déplier
- L'état est sauvegardé dans `localStorage`
- Flèche ▶/▼ indique l'état

### Sections Repliables

| Section | État par défaut |
|---------|-----------------|
| Performance | Repliée |
| Addons visuels | Repliée |
| Arbre de talents | Dépliée |
| Comment jouer | Repliée |
| Debug | Repliée |

---

## 💬 Bulles d'Aide

### Déclenchement

Des bulles contextuelles apparaissent lors de :
- Premier tir automatique
- Premier achat
- Première Consolidation

### Apparence

- Positionnées près de l'élément concerné
- Disparaissent après ~4 secondes
- Animation d'entrée/sortie

---

## 🔢 Format des Nombres

### Abréviations

| Suffixe | Valeur |
|---------|--------|
| K | 1,000 |
| M | 1,000,000 |
| B | 1,000,000,000 |
| T | 1,000,000,000,000 |
| ... | Suffixes étendus |

### Notation Scientifique

Au-delà des suffixes : `1.23E+18`

### Exemples

| Valeur | Affichage |
|--------|-----------|
| 500 | 500 |
| 1,234 | 1.23K |
| 12,345,678 | 12.35M |
| 1e20 | 1.00E+20 |

---

## 🎨 Thème et Couleurs

### Palette Principale

| Couleur | Hex | Usage |
|---------|-----|-------|
| Bleu clair | #7dd3fc | Joueur, aura |
| Rose | #f9a8d4 | Fragments |
| Jaune | #ffd166 | Projectiles, énergie |
| Violet clair | #a5b4fc | Accents |
| Vert émeraude | #6ee7b7 | Collecte, vie |

### Typographie

| Police | Usage |
|--------|-------|
| Fredoka | Titres, HUD |
| Baloo 2 | Textes principaux |
| Nunito | Textes secondaires |

---

## ♿ Accessibilité

### Clavier

- Les en-têtes repliables sont focusables (Tab)
- Entrée/Espace pour toggle
- `aria-expanded` pour lecteurs d'écran

### Contraste

- Textes clairs sur fond sombre
- Icônes avec suffisamment de contraste

---

## 📐 Responsive

### Comportement

- Le canvas s'adapte à la taille du conteneur
- Les colonnes restent en place (pas de stacking)
- Le HUD intégré se réduit sur petits écrans

### Redimensionnement

Le canvas est redimensionné dynamiquement via :
```javascript
window.addEventListener("resize", () => resizeCanvas())
```

---

## ➡️ Voir Aussi

- [[Démarrage-Rapide]] - Premiers pas
- [[Performance-et-Optimisation]] - Options visuelles
- [[FAQ]] - Questions sur l'interface
