/**
 * Sound Synthesizer - Professional procedural sound generation
 * Creates all game sounds using Web Audio API with:
 * - Layered oscillators for richer timbres
 * - Noise bursts for impacts and explosions
 * - Filter sweeps for movement and character
 * - Pitch randomization for variety
 * - Proper ADSR envelopes for natural feel
 */

import { audioManager, type SoundType } from './audio.ts';

/** Pitch randomization range (semi-tones) for variety */
const PITCH_VARIATION = 0.06;

/** Return a slightly randomized pitch multiplier */
function variedPitch(base: number): number {
    return base * (1 + (Math.random() - 0.5) * PITCH_VARIATION * 2);
}

/** Create a band-pass filter node */
function createBandpass(ctx: AudioContext, frequency: number, Q: number): BiquadFilterNode {
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = frequency;
    filter.Q.value = Q;
    return filter;
}

/** Create a low-pass filter node */
function createLowpass(ctx: AudioContext, frequency: number, Q: number): BiquadFilterNode {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = frequency;
    filter.Q.value = Q;
    return filter;
}

/** Create a high-pass filter node */
function createHighpass(ctx: AudioContext, frequency: number, Q: number): BiquadFilterNode {
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = frequency;
    filter.Q.value = Q;
    return filter;
}

/** Connect a node chain: [first, ...rest] -> destination */
function connectChain(nodes: AudioNode[], destination: AudioNode): void {
    for (let i = 0; i < nodes.length - 1; i++) {
        nodes[i].connect(nodes[i + 1]);
    }
    nodes[nodes.length - 1].connect(destination);
}

export class SoundSynth {
    /**
     * Play a synthesized sound effect
     */
    static play(type: SoundType, options: { volume?: number; pitch?: number } = {}): void {
        if (!audioManager.isEnabled()) return;

        const context = audioManager.getContext();
        const sfxGain = audioManager.getSfxGain();

        if (!context || !sfxGain) {
            audioManager.init();
            return;
        }

        const now = context.currentTime;
        const { volume = 1, pitch = 1 } = options;

        switch (type) {
            case 'laser':
                this.createLaser(context, sfxGain, now, volume, pitch);
                break;
            case 'hit':
                this.createHit(context, sfxGain, now, volume, pitch);
                break;
            case 'critical':
                this.createCritical(context, sfxGain, now, volume, pitch);
                break;
            case 'death':
                this.createDeath(context, sfxGain, now, volume, pitch);
                break;
            case 'collect':
                this.createCollect(context, sfxGain, now, volume, pitch);
                break;
            case 'wave':
                this.createWave(context, sfxGain, now, volume, pitch);
                break;
            case 'damage':
                this.createDamage(context, sfxGain, now, volume, pitch);
                break;
            case 'click':
                this.createClick(context, sfxGain, now, volume, pitch);
                break;
            case 'levelUp':
                this.createLevelUp(context, sfxGain, now, volume, pitch);
                break;
            case 'weaponFire':
                this.createWeaponFire(context, sfxGain, now, volume, pitch);
                break;
            case 'explosion':
                this.createExplosion(context, sfxGain, now, volume, pitch);
                break;
        }
    }

    /**
     * Laser projectile fire - Bright "pew" with noise transient
     * Layered: sine sweep + filtered noise burst for attack
     */
    private static createLaser(ctx: AudioContext, dest: AudioNode, now: number, vol: number, pitch: number): void {
        const p = variedPitch(pitch);

        // Layer 1: Sine frequency sweep (the "pew" tone)
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(900 * p, now);
        osc.frequency.exponentialRampToValueAtTime(350 * p, now + 0.1);

        oscGain.gain.setValueAtTime(0, now);
        oscGain.gain.linearRampToValueAtTime(0.14 * vol, now + 0.005);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(oscGain);
        oscGain.connect(dest);

        osc.start(now);
        osc.stop(now + 0.14);

        // Layer 2: Triangle harmonic for brightness
        const osc2 = ctx.createOscillator();
        const osc2Gain = ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(1200 * p, now);
        osc2.frequency.exponentialRampToValueAtTime(500 * p, now + 0.06);

        osc2Gain.gain.setValueAtTime(0, now);
        osc2Gain.gain.linearRampToValueAtTime(0.06 * vol, now + 0.003);
        osc2Gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc2.connect(osc2Gain);
        osc2Gain.connect(dest);

        osc2.start(now);
        osc2.stop(now + 0.1);

        // Layer 3: Short noise burst for the "zap" attack
        const noiseSource = audioManager.createNoiseSource();
        if (noiseSource) {
            const noiseFilter = createBandpass(ctx, 2000 * p, 2);
            const noiseGain = ctx.createGain();

            noiseGain.gain.setValueAtTime(0, now);
            noiseGain.gain.linearRampToValueAtTime(0.07 * vol, now + 0.002);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

            noiseSource.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(dest);

            noiseSource.start(now);
            noiseSource.stop(now + 0.05);
        }
    }

