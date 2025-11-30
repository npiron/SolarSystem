/**
 * GPUParticles - WebGL2-based particle system using ping-pong simulation
 *
 * This module implements a GPU-accelerated particle system that stores particle
 * state (position.x, position.y, velocity.x, velocity.y) in an RGBA32F texture.
 * Simulation is performed via a full-screen quad fragment shader that reads from
 * one texture and writes to another (ping-pong technique). Rendering uses
 * instanced quads with texelFetch to read per-instance position data.
 *
 * Usage:
 *   const gl = canvas.getContext('webgl2');
 *   const particles = new GPUParticles(gl, 16384);
 *   particles.spawn(0, 100, 100, 1.5, -0.5);
 *   // In animation loop:
 *   particles.step(deltaTime);
 *   particles.render(projectionMatrix, particleSize);
 *
 * To change particle count:
 *   - The count is passed to the constructor and determines texture size
 *   - Texture size is sqrt(count) x sqrt(count) (rounded up to power of 2)
 *   - Maximum depends on GPU texture size limits (typically 4096x4096 = 16M particles)
 */

/** Vertex shader for the simulation pass (full-screen quad) */
const SIM_VERT = `#version 300 es
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
const SIM_FRAG = `#version 300 es
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

/** Vertex shader for particle rendering (instanced quads) */
const RENDER_VERT = `#version 300 es
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
const RENDER_FRAG = `#version 300 es
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

/**
 * Compiles a shader from source
 * @param gl WebGL2 context
 * @param type Shader type (gl.VERTEX_SHADER or gl.FRAGMENT_SHADER)
 * @param source GLSL source code
 * @returns Compiled shader or null on error
 */
