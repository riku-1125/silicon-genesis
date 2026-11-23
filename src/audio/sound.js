/**
 * SILICON GENESIS — Mobile-Hardened Web Audio Synth & Multi-Track Ambient BGM Engine
 *
 * Features:
 *   - 5 long-form atmospheric procedural BGM tracks tailored to every emotional scene:
 *       * 'title'     — 地下400メートルの残響 (Echoes of Ark-7) [64 steps × 2 cycles]
 *       * 'story'     — 地下の灯火 (Shelter Hearth)              [64 steps × 2 cycles]
 *       * 'crisis'    — 42年目の沈黙 (Blackout Protocol)         [64 steps × 2 cycles]
 *       * 'workbench' — 深層の思索 (Deep Silicon Drift)          [96 steps × 2 cycles ≈ 80s!]
 *       * 'finale'    — 夜明けのビーコン (Dawn Over Ash)         [64 steps × 2 cycles]
 *   - Built-in warm low-pass ambient echo bus (DelayNode + Filter) for spacious,
 *     zero-fatigue listening during long puzzle-thinking sessions
 *   - Zero harsh square-wave percussion ticking
 *   - Independent BGM & SE volume controls + toggles + smooth track transitions
 *   - iOS Safari / Android Chrome gesture unlock + iOS 17+ audioSession='ambient'
 *     (coexists cleanly with Spotify / Apple Music / YouTube Music without interrupting!)
 *   - Automatic visibilitychange / pagehide / freeze / mobile-blur suspension so audio
 *     NEVER plays in background tabs or cached PWAs
 *   - Soft DynamicsCompressor anti-clipping + optional subtle haptic feedback
 */

// Musical note frequencies (Hz)
const N = {
  G1: 49.0, A1: 55.0, Bb1: 58.27, B1: 61.74,
  C2: 65.41, D2: 73.42, Eb2: 77.78, E2: 82.41, F2: 87.31, G2: 98.0, A2: 110.0, Bb2: 116.54, B2: 123.47,
  C3: 130.81, D3: 146.83, Eb3: 155.56, E3: 164.81, F3: 174.61, G3: 196.0, A3: 220.0, Bb3: 233.08, B3: 246.94,
  C4: 261.63, D4: 293.66, Eb4: 311.13, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, Bb4: 466.16, B4: 493.88,
  C5: 523.25, D5: 587.33, Eb5: 622.25, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.0,
};

