/**
 * SILICON GENESIS — Live Animated Logic & Physics Diagram Engine for Story Theater
 *
 * Renders crystal-clear, real-time animated circuit/physics diagrams inside
 * Dr. Kagari's visual guide cards so complete CS beginners can SEE electrons,
 * signals (0/1), carry ripples, feedback loops, and CPU data flows in motion!
 *
 * Players can also tap the diagram directly to step through input states manually
 * without advancing the story dialogue.
 */

import { sound } from '../audio/sound.js?v=19';

const W = 340;
const H = 126;
const STEP_PERIOD_SEC = 2.15;

const GOAL_SPECS = {
  goal_not: {
    boxTitle: '？ 逆転スイッチ',
    boxSub: '空気清浄・警報',
    accent: '#52e3b6',
    steps: [
      { ins: [['IN=0 (酸欠!)', 0]], outs: [['OUT=1 (警報!)', 1]], msg: '① IN=0（危険）のとき ▶ 逆転して OUT=1（警報ON）を出したい！' },
      { ins: [['IN=1 (正常)', 1]], outs: [['OUT=0 (静穏)', 0]], msg: '② IN=1（正常）のとき ▶ 逆転して OUT=0（静か）にしたい！' },
    ],
  },
  goal_and: {
    boxTitle: '？ 二重ロック',
    boxSub: '両方1で開錠',
    accent: '#52e3b6',
    steps: [
      { ins: [['鍵A = 0', 0], ['気圧B = 1', 1]], outs: [['OUT = 0 (施錠)', 0]], msg: '① 片方だけ 1 のとき ▶ まだ危険なので OUT=0（閉じたまま）' },
      { ins: [['鍵A = 1', 1], ['気圧B = 0', 0]], outs: [['OUT = 0 (施錠)', 0]], msg: '② もう片方だけ 1 ▶ やはり OUT=0（閉じたまま）' },
      { ins: [['鍵A = 1', 1], ['気圧B = 1', 1]], outs: [['OUT = 1 (開錠!)', 1]], msg: '③ AとBの両方が 1 のときだけ ▶ OUT=1（隔壁オープン！）' },
    ],
  },
  goal_or: {
    boxTitle: '？ 火災報知網',
    boxSub: '片方でも1で警報',
    accent: '#52e3b6',
    steps: [
      { ins: [['北A = 0', 0], ['南B = 0', 0]], outs: [['OUT = 0 (正常)', 0]], msg: '① 北も南も 0（煙なし）▶ このときだけ OUT=0（静か）' },
      { ins: [['北A = 1', 1], ['南B = 0', 0]], outs: [['OUT = 1 (警報!)', 1]], msg: '② 片方でも煙(1)を検知したら ▶ すぐ OUT=1（サイレン！）' },
      { ins: [['北A = 1', 1], ['南B = 1', 1]], outs: [['OUT = 1 (警報!)', 1]], msg: '③ 両方とも煙(1)のときも ▶ もちろん OUT=1（サイレン！）' },
    ],
  },
  goal_xor: {
    boxTitle: '？ 階段スイッチ',
    boxSub: '違うときだけ1',
    accent: '#52e3b6',
    steps: [
      { ins: [['上A = 0', 0], ['下B = 0', 0]], outs: [['OUT = 0 (消灯)', 0]], msg: '① 両方 0（同じ向き）▶ 階段の照明は OUT=0（消灯）' },
      { ins: [['上A = 1', 1], ['下B = 0', 0]], outs: [['OUT = 1 (点灯!)', 1]], msg: '② AとBが「ちがう値」のとき ▶ 階段の照明が OUT=1（点灯！）' },
      { ins: [['上A = 1', 1], ['下B = 1', 1]], outs: [['OUT = 0 (消灯)', 0]], msg: '③ 両方 1（同じ向き）▶ 下のスイッチで消せて OUT=0（消灯）！' },
    ],
  },
  goal_half_adder: {
    boxTitle: '？ 2進数の足し算',
    boxSub: 'A + B を計算',
    accent: '#5ce0a8',
    steps: [
      { ins: [['A = 0', 0], ['B = 0', 0]], outs: [['SUM(1の位)=0', 0], ['CARRY(2の位)=0', 0]], msg: '① 0 + 0 = 00（くり上がり 0、1の位 0）' },
      { ins: [['A = 1', 1], ['B = 0', 0]], outs: [['SUM(1の位)=1', 1], ['CARRY(2の位)=0', 0]], msg: '② 1 + 0 = 01（くり上がり 0、1の位 1）' },
      { ins: [['A = 1', 1], ['B = 1', 1]], outs: [['SUM(1の位)=0', 0], ['CARRY(2の位)=1', 1]], msg: '③ 1 + 1 = 10（2進数で「2」＝くり上がり 1、1の位 0！）' },
    ],
  },
  goal_full_adder: {
    boxTitle: '？ 3入力の足し算',
    boxSub: 'A + B + CIN',
    accent: '#5ce0a8',
    steps: [
      { ins: [['A = 1', 1], ['B = 0', 0], ['CIN = 1', 1]], outs: [['SUM(1の位)=0', 0], ['COUT(次へ)=1', 1]], msg: '① 1 + 0 + くり上がり1 = 2（COUT=1, SUM=0）' },
      { ins: [['A = 1', 1], ['B = 1', 1], ['CIN = 1', 1]], outs: [['SUM(1の位)=1', 1], ['COUT(次へ)=1', 1]], msg: '② 1 + 1 + くり上がり1 = 3（COUT=1, SUM=1）' },
    ],
  },
  goal_sr_latch: {
    boxTitle: '？ 記憶する警報灯',
    boxSub: '手を離しても保持',
    accent: '#c89bff',
    steps: [
      { ins: [['地震 S = 1', 1], ['解除 R = 0', 0]], outs: [['警報 Q = 1', 1]], msg: '① S=1（地震発生!）▶ 警報ランプ Q=1 が点灯！' },
      { ins: [['地震 S = 0', 0], ['解除 R = 0', 0]], outs: [['警報 Q = 1 (記憶!)', 1]], msg: '② 揺れが収まり S=0 に戻っても ▶ Q=1 をずっと覚え続ける！' },
      { ins: [['地震 S = 0', 0], ['解除 R = 1', 1]], outs: [['警報 Q = 0 (解除)', 0]], msg: '③ R=1（解除ボタン）を押したときだけ ▶ Q=0 に戻る！' },
    ],
  },
  goal_d_latch: {
    boxTitle: '？ ロック付き金庫',
    boxSub: 'WE=1のときだけ保存',
    accent: '#c89bff',
    steps: [
      { ins: [['D = 1', 1], ['保存 WE = 1', 1]], outs: [['金庫 Q = 1', 1]], msg: '① WE=1（保存ボタンON）▶ データ D=1 を金庫へ書き込む！' },
      { ins: [['D = 0 (ノイズ!)', 0], ['保存 WE = 0', 0]], outs: [['金庫 Q = 1 (死守!)', 1]], msg: '② WE=0（ロック中）▶ 外のDが0に変わっても Q=1 を死守！' },
    ],
  },
  goal_dff: {
    boxTitle: '？ 鼓動で1拍更新',
    boxSub: 'CLK 0→1 の一瞬だけ',
    accent: '#c89bff',
    steps: [
      { ins: [['D = 1', 1], ['CLK = 0 (準備)', 0]], outs: [['出力 Q = 0', 0]], msg: '① CLK=0 のあいだ ▶ まだ出口 Q は変わらない（扉の手前で待機）' },
      { ins: [['D = 1', 1], ['CLK 0→1 (鼓動!)', 1]], outs: [['出力 Q = 1 (更新!)', 1]], msg: '② CLK が 0→1 に立ち上がった一瞬だけ ▶ D=1 を Q へ取り込む！' },
      { ins: [['D = 0 (変化!)', 0], ['CLK = 1 (維持)', 1]], outs: [['出力 Q = 1 (不変!)', 1]], msg: '③ CLK=1 のまま D が変わっても ▶ 筒抜けにならず Q=1 を維持！' },
    ],
  },
  goal_reg4: {
    boxTitle: '？ 4ビット作業机',
    boxSub: 'LOAD=1で4桁保存',
    accent: '#c89bff',
    steps: [
      { ins: [['D = 9 (1001)', 1], ['LOAD = 1', 1], ['CLK ↑', 1]], outs: [['記憶 Q = 9', 1]], msg: '① LOAD=1 でクロックが鳴ると ▶ 新しい4桁「9」を作業机に保存！' },
      { ins: [['D = 3 (0011)', 0], ['LOAD = 0', 0], ['CLK ↑', 1]], outs: [['記憶 Q = 9 (保持!)', 1]], msg: '② LOAD=0 ならクロックが鳴っても ▶ 今の「9」を忘れずキープ！' },
    ],
  },
  goal_alu: {
    boxTitle: '？ 加減算ユニット',
    boxSub: 'SUBで足し算/引き算',
    accent: '#ff8a7a',
    steps: [
      { ins: [['A = 7', 1], ['B = 2', 1], ['SUB = 0 (加算)', 0]], outs: [['答え Y = 9', 1]], msg: '① SUB=0 のとき ▶ 足し算 A + B（7 + 2 = 9）を計算！' },
      { ins: [['A = 7', 1], ['B = 2', 1], ['SUB = 1 (減算!)', 1]], outs: [['答え Y = 5', 1]], msg: '② SUB=1 のとき ▶ 引き算 A − B（7 − 2 = 5）を1台で計算！' },
    ],
  },
  goal_pc: {
    boxTitle: '？ 手順カウンタ',
    boxSub: '毎拍+1 ＆ JMP',
    accent: '#ff8a7a',
    steps: [
      { ins: [['J = 0', 0], ['JMP = 0 (通常)', 0], ['CLK ↑', 1]], outs: [['番地 Q: 0→1→2', 1]], msg: '① JMP=0 のとき ▶ クロックごとに自動で「+1」ずつ進む！' },
      { ins: [['J = 10', 1], ['JMP = 1 (飛べ!)', 1], ['CLK ↑', 1]], outs: [['番地 Q → 10!', 1]], msg: '② JMP=1 のとき ▶ 指定されたジャンプ先 J=10 番地へワープ！' },
    ],
  },
  goal_ark4: {
    boxTitle: '？ ARK-4 CPUコア',
    boxSub: '命令を連続実行',
    accent: '#ffbe76',
    steps: [
      { ins: [['IMM = 5', 1], ['SET = 1 (LDI)', 1], ['CLK ↑', 1]], outs: [['ACC ← 5', 1]], msg: '① LDI 5 ▶ 数値 5 をアキュムレータ(ACC)へ初期セット！' },
      { ins: [['IMM = 3', 1], ['OP = 0 (ADD)', 0], ['CLK ↑', 1]], outs: [['ACC ← 8 (5+3)', 1]], msg: '② ADD 3 ▶ 今の ACC(5) に +3 を足して ACC=8 に更新！' },
      { ins: [['IMM = 2', 1], ['OP = 1 (SUB)', 1], ['CLK ↑', 1]], outs: [['ACC ← 6 (8−2)', 1]], msg: '③ SUB 2 ▶ 今の ACC(8) から −2 を引いて ACC=6 に更新！' },
    ],
  },
};

