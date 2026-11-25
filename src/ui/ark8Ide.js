/**
 * SILICON GENESIS — Chapter 3 ARK-8 16-Bit Assembly IDE & Physical Silicon Bridge
 *
 * Powers Stages 41–42 (`stage.kind === 'ark8_program'`) with:
 *   1. Live Physical Chain: `ASM_ENC8` (8->3 opcode) + `ASM_ENC` (4->2 reg)
 *      -> Gate-Level 16-Word × 16-Bit Mask ROM -> `ARK8_SYS` (7,403 NAND / 14,806 MOSFETs!).
 *   2. Live Hardware Monitor probed directly from compiled MOSFETs while CLK=0
 *      (zero JS shadow registers or RAM!): R0..R3 + PC/Z/HALT + 16-Byte SRAM Dump.
 *   3. 16-Bit Mask ROM Fuse Matrix viewer + Verilog-2001 HDL Silicon Export (`romArch: 'ark8'`).
 *   4. Mobile-first ARK-8 Composer (8 opcodes, contextual Rd/Rs pills, 8-bit/4-bit physical
 *      DIP switches) AND direct raw-text assembly editing (`main.asm`).
 */

import {
  ARK8_OPCODES,
  makeArk8Instruction,
  resolveArk8Slot,
  formatArk8ProgramText,
  assembleArk8ProgramText,
  compileArk8Hardware,
  probeArk8InstructionDecode,
  buildArk8RowMap,
  buildArk8RomCircuit,
  getArk8RomFuseMatrix,
  resetArk8Hardware,
  runArk8Program,
  evaluateArk8Stage,
} from '../engine/romRunner8.js?v=38';

const EDITABLE_OPCODES = ['LDI', 'ADD', 'SUB', 'JNZ', 'LOAD', 'STOR', 'ADDI', 'HALT'];
const CLEAR_ARM_MSG = '⚠ もう一度「消去?」を押すと全番地の命令をクリアします';

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function summarizeArk8Decode(dec, part) {
  if (!part) return '待機中';
  if (dec.halt) return 'HALT=1（PC停止・実行完了）';
  if (dec.br) return `BR=1（R${part.rd}≠0なら ${part.imm}番地へ飛ぶ）`;
  if (dec.memWe) return `MEM_WE=1（RAM[${part.imm}] ← R${part.rs}）`;
  if (dec.wd1 && dec.regWe) return `WD=SRAM, REG_WE=1（R${part.rd} ← RAM[${part.imm}]）`;
  if (dec.wd0 && dec.regWe) return `WD=IMM, REG_WE=1（R${part.rd} ← ${part.imm}）`;
  if (dec.aluB && dec.regWe) return `ALU_B=IMM, REG_WE=1（R${part.rd} ← R${part.rd} + ${part.imm}）`;
  if (dec.sub && dec.regWe) return `SUB=1, REG_WE=1（R${part.rd} ← R${part.rd} − R${part.rs}）`;
  if (dec.regWe) return `ALU(ADD), REG_WE=1（R${part.rd} ← R${part.rd} + R${part.rs}）`;
  return '制御信号出力中';
}

