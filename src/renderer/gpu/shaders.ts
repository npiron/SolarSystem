/**
 * Vertex shader for the simulation pass (full-screen quad)
 */
export const SIM_VERT = `#version 300 es
precision highp float;
// Full-screen quad vertices: 2 triangles covering clip space
const vec2 pos[6] = vec2[6](
  vec2(-1,-1), vec2(1,-1), vec2(-1,1),
  vec2(-1,1), vec2(1,-1), vec2(1,1)
);
void main() {
  gl_Position = vec4(pos[gl_VertexID], 0.0, 1.0);
}
`;

/**
 * Fragment shader for particle simulation
 *
 * Reads current particle state from texture (position.xy, velocity.xy in RGBA),
 * applies simple physics (velocity integration, boundary bouncing, damping),
 * and writes updated state to output framebuffer.
 *
 * To modify particle behavior:
 * - Adjust DAMPING constant for velocity decay
 * - Modify GRAVITY for different force fields
 * - Change bounce behavior in the boundary checks
 */
export const SIM_FRAG = `#version 300 es
precision highp float;
uniform sampler2D uState;    // Current particle state texture
uniform float uDt;           // Delta time in seconds
uniform vec2 uBounds;        // Canvas bounds for boundary checks
out vec4 outState;

const float DAMPING = 0.995;  // Velocity damping per frame
const float GRAVITY = 50.0;   // Downward acceleration (pixels/s^2)

void main() {
  // Get pixel coordinates for this fragment
  ivec2 coord = ivec2(gl_FragCoord.xy);
  vec4 state = texelFetch(uState, coord, 0);

  vec2 pos = state.xy;
  vec2 vel = state.zw;

  // Only simulate active particles (position != 0,0 with some velocity)
  // Particles at origin with zero velocity are considered inactive
  // Use epsilon threshold for reliable floating-point comparison
  const float EPSILON = 0.001;
  if (length(pos) > EPSILON || length(vel) > EPSILON) {
    // Apply gravity
    vel.y += GRAVITY * uDt;

    // Apply damping
    vel *= DAMPING;

    // Integrate position
    pos += vel * uDt;

    // Bounce off boundaries with energy loss
    if (pos.x < 0.0) {
      pos.x = 0.0;
      vel.x = -vel.x * 0.7;
    } else if (pos.x > uBounds.x) {
      pos.x = uBounds.x;
      vel.x = -vel.x * 0.7;
    }

    if (pos.y < 0.0) {
      pos.y = 0.0;
      vel.y = -vel.y * 0.6;
    } else if (pos.y > uBounds.y) {
      pos.y = uBounds.y;
      vel.y = -vel.y * 0.6;
    }

    // Kill particles that are nearly stationary at the bottom
    if (abs(vel.x) < 0.5 && abs(vel.y) < 0.5 && pos.y > uBounds.y - 2.0) {
      pos = vec2(0.0);
      vel = vec2(0.0);
    }
  }

  outState = vec4(pos, vel);
}
`;

/**
 * Vertex shader for particle rendering (instanced quads)
 */
export const RENDER_VERT = `#version 300 es
precision highp float;
uniform sampler2D uState;     // Particle state texture
uniform mat4 uProj;           // Orthographic projection matrix
uniform float uSize;          // Particle size in pixels
uniform int uTexSize;         // Texture dimension (side length)

// Quad vertices for a centered square
const vec2 quad[6] = vec2[6](
  vec2(-0.5,-0.5), vec2(0.5,-0.5), vec2(-0.5,0.5),
  vec2(-0.5,0.5), vec2(0.5,-0.5), vec2(0.5,0.5)
);

out vec2 vVel;      // Pass velocity to fragment shader for coloring
out float vActive;  // Whether this particle is active

void main() {
  // Calculate texture coordinates from instance ID
  // Particles are stored row by row in the texture
  int tx = gl_InstanceID % uTexSize;
  int ty = gl_InstanceID / uTexSize;

  // Fetch particle state using texelFetch (integer coordinates, no filtering)
  vec4 state = texelFetch(uState, ivec2(tx, ty), 0);
  vec2 pos = state.xy;
  vec2 vel = state.zw;

  // Check if particle is active using epsilon threshold for reliable comparison
  const float EPSILON = 0.001;
  vActive = (length(pos) > EPSILON || length(vel) > EPSILON) ? 1.0 : 0.0;
  vVel = vel;

  // Calculate vertex position: particle center + quad offset * size
  vec2 vertPos = pos + quad[gl_VertexID % 6] * uSize;
  gl_Position = uProj * vec4(vertPos, 0.0, 1.0);
}
`;

/**
 * Fragment shader for particle rendering
 *
 * Renders particles as colored squares with alpha based on activity.
 * Color is determined by velocity magnitude for visual interest.
 */
export const RENDER_FRAG = `#version 300 es
precision highp float;
in vec2 vVel;
in float vActive;
out vec4 fragColor;

void main() {
  // Discard inactive particles
  if (vActive < 0.5) discard;

  // Color based on velocity magnitude (blue to red gradient)
  float speed = length(vVel);
  float t = clamp(speed / 300.0, 0.0, 1.0);

  // Gradient: blue (slow) -> cyan -> white -> orange -> red (fast)
  vec3 color;
  if (t < 0.25) {
    color = mix(vec3(0.2, 0.4, 0.8), vec3(0.2, 0.7, 0.9), t * 4.0);
  } else if (t < 0.5) {
    color = mix(vec3(0.2, 0.7, 0.9), vec3(0.9, 0.9, 0.9), (t - 0.25) * 4.0);
  } else if (t < 0.75) {
    color = mix(vec3(0.9, 0.9, 0.9), vec3(1.0, 0.6, 0.2), (t - 0.5) * 4.0);
  } else {
    color = mix(vec3(1.0, 0.6, 0.2), vec3(1.0, 0.2, 0.1), (t - 0.75) * 4.0);
  }

  fragColor = vec4(color, 0.85);
}
`;