export const BGM_TRACK_INFO = {
  // 1. Title & Historical Prologue — solemn, spacious subterranean echo (~49s full A/B cycle)
  title: {
    name: '地下400メートルの残響 (Echoes of Ark-7)',
    stepMs: 380,
    style: 'ambient',
    padCutoff: 560,
    echoSend: 0.42,
    chords: [
      [N.D3, N.A3, N.E4, N.F4],       // Dm9
      [N.Bb2, N.F3, N.A3, N.D4],      // Bbmaj7
      [N.C3, N.G3, N.D4, N.E4],       // C6/9
      [N.A2, N.E3, N.A3, N.C4],       // Am
      [N.G2, N.D3, N.A3, N.Bb3],      // Gm9
      [N.F2, N.C3, N.A3, N.E4],       // Fmaj7
      [N.G2, N.D3, N.G3, N.Bb3],      // Gm
      [N.A2, N.E3, N.A3, N.D4],       // Asus4
    ],
    bass: [N.D2, N.Bb1, N.C2, N.A1, N.G1, N.F2, N.G1, N.A1],
    arpA: [
      N.A4, null, null, N.F4, null, N.E4, null, null,
      N.D5, null, null, N.A4, null, null, N.F4, null,
      N.E4, null, null, N.G4, null, N.C5, null, null,
      N.E4, null, null, N.C4, null, null, null, null,
      N.D4, null, null, N.A4, null, N.Bb4, null, null,
      N.A4, null, null, N.E4, null, null, N.C4, null,
      N.D4, null, null, N.G4, null, N.F4, null, null,
      N.E4, null, null, null, N.A3, null, null, null,
    ],
    arpB: [
      N.E5, null, null, N.A4, null, N.F4, null, null,
      N.F5, null, null, N.D5, null, null, N.A4, null,
      N.G4, null, null, N.E5, null, N.D5, null, null,
      N.C5, null, null, N.A4, null, null, null, null,
      N.Bb4, null, null, N.A4, null, N.G4, null, null,
      N.A4, null, null, N.C5, null, null, N.E4, null,
      N.F4, null, null, N.D4, null, N.Bb3, null, null,
      N.E4, null, null, null, null, null, null, null,
    ],
  },

  // 2. Human Daily Life, Story Theater & Post-Clear Relief — warm Rhodes ballad (~52s full A/B cycle)
  story: {
    name: '地下の灯火 (Shelter Hearth)',
    stepMs: 410,
    style: 'warm',
    padCutoff: 640,
    echoSend: 0.36,
    chords: [
      [N.F3, N.A3, N.C4, N.G4],       // Fmaj9
      [N.C3, N.G3, N.B3, N.E4],       // Cmaj7
      [N.D3, N.A3, N.C4, N.E4],       // Dm9
      [N.A2, N.E3, N.G3, N.C4],       // Am7
      [N.Bb2, N.F3, N.A3, N.D4],      // Bbmaj7
      [N.A2, N.F3, N.C4, N.E4],       // Fmaj7/A
      [N.G2, N.D3, N.F3, N.Bb3],      // Gm7
      [N.C3, N.G3, N.Bb3, N.D4],      // C9sus4
    ],
    bass: [N.F2, N.C2, N.D2, N.A1, N.Bb1, N.A1, N.G1, N.C2],
    arpA: [
      N.C5, null, null, N.A4, null, N.G4, null, null,
      N.E4, null, null, N.G4, null, null, N.B4, null,
      N.A4, null, null, N.F4, null, N.E4, null, null,
      N.C4, null, null, N.E4, null, null, null, null,
      N.D5, null, null, N.A4, null, N.F4, null, null,
      N.C5, null, null, N.A4, null, null, N.E4, null,
      N.G4, null, null, N.Bb4, null, N.A4, null, null,
      N.G4, null, null, null, N.E4, null, null, null,
    ],
    arpB: [
      N.A4, null, null, N.C5, null, N.E5, null, null,
      N.D5, null, null, N.C5, null, null, N.G4, null,
      N.F4, null, null, N.A4, null, N.C5, null, null,
      N.G4, null, null, N.E4, null, null, null, null,
      N.F4, null, null, N.A4, null, N.D5, null, null,
      N.E5, null, null, N.C5, null, null, N.A4, null,
      N.Bb4, null, null, N.A4, null, N.G4, null, null,
      N.F4, null, null, N.G4, null, null, null, null,
    ],
  },

  // 3. Emergency / Blackout / Urgent Crisis Scenes — cinematic deep sub-pulse & sonar, ZERO harsh clicks (~40s)
  crisis: {
    name: '42年目の沈黙 (Blackout Protocol)',
    stepMs: 310,
    style: 'crisis',
    padCutoff: 440,
    echoSend: 0.45,
    chords: [
      [N.D3, N.F3, N.A3],             // Dm
      [N.Eb3, N.G3, N.Bb3],           // Eb
      [N.D3, N.F3, N.A3],             // Dm
      [N.C3, N.Eb3, N.G3],            // Cm
      [N.Bb2, N.D3, N.F3],            // Bb
      [N.A2, N.E3, N.A3],             // A5
      [N.G2, N.D3, N.Bb3],            // Gm
      [N.A2, N.E3, N.G3],             // A7(no3)
    ],
    bass: [N.D2, N.Eb2, N.D2, N.C2, N.Bb1, N.A1, N.G1, N.A1],
    arpA: [
      N.A4, null, null, null, N.F4, null, null, null,
      N.Bb4, null, null, null, N.G4, null, null, null,
      N.A4, null, null, N.E4, null, null, null, null,
      N.G4, null, null, null, N.Eb4, null, null, null,
      N.F4, null, null, null, N.D4, null, null, null,
      N.E4, null, null, null, null, null, N.A3, null,
      N.Bb4, null, null, null, N.G4, null, null, null,
      N.A4, null, null, null, null, null, null, null,
    ],
    arpB: [
      N.D5, null, null, null, N.A4, null, null, null,
      N.G4, null, null, null, N.Eb4, null, null, null,
      N.F4, null, null, N.A4, null, null, null, null,
      N.Eb4, null, null, null, N.C4, null, null, null,
      N.D4, null, null, null, N.F4, null, null, null,
      N.E4, null, null, null, N.A4, null, null, null,
      N.G4, null, null, null, N.D4, null, null, null,
      N.E4, null, null, null, null, null, null, null,
    ],
  },

  // 4. Circuit Workbench & Physics Lab — ultra-calm, spacious, meditative 12-bar ambient (~80.6s A/B cycle!)
  //    Replaces the old short repetitive "Silicon Pulse". Zero harsh ticking, generous rests, cozy deep focus.
  workbench: {
    name: '深層の思索 (Deep Silicon Drift)',
    stepMs: 420,
    style: 'drift',
    padCutoff: 500,
    echoSend: 0.46,
    chords: [
      [N.A2, N.E3, N.B3, N.C4],       // Am9
      [N.F2, N.C3, N.G3, N.A3],       // Fmaj9
      [N.C3, N.G3, N.B3, N.E4],       // Cmaj7
      [N.E2, N.B2, N.G3, N.D4],       // Em7
      [N.D3, N.A3, N.C4, N.E4],       // Dm9
      [N.A2, N.E3, N.G3, N.C4],       // Am7
      [N.F2, N.C3, N.A3, N.E4],       // Fmaj7
      [N.G2, N.D3, N.B3, N.E4],       // G6
      [N.E2, N.B2, N.F3 + 10.39, N.G3], // Em9 (F#3 ≈ 185.0Hz)
      [N.F2, N.C3, N.G3, N.A3],       // Fmaj9
      [N.D3, N.A3, N.C4, N.F4],       // Dm7
      [N.E2, N.B2, N.A3, N.D4],       // E7sus4
    ],
    bass: [N.A1, N.F2, N.C2, N.E2, N.D2, N.A1, N.F2, N.G2, N.E2, N.F2, N.D2, N.E2],
    // Sparse, meditative electric-piano/kalimba droplets with lots of quiet space to think
    arpA: [
      N.E4, null, null, null, null, N.B4, null, null,
      N.A4, null, null, null, N.G4, null, null, null,
      null, null, N.E5, null, null, null, N.B4, null,
      N.G4, null, null, null, null, null, null, null,
      N.F4, null, null, N.A4, null, null, N.E4, null,
      null, null, N.C5, null, null, null, N.G4, null,
      N.A4, null, null, null, null, N.E4, null, null,
      N.D4, null, null, null, null, null, null, null,
      N.B4, null, null, null, N.G4, null, null, null,
      N.A4, null, null, null, null, N.E4, null, null,
      N.F4, null, null, N.C5, null, null, N.A4, null,
      N.B4, null, null, null, null, null, null, null,
    ],
    arpB: [
      null, null, N.C5, null, null, N.E4, null, null,
      N.G4, null, null, null, null, null, N.A4, null,
      N.B4, null, null, N.G4, null, null, null, null,
      N.E4, null, null, null, N.D4, null, null, null,
      null, null, N.E4, null, null, N.A4, null, null,
      N.C5, null, null, null, N.B4, null, null, null,
      null, null, N.A4, null, null, N.G4, null, null,
      N.E4, null, null, null, null, null, null, null,
      N.G4, null, null, null, null, N.B4, null, null,
      N.C5, null, null, null, N.A4, null, null, null,
      null, null, N.F4, null, null, N.E4, null, null,
      N.D4, null, null, null, null, null, null, null,
    ],
  },

  // 5. ACT V Finale & Civilization Reboot — radiant, uplifting, hopeful (~44s full A/B cycle)
  finale: {
    name: '夜明けのビーコン (Dawn Over Ash)',
    stepMs: 340,
    style: 'finale',
    padCutoff: 840,
    echoSend: 0.4,
    chords: [
      [N.F3, N.A3, N.C4, N.G4],       // Fmaj9
      [N.G3, N.B3, N.D4, N.E4],       // G6
      [N.A3, N.C4, N.E4, N.B4],       // Am9
      [N.C3, N.G3, N.C4, N.E4],       // C
      [N.D3, N.A3, N.C4, N.F4],       // Dm7
      [N.E3, N.B3, N.D4, N.G4],       // Em7
      [N.F3, N.A3, N.C4, N.E4],       // Fmaj7
      [N.G3, N.C4, N.D4, N.A4],       // G9sus4
    ],
    bass: [N.F2, N.G2, N.A2, N.C2, N.D2, N.E2, N.F2, N.G2],
    arpA: [
      N.C5, null, N.E5, null, N.A4, null, N.G4, null,
      N.B4, null, N.D5, null, N.G5, null, N.E5, null,
      N.E5, null, N.C5, null, N.B4, null, N.A4, null,
      N.G4, null, N.C5, null, N.E5, null, null, null,
      N.F5, null, N.C5, null, N.A4, null, N.D5, null,
      N.E5, null, N.B4, null, N.G4, null, N.D5, null,
      N.C5, null, N.E5, null, N.G5, null, N.E5, null,
      N.D5, null, N.C5, null, N.D5, null, null, null,
    ],
    arpB: [
      N.A4, null, N.C5, null, N.E5, null, N.G5, null,
      N.D5, null, N.G5, null, N.E5, null, N.B4, null,
      N.C5, null, N.E5, null, N.A5, null, N.G5, null,
      N.E5, null, N.D5, null, N.C5, null, null, null,
      N.A4, null, N.D5, null, N.F5, null, N.E5, null,
      N.G5, null, N.E5, null, N.D5, null, N.B4, null,
      N.A4, null, N.C5, null, N.E5, null, N.C5, null,
      N.G4, null, N.A4, null, N.B4, null, null, null,
    ],
  },
};

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.seGain = null;
    this.bgmGain = null;
    this.bgmEchoIn = null;
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
    this._bgmCycle = 0;
    this._unlocked = false;
    this._pageHidden = typeof document !== 'undefined' ? Boolean(document.hidden) : false;
    this._bgSuspended = false;

    this._installGlobalUnlock();
    this._installLifecycleHandlers();
  }

  _hasAnyAudioEnabled() {
    return Boolean(this.bgmEnabled || this.enabled);
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

  _installLifecycleHandlers() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const isMobileCoarse = () => {
      try {
        return Boolean(
          window.matchMedia?.('(pointer: coarse)').matches ||
            /iPhone|iPad|iPod|Android/i.test(navigator.userAgent || '')
        );
      } catch {
        return false;
      }
    };

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.suspendForBackground();
      } else {
        this.resumeFromForeground();
      }
    });

    window.addEventListener('pagehide', () => {
      this.suspendForBackground();
    });

    window.addEventListener('pageshow', () => {
      if (!document.hidden) {
        this.resumeFromForeground();
      }
    });

    document.addEventListener('freeze', () => {
      this.suspendForBackground();
    });

    window.addEventListener('blur', () => {
      if (document.hidden || isMobileCoarse()) {
        this.suspendForBackground();
      }
    });

    window.addEventListener('focus', () => {
      if (!document.hidden) {
        this.resumeFromForeground();
      }
    });
  }

  suspendForBackground() {
    this._pageHidden = true;
    this._bgSuspended = true;
    this._stopBgmLoop();
    this.stopDrone();

    if (this.ctx) {
      const now = this.ctx.currentTime;
      try {
        if (this.bgmGain) {
          this.bgmGain.gain.cancelScheduledValues(now);
          this.bgmGain.gain.setValueAtTime(0, now);
        }
        if (this.seGain) {
          this.seGain.gain.cancelScheduledValues(now);
          this.seGain.gain.setValueAtTime(0, now);
        }
      } catch {
        // ignore
      }
      if (this.ctx.state === 'running') {
        this.ctx.suspend().catch(() => {});
      }
    }
  }

  resumeFromForeground() {
    this._pageHidden = false;
    if (!this._bgSuspended) return;
    this._bgSuspended = false;

    if (!this._hasAnyAudioEnabled()) return;
    if (!this.ctx) return;

    this._syncGains();
    if (this.ctx.state === 'suspended' || this.ctx.state === 'interrupted') {
      this.ctx
        .resume()
        .then(() => {
          if (this._pageHidden || !this._hasAnyAudioEnabled()) return;
          this._syncGains();
          if (this.bgmEnabled && this.currentTrack && !this._bgmTimer) {
            this._startBgmLoop();
          }
          if (this.droneEnabled && this.enabled && !this.droneNodes) {
            this.startDrone();
          }
        })
        .catch(() => {});
    } else if (this.ctx.state === 'running') {
      if (this.bgmEnabled && this.currentTrack && !this._bgmTimer) {
        this._startBgmLoop();
      }
      if (this.droneEnabled && this.enabled && !this.droneNodes) {
        this.startDrone();
      }
    }
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
    // Never wake audio hardware while backgrounded or when both BGM and SE are muted
    if (this._pageHidden || (typeof document !== 'undefined' && document.hidden)) return;
    if (!this._hasAnyAudioEnabled()) return;

    // Use 'ambient' on iOS 17+ so Spotify / Apple Music / YouTube Music keep playing uninterrupted!
    try {
      if (navigator.audioSession && navigator.audioSession.type !== 'ambient') {
        navigator.audioSession.type = 'ambient';
      }
    } catch {
      // ignore
    }

    const ctx = this._ensureCtx(false);
    if (!ctx) return;

    if (ctx.state === 'suspended' || ctx.state === 'interrupted') {
      ctx
        .resume()
        .then(() => {
          if (this._pageHidden || !this._hasAnyAudioEnabled()) return;
          this._syncGains();
          if (this.bgmEnabled && this.currentTrack && !this._bgmTimer) {
            this._startBgmLoop();
          }
          if (this.droneEnabled && this.enabled && !this.droneNodes) {
            this.startDrone();
          }
        })
        .catch(() => {});
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

    if (ctx.state === 'running') {
      if (this.bgmEnabled && this.currentTrack && !this._bgmTimer) {
        this._startBgmLoop();
      }
      if (this.droneEnabled && this.enabled && !this.droneNodes) {
        this.startDrone();
      }
    }
  }

  _suspendIfAllMuted() {
    if (this._hasAnyAudioEnabled()) return;
    this._stopBgmLoop();
    this.stopDrone();
    if (this.ctx && this.ctx.state === 'running') {
      const now = this.ctx.currentTime;
      try {
        if (this.bgmGain) this.bgmGain.gain.setValueAtTime(0, now);
        if (this.seGain) this.seGain.gain.setValueAtTime(0, now);
      } catch {
        // ignore
      }
      this.ctx.suspend().catch(() => {});
    }
  }

  getAudioMode() {
    if (this.bgmEnabled && this.enabled) return 'all';
    if (!this.bgmEnabled && this.enabled) return 'se_only';
    if (this.bgmEnabled && !this.enabled) return 'bgm_only';
    return 'muted';
  }

  setEnabled(flag) {
    this.enabled = Boolean(flag);
    this._syncGains();
    if (!this.enabled) {
      this.stopDrone();
      this._suspendIfAllMuted();
    } else {
      if (!this._pageHidden) this.unlock();
      if (this.droneEnabled && !this._pageHidden) this.startDrone();
    }
  }

  setVolume(vol) {
    const clamped = Math.max(0, Math.min(1, Number(vol)));
    this.volume = Number.isFinite(clamped) ? clamped : 0.8;
    this._syncGains();
  }

  setBgmEnabled(flag) {
    this.bgmEnabled = Boolean(flag);
    this._syncGains();
    if (this.bgmEnabled) {
      if (!this._pageHidden) {
        this.unlock();
        if (this.currentTrack && this.ctx && this.ctx.state === 'running') {
          this._startBgmLoop();
        }
      }
    } else {
      this._stopBgmLoop();
      this._suspendIfAllMuted();
    }
  }

  setBgmVolume(vol) {
    const clamped = Math.max(0, Math.min(1, Number(vol)));
    this.bgmVolume = Number.isFinite(clamped) ? clamped : 0.55;
    this._syncGains();
  }

  setDroneEnabled(flag) {
    this.droneEnabled = Boolean(flag);
    if (this.droneEnabled && this.enabled && !this._pageHidden) this.startDrone();
    else this.stopDrone();
  }

  setBgmTrack(trackId) {
    if (!BGM_TRACK_INFO[trackId]) return;
    if (this.currentTrack === trackId && this._bgmTimer) return;
    const switched = Boolean(this.currentTrack && this.currentTrack !== trackId);
    this.currentTrack = trackId;
    this._bgmStep = 0;
    this._bgmCycle = 0;
    this._stopBgmLoop();

    // Gentle breath fade on track transitions so scene switches feel seamless
    if (switched && this.ctx && this.bgmGain && this.bgmEnabled && !this._pageHidden) {
      const now = this.ctx.currentTime;
      const target = this.bgmVolume * 0.65;
      try {
        this.bgmGain.gain.cancelScheduledValues(now);
        this.bgmGain.gain.setTargetAtTime(target * 0.25, now, 0.08);
        this.bgmGain.gain.setTargetAtTime(target, now + 0.16, 0.22);
      } catch {
        // ignore
      }
    }

    if (this.bgmEnabled && !this._pageHidden && this.ctx && this.ctx.state === 'running') {
      this._startBgmLoop();
    }
  }

  getCurrentTrackName() {
    if (!this.bgmEnabled) return '停止中 (OFF)';
    return BGM_TRACK_INFO[this.currentTrack]?.name || '待機中';
  }

  getStateSummary() {
    if (!this._hasAnyAudioEnabled()) return 'ミュート中（他アプリ音楽と完全共存）';
    if (!this.ctx) return '未初期化（画面タップで有効化）';
    if (this.ctx.state === 'running') return '稼働中 (他アプリ音楽と同時再生対応)';
    if (this.ctx.state === 'suspended') return '一時停止（テスト再生をタップ）';
    return this.ctx.state;
  }

  _syncGains() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.seGain) {
      const targetSe = this.enabled && !this._pageHidden ? this.volume : 0;
      try { this.seGain.gain.setTargetAtTime(targetSe, now, 0.02); } catch { this.seGain.gain.value = targetSe; }
    }
    if (this.bgmGain) {
      const targetBgm = this.bgmEnabled && !this._pageHidden ? this.bgmVolume * 0.65 : 0;
      try { this.bgmGain.gain.setTargetAtTime(targetBgm, now, 0.08); } catch { this.bgmGain.gain.value = targetBgm; }
    }
  }

  _ensureCtx(forceCreate = false) {
    if (this._pageHidden) return null;
    if (!this._hasAnyAudioEnabled() && !forceCreate) return null;
    const AudioCtx = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!this.ctx) {
      this.ctx = new AudioCtx();
      this.ctx.onstatechange = () => {
        if (!this.ctx) return;
        if (this.ctx.state !== 'running') {
          this._stopBgmLoop();
        }
      };
      this.seGain = this.ctx.createGain();
      this.seGain.gain.value = this.enabled ? this.volume : 0;
      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = this.bgmEnabled ? this.bgmVolume * 0.65 : 0;

      // Warm low-pass ambient delay bus for dreamy, spacious BGM notes
      try {
        const echoIn = this.ctx.createGain();
        echoIn.gain.value = 1.0;
        const delay = this.ctx.createDelay(1.0);
        delay.delayTime.value = 0.36;
        const echoFilter = this.ctx.createBiquadFilter();
        echoFilter.type = 'lowpass';
        echoFilter.frequency.value = 950;
        const feedback = this.ctx.createGain();
        feedback.gain.value = 0.28;
        const wetOut = this.ctx.createGain();
        wetOut.gain.value = 0.34;

        echoIn.connect(delay);
        delay.connect(echoFilter);
        echoFilter.connect(feedback);
        feedback.connect(delay);
        echoFilter.connect(wetOut);
        wetOut.connect(this.bgmGain);
        this.bgmEchoIn = echoIn;
      } catch {
        this.bgmEchoIn = null;
      }

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
  // PROCEDURAL LONG-FORM AMBIENT BGM SEQUENCER
  // ===========================================================================
  _startBgmLoop() {
    if (this._bgmTimer || !this.bgmEnabled || !this.currentTrack || this._pageHidden) return;
    const track = BGM_TRACK_INFO[this.currentTrack];
    if (!track) return;

    const tick = () => {
      if (this._pageHidden || (typeof document !== 'undefined' && document.hidden)) {
        this.suspendForBackground();
        return;
      }
      if (!this.bgmEnabled || !this.ctx || this.ctx.state !== 'running') return;
      const t = BGM_TRACK_INFO[this.currentTrack];
      if (!t) return;
      const totalSteps = t.chords.length * 8;
      this._playBgmStep(t, this._bgmStep, this._bgmCycle);
      this._bgmStep++;
      if (this._bgmStep >= totalSteps) {
        this._bgmStep = 0;
        this._bgmCycle++;
      }
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

  _playBgmStep(track, step, cycle) {
    const ctx = this.ctx;
    const out = this.bgmGain;
    if (!ctx || !out || this.bgmVolume <= 0.005) return;

    const now = ctx.currentTime + 0.012;
    const stepSec = track.stepMs / 1000;
    const barIdx = Math.floor(step / 8) % track.chords.length;
    const beatInBar = step % 8;
    const isDrift = track.style === 'drift';
    const isCrisis = track.style === 'crisis';
    const isFinale = track.style === 'finale';

    // 1. Slow-Breathing Warm Pad on start of each 8-step bar
    if (beatInBar === 0) {
      const chord = track.chords[barIdx];
      const padDur = stepSec * 8.6;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.value = 0.7;
      filter.frequency.setValueAtTime(track.padCutoff * 0.62, now);
      filter.frequency.linearRampToValueAtTime(track.padCutoff, now + padDur * 0.48);
      filter.frequency.linearRampToValueAtTime(track.padCutoff * 0.58, now + padDur);
      filter.connect(out);

      chord.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        // Drift & warm tracks use pure silky sine/triangle — zero buzzy sawtooth fatigue!
        osc.type = isDrift || track.style === 'warm'
          ? (idx % 2 === 0 ? 'sine' : 'triangle')
          : (idx === 1 ? 'sawtooth' : 'triangle');
        osc.frequency.setValueAtTime(freq, now);
        osc.detune.setValueAtTime(idx % 2 === 0 ? -3.5 : 3.5, now);

        const peak = osc.type === 'sawtooth' ? 0.02 : isDrift ? 0.048 : 0.045;
        g.gain.setValueAtTime(0.0005, now);
        g.gain.linearRampToValueAtTime(peak, now + Math.min(0.9, padDur * 0.28));
        g.gain.setValueAtTime(peak * 0.82, now + padDur - 0.75);
        g.gain.exponentialRampToValueAtTime(0.0005, now + padDur);

        osc.connect(g);
        g.connect(filter);
        osc.start(now);
        osc.stop(now + padDur + 0.08);
      });
    }

    // 2. Velvety Sub-Bass Foundation
    const playBass = isCrisis
      ? beatInBar === 0 || beatInBar === 3 || beatInBar === 6
      : isDrift
        ? beatInBar === 0
        : beatInBar === 0 || beatInBar === 4;

    if (playBass) {
      const freq = track.bass[barIdx];
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const g = ctx.createGain();
      osc.type = isDrift ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      filter.type = 'lowpass';
      filter.frequency.value = isDrift ? 170 : 210;
      const dur = isCrisis ? stepSec * 1.9 : isDrift ? stepSec * 6.5 : stepSec * 3.6;
      const peak = beatInBar === 0 ? (isDrift ? 0.12 : 0.13) : 0.075;
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(peak, now + (isDrift ? 0.14 : 0.035));
      g.gain.exponentialRampToValueAtTime(0.0008, now + dur);

      osc.connect(filter);
      filter.connect(g);
      g.connect(out);
      osc.start(now);
      osc.stop(now + dur + 0.05);
    }

    // 3. Soft Rhodes / Glass-Marimba Melodic Droplets (alternates Phrase A / Phrase B every cycle!)
    const arpList = cycle % 2 === 1 && track.arpB ? track.arpB : track.arpA;
    const arpFreq = arpList[step % arpList.length];
    if (arpFreq) {
      // On calm drift track, softly breathe down occasional notes on later cycles for organic feel
      const skipOrganic = isDrift && cycle >= 2 && ((step * 7 + cycle * 13) % 11 === 0);
      if (!skipOrganic) {
        const osc = ctx.createOscillator();
        const overtone = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const g = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(arpFreq, now);
        overtone.type = 'sine';
        overtone.frequency.setValueAtTime(arpFreq * 2, now);

        const og = ctx.createGain();
        og.gain.value = isFinale ? 0.16 : isDrift ? 0.09 : 0.12;
        overtone.connect(og);
        og.connect(filter);
        osc.connect(filter);

        filter.type = 'lowpass';
        filter.frequency.value = isFinale ? 2200 : isDrift ? 1350 : 1650;

        const dur = isDrift ? stepSec * 3.4 : stepSec * 2.5;
        const peak = isDrift ? 0.058 : isCrisis ? 0.052 : 0.068;
        g.gain.setValueAtTime(0.0008, now);
        g.gain.linearRampToValueAtTime(peak, now + (isDrift ? 0.035 : 0.018));
        g.gain.exponentialRampToValueAtTime(0.0006, now + dur);

        filter.connect(g);
        g.connect(out);

        // Send a touch into the warm ambient echo bus!
        if (this.bgmEchoIn && track.echoSend > 0) {
          const send = ctx.createGain();
          send.gain.value = track.echoSend;
          g.connect(send);
          send.connect(this.bgmEchoIn);
        }

        osc.start(now);
        overtone.start(now);
        osc.stop(now + dur + 0.06);
        overtone.stop(now + dur + 0.06);
      }
    }

    // 4. Cinematic Deep Pulse (ONLY soft low-passed sine thump in crisis/finale — NEVER harsh square ticks!)
    if (isCrisis && (beatInBar === 0 || beatInBar === 4)) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(beatInBar === 0 ? 78 : 62, now);
      osc.frequency.exponentialRampToValueAtTime(34, now + 0.14);
      g.gain.setValueAtTime(beatInBar === 0 ? 0.11 : 0.065, now);
      g.gain.exponentialRampToValueAtTime(0.0008, now + 0.16);
      osc.connect(g);
      g.connect(out);
      osc.start(now);
      osc.stop(now + 0.18);
    } else if (isFinale && beatInBar === 0) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(92, now);
      osc.frequency.exponentialRampToValueAtTime(44, now + 0.12);
      g.gain.setValueAtTime(0.08, now);
      g.gain.exponentialRampToValueAtTime(0.0008, now + 0.14);
      osc.connect(g);
      g.connect(out);
      osc.start(now);
      osc.stop(now + 0.16);
    }
  }

  // ===========================================================================
  // SOUND EFFECTS (SE)
  // ===========================================================================
  _withSe(fn) {
    if (this._pageHidden || (typeof document !== 'undefined' && document.hidden)) return;
    if (!this.enabled || this.volume <= 0.001) return;
    const ctx = this._ensureCtx();
    if (!ctx || !this.seGain) return;
    if (ctx.state === 'running') {
      fn(ctx, this.seGain);
    } else {
      ctx
        .resume()
        .then(() => {
          if (ctx.state === 'running' && this.enabled && !this._pageHidden) {
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
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(on ? 520 : 340, now);
      osc.frequency.exponentialRampToValueAtTime(on ? 880 : 195, now + 0.05);
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
      osc.type = 'sine';
      osc.frequency.setValueAtTime(pitch, now);
      gain.gain.setValueAtTime(0.07, now);
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
