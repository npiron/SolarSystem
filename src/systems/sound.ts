/**
 * Sound System - Unified audio interface
 * Routes all sound through AudioManager for consistent volume control
 * and dynamic compression. Legacy functions preserved for backward compatibility.
 */

import { audioManager, type SoundType } from './audio.ts';
import { SoundSynth } from './soundSynth.ts';

// ─── Throttling ────────────────────────────────────────────────────────────────

const lastPlay = new Map<string, number>();

function shouldThrottle(key: string, intervalSeconds: number): boolean {
    const context = audioManager.getContext();
    const now = context ? context.currentTime : performance.now() / 1000;
    const last = lastPlay.get(key) || 0;
    if (now - last < intervalSeconds) return true;
    lastPlay.set(key, now);
    return false;
}

let lastCollectTime = 0;
const COLLECT_THROTTLE_MS = 120;

// ─── Public API ─────────────────────────────────────────────────────────────────

/**
 * Initialize the sound system
 */
export function initSound(enabled = false): void {
    audioManager.setEnabled(enabled);
    if (enabled) {
        audioManager.init();
    }
}

/**
 * Resume audio context (required after page load in some browsers)
 */
export function resumeAudio(): void {
    const context = audioManager.getContext();
    if (context && context.state === 'suspended') {
        context.resume();
    }
}

/**
 * Enable or disable audio
 */
export function setAudioEnabled(enabled: boolean): void {
    audioManager.setEnabled(enabled);
    if (enabled) {
        audioManager.init();
        const context = audioManager.getContext();
        if (context && context.state === 'suspended') {
            context.resume();
        }
    }
}

/**
 * Check if audio is enabled
 */
export function isAudioEnabled(): boolean {
    return audioManager.isEnabled();
}

/**
 * Play a sound effect (convenience wrapper)
 * Supports all SoundType values with optional volume/pitch overrides
 */
export function playSound(
    type: SoundType,
    options?: { volume?: number; pitch?: number }
): void {
    // Throttle collect sounds to avoid spam
    if (type === 'collect') {
        const now = performance.now();
        if (now - lastCollectTime < COLLECT_THROTTLE_MS) return;
        lastCollectTime = now;
    }

    SoundSynth.play(type, options);
}

// ─── Legacy functions (backward compatibility) ───────────────────────────────────

/**
 * Play collect sound - musical ding with harmonics
 */
export function playCollect(): void {
    if (shouldThrottle('collect', 0.08)) return;
    SoundSynth.play('collect', { volume: 0.8 });
}

/**
 * Play purchase sound - ascending triad
 */
export function playPurchase(): void {
    if (!audioManager.isEnabled()) return;
    const ctx = audioManager.getContext();
    const sfxGain = audioManager.getSfxGain();
    if (!ctx || !sfxGain) return;

    const now = ctx.currentTime;

    // Three ascending notes: C5, E5, G5
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = now + i * 0.08;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.10, startTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18);

        osc.connect(gain);
        gain.connect(sfxGain);

        osc.start(startTime);
        osc.stop(startTime + 0.2);
    });
}

/**
 * Play prestige sound - dramatic descending sweep
 */
export function playPrestige(): void {
    if (!audioManager.isEnabled()) return;
    const ctx = audioManager.getContext();
    const sfxGain = audioManager.getSfxGain();
    if (!ctx || !sfxGain) return;

    const now = ctx.currentTime;

    // Descending sweep
    const sweep = ctx.createOscillator();
    const sweepGain = ctx.createGain();
    sweep.type = 'sawtooth';
    sweep.frequency.setValueAtTime(800, now);
    sweep.frequency.exponentialRampToValueAtTime(100, now + 0.8);

    sweepGain.gain.setValueAtTime(0, now);
    sweepGain.gain.linearRampToValueAtTime(0.08, now + 0.02);
    sweepGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

    const sweepFilter = ctx.createBiquadFilter();
    sweepFilter.type = 'lowpass';
    sweepFilter.frequency.setValueAtTime(2000, now);
    sweepFilter.frequency.exponentialRampToValueAtTime(200, now + 0.8);
    sweepFilter.Q.value = 2;

    sweep.connect(sweepFilter);
    sweepFilter.connect(sweepGain);
    sweepGain.connect(sfxGain);

    sweep.start(now);
    sweep.stop(now + 0.95);

    // Low rumble undertone
    const rumble = ctx.createOscillator();
    const rumbleGain = ctx.createGain();
    rumble.type = 'sine';
    rumble.frequency.setValueAtTime(80, now);
    rumble.frequency.exponentialRampToValueAtTime(40, now + 0.6);

    rumbleGain.gain.setValueAtTime(0, now);
    rumbleGain.gain.linearRampToValueAtTime(0.06, now + 0.03);
    rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

    rumble.connect(rumbleGain);
    rumbleGain.connect(sfxGain);

    rumble.start(now);
    rumble.stop(now + 0.75);

    // Ascending shimmer
    const shimmer = ctx.createOscillator();
    const shimmerGain = ctx.createGain();
    shimmer.type = 'sine';
    shimmer.frequency.setValueAtTime(400, now + 0.3);
    shimmer.frequency.exponentialRampToValueAtTime(1200, now + 0.7);

    shimmerGain.gain.setValueAtTime(0, now + 0.3);
    shimmerGain.gain.linearRampToValueAtTime(0.05, now + 0.35);
    shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    shimmer.connect(shimmerGain);
    shimmerGain.connect(sfxGain);

    shimmer.start(now + 0.3);
    shimmer.stop(now + 0.85);
}

/**
 * Play UI toggle sound - crisp click
 */
export function playUiToggle(): void {
    if (shouldThrottle('ui-toggle', 0.1)) return;
    SoundSynth.play('click', { volume: 0.7 });
}
