# ⟳ Prestige et Consolidation

Guide complet du système de prestige de **Neo Survivors Idle**.

---

## 📋 Vue d'Ensemble

La **Consolidation** est le système de prestige "doux" du jeu. Elle permet de :
- Réinitialiser la progression de la run
- Obtenir un **multiplicateur permanent** sur la production passive
- Progresser plus efficacement sur le long terme

---

## 🔄 Comment Fonctionne la Consolidation

### Déclenchement

1. Cliquez sur le bouton **"⟳ Consolidation"** dans le panneau de droite
2. Attendez la fin du cooldown (8 secondes)
3. Recommencez depuis la vague 1

### Ce qui est Réinitialisé

| Élément | Réinitialisé ? |
|---------|----------------|
| Vague | ✅ Oui (retour à 1) |
| Ennemis | ✅ Oui (effacés) |
| Projectiles | ✅ Oui (effacés) |
| Fragments (orbes) | ✅ Oui (effacés) |
| HP | ✅ Oui (restauré au max) |
| Position joueur | ✅ Oui (recentré) |
| Stats de run | ✅ Oui (remis à 0) |

### Ce qui est Conservé

| Élément | Conservé ? |
|---------|------------|
| Essence ⚡ | ✅ Oui |
| Fragments ✦ | ✅ Oui |
| Générateurs | ✅ Oui (niveaux et coûts) |
| Upgrades | ✅ Oui (niveaux et coûts) |
| Talents | ✅ Oui |
| Multiplicateur passif | ✅ Oui (et augmenté !) |
| Jalons complétés | ✅ Oui |

---

## 📈 Calcul du Bonus

### Formule

```javascript
bonus = 1 + √(vague) × 0.25
idleMultiplier *= bonus
```

### Tableau des Bonus

| Vague | √Vague | Bonus | Multiplicateur |
|-------|--------|-------|----------------|
| 4 | 2.0 | ×1.50 | ×1.50 |
| 9 | 3.0 | ×1.75 | ×1.75 |
| 16 | 4.0 | ×2.00 | ×2.00 |
| 25 | 5.0 | ×2.25 | ×2.25 |
| 36 | 6.0 | ×2.50 | ×2.50 |
| 49 | 7.0 | ×2.75 | ×2.75 |
| 64 | 8.0 | ×3.00 | ×3.00 |
| 81 | 9.0 | ×3.25 | ×3.25 |
| 100 | 10.0 | ×3.50 | ×3.50 |

### Effet Cumulatif

Le multiplicateur est **cumulatif** d'une Consolidation à l'autre :

| Consolidation | Vague | Bonus | Multi Total |
|---------------|-------|-------|-------------|
| 1ère | 25 | ×2.25 | ×2.25 |
| 2ème | 30 | ×2.37 | ×5.33 |
| 3ème | 40 | ×2.58 | ×13.76 |
| 4ème | 50 | ×2.77 | ×38.07 |

---

## ⏱️ Cooldown

### Durée

**8 secondes** après chaque Consolidation.

### Affichage

Le bouton affiche le temps restant :
```
⟳ Consolidation (5.2s)
```

### Pourquoi un Cooldown ?

- Évite le spam accidentel
- Laisse le temps de voir le bonus
- Maintient un rythme de jeu

---

## 🆚 Consolidation vs Relancer

| Action | Consolidation | Relancer |
|--------|---------------|----------|
| Bonus multiplicateur | ✅ Oui | ❌ Non |
| Cooldown | 8 secondes | Immédiat |
| Utilisation | Progression | Après mort |

---

## 🎯 Quand Consolider ?

### Indicateurs

1. **Mort fréquente** : Vous mourez souvent sur la vague actuelle
2. **Stagnation** : Les ennemis prennent trop de temps à tuer
3. **Dégâts élevés** : Vous subissez plus de dégâts que votre régén
4. **Objectif atteint** : Vous avez atteint un jalon (vague 25, 50, etc.)

### Stratégies

#### Prestige Rapide (Speed Run)
- Consolidez dès vague 10-15
- Accumulez rapidement le multiplicateur
- Idéal pour les débuts

#### Prestige Optimal
- Attendez vague 25 minimum
- Bonus de ×2.25 significatif
- Bon équilibre temps/récompense

#### Prestige Tardif (Push)
- Visez vague 50+
- Pour les builds optimisés
- Maximum de bonus en une fois

---

## 📊 Impact sur la Production

### Exemple Concret

**Configuration** :
- 5 Drones (production 0.2 × 5 = 1.0 ⚡/s de base)
- 3 Forges (production 0.8 × 3 = 2.4 ⚡/s de base)
- Production totale de base : 3.4 ⚡/s

**Après Consolidation à vague 25** (×2.25) :
- Production : 3.4 × 2.25 = **7.65 ⚡/s**

**Après 3 Consolidations** (×13.76) :
- Production : 3.4 × 13.76 = **46.78 ⚡/s**

---

## 🔊 Feedback

### Audio
Un son de "sweep" descendant joue lors de la Consolidation.

### Visuel
Une bulle d'aide s'affiche :
> "Prestige doux : multiplicateur passif gagné !"

---

## 🏆 Jalon de Prestige

La **première Consolidation** est un jalon suivi par le système d'aide :

| Jalon | Description |
|-------|-------------|
| Première Consolidation | Le multiplicateur passif se cumule run après run |

---

## 💡 Conseils Avancés

### Optimisation du Temps

```
Temps pour vague X = X / 0.15 ≈ X × 6.67 secondes
```

| Vague | Temps approximatif |
|-------|-------------------|
| 10 | ~67 secondes |
| 25 | ~167 secondes (~3 min) |
| 50 | ~333 secondes (~5.5 min) |
| 100 | ~667 secondes (~11 min) |

### ROI (Retour sur Investissement)

Pour maximiser le multiplicateur par heure :
- Consolidations fréquentes à vague 15-25 en early game
- Consolidations plus espacées avec un build puissant

### Combinaison avec les Talents

Les talents **Logistique quantique** (+18%) et **Prospection runique** (+12%) se combinent avec le multiplicateur de Consolidation :

```javascript
productionFinale = base × niveauGénérateur × 1.12^niveau × idleMultiplier × talentEconomy
```

---

## 📉 Comparaison de Stratégies

### Stratégie A : 3 Consolidations rapides

| Consol. | Vague | Temps | Multi Total |
|---------|-------|-------|-------------|
| 1 | 15 | 1:40 | ×1.97 |
| 2 | 18 | 2:00 | ×4.06 |
| 3 | 20 | 2:13 | ×8.53 |
| **Total** | - | **~6 min** | **×8.53** |

### Stratégie B : 1 Consolidation longue

| Consol. | Vague | Temps | Multi Total |
|---------|-------|-------|-------------|
| 1 | 50 | 5:33 | ×2.77 |
| **Total** | - | **~5.5 min** | **×2.77** |

**Conclusion** : Les Consolidations fréquentes sont généralement plus efficaces en early game.

---

## ➡️ Voir Aussi

- [[Générateurs]] - Affectés par le multiplicateur
- [[Ressources-et-Économie]] - Système économique
- [[Conseils-et-Stratégies]] - Stratégies de progression
