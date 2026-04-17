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
export function updateScreenShake(shake: ScreenShake, dt: number, time: number): void {
  // Decay trauma over time
  shake.trauma = Math.max(0, shake.trauma - TRAUMA_DECAY * dt);

  // Calculate shake offset from trauma using noise-like oscillation
  if (shake.trauma > 0.001) {
    const intensity = shake.trauma * shake.trauma; // Square for more dramatic peaks
    shake.offsetX = Math.sin(time * SHAKE_FREQUENCY + shake.seed) * MAX_SHAKE_OFFSET * intensity;
    shake.offsetY = Math.cos(time * SHAKE_FREQUENCY * 1.3 + shake.seed * 1.7) * MAX_SHAKE_OFFSET * intensity;
  } else {
    shake.offsetX = 0;
    shake.offsetY = 0;
  }
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
