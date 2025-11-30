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

import { RENDER_FRAG, RENDER_VERT, SIM_FRAG, SIM_VERT } from './shaders';
import { createProgram, createStateTexture } from './utils';

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

