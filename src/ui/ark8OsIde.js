/**
 * SILICON GENESIS — Chapter 4 ARK-8 OS-Ready PC Hardware Console (`ARK8_OS_HW`)
 *
 * Powers Stages 53–54 (`stage.kind === 'ark8_os_program'`) with:
 *   1. Live Glowing Emerald Phosphor ASCII CRT Screen (`0xF0` MMIO) with scanlines
 *      & blinking cursor displaying real output ("ARK5:SOS", "A5!", etc.).
 *   2. Live OS Hardware Strip: Privilege Ring (`🛡️ K-MODE` vs `👤 U-MODE`),
 *      `PC`, `SP`, `EPC`, `MMU (BASE/LIMIT)`, `TMR` countdown, and `TRAP` badge
 *      (`NONE / IRQ / SYSCALL / MMU_FAULT / PRIV_FAULT`).
 *   3. Hardware Inspector Chain: `[🔍 MMU] ▸ [🔍 PRIV] ▸ [🔍 CPU (6294N · 12.6kFET)]`
 *      plus Verilog-2001 Silicon Blueprint Export (`romArch: 'ark8_os'`).
 *   4. Live JTAG-probed `R0..R3` registers + tabbed Unified 256B RAM monitor
 *      (Stack `0xE0..0xEF`, User Sandbox `0x40..0x5F`, Radio Data `0x60..0x6F`).
 *   5. Interactive `ark8_os.asm` row editor (marking locked Boot/Init rows with 🔒
 *      and vector dividers on Stage 54) + direct raw text (`⌨ 直打ち`) mode +
 *      mobile-first 16-Opcode Composer (`LDI..IRET`, contextual `Rd`/`Rs`, DIP switches).
 */

import {
  ARK8_OS_OPCODES,
  ARK8_OS_OP_ORDER,
  MMIO_PORTS,
  TRAP_CAUSE,
  TRAP_CAUSE_NAMES,
  makeArk8OsInstruction,
  resolveArk8OsSlot,
  formatArk8OsProgramText,
  assembleArk8OsProgramText,
  buildArk8OsRowMap,
  compileArk8OsHardware,
  probeArk8OsInstructionDecode,
  resetArk8OsHardware,
  runArk8OsProgram,
  evaluateArk8OsStage,
} from '../engine/osHwRunner.js?v=41';

const CLEAR_ARM_MSG = '⚠ もう一度「消去?」を押すと編集可能な命令をクリアします';

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtHex2(n) {
  return `0x${((Number(n) || 0) & 0xff).toString(16).toUpperCase().padStart(2, '0')}`;
}

function fmtImmHint(op, imm) {
  const v = (Number(imm) || 0) & 0xff;
  const hex = fmtHex2(v);
  if (op === 'STOR' || op === 'LOAD') {
    if (v === MMIO_PORTS.CRT) return `${hex} CRT`;
    if (v === MMIO_PORTS.KEYBOARD) return `${hex} KB`;
    if (v === MMIO_PORTS.DISK) return `${hex} DISK`;
    if (v === MMIO_PORTS.TIMER) return `${hex} TMR`;
    if (v === MMIO_PORTS.MMU_BASE) return `${hex} BASE`;
    if (v === MMIO_PORTS.MMU_LIMIT) return `${hex} LIM`;
    if (v === MMIO_PORTS.SP_REG) return `${hex} SP`;
    if (v === MMIO_PORTS.EPC_REG) return `${hex} EPC`;
    if (v === MMIO_PORTS.DISK_PTR) return `${hex} DPTR`;
    if (v === MMIO_PORTS.TRAP_CAUSE) return `${hex} CAUSE`;
    return hex;
  }
  if (op === 'LDI' && v >= 33 && v <= 126) {
    return `${hex} '${String.fromCharCode(v)}'`;
  }
  return hex;
}

const MMIO_QUICK_PRESETS = [
  { addr: MMIO_PORTS.CRT, label: 'CRT', hex: 'F0', forLoad: false, forStor: true },
  { addr: MMIO_PORTS.KEYBOARD, label: 'KB', hex: 'F1', forLoad: true, forStor: false },
  { addr: MMIO_PORTS.DISK, label: 'DISK', hex: 'F2', forLoad: true, forStor: true },
  { addr: MMIO_PORTS.TIMER, label: 'TMR', hex: 'F3', forLoad: true, forStor: true },
  { addr: MMIO_PORTS.MMU_BASE, label: 'BASE', hex: 'F4', forLoad: true, forStor: true },
  { addr: MMIO_PORTS.MMU_LIMIT, label: 'LIM', hex: 'F5', forLoad: true, forStor: true },
  { addr: MMIO_PORTS.SP_REG, label: 'SP', hex: 'F6', forLoad: true, forStor: true },
  { addr: MMIO_PORTS.EPC_REG, label: 'EPC', hex: 'F7', forLoad: true, forStor: false },
  { addr: MMIO_PORTS.DISK_PTR, label: 'DPTR', hex: 'F8', forLoad: true, forStor: true },
  { addr: MMIO_PORTS.TRAP_CAUSE, label: 'CAUSE', hex: 'F9', forLoad: true, forStor: false },
];

function summarizeOsDecode(dec, part) {
  if (!part) return '待機中';
  if (part.op === 'IRQ') return '⏱ ハードウェア周期タイマー割込 → EPC退避・K=1・0x04へ強制ジャンプ';
  if (part.op === 'FAULT') return '🛡 MMU保護フェッチ違反 → K=1・0x0C FAULTベクタへ強制隔離';
  if (!dec) return '制御信号出力中';
  if (dec.halt) return 'PRIV=1, HALT=1（K=1で安全停止／U=0実行は特権違反トラップ）';
  if (dec.iret) return 'PRIV=1, IRET=1（K←0へ降格し PC←EPC へ復帰／U=0は特権違反）';
  if (dec.sys) return 'SYS=1（EPC←PC+1, K←1, PC←0x08 カーネル窓口へ安全昇格）';
  if (dec.call) return `CALL=1, SP-1（戻り番地PC+1をスタック退避し ${part.imm}番地へ呼出）`;
  if (dec.ret) return 'RET=1, SP+1（スタックから戻り番地をPCへ復元し復帰）';
  if (dec.da1 && dec.memWe) return `PUSH: SP-1, MEM_WE=1（MEM[SP-1] ← R${part.rs}）`;
  if (dec.da1 && dec.regWe) return `POP: SP+1, REG_WE=1（R${part.rd} ← MEM[SP]）`;
  if (dec.da0 && dec.memWe) return `STR: DA=R${part.rs}, MEM_WE=1（MEM[R${part.rs}] ← R${part.rd}）`;
  if (dec.da0 && dec.regWe) return `LDR: DA=R${part.rs}, REG_WE=1（R${part.rd} ← MEM[R${part.rs}]）`;
  if (dec.br) return `BR=1（R${part.rd}≠0 なら ${part.imm}番地へジャンプ）`;
  if (dec.memWe) return `MEM_WE=1（MEM[${fmtImmHint('STOR', part.imm)}] ← R${part.rs}）`;
  if (dec.wd1 && dec.regWe) return `WD=MEM, REG_WE=1（R${part.rd} ← MEM[${fmtImmHint('LOAD', part.imm)}]）`;
  if (dec.wd0 && dec.regWe) return `WD=IMM, REG_WE=1（R${part.rd} ← ${part.imm} [${fmtImmHint('LDI', part.imm)}]）`;
  if (dec.aluB && dec.regWe) return `ALU_B=IMM, REG_WE=1（R${part.rd} ← R${part.rd} + ${part.imm}）`;
  if (dec.sub && dec.regWe) return `SUB=1, REG_WE=1（R${part.rd} ← R${part.rd} − R${part.rs}）`;
  if (dec.regWe) return `ALU(ADD), REG_WE=1（R${part.rd} ← R${part.rd} + R${part.rs}）`;
  return '制御信号出力中';
}

function getTrapDisplay(trapCauseName, trapEvent = null) {
  const active = trapEvent || (trapCauseName && trapCauseName !== 'NONE' ? trapCauseName : 'NONE');
  if (active === 'IRQ') return { label: 'IRQ', tone: 'tone-irq' };
  if (active === 'SYSCALL') return { label: 'SYSCALL', tone: 'tone-syscall' };
  if (active === 'MMU_FAULT' || active === 'PRIV_FAULT' || active === 'FAULT') {
    return { label: active === 'PRIV_FAULT' ? 'PRIV_FAULT' : 'FAULT', tone: 'tone-fault' };
  }
  return { label: 'NONE', tone: 'tone-none' };
}

