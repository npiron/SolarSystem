# ⚡ Performance et Optimisation

Guide pour optimiser les performances de **Neo Survivors Idle**.

---

## 🚀 Mode Performance

### Activation

Cliquez sur le bouton **"⚙️ Mode perfo"** dans la barre supérieure.

### Effets du Mode Perfo

| Élément | Mode Normal | Mode Perfo |
|---------|-------------|------------|
| Grille de fond | ✅ Affichée | ❌ Masquée |
| Pattern animé | ✅ Affiché | ❌ Masqué |
| Aura joueur | Riche | Simplifiée |
| Textes flottants | Durée 1.4s | Durée 0.9s |
| Glow des projectiles | ✅ Activé | ❌ Désactivé |
| Anneaux de fragments | ✅ Affichés | ❌ Masqués |
| Barres HP ennemis | Toujours | Seulement si touché |
| Sprites ennemis | Alpha 100% | Alpha 70% |
| Fragments | Alpha 100% | Alpha 85% |

### Quand l'Activer

- FPS en dessous de 30
- Vagues 50+ avec beaucoup d'ennemis
- Appareil moins puissant
- Préférence pour la fluidité

---

## 🎨 Addons Visuels

### Panneau Addons

Dans la section "Addons visuels" (colonne gauche, section repliable) :

| Addon | Description | Impact |
|-------|-------------|--------|
| ✨ Aura | Effet de lueur autour du joueur | Moyen |
| 🌟 Bloom | Effet de brillance sur projectiles/fragments | Fort |
| 🎞️ Grain | Effet de grain filmique sur le fond | Faible |
| 💫 Pulse | Animation de pulsation de l'aura | Faible |

### Désactiver pour les Performances

1. Désactivez **Bloom** en premier (plus gros impact)
2. Puis **Aura** si nécessaire
3. **Grain** et **Pulse** ont peu d'impact

---

## 📊 Moniteur FPS

### Activer l'Affichage

1. Ouvrez la section **"Performance"** (colonne gauche)
2. La valeur FPS actuelle est affichée
3. Cliquez sur **"📈 Afficher le graph"** pour voir l'historique

### Interpréter les Valeurs

| FPS | État |
|-----|------|
| 60+ | Excellent |
| 45-60 | Bon |
| 30-45 | Acceptable |
| < 30 | Dégradé → Activer Mode Perfo |

### Graphique FPS

- Ligne pointillée : Cible 60 FPS
- Ligne pleine : FPS actuel
- Zone ombrée : Historique

---

## 🔧 Budgets et Limites

### Budgets Intégrés

Le jeu impose des limites pour maintenir les performances :

| Élément | Limite | Comportement au dépassement |
|---------|--------|----------------------------|
| Projectiles | 520 max | Les plus anciens sont supprimés |
| Fragments (orbes) | 200 max | Fusionnés en gain direct |
| Textes flottants | 80 max | Les plus anciens sont supprimés |

### Spatial Hash

Le système de collision utilise un **spatial hash** :
- Cellules de 80×80 pixels
- Seules les cellules voisines sont testées
- Réduit drastiquement les calculs

---

## 💡 Conseils d'Optimisation

### Côté Navigateur

1. **Fermez les autres onglets** lourds
2. **Désactivez les extensions** non nécessaires
3. **Utilisez Chrome ou Edge** (meilleur WebGL)
4. **Mettez à jour les pilotes GPU**

### Côté Jeu

1. **Réduisez la fenêtre** si nécessaire
2. **Activez le Mode Perfo** en vagues hautes
3. **Désactivez les addons** visuels
4. **Utilisez la Consolidation** avant que les ennemis ne saturent l'écran

---

## 🖥️ Configuration Recommandée

### Minimum

| Composant | Minimum |
|-----------|---------|
| Navigateur | Chrome 90+, Firefox 88+, Edge 90+ |
| RAM | 4 Go |
| GPU | Support WebGL 1.0 |

### Recommandé

| Composant | Recommandé |
|-----------|------------|
| Navigateur | Dernière version stable |
| RAM | 8 Go+ |
| GPU | Support WebGL 2.0, GPU dédié |

---

## 🔍 Diagnostic

### Vérifier le Support WebGL

Ouvrez la console du navigateur (F12) et tapez :
```javascript
document.createElement('canvas').getContext('webgl2') ? 'WebGL2' : (document.createElement('canvas').getContext('webgl') ? 'WebGL1' : 'Pas de WebGL')
```

### Vérifier la Charge GPU

Dans Chrome :
1. Ouvrez `chrome://gpu`
2. Vérifiez "Graphics Feature Status"
3. "WebGL2" devrait être "Hardware accelerated"

---

## ⚠️ Problèmes Courants

### Le Jeu Ralentit avec le Temps

**Cause** : Trop d'entités à l'écran

**Solutions** :
1. Activez le Mode Perfo
2. Utilisez la Consolidation
3. Fermez et rouvrez le jeu

### FPS Instables

**Cause** : Garbage collection JavaScript

**Solutions** :
1. Fermez les autres onglets
2. Rafraîchissez la page
3. Le jeu utilise des pools d'objets pour minimiser ce problème

### Écran Noir

**Cause** : WebGL non disponible

**Solutions** :
1. Mettez à jour votre navigateur
2. Activez l'accélération matérielle
3. Mettez à jour les pilotes GPU

---

## 📱 Performance Mobile

### Considérations

- Le jeu fonctionne sur mobile mais n'est pas optimisé
- Écrans tactiles : interactions limitées
- Recommandé : Mode Perfo activé par défaut

### Optimisations Automatiques

Le jeu s'adapte à la taille de l'écran :
- Canvas redimensionné dynamiquement
- Moins d'entités sur petits écrans (moins d'espace = moins de spawns)

---

## 🔄 Sauvegarde et Performance

### Auto-Save

- Sauvegarde automatique toutes les **5 secondes**
- Utilise `localStorage` (rapide)
- Impact minimal sur les performances

### Taille de Sauvegarde

La sauvegarde est compacte :
- JSON sérialisé
- Quelques Ko maximum
- Pas de compression nécessaire

---

## 📈 Évolution des Performances

### Par Vague

| Vague | Ennemis typiques | FPS attendu (mode normal) |
|-------|------------------|---------------------------|
| 1-10 | 5-15 | 60 |
| 10-30 | 15-50 | 50-60 |
| 30-60 | 50-150 | 40-55 |
| 60-100 | 150-300 | 30-45 |
| 100+ | 300+ | Mode Perfo recommandé |

---

## ➡️ Voir Aussi

- [[Installation]] - Configuration système
- [[FAQ]] - Questions fréquentes
- [[Interface-et-HUD]] - Options d'interface
