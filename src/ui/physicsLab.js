/**
 * SILICON GENESIS — Interactive Physics Lab Workbench Canvas (ACT 0)
 *
 * Powers the two hands-on physical foundation stages:
 *   - STAGE 00-A ('physics_transistor'): Build a MOSFET transistor from N-Silicon,
 *     Glass Insulator, and Metal Gate on a P-Silicon base, then toggle Gate voltage
 *     to watch an electron channel bridge form live!
 *   - STAGE 00-B ('physics_pullup'): Build a Pull-Up Resistor + Ground Drain circuit,
 *     experiment safely with short-circuit sparks vs narrow resistor bottleneck,
 *     and watch the 5.0V <-> 0.0V voltage meter flip cleanly!
 */

const W = 640;
const H = 360;

export class PhysicsLabCanvas {
  constructor(canvas, callbacks = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cb = callbacks;

    this.stage = null;
    this.slots = {};       // slotId -> partId | null
    this.armedPart = null; // partId | null
    this.controlBit = 0;   // 'ひねり' (00-A) or 'ぬけ' (00-B)
    this.time = 0;
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.feedbackMsg = '';
    this.feedbackColor = '#ffb84d';
    this.particles = [];
    this._raf = null;

    this._bindEvents();
  }

  setStage(stage, savedSlots = null) {
    this.stage = stage;
    this.armedPart = null;
    this.controlBit = 0;
    this.feedbackMsg = '';

    if (stage.kind === 'physics_transistor') {
      this.slots = {
        leftN: savedSlots?.leftN || null,
        rightN: savedSlots?.rightN || null,
        insulator: savedSlots?.insulator || null,
        gate: savedSlots?.gate || null,
      };
    } else {
      this.slots = {
        upper: savedSlots?.upper || null,
        lower: savedSlots?.lower || null,
      };
    }

    this.fitToView();
    this._notifyState();
  }

  setArmedPart(partId) {
    this.armedPart = partId;
    this.cb.onArmedChange?.(this.armedPart);
  }

  setControlBit(val) {
    this.controlBit = val ? 1 : 0;
    this._notifyState();
  }

  clearAll() {
    for (const k of Object.keys(this.slots)) {
      this.slots[k] = null;
    }
    this.feedbackMsg = '';
    this.cb.onSlotsChange?.({ ...this.slots });
    this._notifyState();
  }

  /** Auto-places an armed part into the best matching empty slot (for 2-tap mobile convenience!). */
  autoPlacePart(partId) {
    const defs = this._getSlotDefs();
    // Prefer an empty slot whose ideal part matches partId; fallback to first empty slot
    let target = defs.find((d) => !this.slots[d.id] && d.ideal === partId);
    if (!target) target = defs.find((d) => !this.slots[d.id]);
    if (!target) {
      // If all slots full, overwrite a non-matching slot if one exists
      target = defs.find((d) => d.ideal === partId && this.slots[d.id] !== partId) || defs[0];
    }
    if (target) {
      this._placeInSlot(target.id, partId);
    }
  }

