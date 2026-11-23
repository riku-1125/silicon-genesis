/**
 * SILICON GENESIS — Mobile-First ARK-4 Assembly IDE & Physical Hardware Bridge
 *
 * Powers Stages 22–24 (`stage.kind === 'assembly_program'`) with:
 *   1. Live Physical Wire Bridge: shows how every line of assembly text turns
 *      directly into the 6 physical input pins (`I1, I0, IMM3..0`) of the
 *      player's own forged `ARK4_SYS` circuit (Stage 21), driving `INST_DEC`,
 *      `ARK4_CPU`, `ZERO_4B`, and `COND_PC` in real time.
 *   2. Real ARK-4 Assembly Editor (`main.asm`): write any valid opcode
 *      (`LDI`, `ADD`, `SUB`, `JZ`) + 4-bit operand (`0..15`) via either a
 *      thumb-friendly mobile Assembly Composer OR direct raw-text typing mode.
 *   3. 100% gate-level execution through `romRunner.js` on the player's actual
 *      compiled `ARK4_SYS` circuit.
 */

import {
  ARK4_OPCODES,
  compileRomHardware,
  makeInstructionPart,
  resolveSlotInstruction,
  probeInstructionDecode,
  runRomProgram,
  evaluateRomStage,
  formatProgramText,
  assembleProgramText,
} from '../engine/romRunner.js?v=35';

const EDITABLE_OPCODES = ['LDI', 'ADD', 'SUB', 'JZ'];

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function summarizeDecodeAction(dec, part) {
  if (!part) return '待機中';
  if (part.op === 'LOOP') return '外部帰還(RET=1)';
  if (dec.brFlag && !dec.weFlag) return '0なら分岐(ACC保持)';
  if (dec.setFlag && dec.weFlag) return 'そのままACCへ代入';
  if (dec.opFlag && dec.weFlag) return '引き算してACC保存';
  if (!dec.opFlag && dec.weFlag) return '足し算してACC保存';
  return '制御信号出力中';
}

export class AssemblyIdePanel {
  constructor(containerEl, paletteHostEl, callbacks = {}) {
    this.container = containerEl;
    this.paletteHost = paletteHostEl;
    this.cb = callbacks;

    this.stage = null;
    this.customChips = {};
    this.slots = {};
    this.selectedAddr = 0;
    this.editorMode = 'visual'; // 'visual' | 'text'
    this.rawText = '';
    this.textErrors = [];

    this._hw = null;
    this.asmTrace = [];
    this.asmState = this._makeIdleState();
    this.awaitingFinalClock = false;
    this.statusMsg = '';
    this.statusTone = 'info'; // 'info' | 'ok' | 'warn' | 'err'
  }

