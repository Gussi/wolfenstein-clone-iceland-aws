/**
 * AudioSystem — Web Audio API wrapper. Plays one-shot SFX and looping music.
 * Designed to degrade gracefully: if the AudioContext can't be created or a
 * sound buffer is missing, calls become silent no-ops (the game stays playable).
 *
 * Stories: US-17 (weapon SFX), US-18 (enemy SFX), US-19 (environmental audio)
 */
import { AssetLoader } from "./asset-loader";

export class AudioSystem {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicSource: AudioBufferSourceNode | null = null;
  private assets: AssetLoader;
  private muted = false;
  private volume = 0.7;

  constructor(assets: AssetLoader) {
    this.assets = assets;
  }

  /**
   * Create the AudioContext. Must be called from a user gesture (e.g. the
   * click-to-play overlay). Returns the context so the AssetLoader can decode.
   */
  init(): AudioContext | null {
    if (this.ctx) return this.ctx;
    try {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.ctx = new Ctor();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : this.volume;
      this.masterGain.connect(this.ctx.destination);
    } catch {
      console.warn("[audio] Web Audio API unavailable — running silent");
      this.ctx = null;
    }
    return this.ctx;
  }

  getContext(): AudioContext | null {
    return this.ctx;
  }

  /** Resume a suspended context (browsers suspend until a gesture). */
  async resume(): Promise<void> {
    if (this.ctx && this.ctx.state === "suspended") {
      try {
        await this.ctx.resume();
      } catch {
        /* ignore */
      }
    }
  }

  /** Play a one-shot sound effect by id. Silent no-op if unavailable. */
  play(soundId: string): void {
    if (!this.ctx || !this.masterGain) return;
    const buffer = this.assets.getSound(soundId);
    if (!buffer) return;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.masterGain);
    source.start(0);
  }

  /** Start looping music. Stops any current track first. */
  playMusic(trackId: string): void {
    if (!this.ctx || !this.masterGain) return;
    const buffer = this.assets.getSound(trackId);
    if (!buffer) return;
    this.stopMusic();
    const source = this.ctx.createBufferSource();
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
        /* already stopped */
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

  isMuted(): boolean {
    return this.muted;
  }
}