  /** Evaluates the current physical assembly for Stage 00-A or 00-B. */
  evaluatePhysics() {
    if (!this.stage) return { passed: false, results: [], error: 'ステージ未読込' };

    if (this.stage.kind === 'physics_transistor') {
      const { leftN, rightN, insulator, gate } = this.slots;
      if (!leftN || !rightN || !insulator || !gate) {
        return {
          passed: false,
          error: 'まだ空いている枠があります！ 4つの枠すべてに材料を入れよう。',
          results: [],
          passedCount: 0,
          totalCount: 2,
        };
      }
      if (leftN !== 'N_SILICON' || rightN !== 'N_SILICON') {
        return {
          passed: false,
          error: '左右のポケット（いり・でぐち側）には「N型シリコン」を埋め込もう！',
          results: [
            { index: 0, label: 'ひねり=0 → 遮断(0)', input: [0], expected: [0], actual: [0], passed: true },
            { index: 1, label: 'ひねり=1 → 電子の橋(1)', input: [1], expected: [1], actual: [0], passed: false },
          ],
          passedCount: 1,
          totalCount: 2,
        };
      }
      if (insulator !== 'INSULATOR') {
        return {
          passed: false,
          error: '中央の薄い段に「ガラスの壁」がないと、金属とシリコンがショートしてしまうよ！',
          results: [
            { index: 0, label: 'ひねり=0 → 遮断(0)', input: [0], expected: [0], actual: [1], passed: false, unstable: true },
            { index: 1, label: 'ひねり=1 → 電子の橋(1)', input: [1], expected: [1], actual: [1], passed: false, unstable: true },
          ],
          passedCount: 0,
          totalCount: 2,
        };
      }
      if (gate !== 'GATE_METAL') {
        return {
          passed: false,
          error: '一番上の枠には電気を引き寄せる「金属ひねり」を乗せよう！',
          results: [
            { index: 0, label: 'ひねり=0 → 遮断(0)', input: [0], expected: [0], actual: [0], passed: true },
            { index: 1, label: 'ひねり=1 → 電子の橋(1)', input: [1], expected: [1], actual: [0], passed: false },
          ],
          passedCount: 1,
          totalCount: 2,
        };
      }
      return {
        passed: true,
        error: null,
        results: [
          { index: 0, label: 'ひねり=0 → 橋が消えて遮断 (でぐち=0)', input: [0], expected: [0], actual: [0], passed: true },
          { index: 1, label: 'ひねり=1 → 電子の橋が開通！ (でぐち=1)', input: [1], expected: [1], actual: [1], passed: true },
        ],
        passedCount: 2,
        totalCount: 2,
        metrics: { nandCount: 0, nodeCount: 4, wireCount: 0, depth: 0 },
      };
    }

    // physics_pullup
    const { upper, lower } = this.slots;
    if (!upper || !lower) {
      return {
        passed: false,
        error: '上側と下側の2つの枠に部品を入れよう！',
        results: [],
        passedCount: 0,
        totalCount: 2,
      };
    }

    const res0 = this._simPullup(0);
    const res1 = this._simPullup(1);
    const r0 = {
      index: 0,
      label: 'ぬけ=0（底閉じ）→ 電圧5V溜まる (でぐち=1)',
      input: [0],
      expected: [1],
      actual: [res0.out],
      passed: !res0.short && res0.out === 1,
      unstable: res0.short,
    };
    const r1 = {
      index: 1,
      label: 'ぬけ=1（底開き）→ 安全に地面へ抜ける (でぐち=0)',
      input: [1],
      expected: [0],
      actual: [res1.out],
      passed: !res1.short && res1.out === 0,
      unstable: res1.short,
    };

    const passed = r0.passed && r1.passed;
    let error = null;
    if (res0.short || res1.short) {
      error = '💥 ショート（短絡）発生！ 上側に「ていこう（細い道）」を入れないと電池と地面が直結してしまうよ！';
    } else if (!passed) {
      if (upper !== 'RESISTOR') {
        error = '上側には「ていこう（細いパイプ）」を入れて、普段は 1 に引っ張り上げよう！';
      } else if (lower !== 'DRAIN_VALVE') {
        error = '下側には「ぬけスイッチ」を入れて、ぬけ=1 のときだけ地面へ開くようにしよう！';
      } else {
        error = '出力が期待と一致しません。上下の部品の配置を見直してみよう！';
      }
    }

    return {
      passed,
      error,
      unstable: res0.short || res1.short,
      results: [r0, r1],
      passedCount: (r0.passed ? 1 : 0) + (r1.passed ? 1 : 0),
      totalCount: 2,
      metrics: { nandCount: 0, nodeCount: 2, wireCount: 0, depth: 0 },
    };
  }

  _simTransistor(ctrl) {
    const { leftN, rightN, insulator, gate } = this.slots;
    const isShort = insulator === 'GATE_METAL' || (gate === 'GATE_METAL' && insulator === 'N_SILICON');
    const complete =
      leftN === 'N_SILICON' &&
      rightN === 'N_SILICON' &&
      insulator === 'INSULATOR' &&
      gate === 'GATE_METAL';
    const conducting = complete && ctrl === 1;
    return { complete, conducting, short: isShort && ctrl === 1, out: conducting ? 1 : 0 };
  }

