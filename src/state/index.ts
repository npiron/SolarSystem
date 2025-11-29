/**
 * State module exports
 */

export {
  BASE_PLAYER_STATS,
  createGameState,
  softResetState,
  clampPlayerToBounds
} from "./gameState.ts";

export {
  saveGame,
  loadSave,
  clearSave,
  formatDuration
} from "./persistence.ts";

export type { SaveData, LoadResult } from "./persistence.ts";