export class StoryDiagramPlayer {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.kind = null;
    this.time = 0;
    this.stepIdx = 0;
    this.stepTimer = 0;
    this._raf = null;
    this._lastTs = 0;
    this._onClick = null;
  }

  mount(canvasEl, kind) {
    this.unmount();
    if (!canvasEl || !kind) return;
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext('2d');
    this.kind = kind;
    this.time = 0;
    this.stepIdx = 0;
    this.stepTimer = 0;

    this._onClick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.stepIdx++;
      this.stepTimer = 0;
      sound.playSwitch(true);
    };
    this.canvas.addEventListener('click', this._onClick);

    this._lastTs = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.05, Math.max(0, (now - this._lastTs) / 1000));
      this._lastTs = now;
      this.time += dt;
      this.stepTimer += dt;
      if (this.stepTimer >= STEP_PERIOD_SEC) {
        this.stepTimer = 0;
        this.stepIdx++;
      }
      this._render();
      this._raf = requestAnimationFrame(tick);
    };
    this._raf = requestAnimationFrame(tick);
  }

  unmount() {
    if (this._raf) {
      cancelAnimationFrame(this._raf);
      this._raf = null;
    }
    if (this.canvas && this._onClick) {
      this.canvas.removeEventListener('click', this._onClick);
    }
    this.canvas = null;
    this.ctx = null;
    this.kind = null;
    this._onClick = null;
  }

  _render() {
    if (!this.canvas || !this.ctx) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = Math.max(1, Math.round((rect.width || W) * dpr));
    const ch = Math.max(1, Math.round((rect.height || H) * dpr));
    if (this.canvas.width !== cw || this.canvas.height !== ch) {
      this.canvas.width = cw;
      this.canvas.height = ch;
    }

    const ctx = this.ctx;
    ctx.save();
    ctx.scale(cw / W, ch / H);

    // Sleek dark blueprint chamber
    ctx.fillStyle = '#080f17';
    this._roundRect(ctx, 0, 0, W, H, 7);
    ctx.fill();

    // Subtle schematic grid dots
    ctx.fillStyle = 'rgba(130, 175, 215, 0.08)';
    for (let gx = 16; gx < W; gx += 20) {
      for (let gy = 14; gy < H - 18; gy += 18) {
        ctx.fillRect(gx, gy, 1.5, 1.5);
      }
    }

    switch (this.kind) {
      case 'mosfet_bridge':
        this._drawMosfet(ctx);
        break;
      case 'short_spark':
        this._drawShortSpark(ctx);
        break;
      case 'pullup_drain':
        this._drawPullup(ctx);
        break;
      case 'nand_series':
        this._drawNandSeries(ctx);
        break;
      case 'not_branch':
        this._drawNotBranch(ctx);
        break;
      case 'and_invert':
        this._drawAndInvert(ctx);
        break;
      case 'or_demorgan':
        this._drawOrDemorgan(ctx);
        break;
      case 'xor_diff':
        this._drawXorDiff(ctx);
        break;
      case 'half_adder':
        this._drawHalfAdder(ctx);
        break;
      case 'full_adder':
        this._drawFullAdder(ctx);
        break;
      case 'ripple_4bit':
        this._drawRipple4Bit(ctx);
        break;
      case 'mux_rail':
        this._drawMuxRail(ctx);
        break;
      case 'data_bus_4bit':
        this._drawDataBus4Bit(ctx);
        break;
      case 'decoder_2to4':
        this._drawDecoder(ctx);
        break;
      case 'sr_latch_loop':
        this._drawSrLatch(ctx);
        break;
      case 'd_latch_vault':
        this._drawDLatchVault(ctx);
        break;
      case 'dff_airlock':
        this._drawDffAirlock(ctx);
        break;
      case 'reg_4bit':
        this._drawReg4Bit(ctx);
        break;
      case 'alu_twos_comp':
        this._drawAluTwosComp(ctx);
        break;
      case 'pc_loop':
        this._drawPcLoop(ctx);
        break;
      case 'ark4_cpu':
        this._drawArk4Cpu(ctx);
        break;
      default:
        if (GOAL_SPECS[this.kind]) {
          this._drawBlackBoxGoal(ctx, GOAL_SPECS[this.kind]);
        }
        break;
    }

    ctx.restore();
  }

  // =========================================================================
  // DRAWING PRIMITIVES
  // =========================================================================
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

  _wire(ctx, pts, active, color = '#52e3b6') {
    if (pts.length < 2) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = active ? color : '#334557';
    ctx.lineWidth = active ? 2.6 : 2;
    if (active) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 7;
    }
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Animated signal pulse bead when active
    if (active) {
      let totalLen = 0;
      const segs = [];
      for (let i = 0; i < pts.length - 1; i++) {
        const dx = pts[i + 1][0] - pts[i][0];
        const dy = pts[i + 1][1] - pts[i][1];
        const len = Math.hypot(dx, dy);
        segs.push({ x0: pts[i][0], y0: pts[i][1], dx, dy, len });
        totalLen += len;
      }
      if (totalLen > 8) {
        const count = totalLen > 120 ? 2 : 1;
        for (let k = 0; k < count; k++) {
          let dist = ((this.time * 68 + (k * totalLen) / count) % totalLen);
          for (const s of segs) {
            if (dist <= s.len) {
              const t = s.len > 0 ? dist / s.len : 0;
              ctx.fillStyle = '#ffffff';
              ctx.beginPath();
              ctx.arc(s.x0 + s.dx * t, s.y0 + s.dy * t, 2.7, 0, Math.PI * 2);
              ctx.fill();
              break;
            }
            dist -= s.len;
          }
        }
      }
    }
    ctx.restore();
  }

  _chip(ctx, x, y, w, h, label, sub = '', accent = '#ffb84d', active = false) {
    ctx.save();
    ctx.fillStyle = active ? '#182b27' : '#131d28';
    this._roundRect(ctx, x, y, w, h, 6);
    ctx.fill();
    ctx.strokeStyle = active ? accent : 'rgba(145, 175, 205, 0.55)';
    ctx.lineWidth = active ? 2 : 1.4;
    if (active) {
      ctx.shadowColor = accent;
      ctx.shadowBlur = 8;
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = active ? '#ffffff' : '#dce8f5';
    ctx.font = 'bold 10.5px -apple-system, sans-serif';
    ctx.fillText(label, x + w / 2, sub ? y + h * 0.39 : y + h / 2, w - 6);
    if (sub) {
      ctx.fillStyle = accent;
      ctx.font = 'bold 8.5px monospace';
      ctx.fillText(sub, x + w / 2, y + h * 0.72, w - 6);
    }
    ctx.restore();
  }

  _pill(ctx, x, y, w, h, text, active, activeColor = '#52e3b6') {
    ctx.save();
    ctx.fillStyle = active ? 'rgba(24, 62, 52, 0.95)' : '#15202b';
    this._roundRect(ctx, x, y, w, h, 5);
    ctx.fill();
    ctx.strokeStyle = active ? activeColor : '#455a6e';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = active ? '#ecfff8' : '#94a9be';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + w / 2, y + h / 2 + 0.5, w - 4);
    ctx.restore();
  }

  _caption(ctx, text, stepIdx, totalSteps, accent = '#ffd166') {
    ctx.save();
    ctx.fillStyle = 'rgba(13, 21, 31, 0.96)';
    ctx.fillRect(0, H - 22, W, 22);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, H - 22);
    ctx.lineTo(W, H - 22);
    ctx.stroke();

    ctx.fillStyle = accent;
    ctx.font = 'bold 10px -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 8, H - 10.5, W - 70);

    // Step dots + subtle tap cue on right
    const cur = stepIdx % totalSteps;
    const dotStart = W - 10 - (totalSteps - 1) * 9;
    for (let i = 0; i < totalSteps; i++) {
      ctx.beginPath();
      ctx.arc(dotStart + i * 9, H - 11, i === cur ? 3 : 2, 0, Math.PI * 2);
      ctx.fillStyle = i === cur ? accent : '#425568';
      ctx.fill();
    }
    ctx.restore();
  }

  // =========================================================================
  // 17 LIVE ANIMATED DIAGRAMS
  // =========================================================================

  // =========================================================================
  // SPOILER-FREE BLACK-BOX GOAL ANIMATION (Used in Stage Intros 01..17!)
  // =========================================================================
  _drawBlackBoxGoal(ctx, spec) {
    const step = spec.steps[this.stepIdx % spec.steps.length];
    const inCount = step.ins.length;
    const outCount = step.outs.length;

    // Left input pills & animated wires into central mystery box
    step.ins.forEach(([label, active], idx) => {
      const y = inCount === 1 ? 42 : inCount === 2 ? 22 + idx * 42 : 12 + idx * 30;
      const h = inCount === 3 ? 22 : 24;
      this._pill(ctx, 8, y, 92, h, label, Boolean(active), '#ffd166');
      this._wire(ctx, [[100, y + h / 2], [126, y + h / 2]], Boolean(active), '#ffd166');
    });

    // Central Black-Box Target Module
    this._chip(ctx, 126, 20, 92, 66, spec.boxTitle, spec.boxSub, spec.accent, true);

    // Right output wires & expected output pills
    step.outs.forEach(([label, active], idx) => {
      const y = outCount === 1 ? 42 : 22 + idx * 42;
      this._wire(ctx, [[218, y + 12], [238, y + 12]], Boolean(active), spec.accent);
      this._pill(ctx, 238, y, 94, 24, label, Boolean(active), spec.accent);
    });

    this._caption(ctx, step.msg, this.stepIdx, spec.steps.length, spec.accent);
  }

  // 00-A: MOSFET Transistor Electron Bridge
  _drawMosfet(ctx) {
    const on = this.stepIdx % 2 === 1;

    // P-type substrate
    ctx.fillStyle = '#241e38';
    this._roundRect(ctx, 56, 54, 228, 44, 6);
    ctx.fill();
    ctx.strokeStyle = '#735ea6';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.fillStyle = '#b49fe8';
    ctx.font = 'bold 8.5px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('P型シリコン土台（壁）', 170, 91);

    // Left & Right N-type pockets
    this._chip(ctx, 64, 56, 62, 26, 'N型', '電子の池', '#52e3b6', true);
    this._chip(ctx, 214, 56, 62, 26, 'N型', '電子の池', '#52e3b6', on);

    // Glass insulator & Metal gate
    this._chip(ctx, 118, 37, 104, 15, 'ガラスの壁（絶縁）', '', '#7cd4f5', false);
    this._chip(ctx, 134, 14, 72, 19, on ? '金属ひねり:1' : '金属ひねり:0', '', '#ffd166', on);

    // Input & Output pins
    this._wire(ctx, [[34, 69], [64, 69]], true, '#ffd166');
    this._pill(ctx, 8, 59, 28, 20, '1', true, '#ffd166');
    this._wire(ctx, [[276, 69], [304, 69]], on, '#52e3b6');
    this._pill(ctx, 304, 59, 30, 20, on ? '1' : '0', on, '#52e3b6');

    if (on) {
      // Glowing cyan electron bridge under the glass!
      ctx.fillStyle = 'rgba(82, 227, 182, 0.36)';
      this._roundRect(ctx, 126, 56, 88, 15, 4);
      ctx.fill();
      ctx.strokeStyle = '#6ff5ca';
      ctx.lineWidth = 1.3;
      ctx.stroke();

      // Electrostatic downward arrows cleanly between gate and bridge
      ctx.fillStyle = '#ffd166';
      ctx.font = 'bold 9.5px monospace';
      for (const ax of [146, 170, 194]) {
        ctx.fillText('↓', ax, 57 + Math.sin(this.time * 7 + ax) * 1.2);
      }
      // Flowing electrons
      for (let i = 0; i < 6; i++) {
        const p = (this.time * 0.65 + i / 6) % 1;
        const ex = 76 + p * 188;
        ctx.beginPath();
        ctx.arc(ex, 64, 2.8, 0, Math.PI * 2);
        ctx.fillStyle = '#b4ffea';
        ctx.fill();
      }
    } else {
      ctx.fillStyle = '#ff8a7a';
      ctx.font = 'bold 9.5px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('✖ 壁で遮断', 170, 68);
    }

    this._caption(
      ctx,
      on ? 'ひねり=1 ▶ 静電気で「電子の橋」が開通！ でぐち=1' : 'ひねり=0 ▶ 橋がなく壁で遮断！ でぐち=0',
      this.stepIdx,
      2,
      on ? '#52e3b6' : '#ffd166'
    );
  }

  // 00-B: Pull-Up Resistor Safe Drain
  _drawPullup(ctx) {
    const drain = this.stepIdx % 2 === 1;

    // Battery +5V at left-top, resistor, junction, lamp right, drain switch bottom -> GND
    this._pill(ctx, 12, 12, 76, 20, '🔋 でんち 5V', true, '#ffd166');
    this._wire(ctx, [[88, 22], [116, 22]], true, '#ffd166');
    this._chip(ctx, 116, 10, 84, 24, 'ていこう', '細い道', '#7cd4f5', true);

    // Center junction (200, 22 -> 200, 52)
    this._wire(ctx, [[200, 22], [220, 22], [220, 48]], !drain, drain ? '#ffd166' : '#52e3b6');

    // Right branch to output lamp
    this._wire(ctx, [[220, 48], [268, 48]], !drain, '#52e3b6');
    this._pill(ctx, 268, 34, 62, 28, drain ? '0.0V (0)' : '5.0V (1)', !drain, '#52e3b6');

    // Bottom drain switch to GND
    this._wire(ctx, [[220, 48], [220, 64]], drain, '#ffd166');
    this._chip(ctx, 174, 64, 92, 22, drain ? 'ぬけ=1 (開)' : 'ぬけ=0 (閉)', '', '#ffd166', drain);
    this._wire(ctx, [[220, 86], [220, 98]], drain, '#ffd166');

    // Earth label
    ctx.fillStyle = drain ? '#ffd166' : '#8aa2b8';
    ctx.font = 'bold 9.5px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('⏚ 地面(0V)', 232, 95);

    // Left explanatory badge
    ctx.fillStyle = drain ? '#ffd166' : '#8fffdc';
    ctx.font = 'bold 9.5px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(drain ? '細い道のおかげで' : '下が閉じているから', 16, 56);
    ctx.fillText(drain ? 'ショートせず安全に0へ！' : '水圧5Vが溜まって 1！', 16, 70);

    this._caption(
      ctx,
      drain ? 'ぬけ=1 ▶ 抵抗で安全に地面へ逃げて 出力=0！' : 'ぬけ=0 ▶ 抵抗を通して 5V が溜まり 出力=1！',
      this.stepIdx,
      2,
      drain ? '#ffd166' : '#52e3b6'
    );
  }

  // 00-C: Physical Series NAND (Battery -> SW A -> SW B -> PULL -> OUT)
  _drawNandSeries(ctx) {
    const cases = [
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
    ];
    const [a, b] = cases[this.stepIdx % 4];
    const passA = a === 1;
    const passB = a === 1 && b === 1;
    const out = passB ? 0 : 1;

    this._pill(ctx, 6, 42, 42, 22, '🔋 1', true, '#ffd166');
    this._wire(ctx, [[48, 53], [66, 53]], true, '#ffd166');

    this._pill(ctx, 74, 10, 44, 18, `A=${a}`, a === 1, '#ffd166');
    this._wire(ctx, [[96, 28], [96, 40]], a === 1, '#ffd166');
    this._chip(ctx, 66, 40, 60, 26, 'じゃぐち①', a ? '開通' : '閉', '#ffbe6b', passA);

    this._wire(ctx, [[126, 53], [146, 53]], passA, '#ffd166');

    this._pill(ctx, 154, 10, 44, 18, `B=${b}`, b === 1, '#ffd166');
    this._wire(ctx, [[176, 28], [176, 40]], b === 1, '#ffd166');
    this._chip(ctx, 146, 40, 60, 26, 'じゃぐち②', b ? '開通' : '閉', '#ffbe6b', passB);

    this._wire(ctx, [[206, 53], [220, 53]], passB, '#ff7b6b');
    this._chip(ctx, 220, 38, 58, 30, 'はいすい', passB ? '地面へ0!' : '普段は1', '#7cd4f5', out === 1);

    this._wire(ctx, [[278, 53], [292, 53]], out === 1, '#52e3b6');
    this._pill(ctx, 292, 41, 44, 24, `OUT=${out}`, out === 1, '#52e3b6');

    this._caption(
      ctx,
      passB
        ? 'A=1, B=1 ▶ 両方開通！ はいすいへ抜けて OUT=0（停止）'
        : `A=${a}, B=${b} ▶ 途中で止まる → はいすいは OUT=1（通水）`,
      this.stepIdx,
      4,
      passB ? '#ff8a7a' : '#52e3b6'
    );
  }

  // 01: NOT via Branched NAND
  _drawNotBranch(ctx) {
    const inp = this.stepIdx % 2;
    const out = inp ? 0 : 1;

    this._pill(ctx, 16, 40, 56, 24, `IN = ${inp}`, inp === 1, '#ffd166');
    // Split junction at x=106
    this._wire(ctx, [[72, 52], [106, 52]], inp === 1, '#ffd166');
    this._wire(ctx, [[106, 52], [106, 36], [142, 36]], inp === 1, '#ffd166');
    this._wire(ctx, [[106, 52], [106, 68], [142, 68]], inp === 1, '#ffd166');

    // Junction dot
    ctx.fillStyle = inp ? '#ffd166' : '#5a7086';
    ctx.beginPath();
    ctx.arc(106, 52, 3.8, 0, Math.PI * 2);
    ctx.fill();

    this._chip(ctx, 142, 26, 74, 52, 'NAND', `${inp} & ${inp} → ${out}`, '#ffb84d', out === 1);
    this._wire(ctx, [[216, 52], [262, 52]], out === 1, '#52e3b6');
    this._pill(ctx, 262, 40, 62, 24, `OUT = ${out}`, out === 1, '#52e3b6');

    this._caption(
      ctx,
      inp
        ? 'IN=1 ▶ 両方「1」が入る → NANDは 0 に反転！'
        : 'IN=0 ▶ 両方「0」が入る → NANDは 1 に反転！',
      this.stepIdx,
      2,
      out ? '#52e3b6' : '#ffd166'
    );
  }

  // 02: AND = NAND -> NOT
  _drawAndInvert(ctx) {
    const cases = [
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
    ];
    const [a, b] = cases[this.stepIdx % 4];
    const nandOut = a && b ? 0 : 1;
    const out = nandOut ? 0 : 1;

    this._pill(ctx, 12, 24, 48, 22, `A=${a}`, a === 1, '#ffd166');
    this._pill(ctx, 12, 58, 48, 22, `B=${b}`, b === 1, '#ffd166');
    this._wire(ctx, [[60, 35], [92, 35]], a === 1, '#ffd166');
    this._wire(ctx, [[60, 69], [92, 69]], b === 1, '#ffd166');

    this._chip(ctx, 92, 24, 62, 56, 'NAND', `出力:${nandOut}`, '#ffb84d', nandOut === 1);
    this._wire(ctx, [[154, 52], [190, 52]], nandOut === 1, '#ffb84d');
    this._chip(ctx, 190, 32, 58, 40, 'NOT', `反転:${out}`, '#52e3b6', out === 1);
    this._wire(ctx, [[248, 52], [276, 52]], out === 1, '#52e3b6');
    this._pill(ctx, 276, 40, 52, 24, `OUT=${out}`, out === 1, '#52e3b6');

    this._caption(
      ctx,
      out
        ? 'A=1, B=1 ▶ NAND(0)をNOTで反転 → OUT=1（開錠！）'
        : `A=${a}, B=${b} ▶ NAND(1)をNOTで反転 → OUT=0（施錠）`,
      this.stepIdx,
      4,
      out ? '#52e3b6' : '#ffd166'
    );
  }

  // 03: OR via De Morgan (NOT + NOT -> NAND)
  _drawOrDemorgan(ctx) {
    const cases = [
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
    ];
    const [a, b] = cases[this.stepIdx % 4];
    const na = a ? 0 : 1;
    const nb = b ? 0 : 1;
    const out = a || b ? 1 : 0;

    this._pill(ctx, 8, 18, 44, 22, `A=${a}`, a === 1, '#ffd166');
    this._pill(ctx, 8, 62, 44, 22, `B=${b}`, b === 1, '#ffd166');
    this._wire(ctx, [[52, 29], [76, 29]], a === 1, '#ffd166');
    this._wire(ctx, [[52, 73], [76, 73]], b === 1, '#ffd166');

    this._chip(ctx, 76, 15, 52, 28, 'NOT', `→${na}`, '#52e3b6', na === 1);
    this._chip(ctx, 76, 59, 52, 28, 'NOT', `→${nb}`, '#52e3b6', nb === 1);

    this._wire(ctx, [[128, 29], [150, 29], [150, 42], [174, 42]], na === 1, '#7cd4f5');
    this._wire(ctx, [[128, 73], [150, 73], [150, 62], [174, 62]], nb === 1, '#7cd4f5');

    this._chip(ctx, 174, 28, 66, 48, 'NAND', `${na}&${nb}→${out}`, '#ffb84d', out === 1);
    this._wire(ctx, [[240, 52], [274, 52]], out === 1, '#52e3b6');
    this._pill(ctx, 274, 40, 56, 24, `OUT=${out}`, out === 1, '#52e3b6');

    this._caption(
      ctx,
      out === 0
        ? 'A=0, B=0 ▶ 反転後は両方1 → NANDで唯一 OUT=0！'
        : `A=${a}, B=${b} ▶ 反転後は(${na},${nb}) → NANDで OUT=1！`,
      this.stepIdx,
      4,
      out ? '#52e3b6' : '#ff8a7a'
    );
  }

  // 04: XOR = OR & NAND -> AND
  _drawXorDiff(ctx) {
    const cases = [
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
    ];
    const [a, b] = cases[this.stepIdx % 4];
    const orV = a || b ? 1 : 0;
    const nandV = a && b ? 0 : 1;
    const out = a ^ b;

    this._pill(ctx, 8, 18, 42, 22, `A=${a}`, a === 1, '#ffd166');
    this._pill(ctx, 8, 62, 42, 22, `B=${b}`, b === 1, '#ffd166');

    this._wire(ctx, [[50, 29], [86, 22]], a === 1, '#ffd166');
    this._wire(ctx, [[50, 29], [86, 62]], a === 1, '#ffd166');
    this._wire(ctx, [[50, 73], [86, 34]], b === 1, '#ffd166');
    this._wire(ctx, [[50, 73], [86, 76]], b === 1, '#ffd166');

    this._chip(ctx, 86, 12, 66, 30, 'OR', `片方1?→${orV}`, '#52e3b6', orV === 1);
    this._chip(ctx, 86, 54, 66, 30, 'NAND', `両方禁止→${nandV}`, '#ffb84d', nandV === 1);

    this._wire(ctx, [[152, 27], [174, 27], [174, 42], [194, 42]], orV === 1, '#52e3b6');
    this._wire(ctx, [[152, 69], [174, 69], [174, 58], [194, 58]], nandV === 1, '#ffb84d');

    this._chip(ctx, 194, 28, 56, 44, 'AND', `→${out}`, '#52e3b6', out === 1);
    this._wire(ctx, [[250, 50], [276, 50]], out === 1, '#52e3b6');
    this._pill(ctx, 276, 38, 54, 24, `OUT=${out}`, out === 1, '#52e3b6');

    this._caption(
      ctx,
      out
        ? `A=${a}, B=${b}（ちがう）▶ OR=1 かつ NAND=1 → 点灯(1)！`
        : a && b
          ? 'A=1, B=1（同じ）▶ NANDが0で除外 → 消灯(0)！'
          : 'A=0, B=0（同じ）▶ ORが0 → 消灯(0)',
      this.stepIdx,
      4,
      out ? '#52e3b6' : '#ffd166'
    );
  }

  // 05: Half Adder (Binary 1+1 = 10)
  _drawHalfAdder(ctx) {
    const cases = [
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
    ];
    const [a, b] = cases[this.stepIdx % 4];
    const sum = a ^ b;
    const carry = a & b;

    this._pill(ctx, 10, 18, 46, 22, `A = ${a}`, a === 1, '#ffd166');
    this._pill(ctx, 10, 62, 46, 22, `B = ${b}`, b === 1, '#ffd166');

    this._wire(ctx, [[56, 29], [108, 24]], a === 1, '#ffd166');
    this._wire(ctx, [[56, 29], [108, 64]], a === 1, '#ffd166');
    this._wire(ctx, [[56, 73], [108, 36]], b === 1, '#ffd166');
    this._wire(ctx, [[56, 73], [108, 76]], b === 1, '#ffd166');

    this._chip(ctx, 108, 14, 68, 30, 'XOR', '1の位', '#5ce0a8', sum === 1);
    this._chip(ctx, 108, 56, 68, 30, 'AND', 'くり上がり', '#ffd166', carry === 1);

    this._wire(ctx, [[176, 29], [218, 29]], sum === 1, '#5ce0a8');
    this._wire(ctx, [[176, 71], [218, 71]], carry === 1, '#ffd166');

    this._pill(ctx, 218, 17, 110, 24, `SUM(1の位): ${sum}`, sum === 1, '#5ce0a8');
    this._pill(ctx, 218, 59, 110, 24, `CARRY(2の位): ${carry}`, carry === 1, '#ffd166');

    this._caption(
      ctx,
      `2進数：${a} + ${b} = ${carry}${sum}（10進数で「${a + b}」）`,
      this.stepIdx,
      4,
      carry ? '#ffd166' : '#5ce0a8'
    );
  }

  // 06: Full Adder (2 Half Adders + OR)
  _drawFullAdder(ctx) {
    const cases = [
      [0, 1, 0],
      [1, 1, 0],
      [0, 1, 1],
      [1, 1, 1],
    ];
    const [a, b, cin] = cases[this.stepIdx % 4];
    const s1 = a ^ b;
    const c1 = a & b;
    const sum = s1 ^ cin;
    const c2 = s1 & cin;
    const cout = c1 | c2;

    this._pill(ctx, 6, 12, 42, 18, `A=${a}`, a === 1, '#ffd166');
    this._pill(ctx, 6, 34, 42, 18, `B=${b}`, b === 1, '#ffd166');
    this._pill(ctx, 6, 66, 42, 18, `CIN=${cin}`, cin === 1, '#7cd4f5');

    this._wire(ctx, [[48, 21], [68, 21]], a === 1, '#ffd166');
    this._wire(ctx, [[48, 43], [68, 43]], b === 1, '#ffd166');
    this._chip(ctx, 68, 12, 62, 38, 'H_ADD①', `s=${s1} c=${c1}`, '#5ce0a8', s1 || c1);

    this._wire(ctx, [[130, 23], [154, 23]], s1 === 1, '#5ce0a8');
    this._wire(ctx, [[48, 75], [140, 75], [140, 42], [154, 42]], cin === 1, '#7cd4f5');
    this._chip(ctx, 154, 14, 62, 38, 'H_ADD②', `S=${sum} c=${c2}`, '#5ce0a8', sum || c2);

    this._wire(ctx, [[216, 25], [272, 25]], sum === 1, '#5ce0a8');
    this._pill(ctx, 272, 14, 60, 22, `SUM=${sum}`, sum === 1, '#5ce0a8');

    // Carries to OR
    this._wire(ctx, [[130, 42], [136, 42], [136, 84], [206, 84]], c1 === 1, '#ffd166');
    this._wire(ctx, [[216, 44], [224, 44], [224, 60], [198, 60], [198, 74], [206, 74]], c2 === 1, '#ffd166');
    this._chip(ctx, 206, 64, 48, 28, 'OR', `→${cout}`, '#ffd166', cout === 1);
    this._wire(ctx, [[254, 78], [272, 78]], cout === 1, '#ffd166');
    this._pill(ctx, 272, 67, 60, 22, `COUT=${cout}`, cout === 1, '#ffd166');

    this._caption(
      ctx,
      `${a} + ${b} + くり上がり${cin} = ${a + b + cin}（2進数 ${cout}${sum}）`,
      this.stepIdx,
      4,
      cout ? '#ffd166' : '#5ce0a8'
    );
  }

  // 07: 4-Bit Ripple-Carry Adder (5 + 3 = 8 Carry Domino!)
  _drawRipple4Bit(ctx) {
    // Animate carry wave across 4 stages computing 5 (0101) + 3 (0011) = 8 (1000)
    const phase = this.stepIdx % 4;
    const labels = ['FA0 (1の位)', 'FA1 (2の位)', 'FA2 (4の位)', 'FA3 (8の位)'];
    const aBits = [1, 0, 1, 0]; // 5
    const bBits = [1, 1, 0, 0]; // 3
    const sums = [0, 0, 0, 1];  // 8
    const carries = [1, 1, 1, 0];

    for (let i = 0; i < 4; i++) {
      const x = 14 + i * 80;
      const reached = i <= phase;
      const isActive = i === phase;
      this._chip(
        ctx,
        x,
        28,
        66,
        44,
        labels[i].split(' ')[0],
        `${aBits[i]}+${bBits[i]}→S=${reached ? sums[i] : '?'}`,
        isActive ? '#ffd166' : '#5ce0a8',
        reached && (isActive || sums[i] === 1)
      );

      // Bit weight label above
      ctx.fillStyle = '#9db5cb';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(['1の位', '2の位', '4の位', '8の位'][i], x + 33, 18);

      // Output pill below
      this._pill(ctx, x + 12, 78, 42, 18, `S${i}=${reached ? sums[i] : '-'}`, reached && sums[i] === 1, '#5ce0a8');

      // Carry baton wire to next FA!
      if (i < 3) {
        const carryActive = i < phase && carries[i] === 1;
        this._wire(ctx, [[x + 66, 50], [x + 80, 50]], carryActive, '#ffd166');
      }
    }

    this._caption(
      ctx,
      phase === 3
        ? '例：5(0101) + 3(0011) = 8(1000)！ くり上がりが波紋リレー！'
        : `くり上がりバトンリレー中… ${['1の位', '2の位', '4の位'][phase]} → 次の位へ！`,
      this.stepIdx,
      4,
      '#5ce0a8'
    );
  }

  // 08: MUX Railroad Switch
  _drawMuxRail(ctx) {
    const sel = this.stepIdx % 2;
    const d0 = 1;
    const d1 = 1;

    this._pill(ctx, 14, 18, 72, 22, '主タンク D0', sel === 0, '#52e3b6');
    this._pill(ctx, 14, 62, 72, 22, '予備井戸 D1', sel === 1, '#6ec3ff');

    // Tracks to switch point (170, 51)
    this._wire(ctx, [[86, 29], [142, 29], [176, 51]], sel === 0, '#52e3b6');
    this._wire(ctx, [[86, 73], [142, 73], [176, 51]], sel === 1, '#6ec3ff');

    // Switch box
    this._chip(ctx, 144, 34, 64, 34, 'MUX', `SEL = ${sel}`, sel ? '#6ec3ff' : '#52e3b6', true);

    // Output line
    this._wire(ctx, [[208, 51], [254, 51]], true, sel ? '#6ec3ff' : '#52e3b6');
    this._pill(ctx, 254, 39, 74, 24, sel === 0 ? 'OUT = D0' : 'OUT = D1', true, sel ? '#6ec3ff' : '#52e3b6');

    // SEL control arrow
    this._wire(ctx, [[176, 86], [176, 68]], sel === 1, '#ffd166');
    this._pill(ctx, 134, 82, 84, 18, `切替 SEL = ${sel}`, sel === 1, '#ffd166');

    this._caption(
      ctx,
      sel === 0
        ? 'SEL=0 ▶ ポイントが上へ切替 → D0 だけが通る！'
        : 'SEL=1 ▶ ポイントが下へ切替 → D1 だけが通る！',
      this.stepIdx,
      2,
      sel ? '#6ec3ff' : '#52e3b6'
    );
  }

  // 10: 2->4 Decoder
  _drawDecoder(ctx) {
    const num = this.stepIdx % 4;
    const a0 = num & 1;
    const a1 = (num >> 1) & 1;

    this._pill(ctx, 12, 24, 54, 22, `A0 = ${a0}`, a0 === 1, '#ffd166');
    this._pill(ctx, 12, 58, 54, 22, `A1 = ${a1}`, a1 === 1, '#ffd166');
    this._wire(ctx, [[66, 35], [108, 35]], a0 === 1, '#ffd166');
    this._wire(ctx, [[66, 69], [108, 69]], a1 === 1, '#ffd166');

    this._chip(ctx, 108, 20, 76, 64, '番号解読', `2進 ${a1}${a0} = ${num}番`, '#6ec3ff', true);

    for (let i = 0; i < 4; i++) {
      const y = 16 + i * 22;
      const active = i === num;
      this._wire(ctx, [[184, 26 + i * 16], [220, y + 8], [244, y + 8]], active, '#52e3b6');
      this._pill(ctx, 244, y - 1, 84, 18, `Y${i} (${i}号室) ${active ? '💧' : '·'}`, active, '#52e3b6');
    }

    this._caption(
      ctx,
      `入力(${a1}${a0}) = ${num}番 ▶ 水耕栽培室 Y${num} だけピンポイントON！`,
      this.stepIdx,
      4,
      '#6ec3ff'
    );
  }

  // 11: SR Latch Cross-Coupled Feedback Loop
  _drawSrLatch(ctx) {
    const phases = [
      { s: 1, r: 0, q: 1, qn: 0, msg: '① S=1（地震発生!）▶ 輪っかへ「1」を注入！' },
      { s: 0, r: 0, q: 1, qn: 0, msg: '② S=0, R=0（離した!）▶ 信号が回り続け Q=1 を記憶！' },
      { s: 0, r: 1, q: 0, qn: 1, msg: '③ R=1（解除ボタン）▶ 輪っかが反転し Q=0 へ！' },
      { s: 0, r: 0, q: 0, qn: 1, msg: '④ S=0, R=0（離した!）▶ 解除状態 Q=0 を保持！' },
    ];
    const p = phases[this.stepIdx % 4];

    this._pill(ctx, 8, 16, 48, 22, `S = ${p.s}`, p.s === 1, '#ff8a7a');
    this._pill(ctx, 8, 66, 48, 22, `R = ${p.r}`, p.r === 1, '#7cd4f5');
    this._wire(ctx, [[56, 27], [116, 27]], p.s === 1, '#ff8a7a');
    this._wire(ctx, [[56, 77], [116, 77]], p.r === 1, '#7cd4f5');

    // Cross-coupled feedback X wires!
    // Q (top right 192,27) -> bottom left (116,67)
    this._wire(ctx, [[192, 27], [218, 27], [218, 46], [96, 58], [96, 67], [116, 67]], p.q === 1, '#c89bff');
    // QN (bottom right 192,77) -> top left (116,37)
    this._wire(ctx, [[192, 77], [218, 77], [218, 58], [96, 46], [96, 37], [116, 37]], p.qn === 1, '#7cd4f5');

    this._chip(ctx, 116, 14, 76, 28, 'NAND①', `Q = ${p.q}`, '#c89bff', p.q === 1);
    this._chip(ctx, 116, 62, 76, 28, 'NAND②', `QN = ${p.qn}`, '#7cd4f5', p.qn === 1);

    this._wire(ctx, [[218, 27], [268, 27]], p.q === 1, '#c89bff');
    this._wire(ctx, [[218, 77], [268, 77]], p.qn === 1, '#7cd4f5');
    this._pill(ctx, 268, 16, 62, 22, `記憶Q=${p.q}`, p.q === 1, '#c89bff');
    this._pill(ctx, 268, 66, 62, 22, `QN=${p.qn}`, p.qn === 1, '#7cd4f5');

    this._caption(ctx, p.msg, this.stepIdx, 4, p.q ? '#c89bff' : '#7cd4f5');
  }

  // 13: D Flip-Flop Master-Slave Airlock
  _drawDffAirlock(ctx) {
    const phases = [
      { d: 1, clk: 0, m: 1, q: 0, msg: '① CLK=0 ▶ 前室が開いて D=1 が待機（後室は密閉）' },
      { d: 1, clk: 1, m: 1, q: 1, msg: '② CLK 0→1 鼓動! ▶ 前室が閉じ、後室が開き Q=1 確定！' },
      { d: 0, clk: 1, m: 1, q: 1, msg: '③ CLK=1のまま D=0 ▶ 前室が閉じてるので Q=1 のまま！' },
    ];
    const p = phases[this.stepIdx % 3];
    const frontOpen = p.clk === 0;
    const backOpen = p.clk === 1;

    this._pill(ctx, 8, 22, 46, 22, `D = ${p.d}`, p.d === 1, '#ffd166');
    this._pill(ctx, 8, 64, 56, 22, `CLK=${p.clk}`, p.clk === 1, '#c89bff');

    this._wire(ctx, [[54, 33], [86, 33]], p.d === 1 && frontOpen, '#ffd166');
    this._chip(
      ctx,
      86,
      16,
      84,
      40,
      '前室 D_LAT',
      frontOpen ? `🚪開 (中:${p.m})` : `🔒閉 (中:${p.m})`,
      frontOpen ? '#52e3b6' : '#7c8fa3',
      frontOpen
    );

    this._wire(ctx, [[170, 36], [196, 36]], p.m === 1 && backOpen, '#c89bff');
    this._chip(
      ctx,
      196,
      16,
      84,
      40,
      '後室 D_LAT',
      backOpen ? `🚪開 (Q:${p.q})` : `🔒閉 (Q:${p.q})`,
      backOpen ? '#c89bff' : '#7c8fa3',
      backOpen
    );

    this._wire(ctx, [[280, 36], [296, 36]], p.q === 1, '#c89bff');
    this._pill(ctx, 296, 24, 38, 24, `Q=${p.q}`, p.q === 1, '#c89bff');

    // Clock line underneath
    this._wire(ctx, [[64, 75], [128, 75], [128, 56]], frontOpen, '#52e3b6');
    this._wire(ctx, [[64, 75], [238, 75], [238, 56]], backOpen, '#c89bff');
    ctx.fillStyle = '#9db5cb';
    ctx.font = 'bold 8.5px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('NOT(CLK)', 128, 86);
    ctx.fillText('CLK', 238, 86);

    this._caption(ctx, p.msg, this.stepIdx, 3, backOpen ? '#c89bff' : '#52e3b6');
  }

  // 15: ALU 2's Complement Subtraction Magic
  _drawAluTwosComp(ctx) {
    const sub = this.stepIdx % 2 === 1;
    this._pill(ctx, 8, 16, 62, 20, 'A = 7', true, '#ffd166');
    this._pill(ctx, 8, 46, 62, 20, 'B = 2', true, '#7cd4f5');
    this._pill(ctx, 8, 76, 62, 20, `SUB = ${sub ? 1 : 0}`, sub, '#ff8a7a');

    this._wire(ctx, [[70, 26], [180, 26]], true, '#ffd166');
    this._wire(ctx, [[70, 56], [94, 56]], true, '#7cd4f5');
    this._wire(ctx, [[70, 86], [124, 86], [124, 72]], sub, '#ff8a7a');
    this._wire(ctx, [[124, 86], [218, 86], [218, 70]], sub, '#ff8a7a');

    this._chip(ctx, 94, 42, 64, 30, 'XOR×4', sub ? '反転! 13' : 'そのまま 2', '#ff8a7a', sub);
    this._wire(ctx, [[158, 56], [180, 56]], true, sub ? '#ff8a7a' : '#7cd4f5');

    this._chip(ctx, 180, 16, 76, 54, 'ADD_4B', sub ? 'CIN=+1' : 'CIN=0', '#5ce0a8', true);
    this._wire(ctx, [[256, 43], [278, 43]], true, '#5ce0a8');
    this._pill(ctx, 278, 30, 54, 26, sub ? 'Y = 5' : 'Y = 9', true, sub ? '#ff8a7a' : '#5ce0a8');

    this._caption(
      ctx,
      sub
        ? 'SUB=1 ▶ B全反転(13)＋1 で 7+13+1=21 → 下4桁=5（7−2！）'
        : 'SUB=0 ▶ そのまま足し算 7 + 2 = 9！',
      this.stepIdx,
      2,
      sub ? '#ff8a7a' : '#5ce0a8'
    );
  }

  // 16: Program Counter +1 & JMP Loop
  _drawPcLoop(ctx) {
    const phases = [
      { pc: 0, next: 1, jmp: 0, msg: '① CLK拍動 ▶ 今の番地 0 に +1 して次は「1」へ！' },
      { pc: 1, next: 2, jmp: 0, msg: '② CLK拍動 ▶ 自動で +1 して「2」へ進む！' },
      { pc: 2, next: 10, jmp: 1, msg: '③ JMP=1 ▶ MUXがジャンプ先 J=10 を選択してワープ！' },
      { pc: 10, next: 11, jmp: 0, msg: '④ CLK拍動 ▶ 飛び先 10 から再び +1 で「11」へ！' },
    ];
    const p = phases[this.stepIdx % 4];

    this._chip(ctx, 14, 24, 72, 42, 'REG_4B', `現在: ${p.pc}番地`, '#c89bff', true);
    this._wire(ctx, [[86, 45], [116, 45]], true, '#c89bff');
    this._chip(ctx, 116, 24, 72, 42, 'ADD_4B', `+1 → ${(p.pc + 1) & 15}`, '#5ce0a8', p.jmp === 0);
    this._wire(ctx, [[188, 45], [218, 45]], p.jmp === 0, '#5ce0a8');
    this._chip(ctx, 218, 24, 72, 42, 'MUX_4B', p.jmp ? 'JMP→10!' : '通常(+1)', '#ff8a7a', true);

    // Feedback return wire from MUX back to REG
    this._wire(ctx, [[290, 45], [318, 45], [318, 86], [50, 86], [50, 66]], true, p.jmp ? '#ff8a7a' : '#ffd166');
    this._pill(ctx, 218, 72, 72, 18, `JMP = ${p.jmp}`, p.jmp === 1, '#ff8a7a');

    this._caption(ctx, p.msg, this.stepIdx, 4, p.jmp ? '#ff8a7a' : '#5ce0a8');
  }

  // 17: ARK-4 CPU 3-Chip Brain Loop
  _drawArk4Cpu(ctx) {
    const phases = [
      { acc: 0, cmd: 'LDI 5', res: 5, set: 1, msg: '① LDI 5 (SET=1) ▶ 数値5をそのままレジスタへ代入！' },
      { acc: 5, cmd: 'ADD 3', res: 8, set: 0, msg: '② ADD 3 (OP=0) ▶ ALUが 5+3=8 を計算して書き戻す！' },
      { acc: 8, cmd: 'SUB 2', res: 6, set: 0, msg: '③ SUB 2 (OP=1) ▶ ALUが 8−2=6 を計算して書き戻す！' },
    ];
    const p = phases[this.stepIdx % 3];

    this._chip(ctx, 16, 22, 78, 44, 'REG_4B', `ACC = ${p.acc}`, '#c89bff', true);
    this._wire(ctx, [[94, 44], [128, 44]], p.set === 0, '#c89bff');
    this._chip(ctx, 128, 22, 78, 44, 'ALU_4B', p.set ? '待機' : `${p.cmd}→${p.res}`, '#ff8a7a', p.set === 0);
    this._wire(ctx, [[206, 44], [238, 44]], p.set === 0, '#ff8a7a');
    this._chip(ctx, 238, 22, 78, 44, 'MUX_4B', p.set ? `直接→${p.res}` : `計算→${p.res}`, '#ffbe76', true);

    // Loop back into REG_4B!
    this._wire(ctx, [[316, 44], [328, 44], [328, 84], [55, 84], [55, 66]], true, '#ffbe76');
    this._pill(ctx, 128, 74, 96, 18, `命令: ${p.cmd}`, true, '#ffd166');

    this._caption(ctx, p.msg, this.stepIdx, 3, '#ffbe76');
  }

  // SHORT CIRCUIT vs RESISTOR SAFE DRAIN
  _drawShortSpark(ctx) {
    const safe = this.stepIdx % 2 === 1;
    this._pill(ctx, 12, 36, 72, 24, '🔋 でんち 5V', true, '#ffd166');
    this._wire(ctx, [[84, 48], [116, 48]], true, safe ? '#ffd166' : '#ff5c5c');

    this._chip(
      ctx,
      116,
      30,
      96,
      36,
      safe ? 'ていこう（細道）' : 'ただの太い導線',
      safe ? '電流を制限✔' : 'ブレーキ無し!',
      safe ? '#7cd4f5' : '#ff5c5c',
      true
    );

    this._wire(ctx, [[212, 48], [254, 48]], true, safe ? '#7cd4f5' : '#ff5c5c');
    this._pill(ctx, 254, 36, 74, 24, '⏚ 地面 0V', true, safe ? '#52e3b6' : '#ff5c5c');

    if (!safe) {
      // Animated short-circuit sparks!
      const cx = 164;
      const cy = 48;
      ctx.save();
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2 + this.time * 10;
        const r1 = 16;
        const r2 = 25 + Math.sin(this.time * 24 + i) * 5;
        ctx.strokeStyle = i % 2 === 0 ? '#ff5252' : '#ffd166';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1);
        ctx.lineTo(cx + Math.cos(ang) * r2, cy + Math.sin(ang) * r2);
        ctx.stroke();
      }
      ctx.restore();
    }

    this._caption(
      ctx,
      safe
        ? '⭕ 抵抗を挟む ▶ 電流が適度に絞られ、火花が出ず安全！'
        : '💥 電池と地面を直結 ▶ 大電流が暴走してショート焼損！',
      this.stepIdx,
      2,
      safe ? '#52e3b6' : '#ff6b6b'
    );
  }

  // 09: 4-BIT DATA BUS (MUX_4B)
  _drawDataBus4Bit(ctx) {
    const sel = this.stepIdx % 2;
    this._pill(ctx, 10, 14, 86, 24, 'バスA: 0101 (5)', sel === 0, '#52e3b6');
    this._pill(ctx, 10, 62, 86, 24, 'バスB: 1100 (12)', sel === 1, '#6ec3ff');

    // 4 parallel bus traces from A and B
    for (let i = 0; i < 4; i++) {
      const dy = (i - 1.5) * 4;
      this._wire(ctx, [[96, 26 + dy], [136, 36 + dy]], sel === 0, '#52e3b6');
      this._wire(ctx, [[96, 74 + dy], [136, 58 + dy]], sel === 1, '#6ec3ff');
    }

    this._chip(ctx, 136, 22, 82, 52, 'MUX_4B', `4本一括 SEL=${sel}`, sel ? '#6ec3ff' : '#52e3b6', true);

    for (let i = 0; i < 4; i++) {
      const dy = (i - 1.5) * 5;
      this._wire(ctx, [[218, 48 + dy], [250, 48 + dy]], true, sel ? '#6ec3ff' : '#52e3b6');
    }

    this._pill(
      ctx,
      250,
      34,
      80,
      28,
      sel === 0 ? 'Y = 0101 (5)' : 'Y = 1100 (12)',
      true,
      sel ? '#6ec3ff' : '#52e3b6'
    );

    this._caption(
      ctx,
      sel === 0
        ? 'SEL=0 ▶ 4本の束（バスA＝5）を丸ごと一斉転送！'
        : 'SEL=1 ▶ 4本の束（バスB＝12）へ丸ごと一斉切替！',
      this.stepIdx,
      2,
      sel ? '#6ec3ff' : '#52e3b6'
    );
  }

  // 12: D-LATCH 1-BIT MEMORY VAULT
  _drawDLatchVault(ctx) {
    const phases = [
      { d: 1, we: 1, q: 1, msg: '① WE=1（保存カギ開）▶ D=1 を金庫へ書き込み Q=1！' },
      { d: 0, we: 0, q: 1, msg: '② WE=0（ロック中！）▶ 外のDが0に変わっても Q=1 を死守！' },
      { d: 0, we: 1, q: 0, msg: '③ WE=1（保存カギ開）▶ 新しい D=0 で金庫を Q=0 に上書き！' },
    ];
    const p = phases[this.stepIdx % 3];

    this._pill(ctx, 10, 18, 54, 22, `D = ${p.d}`, p.d === 1, '#ffd166');
    this._pill(ctx, 10, 62, 62, 22, `WE = ${p.we}`, p.we === 1, '#52e3b6');

    this._wire(ctx, [[64, 29], [102, 29]], p.d === 1, '#ffd166');
    this._wire(ctx, [[72, 73], [102, 54]], p.we === 1, '#52e3b6');

    this._chip(
      ctx,
      102,
      18,
      72,
      46,
      'AND門番',
      p.we ? '🔓 通過OK' : '🔒 遮断中',
      p.we ? '#52e3b6' : '#7c8fa3',
      p.we === 1
    );

    this._wire(ctx, [[174, 41], [198, 41]], p.we === 1, '#52e3b6');
    this._chip(ctx, 198, 18, 72, 46, 'SR_LAT', `金庫の中:${p.q}`, '#c89bff', p.q === 1);
    this._wire(ctx, [[270, 41], [286, 41]], p.q === 1, '#c89bff');
    this._pill(ctx, 286, 29, 46, 24, `Q=${p.q}`, p.q === 1, '#c89bff');

    this._caption(ctx, p.msg, this.stepIdx, 3, p.we ? '#52e3b6' : '#c89bff');
  }

  // 14: 4-BIT REGISTER (MUX_4B + D_FF×4)
  _drawReg4Bit(ctx) {
    const phases = [
      { d: 9, load: 1, q: 9, msg: '① LOAD=1, CLK↑ ▶ 新しい4桁「9 (1001)」を作業机へ保存！' },
      { d: 3, load: 0, q: 9, msg: '② LOAD=0, CLK↑ ▶ 自分のQ=9を自分へ戻して「9」をキープ！' },
      { d: 14, load: 1, q: 14, msg: '③ LOAD=1, CLK↑ ▶ 新しい4桁「14 (1110)」へ書き換え！' },
    ];
    const p = phases[this.stepIdx % 3];

    this._pill(ctx, 8, 22, 56, 22, `入力D=${p.d}`, p.load === 1, '#ffd166');
    this._pill(ctx, 8, 56, 62, 22, `LOAD=${p.load}`, p.load === 1, '#52e3b6');

    this._wire(ctx, [[64, 33], [98, 33]], p.load === 1, '#ffd166');
    this._wire(ctx, [[70, 67], [132, 67], [132, 58]], p.load === 1, '#52e3b6');

    this._chip(ctx, 98, 18, 68, 40, 'MUX_4B', p.load ? '新規D選択' : '保持Q選択', '#6ec3ff', true);
    this._wire(ctx, [[166, 38], [192, 38]], true, '#6ec3ff');
    this._chip(ctx, 192, 18, 72, 40, 'D_FF×4', `記憶Q = ${p.q}`, '#c89bff', true);

    // Feedback wire from D_FF back to MUX_4B when holding!
    this._wire(ctx, [[264, 38], [282, 38]], true, '#c89bff');
    this._wire(ctx, [[272, 38], [272, 86], [84, 86], [84, 46], [98, 46]], p.load === 0, '#c89bff');
    this._pill(ctx, 282, 26, 50, 24, `Q=${p.q}`, true, '#c89bff');

    this._caption(ctx, p.msg, this.stepIdx, 3, p.load ? '#52e3b6' : '#c89bff');
  }
}

