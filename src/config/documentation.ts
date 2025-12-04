import type { CodeDocSection, RoadmapSection } from "../types/documentation.ts";

export const codeDocumentation: CodeDocSection[] = [
  {
    title: "Configuration & stockage",
    icon: "⚙️",
    items: [
      {
        name: "STORAGE_KEY",
        signature: "const STORAGE_KEY: string",
        description: "Identifiant localStorage utilisé pour sérialiser la partie (\"neo-survivors-save\")."
      },
      {
        name: "VERSION",
        signature: "const VERSION: string",
        description: "Numéro de build affiché dans le badge version et propagé à la sauvegarde."
      },
      {
        name: "MAX_OFFLINE_SECONDS",
        signature: "const MAX_OFFLINE_SECONDS: number",
        description: "Durée maximum prise en compte pour les gains hors-ligne (3 heures)."
      }
    ]
  },
  {
    title: "Boucle de jeu",
    icon: "🎮",
    items: [
      {
        name: "updateSpawn",
        signature: "updateSpawn(state, dt, canvas): void",
        description: "Déclenche les vagues et crée les ennemis en fonction de la progression courante."
      },
      {
        name: "updateCombat",
        signature: "updateCombat(state, dt, canvas): void",
        description: "Gère les collisions, dégâts, éliminations et récupération de fragments."
      },
      {
        name: "updateHud",
        signature: "updateHud(state, context): void",
        description: "Actualise le HUD (ressources, boutons de prestige, tooltips) et rafraîchit les listes dynamiques."
      }
    ]
  },
  {
    title: "Progression et talents",
    icon: "⚡",
    items: [
      {
        name: "createGenerators",
        signature: "createGenerators(): Generator[]",
        description: "Construit la table des générateurs passifs (essence) avec coûts, niveaux et multiplicateurs."
      },
      {
        name: "createUpgrades",
        signature: "createUpgrades(): Upgrade[]",
        description: "Prépare les améliorations actives liées au combat (dégâts, cadence, projectiles, portée)."
      },
      {
        name: "computeTalentBonuses",
        signature: "computeTalentBonuses(talents): TalentBonuses",
        description: "Agrége les effets des talents débloqués pour appliquer les bonus persistants."
      },
      {
        name: "resetTalents",
        signature: "resetTalents(talents): Talent[]",
        description: "Réinitialise l'arbre en remboursant les points et en recalculant les multiplicateurs."
      }
    ]
  },
  {
    title: "Persistance",
    icon: "💾",
    items: [
      {
        name: "loadSave",
        signature: "loadSave(state, context, computeIdleRate): Talent[]",
        description: "Hydrate l'état depuis localStorage, applique les gains hors-ligne et restaure l'arbre de talents."
      },
      {
        name: "saveGame",
        signature: "saveGame(state, generators, upgrades, talents): void",
        description: "Sérialise la partie (ressources, addons, talents, stats joueur) et tamponne l'horodatage de fermeture."
      }
    ]
  },
  {
    title: "Rendu et audio",
    icon: "🎨",
    items: [
      {
        name: "WebGL2Renderer.create",
        signature: "WebGL2Renderer.create(canvas): WebGL2Renderer | null",
        description: "Initialise le pipeline WebGL2 optionnel (grille, halos, particules) quand le canvas est disponible."
      },
      {
        name: "updateFloatingText",
        signature: "updateFloatingText(state, dt): void",
        description: "Anime et recycle les textes flottants (dégâts, gains) avec des budgets configurables."
      },
      {
        name: "initSound",
        signature: "initSound(enabled): void",
        description: "Active ou coupe l'audio procédural du jeu (achats, prestige, toggles). Désactivé par défaut."
      }
    ]
  }
];

export const roadmapSections: RoadmapSection[] = [
  {
    title: "v0.2.0 — Expérience de jeu",
    items: [
      {
        status: "in-progress",
        title: "Réglages HUD dynamiques",
        description: "Affinage des bulles d'assistance et des indicateurs de performance pour mieux guider les runs."
      },
      {
        status: "planned",
        title: "Boss de fin de vague",
        description: "Ajout de patterns uniques avec drops bonus et télégraphies lisibles."
      },
      {
        status: "planned",
        title: "Succès et défis",
        description: "Badges cumulables et modificateurs temporaires pour renouveler les sessions."
      }
    ]
  },
  {
    title: "v0.3.0 — Contenu & méta",
    items: [
      {
        status: "planned",
        title: "Talents avancés",
        description: "Branches supplémentaires dédiées à l'économie hors-ligne et aux builds critiques."
      },
      {
        status: "idea",
        title: "Variantes de cartes",
        description: "Arènes plus petites, déplacements contraints ou obstacles légers pour varier le kiting."
      },
      {
        status: "idea",
        title: "Export / import de sauvegarde",
        description: "Partage de progression via un bloc texte signé côté client (toujours offline)."
      }
    ]
  },
  {
    title: "Long terme",
    items: [
      {
        status: "idea",
        title: "Classements asynchrones",
        description: "Tableaux locaux exportables pour comparer les meilleurs runs avec la communauté."
      },
      {
        status: "idea",
        title: "Mode draft",
        description: "Choix aléatoires d'améliorations limitées à chaque vague pour des builds uniques."
      }
    ]
  }
];
