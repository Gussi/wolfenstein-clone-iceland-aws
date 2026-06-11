// Web Audio playback: one-shot sound effects and looping music.
// Gracefully degrades to silence if audio is unavailable.

import type { AssetLoader } from './asset-loader';

export class AudioSystem {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicSource: AudioBufferSourceNode | null = null;
  private muted = false;
  private volume = 0.6;

  constructor(private assets: AssetLoader) {}

  /** Create the audio context. Must be called after a user gesture. */
  init(): AudioContext {
    if (!this.context) {
      this.context = new AudioContext();
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = this.muted ? 0 : this.volume;
      this.masterGain.connect(this.context.destination);
    }
    if (this.context.state === 'suspended') {
      void this.context.resume();
    }
    return this.context;
  }

  getContext(): AudioContext {
    return this.init();
  }

  play(soundId: string): void {
    if (!this.context || !this.masterGain) return;
    const buffer = this.assets.getSound(soundId);
    if (!buffer) return;
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.masterGain);
    source.start(0);
  }

  playMusic(trackId: string): void {
    if (!this.context || !this.masterGain) return;
    const buffer = this.assets.getSound(trackId);
    if (!buffer) return;
    this.stopMusic();
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(this.masterGain);
    source.start(0);
    this.musicSource = source;
  }

  stopMusic(): void {
    if (this.musicSource) {
      try {
        this.musicSource.stop();
      } catch {
        // already stopped
      }
      this.musicSource = null;
    }
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.masterGain && !this.muted) {
      this.masterGain.gain.value = this.volume;
    }
  }

  mute(): void {
    this.muted = true;
    if (this.masterGain) this.masterGain.gain.value = 0;
  }

  unmute(): void {
    this.muted = false;
    if (this.masterGain) this.masterGain.gain.value = this.volume;
  }

  toggleMute(): boolean {
    if (this.muted) {
      this.unmute();
    } else {
      this.mute();
    }
    return this.muted;
  }
}