  _simPullup(ctrl) {
    const { upper, lower } = this.slots;
    // Upper conductance: WIRE=high(10), RESISTOR=low(1), DRAIN_VALVE=(ctrl?10:0), null=0
    const gUp = upper === 'WIRE' ? 10 : upper === 'RESISTOR' ? 1 : upper === 'DRAIN_VALVE' ? (ctrl ? 10 : 0) : 0;
    // Lower conductance to GND: WIRE=high(10), RESISTOR=low(1), DRAIN_VALVE=(ctrl?10:0), null=0
    const gDn = lower === 'WIRE' ? 10 : lower === 'RESISTOR' ? 1 : lower === 'DRAIN_VALVE' ? (ctrl ? 10 : 0) : 0;

    // Direct low-resistance path from +5V straight to 0V GND = SHORT CIRCUIT!
    if (gUp >= 10 && gDn >= 10) {
      return { voltage: 0, out: 0, short: true, draining: true };
    }
    if (gUp === 0) {
      return { voltage: 0, out: 0, short: false, draining: false };
    }
    if (gDn === 0) {
      return { voltage: 5.0, out: 1, short: false, draining: false };
    }
    const v = 5.0 * (gUp / (gUp + gDn));
    // RESISTOR(1) vs DRAIN_VALVE(10) -> ~0.45V -> cleanly LOW(0)!
    // WIRE(10) vs RESISTOR(1) -> ~4.55V -> HIGH(1)
    // RESISTOR(1) vs RESISTOR(1) -> 2.5V (ambiguous mid-level -> fails cleanly)
    const out = v >= 3.2 ? 1 : 0;
    return { voltage: v, out, short: false, draining: gDn >= 10 };
  }

  _notifyState() {
    if (!this.stage) return;
    if (this.stage.kind === 'physics_transistor') {
      const s = this._simTransistor(this.controlBit);
      this.cb.onLiveState?.({
        inputs: [this.controlBit],
        outputs: [s.out],
        unstable: s.short,
      });
    } else {
      const s = this._simPullup(this.controlBit);
      this.cb.onLiveState?.({
        inputs: [this.controlBit],
        outputs: [s.out],
        unstable: s.short,
      });
    }
  }

  _getSlotDefs() {
    if (this.stage?.kind === 'physics_transistor') {
      return [
        { id: 'leftN', x: 108, y: 186, w: 124, h: 66, label: '左ポケット（いり側）', ideal: 'N_SILICON' },
        { id: 'rightN', x: 408, y: 186, w: 124, h: 66, label: '右ポケット（でぐち側）', ideal: 'N_SILICON' },
        { id: 'insulator', x: 220, y: 152, w: 200, h: 32, label: '中央のうすい壁', ideal: 'INSULATOR' },
        { id: 'gate', x: 242, y: 104, w: 156, h: 44, label: '一番上の電極', ideal: 'GATE_METAL' },
      ];
    }
    return [
      { id: 'upper', x: 214, y: 84, w: 176, h: 66, label: '上側（でんち〜ランプ間）', ideal: 'RESISTOR' },
      { id: 'lower', x: 214, y: 218, w: 176, h: 66, label: '下側（ランプ〜地面間）', ideal: 'DRAIN_VALVE' },
    ];
  }

  _getControlBtnRect() {
    if (this.stage?.kind === 'physics_transistor') {
      return { x: 204, y: 24, w: 232, h: 48 };
    }
    return { x: 24, y: 226, w: 156, h: 52 };
  }

