/**
 * Death Particles System
 * 
 * Simple particle pool for enemy death explosions.
 * Particles are rendered as colored circles that spread out radially.
 */

export interface DeathParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;      // Remaining lifetime in seconds
  maxLife: number;   // Initial lifetime for fade calculation
  radius: number;
  color: readonly [number, number, number, number];
}

const PARTICLE_GRAVITY = 40;  // Downward acceleration
const PARTICLE_FRICTION = 0.95; // Velocity dampening per frame

/**
 * Create death particles for an enemy
 * @param x Enemy x position
 * @param y Enemy y position
 * @param color Enemy color
 * @param count Number of particles to create
 * @param speed Initial spread speed
 * @returns Array of death particles
 */
export function createDeathParticles(
  x: number,
  y: number,
  color: readonly [number, number, number, number],
  count: number,
  speed: number = 120
): DeathParticle[] {
  const particles: DeathParticle[] = [];
  const angleStep = (Math.PI * 2) / count;
  
  for (let i = 0; i < count; i++) {
    const angle = angleStep * i + (Math.random() - 0.5) * 0.3;
    const speedVariation = 0.7 + Math.random() * 0.6; // Range: 0.7x to 1.3x multiplier
    const particleSpeed = speed * speedVariation;
    
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * particleSpeed,
      vy: Math.sin(angle) * particleSpeed,
      life: 0.6 + Math.random() * 0.3, // 0.6 to 0.9 seconds
      maxLife: 0.75,
      radius: 3 + Math.random() * 2,
      color
    });
  }
  
  return particles;
}

/**
 * Create elite death particles (more particles, brighter)
 */
export function createEliteDeathParticles(
  x: number,
  y: number,
  color: readonly [number, number, number, number]
): DeathParticle[] {
  const baseParticles = createDeathParticles(x, y, color, 12, 150);
  
  // Add a flash particle at the center
  const flashParticle: DeathParticle = {
    x,
    y,
    vx: 0,
    vy: 0,
    life: 0.3,
    maxLife: 0.3,
    radius: 20,
    color: [1, 1, 0.8, 0.8] as const // Bright yellow-white
  };
  
  return [flashParticle, ...baseParticles];
}

/**
 * Update death particles
 * @param particles Array of death particles to update
 * @param dt Delta time in seconds
 * @returns Filtered array with only living particles
 */
export function updateDeathParticles(
  particles: DeathParticle[],
  dt: number
): DeathParticle[] {
  particles.forEach(p => {
    // Apply gravity
    p.vy += PARTICLE_GRAVITY * dt;
    
    // Apply friction
    p.vx *= PARTICLE_FRICTION;
    p.vy *= PARTICLE_FRICTION;
    
    // Update position
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    
    // Decrease lifetime
    p.life -= dt;
  });
  
  // Remove dead particles
  return particles.filter(p => p.life > 0);
}
