/**
 * SILICON GENESIS — Mobile-First ARK-4 Assembly IDE & Physical Hardware Bridge
 *
 * Powers Stages 22–24 (`stage.kind === 'assembly_program'`) with:
 *   1. Live Physical Wire Bridge: shows how every line of assembly text turns
 *      directly into the 6 physical input pins (`I1, I0, IMM3..0`) of the
 *      player's own forged `ARK4_SYS` circuit (Stage 21), driving `INST_DEC`,
 *      `ARK4_CPU`, `ZERO_4B`, and `COND_PC` in real time.
 *   2. Real ARK-4 Assembly Editor (`main.asm`): write any valid opcode
 *      (`LDI`, `ADD`, `SUB`, `JNZ`) + 4-bit operand (`0..15`) via either a
 *      thumb-friendly mobile Assembly Composer with Altair-8800 4-bit physical
 *      DIP switches OR direct raw-text typing mode.
 *   3. Mask ROM Fuse-Burn Matrix viewer (`DEC_2TO4 × OR`) & Silicon Blueprint
 *      Verilog HDL export trigger.
 *   4. 100% physical MOSFET+resistor gate-level execution through `romRunner.js`
 *      on the player's actual compiled `ARK4_SYS` circuit.
 */

import {
  ARK4_OPCODES,
  compileRomHardware,
  makeInstructionPart,
  resolveSlotInstruction,
  probeInstructionDecode,
  buildRomRowMap,
  buildProgrammableRomCircuit,
  getRomFuseMatrix,
  runRomProgram,
  evaluateRomStage,
  formatProgramText,
  assembleProgramText,
} from '../engine/romRunner.js?v=40';

const EDITABLE_OPCODES = ['LDI', 'ADD', 'SUB', 'JNZ'];
const FALLBACK_OPCODES = {
  JNZ: {
    op: 'JNZ',
    bits: '11',
    i1: 1,
    i0: 1,
    shortJa: '≠0で飛ぶ',
    english: 'Jump if Not Zero',
    color: '#6e459c',
    accent: '#c89bff',
    wireHint: 'WE=0, BR=1（ACC≠0なら指定番地へジャンプ）',
  },
};
const CLEAR_ARM_MSG = '⚠ もう一度「消去?」を押すと全番地の命令をクリアします';

