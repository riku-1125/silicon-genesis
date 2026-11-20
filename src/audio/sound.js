/**
 * SILICON GENESIS — Mobile-Hardened Web Audio Industrial Synth Engine
 *
 * Includes:
 *   - iOS Safari / Android Chrome gesture unlock (touchstart/pointerdown/click)
 *   - iOS 17+ navigator.audioSession = 'playback' + silent HTMLAudio unlock
 *     so sound works reliably even when an iPhone's silent switch is enabled
 *   - Real-time Master Volume slider (0.0 – 1.0) + DynamicsCompressor anti-clipping
 *   - Separate toggleable underground bunker CRT ambient hum
 */

// Tiny valid silent WAV data URI (44 bytes + 2 bytes of silence) to wake iOS playback audio session
const SILENT_WAV_URI =
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.compressor = null;
    this.enabled = true;
    this.volume = 0.8; // 0.0 .. 1.0
    this.droneEnabled = false;
    this.droneNodes = null;
    this._unlocked = false;
    this._silentAudio = null;

    this._installGlobalUnlock();
  }

  _installGlobalUnlock() {
    if (typeof window === 'undefined') return;
    const handler = () => {
      this.unlock();
    };
    window.addEventListener('touchstart', handler, { capture: true, passive: true });
    window.addEventListener('touchend', handler, { capture: true, passive: true });
    window.addEventListener('pointerdown', handler, { capture: true, passive: true });
    window.addEventListener('click', handler, { capture: true, passive: true });
    window.addEventListener('keydown', handler, { capture: true, passive: true });
  }

  /**
   * Must be called inside a user gesture to reliably unlock mobile Safari/Chrome Web Audio.
   */
  unlock() {
    // Enable iOS 17+ media playback audio session so mute switch doesn't silence game SFX
    try {
      if (navigator.audioSession && navigator.audioSession.type !== 'playback') {
        navigator.audioSession.type = 'playback';
      }
    } catch {
      // ignore unsupported browsers
    }

    // Wake iOS audio hardware channel once via silent <audio> element
    if (!this._unlocked && typeof Audio !== 'undefined') {
      try {
        if (!this._silentAudio) {
          this._silentAudio = new Audio(SILENT_WAV_URI);
          this._silentAudio.playsInline = true;
          this._silentAudio.volume = 0.01;
        }
        const p = this._silentAudio.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } catch {
        // ignore
      }
    }

    const ctx = this._ensureCtx(true);
    if (!ctx) return;

    if (ctx.state === 'suspended' || ctx.state === 'interrupted') {
      ctx.resume().catch(() => {});
    }

    // Play a 1-sample silent buffer directly inside the gesture to unlock iOS WebKit WebAudio
    if (!this._unlocked) {
      try {
        const buf = ctx.createBuffer(1, 1, 22050);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(0);
        this._unlocked = true;
      } catch {
        // ignore
      }
    }

    if (this.droneEnabled && this.enabled && !this.droneNodes) {
      this.startDrone();
    }
  }

  setEnabled(flag) {
    this.enabled = Boolean(flag);
    this._syncMasterGain();
    if (!this.enabled) {
      this.stopDrone();
    } else if (this.droneEnabled) {
      this.startDrone();
    }
  }

  setVolume(vol) {
    const clamped = Math.max(0, Math.min(1, Number(vol)));
    this.volume = Number.isFinite(clamped) ? clamped : 0.8;
    this._syncMasterGain();
  }

  setDroneEnabled(flag) {
    this.droneEnabled = Boolean(flag);
    if (this.droneEnabled && this.enabled) {
      this.startDrone();
    } else {
      this.stopDrone();
    }
  }

  getStateSummary() {
    if (!this.ctx) return '未初期化（画面タップで有効化）';
    if (this.ctx.state === 'running') return '稼働中 (READY)';
    if (this.ctx.state === 'suspended') return '一時停止（テスト再生をタップ）';
    return this.ctx.state;
  }

  _syncMasterGain() {
    if (!this.masterGain || !this.ctx) return;
    const target = this.enabled ? this.volume : 0;
    try {
      this.masterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.015);
    } catch {
      this.masterGain.gain.value = target;
    }
  }

  _ensureCtx(forceCreate = false) {
    if (!this.enabled && !forceCreate) return null;
    const AudioCtx = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!this.ctx) {
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.enabled ? this.volume : 0;

      // Soft dynamics compressor keeps phone speaker SFX loud & punchy without distortion
      if (typeof this.ctx.createDynamicsCompressor === 'function') {
        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.value = -14;
        this.compressor.knee.value = 18;
        this.compressor.ratio.value = 6;
        this.masterGain.connect(this.compressor);
        this.compressor.connect(this.ctx.destination);
      } else {
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx.state === 'suspended' || this.ctx.state === 'interrupted') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  _withAudio(fn) {
    if (!this.enabled || this.volume <= 0.001) return;
    const ctx = this._ensureCtx();
    if (!ctx || !this.masterGain) return;
    if (ctx.state === 'running') {
      fn(ctx, this.masterGain);
    } else {
      ctx
        .resume()
        .then(() => {
          if (ctx.state === 'running' && this.enabled) {
            fn(ctx, this.masterGain);
          }
        })
        .catch(() => {});
    }
  }

  startDrone() {
    this._withAudio((ctx, out) => {
      if (this.droneNodes) return;
      try {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        osc1.type = 'sawtooth';
        osc1.frequency.value = 55;
        osc2.type = 'triangle';
        osc2.frequency.value = 110.5;

        filter.type = 'lowpass';
        filter.frequency.value = 180;
        gain.gain.value = 0.08;

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(out);

        osc1.start();
        osc2.start();
        this.droneNodes = { osc1, osc2, gain };
      } catch {
        // ignore
      }
    });
  }

  stopDrone() {
    if (!this.droneNodes) return;
    try {
      this.droneNodes.osc1.stop();
      this.droneNodes.osc2.stop();
      this.droneNodes.gain.disconnect();
    } catch {
      // ignore
    }
    this.droneNodes = null;
  }

  /** Crisp mechanical relay switch click */
  playSwitch(on = true) {
    this._withAudio((ctx, out) => {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(on ? 540 : 350, now);
      osc.frequency.exponentialRampToValueAtTime(on ? 920 : 190, now + 0.05);

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);

      osc.connect(gain);
      gain.connect(out);
      osc.start(now);
      osc.stop(now + 0.07);
    });
  }

  /** Chunky DIP chip socket drop */
  playChipPlace() {
    this._withAudio((ctx, out) => {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(105, now + 0.085);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);

      osc.connect(gain);
      gain.connect(out);
      osc.start(now);
      osc.stop(now + 0.1);
    });
  }

  /** Clean copper wire snap */
  playWireConnect() {
    this._withAudio((ctx, out) => {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(680, now);
      osc.frequency.exponentialRampToValueAtTime(1240, now + 0.065);

      gain.gain.setValueAtTime(0.24, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(out);
      osc.start(now);
      osc.stop(now + 0.085);
    });
  }

  /** Soft wire snip / delete */
  playDelete() {
    this._withAudio((ctx, out) => {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.08);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(out);
      osc.start(now);
      osc.stop(now + 0.1);
    });
  }

  /** Clock heartbeat pulse */
  playClockPulse() {
    this._withAudio((ctx, out) => {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(170, now);
      osc.frequency.exponentialRampToValueAtTime(460, now + 0.055);
      osc.frequency.exponentialRampToValueAtTime(130, now + 0.13);

      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.145);

      osc.connect(gain);
      gain.connect(out);
      osc.start(now);
      osc.stop(now + 0.15);
    });
  }

  /** Ascending test step pass chime */
  playTestStep(stepIdx, ok) {
    this._withAudio((ctx, out) => {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (ok) {
        const pentatonic = [330, 392, 440, 523.25, 587.33, 659.25, 783.99, 880];
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(pentatonic[stepIdx % pentatonic.length], now);
        gain.gain.setValueAtTime(0.24, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(155, now);
        osc.frequency.linearRampToValueAtTime(110, now + 0.2);
        gain.gain.setValueAtTime(0.24, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      }

      osc.connect(gain);
      gain.connect(out);
      osc.start(now);
      osc.stop(now + 0.25);
    });
  }

  /** Warm vacuum-tube power-up victory fanfare */
  playVictory() {
    this._withAudio((ctx, out) => {
      const now = ctx.currentTime;
      const notes = [261.63, 329.63, 392.0, 523.25, 659.25];
      notes.forEach((freq, i) => {
        const t = now + i * 0.085;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = i === notes.length - 1 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.24, t + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.65);

        osc.connect(gain);
        gain.connect(out);
        osc.start(t);
        osc.stop(t + 0.7);
      });
    });
  }

  /** Gentle CRT dialogue blip (audible on mobile speakers!) */
  playBlip(pitch = 480) {
    this._withAudio((ctx, out) => {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(pitch, now);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
      osc.connect(gain);
      gain.connect(out);
      osc.start(now);
      osc.stop(now + 0.035);
    });
  }

  /** Dramatic bunker alarm pulse for opening crisis */
  playAlarm() {
    this._withAudio((ctx, out) => {
      const now = ctx.currentTime;
      [0, 0.28].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, now + offset);
        osc.frequency.linearRampToValueAtTime(250, now + offset + 0.22);
        gain.gain.setValueAtTime(0.22, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.26);
        osc.connect(gain);
        gain.connect(out);
        osc.start(now + offset);
        osc.stop(now + offset + 0.27);
      });
    });
  }

  /** Deep vacuum-tube power-on swell for NAND discovery / game start */
  playPowerUp() {
    this._withAudio((ctx, out) => {
      const now = ctx.currentTime;
      [130.81, 196.0, 261.63, 329.63].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = i === 0 ? 'sawtooth' : 'triangle';
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(220, now);
        filter.frequency.exponentialRampToValueAtTime(1800, now + 0.65);

        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.16, now + 0.22);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.95);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(out);
        osc.start(now);
        osc.stop(now + 1.0);
      });
    });
  }

  /** Crisp 3-note sound check chime for Settings modal */
  playSoundTest() {
    this.unlock();
    this._withAudio((ctx, out) => {
      const now = ctx.currentTime;
      [440, 554.37, 659.25].forEach((freq, i) => {
        const t = now + i * 0.08;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.28, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
        osc.connect(gain);
        gain.connect(out);
        osc.start(t);
        osc.stop(t + 0.28);
      });
    });
  }
}

export const sound = new SoundEngine();
