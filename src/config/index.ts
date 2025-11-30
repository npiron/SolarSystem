/**
 * Config module barrel exports
 * All configuration data and constants for the game
 */
export * from "./constants.ts";
export * from "./generators.ts";
export * from "./player.ts";
export * from "./talents.ts";
export * from "./upgrades.ts";
export { loadSave, saveGame } from "./persistence.ts";