    /**
     * Hit impact - Satisfying "thwack" with body
     * Layered: low thud + mid crack + noise burst
     */
    private static createHit(ctx: AudioContext, dest: AudioNode, now: number, vol: number, pitch: number): void {
        const p = variedPitch(pitch);

        // Layer 1: Low body thud
        const low = ctx.createOscillator();
        const lowGain = ctx.createGain();
        low.type = 'sine';
        low.frequency.setValueAtTime(120 * p, now);
        low.frequency.exponentialRampToValueAtTime(60 * p, now + 0.08);

        lowGain.gain.setValueAtTime(0, now);
        lowGain.gain.linearRampToValueAtTime(0.18 * vol, now + 0.003);
        lowGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        low.connect(lowGain);
        lowGain.connect(dest);

        low.start(now);
        low.stop(now + 0.12);

        // Layer 2: Mid crack transient
        const mid = ctx.createOscillator();
        const midGain = ctx.createGain();
        mid.type = 'triangle';
        mid.frequency.setValueAtTime(400 * p, now);
        mid.frequency.exponentialRampToValueAtTime(150 * p, now + 0.04);

        midGain.gain.setValueAtTime(0, now);
        midGain.gain.linearRampToValueAtTime(0.10 * vol, now + 0.002);
        midGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        mid.connect(midGain);
        midGain.connect(dest);

        mid.start(now);
        mid.stop(now + 0.07);

        // Layer 3: Noise burst for impact texture
        const noiseSource = audioManager.createNoiseSource();
        if (noiseSource) {
            const noiseFilter = createLowpass(ctx, 1500 * p, 1);
            const noiseGain = ctx.createGain();

            noiseGain.gain.setValueAtTime(0, now);
            noiseGain.gain.linearRampToValueAtTime(0.12 * vol, now + 0.002);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

            noiseSource.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(dest);

            noiseSource.start(now);
            noiseSource.stop(now + 0.08);
        }
    }

    /**
     * Critical hit - Satisfying metallic "ching" with resonance
     * Layered: high chime + harmonic overtone + noise spark
     */
    private static createCritical(ctx: AudioContext, dest: AudioNode, now: number, vol: number, pitch: number): void {
        const p = variedPitch(pitch);

        // Layer 1: High resonant chime
        const high = ctx.createOscillator();
        const highGain = ctx.createGain();
        high.type = 'sine';
        high.frequency.setValueAtTime(1100 * p, now);
        high.frequency.exponentialRampToValueAtTime(800 * p, now + 0.06);

        highGain.gain.setValueAtTime(0, now);
        highGain.gain.linearRampToValueAtTime(0.18 * vol, now + 0.003);
        highGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        high.connect(highGain);
        highGain.connect(dest);

        high.start(now);
        high.stop(now + 0.17);

        // Layer 2: Harmonic overtone (5th above)
        const harmonic = ctx.createOscillator();
        const harmonicGain = ctx.createGain();
        harmonic.type = 'sine';
        harmonic.frequency.setValueAtTime(1650 * p, now);
        harmonic.frequency.exponentialRampToValueAtTime(1200 * p, now + 0.04);

        harmonicGain.gain.setValueAtTime(0, now);
        harmonicGain.gain.linearRampToValueAtTime(0.08 * vol, now + 0.002);
        harmonicGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        harmonic.connect(harmonicGain);
        harmonicGain.connect(dest);

        harmonic.start(now);
        harmonic.stop(now + 0.12);

        // Layer 3: Low body for weight
        const low = ctx.createOscillator();
        const lowGain = ctx.createGain();
        low.type = 'sine';
        low.frequency.setValueAtTime(550 * p, now);
        low.frequency.exponentialRampToValueAtTime(350 * p, now + 0.05);

        lowGain.gain.setValueAtTime(0, now);
        lowGain.gain.linearRampToValueAtTime(0.10 * vol, now + 0.003);
        lowGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        low.connect(lowGain);
        lowGain.connect(dest);

        low.start(now);
        low.stop(now + 0.1);

        // Layer 4: Bright noise spark
        const noiseSource = audioManager.createNoiseSource();
        if (noiseSource) {
            const noiseFilter = createHighpass(ctx, 3000 * p, 1);
            const noiseGain = ctx.createGain();

            noiseGain.gain.setValueAtTime(0, now);
            noiseGain.gain.linearRampToValueAtTime(0.08 * vol, now + 0.001);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

            noiseSource.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(dest);

            noiseSource.start(now);
            noiseSource.stop(now + 0.05);
        }
    }