  _placeInSlot(slotId, partId) {
    this.slots[slotId] = partId;
    const placedDef = this._getSlotDefs().find((d) => d.id === slotId);
    if (placedDef) {
      const cx = placedDef.x + placedDef.w / 2;
      const cy = placedDef.y + placedDef.h / 2;
      for (let i = 0; i < 12; i++) {
        const ang = (i / 12) * Math.PI * 2 + Math.random() * 0.3;
        const spd = 42 + Math.random() * 72;
        this.particles.push({
          x: cx,
          y: cy,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          life: 0.5,
          maxLife: 0.5,
          color: placedDef.ideal === partId ? '#52e3b6' : '#ffd166',
        });
      }
    }
    this.armedPart = null;
    this.cb.onArmedChange?.(null);
    this.cb.onSlotsChange?.({ ...this.slots });

    // Immediate friendly feedback if placed in an interesting/wrong spot
    if (this.stage.kind === 'physics_transistor') {
      const def = this._getSlotDefs().find((d) => d.id === slotId);
      if (def && def.ideal !== partId) {
        if (slotId === 'insulator' && partId === 'GATE_METAL') {
          this.feedbackMsg = '⚠ 金属を直接シリコンに乗せるとショートするよ！「ガラスの壁」を挟もう！';
          this.feedbackColor = '#ff7b7b';
        } else {
          this.feedbackMsg = `ヒント：「${def.label}」には別の材料がピッタリかも（枠をタップで外せます）`;
          this.feedbackColor = '#ffd166';
        }
      } else {
        const s = this._simTransistor(this.controlBit);
        if (s.complete) {
          this.feedbackMsg = '✔ 構造完成！ 上の「ひねり」ボタンを押して電子の橋を観察しよう！';
          this.feedbackColor = '#52e3b6';
        } else {
          this.feedbackMsg = 'いいぞ！ 残りの空き枠も埋めてみよう！';
          this.feedbackColor = '#52e3b6';
        }
      }
    } else {
      if (slotId === 'upper' && partId === 'WIRE') {
        this.feedbackMsg = 'おっと！ 上を「ただの導線」にしたぞ。下の「ぬけ」を 1 にすると何が起きるか見てみよう…！';
        this.feedbackColor = '#ffd166';
      } else if (this.slots.upper === 'RESISTOR' && this.slots.lower === 'DRAIN_VALVE') {
        this.feedbackMsg = '✔ バッチリ！ 左の「ぬけ」ボタンを押して 5.0V ↔ 0.0V の変化を確認しよう！';
        this.feedbackColor = '#52e3b6';
      } else {
        this.feedbackMsg = '';
      }
    }

    this._notifyState();
  }

