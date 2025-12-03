/**
 * Sound effect identifiers for the game
 */
export type SfxId =
  | "menu_select"
  | "menu_confirm"
  | "menu_cancel"
  | "dialogue_advance"
  | "dialogue_choice"
  | "scene_transition"
  | "quest_complete"
  | "achievement_unlock"
  | "event_trigger"
  | "save_game"
  | "load_game";

/**
 * Background music track identifiers
 */
export type BgmId =
  | "title"
  | "explore_day"
  | "explore_evening"
  | "dialogue_calm"
  | "dialogue_tense"
  | "quest_complete"
  | "pause";

/**
 * AudioManager handles all game audio: BGM and SFX.
 * Uses Web Audio API for better control and cross-browser support.
 * Singleton pattern for global access.
 */
export class AudioManager {
  private static instance: AudioManager | null = null;

  private audioContext: AudioContext | null = null;
  private masterGainNode: GainNode | null = null;
  private bgmGainNode: GainNode | null = null;
  private sfxGainNode: GainNode | null = null;

  private bgmVolume = 0.7;
  private sfxVolume = 0.8;
  private muted = false;

  private currentBgm: AudioBufferSourceNode | null = null;
  private currentBgmId: BgmId | null = null;
  private bgmBuffers: Map<BgmId, AudioBuffer> = new Map();
  private sfxBuffers: Map<SfxId, AudioBuffer> = new Map();

  // For fade transitions
  private fadeInterval: number | null = null;

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  /**
   * Initialize the audio system. Must be called after user interaction.
   */
  async init(): Promise<void> {
    if (this.audioContext) return;

    try {
      this.audioContext = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

      // Create gain nodes
      this.masterGainNode = this.audioContext.createGain();
      this.bgmGainNode = this.audioContext.createGain();
      this.sfxGainNode = this.audioContext.createGain();

      // Connect nodes: bgm/sfx -> master -> destination
      this.bgmGainNode.connect(this.masterGainNode);
      this.sfxGainNode.connect(this.masterGainNode);
      this.masterGainNode.connect(this.audioContext.destination);

      // Set initial volumes
      this.updateVolumes();

      console.log("AudioManager initialized");
    } catch (err) {
      console.warn("Failed to initialize AudioManager:", err);
    }
  }

  /**
   * Resume audio context (needed after user interaction in some browsers)
   */
  async resume(): Promise<void> {
    if (this.audioContext?.state === "suspended") {
      await this.audioContext.resume();
    }
  }

  /**
   * Set BGM volume (0-100)
   */
  setBgmVolume(volume: number): void {
    this.bgmVolume = Math.max(0, Math.min(100, volume)) / 100;
    this.updateVolumes();
  }

  /**
   * Set SFX volume (0-100)
   */
  setSfxVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(100, volume)) / 100;
    this.updateVolumes();
  }

  /**
   * Toggle mute state
   */
  toggleMute(): boolean {
    this.muted = !this.muted;
    this.updateVolumes();
    return this.muted;
  }

  /**
   * Set mute state
   */
  setMuted(muted: boolean): void {
    this.muted = muted;
    this.updateVolumes();
  }

  /**
   * Get current mute state
   */
  isMuted(): boolean {
    return this.muted;
  }

  private updateVolumes(): void {
    if (!this.bgmGainNode || !this.sfxGainNode || !this.masterGainNode) return;

    const masterVolume = this.muted ? 0 : 1;
    this.masterGainNode.gain.value = masterVolume;
    this.bgmGainNode.gain.value = this.bgmVolume;
    this.sfxGainNode.gain.value = this.sfxVolume;
  }

  /**
   * Load an audio file and cache it
   */
  async loadAudio(url: string): Promise<AudioBuffer | null> {
    if (!this.audioContext) return null;

    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      return await this.audioContext.decodeAudioData(arrayBuffer);
    } catch (err) {
      console.warn(`Failed to load audio: ${url}`, err);
      return null;
    }
  }

  /**
   * Preload a BGM track
   */
  async preloadBgm(id: BgmId, url: string): Promise<void> {
    const buffer = await this.loadAudio(url);
    if (buffer) {
      this.bgmBuffers.set(id, buffer);
    }
  }

  /**
   * Preload an SFX
   */
  async preloadSfx(id: SfxId, url: string): Promise<void> {
    const buffer = await this.loadAudio(url);
    if (buffer) {
      this.sfxBuffers.set(id, buffer);
    }
  }

  /**
   * Play background music with optional fade
   */
  playBgm(id: BgmId, fadeInSeconds = 0.5): void {
    if (!this.audioContext || !this.bgmGainNode) return;

    // If same track is already playing, do nothing
    if (this.currentBgmId === id && this.currentBgm) return;

    // Stop current BGM with fade
    this.stopBgm(0.3);

    const buffer = this.bgmBuffers.get(id);
    if (!buffer) {
      console.warn(`BGM not loaded: ${id}`);
      return;
    }

    // Create and start new source
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    // Create gain for fade
    const fadeGain = this.audioContext.createGain();
    fadeGain.gain.value = 0;
    source.connect(fadeGain);
    fadeGain.connect(this.bgmGainNode);

    source.start(0);
    this.currentBgm = source;
    this.currentBgmId = id;

    // Fade in
    fadeGain.gain.linearRampToValueAtTime(
      1,
      this.audioContext.currentTime + fadeInSeconds
    );
  }

  /**
   * Stop current BGM with optional fade out
   */
  stopBgm(fadeOutSeconds = 0.5): void {
    if (!this.currentBgm || !this.audioContext) return;

    const source = this.currentBgm;
    this.currentBgm = null;
    this.currentBgmId = null;

    // Schedule stop after fade
    if (fadeOutSeconds > 0) {
      setTimeout(() => {
        try {
          source.stop();
        } catch {
          // Ignore if already stopped
        }
      }, fadeOutSeconds * 1000);
    } else {
      try {
        source.stop();
      } catch {
        // Ignore if already stopped
      }
    }
  }

  /**
   * Pause BGM
   */
  pauseBgm(): void {
    if (this.audioContext?.state === "running") {
      this.audioContext.suspend();
    }
  }

  /**
   * Resume BGM
   */
  resumeBgm(): void {
    if (this.audioContext?.state === "suspended") {
      this.audioContext.resume();
    }
  }

  /**
   * Play a sound effect
   */
  playSfx(id: SfxId): void {
    if (!this.audioContext || !this.sfxGainNode) return;

    const buffer = this.sfxBuffers.get(id);
    if (!buffer) {
      // SFX not loaded - just log debug info
      // console.debug(`SFX not loaded: ${id}`);
      return;
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.sfxGainNode);
    source.start(0);
  }

  /**
   * Get current BGM track ID
   */
  getCurrentBgm(): BgmId | null {
    return this.currentBgmId;
  }

  /**
   * Check if audio system is ready
   */
  isReady(): boolean {
    return this.audioContext !== null;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.stopBgm(0);
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.bgmBuffers.clear();
    this.sfxBuffers.clear();
    AudioManager.instance = null;
  }
}

/**
 * Convenience function to get the audio manager instance
 */
export function getAudioManager(): AudioManager {
  return AudioManager.getInstance();
}