    /**
     * Enemy death - Deep satisfying "boom" with rumble tail
     * Layered: sub bass + mid body + noise burst + tail rumble
     */
    private static createDeath(ctx: AudioContext, dest: AudioNode, now: number, vol: number, pitch: number): void {
        const p = variedPitch(pitch);

        // Layer 1: Sub bass thud
        const sub = ctx.createOscillator();
        const subGain = ctx.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(80 * p, now);
        sub.frequency.exponentialRampToValueAtTime(35 * p, now + 0.15);

        subGain.gain.setValueAtTime(0, now);
        subGain.gain.linearRampToValueAtTime(0.22 * vol, now + 0.005);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        sub.connect(subGain);
        subGain.connect(dest);

        sub.start(now);
        sub.stop(now + 0.22);

        // Layer 2: Mid body punch
        const mid = ctx.createOscillator();
        const midGain = ctx.createGain();
        mid.type = 'triangle';
        mid.frequency.setValueAtTime(200 * p, now);
        mid.frequency.exponentialRampToValueAtTime(80 * p, now + 0.08);

        midGain.gain.setValueAtTime(0, now);
        midGain.gain.linearRampToValueAtTime(0.14 * vol, now + 0.003);
        midGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        mid.connect(midGain);
        midGain.connect(dest);

        mid.start(now);
        mid.stop(now + 0.14);

        // Layer 3: Noise burst for impact texture
        const noiseSource = audioManager.createNoiseSource();
        if (noiseSource) {
            const noiseFilter = createLowpass(ctx, 800 * p, 1.5);
            const noiseGain = ctx.createGain();

            noiseGain.gain.setValueAtTime(0, now);
            noiseGain.gain.linearRampToValueAtTime(0.15 * vol, now + 0.003);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

            noiseSource.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(dest);

            noiseSource.start(now);
            noiseSource.stop(now + 0.12);
        }

        // Layer 4: Low rumble tail
        const rumble = ctx.createOscillator();
        const rumbleGain = ctx.createGain();
        rumble.type = 'sine';
        rumble.frequency.setValueAtTime(50 * p, now);
        rumble.frequency.exponentialRampToValueAtTime(25 * p, now + 0.3);

        rumbleGain.gain.setValueAtTime(0, now);
        rumbleGain.gain.linearRampToValueAtTime(0.08 * vol, now + 0.02);
        rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        rumble.connect(rumbleGain);
        rumbleGain.connect(dest);

        rumble.start(now);
        rumble.stop(now + 0.37);
    }