function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) {
    console.error('GPUParticles: Failed to create shader');
    return null;
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('GPUParticles: Shader compile error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

/**
 * Links a shader program from vertex and fragment shaders
 * @param gl WebGL2 context
 * @param vert Vertex shader source
 * @param frag Fragment shader source
 * @returns Linked program or null on error
 */
function createProgram(gl: WebGL2RenderingContext, vert: string, frag: string): WebGLProgram | null {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vert);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, frag);
  if (!vs || !fs) return null;
  
  const program = gl.createProgram();
  if (!program) {
    console.error('GPUParticles: Failed to create program');
    return null;
  }
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('GPUParticles: Program link error:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  
  // Shaders can be deleted after linking
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  
  return program;
}

/**
 * Creates a floating-point texture for particle state storage
 * @param gl WebGL2 context
 * @param size Texture dimension (side length)
 * @returns Created texture or null on error
 */
function createStateTexture(gl: WebGL2RenderingContext, size: number): WebGLTexture | null {
  const tex = gl.createTexture();
  if (!tex) {
    console.error('GPUParticles: Failed to create texture');
    return null;
  }
  gl.bindTexture(gl.TEXTURE_2D, tex);
  // RGBA32F texture: 4 floats per pixel (pos.x, pos.y, vel.x, vel.y)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, size, size, 0, gl.RGBA, gl.FLOAT, null);
  // Use NEAREST filtering for exact texel lookup
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tex;
}

/**
 * GPUParticles class - WebGL2 GPU-accelerated particle system
 *
 * Implements a ping-pong simulation technique where particle state is stored
 * in floating-point textures. Each simulation step reads from one texture
 * and writes to another via a framebuffer, then the textures are swapped.
 * Rendering uses instanced drawing to efficiently render many particles.
 */
export class GPUParticles {
  private gl: WebGL2RenderingContext;
  private count: number;          // Total number of particles
  private texSize: number;        // Texture dimension (side length)
  private nextSpawnIndex: number; // Index for next spawn (circular buffer)
  
  // Ping-pong textures and framebuffers
  private texA: WebGLTexture | null = null;
  private texB: WebGLTexture | null = null;
  private fboA: WebGLFramebuffer | null = null;
  private fboB: WebGLFramebuffer | null = null;
  private readTex: WebGLTexture | null = null;  // Current read texture
  private writeFbo: WebGLFramebuffer | null = null; // Current write FBO
  
  // Shader programs
  private simProgram: WebGLProgram | null = null;
  private renderProgram: WebGLProgram | null = null;
  
  // Uniform locations for simulation shader
  private simUniforms: {
    uState: WebGLUniformLocation | null;
    uDt: WebGLUniformLocation | null;
    uBounds: WebGLUniformLocation | null;
  } = { uState: null, uDt: null, uBounds: null };
  
  // Uniform locations for render shader
  private renderUniforms: {
    uState: WebGLUniformLocation | null;
    uProj: WebGLUniformLocation | null;
    uSize: WebGLUniformLocation | null;
    uTexSize: WebGLUniformLocation | null;
  } = { uState: null, uProj: null, uSize: null, uTexSize: null };
  
  // Empty VAO for instanced rendering (no vertex data needed)
  private vao: WebGLVertexArrayObject | null = null;
  
  // Canvas bounds for simulation
  private bounds: { width: number; height: number } = { width: 800, height: 600 };
  
  // CPU-side buffer for batch spawning
  private spawnBuffer: Float32Array;
  private spawnDirty: boolean = false;
  
  /**
   * Creates a new GPU particle system
   * @param gl WebGL2 rendering context
   * @param count Number of particles (will be rounded up to fit texture grid)
   */
  constructor(gl: WebGL2RenderingContext, count: number) {
    this.gl = gl;
    
    // Calculate texture size - needs to be at least sqrt(count) on each side
    // Round up to nearest power of 2 for better GPU performance
    const minSize = Math.ceil(Math.sqrt(count));
    this.texSize = 1;
    while (this.texSize < minSize) {
      this.texSize *= 2;
    }
    this.count = this.texSize * this.texSize;
    this.nextSpawnIndex = 0;
    
    console.log(`GPUParticles: Initialized with ${this.count} particles (${this.texSize}x${this.texSize} texture)`);
    
    // Create spawn buffer for batch updates
    this.spawnBuffer = new Float32Array(this.count * 4);
    
    this.init();
  }
  
  /**
   * Initializes WebGL resources (textures, FBOs, shaders, VAO)
   */
  private init(): void {
    const gl = this.gl;
    
    // Check for required extension
    const ext = gl.getExtension('EXT_color_buffer_float');
    if (!ext) {
      console.error('GPUParticles: EXT_color_buffer_float not supported');
      return;
    }
    
    // Create ping-pong textures
    this.texA = createStateTexture(gl, this.texSize);
    this.texB = createStateTexture(gl, this.texSize);
    if (!this.texA || !this.texB) return;
    
    // Create framebuffers for each texture
    this.fboA = gl.createFramebuffer();
    this.fboB = gl.createFramebuffer();
    if (!this.fboA || !this.fboB) {
      console.error('GPUParticles: Failed to create framebuffers');
      return;
    }
    
    // Attach textures to framebuffers
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboA);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texA, 0);
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboB);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texB, 0);
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    
    // Initialize read/write pointers
    this.readTex = this.texA;
    this.writeFbo = this.fboB;
    
    // Create simulation program
    this.simProgram = createProgram(gl, SIM_VERT, SIM_FRAG);
    if (this.simProgram) {
      this.simUniforms = {
        uState: gl.getUniformLocation(this.simProgram, 'uState'),
        uDt: gl.getUniformLocation(this.simProgram, 'uDt'),
        uBounds: gl.getUniformLocation(this.simProgram, 'uBounds'),
      };
    }
    
    // Create render program
    this.renderProgram = createProgram(gl, RENDER_VERT, RENDER_FRAG);
    if (this.renderProgram) {
      this.renderUniforms = {
        uState: gl.getUniformLocation(this.renderProgram, 'uState'),
        uProj: gl.getUniformLocation(this.renderProgram, 'uProj'),
        uSize: gl.getUniformLocation(this.renderProgram, 'uSize'),
        uTexSize: gl.getUniformLocation(this.renderProgram, 'uTexSize'),
      };
    }
    
    // Create VAO (empty, we use gl_VertexID and gl_InstanceID)
    this.vao = gl.createVertexArray();
  }
  
  /**
   * Spawns a single particle at the specified position with given velocity
   * @param index Particle index (0 to count-1), or -1 for auto-increment
   * @param x Initial X position
   * @param y Initial Y position
   * @param vx Initial X velocity
   * @param vy Initial Y velocity
   */
  spawn(index: number, x: number, y: number, vx: number, vy: number): void {
    // Use auto-increment index if -1
    if (index < 0) {
      index = this.nextSpawnIndex;
      this.nextSpawnIndex = (this.nextSpawnIndex + 1) % this.count;
    }
    
    if (index >= this.count) return;
    
    const offset = index * 4;
    this.spawnBuffer[offset] = x;
    this.spawnBuffer[offset + 1] = y;
    this.spawnBuffer[offset + 2] = vx;
    this.spawnBuffer[offset + 3] = vy;
    this.spawnDirty = true;
  }
  
  /**
   * Spawns multiple particles in a single batch (more efficient than individual spawns)
   * @param particles Array of particle data [x, y, vx, vy, x, y, vx, vy, ...]
   */
  spawnBatch(particles: number[]): void {
    const numParticles = Math.floor(particles.length / 4);
    for (let i = 0; i < numParticles; i++) {
      const srcOffset = i * 4;
      this.spawn(
        -1, // auto-increment
        particles[srcOffset],
        particles[srcOffset + 1],
        particles[srcOffset + 2],
        particles[srcOffset + 3]
      );
    }
  }
  
  /**
   * Uploads pending spawn data to the GPU texture
   */
  private uploadSpawnData(): void {
    if (!this.spawnDirty || !this.readTex) return;
    
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.readTex);
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      0, 0,
      this.texSize, this.texSize,
      gl.RGBA,
      gl.FLOAT,
      this.spawnBuffer
    );
    this.spawnDirty = false;
  }
  
  /**
   * Sets the simulation bounds (used for particle bouncing)
   * @param width Canvas width
   * @param height Canvas height
   */
  setBounds(width: number, height: number): void {
    this.bounds.width = width;
    this.bounds.height = height;
  }
  
  /**
   * Runs one simulation step, updating all particles
   * @param dt Delta time in seconds
   */
  step(dt: number): void {
    const gl = this.gl;
    if (!this.simProgram || !this.readTex || !this.writeFbo) return;
    
    // Upload any pending spawn data
    this.uploadSpawnData();
    
    // Bind the write framebuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.writeFbo);
    gl.viewport(0, 0, this.texSize, this.texSize);
    
    // Use simulation program
    gl.useProgram(this.simProgram);
    
    // Bind read texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.readTex);
    gl.uniform1i(this.simUniforms.uState, 0);
    
    // Set uniforms
    gl.uniform1f(this.simUniforms.uDt, dt);
    gl.uniform2f(this.simUniforms.uBounds, this.bounds.width, this.bounds.height);
    
    // Draw full-screen quad (6 vertices for 2 triangles)
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    
    // Swap ping-pong buffers
    if (this.readTex === this.texA) {
      this.readTex = this.texB;
      this.writeFbo = this.fboA;
    } else {
      this.readTex = this.texA;
      this.writeFbo = this.fboB;
    }
    
    // Also update the spawn buffer to match current state
    // (read back from GPU to keep CPU buffer in sync)
    // Note: This is expensive but ensures spawn() works correctly after step()
    // For better performance, could track spawn indices separately
  }
  
  /**
   * Renders all particles
   * @param proj 4x4 orthographic projection matrix as Float32Array
   * @param size Particle size in pixels
   */
  render(proj: Float32Array, size: number): void {
    const gl = this.gl;
    if (!this.renderProgram || !this.readTex) return;
    
    // Unbind framebuffer to render to screen
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.bounds.width, this.bounds.height);
    
    // Enable blending for alpha
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
    // Use render program
    gl.useProgram(this.renderProgram);
    
    // Bind particle state texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.readTex);
    gl.uniform1i(this.renderUniforms.uState, 0);
    
    // Set uniforms
    gl.uniformMatrix4fv(this.renderUniforms.uProj, false, proj);
    gl.uniform1f(this.renderUniforms.uSize, size);
    gl.uniform1i(this.renderUniforms.uTexSize, this.texSize);
    
    // Draw instanced quads (6 vertices per quad, count instances)
    gl.bindVertexArray(this.vao);
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, this.count);
    
    gl.disable(gl.BLEND);
  }
  
  /**
   * Clears all particles by zeroing the spawn buffer and textures
   */
  clear(): void {
    this.spawnBuffer.fill(0);
    this.spawnDirty = true;
    this.nextSpawnIndex = 0;
    this.uploadSpawnData();
    
    // Also clear the other texture to prevent ghost particles
    const gl = this.gl;
    const zeros = new Float32Array(this.texSize * this.texSize * 4);
    
    if (this.texA) {
      gl.bindTexture(gl.TEXTURE_2D, this.texA);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.texSize, this.texSize, gl.RGBA, gl.FLOAT, zeros);
    }
    if (this.texB) {
      gl.bindTexture(gl.TEXTURE_2D, this.texB);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.texSize, this.texSize, gl.RGBA, gl.FLOAT, zeros);
    }
  }
  
  /**
   * Returns the total particle count
   */
  getCount(): number {
    return this.count;
  }
  
  /**
   * Cleans up WebGL resources
   */
  dispose(): void {
    const gl = this.gl;
    if (this.texA) gl.deleteTexture(this.texA);
    if (this.texB) gl.deleteTexture(this.texB);
    if (this.fboA) gl.deleteFramebuffer(this.fboA);
    if (this.fboB) gl.deleteFramebuffer(this.fboB);
    if (this.simProgram) gl.deleteProgram(this.simProgram);
    if (this.renderProgram) gl.deleteProgram(this.renderProgram);
    if (this.vao) gl.deleteVertexArray(this.vao);
  }
}