  _makeIdleState() {
    return {
      pc: 0,
      pcNext: 0,
      accBefore: 0,
      acc: 0,
      z: 1,
      opcodeBits: '00',
      immBits: '0000',
      retBit: 0,
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

  setStage(stage, savedSlots = null, customChips = null) {
    this.stage = stage;
    if (customChips) this.customChips = customChips;
    this.awaitingFinalClock = false;
    this.editorMode = 'visual';
    this.textErrors = [];
    this.statusMsg = '';
    this.statusTone = 'info';

    this.slots = {};
    const rows = stage?.asmProgramSpec?.rows || [];
    for (const r of rows) {
      if (!r.locked) {
        const resolved = resolveSlotInstruction(savedSlots?.[r.slotId], stage);
        this.slots[r.slotId] = resolved ? resolved.id : null;
      }
    }

    // Compile player's ARK4_SYS hardware once for instant live INST_DEC pin previews
    try {
      this._hw = compileRomHardware(this.customChips);
    } catch {
      this._hw = null;
    }

    // Focus first empty editable line, or first editable line if all filled
    const firstEmpty = rows.find((r) => !r.locked && !this.slots[r.slotId]);
    const firstEditable = rows.find((r) => !r.locked);
    this.selectedAddr = firstEmpty ? firstEmpty.addr : firstEditable ? firstEditable.addr : 0;

    this.rawText = formatProgramText(this.stage, this.slots);
    this._resetExecution();
    this.render();
    this.renderComposer();
    this._notifyLiveState();
  }

  _resetExecution() {
    this.asmTrace = [];
    this.asmState = this._makeIdleState();
    this.awaitingFinalClock = false;
  }

  clearAll() {
    if (!this.stage) return;
    for (const k of Object.keys(this.slots)) {
      this.slots[k] = null;
    }
    const firstEditable = (this.stage.asmProgramSpec?.rows || []).find((r) => !r.locked);
    this.selectedAddr = firstEditable ? firstEditable.addr : 0;
    this.rawText = formatProgramText(this.stage, this.slots);
    this.textErrors = [];
    this._resetExecution();
    this.statusMsg = 'ROMをクリアしました。0番地からアセンブリ命令を書き込もう！';
    this.statusTone = 'info';
    this.cb.onSlotsChange?.({ ...this.slots });
    this.render();
    this.renderComposer();
    this._notifyLiveState();
  }

  setAwaitingFinalClock(awaiting) {
    this.awaitingFinalClock = Boolean(awaiting);
    if (this.awaitingFinalClock) {
      this.statusMsg =
        '⚡ カウントダウン 0 達成・4番地到達！「⚡ 最終開門CLK」を押して全開信号 1111(15) を送出せよ！';
      this.statusTone = 'warn';
    }
    this.render();
  }

  setTraceStep(stepIdx) {
    if (Array.isArray(this.asmTrace) && this.asmTrace[stepIdx]) {
      this.asmState = { ...this.asmTrace[stepIdx] };
      this.statusMsg = `⚡ 実行 ${stepIdx + 1}/${this.asmTrace.length}拍目：${this.asmState.label}`;
      this.statusTone = this.asmState.unstable ? 'err' : 'ok';
      this.render();
      this._notifyLiveState();
    }
  }

  evaluateAssembly() {
    if (!this.stage) return { passed: false, results: [], error: 'ステージ未読込' };

    if (this.editorMode === 'text' && this.textErrors.length > 0) {
      return {
        passed: false,
        error: `アセンブル構文エラー（${this.textErrors[0].message}）を修正してから実行してください。`,
        results: [],
        trace: [],
        passedCount: 0,
        totalCount: (this.stage.asmProgramSpec?.rows || []).filter((r) => !r.locked).length,
        metrics: { nandCount: 0, nodeCount: 0, wireCount: 0, depth: 0 },
      };
    }

    const res = evaluateRomStage(this.stage, this.slots, this.customChips);
    this.asmTrace = res.trace || [];
    if (this.asmTrace.length > 0) {
      this.asmState = { ...this.asmTrace[0] };
    } else {
      this.asmState = this._makeIdleState();
    }
    this.render();
    this._notifyLiveState();
    return res;
  }

  stepOnce() {
    if (!this.stage) return;
    if (this.awaitingFinalClock) {
      this.cb.onFinalClockTrigger?.();
      return;
    }

    if (this.editorMode === 'text' && this.textErrors.length > 0) {
      this.statusMsg = `⚠ 構文エラー: ${this.textErrors[0].message}`;
      this.statusTone = 'err';
      this.cb.onSound?.('error');
      this.render();
      return;
    }

    if (!this.asmTrace || this.asmTrace.length === 0) {
      const run = runRomProgram(this.stage, this.slots, this.customChips, { maxCycles: 14 });
      if (run.compileError) {
        this.statusMsg = `💥 コンパイルエラー: ${run.compileError}`;
        this.statusTone = 'err';
        this.cb.onSound?.('error');
        this.render();
        return;
      }
      if (!run.trace || run.trace.length === 0) {
        this.statusMsg = '0番地にまだ命令がありません！ 下のキーで命令を書き込んでから実行しよう。';
        this.statusTone = 'warn';
        this.cb.onSound?.('error');
        this.render();
        return;
      }
      this.asmTrace = run.trace;
      this.asmState = { ...this.asmTrace[0] };
      this.statusMsg = `⚡ 1/${this.asmTrace.length}拍目：${this.asmState.label}`;
      this.statusTone = this.asmState.unstable ? 'err' : 'ok';
      this.cb.onSound?.('clock');
      this.render();
      this._notifyLiveState();
      return;
    }

    const nextIdx = (this.asmState.stepIdx ?? -1) + 1;
    if (nextIdx >= this.asmTrace.length) {
      this._resetExecution();
      this.statusMsg = '↺ 0番地（PC=0, ACC=0）へリセットしました。もう一度1拍ずつ確認できます。';
      this.statusTone = 'info';
      this.cb.onSound?.('switch');
    } else {
      this.asmState = { ...this.asmTrace[nextIdx] };
      const limitNote =
        nextIdx === this.asmTrace.length - 1 && this.asmTrace.length >= 14
          ? '（⚠ 14拍上限）'
          : '';
      this.statusMsg = `⚡ ${nextIdx + 1}/${this.asmTrace.length}拍目：${this.asmState.label}${limitNote}`;
      this.statusTone = this.asmState.unstable ? 'err' : 'ok';
      this.cb.onSound?.('clock');
    }

    this.render();
    this._notifyLiveState();
  }

  resetPc() {
    this._resetExecution();
    this.statusMsg = '↺ 実機CPUを電源リセット（PC=0, ACC=0）しました。';
    this.statusTone = 'info';
    this.cb.onSound?.('switch');
    this.render();
    this._notifyLiveState();
  }

  _getRowByAddr(addr) {
    return (this.stage?.asmProgramSpec?.rows || []).find((r) => r.addr === addr) || null;
  }

  _getCurrentSelectedPart() {
    const row = this._getRowByAddr(this.selectedAddr);
    if (!row) return null;
    if (row.locked) return row.fixedPart;
    return resolveSlotInstruction(this.slots[row.slotId], this.stage);
  }

  _setInstructionAt(addr, op, val) {
    const row = this._getRowByAddr(addr);
    if (!row || row.locked) return;
    if (!op) {
      this.slots[row.slotId] = null;
    } else {
      const part = makeInstructionPart(op, val);
      this.slots[row.slotId] = part ? part.id : null;
    }
    this.rawText = formatProgramText(this.stage, this.slots);
    this.textErrors = [];
    this._resetExecution();

    const rows = (this.stage.asmProgramSpec?.rows || []).filter((r) => !r.locked);
    const allFilled = rows.every((r) => Boolean(this.slots[r.slotId]));
    if (allFilled) {
      this.statusMsg = '✔ 全番地の命令を記述完了！「⚡1拍実行」または右下のテスト実行で自作CPUを動かそう！';
      this.statusTone = 'ok';
    } else if (op) {
      const p = makeInstructionPart(op, val);
      this.statusMsg = `📡 ${addr}番地を [${p.name}]（電線 ${p.opcodeBits}:${p.immBits}）に更新しました`;
      this.statusTone = 'info';
    } else {
      this.statusMsg = `${addr}番地を空欄にしました`;
      this.statusTone = 'info';
    }

    this.cb.onSlotsChange?.({ ...this.slots });
    this.render();
    this.renderComposer();
    this._notifyLiveState();
  }

  _selectNextEditableAddr() {
    const editable = (this.stage?.asmProgramSpec?.rows || []).filter((r) => !r.locked);
    if (editable.length === 0) return;
    const idx = editable.findIndex((r) => r.addr === this.selectedAddr);
    const next = editable[(idx + 1) % editable.length];
    this.selectedAddr = next.addr;
    this.cb.onSound?.('switch');
    this.render();
    this.renderComposer();
  }

  _notifyLiveState() {
    if (!this.stage) return;
    const acc = this.asmState?.acc ?? 0;
    this.cb.onLiveState?.({
      inputs: [this.asmState?.pc ?? 0],
      outputs: [acc & 1, (acc >> 1) & 1, (acc >> 2) & 1, (acc >> 3) & 1],
      unstable: Boolean(this.asmState?.unstable),
    });
  }

  _getHardwareBridgeViewModel() {
    const st = this.asmState;
    const isStepping = st.stepIdx >= 0;
    const rows = this.stage?.asmProgramSpec?.rows || [];

    // Determine which instruction is currently driving the 6 input pins of ARK4_SYS:
    // - While awaiting Stage 24 final clock: row 4 (LDI 15)
    // - While stepping: the executed cycle's instruction
    // - While idle/editing: the currently selected line so edits flip the 6 wire LEDs LIVE!
    let activeAddr = this.selectedAddr;
    let activePart = this._getCurrentSelectedPart();
    let modeLabel = '📡 編集中プレビュー';
    let decode = probeInstructionDecode(this._hw, activePart);

    if (this.awaitingFinalClock) {
      const r4 = rows.find((r) => r.addr === 4);
      activeAddr = 4;
      activePart = r4 ? resolveSlotInstruction(this.slots[r4.slotId], this.stage) : null;
      decode = probeInstructionDecode(this._hw, activePart);
      modeLabel = '⚡ 最終開門クロック待機中';
    } else if (isStepping) {
      activeAddr = st.pc;
      const r = rows.find((row) => row.addr === st.pc);
      activePart = r
        ? r.locked
          ? r.fixedPart
          : resolveSlotInstruction(this.slots[r.slotId], this.stage)
        : null;
      decode = {
        i1: st.opcodeBits?.[0] === '1' ? 1 : 0,
        i0: st.opcodeBits?.[1] === '1' ? 1 : 0,
        imm: [
          st.immBits?.[3] === '1' ? 1 : 0,
          st.immBits?.[2] === '1' ? 1 : 0,
          st.immBits?.[1] === '1' ? 1 : 0,
          st.immBits?.[0] === '1' ? 1 : 0,
        ],
        ret: st.retBit ? 1 : 0,
        opcodeBits: st.opcodeBits || '00',
        immBits: st.immBits || '0000',
        opFlag: st.opFlag ? 1 : 0,
        setFlag: st.setFlag ? 1 : 0,
        weFlag: st.weFlag ? 1 : 0,
        brFlag: st.brFlag ? 1 : 0,
      };
      modeLabel = `⚡ 実行 ${st.stepIdx + 1}/${this.asmTrace.length}拍目`;
    }

    return {
      isStepping,
      activeAddr,
      activePart,
      decode,
      modeLabel,
      accBits: ((st.acc & 15) >>> 0).toString(2).padStart(4, '0'),
    };
  }

  render() {
    if (!this.container || !this.stage) return;
    const spec = this.stage.asmProgramSpec;
    const rows = spec?.rows || [];
    const st = this.asmState;
    const vm = this._getHardwareBridgeViewModel();
    const { decode, activePart, activeAddr, isStepping, modeLabel, accBits } = vm;

    const pinBit = (label, bit, cls = '') =>
      `<span class="asm-pin ${bit ? 'on' : 'off'} ${cls}"><span class="asm-pin-lbl">${label}</span><span class="asm-pin-val">${bit}</span></span>`;

    const ctrlBit = (label, bit) =>
      `<span class="asm-wire-led ${bit ? 'on' : 'off'}">${label}:${bit}</span>`;

    const accLedRow = [3, 2, 1, 0]
      .map((b) => {
        const bit = (st.acc >> b) & 1;
        return `<span class="asm-bit-dot ${bit ? 'on' : 'off'}">${bit}</span>`;
      })
      .join('');

    const opNameDisp = activePart ? activePart.name : '空欄';
    const opBadgeColor = activePart?.color || '#33465a';
    const decSummary = summarizeDecodeAction(decode, activePart);
    const nandCount = this._hw?.metrics?.nandCount || 0;

    // Build visual code rows or raw text editor
    let editorContentHtml = '';
    if (this.editorMode === 'visual') {
      const lineItems = rows
        .map((r) => {
          const part = r.locked
            ? r.fixedPart
            : resolveSlotInstruction(this.slots[r.slotId], this.stage);
          const isAwaitingOpen = this.awaitingFinalClock && r.addr === 4;
          const isPcNow = isAwaitingOpen || (isStepping && st.pc === r.addr);
          const isSelected = !r.locked && this.selectedAddr === r.addr;
          const opCls = part ? `op-${part.op.toLowerCase()}` : 'op-empty';
          const bits = part ? `${part.opcodeBits} ${part.immBits}` : '-- ----';
          const commentText = part
            ? r.locked
              ? r.addr === 3 && part.op === 'LOOP'
                ? '固定回路: RET=1で1番地へ帰還'
                : `固定命令: ${part.meta || part.rule}`
              : part.comment
            : 'タップして命令を書く';

          return `
            <button type="button"
              class="asm-code-row ${isSelected ? 'selected' : ''} ${isPcNow ? 'pc-active' : ''} ${isAwaitingOpen ? 'awaiting-open' : ''} ${r.locked ? 'locked' : ''}"
              data-addr="${r.addr}"
              data-locked="${r.locked ? '1' : '0'}">
              <span class="asm-row-gutter">
                <span class="asm-pc-arrow">${isPcNow ? '▶' : isSelected ? '▸' : ''}</span>
                <span class="asm-addr-num">${r.addr}:</span>
              </span>
              <span class="asm-row-code">
                ${
                  part
                    ? `<span class="asm-op-token ${opCls}">${escapeHtml(part.op)}</span>
                       <span class="asm-val-token">${part.val}</span>`
                    : `<span class="asm-placeholder-token">---</span>`
                }
              </span>
              <span class="asm-row-bits ${part ? '' : 'empty'}" title="機械語 6bit (I1 I0 | IMM3..0)">${bits}${r.locked ? '🔒' : ''}</span>
              <span class="asm-row-comment">; ${escapeHtml(commentText)}</span>
            </button>
          `;
        })
        .join('');

      editorContentHtml = `<div class="asm-code-list" role="listbox" aria-label="ARK-4 アセンブリ命令リスト">${lineItems}</div>`;
    } else {
      const errBanner =
        this.textErrors.length > 0
          ? `<div class="asm-text-status err">⚠ ${escapeHtml(this.textErrors[0].message)}</div>`
          : `<div class="asm-text-status ok">✔ アセンブルOK（行ごとに「命令 数値」で入力 ／ ;以降はコメント）</div>`;

      editorContentHtml = `
        <div class="asm-text-editor-wrap">
          <div class="asm-text-help">書式: <code>0: LDI 3</code> ／ 命令: <code>LDI</code> <code>ADD</code> <code>SUB</code> <code>JZ</code> ／ 数値: <code>0〜15</code> (2進数 <code>0b1111</code> も可)</div>
          <textarea id="asm-raw-textarea" class="asm-raw-textarea" rows="${Math.max(5, rows.length + 1)}" spellcheck="false" autocomplete="off" autocapitalize="characters">${escapeHtml(this.rawText)}</textarea>
          ${errBanner}
        </div>
      `;
    }

    const statusBarHtml = this.statusMsg
      ? `<div class="asm-live-banner tone-${this.statusTone}">${escapeHtml(this.statusMsg)}</div>`
      : '';

    this.container.innerHTML = `
      <div class="asm-ide-grid">
        <!-- LEFT / TOP: PHYSICAL ARK4_SYS HARDWARE WIRE BRIDGE -->
        <section class="asm-hw-panel ${this.awaitingFinalClock ? 'awaiting-open' : ''}">
          <div class="asm-hw-head">
            <div class="asm-hw-title-wrap">
              <span class="asm-hw-title">⚡ 実機 ARK4_SYS</span>
              ${nandCount > 0 ? `<span class="asm-nand-tag">${nandCount}N</span>` : ''}
              <button type="button" class="asm-inspect-btn" id="btn-asm-inspect">🔍 回路</button>
            </div>
            <div class="asm-hw-controls">
              <button type="button" class="asm-mini-ctrl" id="btn-asm-reset" title="電源リセット (PC=0, ACC=0)">↺</button>
              <button type="button" class="asm-step-btn ${this.awaitingFinalClock ? 'final-clock' : ''}" id="btn-asm-step">
                ${this.awaitingFinalClock ? '⚡ 最終開門CLK' : '⚡ 1拍実行(CLK)'}
              </button>
            </div>
          </div>

          <!-- PHYSICAL BRIDGE: TEXT -> 6 ELECTRIC SWITCH PINS -->
          <div class="asm-bus-bridge">
            <div class="asm-bus-source">
              <span class="asm-bus-mode">${escapeHtml(modeLabel)}</span>
              <span class="asm-bus-inst" style="background:${opBadgeColor}">${activeAddr}番: ${escapeHtml(opNameDisp)}</span>
              <span class="asm-bus-arrow">▶ 6本電線へ</span>
            </div>
            <div class="asm-bus-pins-row">
              <div class="asm-pin-group">
                <span class="asm-pin-grp-title">命令</span>
                <div class="asm-pin-cells">
                  ${pinBit('I1', decode.i1, 'op-pin')}
                  ${pinBit('I0', decode.i0, 'op-pin')}
                  ${decode.ret ? `<span class="asm-pin on ret-pin"><span class="asm-pin-lbl">RET</span><span class="asm-pin-val">1</span></span>` : ''}
                </div>
              </div>
              <div class="asm-pin-group">
                <span class="asm-pin-grp-title">IMM(${activePart ? activePart.val : 0})</span>
                <div class="asm-pin-cells">
                  ${pinBit('3', decode.imm[3], 'imm-pin')}
                  ${pinBit('2', decode.imm[2], 'imm-pin')}
                  ${pinBit('1', decode.imm[1], 'imm-pin')}
                  ${pinBit('0', decode.imm[0], 'imm-pin')}
                </div>
              </div>
            </div>
          </div>

          <!-- LIVE 4-CHIP SIGNAL MONITOR -->
          <div class="asm-chips-grid">
            <div class="asm-chip-card chip-dec">
              <div class="asm-chip-hdr"><span>INST_DEC</span><span class="asm-chip-sub">翻訳</span></div>
              <div class="asm-wire-row">
                ${ctrlBit('OP', decode.opFlag)}
                ${ctrlBit('SET', decode.setFlag)}
                ${ctrlBit('WE', decode.weFlag)}
                ${ctrlBit('BR', decode.brFlag)}
              </div>
              <div class="asm-chip-foot">${escapeHtml(decSummary)}</div>
            </div>

            <div class="asm-chip-card chip-cpu">
              <div class="asm-chip-hdr"><span>ARK4_CPU</span><span class="asm-chip-sub">ACC</span></div>
              <div class="asm-chip-big">
                ${isStepping ? `${st.accBefore} → <strong>${st.acc}</strong>` : `ACC = <strong>${st.acc}</strong>`}
              </div>
              <div class="asm-bit-leds" title="2進数 ${accBits}">${accLedRow}</div>
            </div>

            <div class="asm-chip-card chip-zero ${st.z ? 'active-z' : ''}">
              <div class="asm-chip-hdr"><span>ZERO_4B</span><span class="asm-chip-sub">ゼロ目</span></div>
              <div class="asm-chip-big">Z = <strong>${st.z}</strong></div>
              <div class="asm-chip-foot">${st.retBit ? '✔ RET接地(Z=1)' : st.z ? '✔ ゼロ検知!' : '非ゼロ'}</div>
            </div>

            <div class="asm-chip-card chip-pc ${st.jmpFired ? 'active-jmp' : ''}">
              <div class="asm-chip-hdr"><span>COND_PC</span><span class="asm-chip-sub">行番号</span></div>
              <div class="asm-chip-big">
                ${isStepping ? `${st.pc} → <strong>${st.pcNext}番</strong>` : `PC = <strong>${st.pc}番</strong>`}
              </div>
              <div class="asm-chip-foot">${st.retBit ? '🔄 外部帰還' : st.jmpFired ? '⚡ ジャンプ!' : '通常 +1 進行'}</div>
            </div>
          </div>
        </section>

        <!-- RIGHT / BOTTOM: REAL ARK-4 ASSEMBLY CODE EDITOR -->
        <section class="asm-editor-panel">
          <div class="asm-editor-head">
            <div class="asm-editor-file">
              <span class="asm-file-dot"></span>
              <span class="asm-file-name">main.asm</span>
              <span class="asm-file-range">ROM 0〜${rows.length - 1}番地</span>
            </div>
            <div class="asm-editor-actions">
              <button type="button" class="asm-mode-btn ${this.editorMode === 'visual' ? 'active' : ''}" data-editor-mode="visual">🧩 行入力</button>
              <button type="button" class="asm-mode-btn ${this.editorMode === 'text' ? 'active' : ''}" data-editor-mode="text">⌨ 直打ち</button>
              <button type="button" class="asm-clear-btn" id="btn-asm-clear" title="プログラムを全消去">✕</button>
            </div>
          </div>
          <div class="asm-goal-strip">🎯 ${escapeHtml(spec?.goalTitle || this.stage.plainGoal)}</div>
          ${editorContentHtml}
          ${statusBarHtml}
        </section>
      </div>
    `;

    this._bindContainerEvents();
  }

  _bindContainerEvents() {
    this.container.querySelector('#btn-asm-step')?.addEventListener('click', () => this.stepOnce());
    this.container.querySelector('#btn-asm-reset')?.addEventListener('click', () => this.resetPc());
    this.container.querySelector('#btn-asm-clear')?.addEventListener('click', () => {
      this.cb.onSound?.('switch');
      this.clearAll();
    });
    this.container.querySelector('#btn-asm-inspect')?.addEventListener('click', () => {
      this.cb.onSound?.('switch');
      this.cb.onInspectArk4?.();
    });

    this.container.querySelectorAll('[data-editor-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const nextMode = btn.dataset.editorMode;
        if (nextMode === this.editorMode) return;
        this.cb.onSound?.('switch');
        if (nextMode === 'text') {
          this.rawText = formatProgramText(this.stage, this.slots);
          this.textErrors = [];
        } else if (this.textErrors.length === 0) {
          this.rawText = formatProgramText(this.stage, this.slots);
        }
        this.editorMode = nextMode;
        this.render();
        this.renderComposer();
      });
    });