    /**
     * Fragment collection - Bright musical "ding" with harmonics
     * Layered: fundamental + octave + fifth for a musical triad
     */
    private static createCollect(ctx: AudioContext, dest: AudioNode, now: number, vol: number, pitch: number): void {
        const p = variedPitch(pitch);

        // Layer 1: Fundamental note (C5-ish)
        const fund = ctx.createOscillator();
        const fundGain = ctx.createGain();
        fund.type = 'sine';
        fund.frequency.setValueAtTime(880 * p, now);

        fundGain.gain.setValueAtTime(0, now);
        fundGain.gain.linearRampToValueAtTime(0.12 * vol, now + 0.005);
        fundGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        fund.connect(fundGain);
        fundGain.connect(dest);

        fund.start(now);
        fund.stop(now + 0.14);

        // Layer 2: Octave above for sparkle
        const octave = ctx.createOscillator();
        const octaveGain = ctx.createGain();
        octave.type = 'sine';
        octave.frequency.setValueAtTime(1760 * p, now);

        octaveGain.gain.setValueAtTime(0, now);
        octaveGain.gain.linearRampToValueAtTime(0.06 * vol, now + 0.004);
        octaveGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        octave.connect(octaveGain);
        octaveGain.connect(dest);

        octave.start(now);
        octave.stop(now + 0.1);

        // Layer 3: Fifth for musicality (E5-ish)
        const fifth = ctx.createOscillator();
        const fifthGain = ctx.createGain();
        fifth.type = 'triangle';
        fifth.frequency.setValueAtTime(1318 * p, now);

        fifthGain.gain.setValueAtTime(0, now);
        fifthGain.gain.linearRampToValueAtTime(0.04 * vol, now + 0.006);
        fifthGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        fifth.connect(fifthGain);
        fifthGain.connect(dest);

        fifth.start(now);
        fifth.stop(now + 0.12);
    }

