interface SoundState {
  context: AudioContext | null;
  masterGain: GainNode | null;
  compressor: DynamicsCompressorNode | null;
  enabled: boolean;
  lastPlay: Map<string, number>;
}

const soundState: SoundState = {
  context: null,
  masterGain: null,
  compressor: null,
  enabled: false,
  lastPlay: new Map(),
};

function ensureAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctx = window.AudioContext || (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!soundState.context) {
    const context = new Ctx({ latencyHint: "interactive" });
    const masterGain = context.createGain();
    const compressor = context.createDynamicsCompressor();

    compressor.threshold.value = -22;
    compressor.knee.value = 18;
    compressor.ratio.value = 3.2;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;

    masterGain.gain.value = soundState.enabled ? 0.18 : 0;
    masterGain.connect(compressor).connect(context.destination);
    soundState.context = context;
    soundState.masterGain = masterGain;
    soundState.compressor = compressor;
  }
  return soundState.context;
}

function canPlay(): boolean {
  const context = ensureAudioContext();
  return !!context && !!soundState.masterGain && soundState.enabled;
}

function shouldThrottle(key: string, interval: number): boolean {
  const context = ensureAudioContext();
  const now = context ? context.currentTime : performance.now() / 1000;
  const last = soundState.lastPlay.get(key) || 0;
  if (now - last < interval) return true;
  soundState.lastPlay.set(key, now);
  return false;
}

interface ToneOptions {
  frequency: number;
  duration?: number;
  type?: OscillatorType;
  volume?: number;
  detune?: number;
  attack?: number;
  release?: number;
  pan?: number;
}

function playTone({
  frequency,
  duration = 0.16,
  type = "sine",
  volume = 0.08,
  detune = 0,
  attack = 0.02,
  release = 0.14,
  pan = 0,
}: ToneOptions): void {
  if (!canPlay()) return;
  const context = soundState.context!;
  const now = context.currentTime;
  const osc = context.createOscillator();
  const gain = context.createGain();
  const panner = context.createStereoPanner ? context.createStereoPanner() : null;

  osc.type = type;
  osc.frequency.value = frequency;
  osc.detune.value = detune;

  const attackTime = Math.max(0.002, attack);
  const releaseTime = Math.max(0.04, release);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(volume, now + attackTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration + releaseTime);

  if (panner) {
    panner.pan.value = pan;
    osc.connect(gain).connect(panner).connect(soundState.masterGain!);
  } else {
    osc.connect(gain).connect(soundState.masterGain!);
  }

  osc.start(now);
  osc.stop(now + duration + releaseTime);
}

interface SweepOptions {
  from: number;
  to: number;
  duration?: number;
  type?: OscillatorType;
  volume?: number;
  attack?: number;
  release?: number;
  pan?: number;
}

function playSweep({
  from,
  to,
  duration = 0.5,
  type = "sawtooth",
  volume = 0.08,
  attack = 0.02,
  release = 0.18,
  pan = 0,
}: SweepOptions): void {
  if (!canPlay()) return;
  const context = soundState.context!;
  const now = context.currentTime;
  const osc = context.createOscillator();
  const gain = context.createGain();
  const panner = context.createStereoPanner ? context.createStereoPanner() : null;

  osc.type = type;
  osc.frequency.setValueAtTime(from, now);
  osc.frequency.exponentialRampToValueAtTime(to, now + duration);

  const attackTime = Math.max(0.008, attack);
  const releaseTime = Math.max(0.12, release);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(volume, now + attackTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration + releaseTime);

  if (panner) {
    panner.pan.value = pan;
    osc.connect(gain).connect(panner).connect(soundState.masterGain!);
  } else {
    osc.connect(gain).connect(soundState.masterGain!);
  }

  osc.start(now);
  osc.stop(now + duration + releaseTime);
}

export function initSound(enabled = false): void {
  soundState.enabled = enabled;
  ensureAudioContext();
}

export function resumeAudio(): void {
  const context = ensureAudioContext();
  if (!context) return;
  if (context.state === "suspended") {
    context.resume();
  }
}

export function setAudioEnabled(enabled: boolean): void {
  soundState.enabled = enabled;
  const context = ensureAudioContext();
  if (!context || !soundState.masterGain) return;
  const now = context.currentTime;
  const target = enabled ? 0.18 : 0.0001;
  soundState.masterGain.gain.cancelScheduledValues(now);
  soundState.masterGain.gain.setTargetAtTime(target, now, 0.08);
}

export function isAudioEnabled(): boolean {
  return soundState.enabled;
}

import { SoundSynth } from "./soundSynth.ts";

let lastCollectTime = 0;
const COLLECT_THROTTLE_MS = 150; // Aggressive throttle to avoid spam

/**
 * Play a sound effect (convenience wrapper)
 */
export function playSound(type: 'laser' | 'hit' | 'critical' | 'death' | 'collect' | 'wave' | 'damage' | 'click', options?: { volume?: number; pitch?: number }): void {
  // Throttle collect sounds to avoid spam
  if (type === 'collect') {
    const now = performance.now();
    if (now - lastCollectTime < COLLECT_THROTTLE_MS) return;
    lastCollectTime = now;
  }

  SoundSynth.play(type, options);
}

// Keep existing playCollect function for compatibility
export function playCollect(): void {
  if (!canPlay() || shouldThrottle("collect", 0.08)) return;
  playTone({
    frequency: 760,
    duration: 0.14,
    type: "triangle",
    volume: 0.08,
    attack: 0.012,
    release: 0.12,
    pan: -0.08,
  });
  playTone({
    frequency: 1130,
    duration: 0.16,
    type: "sine",
    volume: 0.06,
    detune: 8,
    attack: 0.014,
    release: 0.16,
    pan: 0.08,
  });
}

export function playPurchase(): void {
  if (!canPlay()) return;
  playTone({
    frequency: 540,
    duration: 0.16,
    type: "triangle",
    volume: 0.07,
    attack: 0.016,
    release: 0.18,
    pan: -0.06,
  });
  playTone({
    frequency: 910,
    duration: 0.22,
    type: "sine",
    volume: 0.06,
    detune: 10,
    attack: 0.018,
    release: 0.22,
    pan: 0.06,
  });
  playTone({
    frequency: 1350,
    duration: 0.2,
    type: "triangle",
    volume: 0.045,
    detune: -6,
    attack: 0.012,
    release: 0.18,
  });
}

export function playPrestige(): void {
  if (!canPlay()) return;
  playSweep({
    from: 620,
    to: 140,
    duration: 0.92,
    type: "triangle",
    volume: 0.075,
    attack: 0.02,
    release: 0.22,
  });
  playTone({
    frequency: 320,
    duration: 0.42,
    type: "sine",
    volume: 0.05,
    attack: 0.018,
    release: 0.32,
    pan: -0.05,
  });
  playTone({
    frequency: 920,
    duration: 0.48,
    type: "triangle",
    volume: 0.042,
    detune: -4,
    attack: 0.016,
    release: 0.3,
    pan: 0.05,
  });
}

export function playUiToggle(): void {
  if (!canPlay() || shouldThrottle("ui-toggle", 0.1)) return;
  playTone({
    frequency: 360,
    duration: 0.12,
    type: "sine",
    volume: 0.05,
    attack: 0.01,
    release: 0.16,
    pan: -0.05,
  });
  playTone({
    frequency: 540,
    duration: 0.1,
    type: "triangle",
    volume: 0.045,
    attack: 0.012,
    release: 0.16,
    pan: 0.05,
  });
}
