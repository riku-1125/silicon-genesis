/**
 * SILICON GENESIS — Transparent Atmospheric Lighting & Signal VFX Overlay
 *
 * Renders delicate, zero-obstruction cinematic light & radio effects directly
 * over the high-detail 32-bit pixel-art backgrounds (`scene_ending_ch1.jpg`,
 * `scene_surface_rover.jpg`, `scene_shelter_hub.jpg`, `scene_ending_bluesky.jpg`).
 *
 * Automatically mirrors the underlying `<img>`'s `object-fit: cover` transform
 * so point-anchored effects (like radio waves at the relay tower tip or golden
 * light bursting from the bunker vault door) align pixel-accurately across
 * portrait phones, landscape phones, tablets, and desktops!
 */

const SRC_W = 840;
const SRC_H = 469;

export class EndingSceneCanvas {
  constructor(canvasEl) {
    this.canvas = canvasEl;
    this.ctx = canvasEl ? canvasEl.getContext('2d') : null;
    this.mode = null; // null | 'fx_beacon' | 'fx_hub_awaken' | 'fx_hatch_light' | 'fx_bluesky_breeze'
    this.stagePhase = 0;
    this.time = 0;
    this._raf = null;
    this._lastTs = 0;

    // Deterministic floating light motes
    this._motes = [];
    let seed = 209407;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = 0; i < 28; i++) {
      this._motes.push({
        u: rand(),
        v: rand(),
        vx: 0.008 + rand() * 0.016,
        vy: -0.006 + rand() * 0.012,
        size: 1.2 + rand() * 1.8,
        phase: rand() * Math.PI * 2,
        warm: rand() > 0.35,
      });
    }
  }

  setScene(mode, { phase = 0 } = {}) {
    if (!this.canvas || !this.ctx) return;
    const changed = this.mode !== mode;
    this.mode = mode;
    this.stagePhase = phase;
    this.canvas.classList.toggle('hidden', !mode);
    if (mode) {
      if (changed) this.time = 0;
      this._syncSize();
      this._ensureLoop();
    } else {
      this.stop();
    }
  }

  stop() {
    if (this._raf) {
      cancelAnimationFrame(this._raf);
      this._raf = null;
    }
    this._lastTs = 0;
  }

  _syncSize() {
    if (!this.canvas) return;
    const cw = Math.max(1, Math.round(this.canvas.clientWidth || 480));
    const ch = Math.max(1, Math.round(this.canvas.clientHeight || 270));
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const tw = Math.round(cw * dpr);
    const th = Math.round(ch * dpr);
    if (this.canvas.width !== tw || this.canvas.height !== th) {
      this.canvas.width = tw;
      this.canvas.height = th;
    }
    this._cssW = cw;
    this._cssH = ch;
    this._dpr = dpr;
  }

  /**
   * Maps normalized source-image coordinates `(u, v)` in `840x469` to CSS pixels
   * matching `object-fit: cover; object-position: 50% 50%`.
   */
  _mapSrcPoint(u, v) {
    const cw = this._cssW || 480;
    const ch = this._cssH || 270;
    const scale = Math.max(cw / SRC_W, ch / SRC_H);
    const drawW = SRC_W * scale;
    const drawH = SRC_H * scale;
    const ox = (cw - drawW) * 0.5;
    const oy = (ch - drawH) * 0.5;
    return {
      x: ox + u * drawW,
      y: oy + v * drawH,
      scale,
    };
  }

  _ensureLoop() {
    if (this._raf) return;
    const tick = (ts) => {
      if (!this.mode) {
        this._raf = null;
        return;
      }
      if (!this._lastTs) this._lastTs = ts;
      const dt = Math.min(0.05, (ts - this._lastTs) / 1000);
      this._lastTs = ts;
      this.time += dt;
      this._syncSize();
      this._render();
      this._raf = requestAnimationFrame(tick);
    };
    this._raf = requestAnimationFrame(tick);
  }

  _render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const cw = this._cssW || 480;
    const ch = this._cssH || 270;
    const dpr = this._dpr || 1;

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cw, ch);

    if (this.mode === 'fx_beacon') {
      this._renderBeaconVfx(ctx, cw, ch);
    } else if (this.mode === 'fx_hub_awaken') {
      this._renderHubAwakenVfx(ctx, cw, ch);
    } else if (this.mode === 'fx_hatch_light') {
      this._renderHatchLightVfx(ctx, cw, ch);
    } else if (this.mode === 'fx_bluesky_breeze') {
      this._renderBlueSkyBreezeVfx(ctx, cw, ch);
    }

    ctx.restore();
  }

  /**
   * Subtle glowing emerald "HELLO, WORLD." radio rings radiating directly from
   * the actual pixel-art relay tower tip in `scene_surface_rover.jpg` (u=0.737, v=0.095).
   */
  _renderBeaconVfx(ctx) {
    const t = this.time;
    const tip = this._mapSrcPoint(0.737, 0.095);
    const s = tip.scale;
    const hasReply = this.stagePhase >= 1;

    // Expanding emerald signal pulses from the relay tower
    ctx.save();
    for (let i = 0; i < 4; i++) {
      const p = (t * 0.48 + i * 0.25) % 1;
      const rad = (8 + p * 150) * s;
      const alpha = (1 - p) * (1 - p) * 0.65;
      ctx.strokeStyle = `rgba(82, 227, 182, ${alpha.toFixed(3)})`;
      ctx.lineWidth = Math.max(1.2, 2.0 * (1 - p) * s);
      ctx.beginPath();
      ctx.arc(tip.x, tip.y, rad, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Crisp glowing emerald/white beacon point at the tower tip
    const pulse = 0.72 + 0.28 * Math.sin(t * 7.5);
    const glow = ctx.createRadialGradient(tip.x, tip.y, 0, tip.x, tip.y, 26 * s);
    glow.addColorStop(0, `rgba(180, 255, 232, ${(0.9 * pulse).toFixed(3)})`);
    glow.addColorStop(0.35, `rgba(82, 227, 182, ${(0.45 * pulse).toFixed(3)})`);
    glow.addColorStop(1, 'rgba(82, 227, 182, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, 26 * s, 0, Math.PI * 2);
    ctx.fill();

    // Incoming warm golden reply wave from distant coastal shelter ARK-3!
    if (hasReply) {
      const far = this._mapSrcPoint(0.50, 0.34);
      for (let i = 0; i < 3; i++) {
        const p = (t * 0.56 + i * 0.33) % 1;
        const rad = (10 + p * 125) * s;
        const alpha = (1 - p) * 0.55;
        ctx.strokeStyle = `rgba(255, 214, 102, ${alpha.toFixed(3)})`;
        ctx.lineWidth = Math.max(1.1, 1.8 * (1 - p) * s);
        ctx.beginPath();
        ctx.arc(far.x, far.y, rad, Math.PI * 1.05, Math.PI * 1.95);
        ctx.stroke();
      }
      const fGlow = ctx.createRadialGradient(far.x, far.y, 0, far.x, far.y, 18 * s);
      fGlow.addColorStop(0, 'rgba(255, 238, 168, 0.85)');
      fGlow.addColorStop(1, 'rgba(255, 209, 102, 0)');
      ctx.fillStyle = fGlow;
      ctx.beginPath();
      ctx.arc(far.x, far.y, 18 * s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /**
   * Gentle awakened emerald & amber monitor shimmer + floating dust motes over
   * `scene_ending_ch1.jpg` / `scene_opening_aether.jpg`.
   */
  _renderHubAwakenVfx(ctx, cw, ch) {
    const t = this.time;
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.2);

    // Soft ambient emerald shimmer near the center CRT console
    const crt = this._mapSrcPoint(0.46, 0.58);
    const g = ctx.createRadialGradient(crt.x, crt.y, 0, crt.x, crt.y, 130 * crt.scale);
    g.addColorStop(0, `rgba(82, 227, 182, ${(0.12 + 0.06 * pulse).toFixed(3)})`);
    g.addColorStop(1, 'rgba(82, 227, 182, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cw, ch);

    // Delicate floating light dust motes
    for (const m of this._motes) {
      const x = ((m.u + t * m.vx * 0.45) % 1) * cw;
      const y = ((m.v + Math.sin(t * 1.2 + m.phase) * 0.03 + 1) % 1) * ch;
      const a = 0.16 + 0.24 * Math.sin(t * 2.4 + m.phase);
      ctx.fillStyle = m.warm
        ? `rgba(255, 214, 128, ${a.toFixed(3)})`
        : `rgba(116, 245, 204, ${a.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(x, y, m.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * Dramatic blazing golden-white sunlight bursting from the giant geared vault
   * door in `scene_shelter_hub.jpg` (u=0.712, v=0.565) as the 4 bolts unlock!
   */
  _renderHatchLightVfx(ctx, cw, ch) {
    const t = this.time;
    const door = this._mapSrcPoint(0.712, 0.565);
    const s = door.scale;
    const grow = Math.min(1, t * 0.65);
    const pulse = 0.88 + 0.12 * Math.sin(t * 3.5);

    ctx.save();
    // Radiant light burst spreading from the steel vault seam
    const rad = (70 + grow * 220) * s;
    const bloom = ctx.createRadialGradient(door.x, door.y, 2, door.x, door.y, rad);
    bloom.addColorStop(0, `rgba(255, 254, 240, ${(0.92 * pulse).toFixed(3)})`);
    bloom.addColorStop(0.28, `rgba(255, 232, 158, ${(0.58 * grow * pulse).toFixed(3)})`);
    bloom.addColorStop(0.65, `rgba(145, 224, 255, ${(0.22 * grow).toFixed(3)})`);
    bloom.addColorStop(1, 'rgba(145, 224, 255, 0)');
    ctx.fillStyle = bloom;
    ctx.fillRect(0, 0, cw, ch);

    // Volumetric light rays radiating outward from the opening vault door
    for (let i = 0; i < 6; i++) {
      const ang = -Math.PI * 0.85 + i * 0.34 + Math.sin(t * 0.9 + i) * 0.04;
      const rayLen = (150 + grow * 240) * s;
      const spread = 0.09;
      ctx.fillStyle = `rgba(255, 248, 214, ${(0.12 * grow).toFixed(3)})`;
      ctx.beginPath();
      ctx.moveTo(door.x, door.y);
      ctx.lineTo(door.x + Math.cos(ang - spread) * rayLen, door.y + Math.sin(ang - spread) * rayLen);
      ctx.lineTo(door.x + Math.cos(ang + spread) * rayLen, door.y + Math.sin(ang + spread) * rayLen);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  /**
   * Subtle volumetric morning sunbeams & sunlit wind motes drifting gently
   * across the real high-detail `assets/scene_ending_bluesky.jpg`!
   */
  _renderBlueSkyBreezeVfx(ctx, cw, ch) {
    const t = this.time;
    const sun = this._mapSrcPoint(0.56, 0.36);
    const s = sun.scale;

    ctx.save();
    // Soft morning sun shimmer along the horizon
    const pulse = 0.85 + 0.15 * Math.sin(t * 1.4);
    const glow = ctx.createRadialGradient(sun.x, sun.y, 0, sun.x, sun.y, 170 * s);
    glow.addColorStop(0, `rgba(255, 252, 226, ${(0.26 * pulse).toFixed(3)})`);
    glow.addColorStop(0.45, `rgba(255, 238, 176, ${(0.10 * pulse).toFixed(3)})`);
    glow.addColorStop(1, 'rgba(255, 238, 176, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, cw, ch);

    // Delicate diagonal morning sunbeams slanting across the valley
    for (let i = 0; i < 3; i++) {
      const a = 0.038 + 0.018 * Math.sin(t * 1.1 + i * 2.1);
      ctx.fillStyle = `rgba(255, 250, 220, ${a.toFixed(3)})`;
      const xTop = sun.x + (i - 1) * 44 * s;
      ctx.beginPath();
      ctx.moveTo(xTop - 16 * s, 0);
      ctx.lineTo(xTop + 20 * s, 0);
      ctx.lineTo(xTop - 95 * s, ch);
      ctx.lineTo(xTop - 150 * s, ch);
      ctx.closePath();
      ctx.fill();
    }

    // Subtle sunlit breeze motes floating lazily in the morning wind
    for (const m of this._motes) {
      const x = ((m.u + t * m.vx) % 1) * cw;
      const y = ((m.v + Math.sin(t * 1.5 + m.phase) * 0.025 + 1) % 1) * ch;
      const a = 0.18 + 0.28 * Math.sin(t * 2.1 + m.phase);
      ctx.fillStyle = m.warm
        ? `rgba(255, 250, 214, ${a.toFixed(3)})`
        : `rgba(224, 247, 255, ${a.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(x, y, m.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
