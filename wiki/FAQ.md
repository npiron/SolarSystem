# ❓ FAQ - Questions Fréquentes

Réponses aux questions les plus courantes sur **Neo Survivors Idle**.

---

## 🎮 Gameplay

### Comment le personnage se déplace-t-il ?

Le personnage se déplace **automatiquement**. Il suit les fragments à collecter quand il y en a, sinon il se déplace en orbite autour du centre de l'arène.

---

### Comment tirer ?

Les tirs sont **automatiques**. Le personnage tire continuellement des projectiles qui tournent autour de lui et se dirigent vers les ennemis proches.

---

### Pourquoi je meurs souvent ?

Plusieurs solutions :
1. **Investissez dans Gel réparateur** (+3 HP/s régénération)
2. **Achetez Bouclier prismatique** (+5% réduction de dégâts)
3. **Consolidez** pour augmenter votre multiplicateur et repartir plus fort
4. **Montez vos dégâts** pour tuer les ennemis avant qu'ils ne vous atteignent

---

### C'est quoi la Consolidation ?

La Consolidation est un **prestige doux** qui :
- Remet la vague à 1
- Conserve vos ressources et upgrades
- Augmente **définitivement** votre multiplicateur de production passive

Voir [[Prestige-Consolidation]] pour plus de détails.

---

### Quand dois-je consolider ?

Consolidez quand :
- Vous stagnez ou mourez souvent
- Vous avez atteint la vague 25+ (bonus significatif)
- La progression devient trop lente

---

### Quelle est la différence entre Essence et Fragments ?

| Ressource | Source | Utilisation |
|-----------|--------|-------------|
| ⚡ Essence | Production passive + combat | Générateurs |
| ✦ Fragments | Orbes des ennemis | Upgrades, Talents |

---

### Comment obtenir plus de Fragments ?

1. **Tuez des ennemis** → Ils lâchent des orbes
2. **Améliorez le Rayon de collecte** → Aspirez les orbes de plus loin
3. **Production passive** → 35-40% de l'Essence produite

---

## 💾 Sauvegarde

### Ma progression est-elle sauvegardée ?

Oui ! Le jeu sauvegarde automatiquement toutes les **5 secondes** dans `localStorage`.

---

### Comment récupérer ma sauvegarde sur un autre appareil ?

1. Sur l'appareil source, ouvrez la console (F12)
2. Tapez : `localStorage.getItem("neo-survivors-save")`
3. Copiez le résultat
4. Sur l'autre appareil, tapez : `localStorage.setItem("neo-survivors-save", 'VOTRE_SAUVEGARDE')`
5. Rafraîchissez la page

---

### Ma sauvegarde a disparu !

Causes possibles :
- Nettoyage du cache/cookies du navigateur
- Navigation privée (pas de localStorage persistant)
- Changement de navigateur

Malheureusement, sans backup, la sauvegarde ne peut pas être récupérée.

---

### Comment réinitialiser ma progression ?

Cliquez sur **"Réinitialiser la progression"** dans la barre supérieure et confirmez.

---

## ⚡ Performance

### Le jeu est lent, que faire ?

1. **Activez le Mode Perfo** (bouton ⚙️)
2. **Désactivez les addons visuels** (Bloom, Aura)
3. **Fermez les autres onglets**
4. **Réduisez la taille de la fenêtre**
5. **Consolidez** pour réduire le nombre d'ennemis

---

### Combien de FPS devrais-je avoir ?

- **60 FPS** : Excellent
- **45-60 FPS** : Bon
- **30-45 FPS** : Acceptable
- **< 30 FPS** : Activez le Mode Perfo

---

### Le jeu continue quand je ferme l'onglet ?

Oui, **jusqu'à 3 heures** de gains passifs sont appliqués quand vous revenez.

---

## 🔧 Technique

### Le jeu ne se lance pas

1. Vérifiez que JavaScript est activé
2. Ouvrez la console (F12) pour voir les erreurs
3. Essayez un autre navigateur (Chrome recommandé)
4. Vérifiez que WebGL est supporté

---

### L'écran est noir

- WebGL n'est peut-être pas supporté
- Mettez à jour vos pilotes graphiques
- Activez l'accélération matérielle dans le navigateur

---

### Les sons ne marchent pas

1. Cliquez n'importe où sur la page (requis par les navigateurs)
2. Vérifiez que le son n'est pas en "🔇 Son coupé"
3. Vérifiez le volume du navigateur/système

---

## 📈 Progression

### Quel est le meilleur premier achat ?

**Drones collecteurs** (15 ⚡) pour lancer la production passive, puis **Projectiles instables** (30 ✦) pour les dégâts.

---

### Quel upgrade prioriser ?

1. **Pulsar chaotique** (+1 projectile) - Multiplicateur direct
2. **Projectiles instables** (+25% dégâts) - Base DPS
3. **Cadence hypersonique** (+15% vitesse) - Scaling
4. **Rayon de collecte** (+12% portée) - Confort

---

### Quel talent choisir en premier ?

**Focus fulgurant** (320 ✦) pour le DPS, ou **Logistique quantique** (500 ✦) pour la production passive.

---

### Comment reset les talents ?

Bouton **"🔄 Reset (1200 ✦)"** dans la section Talents. Coûte 1200 Fragments, les Fragments investis ne sont pas remboursés.

---

## 🎯 Stratégie

### Comment atteindre la vague 50+ ?

1. **Consolidez 2-3 fois** avant (multiplicateur cumulé)
2. **Maximisez les projectiles** (Pulsar + talents)
3. **Équilibrez dégâts et survie**
4. **Investissez dans les générateurs** pour l'économie passive

---

### C'est quoi les élites ?

Des ennemis plus forts (×2.8 HP) mais plus lents (×0.9 vitesse) qui donnent **×3 récompenses**. Ils deviennent plus fréquents en vagues hautes.

---

### Comment optimiser le farming ?

1. **Rayon de collecte élevé** (niveau 5+)
2. **Vitesse de déplacement** pour atteindre les fragments
3. **Talents économie** (Logistique quantique)
4. **Consolidations régulières** pour le multiplicateur

---

## 🔊 Audio

### Comment couper le son ?

Cliquez sur **"🔊 Son ON"** dans la barre supérieure pour basculer en **"🔇 Son coupé"**.

---

### Pourquoi le son ne joue pas au chargement ?

Les navigateurs modernes bloquent l'audio automatique. Cliquez n'importe où sur la page pour activer l'audio.

---

## ❓ Divers

### Le jeu est-il en ligne ?

Non, **100% client-side**. Tout tourne dans votre navigateur, aucun serveur requis.

---

### Puis-je jouer hors-ligne ?

Oui ! Une fois la page chargée, vous pouvez jouer sans connexion. Mais le premier chargement nécessite internet pour les assets.

---

### Y a-t-il une fin au jeu ?

Non, c'est un jeu **infini**. Les vagues continuent indéfiniment et le multiplicateur peut croître sans limite théorique.

---

### Comment reporter un bug ?

Ouvrez une issue sur le [dépôt GitHub](https://github.com/OWNER/SolarSystem/issues) avec :
- Description du bug
- Étapes pour reproduire
- Capture d'écran si possible

---

## ➡️ Voir Aussi

- [[Démarrage-Rapide]] - Guide de démarrage
- [[Conseils-et-Stratégies]] - Trucs et astuces
- [[Glossaire]] - Termes du jeu
