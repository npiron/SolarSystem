# ⚔️ Système de Combat

Guide complet du système de combat automatique de **Neo Survivors Idle**.

---

## 🎯 Vue d'Ensemble

Le combat dans Neo Survivors Idle est **entièrement automatique** :
- Le personnage se déplace seul
- Les projectiles tirent automatiquement
- Les fragments sont aspirés automatiquement

Votre rôle est d'**investir stratégiquement** vos ressources pour optimiser le combat.

---

## 👤 Le Personnage

### Statistiques de Base

| Stat | Valeur initiale | Description |
|------|-----------------|-------------|
| ❤️ Vie (HP) | 120 | Points de vie max |
| 🔥 Dégâts | 12 | Dégâts par projectile |
| ⏱️ Cadence | 0.65s | Délai entre les tirs |
| 🎯 Critique | 8% | Chance de coup critique |
| ✖️ Multi Crit | x2.0 | Multiplicateur de critique |
| 🛡️ Bouclier | 0% | Réduction de dégâts |
| 🔄 Régén | 2 HP/s | Régénération de vie |
| 🧲 Collecte | 90px | Rayon d'aspiration |
| 💨 Vitesse | 95 | Vitesse de déplacement |
| 🔫 Projectiles | 1 | Nombre de projectiles par tir |
| 📡 Portée | x1.0 | Multiplicateur de portée |
| 💥 Perforation | 0 | Ennemis traversés par projectile |

### Déplacement Automatique

Le personnage suit une logique intelligente :
1. **S'il y a des fragments** → Se dirige vers le plus proche
2. **Sinon** → Se déplace en orbite autour du centre

---

## 🔫 Projectiles

### Fonctionnement

Les projectiles sont tirés automatiquement en **cercle complet** autour du personnage :

```
         ●
        /|\
       / | \
      ●  ●  ●    ← Projectiles
       \ | /
        \|/
     [JOUEUR]
```

### Paramètres des Projectiles

| Paramètre | Description |
|-----------|-------------|
| Nombre | Défini par `projectiles` (1 de base, +1 par Pulsar) |
| Vitesse | 260 px/s de base, max 520 px/s |
| Durée de vie | ~1.2s × portée, max 2.4s |
| Rotation | Les projectiles tournent progressivement |
| Budget | Maximum 520 projectiles simultanés |

### Perforation

Avec l'upgrade **Percée quantique**, les projectiles peuvent traverser plusieurs ennemis :
- Perforation 0 : Le projectile disparaît au premier impact
- Perforation 1+ : Traverse N ennemis avant de disparaître

---

## 🎯 Coups Critiques

### Calcul

```
Si random() < critChance:
    dégâts = damage × critMultiplier
Sinon:
    dégâts = damage
```

### Progression

| Source | Bonus |
|--------|-------|
| Base | 8% chance, x2.0 multi |
| Pointes critiques (upgrade) | +4% chance par niveau |
| Cascade critique (talent) | +3% chance, x1.1 multi |
| Catapulte d'énergie (talent) | +6% chance |

### Limite

La chance de critique est plafonnée à **90%** (upgrades) ou **95%** (avec talents).

---

## 👾 Ennemis

### Spawn

Les ennemis apparaissent depuis les **bords de l'écran** :
- Fréquence : 1.6/s de base, +0.1/s par vague (max 10/s)
- Pack : 1 ennemi de base, jusqu'à 6 par spawn
- Direction : Se dirigent vers le joueur

### Types d'Ennemis

| Type | Caractéristiques |
|------|------------------|
| **Normal** | HP et vitesse standards |
| **Elite** | HP ×2.8, vitesse ×0.9, récompense ×3 |

### Chance d'Elite

```javascript
chance = 0.12 + vague × 0.0018 + pressionPack
// Maximum : 65%
```

### Statistiques par Vague

| Stat | Formule |
|------|---------|
| HP | 20 + vague × 7 |
| Vitesse | 40 + vague × 1.8 |
| Récompense | 2 + vague × 0.7 |

---

## 💀 Mort et Dégâts

### Dégâts Subis

Quand un ennemi touche le joueur :
```javascript
dégâts = 18 × dt × (1 + vague × 0.05) × (1 - bouclier)
```

### Mort du Joueur

Quand HP ≤ 0 :
1. Le jeu se met en **pause**
2. Un message s'affiche
3. Le bouton **"Relancer la run"** permet de recommencer

### Régénération

```javascript
hp = min(maxHp, hp + regen × dt)
```

---

## 🏆 Récompenses

### À la mort d'un ennemi

| Récompense | Quantité |
|------------|----------|
| ⚡ Essence | `reward` (direct) |
| ✦ Fragments | `reward × 0.35` (orbe à collecter) |

### Fragments (Orbes)

Les fragments apparaissent comme des **orbes** :
- Durée de vie : 12 secondes
- Se font aspirer dans le rayon de collecte
- Budget : Maximum 200 orbes simultanés
- En cas de dépassement, les fragments sont fusionnés

---

## 📊 DPS Estimé

Le HUD affiche un DPS estimé calculé ainsi :

```javascript
avgDamage = damage × (1 + critChance × (critMultiplier - 1))
dps = (avgDamage / fireDelay) × projectiles
```

**Exemple** :
- Dégâts : 100
- Critique : 20% × 2.5
- Cadence : 0.5s
- Projectiles : 4

```
avgDamage = 100 × (1 + 0.2 × 1.5) = 130
dps = (130 / 0.5) × 4 = 1040 DPS
```

---

## ⚡ Optimisation du Combat

### Priorités d'Upgrade

1. **Projectiles instables** (+25% dégâts) → Impact immédiat
2. **Pulsar chaotique** (+1 projectile) → Scaling multiplicatif
3. **Cadence hypersonique** (+15% vitesse) → Plus de tirs
4. **Pointes critiques** (+4% crit) → Dégâts burst
5. **Rayon de collecte** → Confort et efficacité

### Synergies

| Combo | Effet |
|-------|-------|
| Projectiles + Cadence | DPS exponentiel |
| Critiques + Multi-proj | Critiques fréquents |
| Bouclier + Régén | Survie prolongée |
| Collecte + Vitesse | Farming optimal |

---

## 🔧 Collision et Spatial Hash

Pour optimiser les performances, le jeu utilise un **spatial hash** :
- L'arène est divisée en cellules de 80×80 pixels
- Les collisions ne sont testées que dans les cellules adjacentes
- Réduit drastiquement le nombre de tests de collision

---

## ➡️ Voir Aussi

- [[Ressources-et-Économie]] - Utilisation des récompenses
- [[Améliorations]] - Détail des upgrades de combat
- [[Arbre-de-Talents]] - Synergies de combat
