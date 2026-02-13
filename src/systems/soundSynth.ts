/**
 * Sound Synthesizer - Procedural sound generation
 * Creates all game sounds using Web Audio API oscillators
 */

import { audioManager, type SoundType } from './audio.ts';

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
        }
    }

    /**
     * Laser projectile fire - Soft "pew" sound
     */
    private static createLaser(ctx: AudioContext, dest: AudioNode, now: number, vol: number, pitch: number): void {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(600 * pitch, now);
        osc.frequency.exponentialRampToValueAtTime(300 * pitch, now + 0.08);

        gain.gain.setValueAtTime(0.12 * vol, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

        osc.connect(gain);
        gain.connect(dest);

        osc.start(now);
        osc.stop(now + 0.12);
    }

    /**
     * Hit impact - Gentle "tap"
     */
    private static createHit(ctx: AudioContext, dest: AudioNode, now: number, vol: number, pitch: number): void {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(180 * pitch, now);
        osc.frequency.exponentialRampToValueAtTime(80 * pitch, now + 0.06);

        gain.gain.setValueAtTime(0.15 * vol, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

        osc.connect(gain);
        gain.connect(dest);

        osc.start(now);
        osc.stop(now + 0.1);
    }

    /**
   * Critical hit - Soft metallic chime
   */
    private static createCritical(ctx: AudioContext, dest: AudioNode, now: number, vol: number, pitch: number): void {
        const high = ctx.createOscillator();
        const low = ctx.createOscillator();
        const gain = ctx.createGain();

        high.type = 'sine';
        high.frequency.setValueAtTime(900, now);
        high.frequency.exponentialRampToValueAtTime(700, now + 0.04);

        low.type = 'sine';
        low.frequency.setValueAtTime(450, now);
        low.frequency.exponentialRampToValueAtTime(300, now + 0.04);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.12 * vol, now + 0.003);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

        high.connect(gain);
        low.connect(gain);
        gain.connect(dest);

        high.start(now);
        low.start(now);
        high.stop(now + 0.06);
        low.stop(now + 0.06);
    }

    /**
     * Enemy death - Soft low thud
     */
    private static createDeath(ctx: AudioContext, dest: AudioNode, now: number, vol: number, pitch: number): void {
        const thud = ctx.createOscillator();
        const gain = ctx.createGain();

        thud.type = 'sine';
        thud.frequency.setValueAtTime(100, now);
        thud.frequency.exponentialRampToValueAtTime(50, now + 0.05);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.15 * vol, now + 0.003);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

        thud.connect(gain);
        gain.connect(dest);

        thud.start(now);
        thud.stop(now + 0.06);
    }

    /**
     * Fragment collection - Subtle mid ding (not too present)
     */
    private static createCollect(ctx: AudioContext, dest: AudioNode, now: number, vol: number, pitch: number): void {
        // Gentle mid-range chime
        const note = ctx.createOscillator();
        const gain = ctx.createGain();

        note.type = 'sine';
        note.frequency.setValueAtTime(700, now); // Mid range
        note.frequency.exponentialRampToValueAtTime(600, now + 0.025);

        // Very subtle
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.15 * vol, now + 0.003);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.03);

        note.connect(gain);
        gain.connect(dest);

        note.start(now);
        note.stop(now + 0.035);
    }

    /**
     * Wave complete - Victory fanfare
     */
    private static createWave(ctx: AudioContext, dest: AudioNode, now: number, vol: number, pitch: number): void {
        // Three ascending notes
        const notes = [523.25, 659.25, 783.99]; // C5, E5, G5

        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            const startTime = now + i * 0.15;

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq * pitch, startTime);

            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.25 * vol, startTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.25);

            osc.connect(gain);
            gain.connect(dest);

            osc.start(startTime);
            osc.stop(startTime + 0.3);
        });
    }

    /**
     * Player damage - Gentle warning tone
     */
    private static createDamage(ctx: AudioContext, dest: AudioNode, now: number, vol: number, pitch: number): void {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(280 * pitch, now);
        osc.frequency.exponentialRampToValueAtTime(180 * pitch, now + 0.06);

        gain.gain.setValueAtTime(0.15 * vol, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

        osc.connect(gain);
        gain.connect(dest);

        osc.start(now);
        osc.stop(now + 0.1);
    }

    /**
     * UI click - Subtle click
     */
    private static createClick(ctx: AudioContext, dest: AudioNode, now: number, vol: number, pitch: number): void {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(1000 * pitch, now);

        gain.gain.setValueAtTime(0.15 * vol, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.03);

        osc.connect(gain);
        gain.connect(dest);

        osc.start(now);
        osc.stop(now + 0.04);
    }
}
