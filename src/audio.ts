/**
 * Audio: Web Audio synthesized one-shot sound effects plus optional looping
 * background music loaded from a file. Fails gracefully (silent) when the
 * AudioContext or assets are unavailable.
 */

export type Sfx = 'swing' | 'hit' | 'disperse' | 'alert' | 'hurt' | 'pickup' | 'door' | 'secret';

export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicSource: AudioBufferSourceNode | null = null;
  private musicGain: GainNode | null = null;
  private musicBuffer: AudioBuffer | null = null;
  enabled = true;

  /** Lazily create the AudioContext (must follow a user gesture). */
  resume(): void {
    if (!this.enabled) return;
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.6;
        this.masterGain.connect(this.ctx.destination);
      } catch {
        this.enabled = false;
        return;
      }
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  /** Load and decode a music file (no-op on failure). */
  async loadMusic(url: string): Promise<void> {
    if (!this.enabled) return;
    try {
      const res = await fetch(url);
      const data = await res.arrayBuffer();
      this.resume();
      if (!this.ctx) return;
      this.musicBuffer = await this.ctx.decodeAudioData(data);
    } catch {
      this.musicBuffer = null;
    }
  }

  startMusic(volume = 0.35): void {
    if (!this.ctx || !this.musicBuffer || this.musicSource) return;
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = volume;
    this.musicGain.connect(this.masterGain ?? this.ctx.destination);
    this.musicSource = this.ctx.createBufferSource();
    this.musicSource.buffer = this.musicBuffer;
    this.musicSource.loop = true;
    this.musicSource.connect(this.musicGain);
    this.musicSource.start();
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

  /** Play a short synthesized sound effect. */
  play(sfx: Sfx): void {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.masterGain);

    const params = SFX_PARAMS[sfx];
    osc.type = params.type;
    osc.frequency.setValueAtTime(params.startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(1, params.endFreq),
      now + params.duration,
    );
    gain.gain.setValueAtTime(params.gain, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + params.duration);
    osc.start(now);
    osc.stop(now + params.duration);
  }
}

interface SfxParams {
  type: OscillatorType;
  startFreq: number;
  endFreq: number;
  duration: number;
  gain: number;
}

const SFX_PARAMS: Record<Sfx, SfxParams> = {
  swing: { type: 'triangle', startFreq: 320, endFreq: 180, duration: 0.12, gain: 0.25 },
  hit: { type: 'square', startFreq: 200, endFreq: 90, duration: 0.1, gain: 0.3 },
  disperse: { type: 'sawtooth', startFreq: 420, endFreq: 60, duration: 0.35, gain: 0.3 },
  alert: { type: 'square', startFreq: 500, endFreq: 660, duration: 0.18, gain: 0.22 },
  hurt: { type: 'sawtooth', startFreq: 160, endFreq: 70, duration: 0.22, gain: 0.32 },
  pickup: { type: 'sine', startFreq: 520, endFreq: 880, duration: 0.18, gain: 0.28 },
  door: { type: 'triangle', startFreq: 120, endFreq: 90, duration: 0.4, gain: 0.25 },
  secret: { type: 'sine', startFreq: 660, endFreq: 990, duration: 0.5, gain: 0.3 },
};
