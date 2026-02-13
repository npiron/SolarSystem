/**
 * Screen Shake System
 * 
 * Implements trauma-based camera shake with smooth decay.
 * Shake intensity is controlled by trauma (0-1), which decays over time.
 */

export interface ScreenShake {
  trauma: number;        // Current trauma level (0-1)
  offsetX: number;       // Current X offset
  offsetY: number;       // Current Y offset
  seed: number;          // Random seed for shake variation
}

const TRAUMA_DECAY = 2.5;      // How fast trauma decays per second
const MAX_SHAKE_OFFSET = 12;   // Maximum pixel offset at full trauma
const SHAKE_FREQUENCY = 20;    // Shake oscillation frequency

/**
 * Create a new screen shake state
 */
export function createScreenShake(): ScreenShake {
  return {
    trauma: 0,
    offsetX: 0,
    offsetY: 0,
    seed: Math.random() * 1000
  };
}

/**
 * Add trauma to the screen shake
 * @param shake Screen shake state
 * @param amount Trauma amount to add (0-1)
 */
export function addTrauma(shake: ScreenShake, amount: number): void {
  shake.trauma = Math.min(1, shake.trauma + amount);
}

/**
 * Update screen shake state
 * @param shake Screen shake state
 * @param dt Delta time in seconds
 * @param time Current game time
 */
export function updateScreenShake(shake: ScreenShake, _dt: number, _time: number): void {
  // Screen shake disabled — keep offsets at zero
  shake.trauma = 0;
  shake.offsetX = 0;
  shake.offsetY = 0;
}

/**
 * Get the current shake offset
 */
export function getShakeOffset(shake: ScreenShake): { x: number; y: number } {
  return {
    x: shake.offsetX,
    y: shake.offsetY
  };
}
