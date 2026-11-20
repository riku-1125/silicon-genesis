/**
 * SILICON GENESIS — Mobile-Hardened Web Audio Synth & Multi-Track BGM Engine
 *
 * Features:
 *   - 4 procedural atmospheric BGM tracks ('title', 'crisis', 'workbench', 'finale')
 *     composed with warm filtered analog pads, crystalline synth arpeggios, bass,
 *     and soft relay percussion — zero external MP3 downloads!
 *   - Independent BGM & SE volume controls + toggles
 *   - iOS Safari / Android Chrome gesture unlock + iOS 17+ audioSession='playback'
 *   - Soft DynamicsCompressor anti-clipping + optional subtle haptic feedback
 */

const SILENT_WAV_URI =
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

// Musical note frequencies (Hz)
const N = {
  A1: 55.0, C2: 65.41, D2: 73.42, E2: 82.41, F2: 87.31, G2: 98.0, A2: 110.0, Bb2: 116.54,
  C3: 130.81, D3: 146.83, Eb3: 155.56, E3: 164.81, F3: 174.61, G3: 196.0, A3: 220.0, Bb3: 233.08, B3: 246.94,
  C4: 261.63, D4: 293.66, Eb4: 311.13, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, Bb4: 466.16, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.0,
};

export const BGM_TRACK_INFO = {
  title: {
    name: '地下400メートルの残響 (Echoes of Ark-7)',
    stepMs: 360,
    chords: [
      [N.D3, N.F3, N.A3, N.E4],
      [N.Bb2, N.F3, N.A3, N.D4],
      [N.C3, N.G3, N.C4, N.E4],
      [N.A2, N.E3, N.A3, N.C4],
    ],
    bass: [N.D2, N.Bb2, N.C2, N.A1],
    arp: [
      N.A4, null, N.F4, N.E4, N.D4, null, N.A4, null,
      N.D5, null, N.A4, N.F4, N.E4, null, N.D4, null,
      N.E4, null, N.G4, N.C5, N.G4, null, N.E4, null,
      N.E4, null, N.C4, N.A3, N.E4, null, null, null,
    ],
    perc: false,
    padCutoff: 620,
  },
  crisis: {
    name: '42年目の沈黙 (Blackout Protocol)',
    stepMs: 250,
    chords: [
      [N.D3, N.F3, N.A3],
      [N.Eb3, N.G3, N.Bb3],
      [N.D3, N.F3, N.A3],
      [N.C3, N.E3, N.A3],
    ],
    bass: [N.D2, N.D2, N.D2, N.C2],
    arp: [
      N.D4, null, N.F4, null, N.A4, null, N.F4, null,
      N.Eb4, null, N.G4, null, N.Bb4, null, N.G4, null,
      N.D4, null, N.A4, null, N.F4, null, N.E4, null,
      N.C4, null, N.E4, null, N.A4, null, null, null,
    ],
    perc: true,
    tense: true,
    padCutoff: 480,
  },
  workbench: {
    name: '硅素の鼓動 (Silicon Pulse)',
    stepMs: 285,
    chords: [
      [N.A2, N.E3, N.A3, N.C4],
      [N.F2, N.C3, N.F3, N.A3],
      [N.C3, N.G3, N.C4, N.E4],
      [N.G2, N.D3, N.G3, N.B3],
    ],
    bass: [N.A1, N.F2, N.C2, N.G2],
    arp: [
      N.E4, null, N.A4, N.C5, null, N.B4, N.A4, null,
      N.A4, null, N.F4, N.C5, null, N.A4, N.G4, null,
      N.G4, null, N.C5, N.E5, null, N.D5, N.C5, null,
      N.B4, null, N.G4, N.D5, null, N.B4, N.G4, null,
    ],
    perc: true,
    tense: false,
    padCutoff: 740,
  },
  finale: {
    name: '夜明けのビーコン (Dawn Over Ash)',
    stepMs: 300,
    chords: [
      [N.F3, N.A3, N.C4, N.E4],
      [N.G3, N.B3, N.D4, N.E4],
      [N.A3, N.C4, N.E4, N.G4],
      [N.C3, N.G3, N.C4, N.E4],
    ],
    bass: [N.F2, N.G2, N.A2, N.C2],
    arp: [
      N.C5, N.E5, N.A4, null, N.F5, N.E5, N.C5, null,
      N.D5, N.G5, N.B4, null, N.E5, N.D5, N.B4, null,
      N.E5, N.A5, N.C5, null, N.G5, N.E5, N.C5, null,
      N.G5, N.E5, N.C5, N.D5, N.E5, null, null, null,
    ],
    perc: true,
    tense: false,
    padCutoff: 960,
  },
};

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.seGain = null;
    this.bgmGain = null;
    this.compressor = null;

    this.enabled = true;        // SE on/off
    this.volume = 0.8;          // SE volume 0..1
    this.bgmEnabled = true;     // BGM on/off
    this.bgmVolume = 0.55;      // BGM volume 0..1
    this.droneEnabled = false;  // Ambient bunker drone

    this.droneNodes = null;
    this.currentTrack = null;
    this._bgmTimer = null;
    this._bgmStep = 0;
    this._unlocked = false;
    this._silentAudio = null;

    this._installGlobalUnlock();
  }

  _installGlobalUnlock() {
    if (typeof window === 'undefined') return;
    const handler = () => this.unlock();
    window.addEventListener('touchstart', handler, { capture: true, passive: true });
    window.addEventListener('touchend', handler, { capture: true, passive: true });
    window.addEventListener('pointerdown', handler, { capture: true, passive: true });
    window.addEventListener('click', handler, { capture: true, passive: true });
    window.addEventListener('keydown', handler, { capture: true, passive: true });
  }

  haptic(pattern = 10) {
    try {
      if (navigator && typeof navigator.vibrate === 'function') {
        navigator.vibrate(pattern);
      }
    } catch {
      // ignore unsupported devices
    }
  }

  unlock() {
    try {
      if (navigator.audioSession && navigator.audioSession.type !== 'playback') {
        navigator.audioSession.type = 'playback';
      }
    } catch {
      // ignore
    }

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
      ctx.resume().then(() => {
        if (this.bgmEnabled && this.currentTrack && !this._bgmTimer) {
          this._startBgmLoop();
        }
      }).catch(() => {});
    }

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

    if (this.bgmEnabled && this.currentTrack && !this._bgmTimer) {
      this._startBgmLoop();
    }
    if (this.droneEnabled && this.enabled && !this.droneNodes) {
      this.startDrone();
    }
  }

  setEnabled(flag) {
    this.enabled = Boolean(flag);
    this._syncGains();
    if (!this.enabled) this.stopDrone();
    else if (this.droneEnabled) this.startDrone();
  }

  setVolume(vol) {
    const clamped = Math.max(0, Math.min(1, Number(vol)));
    this.volume = Number.isFinite(clamped) ? clamped : 0.8;
    this._syncGains();
  }

  setBgmEnabled(flag) {
    this.bgmEnabled = Boolean(flag);
    this._syncGains();
    if (this.bgmEnabled && this.currentTrack) {
      this._startBgmLoop();
    } else {
      this._stopBgmLoop();
    }
  }

  setBgmVolume(vol) {
    const clamped = Math.max(0, Math.min(1, Number(vol)));
    this.bgmVolume = Number.isFinite(clamped) ? clamped : 0.55;
    this._syncGains();
  }

  setDroneEnabled(flag) {
    this.droneEnabled = Boolean(flag);
    if (this.droneEnabled && this.enabled) this.startDrone();
    else this.stopDrone();
  }

  setBgmTrack(trackId) {
    if (!BGM_TRACK_INFO[trackId]) return;
    if (this.currentTrack === trackId && this._bgmTimer) return;
    this.currentTrack = trackId;
    this._bgmStep = 0;
    this._stopBgmLoop();
    if (this.bgmEnabled && this.ctx && this.ctx.state === 'running') {
      this._startBgmLoop();
    }
  }

  getCurrentTrackName() {
    if (!this.bgmEnabled) return '停止中 (OFF)';
    return BGM_TRACK_INFO[this.currentTrack]?.name || '待機中';
  }

  getStateSummary() {
    if (!this.ctx) return '未初期化（画面タップで有効化）';
    if (this.ctx.state === 'running') return '稼働中 (READY)';
    if (this.ctx.state === 'suspended') return '一時停止（テスト再生をタップ）';
    return this.ctx.state;
  }

  _syncGains() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.seGain) {
      const targetSe = this.enabled ? this.volume : 0;
      try { this.seGain.gain.setTargetAtTime(targetSe, now, 0.02); } catch { this.seGain.gain.value = targetSe; }
    }
    if (this.bgmGain) {
      const targetBgm = this.bgmEnabled ? this.bgmVolume * 0.65 : 0;
      try { this.bgmGain.gain.setTargetAtTime(targetBgm, now, 0.06); } catch { this.bgmGain.gain.value = targetBgm; }
    }
  }

  _ensureCtx(forceCreate = false) {
    if (!this.enabled && !this.bgmEnabled && !forceCreate) return null;
    const AudioCtx = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!this.ctx) {
      this.ctx = new AudioCtx();
      this.seGain = this.ctx.createGain();
      this.seGain.gain.value = this.enabled ? this.volume : 0;
      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = this.bgmEnabled ? this.bgmVolume * 0.65 : 0;

      if (typeof this.ctx.createDynamicsCompressor === 'function') {
        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.value = -14;
        this.compressor.knee.value = 20;
        this.compressor.ratio.value = 5;
        this.seGain.connect(this.compressor);
        this.bgmGain.connect(this.compressor);
        this.compressor.connect(this.ctx.destination);
      } else {
        this.seGain.connect(this.ctx.destination);
        this.bgmGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx.state === 'suspended' || this.ctx.state === 'interrupted') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // ===========================================================================
  // PROCEDURAL MULTI-TRACK BGM SEQUENCER
  // ===========================================================================
  _startBgmLoop() {
    if (this._bgmTimer || !this.bgmEnabled || !this.currentTrack) return;
    const track = BGM_TRACK_INFO[this.currentTrack];
    if (!track) return;

    const tick = () => {
      if (!this.bgmEnabled || !this.ctx || this.ctx.state !== 'running') return;
      const t = BGM_TRACK_INFO[this.currentTrack];
      if (!t) return;
      this._playBgmStep(t, this._bgmStep);
      this._bgmStep = (this._bgmStep + 1) % 32;
    };

    tick();
    this._bgmTimer = setInterval(tick, track.stepMs);
  }

  _stopBgmLoop() {
    if (this._bgmTimer) {
      clearInterval(this._bgmTimer);
      this._bgmTimer = null;
    }
  }

  _playBgmStep(track, step) {
    const ctx = this.ctx;
    const out = this.bgmGain;
    if (!ctx || !out || this.bgmVolume <= 0.005) return;

    const now = ctx.currentTime + 0.01;
    const stepSec = track.stepMs / 1000;
    const barIdx = Math.floor(step / 8) % track.chords.length;
    const beatInBar = step % 8;

    // 1. Warm Analog Synth Pad on start of each 8-step bar
    if (beatInBar === 0) {
      const chord = track.chords[barIdx];
      const padDur = stepSec * 8.4;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(track.padCutoff * 0.7, now);
      filter.frequency.linearRampToValueAtTime(track.padCutoff, now + padDur * 0.45);
      filter.frequency.linearRampToValueAtTime(track.padCutoff * 0.65, now + padDur);
      filter.connect(out);

      chord.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = idx % 2 === 0 ? 'triangle' : 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);
        osc.detune.setValueAtTime(idx % 2 === 0 ? -4 : 4, now);
        const peak = idx % 2 === 0 ? 0.055 : 0.028;
        g.gain.setValueAtTime(0.0005, now);
        g.gain.linearRampToValueAtTime(peak, now + 0.45);
        g.gain.setValueAtTime(peak * 0.85, now + padDur - 0.55);
        g.gain.exponentialRampToValueAtTime(0.0005, now + padDur);
        osc.connect(g);
        g.connect(filter);
        osc.start(now);
        osc.stop(now + padDur + 0.05);
      });
    }

    // 2. Deep Sub-Bass pulse (beats 0 and 4, or pulsing in crisis track)
    const playBass = track.tense ? beatInBar % 2 === 0 : beatInBar === 0 || beatInBar === 4;
    if (playBass) {
      const freq = track.bass[barIdx];
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      filter.type = 'lowpass';
      filter.frequency.value = 220;
      const dur = track.tense ? stepSec * 1.4 : stepSec * 3.2;
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(beatInBar === 0 ? 0.14 : 0.09, now + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0008, now + dur);
      osc.connect(filter);
      filter.connect(g);
      g.connect(out);
      osc.start(now);
      osc.stop(now + dur + 0.03);
    }

    // 3. Crystalline Synth Bell / Rhodes Arpeggio
    const arpFreq = track.arp[step % track.arp.length];
    if (arpFreq) {
      const osc = ctx.createOscillator();
      const overtone = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(arpFreq, now);
      overtone.type = 'triangle';
      overtone.frequency.setValueAtTime(arpFreq * 2, now);

      const og = ctx.createGain();
      og.gain.value = 0.18;
      overtone.connect(og);
      og.connect(g);
      osc.connect(g);

      const dur = stepSec * 2.2;
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(0.075, now + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0008, now + dur);
      g.connect(out);

      osc.start(now);
      overtone.start(now);
      osc.stop(now + dur + 0.03);
      overtone.stop(now + dur + 0.03);
    }

    // 4. Subtle Mechanical Relay Tick Percussion (gives tactile puzzle rhythm!)
    if (track.perc && (beatInBar % 2 === 1 || (track.tense && beatInBar === 0))) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(track.tense && beatInBar === 0 ? 140 : 1200, now);
      osc.frequency.exponentialRampToValueAtTime(track.tense && beatInBar === 0 ? 55 : 420, now + 0.028);
      g.gain.setValueAtTime(track.tense && beatInBar === 0 ? 0.05 : 0.015, now);
      g.gain.exponentialRampToValueAtTime(0.0005, now + 0.032);
      osc.connect(g);
      g.connect(out);
      osc.start(now);
      osc.stop(now + 0.038);
    }
  }

  // ===========================================================================
  // SOUND EFFECTS (SE)
  // ===========================================================================
  _withSe(fn) {
    if (!this.enabled || this.volume <= 0.001) return;
    const ctx = this._ensureCtx();
    if (!ctx || !this.seGain) return;
    if (ctx.state === 'running') {
      fn(ctx, this.seGain);
    } else {
      ctx
        .resume()
        .then(() => {
          if (ctx.state === 'running' && this.enabled) {
            fn(ctx, this.seGain);
          }
        })
        .catch(() => {});
    }
  }

  startDrone() {
    this._withSe((ctx, out) => {
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
        filter.frequency.value = 175;
        gain.gain.value = 0.07;

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

  playSwitch(on = true) {
    this.haptic(8);
    this._withSe((ctx, out) => {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(on ? 540 : 350, now);
      osc.frequency.exponentialRampToValueAtTime(on ? 920 : 190, now + 0.05);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
      osc.connect(gain);
      gain.connect(out);
      osc.start(now);
      osc.stop(now + 0.07);
    });
  }

  playChipPlace() {
    this.haptic(14);
    this._withSe((ctx, out) => {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(105, now + 0.085);
      gain.gain.setValueAtTime(0.32, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);
      osc.connect(gain);
      gain.connect(out);
      osc.start(now);
      osc.stop(now + 0.1);
    });
  }

  playWireConnect() {
    this.haptic(10);
    this._withSe((ctx, out) => {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(680, now);
      osc.frequency.exponentialRampToValueAtTime(1260, now + 0.065);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain);
      gain.connect(out);
      osc.start(now);
      osc.stop(now + 0.085);
    });
  }

  playDelete() {
    this.haptic(8);
    this._withSe((ctx, out) => {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.08);
      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc.connect(gain);
      gain.connect(out);
      osc.start(now);
      osc.stop(now + 0.1);
    });
  }

  playClockPulse() {
    this.haptic(12);
    this._withSe((ctx, out) => {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(170, now);
      osc.frequency.exponentialRampToValueAtTime(460, now + 0.055);
      osc.frequency.exponentialRampToValueAtTime(130, now + 0.13);
      gain.gain.setValueAtTime(0.26, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.145);
      osc.connect(gain);
      gain.connect(out);
      osc.start(now);
      osc.stop(now + 0.15);
    });
  }

  playTestStep(stepIdx, ok) {
    this.haptic(ok ? 8 : [20, 30, 20]);
    this._withSe((ctx, out) => {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (ok) {
        const pentatonic = [330, 392, 440, 523.25, 587.33, 659.25, 783.99, 880];
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(pentatonic[stepIdx % pentatonic.length], now);
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(155, now);
        osc.frequency.linearRampToValueAtTime(110, now + 0.2);
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      }
      osc.connect(gain);
      gain.connect(out);
      osc.start(now);
      osc.stop(now + 0.25);
    });
  }

  playVictory() {
    this.haptic([18, 45, 22, 45, 40]);
    this._withSe((ctx, out) => {
      const now = ctx.currentTime;
      const notes = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99];
      notes.forEach((freq, i) => {
        const t = now + i * 0.08;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = i >= notes.length - 2 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.22, t + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.72);
        osc.connect(gain);
        gain.connect(out);
        osc.start(t);
        osc.stop(t + 0.76);
      });
    });
  }

  playBlip(pitch = 480) {
    this._withSe((ctx, out) => {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(pitch, now);
      gain.gain.setValueAtTime(0.075, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.028);
      osc.connect(gain);
      gain.connect(out);
      osc.start(now);
      osc.stop(now + 0.033);
    });
  }

  playAlarm() {
    this.haptic([30, 50, 30]);
    this._withSe((ctx, out) => {
      const now = ctx.currentTime;
      [0, 0.28].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, now + offset);
        osc.frequency.linearRampToValueAtTime(250, now + offset + 0.22);
        gain.gain.setValueAtTime(0.2, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.26);
        osc.connect(gain);
        gain.connect(out);
        osc.start(now + offset);
        osc.stop(now + offset + 0.27);
      });
    });
  }

  playPowerUp() {
    this.haptic([15, 30, 25]);
    this._withSe((ctx, out) => {
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
        gain.gain.linearRampToValueAtTime(0.15, now + 0.22);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.95);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(out);
        osc.start(now);
        osc.stop(now + 1.0);
      });
    });
  }

  playSoundTest() {
    this.unlock();
    this._withSe((ctx, out) => {
      const now = ctx.currentTime;
      [440, 554.37, 659.25, 880].forEach((freq, i) => {
        const t = now + i * 0.08;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.24, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
        osc.connect(gain);
        gain.connect(out);
        osc.start(t);
        osc.stop(t + 0.3);
      });
    });
  }
}

export const sound = new SoundEngine();
