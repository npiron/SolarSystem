# Processus de release et patch notes

Ce dépôt est 100 % statique. Les releases s'appuient sur des tags SemVer (`vMAJOR.MINOR.PATCH`) et un workflow GitHub Actions qui publie automatiquement une _Release_ avec les notes générées par GitHub.

## Branches et versions
- **Branches de travail** : `main` (stable) et `work` (intégration/feature branches via PR).
- **Versionnement** :
  - `MAJOR` : changement incompatible (breakage ou format de sauvegarde modifié).
  - `MINOR` : nouvelles fonctionnalités compatibles.
  - `PATCH` : corrections et ajustements mineurs.

## Préparer une version
1. S'assurer que les changements sont mergés sur `main` (ou `work` si vous publiez depuis cette branche).
2. Mettre à jour `CHANGELOG.md` :
   - Ajouter une entrée sous la section « Unreleased » puis la déplacer sous `vX.Y.Z - AAAA-MM-JJ`.
   - Garder le format Ajouts/Corrections/Modifications.
3. Créer et pousser un tag :
   ```bash
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```

## Publication automatique
- Le workflow `.github/workflows/release.yml` se déclenche sur un push de tag `v*.*.*` ou via _Run workflow_.
- Il archive l'état du dépôt (`release.zip`) et crée la _Release_ GitHub avec des notes générées automatiquement.
- Vous pouvez compléter/éditer les notes sur GitHub après la création.

## Patchs rapides
- Pour un hotfix, créez une branche `fix/<description>` depuis `main`, ouvrez une PR, puis suivez les étapes de versionnement ci-dessus en incrémentant uniquement `PATCH`.

## Déploiement sur Pages
Le workflow de déploiement sur Pages reste inchangé (`deploy-pages.yml`) : poussez sur `main` ou `work` pour publier. Les releases sont indépendantes du déploiement Pages.
