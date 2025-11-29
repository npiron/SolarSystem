# 💰 Ressources et Économie

Guide complet du système économique de **Neo Survivors Idle**.

---

## 📊 Les Deux Ressources

| Icône | Nom | Source Principale | Utilisation |
|-------|-----|-------------------|-------------|
| ⚡ | **Essence** | Production passive + combat | Générateurs |
| ✦ | **Fragments** | Combat + aspiration | Upgrades, Talents |

---

## ⚡ Essence

### Sources d'Essence

| Source | Description |
|--------|-------------|
| **Combat** | Chaque ennemi vaincu donne de l'Essence |
| **Production passive** | Les générateurs produisent de l'Essence/seconde |
| **Hors-ligne** | Continue à accumuler même le jeu fermé |

### Formule de Production Passive

```javascript
// Par générateur
production = baseRate × (1.12 ^ niveau) × idleMultiplier × economyBonus

// Total
totalRate = Σ(production[i] × niveau[i])
```

### Utilisation de l'Essence

L'Essence sert **uniquement** à acheter des **générateurs** :

| Générateur | Coût initial | Production/niveau |
|------------|--------------|-------------------|
| Drones collecteurs | 15 ⚡ | 0.2 ⚡/s |
| Forge astrale | 60 ⚡ | 0.8 ⚡/s |
| Spires quantiques | 250 ⚡ | 3.0 ⚡/s |
| Nexus dimensionnel | 1200 ⚡ | 12.0 ⚡/s |

---

## ✦ Fragments

### Sources de Fragments

| Source | Description |
|--------|-------------|
| **Orbes de combat** | Lâchés par les ennemis vaincus |
| **Production passive** | 35% de la production d'Essence |
| **Hors-ligne** | 40% de la production d'Essence hors-ligne |

### Mécanisme d'Aspiration

1. Ennemi vaincu → Orbe apparaît à sa position
2. Orbe se déplace aléatoirement
3. Dans le rayon de collecte → Attiré vers le joueur
4. Contact avec le joueur → Fragments ajoutés

### Utilisation des Fragments

Les Fragments servent à acheter :

| Type | Exemples |
|------|----------|
| **Upgrades** | Dégâts, cadence, critiques, bouclier... |
| **Talents** | Synergies persistantes |
| **Reset talents** | 1200 ✦ pour réinitialiser l'arbre |

---

## 📈 Scaling des Coûts

### Générateurs

```javascript
nouveauCoût = coût × 1.35 + niveau × 2
```

### Upgrades

```javascript
nouveauCoût = coût × 1.45 + niveau × 3
```

### Exemple de Progression

| Niveau | Coût Drone (⚡) | Coût Attack (✦) |
|--------|----------------|-----------------|
| 1 | 15 | 30 |
| 2 | 22 | 47 |
| 3 | 32 | 71 |
| 4 | 45 | 106 |
| 5 | 63 | 157 |

---

## 🔄 Multiplicateur Passif (Idle Multiplier)

### Fonction

Multiplie **toute** la production passive :
- Production des générateurs
- Gains de fragments passifs
- Gains hors-ligne

### Comment l'augmenter

Seule la **Consolidation** (prestige) augmente le multiplicateur :

```javascript
bonus = 1 + √(vague) × 0.25
idleMultiplier *= bonus
```

### Exemple

| Vague | Bonus | Multiplicateur cumulé |
|-------|-------|----------------------|
| 10 | ×1.79 | ×1.79 |
| 25 | ×2.25 | ×4.03 |
| 50 | ×2.77 | ×11.15 |
| 100 | ×3.50 | ×39.03 |

---

## ⏰ Gains Hors-ligne

### Fonctionnement

Quand vous revenez dans le jeu :
1. Le temps écoulé est calculé
2. Les gains passifs sont appliqués
3. Maximum : **3 heures** de gains

### Formule

```javascript
essenceHorsLigne = tauxProduction × tempsÉcoulé
fragmentsHorsLigne = essenceHorsLigne × 0.4
```

### Limites

| Paramètre | Valeur |
|-----------|--------|
| Temps max | 3 heures (10800 secondes) |
| Ratio fragments | 40% de l'Essence |

---

## 💎 Économie des Talents

### Coûts des Talents

Les talents ont des coûts fixes en Fragments :

| Tier | Coût moyen | Exemples |
|------|------------|----------|
| T1 | 320-520 ✦ | Focus fulgurant, Logistique quantique |
| T2 | 450-760 ✦ | Polarité stable, Prospection runique |
| T3 | 720-1100 ✦ | Flux conducteur, Catapulte d'énergie |

### Bonus Économie

Le talent **Logistique quantique** augmente la production passive de **+18%**, et **Prospection runique** ajoute **+12%** supplémentaires.

---

## 📊 Stratégie Économique

### Phase 1 : Démarrage (Vagues 1-10)

1. Achetez 1-2 Drones collecteurs
2. Investissez les Fragments dans les dégâts
3. Économisez pour la Forge astrale

### Phase 2 : Croissance (Vagues 10-25)

1. Équilibrez générateurs et upgrades
2. Priorité au Pulsar chaotique (+1 projectile)
3. Développez le rayon de collecte

### Phase 3 : Pré-Prestige (Vagues 25+)

1. Maximisez la production passive
2. Préparez la Consolidation
3. Investissez dans les talents économie

### Phase 4 : Post-Prestige

1. Le multiplicateur accélère tout
2. Réinvestissez rapidement
3. Visez des vagues plus hautes

---

## 🔢 Affichage des Nombres

Les grands nombres sont abrégés :

| Suffixe | Valeur |
|---------|--------|
| K | Milliers (10³) |
| M | Millions (10⁶) |
| B | Milliards (10⁹) |
| T | Billions (10¹²) |
| Qa | Quadrillions (10¹⁵) |

Au-delà, notation scientifique : `1.23E+18`

---

## 💡 Conseils

1. **Ne stockez pas** : Investissez continuellement
2. **Générateurs d'abord** : La production passive est exponentielle
3. **Consolidez tôt** : Le multiplicateur se cumule
4. **Talents économie** : Logistique quantique est un excellent premier talent

---

## ➡️ Voir Aussi

- [[Générateurs]] - Détail des générateurs
- [[Améliorations]] - Liste des upgrades
- [[Prestige-Consolidation]] - Système de prestige
