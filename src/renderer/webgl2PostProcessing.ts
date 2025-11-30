import { createProgram } from "./shaders.ts";

const fullscreenQuadVertexShader = `#version 300 es
precision mediump float;

in vec2 a_position;
out vec2 v_uv;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_uv = a_position * 0.5 + 0.5;
}
`;

const fullscreenQuadFragmentShader = `#version 300 es
precision mediump float;

in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_texture;

void main() {
  fragColor = texture(u_texture, v_uv);
}
`;

const glowFragmentShader = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_texture;
uniform float u_intensity;
uniform vec2 u_resolution;

const float directions = 16.0;
const float quality = 3.0;
const float size = 12.0;

void main() {
    vec2 uv = v_uv;
    vec4 color = vec4(0.0);
    vec2 texel = 1.0 / u_resolution;

    for (float d = 0.0; d < 6.28318530718; d += 6.28318530718 / directions) {
        for (float i = 1.0 / quality; i <= 1.0; i += 1.0 / quality) {
            color += texture(u_texture, uv + vec2(cos(d), sin(d)) * texel * size * i);
        }
    }

    color /= quality * directions;
    fragColor = mix(texture(u_texture, uv), color, u_intensity);
}
`;

const bloomFragmentShader = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_texture;
uniform float u_intensity;
uniform vec2 u_resolution;

// Source: https://www.shadertoy.com/view/4sXSWs
vec4 bloom(sampler2D tex, vec2 uv, vec2 resolution, float intensity) {
    vec4 sum = vec4(0.0);
    vec2 texel = 1.0 / resolution;

    for (int i = -4; i < 4; i++) {
        for (int j = -4; j < 4; j++) {
            sum += texture(tex, uv + vec2(j, i) * texel) * 0.25;
        }
    }

    if (texture(tex, uv).r < 0.3) {
        return sum * sum * 0.012 * intensity + texture(tex, uv);
    }
    return texture(tex, uv);
}

void main() {
  fragColor = bloom(u_texture, v_uv, u_resolution, u_intensity);
}
`;

const grainFragmentShader = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_texture;
uniform float u_intensity;
uniform float u_time;

// Source: https://www.shadertoy.com/view/4ssXRX
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

void main() {
  vec4 color = texture(u_texture, v_uv);
  float noise = (random(v_uv * u_time) - 0.5) * u_intensity;
  fragColor = vec4(color.rgb + noise, color.a);
}
`;

class PostProcessingPass {
  public program: WebGLProgram;
  public vao: WebGLVertexArrayObject | null;
  public uniformLocations: Record<string, WebGLUniformLocation | null> = {};

  constructor(
    private gl: WebGL2RenderingContext,
    vertexShader: string,
    fragmentShader: string,
    uniforms: string[] = []
  ) {
    this.program = createProgram(gl, vertexShader, fragmentShader);
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );

    const positionLocation = gl.getAttribLocation(this.program, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    uniforms.forEach((uniform) => {
      this.uniformLocations[uniform] = gl.getUniformLocation(this.program, uniform);
    });
  }
}

export class WebGL2PostProcessing {
  private framebuffer1: WebGLFramebuffer | null;
  private texture1: WebGLTexture | null;
  private framebuffer2: WebGLFramebuffer | null;
  private texture2: WebGLTexture | null;

  private fullscreenQuad: PostProcessingPass;
  private glowPass: PostProcessingPass;
  private bloomPass: PostProcessingPass;
  private grainPass: PostProcessingPass;

  constructor(private gl: WebGL2RenderingContext, private dpr: number) {
    [this.framebuffer1, this.texture1] = this.createFramebuffer();
    [this.framebuffer2, this.texture2] = this.createFramebuffer();

    this.fullscreenQuad = new PostProcessingPass(
      gl,
      fullscreenQuadVertexShader,
      fullscreenQuadFragmentShader,
      ["u_texture"]
    );
    this.glowPass = new PostProcessingPass(gl, fullscreenQuadVertexShader, glowFragmentShader, [
      "u_texture",
      "u_intensity",
      "u_resolution"
    ]);
    this.bloomPass = new PostProcessingPass(gl, fullscreenQuadVertexShader, bloomFragmentShader, [
      "u_texture",
      "u_intensity",
      "u_resolution"
    ]);
    this.grainPass = new PostProcessingPass(gl, fullscreenQuadVertexShader, grainFragmentShader, [
      "u_texture",
      "u_intensity",
      "u_time"
    ]);
  }

  beginFrame() {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer1);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }

  endFrame(
    resolution: { width: number; height: number },
    addons: { glow: boolean; bloom: boolean; grain: boolean },
    time: number
  ) {
    const passes: {
      pass: PostProcessingPass;
      uniforms: (gl: WebGL2RenderingContext) => void;
    }[] = [];

    if (addons.glow) {
      passes.push({
        pass: this.glowPass,
        uniforms: (gl) => {
          gl.uniform1f(this.glowPass.uniformLocations["u_intensity"], 0.6);
          gl.uniform2f(
            this.glowPass.uniformLocations["u_resolution"],
            resolution.width,
            resolution.height
          );
        }
      });
    }

    if (addons.bloom) {
      passes.push({
        pass: this.bloomPass,
        uniforms: (gl) => {
          gl.uniform1f(this.bloomPass.uniformLocations["u_intensity"], 0.4);
          gl.uniform2f(
            this.bloomPass.uniformLocations["u_resolution"],
            resolution.width,
            resolution.height
          );
        }
      });
    }

    if (addons.grain) {
      passes.push({
        pass: this.grainPass,
        uniforms: (gl) => {
          gl.uniform1f(this.grainPass.uniformLocations["u_intensity"], 0.1);
          gl.uniform1f(this.grainPass.uniformLocations["u_time"], time);
        }
      });
    }

    let read = { fbo: this.framebuffer1, texture: this.texture1 };
    let write = { fbo: this.framebuffer2, texture: this.texture2 };

    passes.forEach((p) => {
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, write.fbo);
      this.gl.clear(this.gl.COLOR_BUFFER_BIT);

      this.gl.useProgram(p.pass.program);
      this.gl.bindVertexArray(p.pass.vao);
      this.gl.activeTexture(this.gl.TEXTURE0);
      this.gl.bindTexture(this.gl.TEXTURE_2D, read.texture);
      this.gl.uniform1i(p.pass.uniformLocations["u_texture"], 0);
      p.uniforms(this.gl);
      this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);

      // Swap
      const temp = read;
      read = write;
      write = temp;
    });

    // Final pass to screen
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    this.gl.useProgram(this.fullscreenQuad.program);
    this.gl.bindVertexArray(this.fullscreenQuad.vao);
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, read.texture);
    this.gl.uniform1i(this.fullscreenQuad.uniformLocations["u_texture"], 0);
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  }

  resize(width: number, height: number) {
    for (const texture of [this.texture1, this.texture2]) {
      this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
      this.gl.texImage2D(
        this.gl.TEXTURE_2D,
        0,
        this.gl.RGBA,
        width * this.dpr,
        height * this.dpr,
        0,
        this.gl.RGBA,
        this.gl.UNSIGNED_BYTE,
        null
      );
    }
  }

  private createFramebuffer(): [WebGLFramebuffer | null, WebGLTexture | null] {
    const framebuffer = this.gl.createFramebuffer();
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer);

    const texture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

    this.gl.framebufferTexture2D(
      this.gl.FRAMEBUFFER,
      this.gl.COLOR_ATTACHMENT0,
      this.gl.TEXTURE_2D,
      texture,
      0
    );

    return [framebuffer, texture];
  }
}
