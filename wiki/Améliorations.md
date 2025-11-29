# ⬆️ Améliorations (Upgrades)

Guide complet des améliorations de combat de **Neo Survivors Idle**.

---

## 📋 Vue d'Ensemble

Les améliorations s'achètent avec des **Fragments ✦** et améliorent vos capacités de combat.

### Tableau Récapitulatif

| Upgrade | Effet | Coût initial | Max |
|---------|-------|--------------|-----|
| Projectiles instables | +25% dégâts | 30 ✦ | 50 |
| Cadence hypersonique | +15% vitesse de tir | 45 ✦ | 40 |
| Gel réparateur | +3 HP/s régén | 50 ✦ | 15 |
| Pulsar chaotique | +1 projectile | 120 ✦ | 20 |
| Portée fractale | +20% portée | 80 ✦ | 25 |
| Balistique ionisée | +15% vitesse projectiles | 140 ✦ | 20 |
| Pointes critiques | +4% chance critique | 200 ✦ | 20 |
| Bouclier prismatique | +5% réduction dégâts | 220 ✦ | 12 |
| Percée quantique | +1 perforation | 260 ✦ | 10 |
| Rayon de collecte | +12% portée aspiration | 140 ✦ | 25 |
| Propulseurs quantiques | +8% vitesse déplacement | 100 ✦ | 15 |

---

## 🔥 Upgrades Offensives

### Projectiles Instables

> *Déstabilise vos projectiles pour des impacts plus violents.*

| Propriété | Valeur |
|-----------|--------|
| Effet | +25% dégâts par niveau |
| Coût initial | 30 ✦ |
| Maximum | 50 niveaux |
| Formule | `damage *= 1.25` |

**Progression des dégâts** :
| Niveau | Multiplicateur | Dégâts (base 12) |
|--------|---------------|------------------|
| 1 | ×1.25 | 15 |
| 5 | ×3.05 | 37 |
| 10 | ×9.31 | 112 |
| 20 | ×86.7 | 1,040 |
| 50 | ×70,065 | 840,780 |

---

### Cadence Hypersonique

> *Accélère le mécanisme de tir.*

| Propriété | Valeur |
|-----------|--------|
| Effet | +15% vitesse de tir (réduit le délai) |
| Coût initial | 45 ✦ |
| Maximum | 40 niveaux |
| Formule | `fireDelay *= 0.85` |

**Progression du délai** (base 0.65s) :
| Niveau | Délai | Tirs/seconde |
|--------|-------|--------------|
| 0 | 0.65s | 1.54 |
| 5 | 0.29s | 3.45 |
| 10 | 0.13s | 7.69 |
| 20 | 0.025s | 40.0 |

---

### Pulsar Chaotique

> *Génère des projectiles supplémentaires par tir.*

| Propriété | Valeur |
|-----------|--------|
| Effet | +1 projectile par niveau |
| Coût initial | 120 ✦ |
| Maximum | 20 niveaux |
| Formule | `projectiles += 1` |

**Impact sur le DPS** :
| Niveau | Projectiles | Multiplicateur DPS |
|--------|-------------|-------------------|
| 0 | 1 | ×1 |
| 5 | 6 | ×6 |
| 10 | 11 | ×11 |
| 20 | 21 | ×21 |

> ⭐ **Upgrade prioritaire** : Chaque niveau multiplie directement le DPS.

---

### Portée Fractale

> *Étend la portée de vos projectiles.*

| Propriété | Valeur |
|-----------|--------|
| Effet | +20% portée des projectiles |
| Coût initial | 80 ✦ |
| Maximum | 25 niveaux |
| Formule | `range *= 1.2` |

---

### Balistique Ionisée

> *Accélère les projectiles.*

| Propriété | Valeur |
|-----------|--------|
| Effet | +15% vitesse des projectiles |
| Coût initial | 140 ✦ |
| Maximum | 20 niveaux |
| Formule | `bulletSpeed *= 1.15` |

**Note** : La vitesse est plafonnée à 520 px/s.

---

### Pointes Critiques

> *Affûte vos projectiles pour des coups critiques.*

| Propriété | Valeur |
|-----------|--------|
| Effet | +4% chance de critique |
| Coût initial | 200 ✦ |
| Maximum | 20 niveaux |
| Multiplicateur | ×2.2 (fixe) |
| Formule | `critChance = min(0.9, critChance + 0.04)` |

**Progression** (base 8%) :
| Niveau | Chance | DPS boost moyen |
|--------|--------|-----------------|
| 5 | 28% | +34% |
| 10 | 48% | +58% |
| 20 | 88% | +106% |