/**
 * Multi-canvas coordinator for the Module Encyclopedia modal:
 * Drives all visible `<canvas data-anim="...">` elements inside a scroll container
 * using a SINGLE shared requestAnimationFrame loop for zero mobile battery/GPU waste.
 */
export class StoryDiagramGroup {
  constructor() {
    this.items = [];
    this._raf = null;
    this._lastTs = 0;
  }

  mountAll(containerEl) {
    this.unmountAll();
    if (!containerEl) return;
    const canvases = containerEl.querySelectorAll('canvas[data-anim]');
    canvases.forEach((canvas) => {
      const kind = canvas.dataset.anim;
      if (!kind) return;
      const player = new StoryDiagramPlayer();
      player.canvas = canvas;
      player.ctx = canvas.getContext('2d');
      player.kind = kind;
      player._onClick = (e) => {
        e.stopPropagation();
        player.stepIdx++;
        player.stepTimer = 0;
        sound.playSwitch(true);
        player._render();
      };
      canvas.addEventListener('click', player._onClick);
      player._render();
      this.items.push(player);
    });

    if (this.items.length === 0) return;
    this._lastTs = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.05, Math.max(0, (now - this._lastTs) / 1000));
      this._lastTs = now;
      const vh = window.innerHeight || 844;
      for (const p of this.items) {
        if (!p.canvas) continue;
        const r = p.canvas.getBoundingClientRect();
        // Only tick & repaint canvases currently visible on screen
        if (r.width > 0 && r.bottom >= -40 && r.top <= vh + 40) {
          p.time += dt;
          p.stepTimer += dt;
          if (p.stepTimer >= STEP_PERIOD_SEC) {
            p.stepTimer = 0;
            p.stepIdx++;
          }
          p._render();
        }
      }
      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  }

  unmountAll() {
    if (this._raf) {
      cancelAnimationFrame(this._raf);
      this._raf = null;
    }
    for (const p of this.items) {
      if (p.canvas && p._onClick) {
        p.canvas.removeEventListener('click', p._onClick);
      }
      p.canvas = null;
      p.ctx = null;
    }
    this.items = [];
  }
}
