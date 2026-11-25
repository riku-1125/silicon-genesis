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

    // 3. Collapsed compact strip (h <= 34): clean single-line status on the right, clear of toggle button!
    const sceneMeta = SCENES[sceneKey] || SCENES.shelter_hub;
    const locLabel = this.stage?.incidentBrief?.where?.split('・')[0] || sceneMeta.label;

    if (h <= 34) {
      // Subtle CRT scanlines
      ctx.fillStyle = 'rgba(0, 0, 0, 0.14)';
      for (let y = 0; y < h; y += 3) {
        ctx.fillRect(0, y, w, 1);
      }

      const statusText = this._getCollapsedStatusText();
      const pillText = `● ${locLabel}${statusText ? ` ｜ ${statusText}` : ''}`;
      ctx.font = 'bold 10px monospace';
      const maxPillW = Math.max(80, w - 118);
      const pillW = Math.min(maxPillW, ctx.measureText(pillText).width + 14);
      const px = w - pillW - 6;
      const py = Math.max(2, Math.floor((h - 18) / 2));
      ctx.fillStyle = 'rgba(11, 16, 22, 0.86)';
      ctx.fillRect(px, py, pillW, 18);
      ctx.strokeStyle = this.unstable
        ? 'rgba(255, 107, 107, 0.7)'
        : this.cleared
          ? 'rgba(82, 227, 182, 0.65)'
          : 'rgba(235, 162, 68, 0.52)';
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 0.5, py + 0.5, pillW - 1, 17);
      ctx.fillStyle = this.unstable ? '#ff8a8a' : this.cleared ? '#7ef7cf' : '#ffd166';
      ctx.textBaseline = 'middle';
      ctx.fillText(pillText, px + 7, py + 9.5, pillW - 12);
      ctx.restore();
      return;
    }

    // 4. Live Reactive Machinery Telemetry Widget (top-right corner HUD)
    this._drawWidget(ctx, w, h);

    // 5. Subtle CRT scanlines
    ctx.fillStyle = 'rgba(0, 0, 0, 0.14)';
    for (let y = 0; y < h; y += 3) {
      ctx.fillRect(0, y, w, 1);
    }

    // 6. Location tag (top-left, omitted on narrow landscape strips w < 280 where dialogue-box shows location right beside it!)
    if (w >= 280) {
      ctx.font = 'bold 10px monospace';
      const tagText = `● ${locLabel}`;
      const maxTagW = Math.max(68, w - Math.min(184, w * 0.48) - 22);
      const tagW = Math.min(maxTagW, ctx.measureText(tagText).width + 14);
      ctx.fillStyle = 'rgba(13, 18, 24, 0.8)';
      ctx.fillRect(8, 5, tagW, 18);
      ctx.strokeStyle = this.cleared ? 'rgba(82, 227, 182, 0.65)' : 'rgba(235, 162, 68, 0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(8.5, 5.5, tagW - 1, 17);
      ctx.fillStyle = this.cleared ? '#52e3b6' : '#f0b159';
      ctx.fillText(tagText, 14, 17, tagW - 10);
    }

    // 7. Ambient Repaired Facility Log Ticker (shows previously repaired equipment still working!)
    const ambientLog = this._getAmbientFacilityLog();
    if (ambientLog && h >= 72) {
      ctx.font = 'bold 9.5px -apple-system, BlinkMacSystemFont, monospace';
      const logW = Math.min(w - 130, ctx.measureText(ambientLog).width + 14);
      const lx = w - logW - 8;
      const ly = h - 21;
      ctx.fillStyle = 'rgba(10, 18, 25, 0.82)';
      ctx.fillRect(lx, ly, logW, 16);
      ctx.strokeStyle = 'rgba(82, 227, 182, 0.45)';
      ctx.lineWidth = 1;
      ctx.strokeRect(lx + 0.5, ly + 0.5, logW - 1, 15);
      ctx.fillStyle = '#8fffdc';
      ctx.fillText(ambientLog, lx + 7, ly + 11.5, logW - 12);
    }

    ctx.restore();
  }

  _getCollapsedStatusText() {
    if (this.unstable) return '⚠ 発振エラー';
    if (this.stage?.kind === 'ark8_program') {
      const ram2 = this._bitsToNum(this.outputs, 0, 8);
      const pc = this.inputs[0] || 0;
      return `ARK8 PC:${pc} RAM[2]:${ram2}`;
    }
    if (this.stage?.kind === 'assembly_program') {
      const acc = this._bitsToNum(this.outputs, 0, 4);
      const pc = this.inputs[0] || 0;
      return `PC:${pc} ACC:${acc} [${acc.toString(2).padStart(4, '0')}]`;
    }

    if (this.stage?.id === 'stage_asm_enc') {
      const i1 = this.outputs[0] ? 1 : 0;
      const i0 = this.outputs[1] ? 1 : 0;
      const key = this.outputs[2] ? 1 : 0;
      return `I=${i1}${i0} KEY=${key}`;
    }
    if (this.stage?.id === 'stage_rom_4w') {
      const i1 = this.outputs[0] ? 1 : 0;
      const i0 = this.outputs[1] ? 1 : 0;
      const imm = [this.outputs[5], this.outputs[4], this.outputs[3], this.outputs[2]]
        .map((b) => (b ? '1' : '0'))
        .join('');
      return `ROM ${i1}${i0}:${imm}`;
    }
    if (!this.outputs || this.outputs.length === 0) return '';
    if (this.outputs.length >= 4) {
      const val = this._bitsToNum(this.outputs, 0, 4);
      return `OUT:${val} [${val.toString(2).padStart(4, '0')}]`;
    }
    return `OUT:${this.outputs.map((b) => (b ? '1' : '0')).join('')}`;
  }

  _getAmbientFacilityLog() {
    const n = this.stage?.number ?? 0;
    if (n >= 36) return '✔ 地上ログ: ARK-7(118)+ARK-3(124)=242人 拠点ホライズン稼働中';
    if (n >= 27) return '✔ 地上ログ: 42年ぶりの青空・太陽光＆風力マイクログリッド設営中';
    if (n >= 18) return '✔ 施設ログ: 夜間の揺れ1件・点検済み / 配給・水耕正常';
    if (n >= 12) return '✔ 施設ログ: 夜間の揺れ1件・記憶保持→朝点検済み';
    if (n === 11) return '✔ 施設ログ: B2水耕散水(0〜3区)・配給集計 正常';
    if (n >= 8) return '✔ 施設ログ: 中央配給ターミナル集計完了(誤差0)';
    if (n >= 5) return '✔ 施設ログ: B3酸素ファン・二重隔壁ロック正常';
    if (n >= 2) return '✔ 施設ログ: B3酸素清浄ファン・冷却弁 正常稼働中';
    return null;
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
    const isAssembly = this.stage?.kind === 'assembly_program';
    const compact = h < 74;
    const narrowStrip = w < 280;
    // Keep telemetry HUD completely clear of the bottom-left toggle button (▲ 回路を広く ~82px) on narrow landscape strips!
    const leftSafe = narrowStrip ? 88 : 8;
    const rightPad = narrowStrip ? 6 : 8;
    const boxW = narrowStrip
      ? Math.max(96, Math.min(162, w - leftSafe - rightPad))
      : Math.min(182, Math.max(132, w * 0.46));
    const by = compact ? 4 : 7;
    const boxH = compact ? Math.max(30, h - 8) : Math.min(62, h - 18);
    const bx = Math.max(leftSafe, w - boxW - rightPad);
    const hdrY = by + Math.round(boxH * 0.31);
    const bodyY = by + Math.round(boxH * 0.76);

    // Industrial CRT telemetry frame (clipped cleanly so text never bleeds outside!)
    ctx.save();
    ctx.fillStyle = 'rgba(11, 16, 22, 0.86)';
    ctx.fillRect(bx, by, boxW, boxH);
    ctx.strokeStyle = this.unstable
      ? '#ff4d4d'
      : this.cleared
        ? '#52e3b6'
        : 'rgba(232, 158, 63, 0.65)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx + 0.5, by + 0.5, boxW - 1, boxH - 1);

    ctx.beginPath();
    ctx.rect(bx + 1, by + 1, boxW - 2, boxH - 2);
    ctx.clip();

    if (this.unstable) {
      ctx.fillStyle = '#ff6b6b';
      ctx.font = `bold ${compact ? 10.5 : 11}px monospace`;
      ctx.fillText('⚠ 発振エラー', bx + 9, hdrY + 2, boxW - 16);
      ctx.font = `${compact ? 9 : 10}px monospace`;
      ctx.fillStyle = '#ffaaaa';
      ctx.fillText('OSCILLATION LOOP', bx + 9, bodyY + 1, boxW - 16);
      ctx.restore();
      return;
    }

    const out0 = this.outputs[0] ? 1 : 0;
    const in0 = this.inputs[0] ? 1 : 0;

    if (this.stage?.kind === 'ark8_program') {
      const ram2 = this._bitsToNum(this.outputs, 0, 8);
      const pc = this.inputs[0] || 0;
      ctx.font = `bold ${compact ? 9.5 : 10}px monospace`;
      ctx.fillStyle = '#52e3b6';
      ctx.fillText('ARK8_SYS SRAM[2]', bx + 9, hdrY, boxW - 16);
      ctx.font = `bold ${compact ? 12 : 13.5}px monospace`;
      ctx.fillStyle = '#ffd166';
      ctx.fillText(`${ram2} [0x${ram2.toString(16).toUpperCase().padStart(2, '0')}] PC:${pc}`, bx + 9, bodyY, boxW - 16);
      ctx.restore();
      return;
    }

    if (this.stage?.id === 'stage_asm_enc') {
      const i1 = this.outputs[0] ? 1 : 0;
      const i0 = this.outputs[1] ? 1 : 0;
      const key = this.outputs[2] ? 1 : 0;
      const opNames = ['LDI', 'ADD', 'SUB', 'JNZ'];
      const opLabel = key ? opNames[(i1 << 1) | i0] : 'IDLE';
      ctx.font = `bold ${compact ? 9.5 : 10}px monospace`;
      ctx.fillStyle = '#ffd166';
      ctx.fillText('ASM_ENC KEY→2BIT', bx + 9, hdrY, boxW - 16);
      ctx.font = `bold ${compact ? 12 : 13.5}px monospace`;
      ctx.fillStyle = key ? '#52e3b6' : '#8ea5bc';
      ctx.fillText(`${opLabel} [${i1}${i0}] K:${key}`, bx + 9, bodyY, boxW - 16);
      ctx.restore();
      return;
    }

    if (this.stage?.id === 'stage_rom_4w') {
      const a0 = this.inputs[0] ? 1 : 0;
      const a1 = this.inputs[1] ? 1 : 0;
      const addr = (a1 << 1) | a0;
      const i1 = this.outputs[0] ? 1 : 0;
      const i0 = this.outputs[1] ? 1 : 0;
      const imm = this._bitsToNum(this.outputs, 2, 4);
      const opNames = ['LDI', 'ADD', 'SUB', 'JNZ'];
      ctx.font = `bold ${compact ? 9.5 : 10}px monospace`;
      ctx.fillStyle = '#52e3b6';
      ctx.fillText(`ROM_4W [ADDR ${addr}]`, bx + 9, hdrY, boxW - 16);
      ctx.font = `bold ${compact ? 12 : 13.5}px monospace`;
      ctx.fillStyle = '#ffd166';
      ctx.fillText(`${opNames[(i1 << 1) | i0]} ${imm} (${i1}${i0})`, bx + 9, bodyY, boxW - 16);
      ctx.restore();
      return;
    }

    if (widget === 'silicon_lab' || widget === 'pullup_lab') {
      const isTr = widget === 'silicon_lab';
      ctx.font = `bold ${compact ? 9.5 : 10}px monospace`;
      ctx.fillStyle = isTr ? '#ffbe6b' : '#7cd4f5';
      ctx.fillText(isTr ? 'SILICON MOSFET LAB' : 'PULL-UP VOLTAGE LAB', bx + 9, hdrY, boxW - 16);

      ctx.font = `bold ${compact ? 11.5 : 12}px monospace`;
      ctx.fillStyle = out0 ? '#52e3b6' : '#8ea5bc';
      if (isTr) {
        ctx.fillText(`GATE:${in0} → OUT:${out0}`, bx + 9, bodyY, boxW - 16);
      } else {
        ctx.fillText(`DRAIN:${in0} → ${out0 ? '5.0V(1)' : '0.0V(0)'}`, bx + 9, bodyY, boxW - 16);
      }
      ctx.restore();
      return;
    }

    if (widget === 'nand_forge') {
      // Live Emergency Reactor Coolant Valve visualizer!
      const a = this.inputs[0] ? 1 : 0;
      const b = this.inputs[1] ? 1 : 0;
      ctx.font = `bold ${compact ? 9.5 : 10}px monospace`;
      ctx.fillStyle = out0 ? '#52e3b6' : '#ffb84d';
      ctx.fillText('REACTOR COOLANT', bx + 9, by + (compact ? 12 : 16), boxW - 16);

      // Animated coolant flow pipe when OUT=1
      const pipeX = bx + 9;
      const pipeY = by + (compact ? 17 : 23);
      const pipeW = boxW - 18;
      const pipeH = compact ? 9 : 12;
      ctx.fillStyle = '#0d1822';
      ctx.fillRect(pipeX, pipeY, pipeW, pipeH);
      ctx.strokeStyle = out0 ? '#52e3b6' : '#586c80';
      ctx.strokeRect(pipeX, pipeY, pipeW, pipeH);
      if (out0) {
        const shift = (this.time * 28) % 16;
        ctx.fillStyle = '#38d9a9';
        for (let fx = pipeX - 16 + shift; fx < pipeX + pipeW; fx += 16) {
          const sx = Math.max(pipeX + 1, fx);
          const ex = Math.min(pipeX + pipeW - 1, fx + 9);
          if (ex > sx) ctx.fillRect(sx, pipeY + 2, ex - sx, pipeH - 4);
        }
      }

      ctx.font = `bold ${compact ? 9.5 : 10}px monospace`;
      ctx.fillStyle = out0 ? '#8fffdc' : '#ffd166';
      ctx.fillText(out0 ? `FLOWING (1) A:${a} B:${b}` : `VALVE SHUT (0)`, bx + 9, by + boxH - (compact ? 5 : 9), boxW - 16);
      ctx.restore();
      return;
    }

    if (!isAssembly && (widget === 'air_scrubber' || widget === 'alarm_grid' || widget === 'corridor_lamp')) {
      // Rotating turbine + live alarm LED
      const cx = bx + (compact ? 22 : 26);
      const cy = by + boxH / 2;
      const r = Math.min(18, boxH * 0.33);
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
      const lampX = bx + (compact ? 52 : 60);
      const lampY = hdrY - 2;
      ctx.fillStyle = lampOn
        ? (widget === 'corridor_lamp' ? '#ffd97d' : (blink ? '#ff5c5c' : '#b83232'))
        : '#2a3744';
      ctx.beginPath();
      ctx.arc(lampX, lampY, compact ? 4.5 : 5.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = `bold ${compact ? 9.5 : 10}px monospace`;
      ctx.fillStyle = '#d7e3ee';
      const title =
        widget === 'air_scrubber' ? 'O2 SCRUBBER' : widget === 'alarm_grid' ? 'SMOKE GRID' : 'STAIR LAMP';
      ctx.fillText(title, lampX + 9, hdrY + 2, boxW - (lampX - bx) - 14);

      ctx.font = `bold ${compact ? 10.5 : 11}px monospace`;
      ctx.fillStyle = lampOn ? '#ffb347' : '#6c8094';
      ctx.fillText(`IN:${in0} → OUT:${out0}`, bx + (compact ? 48 : 56), bodyY + 1, boxW - 56);
    } else if (!isAssembly && widget === 'bulkhead') {
      // Steel vault bars sliding open when OUT=1
      const openAmt = out0 ? 1 : 0;
      const doorX = bx + 9;
      const doorY = by + (compact ? 8 : 11);
      const doorW = compact ? 38 : 46;
      const doorH = Math.max(18, boxH - (compact ? 16 : 22));
      ctx.fillStyle = '#1b242d';
      ctx.fillRect(doorX, doorY, doorW, doorH);
      const half = (doorW / 2) * (1 - openAmt * 0.72);
      ctx.fillStyle = '#5c6b7a';
      ctx.fillRect(doorX, doorY, half, doorH);
      ctx.fillRect(doorX + doorW - half, doorY, half, doorH);
      ctx.strokeStyle = out0 ? '#52e3b6' : '#d98a36';
      ctx.strokeRect(doorX, doorY, doorW, doorH);

      const tx = doorX + doorW + 9;
      ctx.font = `bold ${compact ? 10 : 10.5}px monospace`;
      ctx.fillStyle = out0 ? '#52e3b6' : '#f0b159';
      ctx.fillText(out0 ? 'UNLOCKED' : 'LOCKED', tx, hdrY + 2, boxW - (tx - bx) - 6);
      ctx.fillStyle = '#9bb0c4';
      ctx.fillText(`A=${this.inputs[0] || 0} B=${this.inputs[1] || 0}`, tx, bodyY + 1, boxW - (tx - bx) - 6);
    } else if (!isAssembly && (widget === 'ration_counter' || widget === 'ration_terminal' || widget === 'rover_alu')) {
      // Live Nixie-style arithmetic equation!
      ctx.font = `bold ${compact ? 9.5 : 10}px monospace`;
      ctx.fillStyle = '#8fa8be';
      const header =
        widget === 'rover_alu'
          ? (this.inputs[8] ? 'ALU MODE: SUB (-)' : 'ALU MODE: ADD (+)')
          : 'BINARY ARITHMETIC';
      ctx.fillText(header, bx + 9, hdrY, boxW - 16);

      ctx.font = `bold ${compact ? 13 : 15}px monospace`;
      ctx.fillStyle = '#ffb84d';
      if (this.stage.inputs.length >= 9) {
        const a = this._bitsToNum(this.inputs, 0, 4);
        const b = this._bitsToNum(this.inputs, 4, 4);
        const flag = this.inputs[8] ? 1 : 0;
        const y = this._bitsToNum(this.outputs, 0, 4);
        const c = this.outputs[4] ? 1 : 0;
        if (widget === 'rover_alu') {
          const op = flag ? '-' : '+';
          ctx.fillText(`${a}${op}${b}=${y}`, bx + 9, bodyY + 1, boxW - 46);
          ctx.font = 'bold 10px monospace';
          ctx.fillStyle = '#52e3b6';
          ctx.fillText(`C=${c}`, bx + boxW - 34, bodyY + 1);
        } else {
          const total = y + c * 16;
          ctx.fillText(`${a}+${b}${flag ? '+1' : ''}=${total}`, bx + 9, bodyY + 1, boxW - 16);
        }
      } else {
        const a = this.inputs[0] || 0;
        const b = this.inputs[1] || 0;
        const cin = this.stage.inputs.length === 3 ? (this.inputs[2] || 0) : null;
        const val = (this.outputs[0] || 0) + (this.outputs[1] || 0) * 2;
        const expr = cin === null ? `${a}+${b} = ${val}` : `${a}+${b}+${cin} = ${val}`;
        ctx.fillText(expr, bx + 9, bodyY + 1, boxW - 16);
      }
    } else if (!isAssembly && (widget === 'pipe_mux' || widget === 'data_bus' || widget === 'hydroponics')) {
      // Routing / channel indicator blocks
      ctx.font = `bold ${compact ? 9.5 : 10}px monospace`;
      ctx.fillStyle = '#6ec3ff';
      const label =
        this.stage?.id === 'stage_20'
          ? 'OP / SET / WE / BR'
          : widget === 'hydroponics'
            ? 'CHAMBER SELECT'
            : widget === 'data_bus'
              ? '4-BIT BUS MUX'
              : 'ROUTE SELECT';
      ctx.fillText(label, bx + 9, hdrY, boxW - 16);

      const n = this.outputs.length;
      const cellH = compact ? Math.max(14, boxH - 22) : 22;
      const cellY = by + boxH - cellH - (compact ? 4 : 6);
      const cellW = Math.min(26, (boxW - 22) / Math.max(1, n) - 4);
      for (let i = 0; i < n; i++) {
        const on = this.outputs[i] === 1;
        const x = bx + 9 + i * (cellW + 5);
        ctx.fillStyle = on ? '#52e3b6' : '#1f2b36';
        ctx.fillRect(x, cellY, cellW, cellH);
        ctx.strokeStyle = on ? '#b8ffe8' : '#415568';
        ctx.strokeRect(x, cellY, cellW, cellH);
        ctx.fillStyle = on ? '#081a14' : '#7f95aa';
        ctx.font = `bold ${compact ? 9.5 : 10}px monospace`;
        ctx.fillText(`${on ? '1' : '0'}`, x + cellW / 2 - 3, cellY + cellH * 0.72);
      }
    } else if (!isAssembly && (widget === 'seismic_lamp' || widget === 'memory_vault' || widget === 'clock_pulse')) {
      // Live scrolling oscilloscope trace!
      ctx.font = `bold ${compact ? 9.5 : 10}px monospace`;
      ctx.fillStyle = '#c89bff';
      const traceTitle =
        this.stage?.id === 'stage_18'
          ? 'ZERO FLAG Z (ΔP=0)'
          : widget === 'clock_pulse'
            ? 'CLOCK SYNC Q'
            : 'MEMORY STATE Q';
      ctx.fillText(traceTitle, bx + 9, by + (compact ? 12 : 16), boxW - 16);

      const gx = bx + 9;
      const gy = by + (compact ? 16 : 23);
      const gw = boxW - 18;
      const gh = Math.max(14, boxH - (compact ? 20 : 29));
      ctx.fillStyle = '#0a1017';
      ctx.fillRect(gx, gy, gw, gh);
      ctx.strokeStyle = '#314154';
      ctx.strokeRect(gx, gy, gw, gh);

      ctx.beginPath();
      ctx.strokeStyle = '#52e3b6';
      ctx.lineWidth = 1.7;
      for (let i = 0; i < this.waveHistory.length; i++) {
        const px = gx + (i / (this.waveHistory.length - 1)) * gw;
        const py = gy + (this.waveHistory[i] ? 3 : gh - 3);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    } else {
      // Register / PC / ARK-4 CPU Core & Assembly Program Finale HUD!
      const val = this._bitsToNum(this.outputs, 0, 4);
      const bin = val.toString(2).padStart(4, '0');
      ctx.font = `bold ${compact ? 9.5 : 10}px monospace`;
      ctx.fillStyle = this.cleared ? '#52e3b6' : '#ff9f6b';
      const title =
        this.stage?.isChapter2Finale
          ? (this.cleared ? 'HATCH: BLUE SKY!' : 'ARK4_SYS HATCH ACC')
          : isAssembly
            ? `ARK4_SYS PC:${this.inputs[0] || 0} ACC`
            : this.stage?.chapter === 2 && widget === 'ark4_finale'
              ? (this.cleared ? 'ARK4_SYS READY' : 'ARK4_SYS CPU ACC')
              : widget === 'ark4_finale'
                ? (this.cleared ? 'BEACON: HELLO WORLD' : 'ARK-4 CPU ACC')
                : widget === 'program_counter'
                  ? 'PC ADDRESS'
                  : 'REG_4BIT MEM';
      ctx.fillText(title, bx + 9, hdrY, boxW - 16);

      ctx.font = `bold ${compact ? 15 : 18}px monospace`;
      ctx.fillStyle = '#ffd166';
      ctx.fillText(`${String(val).padStart(2, '0')}`, bx + 9, bodyY + 2);
      ctx.font = `bold ${compact ? 10.5 : 11}px monospace`;
      ctx.fillStyle = '#7bdff2';
      ctx.fillText(`[${bin}]`, bx + (compact ? 40 : 48), bodyY + 1, boxW - (compact ? 48 : 58));

      // Beacon pulse wave when cleared (only when box has room on right)
      if (this.cleared && boxW >= 132) {
        const pulse = (this.time * 24) % 16;
        ctx.beginPath();
        ctx.arc(bx + boxW - 16, bodyY - 3, 3.5 + pulse * 0.42, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(82, 227, 182, ${Math.max(0, 1 - pulse / 16)})`;
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}