    /**
     * Wave complete - Triumphant ascending fanfare
     * Layered: three ascending notes with harmonics + shimmer
     */
    private static createWave(ctx: AudioContext, dest: AudioNode, now: number, vol: number, pitch: number): void {
        // C5, E5, G5 triad - ascending
        const notes = [523.25, 659.25, 783.99];

        notes.forEach((freq, i) => {
            const p = variedPitch(pitch);
            const startTime = now + i * 0.15;

            // Fundamental
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq * p, startTime);

            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.20 * vol, startTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

            osc.connect(gain);
            gain.connect(dest);

            osc.start(startTime);
            osc.stop(startTime + 0.37);

            // Octave harmonic for brightness
            const harm = ctx.createOscillator();
            const harmGain = ctx.createGain();
            harm.type = 'sine';
            harm.frequency.setValueAtTime(freq * 2 * p, startTime);

            harmGain.gain.setValueAtTime(0, startTime);
            harmGain.gain.linearRampToValueAtTime(0.06 * vol, startTime + 0.015);
            harmGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);

            harm.connect(harmGain);
            harmGain.connect(dest);

            harm.start(startTime);
            harm.stop(startTime + 0.22);
        });

        // Final shimmer (high sustained note)
        const shimmer = ctx.createOscillator();
        const shimmerGain = ctx.createGain();
        shimmer.type = 'sine';
        shimmer.frequency.setValueAtTime(1046.5 * pitch, now + 0.45);

        shimmerGain.gain.setValueAtTime(0, now + 0.45);
        shimmerGain.gain.linearRampToValueAtTime(0.08 * vol, now + 0.47);
        shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

        shimmer.connect(shimmerGain);
        shimmerGain.connect(dest);

        shimmer.start(now + 0.45);
        shimmer.stop(now + 0.77);
    }

    /**
     * Player damage - Alarming "buzz" with urgency
     * Layered: dissonant tones + noise for harsh warning feel
     */
    private static createDamage(ctx: AudioContext, dest: AudioNode, now: number, vol: number, pitch: number): void {
        const p = variedPitch(pitch);

        // Layer 1: Low alarm tone
        const low = ctx.createOscillator();
        const lowGain = ctx.createGain();
        low.type = 'sawtooth';
        low.frequency.setValueAtTime(180 * p, now);
        low.frequency.exponentialRampToValueAtTime(120 * p, now + 0.12);

        lowGain.gain.setValueAtTime(0, now);
        lowGain.gain.linearRampToValueAtTime(0.12 * vol, now + 0.005);
        lowGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        low.connect(lowGain);
        lowGain.connect(dest);

        low.start(now);
        low.stop(now + 0.17);

        // Layer 2: Dissonant high tone for urgency
        const high = ctx.createOscillator();
        const highGain = ctx.createGain();
        high.type = 'square';
        high.frequency.setValueAtTime(380 * p, now);
        high.frequency.exponentialRampToValueAtTime(250 * p, now + 0.08);

        highGain.gain.setValueAtTime(0, now);
        highGain.gain.linearRampToValueAtTime(0.06 * vol, now + 0.003);
        highGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        high.connect(highGain);
        highGain.connect(dest);

        high.start(now);
        high.stop(now + 0.12);

        // Layer 3: Noise burst for impact
        const noiseSource = audioManager.createNoiseSource();
        if (noiseSource) {
            const noiseFilter = createBandpass(ctx, 600 * p, 3);
            const noiseGain = ctx.createGain();

            noiseGain.gain.setValueAtTime(0, now);
            noiseGain.gain.linearRampToValueAtTime(0.10 * vol, now + 0.003);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

            noiseSource.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(dest);

            noiseSource.start(now);
            noiseSource.stop(now + 0.1);
        }
    }

    /**
     * UI click - Crisp percussive "tick"
     * Layered: sine click + noise transient
     */
    private static createClick(ctx: AudioContext, dest: AudioNode, now: number, vol: number, pitch: number): void {
        const p = variedPitch(pitch);

        // Layer 1: Sine click
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200 * p, now);
        osc.frequency.exponentialRampToValueAtTime(600 * p, now + 0.02);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.15 * vol, now + 0.002);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

        osc.connect(gain);
        gain.connect(dest);

        osc.start(now);
        osc.stop(now + 0.05);

        // Layer 2: Tiny noise transient for physicality
        const noiseSource = audioManager.createNoiseSource();
        if (noiseSource) {
            const noiseFilter = createHighpass(ctx, 4000 * p, 1);
            const noiseGain = ctx.createGain();

            noiseGain.gain.setValueAtTime(0, now);
            noiseGain.gain.linearRampToValueAtTime(0.06 * vol, now + 0.001);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);

            noiseSource.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(dest);

            noiseSource.start(now);
            noiseSource.stop(now + 0.02);
        }
    }

    /**
     * Level up - Triumphant ascending arpeggio with shimmer
     * Layered: ascending chord progression + octave harmonics + sparkle
     */
    private static createLevelUp(ctx: AudioContext, dest: AudioNode, now: number, vol: number, pitch: number): void {
        // C major arpeggio: C5 -> E5 -> G5 -> C6
        const notes = [523.25, 659.25, 783.99, 1046.5];

        notes.forEach((freq, i) => {
            const p = variedPitch(pitch);
            const startTime = now + i * 0.1;

            // Fundamental
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq * p, startTime);

            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.18 * vol, startTime + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

            osc.connect(gain);
            gain.connect(dest);

            osc.start(startTime);
            osc.stop(startTime + 0.42);

            // Octave harmonic
            const harm = ctx.createOscillator();
            const harmGain = ctx.createGain();
            harm.type = 'sine';
            harm.frequency.setValueAtTime(freq * 2 * p, startTime);

            harmGain.gain.setValueAtTime(0, startTime);
            harmGain.gain.linearRampToValueAtTime(0.06 * vol, startTime + 0.01);
            harmGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

            harm.connect(harmGain);
            harmGain.connect(dest);

            harm.start(startTime);
            harm.stop(startTime + 0.27);
        });

        // Final sparkle
        const sparkle = ctx.createOscillator();
        const sparkleGain = ctx.createGain();
        sparkle.type = 'sine';
        sparkle.frequency.setValueAtTime(2093 * pitch, now + 0.4);

        sparkleGain.gain.setValueAtTime(0, now + 0.4);
        sparkleGain.gain.linearRampToValueAtTime(0.10 * vol, now + 0.42);
        sparkleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

        sparkle.connect(sparkleGain);
        sparkleGain.connect(dest);

        sparkle.start(now + 0.4);
        sparkle.stop(now + 0.72);
    }

    /**
     * Weapon fire - Short sharp "pew" with mechanical click
     * Layered: sine sweep + noise click for mechanical feel
     */
    private static createWeaponFire(ctx: AudioContext, dest: AudioNode, now: number, vol: number, pitch: number): void {
        const p = variedPitch(pitch);

        // Layer 1: Quick sine sweep
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(700 * p, now);
        osc.frequency.exponentialRampToValueAtTime(250 * p, now + 0.06);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.10 * vol, now + 0.003);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gain);
        gain.connect(dest);

        osc.start(now);
        osc.stop(now + 0.1);

        // Layer 2: Mechanical click (noise burst)
        const noiseSource = audioManager.createNoiseSource();
        if (noiseSource) {
            const noiseFilter = createBandpass(ctx, 3000 * p, 2);
            const noiseGain = ctx.createGain();

            noiseGain.gain.setValueAtTime(0, now);
            noiseGain.gain.linearRampToValueAtTime(0.08 * vol, now + 0.001);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

            noiseSource.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(dest);

            noiseSource.start(now);
            noiseSource.stop(now + 0.03);
        }
    }

    /**
     * Explosion - Deep rumbling "BOOM" with long tail
     * Layered: sub bass + mid body + noise burst + rumble tail + high crack
     */
    private static createExplosion(ctx: AudioContext, dest: AudioNode, now: number, vol: number, pitch: number): void {
        const p = variedPitch(pitch);

        // Layer 1: Sub bass boom
        const sub = ctx.createOscillator();
        const subGain = ctx.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(60 * p, now);
        sub.frequency.exponentialRampToValueAtTime(20 * p, now + 0.3);

        subGain.gain.setValueAtTime(0, now);
        subGain.gain.linearRampToValueAtTime(0.25 * vol, now + 0.008);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        sub.connect(subGain);
        subGain.connect(dest);

        sub.start(now);
        sub.stop(now + 0.42);

        // Layer 2: Mid body punch
        const mid = ctx.createOscillator();
        const midGain = ctx.createGain();
        mid.type = 'triangle';
        mid.frequency.setValueAtTime(150 * p, now);
        mid.frequency.exponentialRampToValueAtTime(50 * p, now + 0.12);

        midGain.gain.setValueAtTime(0, now);
        midGain.gain.linearRampToValueAtTime(0.18 * vol, now + 0.005);
        midGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        mid.connect(midGain);
        midGain.connect(dest);

        mid.start(now);
        mid.stop(now + 0.22);

        // Layer 3: Noise burst (the "crack" of the explosion)
        const noiseSource = audioManager.createNoiseSource();
        if (noiseSource) {
            const noiseFilter = createLowpass(ctx, 1200 * p, 1);
            const noiseGain = ctx.createGain();

            noiseGain.gain.setValueAtTime(0, now);
            noiseGain.gain.linearRampToValueAtTime(0.20 * vol, now + 0.003);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

            noiseSource.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(dest);

            noiseSource.start(now);
            noiseSource.stop(now + 0.17);
        }

        // Layer 4: High frequency crack
        const crack = ctx.createOscillator();
        const crackGain = ctx.createGain();
        crack.type = 'sawtooth';
        crack.frequency.setValueAtTime(800 * p, now);
        crack.frequency.exponentialRampToValueAtTime(200 * p, now + 0.04);

        crackGain.gain.setValueAtTime(0, now);
        crackGain.gain.linearRampToValueAtTime(0.08 * vol, now + 0.002);
        crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

        crack.connect(crackGain);
        crackGain.connect(dest);

        crack.start(now);
        crack.stop(now + 0.08);

        // Layer 5: Low rumble tail
        const rumble = ctx.createOscillator();
        const rumbleGain = ctx.createGain();
        rumble.type = 'sine';
        rumble.frequency.setValueAtTime(40 * p, now);
        rumble.frequency.exponentialRampToValueAtTime(18 * p, now + 0.5);

        rumbleGain.gain.setValueAtTime(0, now);
        rumbleGain.gain.linearRampToValueAtTime(0.10 * vol, now + 0.03);
        rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

        rumble.connect(rumbleGain);
        rumbleGain.connect(dest);

        rumble.start(now);
        rumble.stop(now + 0.57);
    }
}
