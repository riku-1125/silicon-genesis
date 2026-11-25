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

import { runRomProgram, evaluateRomStage } from '../engine/romRunner.js?v=41';

const W = 640;
const H = 360;
const PORTRAIT_ASM_W = 374;
const PORTRAIT_ASM_H = 548;

export class PhysicsLabCanvas {
  constructor(canvas, callbacks = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cb = callbacks;

    this.stage = null;
    this.customChips = {};
    this.slots = {};       // slotId -> partId | null
    this.armedPart = null; // partId | null
    this.controlBit = 0;   // 'ひねり' (00-A) or 'ぬけ' (00-B)
    this.awaitingFinalClock = false;
    this.portraitMode = false;
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

  setStage(stage, savedSlots = null, customChips = null) {
    this.stage = stage;
    if (customChips) this.customChips = customChips;
    this.armedPart = null;
    this.controlBit = 0;
    this.awaitingFinalClock = false;
    this.feedbackMsg = '';

    if (stage.kind === 'physics_transistor') {
      this.slots = {
        leftN: savedSlots?.leftN || null,
        rightN: savedSlots?.rightN || null,
        insulator: savedSlots?.insulator || null,
        gate: savedSlots?.gate || null,
      };
    } else if (stage.kind === 'assembly_program') {
      this.slots = {};
      for (const r of stage.asmProgramSpec?.rows || []) {
        if (!r.locked) {
          this.slots[r.slotId] = savedSlots?.[r.slotId] || null;
        }
      }
      this._resetAsmState();
    } else {
      this.slots = {
        upper: savedSlots?.upper || null,
        lower: savedSlots?.lower || null,
      };
    }

    this.fitToView();
    this._notifyState();
  }

  _resetAsmState() {
    this.asmTrace = [];
    this.awaitingFinalClock = false;
    this.asmState = {
      pc: 0,
      pcNext: 0,
      accBefore: 0,
      acc: 0,
      z: 1,
      opcodeBits: '00',
      immBits: '0000',
      opName: '待機中',
      setFlag: 0,
      opFlag: 0,
      weFlag: 0,
      brFlag: 0,
      jmpFired: false,
      unstable: false,
      stepIdx: -1,
    };
  }

  setAwaitingFinalClock(awaiting) {
    this.awaitingFinalClock = Boolean(awaiting);
    if (this.awaitingFinalClock) {
      const rows = this.stage?.asmProgramSpec?.rows || [];
      const finalAddr = rows.length > 0 ? rows[rows.length - 1].addr : 3;
      this.feedbackMsg =
        `⚡ カウントダウン 0 達成・${finalAddr}番地到達！ 右上の「⚡最終開門クロック」または右下ボタンを押して大ハッチ全開信号 1111(15) を送出せよ！`;
      this.feedbackColor = '#ffd166';
    }
  }

  setArmedPart(partId) {
    this.armedPart = partId;
    this.cb.onArmedChange?.(this.armedPart);
  }

  setControlBit(val) {
    if (this.stage?.kind === 'assembly_program') {
      if (Array.isArray(this.asmTrace) && this.asmTrace[val]) {
        this.asmState = { ...this.asmTrace[val] };
      }
      this._notifyState();
      return;
    }
    this.controlBit = val ? 1 : 0;
    this._notifyState();
  }

  clearAll() {
    for (const k of Object.keys(this.slots)) {
      this.slots[k] = null;
    }
    if (this.stage?.kind === 'assembly_program') {
      this._resetAsmState();
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

  /** Evaluates the current physical assembly or ROM assembly program. */
  evaluatePhysics() {
    if (!this.stage) return { passed: false, results: [], error: 'ステージ未読込' };

    if (this.stage.kind === 'assembly_program') {
      return this._evaluateAssemblyProgram();
    }

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
        error = '下側にはさっき00-Aで作った「じゃぐち(排水)」を入れて、ぬけ=1 のときだけ地面へ開くようにしよう！';
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
    if (this.stage.kind === 'assembly_program') {
      const acc = this.asmState?.acc ?? 0;
      this.cb.onLiveState?.({
        inputs: [this.asmState?.pc ?? 0],
        outputs: [acc & 1, (acc >> 1) & 1, (acc >> 2) & 1, (acc >> 3) & 1],
        unstable: false,
      });
      return;
    }
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

  _isPortraitAssembly() {
    return this.stage?.kind === 'assembly_program' && this.portraitMode;
  }

  _getBoardSize() {
    if (this._isPortraitAssembly()) {
      return { w: PORTRAIT_ASM_W, h: PORTRAIT_ASM_H };
    }
    return { w: W, h: H };
  }

  _getSlotDefs() {
    if (this.stage?.kind === 'assembly_program') {
      const rows = this.stage.asmProgramSpec?.rows || [];
      const n = Math.max(1, rows.length);
      const isPortrait = this._isPortraitAssembly();
      const rowH = isPortrait ? (n <= 3 ? 88 : 58) : (n <= 3 ? 44 : 33);
      const gap = isPortrait ? (n <= 3 ? 12 : 5) : (n <= 3 ? 8 : 5);
      const startY = isPortrait ? 226 : 166;
      const sx = isPortrait ? 12 : 176;
      const sw = isPortrait ? PORTRAIT_ASM_W - 24 : 444;
      const defs = [];
      rows.forEach((r, idx) => {
        if (!r.locked) {
          defs.push({
            id: r.slotId,
            x: sx,
            y: startY + idx * (rowH + gap),
            w: sw,
            h: rowH,
            label: r.label,
            ideal: r.ideal,
            addr: r.addr,
          });
        }
      });
      return defs;
    }
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
    if (this.stage?.kind === 'assembly_program') {
      if (this._isPortraitAssembly()) {
        return { x: 214, y: 13, w: 144, h: 34 };
      }
      return { x: 492, y: 14, w: 132, h: 32 };
    }
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

    if (this.stage.kind === 'assembly_program') {
      const rows = (this.stage.asmProgramSpec?.rows || []).filter((r) => !r.locked);
      const allFilled = rows.every((r) => Boolean(this.slots[r.slotId]));
      this._resetAsmState();
      if (allFilled) {
        this.feedbackMsg = '✔ 全番地の命令セット完了！「⚡1行実行」または右下の「▶テスト実行」で動かそう！';
        this.feedbackColor = '#52e3b6';
      } else {
        this.feedbackMsg = '命令カードをセットしました！ 残りの番地も埋めよう';
        this.feedbackColor = '#6fcf97';
      }
      this._notifyState();
      return;
    }

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
    // Switch Assembly stages into dedicated portrait-native layout on vertical phones & portrait tablets!
    this.portraitMode = rect.height > rect.width * 1.02;
    const { w: bw, h: bh } = this._getBoardSize();
    const padX = this._isPortraitAssembly() ? 6 : 10;
    const padTop = this._isPortraitAssembly() ? 40 : 38;
    const padBottom = this._isPortraitAssembly() ? 6 : 10;
    this.scale = Math.min((rect.width - padX * 2) / bw, (rect.height - padTop - padBottom) / bh);
    this.offsetX = (rect.width - bw * this.scale) / 2;
    this.offsetY = padTop + (rect.height - padTop - padBottom - bh * this.scale) / 2;
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
        if (this.stage.kind === 'assembly_program') {
          this._stepAssemblyInteractive();
          this.cb.onToggleControl?.(1);
          this._notifyState();
          return;
        }
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
            this.feedbackMsg = '部品を外しました（下の材料をタップして配置できます）';
            this.feedbackColor = '#9bb0c4';
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
    const { w: bw, h: bh } = this._getBoardSize();
    ctx.fillStyle = '#111a23';
    this._roundRect(ctx, 4, 4, bw - 8, bh - 8, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(184, 138, 72, 0.42)';
    ctx.lineWidth = 2;
    ctx.stroke();

    if (this.stage.kind === 'physics_transistor') {
      this._renderTransistorLab(ctx);
    } else if (this.stage.kind === 'assembly_program') {
      if (this._isPortraitAssembly()) {
        this._renderAssemblyLabPortrait(ctx);
      } else {
        this._renderAssemblyLab(ctx);
      }
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
      const label = pDef?.meta ? `${pDef.name}｜${pDef.meta}` : (pDef?.name || this.armedPart);
      this._drawBanner(ctx, w, `＋ [${label}] を入れる光る枠をタップ`, '#ffd166');
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
        ctx.fillStyle = '#d3c4fa';
        ctx.textAlign = 'center';
        ctx.fillText('✖ 橋がないため遮断中（上の「ひねり」をONにしてみよう！）', W / 2, 272, 440);
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
        ctx.font = 'bold 11.5px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(open ? 'じゃぐちTR（排水全開！）' : 'じゃぐちTR（閉じ）', cx, cy + 18);
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
    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Hiragino Sans", sans-serif';
    const leftSafe = 84; // Clear of top-left ⌖ / ✕ utility buttons
    const rightSafe = 10;
    const availW = Math.max(120, w - leftSafe - rightSafe);
    const tw = Math.min(availW, ctx.measureText(text).width + 20);
    const x = leftSafe + (availW - tw) / 2;
    const y = 8;
    ctx.fillStyle = 'rgba(12, 18, 25, 0.94)';
    this._roundRect(ctx, x, y, tw, 25, 12.5);
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = accent;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + tw / 2, y + 13, tw - 12);
    ctx.restore();
  }

  // =========================================================================
  // ASSEMBLY PROGRAM WORKBENCH (ACT VII — STAGES 22..24)
  // =========================================================================
  _buildAssemblyTrace() {
    return runRomProgram(this.stage, this.slots, this.customChips, { maxCycles: 14 });
  }

  _stepAssemblyInteractive() {
    if (this.awaitingFinalClock) {
      this.cb.onFinalClockTriggered?.();
      return;
    }

    const run = this._buildAssemblyTrace();
    const { trace, unstable, hitMaxCycles, compileError } = run;
    this.asmTrace = trace;

    if (compileError) {
      this.feedbackMsg = `⚠ 自作CPUエラー: ${compileError}`;
      this.feedbackColor = '#ff7b7b';
      return;
    }
    if (trace.length === 0) {
      this.feedbackMsg = 'まずは下のパレットから0番地に命令カードを配置しよう！';
      this.feedbackColor = '#ffd166';
      return;
    }

    const nextIdx = ((this.asmState?.stepIdx ?? -1) + 1) % trace.length;
    this.asmState = { ...trace[nextIdx] };

    if (this.asmState.unstable || (unstable && nextIdx === trace.length - 1)) {
      this.feedbackMsg = `💥 ステップ ${nextIdx + 1}/${trace.length}：自作チップ内部で信号発振（無限ループ）を検出！`;
      this.feedbackColor = '#ff7b7b';
    } else if (hitMaxCycles && nextIdx === trace.length - 1) {
      this.feedbackMsg = `⏱ ステップ ${nextIdx + 1}/${trace.length}（上限到達）：${this.asmState.label}`;
      this.feedbackColor = '#ffd166';
    } else {
      this.feedbackMsg = `⚡ 実行ステップ ${nextIdx + 1}/${trace.length}：${this.asmState.label}`;
      this.feedbackColor = '#52e3b6';
    }
  }

  _evaluateAssemblyProgram() {
    const res = evaluateRomStage(this.stage, this.slots, this.customChips);
    this.asmTrace = res.trace || [];
    return res;
  }

  _renderAssemblyLabPortrait(ctx) {
    const pw = PORTRAIT_ASM_W;
    const spec = this.stage?.asmProgramSpec;
    const rows = spec?.rows || [];
    const st = this.asmState || {
      pc: 0,
      pcNext: 0,
      accBefore: 0,
      acc: 0,
      z: 1,
      opcodeBits: '00',
      immBits: '0000',
      opName: '待機中',
      setFlag: 0,
      opFlag: 0,
      weFlag: 0,
      brFlag: 0,
      jmpFired: false,
      stepIdx: -1,
    };

    // -------------------------------------------------------------------------
    // 1. UPPER CARD: 2x2 LARGE-FONT ARK4_SYS HARDWARE MONITOR (y = 10..184)
    // -------------------------------------------------------------------------
    ctx.fillStyle = '#0b1219';
    this._roundRect(ctx, 10, 10, pw - 20, 174, 10);
    ctx.fill();
    ctx.strokeStyle = this.awaitingFinalClock ? '#ffd166' : 'rgba(86, 204, 242, 0.42)';
    ctx.lineWidth = this.awaitingFinalClock ? 2.2 : 1.6;
    ctx.stroke();

    // Header Title + Big Tactile Step Button
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 12.5px -apple-system, BlinkMacSystemFont, "Hiragino Sans", sans-serif';
    ctx.fillStyle = this.awaitingFinalClock ? '#ffd166' : '#8ee5ff';
    ctx.fillText('🖥 自作CPU [ARK4_SYS]', 18, 24, 190);
    ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Hiragino Sans", sans-serif';
    ctx.fillStyle = this.awaitingFinalClock ? '#ffe599' : '#8fa9c2';
    ctx.fillText(
      this.awaitingFinalClock ? '⚡ 最終開門クロック待機中！' : '実機回路ライブ稼働モニタ',
      18,
      39,
      190
    );

    const btn = this._getControlBtnRect();
    ctx.fillStyle = this.awaitingFinalClock ? '#9b5f12' : '#183b50';
    this._roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 8);
    ctx.fill();
    ctx.strokeStyle = this.awaitingFinalClock ? '#ffd166' : '#56ccf2';
    ctx.lineWidth = this.awaitingFinalClock ? 2.2 : 1.8;
    ctx.stroke();
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Hiragino Sans", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      this.awaitingFinalClock ? '⚡ 最終開門CLK' : '⚡ 1行実行 (CLK)',
      btn.x + btn.w / 2,
      btn.y + btn.h / 2
    );

    const accBits = ((st.acc & 15) >>> 0).toString(2).padStart(4, '0');

    // Tile 1 (Top-Left): ARK4_CPU (ACC Calculation & Memory)
    ctx.fillStyle = '#241b16';
    this._roundRect(ctx, 16, 52, 168, 60, 8);
    ctx.fill();
    ctx.strokeStyle = '#ffbe76';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.font = 'bold 10.5px -apple-system, sans-serif';
    ctx.fillStyle = '#ffe4c4';
    ctx.textAlign = 'center';
    ctx.fillText('ARK4_CPU（計算・記憶）', 100, 64);
    ctx.font = 'bold 15px monospace';
    ctx.fillStyle = '#ffd166';
    ctx.fillText(
      st.stepIdx >= 0 ? `ACC: ${st.accBefore ?? 0} → ${st.acc}` : `ACC = ${st.acc}`,
      100,
      84
    );
    ctx.font = 'bold 10.5px monospace';
    ctx.fillStyle = '#ffbe76';
    ctx.fillText(`(${accBits}) ${st.opName}`, 100, 102, 158);

    // Tile 2 (Top-Right): COND_PC (Program Counter)
    ctx.fillStyle = st.jmpFired ? '#14382c' : '#141f2c';
    this._roundRect(ctx, 190, 52, 168, 60, 8);
    ctx.fill();
    ctx.strokeStyle = st.jmpFired ? '#52e3b6' : '#56ccf2';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.font = 'bold 10.5px -apple-system, sans-serif';
    ctx.fillStyle = '#d6f4ff';
    ctx.fillText('COND_PC（行番号）', 274, 64);
    ctx.font = 'bold 14.5px monospace';
    ctx.fillStyle = '#ffd166';
    ctx.fillText(
      st.stepIdx >= 0 ? `PC: ${st.pc} → ${st.pcNext}番` : `PC = ${st.pc}番地`,
      274,
      84
    );
    ctx.font = 'bold 10.5px -apple-system, sans-serif';
    ctx.fillStyle = st.jmpFired ? '#72f2c8' : '#9bb4cc';
    ctx.fillText(
      st.jmpFired ? '⚡ JNZジャンプ発火!' : '通常 +1 進行',
      274,
      102,
      158
    );

    // Tile 3 (Bottom-Left): INST_DEC (Instruction Decoder)
    ctx.fillStyle = '#141f2c';
    this._roundRect(ctx, 16, 118, 168, 58, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(86, 204, 242, 0.72)';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.font = 'bold 10.5px -apple-system, sans-serif';
    ctx.fillStyle = '#d6f4ff';
    ctx.fillText('INST_DEC（翻訳）', 100, 130);
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = '#ffd166';
    ctx.fillText(
      `機械語 ${st.opcodeBits}:${st.immBits}`,
      100,
      147,
      158
    );
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = '#8ee5ff';
    ctx.fillText(`OP=${st.opFlag} SET=${st.setFlag} WE=${st.weFlag} BR=${st.brFlag}`, 100, 164, 158);

    // Tile 4 (Bottom-Right): ZERO_4B (Zero Detector)
    ctx.fillStyle = st.z ? '#11382b' : '#141e28';
    this._roundRect(ctx, 190, 118, 168, 58, 8);
    ctx.fill();
    ctx.strokeStyle = st.z ? '#52e3b6' : '#4a6076';
    ctx.lineWidth = st.z ? 2 : 1.5;
    ctx.stroke();
    ctx.font = 'bold 10.5px -apple-system, sans-serif';
    ctx.fillStyle = st.z ? '#d0fff0' : '#bfd2e4';
    ctx.fillText('ZERO_4B（ゼロ検知）', 274, 130);
    ctx.font = 'bold 15px monospace';
    ctx.fillStyle = st.z ? '#72f2c8' : '#859db3';
    ctx.fillText(`Z = ${st.z}`, 274, 148);
    ctx.font = 'bold 10.5px -apple-system, sans-serif';
    ctx.fillStyle = st.z ? '#a8ffe2' : '#859db3';
    ctx.fillText(st.z ? 'Z=1 (JNZ不発・通過)' : 'Z=0 (非ゼロ→JNZ発火)', 274, 165, 158);

    // -------------------------------------------------------------------------
    // 2. LOWER SECTION: LARGE FULL-WIDTH ROM PROGRAM CARDS (y = 192..516)
    // -------------------------------------------------------------------------
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 12.5px -apple-system, BlinkMacSystemFont, "Hiragino Sans", sans-serif';
    ctx.fillStyle = '#ffd166';
    ctx.fillText('📜 ROM 命令メモリ表', 12, 198);

    ctx.textAlign = 'right';
    ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Hiragino Sans", sans-serif';
    ctx.fillStyle = '#97b0c7';
    ctx.fillText('タップで配置 ／ 外す', pw - 12, 198);

    ctx.textAlign = 'left';
    ctx.font = 'bold 10.5px -apple-system, BlinkMacSystemFont, "Hiragino Sans", sans-serif';
    ctx.fillStyle = '#7ef2cb';
    ctx.fillText(spec?.goalTitle || '', 12, 215, pw - 24);

    const n = Math.max(1, rows.length);
    const spacious = n <= 3;
    const rowH = spacious ? 88 : 58;
    const gap = spacious ? 12 : 5;
    const startY = 226;
    const sx = 12;
    const sw = pw - 24;

    const finalAddr = rows.length > 0 ? rows[rows.length - 1].addr : 3;
    rows.forEach((r, idx) => {
      const ry = startY + idx * (rowH + gap);
      const isAwaitingOpenRow = this.awaitingFinalClock && r.addr === finalAddr;
      const isCurrentPc = isAwaitingOpenRow || (st.stepIdx >= 0 && st.pc === r.addr);
      const part = r.locked
        ? r.fixedPart
        : (this.stage.physicsParts || []).find((p) => p.id === this.slots[r.slotId]) || null;

      if (part) {
        ctx.fillStyle = isAwaitingOpenRow
          ? '#3b280d'
          : isCurrentPc
            ? '#133229'
            : r.locked
              ? '#17202b'
              : '#1b2836';
        this._roundRect(ctx, sx, ry, sw, rowH, 9);
        ctx.fill();
        ctx.strokeStyle = isAwaitingOpenRow
          ? '#ffd166'
          : isCurrentPc
            ? '#52e3b6'
            : (part.accent || '#56ccf2');
        ctx.lineWidth = isCurrentPc ? 2.4 : 1.6;
        ctx.stroke();

        // Top meta line inside card: Address + Role + Machine Code
        const topY = ry + (spacious ? 17 : 13);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.font = `bold ${spacious ? 12 : 11.5}px monospace`;
        ctx.fillStyle = isAwaitingOpenRow ? '#ffe599' : isCurrentPc ? '#72f2c8' : '#ffd166';
        const addrLabel = `${isCurrentPc ? '▶' : ''}[${r.addr}番地]`;
        ctx.fillText(addrLabel, sx + 10, topY);

        const addrW = ctx.measureText(addrLabel).width;
        ctx.font = `${spacious ? 11 : 10}px -apple-system, BlinkMacSystemFont, "Hiragino Sans", sans-serif`;
        ctx.fillStyle = '#b4c9dd';
        ctx.fillText(
          r.label || (r.locked ? '固定命令' : ''),
          sx + 16 + addrW,
          topY,
          sw - addrW - 114
        );

        ctx.textAlign = 'right';
        ctx.font = `bold ${spacious ? 10.5 : 10}px monospace`;
        ctx.fillStyle = '#8ee5ff';
        const codeStr = r.locked
          ? `${part.opcodeBits}:${part.immBits} [固定]`
          : `${part.opcodeBits}:${part.immBits}`;
        ctx.fillText(codeStr, sx + sw - 10, topY);

        // Main command row: Colored Mnemonic Pill + 2 clean un-squeezed lines (Japanese meaning + rule)
        if (spacious) {
          ctx.fillStyle = part.color || '#28527a';
          this._roundRect(ctx, sx + 10, ry + 32, 88, 42, 7);
          ctx.fill();
          ctx.font = 'bold 15px monospace';
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.fillText(part.name, sx + 54, ry + 53);

          ctx.textAlign = 'left';
          ctx.font = 'bold 13.5px -apple-system, BlinkMacSystemFont, "Hiragino Sans", sans-serif';
          ctx.fillStyle = '#ffe8a8';
          ctx.fillText(part.meta || part.name, sx + 108, ry + 43, sw - 118);

          ctx.font = '11px -apple-system, BlinkMacSystemFont, "Hiragino Sans", sans-serif';
          ctx.fillStyle = '#e5f1fc';
          ctx.fillText(part.rule || '', sx + 108, ry + 64, sw - 118);
        } else {
          ctx.fillStyle = part.color || '#28527a';
          this._roundRect(ctx, sx + 10, ry + 23, 76, 28, 6);
          ctx.fill();
          ctx.font = 'bold 12.5px monospace';
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.fillText(part.name, sx + 48, ry + 37);

          const niceMeta =
            part.meta && !part.meta.includes('機械語')
              ? part.meta
              : part.op === 'JNZ'
                ? `≠0なら${part.val}番地へ飛ぶ`
                : part.name;

          ctx.textAlign = 'left';
          ctx.font = 'bold 11.5px -apple-system, BlinkMacSystemFont, "Hiragino Sans", sans-serif';
          ctx.fillStyle = '#ffe8a8';
          ctx.fillText(niceMeta, sx + 94, ry + 30, sw - 104);

          ctx.font = '10px -apple-system, BlinkMacSystemFont, "Hiragino Sans", sans-serif';
          ctx.fillStyle = '#dceaf7';
          ctx.fillText(part.rule || '', sx + 94, ry + 45, sw - 104);
        }
      } else {
        const isArmed = Boolean(this.armedPart);
        ctx.fillStyle = isArmed ? 'rgba(255, 209, 102, 0.12)' : 'rgba(14, 22, 31, 0.8)';
        this._roundRect(ctx, sx, ry, sw, rowH, 9);
        ctx.fill();
        ctx.save();
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = isArmed ? '#ffd166' : '#405a75';
        ctx.lineWidth = isArmed ? 2.2 : 1.6;
        ctx.stroke();
        ctx.restore();

        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.font = `bold ${spacious ? 12 : 11.5}px monospace`;
        ctx.fillStyle = '#ffd166';
        ctx.fillText(`[${r.addr}番地]`, sx + 10, ry + (spacious ? 20 : 15));

        ctx.font = `${spacious ? 11.5 : 10.5}px -apple-system, BlinkMacSystemFont, "Hiragino Sans", sans-serif`;
        ctx.fillStyle = '#b4c9dd';
        ctx.fillText(r.label || '', sx + 74, ry + (spacious ? 20 : 15), sw - 86);

        ctx.textAlign = 'center';
        ctx.font = `bold ${spacious ? 13 : 11.5}px -apple-system, BlinkMacSystemFont, "Hiragino Sans", sans-serif`;
        ctx.fillStyle = isArmed ? '#ffe599' : '#8da7c0';
        ctx.fillText(
          isArmed ? '＋ ここをタップして命令カードをセット！' : '（空欄：下の命令カードを選んでここをタップ）',
          sx + sw / 2,
          ry + (spacious ? 54 : 37),
          sw - 20
        );
      }
    });
  }

  _renderAssemblyLab(ctx) {
    const spec = this.stage?.asmProgramSpec;
    const rows = spec?.rows || [];
    const st = this.asmState || {
      pc: 0,
      pcNext: 0,
      accBefore: 0,
      acc: 0,
      z: 1,
      opcodeBits: '00',
      immBits: '0000',
      opName: '待機中',
      setFlag: 0,
      opFlag: 0,
      weFlag: 0,
      brFlag: 0,
      jmpFired: false,
      stepIdx: -1,
    };

    // -------------------------------------------------------------------------
    // 1. UPPER HALF: LIVE ARK4_SYS VON NEUMANN HARDWARE MONITOR (y = 12..140)
    // -------------------------------------------------------------------------
    ctx.fillStyle = '#0b1219';
    this._roundRect(ctx, 14, 12, W - 28, 126, 9);
    ctx.fill();
    ctx.strokeStyle = this.awaitingFinalClock ? '#ffd166' : 'rgba(86, 204, 242, 0.38)';
    ctx.lineWidth = this.awaitingFinalClock ? 2.2 : 1.5;
    ctx.stroke();

    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = this.awaitingFinalClock ? '#ffd166' : '#8ee5ff';
    ctx.textAlign = 'left';
    ctx.fillText(
      this.awaitingFinalClock
        ? `⚡ [ARK4_SYS] ${rows.length > 0 ? rows[rows.length - 1].addr : 3}番地・最終開門クロック待機中！（右上のボタンで全開信号送出）`
        : '🖥 あなたの自作ノイマン型計算機 [ARK4_SYS] ライブ稼働モニタ',
      24,
      28
    );

    // Interactive Step Button (top-right inside monitor)
    const btn = this._getControlBtnRect();
    ctx.fillStyle = this.awaitingFinalClock ? '#8f5812' : '#183446';
    this._roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 7);
    ctx.fill();
    ctx.strokeStyle = this.awaitingFinalClock ? '#ffd166' : '#56ccf2';
    ctx.lineWidth = this.awaitingFinalClock ? 2.2 : 1.6;
    ctx.stroke();
    ctx.font = 'bold 11px -apple-system, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      this.awaitingFinalClock ? '⚡ 最終クロック(開門)' : '⚡ 1行実行 (CLK)',
      btn.x + btn.w / 2,
      btn.y + btn.h / 2
    );

    // Module 1: COND_PC (x=24, y=44, w=120, h=82)
    ctx.fillStyle = st.jmpFired ? '#14382c' : '#141f2c';
    this._roundRect(ctx, 24, 44, 120, 82, 7);
    ctx.fill();
    ctx.strokeStyle = st.jmpFired ? '#52e3b6' : '#56ccf2';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.font = 'bold 10.5px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('COND_PC (司令塔)', 84, 58);
    ctx.font = 'bold 12.5px monospace';
    ctx.fillStyle = '#ffd166';
    ctx.fillText(
      st.stepIdx >= 0 ? `PC:${st.pc} → 次:${st.pcNext}番` : `PC = ${st.pc}番地`,
      84,
      82
    );
    ctx.font = 'bold 9.5px sans-serif';
    ctx.fillStyle = st.jmpFired ? '#72f2c8' : '#9bb0c4';
    ctx.fillText(
      st.jmpFired ? '⚡ JNZジャンプ発火!' : '通常 +1 進行',
      84,
      108
    );

    // Arrow COND_PC -> INST_DEC
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(144, 84);
    ctx.lineTo(166, 84);
    ctx.stroke();

    // Module 2: INST_DEC (x=166, y=44, w=142, h=82)
    ctx.fillStyle = '#141f2c';
    this._roundRect(ctx, 166, 44, 142, 82, 7);
    ctx.fill();
    ctx.strokeStyle = '#56ccf2';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.font = 'bold 10.5px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('INST_DEC (翻訳)', 237, 58);
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#ffd166';
    ctx.fillText(
      `機械語 ${st.opcodeBits}:${st.immBits}`,
      237,
      81
    );
    ctx.font = 'bold 9.5px monospace';
    ctx.fillStyle = '#8ee5ff';
    ctx.fillText(`OP=${st.opFlag} SET=${st.setFlag} WE=${st.weFlag} BR=${st.brFlag}`, 237, 106);

    // Arrow INST_DEC -> ARK4_CPU
    ctx.strokeStyle = '#56ccf2';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(308, 84);
    ctx.lineTo(330, 84);
    ctx.stroke();

    // Module 3: ARK4_CPU (x=330, y=44, w=152, h=82)
    const accBits = ((st.acc & 15) >>> 0).toString(2).padStart(4, '0');
    ctx.fillStyle = '#241b16';
    this._roundRect(ctx, 330, 44, 152, 82, 7);
    ctx.fill();
    ctx.strokeStyle = '#ffbe76';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = 'bold 10.5px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('ARK4_CPU (演算・記憶)', 406, 58);
    ctx.font = 'bold 13.5px monospace';
    ctx.fillStyle = '#ffd166';
    ctx.fillText(
      st.stepIdx >= 0
        ? `ACC:${st.accBefore ?? 0}→${st.acc} (${accBits})`
        : `ACC = ${st.acc} (${accBits})`,
      406,
      84
    );
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = '#ffbe76';
    ctx.fillText(`実行: ${st.opName}`, 406, 108);

    // Arrow ARK4_CPU -> ZERO_4B
    ctx.strokeStyle = st.z ? '#52e3b6' : '#4a6075';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(482, 84);
    ctx.lineTo(502, 84);
    ctx.stroke();

    // Module 4: ZERO_4B (x=502, y=52, w=112, h=74)
    ctx.fillStyle = st.z ? '#11382b' : '#141e28';
    this._roundRect(ctx, 502, 52, 112, 74, 7);
    ctx.fill();
    ctx.strokeStyle = st.z ? '#52e3b6' : '#455a70';
    ctx.lineWidth = st.z ? 2.2 : 1.5;
    ctx.stroke();
    ctx.font = 'bold 10.5px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('ZERO_4B (目)', 558, 69);
    ctx.font = 'bold 14.5px monospace';
    ctx.fillStyle = st.z ? '#72f2c8' : '#7c92a8';
    ctx.fillText(`Z = ${st.z}`, 558, 92);
    ctx.font = 'bold 9.5px sans-serif';
    ctx.fillStyle = st.z ? '#a8ffe2' : '#7c92a8';
    ctx.fillText(st.z ? 'Z=1 (JNZ不発)' : 'Z=0 (JNZ発火)', 558, 112, 104);

    // -------------------------------------------------------------------------
    // 2. LOWER HALF: ROM ASSEMBLY PROGRAM TABLE (y = 144..348)
    // -------------------------------------------------------------------------
    ctx.font = 'bold 11.5px -apple-system, sans-serif';
    ctx.fillStyle = '#ffd166';
    ctx.textAlign = 'left';
    ctx.fillText(`📜 ROM アセンブリ命令メモリ表 ｜ ${spec?.goalTitle || ''}`, 18, 154);

    const n = Math.max(1, rows.length);
    const rowH = n <= 3 ? 44 : 33;
    const gap = n <= 3 ? 8 : 5;
    const startY = 166;

    const finalAddr = rows.length > 0 ? rows[rows.length - 1].addr : 3;
    rows.forEach((r, idx) => {
      const ry = startY + idx * (rowH + gap);
      const isAwaitingOpenRow = this.awaitingFinalClock && r.addr === finalAddr;
      const isCurrentPc = isAwaitingOpenRow || (st.stepIdx >= 0 && st.pc === r.addr);

      // Left Address Pill
      ctx.fillStyle = isAwaitingOpenRow ? '#4d330b' : isCurrentPc ? '#163d2f' : '#131d28';
      this._roundRect(ctx, 16, ry, 152, rowH, 7);
      ctx.fill();
      ctx.strokeStyle = isAwaitingOpenRow ? '#ffd166' : isCurrentPc ? '#52e3b6' : '#2d4054';
      ctx.lineWidth = isCurrentPc ? 2.2 : 1.2;
      ctx.stroke();

      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = isAwaitingOpenRow ? '#ffe599' : isCurrentPc ? '#72f2c8' : '#ffd166';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${isCurrentPc ? '▶' : ' '} [${r.addr}番地]`, 22, ry + rowH * 0.34);

      ctx.font = '9.5px -apple-system, sans-serif';
      ctx.fillStyle = '#b4c7da';
      ctx.fillText(r.label || (r.locked ? '固定命令' : ''), 24, ry + rowH * 0.72, 138);

      // Right Instruction Slot
      const sx = 176;
      const sw = 444;
      const part = r.locked
        ? r.fixedPart
        : (this.stage.physicsParts || []).find((p) => p.id === this.slots[r.slotId]) || null;

      if (part) {
        ctx.fillStyle = r.locked ? '#1a232e' : '#1d2b3a';
        this._roundRect(ctx, sx, ry, sw, rowH, 7);
        ctx.fill();
        ctx.strokeStyle = isCurrentPc ? '#ffd166' : (part.accent || '#56ccf2');
        ctx.lineWidth = isCurrentPc ? 2.4 : 1.6;
        ctx.stroke();

        // Assembly Mnemonic Badge
        ctx.fillStyle = part.color || '#28527a';
        this._roundRect(ctx, sx + 6, ry + 5, 76, rowH - 10, 5);
        ctx.fill();
        ctx.font = 'bold 12px monospace';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(part.name, sx + 44, ry + rowH / 2);

        // Meaning + Machine Code Pill
        ctx.font = 'bold 10px monospace';
        ctx.fillStyle = '#8ee5ff';
        ctx.textAlign = 'left';
        const codeTag =
          part.opcodeBits && part.immBits ? `機械語 ${part.opcodeBits}:${part.immBits}` : '';
        const topLine =
          part.meta && codeTag && !part.meta.includes('機械語')
            ? `${part.meta} ｜ ${codeTag}`
            : part.meta || codeTag;
        ctx.fillText(topLine, sx + 90, ry + rowH * 0.34, sw - 100);

        // Meaning / Rule
        ctx.font = '10.5px -apple-system, sans-serif';
        ctx.fillStyle = '#e8f2fc';
        ctx.fillText(part.rule || '', sx + 90, ry + rowH * 0.72, sw - 100);
      } else {
        const isArmed = Boolean(this.armedPart);
        ctx.fillStyle = isArmed ? 'rgba(255, 209, 102, 0.1)' : 'rgba(14, 22, 31, 0.75)';
        this._roundRect(ctx, sx, ry, sw, rowH, 7);
        ctx.fill();
        ctx.save();
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = isArmed ? '#ffd166' : '#3d556e';
        ctx.lineWidth = isArmed ? 2 : 1.5;
        ctx.stroke();
        ctx.restore();

        ctx.font = 'bold 11.5px -apple-system, sans-serif';
        ctx.fillStyle = isArmed ? '#ffe599' : '#7f98b0';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          isArmed ? '＋ ここをタップして命令カードをセット！' : '（空欄：下のパレットから命令カードを選んで配置）',
          sx + sw / 2,
          ry + rowH / 2
        );
      }
    });
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