function getOpcodeDef(op) {
  return ARK4_OPCODES?.[op] || FALLBACK_OPCODES[op] || null;
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function summarizeDecodeAction(dec, part) {
  if (!part) return '待機中';
  if (dec.brFlag && !dec.weFlag) return '≠0なら分岐(ACC保持)';
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
    this.showFuseMatrix = false;
    this.statusMsg = '';
    this.statusTone = 'info'; // 'info' | 'ok' | 'warn' | 'err'
    this._clearArmed = false;
    this._clearArmTimer = null;
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

  _getFinalRowAddr() {
    const rows = this.stage?.asmProgramSpec?.rows || [];
    return rows.length > 0 ? rows[rows.length - 1].addr : 3;
  }

  setStage(stage, savedSlots = null, customChips = null) {
    this.stage = stage;
    if (customChips) this.customChips = customChips;
    this.awaitingFinalClock = false;
    this.showFuseMatrix = false;
    this.editorMode = 'visual';
    this.textErrors = [];
    this.statusMsg = '';
    this.statusTone = 'info';
    this._disarmClear();

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

  _disarmClear() {
    this._clearArmed = false;
    if (this._clearArmTimer) {
      clearTimeout(this._clearArmTimer);
      this._clearArmTimer = null;
    }
    if (this.statusMsg === CLEAR_ARM_MSG) {
      this.statusMsg = '';
      this.statusTone = 'info';
      const banner = this.container?.querySelector('.asm-live-banner');
      if (banner) banner.remove();
    }
    const btn = this.container?.querySelector('#btn-asm-clear');
    if (btn && btn.classList.contains('armed')) {
      btn.classList.remove('armed');
      btn.textContent = '✕';
      btn.title = 'プログラムを全消去';
    }
  }

  _hasAnyInstruction() {
    return Object.values(this.slots || {}).some(Boolean);
  }

  clearAll() {
    if (!this.stage) return;
    this._disarmClear();
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
      const finalAddr = this._getFinalRowAddr();
      this.statusMsg =
        `⚡ カウントダウン 0 達成・${finalAddr}番地到達！「⚡ 最終開門CLK」を押して全開信号 1111(15) を送出せよ！`;
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
    this._disarmClear();

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
    this._disarmClear();
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
    this._disarmClear();
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
    this._disarmClear();
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
    this._disarmClear();
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

  _getSiliconCounts() {
    const stats = this._hw?.siliconStats;
    const nandCount = stats?.nandCount ?? this._hw?.metrics?.nandCount ?? 0;
    const swCount = stats?.swCount ?? this._hw?.metrics?.swCount ?? (nandCount > 0 ? nandCount * 2 : 0);
    const pullCount = stats?.pullCount ?? this._hw?.metrics?.pullCount ?? nandCount;
    const isPhysicalSilicon = Boolean(stats?.isPhysicalSilicon ?? swCount > 0);
    return { nandCount, swCount, pullCount, isPhysicalSilicon };
  }

  _buildCurrentRowMap() {
    if (typeof buildRomRowMap === 'function') {
      return buildRomRowMap(this.stage, this.slots);
    }
    const rows = this.stage?.asmProgramSpec?.rows || [];
    const rowMap = new Map();
    for (const r of rows) {
      const part = r.locked
        ? r.fixedPart
        : resolveSlotInstruction(this.slots[r.slotId], this.stage);
      rowMap.set(r.addr, { row: r, part });
    }
    return rowMap;
  }

  _computeFuseMatrix() {
    const rowMap = this._buildCurrentRowMap();
    if (typeof getRomFuseMatrix === 'function') {
      try {
        const mat = getRomFuseMatrix(rowMap, this._hw);
        if (mat && Array.isArray(mat.rows)) return mat;
      } catch {
        // Fallback below if pre-merge engine check
      }
    }
    const rows = [];
    let totalBurnedFuses = 0;
    for (const [addr, entry] of rowMap.entries()) {
      const part = entry?.part || null;
      const dec = probeInstructionDecode(this._hw, part);
      const valid = Boolean(part);
      const i1 = valid ? (dec.i1 ? 1 : 0) : 0;
      const i0 = valid ? (dec.i0 ? 1 : 0) : 0;
      const imm = valid && Array.isArray(dec.imm) ? dec.imm.map((b) => (b ? 1 : 0)) : [0, 0, 0, 0];
      if (valid) {
        totalBurnedFuses += i1 + i0 + imm[3] + imm[2] + imm[1] + imm[0];
      }
      rows.push({
        addr,
        addrBits: (addr & 15).toString(2).padStart(4, '0'),
        part,
        i1,
        i0,
        imm,
        valid,
      });
    }
    return {
      rows,
      totalBurnedFuses,
      wordCount: rows.filter((r) => r.valid).length,
    };
  }

  getExportPayload() {
    const rowMap = this._buildCurrentRowMap();
    const fuseMatrix = this._computeFuseMatrix();
    let romCircuit = null;
    if (this._hw && typeof buildProgrammableRomCircuit === 'function') {
      try {
        romCircuit = buildProgrammableRomCircuit(rowMap, this._hw);
      } catch {
        romCircuit = null;
      }
    }
    return {
      customChips: this._hw?.workingChips || this.customChips,
      romCircuit,
      romRows: fuseMatrix.rows,
      stageTitle: this.stage ? `STAGE ${this.stage.code} ${this.stage.revealedTitle || this.stage.title}` : '',
    };
  }

  _renderFuseMatrixHtml(fuseMatrix, isStepping, st) {
    const finalAddr = this._getFinalRowAddr();
    const fuseCell = (bit, valid, kindClass, colName) => {
      const burned = Boolean(valid && bit);
      return `<td class="fuse-cell ${burned ? `burned ${kindClass}` : 'unburned'}" title="${colName}: ${burned ? '焼付済 (OR接続 = 1)' : '未焼付 (0)'}"><span class="fuse-dot">${burned ? '●' : '·'}</span></td>`;
    };

    const rowsHtml = fuseMatrix.rows
      .map((r) => {
        const isLivePc =
          (this.awaitingFinalClock && r.addr === finalAddr) ||
          (isStepping && st.pc === r.addr);
        const isSelected = !isStepping && this.selectedAddr === r.addr;
        const specRow = this._getRowByAddr(r.addr);
        const isLocked = Boolean(specRow?.locked);
        const imm = Array.isArray(r.imm) ? r.imm : [0, 0, 0, 0];
        const cmdLabel = r.part ? `${r.part.op} ${r.part.val}` : '---';
        return `
          <tr class="asm-fuse-row ${isLivePc ? 'pc-live' : ''} ${isSelected ? 'is-selected' : ''} ${!r.valid ? 'is-empty' : ''} ${isLocked ? 'is-locked' : ''}"
            data-fuse-addr="${r.addr}"
            data-locked="${isLocked ? '1' : '0'}">
            <td class="fuse-word-cell" title="番地 ${r.addr} (${r.addrBits})">
              <span class="fuse-pc-mark">${isLivePc ? '▶' : ''}</span>W${r.addr}
            </td>
            <td class="fuse-cmd-cell">${escapeHtml(cmdLabel)}${isLocked ? '🔒' : ''}</td>
            ${fuseCell(r.i1, r.valid, 'op-fuse', 'I1')}
            ${fuseCell(r.i0, r.valid, 'op-fuse', 'I0')}
            ${fuseCell(imm[3], r.valid, 'imm-fuse', 'IMM3(8)')}
            ${fuseCell(imm[2], r.valid, 'imm-fuse', 'IMM2(4)')}
            ${fuseCell(imm[1], r.valid, 'imm-fuse', 'IMM1(2)')}
            ${fuseCell(imm[0], r.valid, 'imm-fuse', 'IMM0(1)')}
          </tr>
        `;
      })
      .join('');

    return `
      <div class="asm-fuse-matrix-panel" role="region" aria-label="焼付ROM配線図">
        <div class="asm-fuse-head">
          <span class="asm-fuse-title">🔥 焼付ROM配線図（DEC2_4 × OR ヒューズ）</span>
          <span class="asm-fuse-badge">${fuseMatrix.totalBurnedFuses}箇所焼付 · ${fuseMatrix.wordCount}語</span>
        </div>
        <div class="asm-fuse-table-wrap">
          <table class="asm-fuse-table">
            <thead>
              <tr>
                <th class="fuse-th-word">語線</th>
                <th class="fuse-th-cmd">命令</th>
                <th class="fuse-th-op" title="命令上位ビット I1">I1</th>
                <th class="fuse-th-op" title="命令下位ビット I0">I0</th>
                <th class="fuse-th-imm" title="即値 IMM3 (重み 8)">8</th>
                <th class="fuse-th-imm" title="即値 IMM2 (重み 4)">4</th>
                <th class="fuse-th-imm" title="即値 IMM1 (重み 2)">2</th>
                <th class="fuse-th-imm" title="即値 IMM0 (重み 1)">1</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>
        <div class="asm-fuse-legend">● = OR配線焼付(1) ／ · = 未接続(0) ／ 緑行 = 実行中のPC語線</div>
      </div>
    `;
  }

  _getHardwareBridgeViewModel() {
    const st = this.asmState;
    const isStepping = st.stepIdx >= 0;
    const rows = this.stage?.asmProgramSpec?.rows || [];

    // Determine which instruction is currently driving the 6 input pins of ARK4_SYS:
    // - While awaiting Stage 26 final clock: final row (3: LDI 15)
    // - While stepping: the executed cycle's instruction
    // - While idle/editing: the currently selected line so edits flip the 6 wire LEDs LIVE!
    let activeAddr = this.selectedAddr;
    let activePart = this._getCurrentSelectedPart();
    let modeLabel = '📡 編集中プレビュー';
    let decode = probeInstructionDecode(this._hw, activePart);

    if (this.awaitingFinalClock) {
      const finalAddr = this._getFinalRowAddr();
      const rFinal = rows.find((r) => r.addr === finalAddr) || rows[rows.length - 1] || null;
      activeAddr = rFinal ? rFinal.addr : finalAddr;
      activePart = rFinal ? resolveSlotInstruction(this.slots[rFinal.slotId], this.stage) : null;
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

  _renderHardwarePanelInnerHtml() {
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
    const { nandCount, swCount, pullCount } = this._getSiliconCounts();
    const fuseMatrix = this._computeFuseMatrix();
    const zeroFootText = st.z ? 'Z=1 (ゼロ検知 → JNZ不発・通過!)' : 'Z=0 (非ゼロ → JNZ発火!)';
    const pcFootText = st.jmpFired
      ? '⚡ JNZジャンプ発火! (Z=0)'
      : isStepping && st.brFlag && st.z
        ? '✔ JNZ不発・通過! (Z=1)'
        : '通常 +1 進行';

    return `
      <div class="asm-hw-head">
        <div class="asm-hw-title-wrap">
          <span class="asm-hw-title">⚡ 自作実機チェーン</span>
        </div>
        <div class="asm-hw-controls">
          <button type="button" class="asm-mini-ctrl" id="btn-asm-reset" title="電源リセット (PC=0, ACC=0)" aria-label="電源リセット">↺</button>
          <button type="button" class="asm-step-btn ${this.awaitingFinalClock ? 'final-clock' : ''}" id="btn-asm-step">
            ${this.awaitingFinalClock ? '⚡ 最終開門CLK' : '⚡ 1拍実行(CLK)'}
          </button>
        </div>
      </div>

      <div class="asm-hw-chain" aria-label="自作ハードウェア内部回路インスペクタ">
        <button type="button" class="asm-inspect-btn" data-inspect-chip="ASM_ENC" title="自作 命令キーエンコーダ (ASM_ENC) の内部回路を見る">🔍 ENC</button>
        <span class="asm-chain-arrow" aria-hidden="true">▸</span>
        <button type="button" class="asm-inspect-btn" data-inspect-chip="ROM_4W" title="自作 配線ROM (ROM_4W) の内部回路を見る">🔍 ROM</button>
        <span class="asm-chain-arrow" aria-hidden="true">▸</span>
        <button type="button" class="asm-inspect-btn cpu" id="btn-asm-inspect" data-inspect-chip="ARK4_SYS" title="自作 ノイマン型計算機 (ARK4_SYS) の内部回路を見る${nandCount > 0 ? `（${nandCount} NAND ＝ MOSFET ${swCount}個 ＋ 抵抗 ${pullCount}本）` : ''}">
          🔍 CPU${nandCount > 0 ? ` (<span class="asm-cpu-nand-part">${nandCount}N · </span>${swCount}FET)` : ''}
        </button>
      </div>

      <div class="asm-hw-subtools">
        <button type="button" class="asm-subtool-btn fuse ${this.showFuseMatrix ? 'active' : ''}" id="btn-asm-fuse-toggle" aria-expanded="${this.showFuseMatrix ? 'true' : 'false'}" title="Mask ROM 焼付ヒューズ配線図（DEC2_4 × OR）を表示/折りたたみ">
          🔥 焼付ROM図${fuseMatrix.totalBurnedFuses > 0 ? ` (${fuseMatrix.totalBurnedFuses})` : ''} ${this.showFuseMatrix ? '▴' : '▾'}
        </button>
        <button type="button" class="asm-subtool-btn blueprint" id="btn-asm-export-verilog" title="全MOSFET・抵抗ネットリストをVerilog HDL設計図として出力">
          💾 設計図(Verilog)
        </button>
      </div>

      ${this.showFuseMatrix ? this._renderFuseMatrixHtml(fuseMatrix, isStepping, st) : ''}

      <!-- PHYSICAL BRIDGE: KEY -> ASM_ENC -> ROM -> 6 ELECTRIC SWITCH PINS -->
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

        <div class="asm-chip-card chip-zero ${st.z ? 'active-z' : 'nonzero-z'}">
          <div class="asm-chip-hdr"><span>ZERO_4B</span><span class="asm-chip-sub">ゼロ目</span></div>
          <div class="asm-chip-big">Z = <strong>${st.z}</strong></div>
          <div class="asm-chip-foot" title="${escapeHtml(zeroFootText)}">${escapeHtml(zeroFootText)}</div>
        </div>

        <div class="asm-chip-card chip-pc ${st.jmpFired ? 'active-jmp' : ''}">
          <div class="asm-chip-hdr"><span>COND_PC</span><span class="asm-chip-sub">行番号</span></div>
          <div class="asm-chip-big">
            ${isStepping ? `${st.pc} → <strong>${st.pcNext}番</strong>` : `PC = <strong>${st.pc}番</strong>`}
          </div>
          <div class="asm-chip-foot" title="${escapeHtml(pcFootText)}">${escapeHtml(pcFootText)}</div>
        </div>
      </div>
    `;
  }

  _bindHardwarePanelEvents(panelEl) {
    if (!panelEl) return;
    panelEl.querySelector('#btn-asm-step')?.addEventListener('click', () => this.stepOnce());
    panelEl.querySelector('#btn-asm-reset')?.addEventListener('click', () => this.resetPc());
    panelEl.querySelector('#btn-asm-fuse-toggle')?.addEventListener('click', () => {
      this.showFuseMatrix = !this.showFuseMatrix;
      this.cb.onSound?.('switch');
      this._syncHardwarePanelInPlace();
    });
    panelEl.querySelector('#btn-asm-export-verilog')?.addEventListener('click', () => {
      this.cb.onSound?.('switch');
      this.cb.onExportSilicon?.(this.getExportPayload());
    });
    panelEl.querySelectorAll('[data-fuse-addr]').forEach((tr) => {
      tr.addEventListener('click', () => {
        if (tr.dataset.locked === '1') return;
        const addr = Number(tr.dataset.fuseAddr);
        if (Number.isNaN(addr)) return;
        this.selectedAddr = addr;
        this.cb.onSound?.('switch');
        this.render();
        this.renderComposer();
      });
    });
    panelEl.querySelectorAll('[data-inspect-chip]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const chipId = btn.dataset.inspectChip || 'ARK4_SYS';
        this.cb.onSound?.('switch');
        if (this.cb.onInspectChip) this.cb.onInspectChip(chipId);
        else this.cb.onInspectArk4?.();
      });
    });
  }

  _syncHardwarePanelInPlace() {
    const panelEl = this.container?.querySelector('.asm-hw-panel');
    if (!panelEl) return;
    panelEl.classList.toggle('awaiting-open', this.awaitingFinalClock);
    panelEl.innerHTML = this._renderHardwarePanelInnerHtml();
    this._bindHardwarePanelEvents(panelEl);
  }

  _detectAddrFromTextareaCaret(textarea) {
    if (!textarea || !this.stage) return;
    const pos = textarea.selectionStart ?? 0;
    const lineIdx = textarea.value.slice(0, pos).split('\n').length - 1;
    const lineText = (textarea.value.split('\n')[lineIdx] || '').trim();
    const m = lineText.match(/^(\d+)\s*:/);
    const rows = this.stage.asmProgramSpec?.rows || [];
    const candidate = m ? Number(m[1]) : lineIdx;
    const matchRow = rows.find((r) => r.addr === candidate);
    if (matchRow && !matchRow.locked) {
      this.selectedAddr = matchRow.addr;
    }
  }

  render() {
    if (!this.container || !this.stage) return;
    const spec = this.stage.asmProgramSpec;
    const rows = spec?.rows || [];
    const st = this.asmState;
    const isStepping = st.stepIdx >= 0;
    const finalAddr = this._getFinalRowAddr();

    // Build visual code rows or raw text editor
    let editorContentHtml = '';
    if (this.editorMode === 'visual') {
      const lineItems = rows
        .map((r) => {
          const part = r.locked
            ? r.fixedPart
            : resolveSlotInstruction(this.slots[r.slotId], this.stage);
          const isAwaitingOpen = this.awaitingFinalClock && r.addr === finalAddr;
          const isPcNow = isAwaitingOpen || (isStepping && st.pc === r.addr);
          const isSelected = !r.locked && this.selectedAddr === r.addr;
          const opCls = part ? `op-${part.op.toLowerCase()}` : 'op-empty';
          const bits = part ? `${part.opcodeBits} ${part.immBits}` : '-- ----';
          const commentText = part
            ? r.locked
              ? `固定命令: ${part.meta || part.rule}`
              : part.comment
            : 'タップして命令を書く';

          return `
            <button type="button"
              role="option"
              aria-selected="${isSelected ? 'true' : 'false'}"
              class="asm-code-row ${isSelected ? 'selected' : ''} ${isPcNow ? 'pc-active' : ''} ${isAwaitingOpen ? 'awaiting-open' : ''} ${r.locked ? 'locked' : ''} ${!part ? 'is-empty' : ''}"
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
          <div class="asm-text-help">書式: <code>0: LDI 3</code> ／ 命令: <code>LDI</code> <code>ADD</code> <code>SUB</code> <code>JNZ</code> ／ 数値: <code>0〜15</code> (2進数 <code>0b1111</code> も可)</div>
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
        <!-- LEFT / TOP: PHYSICAL ASM_ENC -> ROM -> ARK4_SYS HARDWARE WIRE BRIDGE -->
        <section class="asm-hw-panel ${this.awaitingFinalClock ? 'awaiting-open' : ''}">
          ${this._renderHardwarePanelInnerHtml()}
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
              <button type="button" class="asm-mode-btn ${this.editorMode === 'visual' ? 'active' : ''}" data-editor-mode="visual" aria-pressed="${this.editorMode === 'visual' ? 'true' : 'false'}">🧩 行入力</button>
              <button type="button" class="asm-mode-btn ${this.editorMode === 'text' ? 'active' : ''}" data-editor-mode="text" aria-pressed="${this.editorMode === 'text' ? 'true' : 'false'}">⌨ 直打ち</button>
              <button type="button" class="asm-clear-btn ${this._clearArmed ? 'armed' : ''}" id="btn-asm-clear" title="${this._clearArmed ? 'もう1回押すと全消去' : 'プログラムを全消去'}" aria-label="プログラムを全消去">${this._clearArmed ? '消去?' : '✕'}</button>
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
    this._bindHardwarePanelEvents(this.container.querySelector('.asm-hw-panel'));

    this.container.querySelector('#btn-asm-clear')?.addEventListener('click', () => {
      if (!this._hasAnyInstruction()) {
        this.statusMsg = '消去する命令はありません（すでに空欄です）';
        this.statusTone = 'info';
        this.cb.onSound?.('switch');
        this.render();
        return;
      }
      if (!this._clearArmed) {
        this._clearArmed = true;
        this.statusMsg = CLEAR_ARM_MSG;
        this.statusTone = 'warn';
        this.cb.onSound?.('switch');
        clearTimeout(this._clearArmTimer);
        this._clearArmTimer = setTimeout(() => {
          if (this._clearArmed) {
            this._disarmClear();
          }
        }, 3200);
        this.render();
        return;
      }
      this.cb.onSound?.('switch');
      this.clearAll();
    });

    this.container.querySelectorAll('[data-editor-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const nextMode = btn.dataset.editorMode;
        if (nextMode === this.editorMode) return;
        this._disarmClear();
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
        this._disarmClear();
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
      const syncCaretPreview = () => {
        const prevAddr = this.selectedAddr;
        this._detectAddrFromTextareaCaret(textarea);
        if (this.selectedAddr !== prevAddr) {
          this._syncHardwarePanelInPlace();
        }
      };
      textarea.addEventListener('click', syncCaretPreview);
      textarea.addEventListener('keyup', syncCaretPreview);
      textarea.addEventListener('input', () => {
        this._disarmClear();
        this.rawText = textarea.value;
        this._detectAddrFromTextareaCaret(textarea);
        const assembled = assembleProgramText(this.rawText, this.stage);
        this.textErrors = assembled.errors;
        if (assembled.ok) {
          this.slots = assembled.slots;
          this._resetExecution();
          this.cb.onSlotsChange?.({ ...this.slots });
          this._notifyLiveState();
          // Live-update the 6-pin hardware wire bridge without disturbing textarea focus!
          this._syncHardwarePanelInPlace();
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
          <span>⌨ テキスト直打ちモード中：<code>LDI 3</code> / <code>ADD 7</code> / <code>SUB 1</code> / <code>JNZ 1</code> のように1行1命令で記述しよう</span>
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

    const opButtons = EDITABLE_OPCODES.map((op) => {
      const def = getOpcodeDef(op);
      if (!def) return '';
      const active = curOp === op;
      return `
        <button type="button"
          class="asm-op-btn ${active ? 'active' : ''}"
          data-asm-op="${op}"
          aria-pressed="${active ? 'true' : 'false'}"
          style="--op-color:${def.color}; --op-accent:${def.accent}">
          <span class="asm-op-btn-code">${op}</span>
          <span class="asm-op-btn-meta">${def.bits}·${def.shortJa}</span>
        </button>
      `;
    }).join('');

    const dipSwitches = [3, 2, 1, 0]
      .map((bitIdx) => {
        const weight = 1 << bitIdx;
        const isOn = Boolean((curVal >> bitIdx) & 1);
        return `
          <button type="button"
            class="asm-dip-sw ${isOn ? 'on' : 'off'}"
            data-dip-bit="${bitIdx}"
            aria-pressed="${isOn ? 'true' : 'false'}"
            title="物理スイッチ IMM${bitIdx} (重み ${weight}) を ${isOn ? '0(OFF)' : '1(ON)'} に切替">
            <span class="asm-dip-led" aria-hidden="true"></span>
            <span class="asm-dip-w">${weight}</span>
            <span class="asm-dip-v">${isOn ? '1' : '0'}</span>
          </button>
        `;
      })
      .join('');

    const numPills = Array.from({ length: 16 }, (_, n) => {
      const active = curPart !== null && curVal === n;
      return `<button type="button" class="asm-num-pill ${active ? 'active' : ''}" data-asm-val="${n}" aria-pressed="${active ? 'true' : 'false'}">${n}</button>`;
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
            <span class="asm-val-readout" title="10進数 ${curVal}（2進数 ${curVal.toString(2).padStart(4, '0')}）"><strong>${curVal}</strong></span>
            <button type="button" class="asm-step-pm" data-asm-delta="1" aria-label="値を1増やす">＋</button>
          </div>
          <div class="asm-dip-bank" role="group" aria-label="4bit物理DIPスイッチ (8 4 2 1)">${dipSwitches}</div>
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

    this.paletteHost.querySelectorAll('[data-dip-bit]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const bitIdx = Number(btn.dataset.dipBit);
        const nextOp = curOp || 'LDI';
        const nextVal = curVal ^ (1 << bitIdx);
        this.cb.onSound?.('switch');
        this._setInstructionAt(this.selectedAddr, nextOp, nextVal);
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