---

### Percée Quantique

> *Permet aux projectiles de traverser les ennemis.*

| Propriété | Valeur |
|-----------|--------|
| Effet | +1 traversée par projectile |
| Coût initial | 260 ✦ |
| Maximum | 10 niveaux |
| Formule | `pierce += 1` |

Excellent contre les groupes denses d'ennemis.

---

## 🛡️ Upgrades Défensives

### Gel Réparateur

> *Nanobots réparateurs qui régénèrent les tissus.*

| Propriété | Valeur |
|-----------|--------|
| Effet | +3 HP/s régénération |
| Coût initial | 50 ✦ |
| Maximum | 15 niveaux |
| Formule | `regen += 3` |

**Progression** (base 2 HP/s) :
| Niveau | Régén | HP/minute |
|--------|-------|-----------|
| 5 | 17 HP/s | 1,020 HP |
| 10 | 32 HP/s | 1,920 HP |
| 15 | 47 HP/s | 2,820 HP |

---

### Bouclier Prismatique

> *Champ de force qui absorbe les impacts.*

| Propriété | Valeur |
|-----------|--------|
| Effet | +5% réduction de dégâts |
| Coût initial | 220 ✦ |
| Maximum | 12 niveaux |
| Formule | `damageReduction = min(0.7, damageReduction + 0.05)` |

**Progression** :
| Niveau | Réduction | Dégâts reçus |
|--------|-----------|--------------|
| 5 | 25% | 75% |
| 10 | 50% | 50% |
| 12 | 60% | 40% |

---

## 🧲 Upgrades Utilitaires

### Rayon de Collecte

> *Élargit le champ magnétique d'aspiration des fragments.*

| Propriété | Valeur |
|-----------|--------|
| Effet | +12% portée d'aspiration |
| Coût initial | 140 ✦ |
| Maximum | 25 niveaux |
| Formule | `collectRadius *= 1.12` |

**Progression** (base 90px) :
| Niveau | Rayon |
|--------|-------|
| 3 | 126px |
| 10 | 280px |
| 25 | 1,530px |

> 💡 Un des upgrades les plus confortables pour le farming.

---

### Propulseurs Quantiques

> *Boosters de déplacement.*

| Propriété | Valeur |
|-----------|--------|
| Effet | +8% vitesse de déplacement |
| Coût initial | 100 ✦ |
| Maximum | 15 niveaux |
| Formule | `speed *= 1.08` |

---

## 📈 Scaling des Coûts

```javascript
nouveauCoût = coûtActuel × 1.45 + niveau × 3
```

### Exemple : Projectiles Instables

| Niveau | Coût |
|--------|------|
| 1 | 30 ✦ |
| 2 | 47 ✦ |
| 3 | 74 ✦ |
| 5 | 166 ✦ |
| 10 | 693 ✦ |
| 20 | 11,239 ✦ |

---

## 🎯 Priorités d'Achat

### Tier S (Achat Prioritaire)

| Upgrade | Raison |
|---------|--------|
| 🔥 Pulsar chaotique | Multiplicateur direct du DPS |
| 🔥 Projectiles instables | +25% dégâts composés |

### Tier A (Important)

| Upgrade | Raison |
|---------|--------|
| ⏱️ Cadence hypersonique | Scaling exponentiel |
| 🎯 Pointes critiques | Burst damage |
| 🧲 Rayon de collecte | Confort + efficacité |

### Tier B (Bon)

| Upgrade | Raison |
|---------|--------|
| 💚 Gel réparateur | Survie |
| 🛡️ Bouclier prismatique | Survie en high wave |
| 💥 Percée quantique | Clear de masse |

### Tier C (Situationnel)

| Upgrade | Raison |
|---------|--------|
| 📡 Portée fractale | Moins de projectiles perdus |
| 💨 Balistique ionisée | Hit plus vite |
| 🏃 Propulseurs | Évitement |

---

## 💡 Synergies

| Combo | Effet |
|-------|-------|
| Pulsar + Cadence | DPS exponentiel |
| Critiques + Multi-proj | Crits fréquents |
| Bouclier + Régén | Tank infini |
| Collecte + Vitesse | Farming optimal |
| Perforation + Projectiles | Clear de groupes |

---

## ➡️ Voir Aussi

- [[Système-de-Combat]] - Mécanique de combat
- [[Arbre-de-Talents]] - Synergies avec les talents
- [[Ressources-et-Économie]] - Obtention des Fragments
