/**
 * Audio Manager - Professional Web Audio API sound system
 * Handles all game audio with procedural sound generation
 */

export type SoundType =
    | 'laser'
    | 'hit'
    | 'critical'
    | 'death'
    | 'collect'
    | 'wave'
    | 'damage'
    | 'click';

export interface AudioSettings {
    enabled: boolean;
    masterVolume: number;
    sfxVolume: number;
    musicVolume: number;
}

class AudioManager {
    private static instance: AudioManager;
    private context: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private sfxGain: GainNode | null = null;
    private musicGain: GainNode | null = null;
    private compressor: DynamicsCompressorNode | null = null; // Prevents volume spikes

    private settings: AudioSettings = {
        enabled: true,
        masterVolume: 0.6,  // Reduced for subtle musical notes
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
     * Initialize the audio context and gain nodes
     * Must be called after user interaction (browser requirement)
     */
    init(): void {
        if (this.context) return; // Already initialized

        try {
            this.context = new (window.AudioContext || (window as any).webkitAudioContext)();

            // Create compressor to prevent volume spikes when sounds overlap
            this.compressor = this.context.createDynamicsCompressor();
            this.compressor.threshold.setValueAtTime(-24, this.context.currentTime); // Start compressing at -24dB
            this.compressor.knee.setValueAtTime(30, this.context.currentTime);      // Smooth compression
            this.compressor.ratio.setValueAtTime(12, this.context.currentTime);     // Strong compression ratio
            this.compressor.attack.setValueAtTime(0.003, this.context.currentTime); // Fast attack (3ms)
            this.compressor.release.setValueAtTime(0.25, this.context.currentTime); // Medium release (250ms)

            // Create gain nodes for volume control
            this.masterGain = this.context.createGain();
            this.sfxGain = this.context.createGain();
            this.musicGain = this.context.createGain();

            // Connect gain chain: sfx/music -> master -> compressor -> destination
            this.sfxGain.connect(this.masterGain);
            this.musicGain.connect(this.masterGain);
            this.masterGain.connect(this.compressor);
            this.compressor.connect(this.context.destination);

            // Apply saved settings
            this.updateVolumes();

            console.log('🔊 Audio system initialized with dynamic compression');
        } catch (error) {
            console.error('Failed to initialize audio:', error);
            this.settings.enabled = false;
        }
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