    this.container.querySelectorAll('.asm-code-row').forEach((rowBtn) => {
      rowBtn.addEventListener('click', () => {
        const addr = Number(rowBtn.dataset.addr);
        const isLocked = rowBtn.dataset.locked === '1';
        if (isLocked) {
          const row = this._getRowByAddr(addr);
          this.statusMsg = `🔒 ${addr}番地 [${row?.fixedPart?.name}] は基板固定回路です：${row?.fixedPart?.rule || ''}`;
          this.statusTone = 'info';
          this.cb.onSound?.('switch');
          this.render();
          return;
        }
        this.selectedAddr = addr;
        this.cb.onSound?.('switch');
        this.render();
        this.renderComposer();
      });
    });

    const textarea = this.container.querySelector('#asm-raw-textarea');
    if (textarea) {
      textarea.addEventListener('input', () => {
        this.rawText = textarea.value;
        const assembled = assembleProgramText(this.rawText, this.stage);
        this.textErrors = assembled.errors;
        if (assembled.ok) {
          this.slots = assembled.slots;
          this._resetExecution();
          this.cb.onSlotsChange?.({ ...this.slots });
          this._notifyLiveState();
        }
        // Update status banner in place without destroying textarea focus/caret!
        const statusEl = this.container.querySelector('.asm-text-status');
        if (statusEl) {
          if (this.textErrors.length > 0) {
            statusEl.className = 'asm-text-status err';
            statusEl.textContent = `⚠ ${this.textErrors[0].message}`;
          } else {
            statusEl.className = 'asm-text-status ok';
            statusEl.textContent = '✔ アセンブルOK（6bit機械語に変換完了 → 1拍実行またはテスト実行へ！）';
          }
        }
      });
    }
  }

  /**
   * Renders the thumb-friendly ARK-4 Assembly Instruction Composer into the
   * bottom dock's `.palette-scroll` area so players write real opcodes & numbers
   * instead of dragging pre-baked answer cards!
   */
  renderComposer() {
    if (!this.paletteHost || !this.stage) return;

    if (this.editorMode === 'text') {
      this.paletteHost.innerHTML = `
        <div class="asm-composer-text-tip">
          <span>⌨ テキスト直打ちモード中：<code>LDI 3</code> / <code>ADD 7</code> / <code>SUB 1</code> / <code>JZ 4</code> のように1行1命令で記述しよう</span>
          <button type="button" class="asm-comp-help-btn" id="btn-asm-comp-isa">📖 命令表</button>
        </div>
      `;
      this.paletteHost.querySelector('#btn-asm-comp-isa')?.addEventListener('click', () => {
        this.cb.onSound?.('switch');
        this.cb.onOpenSpec?.();
      });
      return;
    }

    const curPart = this._getCurrentSelectedPart();
    const curOp = curPart?.op || null;
    const curVal = curPart ? curPart.val : 0;
    const curValBits = curVal.toString(2).padStart(4, '0');

    const opButtons = EDITABLE_OPCODES.map((op) => {
      const def = ARK4_OPCODES[op];
      const active = curOp === op;
      return `
        <button type="button"
          class="asm-op-btn ${active ? 'active' : ''}"
          data-asm-op="${op}"
          style="--op-color:${def.color}; --op-accent:${def.accent}">
          <span class="asm-op-btn-code">${op}</span>
          <span class="asm-op-btn-meta">${def.bits}·${def.shortJa}</span>
        </button>
      `;
    }).join('');

    const numPills = Array.from({ length: 16 }, (_, n) => {
      const active = curPart !== null && curVal === n;
      return `<button type="button" class="asm-num-pill ${active ? 'active' : ''}" data-asm-val="${n}">${n}</button>`;
    }).join('');

    this.paletteHost.innerHTML = `
      <div class="asm-composer">
        <div class="asm-comp-row asm-comp-ops">
          <span class="asm-comp-addr-badge">${this.selectedAddr}番地</span>
          ${opButtons}
          <button type="button" class="asm-comp-util" data-asm-act="clear" title="この行を消す">⌫</button>
          <button type="button" class="asm-comp-util next-line" data-asm-act="next" title="次の番地へ移動">次行↓</button>
        </div>
        <div class="asm-comp-row asm-comp-vals">
          <div class="asm-val-stepper">
            <button type="button" class="asm-step-pm" data-asm-delta="-1" aria-label="値を1減らす">−</button>
            <span class="asm-val-readout"><strong>${curVal}</strong><small>${curValBits}</small></span>
            <button type="button" class="asm-step-pm" data-asm-delta="1" aria-label="値を1増やす">＋</button>
          </div>
          <div class="asm-num-strip" role="group" aria-label="即値 0〜15">${numPills}</div>
        </div>
      </div>
    `;

    // Scroll active number pill into view smoothly inside the horizontal strip
    const activeNumEl = this.paletteHost.querySelector('.asm-num-pill.active');
    if (activeNumEl && typeof activeNumEl.scrollIntoView === 'function') {
      activeNumEl.scrollIntoView({ block: 'nearest', inline: 'center' });
    }

    this.paletteHost.querySelectorAll('[data-asm-op]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const op = btn.dataset.asmOp;
        const nextVal = curPart ? curPart.val : 0;
        this.cb.onSound?.('place');
        this._setInstructionAt(this.selectedAddr, op, nextVal);
      });
    });

    this.paletteHost.querySelectorAll('[data-asm-val]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const val = Number(btn.dataset.asmVal);
        const nextOp = curOp || 'LDI';
        this.cb.onSound?.('switch');
        this._setInstructionAt(this.selectedAddr, nextOp, val);
      });
    });

    this.paletteHost.querySelectorAll('[data-asm-delta]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const delta = Number(btn.dataset.asmDelta);
        const nextOp = curOp || 'LDI';
        const nextVal = ((curVal + delta) + 16) % 16;
        this.cb.onSound?.('switch');
        this._setInstructionAt(this.selectedAddr, nextOp, nextVal);
      });
    });

    this.paletteHost.querySelector('[data-asm-act="clear"]')?.addEventListener('click', () => {
      this.cb.onSound?.('switch');
      this._setInstructionAt(this.selectedAddr, null, 0);
    });

    this.paletteHost.querySelector('[data-asm-act="next"]')?.addEventListener('click', () => {
      this._selectNextEditableAddr();
    });
  }
}