function getVectorSectionMeta(stage, addr) {
  const customHeader = stage?.asmProgramSpec?.sectionHeaders?.[addr];
  if (customHeader && customHeader.title) {
    return { title: customHeader.title, cls: customHeader.cls || 'vec-locked' };
  }
  if (stage?.id !== 'stage_54') return null;
  if (addr === 0) return { title: '🔒 0x00 BOOT（起動コード・固定）', cls: 'vec-locked' };
  if (addr === 4) return { title: '⚡ 0x04 IRQ ハンドラ（タイマー割込：R3加算→IRET）', cls: 'vec-irq' };
  if (addr === 8) return { title: '📞 0x08 SYSCALL ハンドラ（R1をCRT出力→R2加算→IRET）', cls: 'vec-syscall' };
  if (addr === 12) return { title: '🛡 0x0C FAULT ハンドラ（警告 "!" をCRT出力→HALT）', cls: 'vec-fault' };
  if (addr === 16) return { title: '🔒 0x10 KERNEL INIT（MMU/タイマー設定→IRET・固定）', cls: 'vec-locked' };
  return null;
}

export class Ark8OsIdePanel {
  constructor(containerEl, paletteHostEl, callbacks = {}) {
    this.container = containerEl;
    this.paletteHost = paletteHostEl;
    this.cb = callbacks;

    this.stage = null;
    this.customChips = {};
    this.slots = {};
    this.selectedAddr = 0;
    this.editorMode = 'visual'; // 'visual' | 'text'
    this.memTab = 'stack'; // 'stack' | 'sandbox' | 'data'
    this.rawText = '';
    this.textErrors = [];

    this._hw = null;
    this._initState = null;
    this.asmTrace = [];
    this.asmState = this._makeIdleState();
    this.statusMsg = '';
    this.statusTone = 'info';
    this._clearArmed = false;
    this._clearArmTimer = null;
  }

  _makeIdleState() {
    const ram = new Array(256).fill(0);
    const initialRam = this.stage?.asmProgramSpec?.initialRam || {};
    for (const [k, v] of Object.entries(initialRam)) {
      const idx = Number(k);
      if (idx >= 0 && idx < 256) ram[idx] = Number(v) & 0xff;
    }
    return {
      pc: 0,
      pcNext: 0,
      sp: 0xf0,
      spBefore: 0xf0,
      epc: 0,
      kMode: 1,
      kModeBefore: 1,
      base: 0,
      limit: 0,
      tmrCnt: 0,
      tmrPeriod: 0,
      irqPin: 0,
      trap: 0,
      trapCause: TRAP_CAUSE.NONE,
      trapCauseName: 'NONE',
      trapEvent: null,
      blockedAttack: false,
      blockedCount: 0,
      irqCount: 0,
      faultCount: 0,
      halt: 0,
      regs: [0, 0, 0, 0],
      regsBefore: [0, 0, 0, 0],
      crtText: '',
      diskPtr: 0,
      disk: new Array(48).fill(0),
      kbLen: typeof this.stage?.asmProgramSpec?.initialKeys === 'string'
        ? this.stage.asmProgramSpec.initialKeys.length
        : Array.isArray(this.stage?.asmProgramSpec?.initialKeys)
          ? this.stage.asmProgramSpec.initialKeys.length
          : 0,
      ram,
      ramBefore: [...ram],
      memWrite: null,
      jumped: false,
      unstable: false,
      stepIdx: -1,
      part: null,
      dec: null,
      label: '',
    };
  }

  _getDefaultMemTab(stage) {
    const preset = stage?.asmProgramSpec?.memInspectorPreset;
    if (preset === 'disk_boot') return 'sandbox';
    if (preset === 'kalloc') return 'data';
    if (preset === 'heap_stack') return 'sandbox';
    if (preset === 'syscall') return 'sandbox';
    if (preset === 'pcb_mt') return 'data';
    return stage?.id === 'stage_53' ? 'data' : 'stack';
  }

  setStage(stage, savedSlots = null, customChips = null) {
    this.stage = stage;
    if (customChips) this.customChips = customChips;
    this.editorMode = 'visual';
    this.memTab = this._getDefaultMemTab(stage);
    this.textErrors = [];
    this.statusMsg = '';
    this.statusTone = 'info';
    this._disarmClear();

    this.slots = {};
    const rows = stage?.asmProgramSpec?.rows || [];
    for (const r of rows) {
      if (!r.locked) {
        const resolved = resolveArk8OsSlot(savedSlots?.[r.slotId]);
        this.slots[r.slotId] = resolved ? resolved.id : null;
      }
    }

    try {
      this._hw = compileArk8OsHardware(this.customChips);
      this._refreshInitHardwareState();
    } catch {
      this._hw = null;
      this._initState = null;
    }

    const firstEmpty = rows.find((r) => !r.locked && !this.slots[r.slotId]);
    const firstEditable = rows.find((r) => !r.locked);
    this.selectedAddr = firstEmpty ? firstEmpty.addr : firstEditable ? firstEditable.addr : 0;

    this.rawText = formatArk8OsProgramText(this.stage, this.slots);
    this._resetExecution();
    this.render();
    this.renderComposer();
    this._notifyLiveState();
  }

  _refreshInitHardwareState() {
    if (!this._hw || !this.stage) {
      this._initState = null;
      return;
    }
    try {
      const spec = this.stage.asmProgramSpec || {};
      const rowMap = buildArk8OsRowMap(this.stage, this.slots);
      const { state } = resetArk8OsHardware(this._hw, {
        rowMap,
        kernelLib: spec.kernelLib || null,
        initialRam: spec.initialRam || null,
        userProgram: spec.userProgram || null,
        userPrograms: spec.userPrograms || null,
        diskProgram: spec.diskProgram || null,
        initialDisk: spec.initialDisk || null,
        initialKeys: spec.initialKeys || null,
        bootRom: spec.bootRom || null,
        bootEn: Boolean(spec.bootEn),
      });
      this._initState = state;
    } catch {
      this._initState = null;
    }
  }

