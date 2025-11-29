interface SoundState {
  context: AudioContext | null;
  masterGain: GainNode | null;
  enabled: boolean;
  lastPlay: Map<string, number>;
}

const soundState: SoundState = {
  context: null,
  masterGain: null,
  enabled: true,
  lastPlay: new Map(),
};

function ensureAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctx = window.AudioContext || (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!soundState.context) {
    const context = new Ctx({ latencyHint: "interactive" });
    const masterGain = context.createGain();
    masterGain.gain.value = soundState.enabled ? 0.18 : 0;
    masterGain.connect(context.destination);
    soundState.context = context;
    soundState.masterGain = masterGain;
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
}

function playTone({ frequency, duration = 0.16, type = "sine", volume = 0.08, detune = 0 }: ToneOptions): void {
  if (!canPlay()) return;
  const context = soundState.context!;
  const now = context.currentTime;
  const osc = context.createOscillator();
  const gain = context.createGain();

  osc.type = type;
  osc.frequency.value = frequency;
  osc.detune.value = detune;

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volume, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(gain).connect(soundState.masterGain!);
  osc.start(now);
  osc.stop(now + duration);
}

interface SweepOptions {
  from: number;
  to: number;
  duration?: number;
  type?: OscillatorType;
  volume?: number;
}

function playSweep({ from, to, duration = 0.5, type = "sawtooth", volume = 0.08 }: SweepOptions): void {
  if (!canPlay()) return;
  const context = soundState.context!;
  const now = context.currentTime;
  const osc = context.createOscillator();
  const gain = context.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(from, now);
  osc.frequency.exponentialRampToValueAtTime(to, now + duration);

  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(gain).connect(soundState.masterGain!);
  osc.start(now);
  osc.stop(now + duration);
}

export function initSound(enabled = true): void {
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

export function playCollect(): void {
  if (!canPlay() || shouldThrottle("collect", 0.08)) return;
  playTone({ frequency: 860, duration: 0.12, type: "triangle", volume: 0.085 });
}

export function playPurchase(): void {
  if (!canPlay()) return;
  playTone({ frequency: 440, duration: 0.16, type: "square", volume: 0.08 });
  playTone({ frequency: 760, duration: 0.2, type: "triangle", volume: 0.06, detune: 12 });
}

export function playPrestige(): void {
  if (!canPlay()) return;
  playSweep({ from: 720, to: 210, duration: 0.7, type: "sawtooth", volume: 0.09 });
  playTone({ frequency: 220, duration: 0.35, type: "sine", volume: 0.05 });
}

export function playUiToggle(): void {
  if (!canPlay() || shouldThrottle("ui-toggle", 0.1)) return;
  playTone({ frequency: 360, duration: 0.12, type: "sine", volume: 0.06 });
}
