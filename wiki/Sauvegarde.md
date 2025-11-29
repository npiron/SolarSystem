# 💾 Sauvegarde

Guide du système de sauvegarde de **Neo Survivors Idle**.

---

## 📋 Vue d'Ensemble

La progression est sauvegardée **localement** dans le navigateur via `localStorage`. Aucun compte ni serveur n'est requis.

---

## 🔄 Sauvegarde Automatique

### Fréquence

Le jeu sauvegarde automatiquement **toutes les 5 secondes**.

### Déclencheurs Additionnels

La sauvegarde est aussi effectuée après :
- Achat de générateur
- Achat d'upgrade
- Déblocage de talent
- Consolidation (prestige)
- Relancer la run
- Pause du jeu
- Changement de paramètres (son, addons)

---

## 📦 Données Sauvegardées

### Ressources

| Donnée | Description |
|--------|-------------|
| `essence` | Quantité d'Essence ⚡ |
| `fragments` | Quantité de Fragments ✦ |
| `idleMultiplier` | Multiplicateur de Consolidation |

### Progression

| Donnée | Description |
|--------|-------------|
| `wave` | Vague actuelle |
| `generators` | Niveaux et coûts des générateurs |
| `upgrades` | Niveaux et coûts des upgrades |
| `talents` | Talents débloqués |

### Stats du Joueur

| Donnée | Description |
|--------|-------------|
| `damage` | Dégâts actuels |
| `fireDelay` | Délai de tir |
| `projectiles` | Nombre de projectiles |
| `regen` | Régénération HP |
| `range` | Portée |
| `bulletSpeed` | Vitesse des projectiles |
| `damageReduction` | Réduction de dégâts |
| `pierce` | Perforation |
| `collectRadius` | Rayon de collecte |
| `critChance` | Chance de critique |
| `critMultiplier` | Multiplicateur critique |
| `speed` | Vitesse de déplacement |

### Système d'Aide

| Donnée | Description |
|--------|-------------|
| `firstShot` | Premier tir effectué |
| `firstPurchase` | Premier achat effectué |
| `firstPrestige` | Première consolidation |
| `bestWave` | Meilleure vague atteinte |
| `completed` | Jalons complétés |

### Paramètres

| Donnée | Description |
|--------|-------------|
| `audio.enabled` | Son activé/désactivé |
| `addons` | État des effets visuels |
| `lastSeen` | Horodatage de dernière session |

---

## ⏰ Gains Hors-Ligne

### Fonctionnement

Quand vous revenez dans le jeu :
1. Le temps écoulé depuis `lastSeen` est calculé
2. Les gains passifs sont appliqués proportionnellement
3. Un message peut s'afficher si le temps était plafonné

### Formules

```javascript
essenceHorsLigne = tauxProduction × tempsÉcoulé
fragmentsHorsLigne = essenceHorsLigne × 0.4
```

### Limite

| Paramètre | Valeur |
|-----------|--------|
| Temps maximum | 3 heures (10800 secondes) |

Si vous êtes parti plus de 3 heures, seules 3 heures de gains sont appliquées.

---

## 🔑 Clé de Stockage

La sauvegarde est stockée sous la clé :
```
neo-survivors-save
```

### Voir la Sauvegarde

Dans la console du navigateur (F12) :
```javascript
localStorage.getItem("neo-survivors-save")
```

### Format

JSON structuré, exemple simplifié :
```json
{
  "resources": {
    "essence": 1500.5,
    "fragments": 750.2,
    "idleMultiplier": 2.25
  },
  "wave": 15.3,
  "generators": [
    {"level": 5, "cost": 63},
    {"level": 2, "cost": 83}
  ],
  "upgrades": [
    {"level": 3, "cost": 74},
    {"level": 1, "cost": 65}
  ],
  "talents": [
    {"id": "focus_fulgurant", "unlocked": true}
  ],
  "audio": {"enabled": true},
  "addons": {
    "glow": true,
    "bloom": true,
    "grain": false,
    "hudPulse": true
  },
  "lastSeen": 1700000000000
}
```

---

## 🗑️ Réinitialisation

### Via l'Interface

1. Cliquez sur **"Réinitialiser la progression"** dans la barre supérieure
2. Confirmez dans la boîte de dialogue
3. La page se recharge avec une progression vierge

### Via la Console

```javascript
localStorage.removeItem("neo-survivors-save");
location.reload();
```

### Attention

⚠️ **Cette action est irréversible !** Toute la progression sera perdue.

---

## 📤 Export/Import (Manuel)

### Exporter

```javascript
// Dans la console
const save = localStorage.getItem("neo-survivors-save");
console.log(save);
// Copiez le résultat
```

### Importer

```javascript
// Dans la console
const save = '{"resources":...}'; // Votre sauvegarde
localStorage.setItem("neo-survivors-save", save);
location.reload();
```

---

## 🔄 Migration de Sauvegarde

### Entre Navigateurs

1. Exportez la sauvegarde du navigateur source
2. Importez dans le navigateur cible

### Entre Appareils

1. Exportez la sauvegarde
2. Transférez le texte JSON (email, fichier, etc.)
3. Importez sur l'autre appareil

### Limitations

- Pas de cloud save intégré
- Transfert manuel requis

---

## 🛡️ Sécurité et Intégrité

### Données Locales

- Les données restent sur votre appareil
- Aucune transmission à un serveur
- Pas de compte utilisateur

### Corruption

Si la sauvegarde est corrompue :
- Un message d'erreur s'affiche dans la console
- Le jeu continue avec une nouvelle partie
- La sauvegarde corrompue est ignorée

### Prévention

- Évitez de modifier manuellement le JSON
- Ne fermez pas brutalement le navigateur pendant une sauvegarde
- Faites des exports réguliers pour backup

---

## 📱 Considérations Mobiles

### Navigation Privée

En mode navigation privée, `localStorage` peut être :
- Limité en taille
- Effacé à la fermeture

### Nettoyage du Cache

Effacer les données de navigation supprime la sauvegarde. Exportez avant de nettoyer.

---

## 💡 Conseils

1. **Exportez régulièrement** votre sauvegarde
2. **Ne jouez pas en navigation privée** pour conserver la progression
3. **Utilisez le même navigateur** pour conserver les données
4. **Vérifiez les gains hors-ligne** au retour dans le jeu

---

## ➡️ Voir Aussi

- [[Démarrage-Rapide]] - Premier lancement
- [[FAQ]] - Questions sur la sauvegarde
- [[Installation]] - Configuration