  fitToView() {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width < 20 || rect.height < 20) return;
    const pad = 10;
    this.scale = Math.min((rect.width - pad * 2) / W, (rect.height - pad * 2) / H);
    this.offsetX = (rect.width - W * this.scale) / 2;
    this.offsetY = (rect.height - H * this.scale) / 2;
  }

  _screenToWorld(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left - this.offsetX) / this.scale,
      y: (clientY - rect.top - this.offsetY) / this.scale,
    };
  }

  _bindEvents() {
    this.canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (!this.stage) return;
      const pt = this._screenToWorld(e.clientX, e.clientY);

      // 1. Check live interactive control switch on canvas
      const btn = this._getControlBtnRect();
      if (pt.x >= btn.x - 8 && pt.x <= btn.x + btn.w + 8 && pt.y >= btn.y - 8 && pt.y <= btn.y + btn.h + 8) {
        this.controlBit = this.controlBit ? 0 : 1;
        this.cb.onToggleControl?.(this.controlBit);
        this._notifyState();
        return;
      }

      // 2. Check material slots
      const defs = this._getSlotDefs();
      for (const d of defs) {
        if (pt.x >= d.x - 8 && pt.x <= d.x + d.w + 8 && pt.y >= d.y - 8 && pt.y <= d.y + d.h + 8) {
          if (this.armedPart) {
            this._placeInSlot(d.id, this.armedPart);
            this.cb.onPartPlaced?.();
          } else if (this.slots[d.id]) {
            // Tap an occupied slot with empty hand -> remove part cleanly!
            this.slots[d.id] = null;
            this.feedbackMsg = '';
            this.cb.onPartRemoved?.();
            this.cb.onSlotsChange?.({ ...this.slots });
            this._notifyState();
          }
          return;
        }
      }

      // Tap empty area cancels armed part
      if (this.armedPart) {
        this.armedPart = null;
        this.cb.onArmedChange?.(null);
      }
    });
  }

  start() {
    if (this._raf) return;
    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      this.time += dt;
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.92;
        p.vy *= 0.92;
        p.life -= dt;
        if (p.life <= 0) this.particles.splice(i, 1);
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
    const cw = Math.max(1, Math.round(rect.width * dpr));
    const ch = Math.max(1, Math.round(rect.height * dpr));
    if (this.canvas.width !== cw || this.canvas.height !== ch) {
      this.canvas.width = cw;
      this.canvas.height = ch;
      this.fitToView();
    }
    return { w: rect.width, h: rect.height, dpr };
  }

  render() {
    const { w, h, dpr } = this._resizeIfNeeded();
    if (w < 10 || h < 10 || !this.stage) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#0d131a';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);

    // Outer lab chamber frame
    ctx.fillStyle = '#111a23';
    this._roundRect(ctx, 4, 4, W - 8, H - 8, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(184, 138, 72, 0.42)';
    ctx.lineWidth = 2;
    ctx.stroke();

    if (this.stage.kind === 'physics_transistor') {
      this._renderTransistorLab(ctx);
    } else {
      this._renderPullupLab(ctx);
    }

    for (const p of this.particles) {
      const a = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3 * a + 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();

    // Floating guidance / feedback pill below top-left utility buttons
    if (this.armedPart) {
      const pDef = this.stage.physicsParts?.find((p) => p.id === this.armedPart);
      this._drawBanner(ctx, w, `＋ [${pDef?.name || this.armedPart}] を入れる光る枠をタップ`, '#ffd166');
    } else if (this.feedbackMsg) {
      this._drawBanner(ctx, w, this.feedbackMsg, this.feedbackColor);
    }

    ctx.restore();
  }

  _renderTransistorLab(ctx) {
    const sim = this._simTransistor(this.controlBit);
    const defs = this._getSlotDefs();

    // 1. P-type Silicon Substrate base
    ctx.fillStyle = '#241f36';
    this._roundRect(ctx, 88, 184, 464, 136, 12);
    ctx.fill();
    ctx.strokeStyle = '#6c5a99';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Subtle crystal lattice dots in P-base
    ctx.fillStyle = 'rgba(175, 155, 225, 0.14)';
    for (let x = 110; x < 540; x += 24) {
      for (let y = 264; y < 312; y += 20) {
        ctx.fillRect(x, y, 3, 3);
      }
    }
    ctx.font = 'bold 12px -apple-system, sans-serif';
    ctx.fillStyle = '#b9a6e8';
    ctx.textAlign = 'center';
    ctx.fillText('P型シリコン土台（ふだんは電子が通れない壁）', W / 2, 298);

    // 2. Left fixed input supply (いり = 1) & Right output lamp (でぐち)
    ctx.strokeStyle = '#ffb84d';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(64, 218);
    ctx.lineTo(108, 218);
    ctx.stroke();

    ctx.fillStyle = '#362712';
    this._roundRect(ctx, 16, 194, 52, 48, 8);
    ctx.fill();
    ctx.strokeStyle = '#ffb84d';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('いり', 42, 214);
    ctx.font = 'bold 13px monospace';
    ctx.fillText('1', 42, 232);

    // Right output wire & bulb
    ctx.strokeStyle = sim.conducting ? '#52e3b6' : '#425568';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(532, 218);
    ctx.lineTo(574, 218);
    ctx.stroke();

    ctx.save();
    if (sim.conducting) {
      ctx.shadowColor = 'rgba(82, 227, 182, 0.65)';
      ctx.shadowBlur = 16;
    }
    ctx.fillStyle = sim.conducting ? '#144434' : '#18212b';
    this._roundRect(ctx, 572, 194, 54, 48, 8);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = sim.conducting ? '#52e3b6' : '#45596d';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = sim.conducting ? '#9effdf' : '#8da3b8';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('でぐち', 599, 214);
    ctx.font = 'bold 14px monospace';
    ctx.fillText(sim.conducting ? '1' : '0', 599, 233);
    ctx.restore();

    // 3. Top Interactive Control Switch ('ひねり') + Wire down to Gate
    const btn = this._getControlBtnRect();
    ctx.strokeStyle = this.controlBit ? '#ffd166' : '#4d6073';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(W / 2, btn.y + btn.h);
    ctx.lineTo(W / 2, 104);
    ctx.stroke();

    ctx.fillStyle = this.controlBit ? '#473112' : '#1b2633';
    this._roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 10);
    ctx.fill();
    ctx.strokeStyle = this.controlBit ? '#ffd166' : '#6c859e';
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.fillStyle = this.controlBit ? '#fff3cf' : '#c6d8ea';
    ctx.font = 'bold 14px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      this.controlBit ? '⚡ ひねり：ON (1) ◀タップ' : '🔘 ひねり：OFF (0) ◀タップ',
      btn.x + btn.w / 2,
      btn.y + btn.h / 2
    );

    // 4. Draw Material Slots
    for (const d of defs) {
      this._drawSlot(ctx, d, this.slots[d.id]);
    }

    // 5. LIVE ELECTRON BRIDGE & PARTICLE ANIMATION!
    if (sim.conducting) {
      // Glowing cyan inversion layer bridge right beneath the glass insulator!
      const glow = 0.72 + Math.sin(this.time * 7) * 0.18;
      ctx.fillStyle = `rgba(82, 227, 182, ${glow * 0.42})`;
      this._roundRect(ctx, 228, 186, 184, 24, 6);
      ctx.fill();
      ctx.strokeStyle = '#6ff5ca';
      ctx.lineWidth = 1.6;
      ctx.stroke();

      ctx.font = 'bold 10px sans-serif';
      ctx.fillStyle = '#d9fff3';
      ctx.textAlign = 'center';
      ctx.fillText('✨ 電子の橋が開通！', W / 2, 202);

      // Golden downward electrostatic field arrows from Metal Gate through Glass!
      ctx.fillStyle = 'rgba(255, 209, 102, 0.85)';
      ctx.font = 'bold 13px monospace';
      for (let ax = 265; ax <= 375; ax += 36) {
        const bob = Math.sin(this.time * 6 + ax) * 2;
        ctx.fillText('↓', ax, 173 + bob);
      }

      // Animated flowing electrons streaming Left -> Bridge -> Right!
      for (let i = 0; i < 10; i++) {
        const phase = ((this.time * 0.55 + i / 10) % 1);
        const ex = 122 + phase * 396;
        const ey = phase < 0.25 || phase > 0.75 ? 216 + Math.sin(i * 2.1 + this.time * 5) * 10 : 198 + Math.sin(i + this.time * 8) * 4;
        ctx.beginPath();
        ctx.arc(ex, ey, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#9effdf';
        ctx.fill();
      }
    } else if (this.slots.leftN === 'N_SILICON') {
      // Electrons trapped in Left N-pocket bouncing against P-type wall!
      for (let i = 0; i < 6; i++) {
        const ex = 126 + ((i * 19 + Math.sin(this.time * 3 + i) * 14) % 86);
        const ey = 206 + ((i * 13) % 32);
        ctx.beginPath();
        ctx.arc(ex, ey, 3.6, 0, Math.PI * 2);
        ctx.fillStyle = '#64d8cb';
        ctx.fill();
      }
      if (sim.complete && this.controlBit === 0) {
        ctx.font = 'bold 11px sans-serif';
        ctx.fillStyle = '#b9a6e8';
        ctx.textAlign = 'center';
        ctx.fillText('✖ 橋がないため遮断中（上の「ひねり」をONにしてみよう！）', W / 2, 232);
      }
    }

    if (sim.short) {
      this._drawSparks(ctx, W / 2, 168);
    }
  }

  _renderPullupLab(ctx) {
    const sim = this._simPullup(this.controlBit);
    const defs = this._getSlotDefs();

    // 1. Top Battery Rail (+5.0V = 1)
    ctx.fillStyle = '#3d2c12';
    this._roundRect(ctx, 184, 22, 236, 40, 8);
    ctx.fill();
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#fff1c9';
    ctx.font = 'bold 13px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🔋 でんち電源 (+5.0V / いつも 1)', 302, 42);

    // Pipe: Battery -> Upper Slot
    ctx.strokeStyle = '#ffb84d';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(302, 62);
    ctx.lineTo(302, 84);
    ctx.stroke();

    // Pipe: Upper Slot -> Middle Junction -> Lower Slot
    const midColor = sim.short ? '#ff5252' : sim.out ? '#52e3b6' : '#4a6075';
    ctx.strokeStyle = midColor;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(302, 150);
    ctx.lineTo(302, 218);
    // Branch right to Output Lamp & Voltage Meter
    ctx.moveTo(302, 184);
    ctx.lineTo(462, 184);
    ctx.stroke();

    // Pipe: Lower Slot -> Earth Ground (0V)
    ctx.strokeStyle = sim.short ? '#ff5252' : sim.draining ? '#ffb84d' : '#3c4f61';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(302, 284);
    ctx.lineTo(302, 310);
    ctx.stroke();

    // Earth Ground Symbol (⏚ 地面 0V)
    ctx.strokeStyle = '#8ea5bc';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(266, 310);
    ctx.lineTo(338, 310);
    ctx.moveTo(280, 318);
    ctx.lineTo(324, 318);
    ctx.moveTo(293, 326);
    ctx.lineTo(311, 326);
    ctx.stroke();
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = '#9bb0c4';
    ctx.textAlign = 'center';
    ctx.fillText('⏚ 地面アース（0V：電気の逃げ場）', 302, 344);

    // 2. Right Voltage Meter + Output Lamp ('でぐち')
    ctx.save();
    if (sim.out && !sim.short) {
      ctx.shadowColor = 'rgba(82, 227, 182, 0.5)';
      ctx.shadowBlur = 16;
    }
    ctx.fillStyle = sim.short ? '#4a1717' : sim.out ? '#133d2f' : '#18212b';
    this._roundRect(ctx, 462, 130, 156, 112, 10);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = sim.short ? '#ff5252' : sim.out ? '#52e3b6' : '#44586c';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = sim.short ? '#ff9c9c' : '#b7cee2';
    ctx.fillText('💡 出力（でぐち）', 540, 152);

    ctx.font = 'bold 26px monospace';
    ctx.fillStyle = sim.short ? '#ff6b6b' : sim.out ? '#6ff5ca' : '#7b92a8';
    ctx.fillText(sim.short ? 'SHORT!' : `${sim.voltage.toFixed(1)}V`, 540, 186);

    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = sim.short ? '#ffaaaa' : sim.out ? '#d8fff2' : '#96adc2';
    ctx.fillText(
      sim.short ? '💥 焼損エラー！' : sim.out ? '出力 = 1（点灯）' : '出力 = 0（消灯）',
      540,
      218
    );
    ctx.restore();

    // 3. Left Interactive Control Switch ('ぬけ')
    const btn = this._getControlBtnRect();
    ctx.strokeStyle = this.controlBit ? '#ffd166' : '#4a5d70';
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(btn.x + btn.w, btn.y + btn.h / 2);
    ctx.lineTo(214, btn.y + btn.h / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = this.controlBit ? '#473112' : '#1b2633';
    this._roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 10);
    ctx.fill();
    ctx.strokeStyle = this.controlBit ? '#ffd166' : '#6c859e';
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.fillStyle = this.controlBit ? '#fff3cf' : '#c6d8ea';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.controlBit ? '🕳 ぬけ：1 (開)' : '🔒 ぬけ：0 (閉)', btn.x + btn.w / 2, btn.y + 18);
    ctx.font = '10.5px sans-serif';
    ctx.fillStyle = '#ffb84d';
    ctx.fillText('◀ タップで切替', btn.x + btn.w / 2, btn.y + 37);

    // 4. Draw Material Slots
    for (const d of defs) {
      this._drawSlot(ctx, d, this.slots[d.id]);
    }

    // 5. Flowing Current Particles (visualizing pressure vs draining to earth!)
    if (sim.short) {
      this._drawSparks(ctx, 302, 184);
      this._drawSparks(ctx, 302, 118);
    } else if (sim.draining && this.slots.upper === 'RESISTOR') {
      // Safe steady drain straight down into earth!
      for (let i = 0; i < 6; i++) {
        const py = 68 + (((this.time * 95 + i * 40) % 240));
        ctx.beginPath();
        ctx.arc(302, py, 3.8, 0, Math.PI * 2);
        ctx.fillStyle = '#ffd166';
        ctx.fill();
      }
    } else if (sim.out === 1) {
      // Pressure flowing sideways into the Output Lamp!
      for (let i = 0; i < 4; i++) {
        const px = 310 + (((this.time * 70 + i * 38) % 148));
        ctx.beginPath();
        ctx.arc(px, 184, 3.8, 0, Math.PI * 2);
        ctx.fillStyle = '#8fffdc';
        ctx.fill();
      }
    }
  }

  _drawSlot(ctx, def, partId) {
    const pDef = partId ? this.stage.physicsParts?.find((p) => p.id === partId) : null;
    const pulsing = Boolean(this.armedPart && !partId);

    ctx.save();
    if (!pDef) {
      // Empty dashed target slot
      ctx.fillStyle = pulsing ? 'rgba(255, 184, 77, 0.14)' : 'rgba(13, 21, 30, 0.72)';
      this._roundRect(ctx, def.x, def.y, def.w, def.h, 8);
      ctx.fill();
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = pulsing
        ? `rgba(255, 209, 102, ${0.65 + Math.sin(this.time * 7) * 0.3})`
        : 'rgba(130, 160, 190, 0.55)';
      ctx.lineWidth = pulsing ? 2.5 : 1.6;
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.font = 'bold 11.5px -apple-system, sans-serif';
      ctx.fillStyle = pulsing ? '#ffd166' : '#8ea5bc';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(def.label, def.x + def.w / 2, def.y + def.h / 2);
    } else {
      // Installed physical layer/component!
      ctx.fillStyle = pDef.color;
      this._roundRect(ctx, def.x, def.y, def.w, def.h, 8);
      ctx.fill();
      ctx.strokeStyle = pDef.accent;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Custom internal micro-illustration for RESISTOR / WIRE / DRAIN_VALVE
      const cx = def.x + def.w / 2;
      const cy = def.y + def.h / 2;
      if (partId === 'RESISTOR') {
        ctx.strokeStyle = '#d4f3ff';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(cx - 34, cy - 10);
        ctx.lineTo(cx - 22, cy - 18);
        ctx.lineTo(cx - 10, cy - 2);
        ctx.lineTo(cx + 2, cy - 18);
        ctx.lineTo(cx + 14, cy - 2);
        ctx.lineTo(cx + 26, cy - 18);
        ctx.lineTo(cx + 34, cy - 10);
        ctx.stroke();
        ctx.font = 'bold 12px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText('ていこう（細い道）', cx, cy + 18);
      } else if (partId === 'WIRE') {
        ctx.strokeStyle = '#ffd166';
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(cx, def.y + 6);
        ctx.lineTo(cx, def.y + def.h - 24);
        ctx.stroke();
        ctx.font = 'bold 12px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText('ただの導線（太い線）', cx, cy + 18);
      } else if (partId === 'DRAIN_VALVE') {
        const open = this.controlBit === 1;
        ctx.strokeStyle = open ? '#ffd166' : '#d0dce8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx - 16, cy - 8);
        ctx.lineTo(cx + 16, open ? cy - 8 : cy - 20);
        ctx.stroke();
        ctx.font = 'bold 12px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(open ? 'ぬけスイッチ（全開！）' : 'ぬけスイッチ（閉じ）', cx, cy + 18);
      } else {
        ctx.font = 'bold 12.5px -apple-system, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(pDef.name, cx, cy);
      }
    }
    ctx.restore();
  }

  _drawSparks(ctx, cx, cy) {
    ctx.save();
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2 + this.time * 12;
      const r1 = 8;
      const r2 = 16 + Math.sin(this.time * 25 + i) * 7;
      ctx.strokeStyle = i % 2 === 0 ? '#ff5252' : '#ffd166';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1);
      ctx.lineTo(cx + Math.cos(ang) * r2, cy + Math.sin(ang) * r2);
      ctx.stroke();
    }
    ctx.restore();
  }

  _drawBanner(ctx, w, text, accent) {
    ctx.save();
    ctx.font = 'bold 11.5px -apple-system, BlinkMacSystemFont, "Hiragino Sans", sans-serif';
    const tw = Math.min(w - 16, ctx.measureText(text).width + 22);
    const x = (w - tw) / 2;
    const y = 44;
    ctx.fillStyle = 'rgba(12, 18, 25, 0.94)';
    this._roundRect(ctx, x, y, tw, 26, 13);
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = accent;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, y + 13.5, tw - 14);
    ctx.restore();
  }

  _roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }
}
