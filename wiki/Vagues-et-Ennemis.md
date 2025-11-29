# 🌊 Vagues et Ennemis

Guide complet du système de vagues infinies de **Neo Survivors Idle**.

---

## 🌊 Système de Vagues

### Progression

Les vagues avancent **continuellement** au fil du temps :

```javascript
vague += dt × 0.15  // ~0.15 niveau par seconde
```

Cela signifie qu'une vague complète prend environ **6-7 secondes**.

### Effets de la Vague

La vague courante affecte :
- HP des ennemis
- Vitesse des ennemis
- Récompenses
- Fréquence de spawn
- Chance d'élite

---

## 👾 Statistiques des Ennemis

### Formules

| Stat | Formule | Exemple (Vague 10) |
|------|---------|-------------------|
| HP | `20 + vague × 7` | 90 HP |
| Vitesse | `40 + vague × 1.8` | 58 px/s |
| Récompense | `2 + vague × 0.7` | 9 ⚡ |

### Élites

Les ennemis élites sont plus dangereux mais plus rentables :

| Stat | Modificateur |
|------|--------------|
| HP | ×2.8 |
| Vitesse | ×0.9 (plus lent) |
| Récompense | ×3 |

---

## 📈 Taux de Spawn

### Fréquence

```javascript
tauxSpawn = min(10, 1.6 + vague × 0.1)  // spawns par seconde
```

| Vague | Taux (ennemis/s) |
|-------|------------------|
| 1 | 1.7 |
| 10 | 2.6 |
| 25 | 4.1 |
| 50 | 6.6 |
| 84+ | 10.0 (max) |

### Taille des Packs

Les ennemis spawent en groupes :

```javascript
packSize = min(6, max(1, floor(1 + ((vague - 1) / 12)^0.65)))
```

| Vague | Taille du pack |
|-------|----------------|
| 1-5 | 1 |
| 6-15 | 2 |
| 16-30 | 3 |
| 31-50 | 4 |
| 51-80 | 5 |
| 81+ | 6 (max) |

### Spawn Total par Seconde

Le HUD affiche le spawn effectif :
```javascript
spawnEffectif = tauxSpawn × packSize
```

---

## 🎯 Chance d'Élite

### Formule

```javascript
pressionPack = pack >= 6 ? 0.05 : (pack / 6) × 0.02
chance = min(0.65, 0.12 + vague × 0.0018 + pressionPack)
```

| Vague | Chance d'élite |
|-------|----------------|
| 1 | ~12% |
| 25 | ~17% |
| 50 | ~21% |
| 100 | ~30% |
| 300 | ~65% (max) |

---

## 📍 Position de Spawn

Les ennemis apparaissent depuis les **4 bords** de l'arène :

```
       ┌─────────────────────────┐
       │  ↓    ↓    ↓    ↓    ↓  │  ← Bord haut
       │                         │
   →   │                         │   ←  Bords gauche/droite
       │                         │
       │  ↑    ↑    ↑    ↑    ↑  │  ← Bord bas
       └─────────────────────────┘
```

Le côté est choisi aléatoirement, puis la position sur ce côté.

---

## ⚔️ Comportement des Ennemis

### Mouvement

Les ennemis se dirigent **directement vers le joueur** :

```javascript
angle = atan2(joueur.y - ennemi.y, joueur.x - ennemi.x)
ennemi.x += cos(angle) × vitesse × dt
ennemi.y += sin(angle) × vitesse × dt
```

### Attaque

Les ennemis infligent des dégâts au **contact** :

```javascript
dégâts = 18 × dt × (1 + vague × 0.05) × (1 - bouclier)
```

| Vague | Dégâts/s (sans bouclier) |
|-------|--------------------------|
| 1 | ~19 DPS |
| 10 | ~27 DPS |
| 25 | ~41 DPS |
| 50 | ~63 DPS |

---

## 🏆 Récompenses

### Par Ennemi

| Récompense | Normal | Élite |
|------------|--------|-------|
| Essence ⚡ | `2 + vague × 0.7` | ×3 |
| Fragments ✦ | (Essence × 0.35) en orbe | ×3 |

### Exemple (Vague 25)

| Type | Essence | Fragments |
|------|---------|-----------|
| Normal | 19.5 ⚡ | 6.8 ✦ |
| Élite | 58.5 ⚡ | 20.5 ✦ |

---

## 📊 Tableau de Progression

| Vague | HP | Vitesse | Récompense | Spawn/s | Élites |
|-------|-----|---------|------------|---------|--------|
| 1 | 27 | 42 | 2.7 | 1.7 | 12% |
| 10 | 90 | 58 | 9 | 2.6 | 14% |
| 25 | 195 | 85 | 19.5 | 4.1 | 17% |
| 50 | 370 | 130 | 37 | 6.6 | 21% |
| 100 | 720 | 220 | 72 | 10 | 30% |

---

## 💀 Mort et Restart

### Quand le joueur meurt

1. `hp <= 0` → `dead = true`
2. Le jeu se met en pause (`running = false`)
3. Message : "Vous êtes hors service"
4. Option : "↻ Relancer la run"

### Relancer la run

Le bouton **Relancer** effectue un **soft reset** :
- Remet la vague à 1
- Restaure les HP
- Efface les ennemis/projectiles
- **Conserve** les upgrades et ressources

---

## 🎯 Jalons de Vagues

| Jalon | Signification |
|-------|---------------|
| **Vague 10** | Les ennemis deviennent sérieux |
| **Vague 25** | Zone idéale pour la première Consolidation |
| **Vague 50** | Build vraiment puissant |
| **Vague 100+** | Endgame, optimisation requise |

---

## 💡 Stratégies

### Survie

1. **Bouclier** : Réduit les dégâts de contact
2. **Régénération** : Compense les dégâts
3. **Vitesse** : Évite les groupes d'ennemis

### Farming Efficace

1. **Projectiles multiples** : Nettoie les groupes
2. **Cadence élevée** : Plus de tirs
3. **Collecte améliorée** : Ne rate aucun fragment

### Quand Consolider

La règle générale :
- **Consolidez** quand vous stagnez ou mourez souvent
- Le bonus de vague 25 donne un multiplicateur ×2.25
- Mieux vaut consolider régulièrement que stagner

---

## ➡️ Voir Aussi

- [[Système-de-Combat]] - Mécanique de combat
- [[Prestige-Consolidation]] - Système de prestige
- [[Conseils-et-Stratégies]] - Optimisation
