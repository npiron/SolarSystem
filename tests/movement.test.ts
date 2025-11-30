import { describe, it, expect } from "vitest";
import { accelerationFromDirection, applyInertiaStep } from "../src/systems/movement.ts";

describe("movement inertia", () => {
  it("computes acceleration from a direction vector", () => {
    const acceleration = accelerationFromDirection({ moveX: 2, moveY: 0 }, 100);
    expect(acceleration.ax).toBe(100);
    expect(acceleration.ay).toBe(0);
  });

  it("returns zero acceleration when there is no direction", () => {
    const acceleration = accelerationFromDirection({ moveX: 0, moveY: 0 }, 50);
    expect(acceleration.ax).toBe(0);
    expect(acceleration.ay).toBe(0);
  });

  it("applies acceleration and friction to velocity", () => {
    const nextVelocity = applyInertiaStep({
      velocity: { vx: 0, vy: 0 },
      acceleration: { ax: 50, ay: 0 },
      friction: 0.5,
      maxSpeed: 200,
      dt: 1,
    });

    expect(nextVelocity.vx).toBeCloseTo(25, 5);
    expect(nextVelocity.vy).toBe(0);
  });

  it("clamps velocity to the provided maximum", () => {
    const nextVelocity = applyInertiaStep({
      velocity: { vx: 100, vy: 100 },
      acceleration: { ax: 0, ay: 0 },
      friction: 0,
      maxSpeed: 50,
      dt: 1,
    });

    const speed = Math.hypot(nextVelocity.vx, nextVelocity.vy);
    expect(speed).toBeCloseTo(50, 5);
  });
});
