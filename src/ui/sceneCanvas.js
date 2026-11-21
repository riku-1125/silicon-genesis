/**
 * SILICON GENESIS — Upper CRT Pixel-Art Scene & Live Machinery Visualizer
 * Renders the generated dark-industrial pixel-art shelter backdrops and overlays
 * live-reactive shelter telemetry (turbines, bulkhead locks, Nixie adders,
 * seismic waves, clock oscilloscopes, rover radar, and ARK-4 boot beacon!).
 */

import { SCENES } from '../data/characters.js';

export class SceneCanvas {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.images = {};
    this.stage = null;
    this.inputs = [];
    this.outputs = [];
    this.cleared = false;
    this.testing = false;
    this.unstable = false;
    this.time = 0;
    this.waveHistory = new Array(48).fill(0);
    this.waveAccum = 0;
    this._raf = null;
    this.motes = Array.from({ length: 18 }, (_, i) => ({
      x: ((i * 73) % 100) / 100,
      y: ((i * 41) % 100) / 100,
      vy: 0.03 + (i % 5) * 0.012,
      vx: ((i % 3) - 1) * 0.012,
      r: 1 + (i % 2) * 0.8,
      phase: i * 1.3,
    }));

    // Preload pixel art scene backdrops
    for (const [key, def] of Object.entries(SCENES)) {
      const img = new Image();
      img.src = def.image;
      this.images[key] = img;
    }
  }

  setState({ stage, inputs, outputs, cleared, testing, unstable }) {
    if (stage !== undefined) this.stage = stage;
    if (inputs !== undefined) this.inputs = inputs;
    if (outputs !== undefined) this.outputs = outputs;
    if (cleared !== undefined) this.cleared = cleared;
    if (testing !== undefined) this.testing = testing;
    if (unstable !== undefined) this.unstable = unstable;
  }

  start() {
    if (this._raf) return;
    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      this.time += dt;
      this.waveAccum += dt;
      if (this.waveAccum >= 0.05) {
        this.waveAccum = 0;
        const val = this.outputs[0] ? 1 : 0;
        this.waveHistory.push(val);
        if (this.waveHistory.length > 48) this.waveHistory.shift();
      }
      this.render();
      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  }

  stop() {
    if (this._raf) {
      cancelAnimationFrame(this._raf);
      this._raf = null;
    }
  }

  _resizeIfNeeded() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    return { w: rect.width, h: rect.height, dpr };
  }

  render() {
    const { w, h, dpr } = this._resizeIfNeeded();
    if (w < 10 || h < 10) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = false;

    // 1. Backdrop pixel art (cover fit, slightly darkened for HUD contrast)
    const sceneKey = this.stage?.scene || 'shelter_hub';
    const img = this.images[sceneKey];
    ctx.fillStyle = '#0d1015';
    ctx.fillRect(0, 0, w, h);

    if (img && img.complete && img.naturalWidth > 0) {
      const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
      const dw = img.naturalWidth * scale;
      const dh = img.naturalHeight * scale;
      const dx = (w - dw) / 2;
      const dy = (h - dh) / 2;
      ctx.drawImage(img, dx, dy, dw, dh);
    }

    // Industrial dark vignette gradient
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(9, 12, 16, 0.45)');
    grad.addColorStop(0.55, 'rgba(9, 12, 16, 0.28)');
    grad.addColorStop(1, 'rgba(9, 12, 16, 0.85)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // 2. Drifting atmospheric dust motes / surface embers
    const isSurface = sceneKey === 'surface_rover';
    for (const m of this.motes) {
      const mx = ((m.x + this.time * m.vx) % 1 + 1) % 1 * w;
      const my = ((m.y - this.time * m.vy) % 1 + 1) % 1 * h;
      const alpha = 0.25 + 0.25 * Math.sin(this.time * 2.4 + m.phase);
      ctx.fillStyle = this.cleared
        ? `rgba(82, 227, 182, ${alpha})`
        : isSurface
          ? `rgba(255, 168, 76, ${alpha * 1.3})`
          : `rgba(255, 210, 140, ${alpha})`;
      ctx.fillRect(mx, my, m.r * 1.6, m.r * 1.6);
    }

    // Subtle CRT phosphor beam refresh sweep
    const sweepY = ((this.time * 26) % (h + 24)) - 12;
    const sweepGrad = ctx.createLinearGradient(0, sweepY - 10, 0, sweepY + 10);
    sweepGrad.addColorStop(0, 'rgba(82, 227, 182, 0)');
    sweepGrad.addColorStop(0.5, this.cleared ? 'rgba(82, 227, 182, 0.07)' : 'rgba(255, 195, 110, 0.05)');
    sweepGrad.addColorStop(1, 'rgba(82, 227, 182, 0)');
    ctx.fillStyle = sweepGrad;
    ctx.fillRect(0, sweepY - 10, w, 20);

    // 3. Live Reactive Machinery Telemetry Widget (top-right corner HUD)
    this._drawWidget(ctx, w, h);

    // 3. Subtle CRT scanlines
    ctx.fillStyle = 'rgba(0, 0, 0, 0.14)';
    for (let y = 0; y < h; y += 3) {
      ctx.fillRect(0, y, w, 1);
    }

    // 4. Location tag (top-left, synced to the current mission location!)
    const sceneMeta = SCENES[sceneKey] || SCENES.shelter_hub;
    const locLabel = this.stage?.incidentBrief?.where?.split('・')[0] || sceneMeta.label;
    ctx.font = 'bold 10px monospace';
    const tagText = `● ${locLabel}`;
    const tagW = ctx.measureText(tagText).width + 14;
    ctx.fillStyle = 'rgba(13, 18, 24, 0.78)';
    ctx.fillRect(8, 7, tagW, 18);
    ctx.strokeStyle = this.cleared ? 'rgba(82, 227, 182, 0.65)' : 'rgba(235, 162, 68, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(8.5, 7.5, tagW - 1, 17);
    ctx.fillStyle = this.cleared ? '#52e3b6' : '#f0b159';
    ctx.fillText(tagText, 14, 19);

    ctx.restore();
  }

  _bitsToNum(arr, start = 0, len = 4) {
    let n = 0;
    for (let i = 0; i < len; i++) {
      if (arr[start + i]) n |= 1 << i;
    }
    return n;
  }

  _drawWidget(ctx, w, h) {
    const widget = this.stage?.widget || 'air_scrubber';
    const boxW = Math.min(176, w * 0.46);
    const boxH = Math.min(62, h - 18);
    const bx = w - boxW - 8;
    const by = 7;

    // Industrial CRT telemetry frame
    ctx.fillStyle = 'rgba(11, 16, 22, 0.84)';
    ctx.fillRect(bx, by, boxW, boxH);
    ctx.strokeStyle = this.unstable
      ? '#ff4d4d'
      : this.cleared
        ? '#52e3b6'
        : 'rgba(232, 158, 63, 0.65)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx + 0.5, by + 0.5, boxW - 1, boxH - 1);

    if (this.unstable) {
      ctx.fillStyle = '#ff6b6b';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('⚠ 発振エラー', bx + 10, by + 26);
      ctx.font = '10px monospace';
      ctx.fillStyle = '#ffaaaa';
      ctx.fillText('OSCILLATION LOOP', bx + 10, by + 44);
      return;
    }

    const out0 = this.outputs[0] ? 1 : 0;
    const in0 = this.inputs[0] ? 1 : 0;

    if (widget === 'silicon_lab' || widget === 'pullup_lab') {
      const isTr = widget === 'silicon_lab';
      ctx.font = 'bold 10px monospace';
      ctx.fillStyle = isTr ? '#ffbe6b' : '#7cd4f5';
      ctx.fillText(isTr ? 'SILICON MOSFET LAB' : 'PULL-UP VOLTAGE LAB', bx + 10, by + 17);

      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = out0 ? '#52e3b6' : '#8ea5bc';
      if (isTr) {
        ctx.fillText(`GATE:${in0} → OUT:${out0}`, bx + 10, by + 40);
      } else {
        ctx.fillText(`DRAIN:${in0} → ${out0 ? '5.0V(1)' : '0.0V(0)'}`, bx + 10, by + 40);
      }
      return;
    }

    if (widget === 'nand_forge') {
      // Live Emergency Reactor Coolant Valve visualizer!
      const a = this.inputs[0] ? 1 : 0;
      const b = this.inputs[1] ? 1 : 0;
      ctx.font = 'bold 10px monospace';
      ctx.fillStyle = out0 ? '#52e3b6' : '#ffb84d';
      ctx.fillText('REACTOR COOLANT', bx + 10, by + 16);

      // Animated coolant flow pipe when OUT=1
      const pipeX = bx + 10;
      const pipeY = by + 24;
      const pipeW = boxW - 20;
      ctx.fillStyle = '#0d1822';
      ctx.fillRect(pipeX, pipeY, pipeW, 12);
      ctx.strokeStyle = out0 ? '#52e3b6' : '#586c80';
      ctx.strokeRect(pipeX, pipeY, pipeW, 12);
      if (out0) {
        const shift = (this.time * 28) % 16;
        ctx.fillStyle = '#38d9a9';
        for (let fx = pipeX - 16 + shift; fx < pipeX + pipeW; fx += 16) {
          const sx = Math.max(pipeX + 1, fx);
          const ex = Math.min(pipeX + pipeW - 1, fx + 9);
          if (ex > sx) ctx.fillRect(sx, pipeY + 2, ex - sx, 8);
        }
      }

      ctx.font = 'bold 10px monospace';
      ctx.fillStyle = out0 ? '#8fffdc' : '#ffd166';
      ctx.fillText(out0 ? `FLOWING (1) A:${a} B:${b}` : `VALVE SHUT (0)`, bx + 10, by + 51);
      return;
    }

    if (widget === 'air_scrubber' || widget === 'alarm_grid' || widget === 'corridor_lamp') {
      // Rotating turbine + live alarm LED
      const cx = bx + 26;
      const cy = by + boxH / 2;
      const r = Math.min(18, boxH * 0.34);
      ctx.save();
      ctx.translate(cx, cy);
      const speed = this.cleared ? 4.5 : (out0 ? 0.8 : 2.8);
      ctx.rotate(this.time * speed);
      ctx.strokeStyle = this.cleared ? '#52e3b6' : '#c9883b';
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        ctx.rotate(Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(r, 0);
        ctx.stroke();
      }
      ctx.restore();

      ctx.beginPath();
      ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(170, 190, 210, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Status lamp & label
      const lampOn = out0 === 1;
      const blink = Math.sin(this.time * 8) > 0;
      ctx.fillStyle = lampOn
        ? (widget === 'corridor_lamp' ? '#ffd97d' : (blink ? '#ff5c5c' : '#b83232'))
        : '#2a3744';
      ctx.beginPath();
      ctx.arc(bx + 62, by + 21, 5.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = 'bold 10px monospace';
      ctx.fillStyle = '#d7e3ee';
      const title =
        widget === 'air_scrubber' ? 'O2 SCRUBBER' : widget === 'alarm_grid' ? 'SMOKE GRID' : 'STAIR LAMP';
      ctx.fillText(title, bx + 73, by + 25);

      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = lampOn ? '#ffb347' : '#6c8094';
      ctx.fillText(`IN:${in0} → OUT:${out0}`, bx + 56, by + 46);
    } else if (widget === 'bulkhead') {
      // Steel vault bars sliding open when OUT=1
      const openAmt = out0 ? 1 : 0;
      const doorX = bx + 10;
      const doorY = by + 12;
      const doorW = 46;
      const doorH = boxH - 24;
      ctx.fillStyle = '#1b242d';
      ctx.fillRect(doorX, doorY, doorW, doorH);
      const half = (doorW / 2) * (1 - openAmt * 0.72);
      ctx.fillStyle = '#5c6b7a';
      ctx.fillRect(doorX, doorY, half, doorH);
      ctx.fillRect(doorX + doorW - half, doorY, half, doorH);
      ctx.strokeStyle = out0 ? '#52e3b6' : '#d98a36';
      ctx.strokeRect(doorX, doorY, doorW, doorH);

      ctx.font = 'bold 10px monospace';
      ctx.fillStyle = out0 ? '#52e3b6' : '#f0b159';
      ctx.fillText(out0 ? 'UNLOCKED' : 'LOCKED', bx + 65, by + 26);
      ctx.fillStyle = '#9bb0c4';
      ctx.fillText(`A=${this.inputs[0] || 0} B=${this.inputs[1] || 0}`, bx + 65, by + 45);
    } else if (widget === 'ration_counter' || widget === 'ration_terminal' || widget === 'rover_alu') {
      // Live Nixie-style arithmetic equation!
      ctx.font = 'bold 10px monospace';
      ctx.fillStyle = '#8fa8be';
      const header =
        widget === 'rover_alu'
          ? (this.inputs[8] ? 'ALU MODE: SUB (-)' : 'ALU MODE: ADD (+)')
          : 'BINARY ARITHMETIC';
      ctx.fillText(header, bx + 10, by + 17);

      ctx.font = 'bold 15px monospace';
      ctx.fillStyle = '#ffb84d';
      if (this.stage.inputs.length >= 9) {
        const a = this._bitsToNum(this.inputs, 0, 4);
        const b = this._bitsToNum(this.inputs, 4, 4);
        const flag = this.inputs[8] ? 1 : 0;
        const y = this._bitsToNum(this.outputs, 0, 4);
        const c = this.outputs[4] ? 1 : 0;
        if (widget === 'rover_alu') {
          const op = flag ? '-' : '+';
          ctx.fillText(`${a}${op}${b}=${y}`, bx + 10, by + 40);
          ctx.font = '10px monospace';
          ctx.fillStyle = '#52e3b6';
          ctx.fillText(`C=${c}`, bx + boxW - 34, by + 40);
        } else {
          const total = y + c * 16;
          ctx.fillText(`${a}+${b}${flag ? '+1' : ''}=${total}`, bx + 10, by + 42);
        }
      } else {
        const a = this.inputs[0] || 0;
        const b = this.inputs[1] || 0;
        const cin = this.stage.inputs.length === 3 ? (this.inputs[2] || 0) : null;
        const val = (this.outputs[0] || 0) + (this.outputs[1] || 0) * 2;
        const expr = cin === null ? `${a}+${b} = ${val}` : `${a}+${b}+${cin} = ${val}`;
        ctx.fillText(expr, bx + 10, by + 42);
      }
    } else if (widget === 'pipe_mux' || widget === 'data_bus' || widget === 'hydroponics') {
      // Routing / channel indicator blocks
      ctx.font = 'bold 10px monospace';
      ctx.fillStyle = '#6ec3ff';
      const label =
        widget === 'hydroponics' ? 'CHAMBER SELECT' : widget === 'data_bus' ? '4-BIT BUS MUX' : 'ROUTE SELECT';
      ctx.fillText(label, bx + 10, by + 17);

      const n = this.outputs.length;
      const cellW = Math.min(26, (boxW - 24) / Math.max(1, n) - 4);
      for (let i = 0; i < n; i++) {
        const on = this.outputs[i] === 1;
        const x = bx + 10 + i * (cellW + 5);
        const y = by + 26;
        ctx.fillStyle = on ? '#52e3b6' : '#1f2b36';
        ctx.fillRect(x, y, cellW, 22);
        ctx.strokeStyle = on ? '#b8ffe8' : '#415568';
        ctx.strokeRect(x, y, cellW, 22);
        ctx.fillStyle = on ? '#081a14' : '#7f95aa';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(`${on ? '1' : '0'}`, x + cellW / 2 - 3, y + 15);
      }
    } else if (widget === 'seismic_lamp' || widget === 'memory_vault' || widget === 'clock_pulse') {
      // Live scrolling oscilloscope trace!
      ctx.font = 'bold 10px monospace';
      ctx.fillStyle = '#c89bff';
      ctx.fillText(widget === 'clock_pulse' ? 'CLOCK SYNC Q' : 'MEMORY STATE Q', bx + 10, by + 16);

      const gx = bx + 10;
      const gy = by + 23;
      const gw = boxW - 20;
      const gh = boxH - 30;
      ctx.fillStyle = '#0a1017';
      ctx.fillRect(gx, gy, gw, gh);
      ctx.strokeStyle = '#314154';
      ctx.strokeRect(gx, gy, gw, gh);

      ctx.beginPath();
      ctx.strokeStyle = '#52e3b6';
      ctx.lineWidth = 1.7;
      for (let i = 0; i < this.waveHistory.length; i++) {
        const px = gx + (i / (this.waveHistory.length - 1)) * gw;
        const py = gy + (this.waveHistory[i] ? 5 : gh - 5);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    } else {
      // Register / PC / ARK-4 CPU Core Finale HUD!
      const val = this._bitsToNum(this.outputs, 0, 4);
      const bin = val.toString(2).padStart(4, '0');
      ctx.font = 'bold 10px monospace';
      ctx.fillStyle = this.cleared ? '#52e3b6' : '#ff9f6b';
      const title =
        widget === 'ark4_finale'
          ? (this.cleared ? 'BEACON: HELLO WORLD' : 'ARK-4 CPU ACC')
          : widget === 'program_counter'
            ? 'PC ADDRESS'
            : 'REG_4BIT MEM';
      ctx.fillText(title, bx + 10, by + 17);

      ctx.font = 'bold 18px monospace';
      ctx.fillStyle = '#ffd166';
      ctx.fillText(`${String(val).padStart(2, '0')}`, bx + 12, by + 44);
      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = '#7bdff2';
      ctx.fillText(`[${bin}]`, bx + 52, by + 42);

      // Beacon pulse wave when cleared
      if (this.cleared) {
        const pulse = (this.time * 24) % 18;
        ctx.beginPath();
        ctx.arc(bx + boxW - 20, by + 36, 4 + pulse * 0.5, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(82, 227, 182, ${Math.max(0, 1 - pulse / 18)})`;
        ctx.stroke();
      }
    }
  }
}