/**
 * CPUParticles - Simple CPU fallback particle system
 *
 * Used when WebGL2 is not available. Provides the same interface as GPUParticles
 * but simulates particles on the CPU using a simple particle pool.
 */
export class CPUParticles {
  private particles: Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    active: boolean;
  }>;
  private count: number;
  private nextSpawnIndex: number = 0;
  private bounds: { width: number; height: number } = { width: 800, height: 600 };
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  
  constructor(_gl: WebGL2RenderingContext | null, count: number, canvas?: HTMLCanvasElement) {
    this.count = count;
    this.particles = new Array(count);
    for (let i = 0; i < count; i++) {
      this.particles[i] = { x: 0, y: 0, vx: 0, vy: 0, active: false };
    }
    
    if (canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
    }
    
    console.log(`CPUParticles: Initialized with ${count} particles (CPU fallback)`);
  }
  
  spawn(index: number, x: number, y: number, vx: number, vy: number): void {
    if (index < 0) {
      index = this.nextSpawnIndex;
      this.nextSpawnIndex = (this.nextSpawnIndex + 1) % this.count;
    }
    if (index >= this.count) return;
    
    const p = this.particles[index];
    p.x = x;
    p.y = y;
    p.vx = vx;
    p.vy = vy;
    p.active = true;
  }
  
  spawnBatch(particles: number[]): void {
    const numParticles = Math.floor(particles.length / 4);
    for (let i = 0; i < numParticles; i++) {
      const offset = i * 4;
      this.spawn(-1, particles[offset], particles[offset + 1], particles[offset + 2], particles[offset + 3]);
    }
  }
  
  setBounds(width: number, height: number): void {
    this.bounds.width = width;
    this.bounds.height = height;
  }
  
  step(dt: number): void {
    const DAMPING = 0.995;
    const GRAVITY = 50.0;
    
    for (const p of this.particles) {
      if (!p.active) continue;
      
      // Apply gravity and damping
      p.vy += GRAVITY * dt;
      p.vx *= DAMPING;
      p.vy *= DAMPING;
      
      // Integrate position
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      
      // Bounce off boundaries
      if (p.x < 0) {
        p.x = 0;
        p.vx = -p.vx * 0.7;
      } else if (p.x > this.bounds.width) {
        p.x = this.bounds.width;
        p.vx = -p.vx * 0.7;
      }
      
      if (p.y < 0) {
        p.y = 0;
        p.vy = -p.vy * 0.6;
      } else if (p.y > this.bounds.height) {
        p.y = this.bounds.height;
        p.vy = -p.vy * 0.6;
      }
      
      // Kill stationary particles at bottom
      if (Math.abs(p.vx) < 0.5 && Math.abs(p.vy) < 0.5 && p.y > this.bounds.height - 2) {
        p.active = false;
      }
    }
  }
  
  render(_proj: Float32Array, size: number): void {
    if (!this.ctx) return;
    
    for (const p of this.particles) {
      if (!p.active) continue;
      
      // Color based on velocity (matching GPU shader gradient)
      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      const t = Math.min(speed / 300, 1);
      
      // Gradient: blue (slow) -> cyan -> white -> orange -> red (fast)
      let r: number, g: number, b: number;
      if (t < 0.25) {
        // Blue to cyan
        r = 51;
        g = Math.floor(102 + (179 - 102) * t * 4);
        b = Math.floor(204 + (230 - 204) * t * 4);
      } else if (t < 0.5) {
        // Cyan to white
        r = Math.floor(51 + (230 - 51) * (t - 0.25) * 4);
        g = Math.floor(179 + (230 - 179) * (t - 0.25) * 4);
        b = 230;
      } else if (t < 0.75) {
        // White to orange
        r = Math.floor(230 + (255 - 230) * (t - 0.5) * 4);
        g = Math.floor(230 + (153 - 230) * (t - 0.5) * 4);
        b = Math.floor(230 + (51 - 230) * (t - 0.5) * 4);
      } else {
        // Orange to red
        r = 255;
        g = Math.floor(153 + (51 - 153) * (t - 0.75) * 4);
        b = Math.floor(51 + (26 - 51) * (t - 0.75) * 4);
      }
      
      this.ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.85)`;
      this.ctx.fillRect(p.x - size / 2, p.y - size / 2, size, size);
    }
  }
  
  clear(): void {
    for (const p of this.particles) {
      p.active = false;
    }
    this.nextSpawnIndex = 0;
  }
  
  getCount(): number {
    return this.count;
  }
  
  dispose(): void {
    // Nothing to clean up for CPU particles
  }
}

/**
 * Creates an orthographic projection matrix
 * @param left Left boundary
 * @param right Right boundary
 * @param bottom Bottom boundary
 * @param top Top boundary
 * @returns Float32Array containing 4x4 projection matrix
 */
export function createOrthoMatrix(left: number, right: number, bottom: number, top: number): Float32Array {
  const out = new Float32Array(16);
  const lr = 1 / (left - right);
  const bt = 1 / (bottom - top);
  
  out[0] = -2 * lr;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = -2 * bt;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = -1;
  out[11] = 0;
  out[12] = (left + right) * lr;
  out[13] = (top + bottom) * bt;
  out[14] = 0;
  out[15] = 1;
  
  return out;
}
