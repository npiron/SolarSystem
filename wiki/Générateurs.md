# 🏭 Générateurs

Guide complet des générateurs de production passive de **Neo Survivors Idle**.

---

## 📋 Vue d'Ensemble

Les générateurs produisent de l'**Essence ⚡** de manière passive, même quand vous ne jouez pas activement.

### Liste des Générateurs

| Générateur | Icône | Production de base | Coût initial |
|------------|-------|-------------------|--------------|
| Drones collecteurs | 🤖 | 0.2 ⚡/s | 15 ⚡ |
| Forge astrale | 🔥 | 0.8 ⚡/s | 60 ⚡ |
| Spires quantiques | 🗼 | 3.0 ⚡/s | 250 ⚡ |
| Nexus dimensionnel | 🌀 | 12.0 ⚡/s | 1200 ⚡ |

---

## 🤖 Drones Collecteurs

> *De petits drones qui récoltent l'énergie ambiante.*

### Statistiques

| Propriété | Valeur |
|-----------|--------|
| Production de base | 0.2 ⚡/s par niveau |
| Coût initial | 15 ⚡ |
| Multiplicateur de coût | ×1.35 + 2 par niveau |

### Progression

| Niveau | Production | Coût |
|--------|------------|------|
| 1 | 0.2 ⚡/s | 15 ⚡ |
| 2 | 0.4 ⚡/s | 22 ⚡ |
| 3 | 0.6 ⚡/s | 32 ⚡ |
| 5 | 1.0 ⚡/s | 63 ⚡ |
| 10 | 2.0 ⚡/s | 231 ⚡ |

### Quand acheter

- **Premier achat** recommandé dès le début
- Bon ratio coût/production en early game
- Devient moins efficace en late game

---

## 🔥 Forge Astrale

> *Une forge qui transforme l'énergie stellaire en essence.*

### Statistiques

| Propriété | Valeur |
|-----------|--------|
| Production de base | 0.8 ⚡/s par niveau |
| Coût initial | 60 ⚡ |
| Multiplicateur de coût | ×1.35 + 2 par niveau |

### Progression

| Niveau | Production | Coût |
|--------|------------|------|
| 1 | 0.8 ⚡/s | 60 ⚡ |
| 2 | 1.6 ⚡/s | 83 ⚡ |
| 3 | 2.4 ⚡/s | 116 ⚡ |
| 5 | 4.0 ⚡/s | 218 ⚡ |
| 10 | 8.0 ⚡/s | 744 ⚡ |

### Quand acheter

- Après 2-3 Drones collecteurs
- Excellent rapport en mid-game
- Point d'entrée vers les générateurs premium

---

## 🗼 Spires Quantiques

> *Des tours qui captent l'énergie des fluctuations quantiques.*

### Statistiques

| Propriété | Valeur |
|-----------|--------|
| Production de base | 3.0 ⚡/s par niveau |
| Coût initial | 250 ⚡ |
| Multiplicateur de coût | ×1.35 + 2 par niveau |

### Progression

| Niveau | Production | Coût |
|--------|------------|------|
| 1 | 3.0 ⚡/s | 250 ⚡ |
| 2 | 6.0 ⚡/s | 340 ⚡ |
| 3 | 9.0 ⚡/s | 461 ⚡ |
| 5 | 15.0 ⚡/s | 842 ⚡ |
| 10 | 30.0 ⚡/s | 2,787 ⚡ |

### Quand acheter

- Quand les Forges deviennent chères
- Excellent pour préparer la Consolidation
- Transition vers le late game

---

## 🌀 Nexus Dimensionnel

> *Un portail vers d'autres dimensions qui siphonne leur énergie.*

### Statistiques

| Propriété | Valeur |
|-----------|--------|
| Production de base | 12.0 ⚡/s par niveau |
| Coût initial | 1200 ⚡ |
| Multiplicateur de coût | ×1.35 + 2 par niveau |

### Progression

| Niveau | Production | Coût |
|--------|------------|------|
| 1 | 12.0 ⚡/s | 1,200 ⚡ |
| 2 | 24.0 ⚡/s | 1,622 ⚡ |
| 3 | 36.0 ⚡/s | 2,192 ⚡ |
| 5 | 60.0 ⚡/s | 3,969 ⚡ |
| 10 | 120.0 ⚡/s | 12,892 ⚡ |

### Quand acheter

- Objectif majeur en mid-late game
- Production massive
- Justifie plusieurs Consolidations pour atteindre

---

## 📐 Formules

### Production par Générateur

```javascript
production = baseRate × (1.12 ^ niveau) × idleMultiplier × economyBonus
```

- `baseRate` : Production de base du générateur
- `niveau` : Nombre de niveaux achetés
- `idleMultiplier` : Multiplicateur de Consolidation
- `economyBonus` : Bonus des talents (Logistique quantique, etc.)

### Production Totale

```javascript
totalRate = Σ (production[i] × niveau[i])
```

### Coût d'Achat

```javascript
nouveauCoût = coûtActuel × 1.35 + niveau × 2
```

---

## 📊 Comparaison d'Efficacité

### Production/Coût Initial

| Générateur | Ratio (⚡/s par ⚡ investi) |
|------------|---------------------------|
| Drones | 0.013 |
| Forge | 0.013 |
| Spires | 0.012 |
| Nexus | 0.010 |

### Scaling Long Terme

Grâce au multiplicateur `1.12^niveau`, tous les générateurs deviennent exponentiellement plus efficaces avec le niveau.

---

## 🔄 Interaction avec le Prestige

### Effet de la Consolidation

La Consolidation augmente `idleMultiplier`, ce qui :
- Multiplie la production de **tous** les générateurs
- S'applique aux gains hors-ligne
- Se cumule d'une run à l'autre

### Exemple

Après une Consolidation à vague 25 (bonus ×2.25) :
- 10 Drones niveau 1 passent de 2 ⚡/s à 4.5 ⚡/s

---

## 🎯 Talents qui Affectent les Générateurs

| Talent | Effet |
|--------|-------|
| Logistique quantique | +18% production passive |
| Prospection runique | +12% production passive |

Avec les deux talents :
```javascript
economyBonus = 1.18 × 1.12 = 1.32 (×32%)
```

---

## 💡 Stratégie Optimale

### Early Game (Vagues 1-15)

1. 2-3 Drones collecteurs
2. 1-2 Forges astrales
3. Économiser pour Spires

### Mid Game (Vagues 15-35)

1. 2-3 Spires quantiques
2. Continuer à level up les générateurs existants
3. Viser le Nexus

### Late Game (Vagues 35+)

1. Premier Nexus dimensionnel
2. Équilibrer les niveaux
3. Talent Logistique quantique

### Règle Générale

> Achetez le générateur le plus efficace en termes de **production ajoutée / coût**.

---

## 🔢 Exemple de Build

### Début de Run (Fresh Start)

| Générateur | Niveau | Production |
|------------|--------|------------|
| Drones | 3 | 0.6 ⚡/s |
| Forge | 1 | 0.8 ⚡/s |
| **Total** | - | **1.4 ⚡/s** |

### Après Première Consolidation (×2)

| Générateur | Niveau | Production |
|------------|--------|------------|
| Drones | 5 | 2.0 ⚡/s |
| Forge | 3 | 4.8 ⚡/s |
| Spires | 1 | 6.0 ⚡/s |
| **Total** | - | **12.8 ⚡/s** |

---

## ➡️ Voir Aussi

- [[Ressources-et-Économie]] - Système économique complet
- [[Prestige-Consolidation]] - Multiplicateur passif
- [[Arbre-de-Talents]] - Talents économie
