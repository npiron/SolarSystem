/**
 * Audio Manager - Professional Web Audio API sound system
 * Handles all game audio with procedural sound generation
 * Provides shared AudioContext, gain nodes, noise buffers, and effects
 */

export type SoundType =
    | 'laser'
    | 'hit'
    | 'critical'
    | 'death'
    | 'collect'
    | 'wave'
    | 'damage'
    | 'click'
    | 'levelUp'
    | 'weaponFire'
    | 'explosion';

export interface AudioSettings {
    enabled: boolean;
    masterVolume: number;
    sfxVolume: number;
    musicVolume: number;
}

/** Duration of the shared noise buffer in seconds */
const NOISE_BUFFER_DURATION = 2;

class AudioManager {
    private static instance: AudioManager;
    private context: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private sfxGain: GainNode | null = null;
    private musicGain: GainNode | null = null;
    private compressor: DynamicsCompressorNode | null = null;
    private noiseBuffer: AudioBuffer | null = null;
    private convolver: ConvolverNode | null = null;
    private reverbGain: GainNode | null = null;

    private settings: AudioSettings = {
        enabled: true,
        masterVolume: 0.6,
        sfxVolume: 1.0,
        musicVolume: 0.5
    };

    private constructor() {
        // Singleton pattern
    }

    static getInstance(): AudioManager {
        if (!AudioManager.instance) {
            AudioManager.instance = new AudioManager();
        }
        return AudioManager.instance;
    }

    /**
     * Initialize the audio context, gain nodes, effects, and noise buffer
     * Must be called after user interaction (browser requirement)
     */
    init(): void {
        if (typeof window === "undefined") {
            this.settings.enabled = false;
            return;
        }
        if (this.context) return; // Already initialized

        try {
            this.context = new (window.AudioContext || (window as any).webkitAudioContext)();

            // Create compressor to prevent volume spikes when sounds overlap
            this.compressor = this.context.createDynamicsCompressor();
            this.compressor.threshold.setValueAtTime(-20, this.context.currentTime);
            this.compressor.knee.setValueAtTime(25, this.context.currentTime);
            this.compressor.ratio.setValueAtTime(8, this.context.currentTime);
            this.compressor.attack.setValueAtTime(0.003, this.context.currentTime);
            this.compressor.release.setValueAtTime(0.15, this.context.currentTime);

            // Create gain nodes for volume control
            this.masterGain = this.context.createGain();
            this.sfxGain = this.context.createGain();
            this.musicGain = this.context.createGain();

            // Create reverb (short room ambience)
            this.reverbGain = this.context.createGain();
            this.convolver = this.createReverbImpulse(1.5, 2.0);
            this.reverbGain.gain.setValueAtTime(0.15, this.context.currentTime);

            // Connect gain chain: sfx/music -> master -> compressor -> destination
            this.sfxGain.connect(this.masterGain);
            this.musicGain.connect(this.masterGain);

            // Reverb send: master -> convolver -> reverbGain -> compressor
            this.masterGain.connect(this.convolver);
            this.convolver.connect(this.reverbGain);
            this.reverbGain.connect(this.compressor);

            // Dry path: master -> compressor
            this.masterGain.connect(this.compressor);
            this.compressor.connect(this.context.destination);

            // Create noise buffer for impact/explosion sounds
            this.noiseBuffer = this.createNoiseBuffer();

            // Apply saved settings
            this.updateVolumes();

            console.log('🔊 Audio system initialized with dynamic compression & reverb');
        } catch (error) {
            console.error('Failed to initialize audio:', error);
            this.settings.enabled = false;
        }
    }

    /**
     * Create a noise buffer for use in impact and explosion sounds
     */
    private createNoiseBuffer(): AudioBuffer {
        const sampleRate = this.context!.sampleRate;
        const length = sampleRate * NOISE_BUFFER_DURATION;
        const buffer = this.context!.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);

        // Fill with white noise
        for (let i = 0; i < length; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        return buffer;
    }

    /**
     * Create a convolver impulse response for reverb effect
     */
    private createReverbImpulse(duration: number, decay: number): ConvolverNode {
        const sampleRate = this.context!.sampleRate;
        const length = sampleRate * duration;
        const impulse = this.context!.createBuffer(2, length, sampleRate);

        for (let channel = 0; channel < 2; channel++) {
            const channelData = impulse.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
            }
        }

        const convolver = this.context!.createConvolver();
        convolver.buffer = impulse;
        return convolver;
    }

    /**
     * Resume audio context (required after page load in some browsers)
     */
    resume(): void {
        if (this.context && this.context.state === 'suspended') {
            this.context.resume();
        }
    }

    /**
     * Get the audio context (lazy init)
     */
    getContext(): AudioContext | null {
        if (!this.context && this.settings.enabled) {
            this.init();
        }
        return this.context;
    }

    /**
     * Get the SFX gain node for connecting sounds
     */
    getSfxGain(): GainNode | null {
        return this.sfxGain;
    }

    /**
     * Get the music gain node for connecting music
     */
    getMusicGain(): GainNode | null {
        return this.musicGain;
    }

    /**
     * Get the shared noise buffer
     */
    getNoiseBuffer(): AudioBuffer | null {
        return this.noiseBuffer;
    }

    /**
     * Create a noise source node from the shared noise buffer
     * Returns null if audio not initialized
     */
    createNoiseSource(): AudioBufferSourceNode | null {
        if (!this.context || !this.noiseBuffer) return null;
        const source = this.context.createBufferSource();
        source.buffer = this.noiseBuffer;
        return source;
    }

    /**
     * Update all volume levels
     */
    private updateVolumes(): void {
        if (!this.masterGain || !this.sfxGain || !this.musicGain) return;

        this.masterGain.gain.value = this.settings.masterVolume;
        this.sfxGain.gain.value = this.settings.sfxVolume;
        this.musicGain.gain.value = this.settings.musicVolume;
    }

    /**
     * Set master volume (0-1)
     */
    setMasterVolume(volume: number): void {
        this.settings.masterVolume = Math.max(0, Math.min(1, volume));
        this.updateVolumes();
    }

    /**
     * Set SFX volume (0-1)
     */
    setSfxVolume(volume: number): void {
        this.settings.sfxVolume = Math.max(0, Math.min(1, volume));
        this.updateVolumes();
    }

    /**
     * Set music volume (0-1)
     */
    setMusicVolume(volume: number): void {
        this.settings.musicVolume = Math.max(0, Math.min(1, volume));
        this.updateVolumes();
    }

    /**
     * Toggle audio on/off
     */
    setEnabled(enabled: boolean): void {
        this.settings.enabled = enabled;
        if (enabled && !this.context) {
            this.init();
        } else if (!enabled && this.context) {
            this.context.suspend();
        }
    }

    /**
     * Check if audio is enabled
     */
    isEnabled(): boolean {
        return this.settings.enabled;
    }

    /**
     * Get current settings
     */
    getSettings(): AudioSettings {
        return { ...this.settings };
    }
}

// Export singleton instance
export const audioManager = AudioManager.getInstance();