  _resetExecution() {
    this.asmTrace = [];
    this.asmState = this._makeIdleState();
    if (this._initState) {
      const init = this._initState;
      this.asmState.regs = [...(init.regs || [0, 0, 0, 0])];
      this.asmState.regsBefore = [...(init.regs || [0, 0, 0, 0])];
      this.asmState.ram = [...(init.ram || this.asmState.ram)];
      this.asmState.ramBefore = [...(init.ram || this.asmState.ram)];
      this.asmState.pc = init.pc ?? 0;
      this.asmState.pcNext = init.pc ?? 0;
      this.asmState.sp = init.sp ?? 0xf0;
      this.asmState.spBefore = init.sp ?? 0xf0;
      this.asmState.epc = init.epc ?? 0;
      this.asmState.kMode = init.kMode ?? 1;
      this.asmState.kModeBefore = init.kMode ?? 1;
      this.asmState.base = init.base ?? 0;
      this.asmState.limit = init.limit ?? 0;
      this.asmState.tmrCnt = init.tmrCnt ?? 0;
      this.asmState.tmrPeriod = init.tmrPeriod ?? 0;
      this.asmState.irqPin = init.irqPin ?? 0;
      this.asmState.trap = init.trap ?? 0;
      this.asmState.trapCause = init.trapCause ?? TRAP_CAUSE.NONE;
      this.asmState.trapCauseName = init.trapCauseName || 'NONE';
      this.asmState.crtText = init.crtText || '';
      this.asmState.diskPtr = init.diskPtr ?? 0;
      this.asmState.disk = Array.isArray(init.disk) ? [...init.disk] : new Array(48).fill(0);
      this.asmState.kbLen = init.kbLen ?? this.asmState.kbLen;
      this.asmState.halt = init.halt ?? 0;
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
      btn.title = '編集可能な命令をクリア';
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
    this.rawText = formatArk8OsProgramText(this.stage, this.slots);
    this.textErrors = [];
    this._refreshInitHardwareState();
    this._resetExecution();
    this.statusMsg = '編集エリアをクリアしました。16命令コンポーザーでOSプログラムを書き込もう！';
    this.statusTone = 'info';
    this.cb.onSlotsChange?.({ ...this.slots });
    this.render();
    this.renderComposer();
    this._notifyLiveState();
  }

  setAwaitingFinalClock() {
    // ARK8_OS_HW terminates cleanly via HALT instruction in Kernel mode
  }

  _traceEntryToState(entry, idx) {
    const p = entry.part || { op: 'NOP', name: '---', hex16: '0x0000' };
    const after = entry.after || {};
    const before = entry.before || {};
    const pcAfter = entry.pcAfter ?? after.pc ?? 0;
    const modeTag = before.kMode === 0 ? 'U' : 'K';
    const extraTags = [];
    if (entry.crtAppended) extraTags.push(`CRT+"${entry.crtAppended}"`);
    if (entry.blockedAttack) extraTags.push('🛡攻撃遮断');
    else if (entry.trapEvent) extraTags.push(`⚡${entry.trapEvent}`);
    if (entry.haltFlag) extraTags.push('HALT');

    let blockedCount = 0;
    let irqCount = 0;
    let faultCount = 0;
    for (let i = 0; i <= idx && i < this.asmTrace.length; i++) {
      const te = this.asmTrace[i];
      if (te?.blockedAttack) blockedCount++;
      if (te?.trapEvent === 'IRQ') irqCount++;
      if (te?.trapEvent === 'MMU_FAULT' || te?.trapEvent === 'PRIV_FAULT') faultCount++;
    }

    const label = `[${modeTag}] ${entry.pcBefore}番: ${p.name} → PC=${pcAfter}${extraTags.length ? ` (${extraTags.join(' / ')})` : ''}`;
    return {
      pc: entry.pcBefore ?? 0,
      pcNext: pcAfter,
      sp: after.sp ?? 0xf0,
      spBefore: before.sp ?? 0xf0,
      epc: after.epc ?? 0,
      kMode: after.kMode ?? 1,
      kModeBefore: before.kMode ?? 1,
      base: after.base ?? 0,
      limit: after.limit ?? 0,
      tmrCnt: after.tmrCnt ?? 0,
      tmrPeriod: after.tmrPeriod ?? 0,
      irqPin: after.irqPin ?? 0,
      trap: after.trap ?? 0,
      trapCause: after.trapCause ?? TRAP_CAUSE.NONE,
      trapCauseName: after.trapCauseName || TRAP_CAUSE_NAMES[after.trapCause] || 'NONE',
      trapEvent: entry.trapEvent || null,
      blockedAttack: Boolean(entry.blockedAttack),
      blockedCount,
      irqCount,
      faultCount,
      halt: entry.haltFlag ? 1 : after.halt ?? 0,
      regs: [...(after.regs || [0, 0, 0, 0])],
      regsBefore: [...(before.regs || [0, 0, 0, 0])],
      crtText: after.crtText ?? '',
      diskPtr: after.diskPtr ?? 0,
      disk: Array.isArray(after.disk) ? [...after.disk] : (this._initState?.disk ? [...this._initState.disk] : new Array(48).fill(0)),
      kbLen: after.kbLen ?? 0,
      ram: [...(after.ram || new Array(256).fill(0))],
      ramBefore: [...(before.ram || new Array(256).fill(0))],
      memWrite: entry.memWrite || null,
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
      this.statusTone = this.asmState.unstable
        ? 'err'
        : this.asmState.blockedAttack
          ? 'warn'
          : 'ok';
      this.render();
      this._notifyLiveState();
    }
  }

  evaluateAssembly() {
    if (!this.stage) return { passed: false, results: [], error: 'ステージ未読込' };
    this._disarmClear();

    const rows = this.stage.asmProgramSpec?.rows || [];
    const placedCount = rows.filter((r) => {
      const part = r.locked ? resolveArk8OsSlot(r.fixedPart) : resolveArk8OsSlot(this.slots[r.slotId]);
      return Boolean(part);
    }).length;

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
      res = evaluateArk8OsStage(this.stage, this.slots, this.customChips);
    } catch (err) {
      return {
        passed: false,
        error: `ARK8_OS_HW 実機コンパイルエラー: ${err?.message || err}`,
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

    const targetCrt = this.stage.asmProgramSpec?.targetCrt || '';
    const results = this.asmTrace.map((entry, idx) => {
      const isLast = idx === this.asmTrace.length - 1;
      const modeTag = entry.before?.kMode === 0 ? 'U' : 'K';
      const crtNow = entry.after?.crtText || '';
      const trapTag = entry.blockedAttack
        ? ' [🛡BLOCK]'
        : entry.trapEvent
          ? ` [⚡${entry.trapEvent}]`
          : '';
      const stepPassed = !entry.unstable && (!isLast || res.passed);
      return {
        index: idx,
        label: `[${modeTag}] ${entry.pcBefore}番: ${entry.part?.name || '---'} → SP=${fmtHex2(entry.after?.sp ?? 0xf0)} CRT="${crtNow}"${trapTag}`,
        input: [idx],
        expected: [isLast ? targetCrt || 'OK' : crtNow || '…'],
        actual: [crtNow || '(空)'],
        passed: stepPassed,
        unstable: Boolean(entry.unstable),
      };
    });

    const swStats = res.run?.hw?.siliconStats || this._getSiliconCounts();
    const metrics = {
      nandCount: swStats.nandCount || 6294,
      swCount: swStats.swCount || 12588,
      pullCount: swStats.pullCount || 6294,
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
        run = runArk8OsProgram(
          this.stage,
          this.slots,
          this.customChips,
          this._hw ? { hw: this._hw } : {}
        );
      } catch (err) {
        this.statusMsg = `💥 実機コンパイルエラー: ${err?.message || err}`;
        this.statusTone = 'err';
        this.cb.onSound?.('error');
        this.render();
        return;
      }
      if (!run.trace || run.trace.length === 0) {
        this.statusMsg = '命令がまだありません！ 下の16命令キーで書き込んでから実行しよう。';
        this.statusTone = 'warn';
        this.cb.onSound?.('error');
        this.render();
        return;
      }
      this.asmTrace = run.trace;
      this.asmState = this._traceEntryToState(this.asmTrace[0], 0);
      this.statusMsg = `⚡ 1/${this.asmTrace.length}拍目：${this.asmState.label}`;
      this.statusTone = this.asmState.unstable ? 'err' : this.asmState.blockedAttack ? 'warn' : 'ok';
      this.cb.onSound?.('clock');
      this.render();
      this._notifyLiveState();
      return;
    }

    const nextIdx = (this.asmState.stepIdx ?? -1) + 1;
    if (nextIdx >= this.asmTrace.length) {
      this._refreshInitHardwareState();
      this._resetExecution();
      this.statusMsg = '↺ 実機 ARK8_OS_HW をハードウェアRST（K=1, PC=0, SP=0xF0, CRT消去）しました。';
      this.statusTone = 'info';
      this.cb.onSound?.('switch');
    } else {
      this.asmState = this._traceEntryToState(this.asmTrace[nextIdx], nextIdx);
      const doneTag = this.asmState.halt ? '（✔ HALT安全停止）' : '';
      this.statusMsg = `⚡ ${nextIdx + 1}/${this.asmTrace.length}拍目：${this.asmState.label}${doneTag}`;
      this.statusTone = this.asmState.unstable ? 'err' : this.asmState.blockedAttack ? 'warn' : 'ok';
      this.cb.onSound?.('clock');
    }

    this.render();
    this._notifyLiveState();
  }

  resetPc() {
    this._disarmClear();
    this._refreshInitHardwareState();
    this._resetExecution();
    this.statusMsg = '↺ 実機 ARK8_OS_HW をハードウェアRST（K=1, PC=0, SP=0xF0, CRT消去）しました。';
    this.statusTone = 'info';
    this.cb.onSound?.('switch');
    this.render();
    this._notifyLiveState();
  }

  _getRowByAddr(addr) {
    return (this.stage?.asmProgramSpec?.rows || []).find((r) => r.addr === addr) || null;
  }

  _getRowPart(row) {
    if (!row) return null;
    if (row.locked) return resolveArk8OsSlot(row.fixedPart);
    return resolveArk8OsSlot(this.slots[row.slotId]);
  }

  _getCurrentSelectedPart() {
    return this._getRowPart(this._getRowByAddr(this.selectedAddr));
  }

  _setInstructionAt(addr, op, rd = 0, rs = 0, imm = 0) {
    const row = this._getRowByAddr(addr);
    if (!row || row.locked) return;
    this._disarmClear();

    if (!op) {
      this.slots[row.slotId] = null;
    } else {
      const part = makeArk8OsInstruction(op, rd, rs, imm);
      this.slots[row.slotId] = part ? part.id : null;
    }
    this.rawText = formatArk8OsProgramText(this.stage, this.slots);
    this.textErrors = [];
    this._refreshInitHardwareState();
    this._resetExecution();

    if (op) {
      const p = makeArk8OsInstruction(op, rd, rs, imm);
      this.statusMsg = `🖥️ ${addr}番地(${fmtHex2(addr)})を [${p.name}]（16bit ${p.hex16}）に更新しました`;
      this.statusTone = 'info';
    } else {
      this.statusMsg = `${addr}番地(${fmtHex2(addr)})を空欄にしました`;
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

  _computeHudTag(st) {
    const spec = this.stage?.asmProgramSpec;
    const preset = spec?.memInspectorPreset;
    const meta = spec?.kernelMeta || {};
    if (!preset) return '';
    if (preset === 'disk_boot') {
      const exp = meta.diskLenExpected || (st.disk?.[0] ? st.disk[0] + 1 : 15);
      return `DSK:${st.diskPtr ?? 0}/${exp}`;
    }
    if (preset === 'kalloc') {
      const start = meta.bitmapStartAddr ?? 96;
      const cnt = meta.bitmapCount ?? 4;
      let used = 0;
      for (let i = 0; i < cnt; i++) if (st.ram?.[start + i]) used++;
      return `MEM:${used}/${cnt}`;
    }
    if (preset === 'heap_stack') {
      const brk = st.ram?.[meta.brkAddr ?? 96] ?? (meta.initialBrk ?? 46);
      return `BRK:${brk}`;
    }
    if (preset === 'syscall') {
      return `KB:${st.kbLen ?? 0}`;
    }
    if (preset === 'pcb_mt') {
      const curPcb = st.ram?.[meta.curPcbAddr ?? 96] ?? 0;
      const pid = curPcb === meta.pcb1Addr ? 'P1' : 'P0';
      if ((st.faultCount ?? 0) > 0) return `${pid} FLT:${st.faultCount}`;
      if ((st.irqCount ?? 0) > 0) return `${pid} IRQ:${st.irqCount}`;
      if (meta.showDiskPtr && (st.diskPtr ?? 0) < 29) return `DSK:${st.diskPtr ?? 0}/29`;
      return pid;
    }
    return '';
  }

  _notifyLiveState() {
    if (!this.stage) return;
    const st = this.asmState || {};
    const crt = st.crtText || '';
    const lastChar = crt.length > 0 ? crt.charCodeAt(crt.length - 1) & 0xff : 0;
    const bits = [];
    for (let b = 0; b < 8; b++) bits.push((lastChar >> b) & 1);
    this.cb.onLiveState?.({
      inputs: [st.pc ?? 0],
      outputs: bits,
      unstable: Boolean(st.unstable),
      osTelemetry: {
        crtText: crt,
        kMode: st.kMode ?? 1,
        pc: st.pc ?? 0,
        sp: st.sp ?? 0xf0,
        trapCause: st.trapCauseName || 'NONE',
        irqCount: st.irqCount ?? 0,
        faultCount: st.faultCount ?? 0,
        diskPtr: st.diskPtr ?? 0,
        hudTag: this._computeHudTag(st),
      },
    });
  }

  _getSiliconCounts() {
    const stats = this._hw?.siliconStats;
    const nandCount = stats?.nandCount ?? this._hw?.metrics?.nandCount ?? 6294;
    const swCount = stats?.swCount ?? this._hw?.metrics?.swCount ?? nandCount * 2;
    const pullCount = stats?.pullCount ?? this._hw?.metrics?.pullCount ?? nandCount;
    return { nandCount, swCount, pullCount };
  }

  getExportPayload() {
    const rowMap = buildArk8OsRowMap(this.stage, this.slots);
    return {
      customChips: this._hw?.workingChips || this.customChips,
      romCircuit: null,
      romRows: rowMap,
      romArch: 'ark8_os',
      stageTitle: this.stage ? `STAGE ${this.stage.code} ${this.stage.revealedTitle || this.stage.title}` : '',
    };
  }

  _getMemoryTabDefs(st) {
    const spec = this.stage?.asmProgramSpec || {};
    const preset = spec.memInspectorPreset;
    const meta = spec.kernelMeta || {};
    if (preset === 'disk_boot') {
      const target = meta.diskBootTargetAddr ?? 0x40;
      return [
        { id: 'sandbox', label: `💾展開 ${fmtHex2(target).slice(2)}..${fmtHex2(target + 31).slice(2)}`, start: target, length: 32 },
        { id: 'stack', label: '📦スタック E0..EF', start: 0xe0, length: 16 },
        { id: 'data', label: '📜Boot 00..1F', start: 0x00, length: 32 },
      ];
    }
    if (preset === 'kalloc') {
      const bStart = meta.bitmapStartAddr ?? 0x60;
      return [
        { id: 'data', label: `🧩BMP ${fmtHex2(bStart).slice(2)}..${fmtHex2(bStart + 15).slice(2)}`, start: bStart, length: 16 },
        { id: 'stack', label: '📦スタック E0..EF', start: 0xe0, length: 16 },
        { id: 'sandbox', label: '📜コード 00..1F', start: 0x00, length: 32 },
      ];
    }
    if (preset === 'heap_stack') {
      const sBase = meta.sandboxBase ?? 0x80;
      const heapStart = (sBase + 32) & 0xff;
      return [
        { id: 'sandbox', label: `🧪Heap/SP ${fmtHex2(heapStart).slice(2)}..${fmtHex2(heapStart + 31).slice(2)}`, start: heapStart, length: 32 },
        { id: 'data', label: '🧩BRK 60..6F', start: 0x60, length: 16 },
        { id: 'stack', label: '📦カーネル E0..EF', start: 0xe0, length: 16 },
      ];
    }
    if (preset === 'syscall') {
      const sBase = meta.sandboxBase ?? 0x80;
      return [
        { id: 'sandbox', label: `🧪砂箱 ${fmtHex2(sBase).slice(2)}..${fmtHex2(sBase + 31).slice(2)}`, start: sBase, length: 32 },
        { id: 'stack', label: '📦スタック E0..EF', start: 0xe0, length: 16 },
        { id: 'data', label: '📜カーネル 00..1F', start: 0x00, length: 32 },
      ];
    }
    if (preset === 'pcb_mt') {
      const pcbBase = meta.pcb0Addr ?? 96;
      const p0Base = st?.ram?.[(pcbBase + 1) & 0xff] || 128;
      const p1Base = st?.ram?.[((meta.pcb1Addr ?? (pcbBase + 8)) + 1) & 0xff] || 164;
      const pcbViewStart = Math.max(0, Math.min(224, pcbBase));
      return [
        { id: 'data', label: `📋PCB ${fmtHex2(pcbViewStart).slice(2)}..${fmtHex2(pcbViewStart + 31).slice(2)}`, start: pcbViewStart, length: 32 },
        { id: 'sandbox', label: `🧪P0 ${fmtHex2(p0Base).slice(2)}..`, start: p0Base, length: 24 },
        { id: 'stack', label: `🧪P1 ${fmtHex2(p1Base).slice(2)}..`, start: p1Base, length: 24 },
      ];
    }
    return [
      { id: 'stack', label: '📦スタック E0..EF', start: 0xe0, length: 16 },
      { id: 'sandbox', label: '🧪砂箱 40..5F', start: 0x40, length: 32 },
      { id: 'data', label: '📡電文 60..6F', start: spec.stringBaseAddr ?? 0x60, length: 16 },
    ];
  }

  _renderKernelTelemetryPanel(st, isStepping) {
    const spec = this.stage?.asmProgramSpec;
    const preset = spec?.memInspectorPreset;
    if (!preset) return '';
    const meta = spec.kernelMeta || {};
    const ram = st.ram || [];
    const ramBefore = st.ramBefore || [];

    if (preset === 'disk_boot') {
      const targetAddr = meta.diskBootTargetAddr ?? 0x40;
      const disk = st.disk || [];
      const payloadLen = disk[0] || (meta.diskLenExpected ? meta.diskLenExpected - 1 : 14);
      const totalBytes = payloadLen + 1;
      const dPtr = st.diskPtr ?? 0;
      const pct = Math.min(100, Math.round((dPtr / Math.max(1, totalBytes)) * 100));
      const diskCells = [];
      const showDiskN = Math.min(16, Math.max(totalBytes, 8));
      for (let i = 0; i < showDiskN; i++) {
        const b = disk[i] ?? 0;
        const isHead = i === dPtr;
        const isRead = i < dPtr;
        diskCells.push(
          `<span class="os-kt-byte ${isHead ? 'cur' : isRead ? 'done' : ''} ${i === 0 ? 'len-hdr' : ''}" title="DISK[${i}] = ${b} (${fmtHex2(b)})${i === 0 ? ' [バイト長]' : ''}">${b.toString(16).toUpperCase().padStart(2, '0')}</span>`
        );
      }
      const ramCells = [];
      const showRamN = Math.min(16, Math.max(payloadLen, 14));
      for (let i = 0; i < showRamN; i++) {
        const addr = (targetAddr + i) & 0xff;
        const val = ram[addr] ?? 0;
        const written = isStepping && val !== (ramBefore[addr] ?? 0);
        ramCells.push(
          `<span class="os-kt-byte ${written ? 'written' : val !== 0 ? 'loaded' : ''}" title="RAM[${fmtHex2(addr)}] = ${fmtHex2(val)}">${val.toString(16).toUpperCase().padStart(2, '0')}</span>`
        );
      }
      return `
        <div class="os-kt-panel" aria-label="Diskブートローダ実機モニタ">
          <div class="os-kt-head">
            <span>💿 DISK 0xF2 → RAM ${fmtHex2(targetAddr)} 展開モニタ</span>
            <span class="os-kt-pill ${dPtr >= totalBytes ? 'ok' : ''}">DPTR: ${dPtr}/${totalBytes}B (${pct}%)</span>
          </div>
          <div class="os-kt-bar-track"><div class="os-kt-bar-fill" style="width:${pct}%"></div></div>
          <div class="os-kt-row-lbl">DISK [0xF2]（先頭=サイズ${payloadLen}B / ▶DPTR=${dPtr}）</div>
          <div class="os-kt-byte-strip">${diskCells.join('')}</div>
          <div class="os-kt-row-lbl">展開先 RAM [${fmtHex2(targetAddr)}..${fmtHex2(targetAddr + showRamN - 1)}]（PC ${meta.diskBootTargetPc ?? 32}〜）</div>
          <div class="os-kt-byte-strip">${ramCells.join('')}</div>
        </div>
      `;
    }

    if (preset === 'kalloc') {
      const start = meta.bitmapStartAddr ?? 96;
      const count = meta.bitmapCount ?? 4;
      const freeArg = ram[meta.freeArgAddr ?? 104] ?? 0;
      const names = meta.slotNames || ['SLOT 0', 'SLOT 1', 'SLOT 2', 'SLOT 3'];
      const slotCards = [];
      let usedCount = 0;
      for (let i = 0; i < count; i++) {
        const addr = (start + i) & 0xff;
        const val = ram[addr] ?? 0;
        const prev = ramBefore[addr] ?? 0;
        const changed = isStepping && val !== prev;
        if (val !== 0) usedCount++;
        const shortName = String(names[i] || `SLOT ${i}`).split(' ')[0] + ' ' + i;
        slotCards.push(`
          <div class="os-slot-pill ${val ? 'used' : 'free'} ${changed ? 'flash' : ''}" title="${escapeHtml(names[i] || `SLOT ${i}`)} · RAM[${fmtHex2(addr)}]=${val}">
            <span class="os-slot-id">${escapeHtml(shortName)}</span>
            <strong class="os-slot-state">${val ? 'USED' : 'FREE'}</strong>
            <span class="os-slot-addr">${fmtHex2(addr)}=${val}</span>
          </div>
        `);
      }
      return `
        <div class="os-kt-panel" aria-label="物理メモリ4スロットビットマップ">
          <div class="os-kt-head">
            <span>🧩 物理メモリ管理ビットマップ [${fmtHex2(start)}..${fmtHex2(start + count - 1)}]</span>
            <span class="os-kt-pill">使用 ${usedCount}/${count} · 解放引数: SLOT ${freeArg}</span>
          </div>
          <div class="os-slot-grid">${slotCards.join('')}</div>
        </div>
      `;
    }

    if (preset === 'heap_stack') {
      const brkAddr = meta.brkAddr ?? 96;
      const initBrk = meta.initialBrk ?? 46;
      const limit = meta.sandboxLimit ?? 64;
      const brk = Math.min(limit, ram[brkAddr] ?? initBrk);
      const effSp = st.sp <= limit ? st.sp : limit;
      const freeBytes = Math.max(0, effSp - brk);
      const codePct = Math.round((initBrk / limit) * 100);
      const heapPct = Math.max(0, Math.round(((brk - initBrk) / limit) * 100));
      const stackPct = Math.max(0, Math.round(((limit - effSp) / limit) * 100));
      const freePct = Math.max(0, 100 - codePct - heapPct - stackPct);
      const oomNow = Boolean(st.crtText?.includes('!') || (isStepping && st.kMode !== 0 && st.pc >= 29 && st.pc <= 32));
      return `
        <div class="os-kt-panel" aria-label="ヒープ対スタック衝突ガードゲージ">
          <div class="os-kt-head">
            <span>🧱 仮想空間 Heap↑ vs ↓Stack（LIMIT=${limit}B）</span>
            <span class="os-kt-pill ${oomNow ? 'danger' : 'ok'}">${oomNow ? '🛡 OOM衝突拒否!' : `空き ${freeBytes}B`}</span>
          </div>
          <div class="os-hs-gauge" title="CODE 0..${initBrk - 1} / HEAP ${initBrk}..${brk} / FREE ${freeBytes}B / STACK ${effSp}..${limit}">
            <div class="os-hs-seg code" style="width:${codePct}%">CODE</div>
            ${heapPct > 0 ? `<div class="os-hs-seg heap" style="width:${heapPct}%">HEAP↑</div>` : ''}
            ${freePct > 0 ? `<div class="os-hs-seg free" style="width:${freePct}%">${freeBytes}B</div>` : ''}
            ${stackPct > 0 ? `<div class="os-hs-seg stack" style="width:${stackPct}%">↓SP</div>` : ''}
          </div>
          <div class="os-hs-legend">
            <span class="os-hs-tag heap">BRK[${brkAddr}]: <b>${brk}</b></span>
            <span class="os-hs-tag stack">SP[0xF6]: <b>${effSp}</b></span>
            <span class="os-hs-tag ${oomNow ? 'oom' : ''}">余裕: <b>${freeBytes}B</b></span>
          </div>
        </div>
      `;
    }

    if (preset === 'syscall') {
      const initKeysStr = typeof spec.initialKeys === 'string' ? spec.initialKeys : '';
      const rem = st.kbLen ?? initKeysStr.length;
      const consumed = Math.max(0, initKeysStr.length - rem);
      const keyPills = initKeysStr
        .split('')
        .map((ch, idx) => {
          const cls = idx < consumed ? 'done' : idx === consumed ? 'next' : 'wait';
          return `<span class="os-kb-key ${cls}">${escapeHtml(ch)}</span>`;
        })
        .join('');
      const syscalls = meta.syscalls || [
        { num: 1, name: 'WRITE', desc: 'CRT' },
        { num: 2, name: 'READ', desc: 'KB' },
        { num: 3, name: 'EXIT', desc: 'HALT' },
      ];
      let activeSysNum = 0;
      if (isStepping) {
        if (st.trapEvent === 'SYSCALL') activeSysNum = st.regsBefore?.[0] ?? 0;
        else if (st.kModeBefore !== 0 && st.pc >= 8 && st.pc <= 11) activeSysNum = 1;
        else if (st.kModeBefore !== 0 && st.pc >= 16 && st.pc <= 19) activeSysNum = 2;
        else if (st.kModeBefore !== 0 && st.pc === 20) activeSysNum = 3;
      }
      const sysChips = syscalls
        .map((sc) => {
          const on = activeSysNum === sc.num;
          return `<span class="os-sys-chip ${on ? 'active' : ''}"><b>${sc.num}</b>:${escapeHtml(sc.name.replace(/^SYS_/, ''))}</span>`;
        })
        .join('');
      return `
        <div class="os-kt-panel" aria-label="キーボード0xF1とSYSCALL分岐モニタ">
          <div class="os-kt-head">
            <span>⌨️ KB 0xF1 ＆ 📞 SYSCALL 窓口</span>
            <span class="os-kt-pill ${rem === 0 ? 'ok' : ''}">残キー: ${rem}文字</span>
          </div>
          <div class="os-syscall-row">
            <div class="os-kb-strip" title="キーボード入力キュー (0xF1)">${keyPills || '<span class="dim">空</span>'}</div>
            <div class="os-sys-strip" title="SYSCALL番号 R0">${sysChips}</div>
          </div>
        </div>
      `;
    }

    if (preset === 'pcb_mt') {
      const pcb0 = meta.pcb0Addr ?? 96;
      const pcb1 = meta.pcb1Addr ?? 104;
      const curPcb = ram[meta.curPcbAddr ?? 118] ?? pcb0;
      const labels = meta.procLabels || ['P0', 'P1'];
      const pcbs = [
        { idx: 0, addr: pcb0, name: labels[0] || 'P0' },
        { idx: 1, addr: pcb1, name: labels[1] || 'P1' },
      ];
      const pcbCardsHtml = pcbs
        .map(({ idx, addr, name }) => {
          const stateVal = ram[addr] ?? 0;
          const baseVal = ram[(addr + 1) & 0xff] ?? 0;
          const epcVal = ram[(addr + 2) & 0xff] ?? 0;
          const spVal = ram[(addr + 3) & 0xff] ?? 0;
          const isCur = curPcb === addr && stateVal !== 0;
          const stateText = stateVal === 0 ? 'DEAD' : isCur ? '▶ RUN' : 'READY';
          const stateCls = stateVal === 0 ? 'dead' : isCur ? 'run' : 'ready';
          const changed = isStepping && (ram[addr] !== ramBefore[addr] || ram[addr + 2] !== ramBefore[addr + 2]);
          return `
            <div class="os-pcb-card ${stateCls} ${changed ? 'flash' : ''}" title="PCB${idx} @ RAM[${addr}..${addr + 7}]">
              <div class="os-pcb-top">
                <span class="os-pcb-name">${escapeHtml(name)}</span>
                <span class="os-pcb-state ${stateCls}">${stateText}</span>
              </div>
              <div class="os-pcb-meta">
                <span>BASE:<b>${fmtHex2(baseVal)}</b></span>
                <span>EPC:<b>${epcVal}</b></span>
                <span>SP:<b>${spVal}</b></span>
              </div>
            </div>
          `;
        })
        .join('');

      const extraPills = [];
      if (Array.isArray(meta.bitmapAddrs)) {
        meta.bitmapAddrs.forEach((bAddr, idx) => {
          const used = (ram[bAddr] ?? 0) !== 0;
          const chg = isStepping && ram[bAddr] !== ramBefore[bAddr];
          extraPills.push(
            `<span class="os-mini-slot ${used ? 'used' : 'free'} ${chg ? 'flash' : ''}" title="物理スロット${idx} ビットマップ RAM[${bAddr}]=${ram[bAddr] ?? 0}">SLOT${idx}:${used ? 'USED' : 'FREE'}</span>`
          );
        });
      }
      if (meta.showDiskPtr) {
        const dp = st.diskPtr ?? 0;
        extraPills.push(
          `<span class="os-mini-slot disk ${dp >= 29 ? 'free' : 'used'}" title="Diskブートローダ読込ポインタ 0xF8">💿DPTR:${dp}/29</span>`
        );
      }

      return `
        <div class="os-kt-panel" aria-label="ライブPCBマルチタスクモニタ">
          <div class="os-kt-head">
            <span>🧬 PCB プロセス制御ブロック（実RAM直読）</span>
            <span class="os-kt-pill">IRQ:${st.irqCount ?? 0} · FLT:${st.faultCount ?? 0}</span>
          </div>
          <div class="os-pcb-grid">${pcbCardsHtml}</div>
          ${extraPills.length > 0 ? `<div class="os-pcb-extra">${extraPills.join('')}</div>` : ''}
        </div>
      `;
    }

    return '';
  }

  _renderMemoryProbeCells(st, isStepping) {
    const tabDefs = this._getMemoryTabDefs(st);
    const activeDef = tabDefs.find((t) => t.id === this.memTab) || tabDefs[0];
    const start = activeDef.start;
    const length = activeDef.length;

    const cells = [];
    for (let i = 0; i < length; i++) {
      const addr = (start + i) & 0xff;
      const val = st.ram?.[addr] ?? 0;
      const prev = st.ramBefore?.[addr] ?? 0;
      const written = isStepping && (val !== prev || (st.memWrite?.region === 'RAM' && st.memWrite?.addr === addr));
      const isSp = this.memTab === 'stack' && addr === st.sp;
      const ascii = val >= 32 && val <= 126 ? String.fromCharCode(val) : '';
      const addrHex = addr.toString(16).toUpperCase().padStart(2, '0');
      const valHex = val.toString(16).toUpperCase().padStart(2, '0');
      cells.push(`
        <div class="os-mem-cell ${val !== 0 ? 'nonzero' : ''} ${isSp ? 'is-sp' : ''} ${written ? 'written' : ''}"
          title="RAM[0x${addrHex}] (${addr}) = ${val} (0x${valHex})${ascii ? ` '${ascii}'` : ''}${isSp ? ' ← SP' : ''}">
          <span class="os-mem-addr">${isSp ? 'SP' : addrHex}</span>
          <strong class="os-mem-val">${valHex}</strong>
          ${ascii ? `<span class="os-mem-ascii">${escapeHtml(ascii)}</span>` : ''}
        </div>
      `);
    }
    return cells.join('');
  }

  _renderHardwarePanelInnerHtml() {
    const st = this.asmState;
    const isStepping = st.stepIdx >= 0;
    const activeAddr = isStepping ? st.pc : this.selectedAddr;
    const activePart = isStepping ? st.part : this._getCurrentSelectedPart();
    const decode =
      isStepping && st.dec
        ? st.dec
        : activePart && ARK8_OS_OPCODES[activePart.op]
          ? probeArk8OsInstructionDecode(this._hw, activePart)
          : null;
    const modeLabel = isStepping
      ? `⚡ 実行 ${st.stepIdx + 1}/${this.asmTrace.length}拍目`
      : '📡 編集中プレビュー';

    const { nandCount, swCount, pullCount } = this._getSiliconCounts();
    const decSummary = summarizeOsDecode(decode, activePart);
    const targetCrt = this.stage?.asmProgramSpec?.targetCrt || '';
    const crtText = st.crtText || '';
    const crtHit = Boolean(targetCrt && crtText === targetCrt);
    const isKernel = st.kMode !== 0;
    const trapDisp = getTrapDisplay(st.trapCauseName, st.trapEvent);
    const spChanged = isStepping && st.sp !== st.spBefore;
    const mmuLabel =
      st.base || st.limit
        ? `${fmtHex2(st.base)}/${fmtHex2(st.limit)}`
        : 'OFF';
    const tmrLabel =
      st.tmrPeriod > 0
        ? `${st.tmrCnt}/${st.tmrPeriod}`
        : 'OFF';

    const ctrlBit = (label, bit) =>
      `<span class="asm-wire-led ${bit ? 'on' : 'off'}">${label}:${bit ? 1 : 0}</span>`;

    const regsHtml = [0, 1, 2, 3]
      .map((i) => {
        const val = st.regs[i] ?? 0;
        const prev = st.regsBefore[i] ?? 0;
        const changed = isStepping && val !== prev;
        const hex = fmtHex2(val);
        const chTag = val >= 33 && val <= 126 ? ` '${String.fromCharCode(val)}'` : '';
        return `
          <div class="ark8-reg-cell ${changed ? 'changed' : ''}" title="R${i} = ${val} (${hex}${chTag})">
            <span class="ark8-reg-name">R${i}</span>
            <strong class="ark8-reg-val">${val}</strong>
            <span class="ark8-reg-hex">${hex}${escapeHtml(chTag)}</span>
          </div>
        `;
      })
      .join('');

    const opNameDisp = activePart ? activePart.name : '空欄';
    const opBadgeColor = activePart?.color || '#33465a';
    const wordHex = activePart ? activePart.hex16 : '0x0000';
    const swKStr = swCount >= 10000 ? `${(swCount / 1000).toFixed(1)}kFET` : `${swCount}FET`;

    return `
      <div class="asm-hw-head">
        <div class="asm-hw-title-wrap">
          <span class="asm-hw-title">🖥️ ARK-8 OS対応PC実機</span>
        </div>
        <div class="asm-hw-controls">
          <button type="button" class="asm-mini-ctrl" id="btn-asm-reset" title="ハードウェアRST (K=1, PC=0, SP=0xF0, CRT消去)" aria-label="ハードウェアリセット">↺</button>
          <button type="button" class="asm-step-btn" id="btn-asm-step">⚡ 1拍実行</button>
        </div>
      </div>

      <div class="asm-hw-chain" aria-label="ARK-8 OS対応PC ハードウェア内部回路インスペクタ">
        <button type="button" class="asm-inspect-btn" data-inspect-chip="MMU_8B" title="自作 Base/Limit メモリ保護ユニット (MMU_8B) の内部回路を見る">🔍 MMU</button>
        <span class="asm-chain-arrow" aria-hidden="true">▸</span>
        <button type="button" class="asm-inspect-btn" data-inspect-chip="PRIV_CTRL" title="自作 K/U 特権リング制御器 (PRIV_CTRL) の内部回路を見る">🔍 PRIV</button>
        <span class="asm-chain-arrow" aria-hidden="true">▸</span>
        <button type="button" class="asm-inspect-btn cpu" id="btn-asm-inspect" data-inspect-chip="ARK8_OS_HW" title="自作 OS対応CPU (ARK8_OS_HW: ${nandCount} NAND = MOSFET ${swCount}個 ＋ 抵抗 ${pullCount}本)">
          🔍 CPU (<span class="asm-cpu-nand-part">${nandCount}N · </span>${swKStr})
        </button>
      </div>

      <div class="asm-hw-subtools">
        <button type="button" class="asm-subtool-btn blueprint" id="btn-asm-export-verilog" title="OS対応PC全MOSFET・抵抗ネットリストをVerilog HDL設計図として出力">
          💾 設計図(Verilog)
        </button>
        <button type="button" class="asm-subtool-btn" id="btn-os-open-isa" title="16命令ISA仕様とMMIOポート一覧を開く">
          📖 16命令表
        </button>
      </div>

      <!-- LIVE GLOWING EMERALD PHOSPHOR ASCII CRT SCREEN (MMIO 0xF0) -->
      <div class="os-crt-monitor" role="region" aria-label="緑色蛍光ASCII CRTモニタ (MMIO 0xF0)">
        <div class="os-crt-head">
          <span>📺 CRT 0xF0 · EMERALD PHOSPHOR</span>
          ${
            targetCrt
              ? `<span class="os-crt-target-pill ${crtHit ? 'hit' : ''}">${crtHit ? '✔ ' : '目標: '}"${escapeHtml(targetCrt)}"</span>`
              : ''
          }
        </div>
        <div class="os-crt-screen">
          <div class="os-crt-line">
            <span class="os-crt-prompt">ARK8-OS&gt;</span>
            <span class="os-crt-output ${crtText ? '' : 'empty'}">${
              crtText ? escapeHtml(crtText) : 'STANDBY...'
            }<span class="os-crt-cursor" aria-hidden="true"></span></span>
          </div>
          <div class="os-crt-meta">
            <span>出力: ${crtText.length}文字${st.halt ? ' · ✔ HALT停止' : ''}</span>
            ${
              st.blockedCount > 0
                ? `<span style="color:#ff9ea6;font-weight:900;">🛡 不正攻撃遮断 ×${st.blockedCount}</span>`
                : `<span>MMIO 0xF0</span>`
            }
          </div>
        </div>
      </div>

      <!-- LIVE OS HARDWARE STATUS STRIP -->
      <div class="os-hw-strip" aria-label="OS特権リング・MMU・スタック・トラップ状態">
        <span class="os-ring-badge ${isKernel ? 'kernel' : 'user'}" title="${isKernel ? 'カーネル特権モード (Ring 0 / K=1)' : 'ユーザー保護モード (Ring 3 / K=0)'}">
          ${isKernel ? '🛡️ K-MODE' : '👤 U-MODE'}
        </span>
        <span class="os-stat-pill">PC:<b>${isStepping ? `${st.pc}→${st.pcNext}` : st.pc}</b></span>
        <span class="os-stat-pill ${spChanged ? 'changed' : ''}" title="スタックポインタ SP (${st.sp})">SP:<b>${fmtHex2(st.sp)}</b></span>
        <span class="os-stat-pill" title="例外復帰先カウンタ EPC (${st.epc})">EPC:<b>${st.epc}</b></span>
        <span class="os-stat-pill mmu" title="MMU BASE / LIMIT">MMU:<b>${mmuLabel}</b></span>
        <span class="os-stat-pill tmr ${st.irqPin ? 'firing' : ''}" title="タイマー残拍 / 周期">TMR:<b>${tmrLabel}</b></span>
        <span class="os-trap-badge ${trapDisp.tone}" title="最新ハードウェアトラップ原因">TRAP:${trapDisp.label}</span>
      </div>

      <!-- LIVE CHAPTER 5 KERNEL TELEMETRY PANEL (100% REAL RAM/DISK/KB STATE) -->
      ${this._renderKernelTelemetryPanel(st, isStepping)}

      <!-- 16-BIT INSTRUCTION & INST_DEC16 DECODE BRIDGE -->
      <div class="asm-bus-bridge ark8-bridge">
        <div class="asm-bus-source">
          <span class="asm-bus-mode">${escapeHtml(modeLabel)}</span>
          <span class="asm-bus-inst" style="background:${opBadgeColor}">${activeAddr}番: ${escapeHtml(opNameDisp)}</span>
          <span class="ark8-hex-pill" title="16bit機械語">${escapeHtml(wordHex)}</span>
        </div>
        ${
          decode
            ? `<div class="ark8-dec-strip">
                ${ctrlBit('REG_WE', decode.regWe)}
                ${ctrlBit('MEM_WE', decode.memWe)}
                ${ctrlBit('CALL', decode.call)}
                ${ctrlBit('RET', decode.ret)}
                ${ctrlBit('SYS', decode.sys)}
                ${ctrlBit('IRET', decode.iret)}
                ${ctrlBit('PRIV', decode.priv)}
              </div>`
            : ''
        }
        <div class="ark8-dec-summary">${escapeHtml(decSummary)}</div>
      </div>

      <!-- LIVE REGFILE_4 (JTAG-PROBED DIRECTLY FROM ARK8_OS_HW MOSFETS) -->
      <div class="ark8-state-section">
        <div class="ark8-section-head">
          <span>🧠 REGFILE_4（4本レジスタ）</span>
          <span class="ark8-pc-badges">
            ${st.halt ? `<span class="ark8-badge halt">HALT</span>` : `<span class="ark8-badge ${isKernel ? 'pc' : 'on'}">${isKernel ? 'K=1' : 'K=0'}</span>`}
          </span>
        </div>
        <div class="ark8-regs-grid">${regsHtml}</div>
      </div>

      <!-- COMPACT UNIFIED 256B RAM / STACK / SANDBOX / DATA PROBE -->
      <div class="ark8-state-section">
        <div class="ark8-section-head">
          <span>💾 統一RAM 256B</span>
          <div class="os-mem-tabs" role="tablist" aria-label="RAM表示領域切替">
            ${this._getMemoryTabDefs(st)
              .map(
                (tab) =>
                  `<button type="button" class="os-mem-tab ${this.memTab === tab.id ? 'active' : ''}" data-mem-tab="${tab.id}">${escapeHtml(tab.label)}</button>`
              )
              .join('')}
          </div>
        </div>
        <div class="os-mem-grid">${this._renderMemoryProbeCells(st, isStepping)}</div>
      </div>
    `;
  }

  _bindHardwarePanelEvents(panelEl) {
    if (!panelEl) return;
    panelEl.querySelector('#btn-asm-step')?.addEventListener('click', () => this.stepOnce());
    panelEl.querySelector('#btn-asm-reset')?.addEventListener('click', () => this.resetPc());
    panelEl.querySelector('#btn-asm-export-verilog')?.addEventListener('click', () => {
      this.cb.onSound?.('switch');
      this.cb.onExportSilicon?.(this.getExportPayload());
    });
    panelEl.querySelector('#btn-os-open-isa')?.addEventListener('click', () => {
      this.cb.onSound?.('switch');
      this.cb.onOpenSpec?.();
    });
    panelEl.querySelectorAll('[data-mem-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const nextTab = btn.dataset.memTab;
        if (!nextTab || nextTab === this.memTab) return;
        this.memTab = nextTab;
        this.cb.onSound?.('switch');
        this._syncHardwarePanelInPlace();
      });
    });
    panelEl.querySelectorAll('[data-inspect-chip]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const chipId = btn.dataset.inspectChip || 'ARK8_OS_HW';
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
    const m = lineText.match(/^(?:0x([0-9a-fA-F]+)|(\d+))\s*:/);
    const rows = this.stage.asmProgramSpec?.rows || [];
    const candidate = m ? (m[1] ? parseInt(m[1], 16) : Number(m[2])) : lineIdx;
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
          const part = this._getRowPart(r);
          const isPcNow = isStepping && st.kModeBefore !== 0 && st.pc === r.addr;
          const isSelected = !r.locked && this.selectedAddr === r.addr;
          const opCls = part ? `op-${part.op.toLowerCase()}` : 'op-empty';
          const hex = part ? part.hex16 : '------';
          const commentText = r.label || (part ? part.comment : 'タップして16命令を書く');
          const operandText = part ? part.name.slice(part.op.length).trim() : '';
          const divider = getVectorSectionMeta(this.stage, r.addr);
          const dividerHtml = divider
            ? `<div class="os-vec-divider ${divider.cls}">${escapeHtml(divider.title)}</div>`
            : '';

          return `
            ${dividerHtml}
            <button type="button"
              role="option"
              aria-selected="${isSelected ? 'true' : 'false'}"
              class="asm-code-row ark8-code-row os-code-row ${isSelected ? 'selected' : ''} ${isPcNow ? 'pc-active' : ''} ${r.locked ? 'locked' : ''} ${!part ? 'is-empty' : ''}"
              data-addr="${r.addr}"
              data-locked="${r.locked ? '1' : '0'}">
              <span class="asm-row-gutter">
                ${r.locked ? '<span class="os-lock-icon" aria-label="固定行">🔒</span>' : `<span class="asm-pc-arrow">${isPcNow ? '▶' : isSelected ? '▸' : ''}</span>`}
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

      editorContentHtml = `<div class="asm-code-list" role="listbox" aria-label="ARK-8 OS 16命令アセンブリエディタ">${lineItems}</div>`;
    } else {
      const errBanner =
        this.textErrors.length > 0
          ? `<div class="asm-text-status err">⚠ ${escapeHtml(this.textErrors[0].message)}</div>`
          : `<div class="asm-text-status ok">✔ アセンブルOK（16bit統一RAM機械語に変換完了 → 1拍実行またはテスト実行へ！）</div>`;

      const textExample =
        this.stage.chapter === 5
          ? '書式例: <code>LOAD R0, [DISK]</code> / <code>LOAD R2, [SP]</code> / <code>STOR R3, [BASE]</code> / <code>STR R2, [R1]</code> / <code>JNZ R2, 19</code>'
          : this.stage.id === 'stage_54'
            ? '書式例: <code>4: ADDI R3, 1</code> / <code>5: IRET</code> / <code>8: STOR R1, [0xF0]</code> / <code>12: LDI R0, \'!\'</code> / <code>14: HALT</code>'
            : '書式例: <code>0: LDI R1, 0x60</code> / <code>1: CALL 5</code> / <code>5: LDR R0, [R1]</code> / <code>8: STOR R0, [0xF0]</code> / <code>7: RET</code>';

      editorContentHtml = `
        <div class="asm-text-editor-wrap">
          <div class="asm-text-help">${textExample}</div>
          <textarea id="asm-raw-textarea" class="asm-raw-textarea" rows="${Math.max(8, rows.length + 1)}" spellcheck="false" autocomplete="off" autocapitalize="characters">${escapeHtml(this.rawText)}</textarea>
          ${errBanner}
        </div>
      `;
    }

    const statusBarHtml = this.statusMsg
      ? `<div class="asm-live-banner tone-${this.statusTone}">${escapeHtml(this.statusMsg)}</div>`
      : '';

    const addrMin = rows.length > 0 ? rows[0].addr : 0;
    const addrMax = rows.length > 0 ? rows[rows.length - 1].addr : 0;
    const kLibList = Array.isArray(spec?.kernelLib) ? spec.kernelLib : [];
    const kLibMods = [...new Set(kLibList.map((k) => k?.module).filter(Boolean))];
    const kLibBadgeHtml =
      kLibList.length > 0
        ? `<div class="os-klib-badge" title="これまでのステージで構築したカーネル基盤ルーチンが実RAM上に常駐稼働しています">
            <span class="os-klib-count">📚 カーネル基盤 <b>${kLibList.length}命令</b> 稼働中</span>
            ${kLibMods.length > 0 ? `<span class="os-klib-mods">${escapeHtml(kLibMods.join(' · '))}</span>` : ''}
          </div>`
        : '';

    this.container.innerHTML = `
      <div class="asm-ide-grid ark8-ide-grid os-ide-grid">
        <section class="asm-hw-panel ark8-hw-panel os-hw-panel">
          ${this._renderHardwarePanelInnerHtml()}
        </section>

        <section class="asm-editor-panel">
          <div class="asm-editor-head">
            <div class="asm-editor-file">
              <span class="asm-file-dot"></span>
              <span class="asm-file-name">ark8_os.asm</span>
              <span class="asm-file-range">PC ${addrMin}〜${addrMax}</span>
            </div>
            <div class="asm-editor-actions">
              <button type="button" class="asm-mode-btn ${this.editorMode === 'visual' ? 'active' : ''}" data-editor-mode="visual" aria-pressed="${this.editorMode === 'visual' ? 'true' : 'false'}">🧩 行入力</button>
              <button type="button" class="asm-mode-btn ${this.editorMode === 'text' ? 'active' : ''}" data-editor-mode="text" aria-pressed="${this.editorMode === 'text' ? 'true' : 'false'}">⌨ 直打ち</button>
              <button type="button" class="asm-clear-btn ${this._clearArmed ? 'armed' : ''}" id="btn-asm-clear" title="${this._clearArmed ? 'もう1回押すと編集行を消去' : '編集可能な命令をクリア'}" aria-label="編集可能な命令をクリア">${this._clearArmed ? '消去?' : '✕'}</button>
            </div>
          </div>
          <div class="asm-goal-strip">🎯 ${escapeHtml(spec?.goalTitle || this.stage.plainGoal)}</div>
          ${kLibBadgeHtml}
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
        this.statusMsg = '消去する命令はありません（編集行はすでに空欄です）';
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
          this.rawText = formatArk8OsProgramText(this.stage, this.slots);
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
        if (rowBtn.dataset.locked === '1') {
          this.statusMsg = `🔒 ${addr}番地はシステム固定コードです。空きベクタ行をタップして編集しよう！`;
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
        const assembled = assembleArk8OsProgramText(this.rawText, this.stage);
        this.textErrors = assembled.errors;
        if (assembled.ok) {
          this.slots = assembled.slots;
          this._refreshInitHardwareState();
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
            statusEl.textContent = '✔ アセンブルOK（16bit統一RAM機械語に変換完了 → 1拍実行またはテスト実行へ！）';
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
          <span>⌨ 直打ち中：<code>CALL 5</code> / <code>LDR R0, [R1]</code> / <code>STOR R0, [0xF0]</code> / <code>RET</code> / <code>IRET</code> / <code>HALT</code>（<code>'!'</code> や <code>0xF0</code> もOK）</span>
          <button type="button" class="asm-comp-help-btn" id="btn-asm-comp-isa">📖 16命令表</button>
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
    const opDef = curOp ? ARK8_OS_OPCODES[curOp] : null;
    const curRd = curPart ? curPart.rd : 0;
    const curRs = curPart ? curPart.rs : 0;
    const curImm = curPart ? curPart.imm : 0;

    const opButtons = ARK8_OS_OP_ORDER.map((op, idx) => {
      const def = ARK8_OS_OPCODES[op];
      const active = curOp === op;
      const sep = idx === 8 ? '<span class="os-op-sep" aria-hidden="true"></span>' : '';
      return `
        ${sep}
        <button type="button"
          class="asm-op-btn ark8-op-btn ${active ? 'active' : ''}"
          data-asm-op="${op}"
          aria-pressed="${active ? 'true' : 'false'}"
          style="--op-color:${def.color}; --op-accent:${def.accent}">
          <span class="asm-op-btn-code">${op === 'SYSCALL' ? 'SYS' : op}</span>
          <span class="asm-op-btn-meta">${def.shortJa}</span>
        </button>
      `;
    }).join('');

    // Build Row 2 operands contextually based on selected opcode!
    let operandsHtml = '';
    if (!opDef) {
      operandsHtml = `<span class="ark8-comp-hint">▲ 上の16命令（右へスクロールで POP〜IRET）をタップして引数を設定</span>`;
    } else if (!opDef.usesRd && !opDef.usesRs && !opDef.usesImm) {
      const noArgText =
        curOp === 'HALT'
          ? '✔ HALT — 引数なし（特権：カーネルで安全停止／ユーザー実行は違反トラップ）'
          : curOp === 'RET'
            ? '✔ RET — 引数なし（スタックから戻り番地を取り出し PC へ復帰）'
            : '✔ IRET — 引数なし（特権：K←0へ降格し EPC 番地へ復帰）';
      operandsHtml = `<span class="ark8-comp-hint ok">${noArgText}</span>`;
    } else {
      const parts = [];
      if (opDef.usesRd) {
        const rdLbl =
          curOp === 'JNZ' ? '判定' : curOp === 'STR' ? '値Rd' : '先Rd';
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
        const rsLbl =
          curOp === 'STOR'
            ? '元Rs'
            : curOp === 'PUSH'
              ? '値Rs'
              : curOp === 'LDR' || curOp === 'STR'
                ? '番地[Rs]'
                : '右Rs';
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
        const maxVal = opDef.immMax || 255;
        const bitCount = maxVal > 127 ? 8 : maxVal > 15 ? 7 : 4;
        const immLbl =
          curOp === 'LOAD' || curOp === 'STOR'
            ? '番地'
            : curOp === 'JNZ' || curOp === 'CALL'
              ? '飛び先'
              : curOp === 'SYSCALL'
                ? '番号'
                : '即値';
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
        const mmioChipsHtml =
          curOp === 'LOAD' || curOp === 'STOR'
            ? `<div class="os-mmio-presets" role="group" aria-label="MMIOポート早押し">
                ${MMIO_QUICK_PRESETS.filter((p) => (curOp === 'LOAD' ? p.forLoad : p.forStor))
                  .map(
                    (p) =>
                      `<button type="button" class="os-mmio-chip ${curImm === p.addr ? 'active' : ''}" data-mmio-addr="${p.addr}" title="${p.label} (0x${p.hex} / ${p.addr})">${p.label}</button>`
                  )
                  .join('')}
              </div>`
            : '';
        parts.push(`
          <div class="ark8-imm-group">
            <span class="ark8-picker-lbl">${immLbl}</span>
            <div class="asm-val-stepper">
              ${maxVal > 15 ? `<button type="button" class="asm-step-pm wide" data-asm-delta="-16" aria-label="16減らす">−16</button>` : ''}
              <button type="button" class="asm-step-pm" data-asm-delta="-1" aria-label="1減らす">−</button>
              <span class="asm-val-readout"><strong>${curImm}</strong></span>
              <button type="button" class="asm-step-pm" data-asm-delta="1" aria-label="1増やす">＋</button>
              ${maxVal > 15 ? `<button type="button" class="asm-step-pm wide" data-asm-delta="16" aria-label="16増やす">+16</button>` : ''}
            </div>
            <span class="os-imm-hex-tag">${escapeHtml(fmtImmHint(curOp, curImm))}</span>
            ${mmioChipsHtml}
            <div class="asm-dip-bank ark8-dip-bank" role="group" aria-label="${bitCount}bit物理DIPスイッチ">${dipSwitches.join('')}</div>
          </div>
        `);
      }
      operandsHtml = parts.join('');
    }

    this.paletteHost.innerHTML = `
      <div class="asm-composer ark8-composer os-composer">
        <div class="asm-comp-row asm-comp-ops ark8-comp-ops">
          <span class="asm-comp-addr-badge">${this.selectedAddr}番</span>
          ${opButtons}
          <button type="button" class="asm-comp-util" data-asm-act="clear" title="この行を消す">⌫</button>
          <button type="button" class="asm-comp-util next-line" data-asm-act="next" title="次の編集行へ移動">次行↓</button>
        </div>
        <div class="asm-comp-row asm-comp-vals ark8-comp-vals">
          ${operandsHtml}
        </div>
      </div>
    `;

    // Keep currently active opcode scrolled smoothly into view on narrow phones
    const activeOpBtn = this.paletteHost.querySelector('.asm-op-btn.active');
    if (activeOpBtn && typeof activeOpBtn.scrollIntoView === 'function') {
      activeOpBtn.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'nearest' });
    }

    this.paletteHost.querySelectorAll('[data-asm-op]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const op = btn.dataset.asmOp;
        this.cb.onSound?.('place');
        // Sensible default immediate when choosing STOR (0xF0 CRT) or LDI on empty row!
        let nextImm = curImm;
        if (!curOp && op === 'STOR') nextImm = MMIO_PORTS.CRT;
        this._setInstructionAt(this.selectedAddr, op, curRd, curRs, nextImm);
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

    this.paletteHost.querySelectorAll('[data-mmio-addr]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const nextImm = Number(btn.dataset.mmioAddr) & 0xff;
        this.cb.onSound?.('switch');
        this._setInstructionAt(this.selectedAddr, curOp || 'LOAD', curRd, curRs, nextImm);
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
