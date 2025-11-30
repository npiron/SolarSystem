/**
 * Helpers for handling inertial player movement.
 */
export interface Velocity {
  vx: number;
  vy: number;
}

export interface Acceleration {
  ax: number;
  ay: number;
}

interface InertiaStepOptions {
  velocity: Velocity;
  acceleration: Acceleration;
  friction: number;
  maxSpeed: number;
  dt: number;
}

export function accelerationFromDirection(
  direction: { moveX: number; moveY: number },
  acceleration: number
): Acceleration {
  const magnitude = Math.hypot(direction.moveX, direction.moveY);
  if (magnitude === 0) return { ax: 0, ay: 0 };

  const ax = (direction.moveX / magnitude) * acceleration;
  const ay = (direction.moveY / magnitude) * acceleration;
  return { ax, ay };
}

export function applyInertiaStep({
  velocity,
  acceleration,
  friction,
  maxSpeed,
  dt
}: InertiaStepOptions): Velocity {
  const nextVx = velocity.vx + acceleration.ax * dt;
  const nextVy = velocity.vy + acceleration.ay * dt;

  const frictionFactor = Math.max(0, 1 - friction * dt);
  const dampedVx = nextVx * frictionFactor;
  const dampedVy = nextVy * frictionFactor;

  const speed = Math.hypot(dampedVx, dampedVy);
  if (speed > maxSpeed && speed > 0) {
    const scale = maxSpeed / speed;
    return { vx: dampedVx * scale, vy: dampedVy * scale };
  }

  return { vx: dampedVx, vy: dampedVy };
}