export class Ark8IdePanel {
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
    this._initMachine = null;
    this.asmTrace = [];
    this.asmState = this._makeIdleState();
    this.showFuseMatrix = false;
    this.statusMsg = '';
    this.statusTone = 'info';
    this._clearArmed = false;
    this._clearArmTimer = null;
  }

  _makeIdleState() {
    const initialRam = this.stage?.asmProgramSpec?.initialRam || {};
    const ram = new Array(16).fill(0);
    for (const [k, v] of Object.entries(initialRam)) {
      const idx = Number(k);
      if (idx >= 0 && idx < 16) ram[idx] = Number(v) & 0xff;
    }
    return {
      pc: 0,
      pcNext: 0,
      regs: [0, 0, 0, 0],
      regsBefore: [0, 0, 0, 0],
      ram,
      ramBefore: [...ram],
      z: 1,
      halt: 0,
      jumped: false,
      unstable: false,
      stepIdx: -1,
      part: null,
      dec: null,
      label: '',
    };
  }

  setStage(stage, savedSlots = null, customChips = null) {
    this.stage = stage;
    if (customChips) this.customChips = customChips;
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
        const resolved = resolveArk8Slot(savedSlots?.[r.slotId]);
        this.slots[r.slotId] = resolved ? resolved.id : null;
      }
    }

    try {
      this._hw = compileArk8Hardware(this.customChips);
      this._initMachine = resetArk8Hardware(this._hw, stage?.asmProgramSpec?.initialRam || null);
    } catch {
      this._hw = null;
      this._initMachine = null;
    }

    const firstEmpty = rows.find((r) => !r.locked && !this.slots[r.slotId]);
    const firstEditable = rows.find((r) => !r.locked);
    this.selectedAddr = firstEmpty ? firstEmpty.addr : firstEditable ? firstEditable.addr : 0;

    this.rawText = formatArk8ProgramText(this.stage, this.slots);
    this._resetExecution();
    this.render();
    this.renderComposer();
    this._notifyLiveState();
  }

  _resetExecution() {
    this.asmTrace = [];
    this.asmState = this._makeIdleState();
    if (this._initMachine) {
      this.asmState.regs = [...this._initMachine.regs];
      this.asmState.regsBefore = [...this._initMachine.regs];
      this.asmState.ram = [...this._initMachine.ram];
      this.asmState.ramBefore = [...this._initMachine.ram];
      this.asmState.pc = this._initMachine.pc;
      this.asmState.pcNext = this._initMachine.pc;
      this.asmState.z = this._initMachine.z;
      this.asmState.halt = this._initMachine.halt;
    }
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
    this.rawText = formatArk8ProgramText(this.stage, this.slots);
    this.textErrors = [];
    this._resetExecution();
    this.statusMsg = 'ROMをクリアしました。0番地から16ビット命令を書き込もう！';
    this.statusTone = 'info';
    this.cb.onSlotsChange?.({ ...this.slots });
    this.render();
    this.renderComposer();
    this._notifyLiveState();
  }

  setAwaitingFinalClock() {
    // ARK-8 finishes cleanly via HALT instruction
  }

  _traceEntryToState(entry, idx) {
    const p = entry.part;
    const pcAfter = entry.pcAfter ?? entry.after?.pc ?? 0;
    const label = `${entry.pcBefore}番: ${p.name} → PC=${pcAfter}${entry.haltFlag ? ' [HALT]' : ''}`;
    return {
      pc: entry.pcBefore,
      pcNext: pcAfter,
      regs: [...(entry.after?.regs || [0, 0, 0, 0])],
      regsBefore: [...(entry.before?.regs || [0, 0, 0, 0])],
      ram: [...(entry.after?.ram || new Array(16).fill(0))],
      ramBefore: [...(entry.before?.ram || new Array(16).fill(0))],
      z: entry.after?.z ?? 0,
      halt: entry.haltFlag ? 1 : entry.after?.halt ?? 0,
      jumped: Boolean(entry.jumped),
      unstable: Boolean(entry.unstable),
      stepIdx: idx,
      part: p,
      dec: entry.dec || null,
      label,
    };
  }

  setTraceStep(stepIdx) {
    if (Array.isArray(this.asmTrace) && this.asmTrace[stepIdx]) {
      this.asmState = this._traceEntryToState(this.asmTrace[stepIdx], stepIdx);
      this.statusMsg = `⚡ 実行 ${stepIdx + 1}/${this.asmTrace.length}拍目：${this.asmState.label}`;
      this.statusTone = this.asmState.unstable ? 'err' : 'ok';
      this.render();
      this._notifyLiveState();
    }
  }

  evaluateAssembly() {
    if (!this.stage) return { passed: false, results: [], error: 'ステージ未読込' };
    this._disarmClear();

    const rows = this.stage.asmProgramSpec?.rows || [];
    const placedCount = rows.filter((r) => (r.locked ? r.fixedPart : resolveArk8Slot(this.slots[r.slotId]))).length;

    if (this.editorMode === 'text' && this.textErrors.length > 0) {
      return {
        passed: false,
        error: `アセンブル構文エラー（${this.textErrors[0].message}）を修正してから実行してください。`,
        results: [],
        trace: [],
        passedCount: 0,
        totalCount: rows.filter((r) => !r.locked).length,
        metrics: { nandCount: 0, swCount: 0, pullCount: 0, nodeCount: placedCount, wireCount: 0, depth: 0 },
      };
    }

    let res;
    try {
      res = evaluateArk8Stage(this.stage, this.slots, this.customChips);
    } catch (err) {
      return {
        passed: false,
        error: `ARK8_SYS 実機コンパイルエラー: ${err?.message || err}`,
        results: [],
        trace: [],
        passedCount: 0,
        totalCount: 1,
        metrics: { nandCount: 0, swCount: 0, pullCount: 0, nodeCount: placedCount, wireCount: 0, depth: 0 },
      };
    }

    this.asmTrace = res.trace || [];
    if (this.asmTrace.length > 0) {
      this.asmState = this._traceEntryToState(this.asmTrace[0], 0);
    } else {
      this._resetExecution();
    }

    const targetMap = this.stage.asmProgramSpec?.targetRam || { 2: 0 };
    const targetAddr = Number(Object.keys(targetMap)[0] ?? 2);
    const targetVal = targetMap[targetAddr] ?? 0;

    const results = this.asmTrace.map((entry, idx) => {
      const isLast = idx === this.asmTrace.length - 1;
      const ramVal = entry.after?.ram?.[targetAddr] ?? 0;
      const stepPassed = !entry.unstable && (!isLast || res.passed);
      return {
        index: idx,
        label: `${entry.pcBefore}番: ${entry.part.name} → R0=${entry.after.regs[0]} R1=${entry.after.regs[1]} R2=${entry.after.regs[2]} RAM[${targetAddr}]=${ramVal}`,
        input: [idx],
        expected: isLast ? [targetVal] : [ramVal],
        actual: [ramVal],
        passed: stepPassed,
        unstable: Boolean(entry.unstable),
      };
    });

    const swStats = res.run?.hw?.siliconStats || this._getSiliconCounts();
    const metrics = {
      nandCount: swStats.nandCount || 7403,
      swCount: swStats.swCount || 14806,
      pullCount: swStats.pullCount || 7403,
      nodeCount: placedCount,
      wireCount: 0,
      depth: 0,
    };

    const passedCount = results.filter((r) => r.passed).length;
    this.render();
    this._notifyLiveState();

    return {
      passed: Boolean(res.passed),
      error: res.passed ? null : res.message,
      results,
      trace: this.asmTrace,
      passedCount,
      totalCount: Math.max(1, results.length),
      metrics,
    };
  }

  stepOnce() {
    if (!this.stage) return;
    this._disarmClear();

    if (this.editorMode === 'text' && this.textErrors.length > 0) {
      this.statusMsg = `⚠ 構文エラー: ${this.textErrors[0].message}`;
      this.statusTone = 'err';
      this.cb.onSound?.('error');
      this.render();
      return;
    }

    if (!this.asmTrace || this.asmTrace.length === 0) {
      let run;
      try {
        run = runArk8Program(
          this.stage,
          this.slots,
          this.customChips,
          this.stage.asmProgramSpec?.maxCycles || 64
        );
      } catch (err) {
        this.statusMsg = `💥 コンパイルエラー: ${err?.message || err}`;
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
      this.asmState = this._traceEntryToState(this.asmTrace[0], 0);
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
      this.statusMsg = '↺ ハードウェアRST（PC=0, R0〜R3=0, 初期SRAM復元）しました。';
      this.statusTone = 'info';
      this.cb.onSound?.('switch');
    } else {
      this.asmState = this._traceEntryToState(this.asmTrace[nextIdx], nextIdx);
      const doneTag = this.asmState.halt ? '（✔ HALT停止）' : '';
      this.statusMsg = `⚡ ${nextIdx + 1}/${this.asmTrace.length}拍目：${this.asmState.label}${doneTag}`;
      this.statusTone = this.asmState.unstable ? 'err' : 'ok';
      this.cb.onSound?.('clock');
    }

    this.render();
    this._notifyLiveState();
  }

  resetPc() {
    this._disarmClear();
    this._resetExecution();
    this.statusMsg = '↺ 実機 ARK8_SYS をハードウェアRST（PC=0, R0〜R3=0, 初期SRAM復元）しました。';
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
    return resolveArk8Slot(this.slots[row.slotId]);
  }

  _setInstructionAt(addr, op, rd = 0, rs = 0, imm = 0) {
    const row = this._getRowByAddr(addr);
    if (!row || row.locked) return;
    this._disarmClear();

    if (!op) {
      this.slots[row.slotId] = null;
    } else {
      const part = makeArk8Instruction(op, rd, rs, imm);
      this.slots[row.slotId] = part ? part.id : null;
    }
    this.rawText = formatArk8ProgramText(this.stage, this.slots);
    this.textErrors = [];
    this._resetExecution();

    if (op) {
      const p = makeArk8Instruction(op, rd, rs, imm);
      this.statusMsg = `📡 ${addr}番地を [${p.name}]（16bit ${p.hex16}）に更新しました`;
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
    const ram2 = this.asmState?.ram?.[2] ?? 0;
    const bits = [];
    for (let b = 0; b < 8; b++) bits.push((ram2 >> b) & 1);
    this.cb.onLiveState?.({
      inputs: [this.asmState?.pc ?? 0],
      outputs: bits,
      unstable: Boolean(this.asmState?.unstable),
    });
  }

  _getSiliconCounts() {
    const stats = this._hw?.siliconStats;
    const nandCount = stats?.nandCount ?? this._hw?.metrics?.nandCount ?? 7403;
    const swCount = stats?.swCount ?? this._hw?.metrics?.swCount ?? nandCount * 2;
    const pullCount = stats?.pullCount ?? this._hw?.metrics?.pullCount ?? nandCount;
    return { nandCount, swCount, pullCount };
  }

  _computeFuseMatrix() {
    const rowMap = buildArk8RowMap(this.stage, this.slots);
    return getArk8RomFuseMatrix(rowMap, this._hw);
  }

  getExportPayload() {
    const rowMap = buildArk8RowMap(this.stage, this.slots);
    const fuseMatrix = getArk8RomFuseMatrix(rowMap, this._hw);
    let romCircuit = null;
    if (this._hw) {
      try {
        romCircuit = buildArk8RomCircuit(rowMap, this._hw);
      } catch {
        romCircuit = null;
      }
    }
    return {
      customChips: this._hw?.workingChips || this.customChips,
      romCircuit,
      romRows: fuseMatrix.rows,
      romArch: 'ark8',
      stageTitle: this.stage ? `STAGE ${this.stage.code} ${this.stage.revealedTitle || this.stage.title}` : '',
    };
  }

  _renderFuseMatrixHtml(fuseMatrix, isStepping, st) {
    const fuseCell = (bit, valid, kindClass, colName) => {
      const burned = Boolean(valid && bit);
      return `<td class="fuse-cell ${burned ? `burned ${kindClass}` : 'unburned'}" title="${colName}: ${burned ? '焼付済 (1)' : '未焼付 (0)'}"><span class="fuse-dot">${burned ? '●' : '·'}</span></td>`;
    };

    const rowsHtml = fuseMatrix.rows
      .map((r) => {
        const isLivePc = isStepping && st.pc === r.addr;
        const isSelected = !isStepping && this.selectedAddr === r.addr;
        const imm = Array.isArray(r.imm) ? r.imm : [0, 0, 0, 0, 0, 0, 0, 0];
        const cmdLabel = r.part ? r.part.name : '---';
        return `
          <tr class="asm-fuse-row ${isLivePc ? 'pc-live' : ''} ${isSelected ? 'is-selected' : ''} ${!r.valid ? 'is-empty' : ''}"
            data-fuse-addr="${r.addr}">
            <td class="fuse-word-cell">
              <span class="fuse-pc-mark">${isLivePc ? '▶' : ''}</span>W${r.addr}
            </td>
            <td class="fuse-cmd-cell">${escapeHtml(cmdLabel)}</td>
            ${fuseCell(r.op2, r.valid, 'op-fuse', 'OP2')}
            ${fuseCell(r.op1, r.valid, 'op-fuse', 'OP1')}
            ${fuseCell(r.op0, r.valid, 'op-fuse', 'OP0')}
            ${fuseCell(r.rd1, r.valid, 'reg-fuse', 'RD1')}
            ${fuseCell(r.rd0, r.valid, 'reg-fuse', 'RD0')}
            ${fuseCell(r.rs1, r.valid, 'reg-fuse', 'RS1')}
            ${fuseCell(r.rs0, r.valid, 'reg-fuse', 'RS0')}
            ${fuseCell(imm[7], r.valid, 'imm-fuse', 'IMM7(128)')}
            ${fuseCell(imm[6], r.valid, 'imm-fuse', 'IMM6(64)')}
            ${fuseCell(imm[5], r.valid, 'imm-fuse', 'IMM5(32)')}
            ${fuseCell(imm[4], r.valid, 'imm-fuse', 'IMM4(16)')}
            ${fuseCell(imm[3], r.valid, 'imm-fuse', 'IMM3(8)')}
            ${fuseCell(imm[2], r.valid, 'imm-fuse', 'IMM2(4)')}
            ${fuseCell(imm[1], r.valid, 'imm-fuse', 'IMM1(2)')}
            ${fuseCell(imm[0], r.valid, 'imm-fuse', 'IMM0(1)')}
          </tr>
        `;
      })
      .join('');

    return `
      <div class="asm-fuse-matrix-panel ark8-fuse-panel" role="region" aria-label="16ビット焼付ROM配線図">
        <div class="asm-fuse-head">
          <span class="asm-fuse-title">🔥 16bit焼付ROM図（DEC×2 ＋ OR ヒューズ）</span>
          <span class="asm-fuse-badge">${fuseMatrix.totalBurnedFuses}箇所焼付 · ${fuseMatrix.wordCount}語</span>
        </div>
        <div class="asm-fuse-table-wrap">
          <table class="asm-fuse-table ark8-fuse-table">
            <thead>
              <tr>
                <th class="fuse-th-word">語線</th>
                <th class="fuse-th-cmd">命令</th>
                <th class="fuse-th-op">O2</th>
                <th class="fuse-th-op">O1</th>
                <th class="fuse-th-op">O0</th>
                <th class="fuse-th-reg">D1</th>
                <th class="fuse-th-reg">D0</th>
                <th class="fuse-th-reg">S1</th>
                <th class="fuse-th-reg">S0</th>
                <th class="fuse-th-imm">128</th>
                <th class="fuse-th-imm">64</th>
                <th class="fuse-th-imm">32</th>
                <th class="fuse-th-imm">16</th>
                <th class="fuse-th-imm">8</th>
                <th class="fuse-th-imm">4</th>
                <th class="fuse-th-imm">2</th>
                <th class="fuse-th-imm">1</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>
        <div class="asm-fuse-legend">● = OR配線焼付(1) ／ · = 未接続(0) ／ 16bit語 = OP[2:0] | RD[1:0] | RS[1:0] | IMM[7:0]</div>
      </div>
    `;
  }

  _renderHardwarePanelInnerHtml() {
    const st = this.asmState;
    const isStepping = st.stepIdx >= 0;
    const activeAddr = isStepping ? st.pc : this.selectedAddr;
    const activePart = isStepping ? st.part : this._getCurrentSelectedPart();
    const decode = isStepping && st.dec ? st.dec : probeArk8InstructionDecode(this._hw, activePart);
    const modeLabel = isStepping
      ? `⚡ 実行 ${st.stepIdx + 1}/${this.asmTrace.length}拍目`
      : '📡 編集中プレビュー';

    const { nandCount, swCount, pullCount } = this._getSiliconCounts();
    const fuseMatrix = this._computeFuseMatrix();
    const decSummary = summarizeArk8Decode(decode, activePart);
    const targetRam = this.stage?.asmProgramSpec?.targetRam || {};
    const initRam = this.stage?.asmProgramSpec?.initialRam || {};

    const ctrlBit = (label, bit) =>
      `<span class="asm-wire-led ${bit ? 'on' : 'off'}">${label}:${bit}</span>`;

    const regsHtml = [0, 1, 2, 3]
      .map((i) => {
        const val = st.regs[i] ?? 0;
        const prev = st.regsBefore[i] ?? 0;
        const changed = isStepping && val !== prev;
        const hex = `0x${val.toString(16).toUpperCase().padStart(2, '0')}`;
        return `
          <div class="ark8-reg-cell ${changed ? 'changed' : ''}" title="R${i} = ${val} (${hex} / ${val.toString(2).padStart(8, '0')})">
            <span class="ark8-reg-name">R${i}</span>
            <strong class="ark8-reg-val">${val}</strong>
            <span class="ark8-reg-hex">${hex}</span>
          </div>
        `;
      })
      .join('');

    const ramCellsHtml = Array.from({ length: 16 }, (_, addr) => {
      const val = st.ram[addr] ?? 0;
      const prev = st.ramBefore[addr] ?? 0;
      const changed = isStepping && val !== prev;
      const isTarget = Object.prototype.hasOwnProperty.call(targetRam, addr);
      const isInput = Object.prototype.hasOwnProperty.call(initRam, addr);
      const isTargetHit = isTarget && val === targetRam[addr];
      const isActiveMem =
        isStepping &&
        activePart &&
        (activePart.op === 'LOAD' || activePart.op === 'STOR') &&
        activePart.imm === addr;
      return `
        <div class="ark8-ram-cell ${changed ? 'written' : ''} ${isTarget ? 'is-target' : ''} ${isTargetHit ? 'target-hit' : ''} ${isInput ? 'is-input' : ''} ${isActiveMem ? 'mem-active' : ''}"
          title="SRAM[${addr}] = ${val} (0x${val.toString(16).toUpperCase().padStart(2, '0')})${isTarget ? ` / 目標値: ${targetRam[addr]}` : ''}">
          <span class="ark8-ram-addr">[${addr}]</span>
          <strong class="ark8-ram-val">${val}</strong>
        </div>
      `;
    }).join('');

    const opNameDisp = activePart ? activePart.name : '空欄';
    const opBadgeColor = activePart?.color || '#33465a';
    const wordHex = activePart ? activePart.hex16 : '0x0000';
    const swKStr = swCount >= 10000 ? `${(swCount / 1000).toFixed(1)}kFET` : `${swCount}FET`;

    return `
      <div class="asm-hw-head">
        <div class="asm-hw-title-wrap">
          <span class="asm-hw-title">⚡ ARK-8 自作実機チェーン</span>
        </div>
        <div class="asm-hw-controls">
          <button type="button" class="asm-mini-ctrl" id="btn-asm-reset" title="ハードウェアRST (PC=0, R0..R3=0, 初期SRAM復元)" aria-label="ハードウェアリセット">↺</button>
          <button type="button" class="asm-step-btn" id="btn-asm-step">⚡ 1拍実行(CLK)</button>
        </div>
      </div>

      <div class="asm-hw-chain" aria-label="ARK-8 自作ハードウェア内部回路インスペクタ">
        <button type="button" class="asm-inspect-btn" data-inspect-chip="ASM_ENC8" title="自作 8→3命令キーエンコーダ (ASM_ENC8) の内部回路を見る">🔍 ENC8</button>
        <span class="asm-chain-arrow" aria-hidden="true">▸</span>
        <button type="button" class="asm-inspect-btn" data-inspect-chip="SRAM_16B" title="自作 16バイトSRAM (SRAM_16B) の内部回路を見る">🔍 SRAM</button>
        <span class="asm-chain-arrow" aria-hidden="true">▸</span>
        <button type="button" class="asm-inspect-btn cpu" id="btn-asm-inspect" data-inspect-chip="ARK8_SYS" title="自作 8bit汎用計算機 (ARK8_SYS: ${nandCount} NAND = MOSFET ${swCount}個 ＋ 抵抗 ${pullCount}本)">
          🔍 CPU (<span class="asm-cpu-nand-part">${nandCount}N · </span>${swKStr})
        </button>
      </div>

      <div class="asm-hw-subtools">
        <button type="button" class="asm-subtool-btn fuse ${this.showFuseMatrix ? 'active' : ''}" id="btn-asm-fuse-toggle" aria-expanded="${this.showFuseMatrix ? 'true' : 'false'}">
          🔥 焼付ROM図${fuseMatrix.totalBurnedFuses > 0 ? ` (${fuseMatrix.totalBurnedFuses})` : ''} ${this.showFuseMatrix ? '▴' : '▾'}
        </button>
        <button type="button" class="asm-subtool-btn blueprint" id="btn-asm-export-verilog" title="全MOSFET・抵抗ネットリストをVerilog HDL設計図として出力">
          💾 設計図(Verilog)
        </button>
      </div>

      ${this.showFuseMatrix ? this._renderFuseMatrixHtml(fuseMatrix, isStepping, st) : ''}

      <!-- 16-BIT WORD & INST_DEC8 WIRE BRIDGE -->
      <div class="asm-bus-bridge ark8-bridge">
        <div class="asm-bus-source">
          <span class="asm-bus-mode">${escapeHtml(modeLabel)}</span>
          <span class="asm-bus-inst" style="background:${opBadgeColor}">${activeAddr}番: ${escapeHtml(opNameDisp)}</span>
          <span class="ark8-hex-pill" title="16bit機械語">${wordHex}</span>
        </div>
        <div class="ark8-dec-strip">
          ${ctrlBit('REG_WE', decode.regWe)}
          ${ctrlBit('MEM_WE', decode.memWe)}
          ${ctrlBit('SUB', decode.sub)}
          ${ctrlBit('BR', decode.br)}
          ${ctrlBit('HALT', decode.halt)}
        </div>
        <div class="ark8-dec-summary">${escapeHtml(decSummary)}</div>
      </div>

      <!-- LIVE REGFILE_4 + PC/Z/HALT MONITOR (JTAG-PROBED DIRECTLY FROM MOSFETS) -->
      <div class="ark8-state-section">
        <div class="ark8-section-head">
          <span>🧠 REGFILE_4（4本レジスタ）</span>
          <span class="ark8-pc-badges">
            <span class="ark8-badge pc">PC: <b>${isStepping ? `${st.pc}→${st.pcNext}` : st.pc}</b></span>
            <span class="ark8-badge ${st.z ? 'on' : ''}">Z:${st.z}</span>
            ${st.halt ? `<span class="ark8-badge halt">HALT</span>` : ''}
          </span>
        </div>
        <div class="ark8-regs-grid">${regsHtml}</div>
      </div>

      <!-- LIVE 16-BYTE SRAM DUMP (JTAG-PROBED DIRECTLY FROM SRAM_16B MOSFETS) -->
      <div class="ark8-state-section">
        <div class="ark8-section-head">
          <span>💾 SRAM_16B（16バイト実測ダンプ）</span>
          <span class="ark8-sram-hint">青=入力 ／ 金=目標 RAM[2]</span>
        </div>
        <div class="ark8-ram-grid">${ramCellsHtml}</div>
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
        const chipId = btn.dataset.inspectChip || 'ARK8_SYS';
        this.cb.onSound?.('switch');
        this.cb.onInspectChip?.(chipId);
      });
    });
  }

  _syncHardwarePanelInPlace() {
    const panelEl = this.container?.querySelector('.asm-hw-panel');
    if (!panelEl) return;
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

    let editorContentHtml = '';
    if (this.editorMode === 'visual') {
      const lineItems = rows
        .map((r) => {
          const part = r.locked ? r.fixedPart : resolveArk8Slot(this.slots[r.slotId]);
          const isPcNow = isStepping && st.pc === r.addr;
          const isSelected = !r.locked && this.selectedAddr === r.addr;
          const opCls = part ? `op-${part.op.toLowerCase()}` : 'op-empty';
          const hex = part ? part.hex16 : '------';
          const commentText = part ? part.comment : 'タップして命令を書く';
          const operandText = part ? part.name.slice(part.op.length).trim() : '';

          return `
            <button type="button"
              role="option"
              aria-selected="${isSelected ? 'true' : 'false'}"
              class="asm-code-row ark8-code-row ${isSelected ? 'selected' : ''} ${isPcNow ? 'pc-active' : ''} ${r.locked ? 'locked' : ''} ${!part ? 'is-empty' : ''}"
              data-addr="${r.addr}"
              data-locked="${r.locked ? '1' : '0'}">
              <span class="asm-row-gutter">
                <span class="asm-pc-arrow">${isPcNow ? '▶' : isSelected ? '▸' : ''}</span>
                <span class="asm-addr-num">${r.addr}:</span>
              </span>
              <span class="asm-row-code ark8-row-code">
                ${
                  part
                    ? `<span class="asm-op-token ${opCls}">${escapeHtml(part.op)}</span>
                       ${operandText ? `<span class="asm-val-token">${escapeHtml(operandText)}</span>` : ''}`
                    : `<span class="asm-placeholder-token">---</span>`
                }
              </span>
              <span class="asm-row-bits ${part ? '' : 'empty'}" title="16bit機械語">${hex}</span>
              <span class="asm-row-comment">; ${escapeHtml(commentText)}</span>
            </button>
          `;
        })
        .join('');

      editorContentHtml = `<div class="asm-code-list" role="listbox" aria-label="ARK-8 16ビットアセンブリ命令リスト">${lineItems}</div>`;
    } else {
      const errBanner =
        this.textErrors.length > 0
          ? `<div class="asm-text-status err">⚠ ${escapeHtml(this.textErrors[0].message)}</div>`
          : `<div class="asm-text-status ok">✔ アセンブルOK（16bit機械語に変換完了 → 1拍実行またはテスト実行へ！）</div>`;

      editorContentHtml = `
        <div class="asm-text-editor-wrap">
          <div class="asm-text-help">書式例: <code>0: LOAD R0, [0]</code> / <code>SUB R0, R1</code> / <code>JNZ R1, 4</code> / <code>STOR R2, [2]</code> / <code>HALT</code></div>
          <textarea id="asm-raw-textarea" class="asm-raw-textarea" rows="${Math.max(6, rows.length + 1)}" spellcheck="false" autocomplete="off" autocapitalize="characters">${escapeHtml(this.rawText)}</textarea>
          ${errBanner}
        </div>
      `;
    }

    const statusBarHtml = this.statusMsg
      ? `<div class="asm-live-banner tone-${this.statusTone}">${escapeHtml(this.statusMsg)}</div>`
      : '';

    this.container.innerHTML = `
      <div class="asm-ide-grid ark8-ide-grid">
        <section class="asm-hw-panel ark8-hw-panel">
          ${this._renderHardwarePanelInnerHtml()}
        </section>

        <section class="asm-editor-panel">
          <div class="asm-editor-head">
            <div class="asm-editor-file">
              <span class="asm-file-dot"></span>
              <span class="asm-file-name">ark8_main.asm</span>
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
          if (this._clearArmed) this._disarmClear();
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
        if (nextMode === 'text' || this.textErrors.length === 0) {
          this.rawText = formatArk8ProgramText(this.stage, this.slots);
          this.textErrors = [];
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
        if (rowBtn.dataset.locked === '1') return;
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
        const assembled = assembleArk8ProgramText(this.rawText, this.stage);
        this.textErrors = assembled.errors;
        if (assembled.ok) {
          this.slots = assembled.slots;
          this._resetExecution();
          this.cb.onSlotsChange?.({ ...this.slots });
          this._notifyLiveState();
          this._syncHardwarePanelInPlace();
        }
        const statusEl = this.container.querySelector('.asm-text-status');
        if (statusEl) {
          if (this.textErrors.length > 0) {
            statusEl.className = 'asm-text-status err';
            statusEl.textContent = `⚠ ${this.textErrors[0].message}`;
          } else {
            statusEl.className = 'asm-text-status ok';
            statusEl.textContent = '✔ アセンブルOK（16bit機械語に変換完了 → 1拍実行またはテスト実行へ！）';
          }
        }
      });
    }
  }

  renderComposer() {
    if (!this.paletteHost || !this.stage) return;

    if (this.editorMode === 'text') {
      this.paletteHost.innerHTML = `
        <div class="asm-composer-text-tip">
          <span>⌨ 直打ち中：<code>LOAD R0, [0]</code> / <code>ADD R2, R0</code> / <code>SUB R1, R3</code> / <code>JNZ R1, 4</code> / <code>STOR R2, [2]</code> / <code>HALT</code></span>
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
    const opDef = curOp ? ARK8_OPCODES[curOp] : null;
    const curRd = curPart ? curPart.rd : 0;
    const curRs = curPart ? curPart.rs : 0;
    const curImm = curPart ? curPart.imm : 0;

    const opButtons = EDITABLE_OPCODES.map((op) => {
      const def = ARK8_OPCODES[op];
      const active = curOp === op;
      return `
        <button type="button"
          class="asm-op-btn ark8-op-btn ${active ? 'active' : ''}"
          data-asm-op="${op}"
          aria-pressed="${active ? 'true' : 'false'}"
          style="--op-color:${def.color}; --op-accent:${def.accent}">
          <span class="asm-op-btn-code">${op}</span>
          <span class="asm-op-btn-meta">${def.shortJa}</span>
        </button>
      `;
    }).join('');

    // Build Row 2 operands contextually based on selected opcode!
    let operandsHtml = '';
    if (!opDef) {
      operandsHtml = `<span class="ark8-comp-hint">▲ 上の命令をタップして引数・DIPスイッチを設定</span>`;
    } else if (curOp === 'HALT') {
      operandsHtml = `<span class="ark8-comp-hint ok">✔ HALT — 引数なし（この番地で CPU を安全停止させます）</span>`;
    } else {
      const parts = [];
      if (opDef.usesRd) {
        const rdLbl = curOp === 'JNZ' ? '判定' : '先Rd';
        parts.push(`
          <div class="ark8-reg-picker" role="group" aria-label="${rdLbl}レジスタ選択">
            <span class="ark8-picker-lbl">${rdLbl}</span>
            ${[0, 1, 2, 3]
              .map(
                (r) =>
                  `<button type="button" class="ark8-reg-pill ${curRd === r ? 'active' : ''}" data-ark8-rd="${r}">R${r}</button>`
              )
              .join('')}
          </div>
        `);
      }
      if (opDef.usesRs) {
        const rsLbl = curOp === 'STOR' ? '元Rs' : '右Rs';
        parts.push(`
          <div class="ark8-reg-picker" role="group" aria-label="${rsLbl}レジスタ選択">
            <span class="ark8-picker-lbl">${rsLbl}</span>
            ${[0, 1, 2, 3]
              .map(
                (r) =>
                  `<button type="button" class="ark8-reg-pill rs ${curRs === r ? 'active' : ''}" data-ark8-rs="${r}">R${r}</button>`
              )
              .join('')}
          </div>
        `);
      }
      if (opDef.usesImm) {
        const maxVal = opDef.immMax;
        const bitCount = maxVal > 15 ? 8 : 4;
        const immLbl = curOp === 'LOAD' || curOp === 'STOR' ? 'RAM' : curOp === 'JNZ' ? '番地' : '即値';
        const dipSwitches = [];
        for (let b = bitCount - 1; b >= 0; b--) {
          const w = 1 << b;
          const isOn = Boolean((curImm >> b) & 1);
          dipSwitches.push(`
            <button type="button"
              class="asm-dip-sw ark8-dip-sw ${isOn ? 'on' : 'off'}"
              data-dip-bit="${b}"
              aria-pressed="${isOn ? 'true' : 'false'}"
              title="物理DIPスイッチ bit${b} (重み ${w})">
              <span class="asm-dip-led" aria-hidden="true"></span>
              <span class="asm-dip-w">${w}</span>
              <span class="asm-dip-v">${isOn ? '1' : '0'}</span>
            </button>
          `);
        }
        parts.push(`
          <div class="ark8-imm-group">
            <span class="ark8-picker-lbl">${immLbl}</span>
            <div class="asm-val-stepper">
              ${maxVal > 15 ? `<button type="button" class="asm-step-pm wide" data-asm-delta="-10" aria-label="10減らす">−10</button>` : ''}
              <button type="button" class="asm-step-pm" data-asm-delta="-1" aria-label="1減らす">−</button>
              <span class="asm-val-readout"><strong>${curImm}</strong></span>
              <button type="button" class="asm-step-pm" data-asm-delta="1" aria-label="1増やす">＋</button>
              ${maxVal > 15 ? `<button type="button" class="asm-step-pm wide" data-asm-delta="10" aria-label="10増やす">+10</button>` : ''}
            </div>
            <div class="asm-dip-bank ark8-dip-bank" role="group" aria-label="${bitCount}bit物理DIPスイッチ">${dipSwitches.join('')}</div>
          </div>
        `);
      }
      operandsHtml = parts.join('');
    }

    this.paletteHost.innerHTML = `
      <div class="asm-composer ark8-composer">
        <div class="asm-comp-row asm-comp-ops ark8-comp-ops">
          <span class="asm-comp-addr-badge">${this.selectedAddr}番</span>
          ${opButtons}
          <button type="button" class="asm-comp-util" data-asm-act="clear" title="この行を消す">⌫</button>
          <button type="button" class="asm-comp-util next-line" data-asm-act="next" title="次の番地へ移動">次行↓</button>
        </div>
        <div class="asm-comp-row asm-comp-vals ark8-comp-vals">
          ${operandsHtml}
        </div>
      </div>
    `;

    this.paletteHost.querySelectorAll('[data-asm-op]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const op = btn.dataset.asmOp;
        this.cb.onSound?.('place');
        this._setInstructionAt(this.selectedAddr, op, curRd, curRs, curImm);
      });
    });

    this.paletteHost.querySelectorAll('[data-ark8-rd]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const rd = Number(btn.dataset.ark8Rd);
        this.cb.onSound?.('switch');
        this._setInstructionAt(this.selectedAddr, curOp || 'LDI', rd, curRs, curImm);
      });
    });

    this.paletteHost.querySelectorAll('[data-ark8-rs]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const rs = Number(btn.dataset.ark8Rs);
        this.cb.onSound?.('switch');
        this._setInstructionAt(this.selectedAddr, curOp || 'ADD', curRd, rs, curImm);
      });
    });

    this.paletteHost.querySelectorAll('[data-dip-bit]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const bitIdx = Number(btn.dataset.dipBit);
        const mod = (opDef?.immMax ?? 255) + 1;
        const nextImm = (curImm ^ (1 << bitIdx)) & (mod - 1);
        this.cb.onSound?.('switch');
        this._setInstructionAt(this.selectedAddr, curOp || 'LDI', curRd, curRs, nextImm);
      });
    });

    this.paletteHost.querySelectorAll('[data-asm-delta]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const delta = Number(btn.dataset.asmDelta);
        const mod = (opDef?.immMax ?? 255) + 1;
        const nextImm = ((curImm + delta) % mod + mod) % mod;
        this.cb.onSound?.('switch');
        this._setInstructionAt(this.selectedAddr, curOp || 'LDI', curRd, curRs, nextImm);
      });
    });

    this.paletteHost.querySelector('[data-asm-act="clear"]')?.addEventListener('click', () => {
      this.cb.onSound?.('switch');
      this._setInstructionAt(this.selectedAddr, null, 0, 0, 0);
    });

    this.paletteHost.querySelector('[data-asm-act="next"]')?.addEventListener('click', () => {
      this._selectNextEditableAddr();
    });
  }
}
