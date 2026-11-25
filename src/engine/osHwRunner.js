/**
 * SILICON GENESIS — Chapter 4 ARK-8 OS-Ready PC Hardware Runner (`ARK8_OS_HW`)
 *
 * Executes Chapter 4 OS-hardware programs (STAGE 53 `ARK5_CRT` & STAGE 54 `GUARD_TRAP`)
 * strictly through the player's own compiled physical silicon (Stage 00-C `SW` + `PULL`):
 *   - `ARK8_OS_HW` (Stage 52): 6,294 NAND / 12,588 MOSFETs OS-ready CPU die
 *   - `MEM_BUS8`   (Stage 43): Unified Von Neumann Fetch/Data + Boot ROM / RAM / MMIO arbiter
 *   - `MMIO_DEC`   (Stage 44): `0xF0` CRT / `0xF1` KB / `0xF2` Disk / `0xF3` Timer decoder
 *   - `TMR_IRQ`    (Stage 47): Programmable countdown Timer firing physical `IRQ=1`
 *   - `MMU_8B`     (Stage 48): Instruction-fetch & data Base/Limit translator + fault guard
 *   - `REG_8B` × 4 (Stage 30): Real 16-bit `IR_LO`/`IR_HI` + Kernel `MMU_BASE`/`MMU_LIMIT`
 *   - `ASM_ENC8` + `ASM_ENC` : Physical 16-opcode + register key encoders
 *   - `SRAM_16B`   (Stage 36): Startup runtime truth-equivalence verified (9,156 MOSFETs)
 *                              backing the 16-bank 256-byte Unified Von Neumann RAM!
 *
 * Non-destructive JTAG boundary scan probes live `R0..R3` directly from `ARK8_OS_HW`
 * MOSFETs while `CLK = 0` — ZERO JS shadow registers or fake privilege shortcuts!
 */

import { computeCircuitMetrics, packBusVector } from './circuit.js';
import { compileCircuit } from './simulator.js';
import { provisionStandardChips } from './blueprints.js';
import { numToBits } from './romRunner.js';

export const TRAP_CAUSE = {
  NONE: 0,
  IRQ: 1,
  SYSCALL: 2,
  MMU_FAULT: 3,
  PRIV_FAULT: 4,
};

export const TRAP_CAUSE_NAMES = {
  0: 'NONE',
  1: 'IRQ',
  2: 'SYSCALL',
  3: 'MMU_FAULT',
  4: 'PRIV_FAULT',
};

export const MMIO_PORTS = {
  CRT: 0xf0,
  KEYBOARD: 0xf1,
  DISK: 0xf2,
  TIMER: 0xf3,
  MMU_BASE: 0xf4,
  MMU_LIMIT: 0xf5,
  SP_REG: 0xf6,
  EPC_REG: 0xf7,
  DISK_PTR: 0xf8,
  TRAP_CAUSE: 0xf9,
};

export const ARK8_OS_OPCODES = {
  LDI: {
    op: 'LDI',
    bits: '0000',
    opCode: 0,
    shortJa: '代入',
    english: 'Load Immediate',
    usesRd: true,
    usesRs: false,
    usesImm: true,
    immMax: 255,
    privileged: false,
    color: '#b87424',
    accent: '#ffd166',
    wireHint: 'WD=IMM, REG_WE=1（即値をRdへ代入）',
  },
  ADD: {
    op: 'ADD',
    bits: '0001',
    opCode: 1,
    shortJa: '足す',
    english: 'Add Registers',
    usesRd: true,
    usesRs: true,
    usesImm: false,
    immMax: 0,
    privileged: false,
    color: '#2b7a5b',
    accent: '#5ce0a8',
    wireHint: 'ALU(A+B), REG_WE=1（Rd ← Rd + Rs）',
  },
  SUB: {
    op: 'SUB',
    bits: '0010',
    opCode: 2,
    shortJa: '引く',
    english: 'Subtract Registers',
    usesRd: true,
    usesRs: true,
    usesImm: false,
    immMax: 0,
    privileged: false,
    color: '#a8423b',
    accent: '#ff8a7a',
    wireHint: 'SUB=1, REG_WE=1（Rd ← Rd − Rs）',
  },
  JNZ: {
    op: 'JNZ',
    bits: '0011',
    opCode: 3,
    shortJa: '≠0飛ぶ',
    english: 'Jump if Not Zero',
    usesRd: true,
    usesRs: false,
    usesImm: true,
    immMax: 127,
    privileged: false,
    color: '#6e459c',
    accent: '#c89bff',
    wireHint: 'BR=1（Rd≠0なら命令番地IMMへ飛ぶ）',
  },
  LOAD: {
    op: 'LOAD',
    bits: '0100',
    opCode: 4,
    shortJa: '読込',
    english: 'Load Direct',
    usesRd: true,
    usesRs: false,
    usesImm: true,
    immMax: 255,
    privileged: false,
    color: '#226b80',
    accent: '#56ccf2',
    wireHint: 'WD=MEM, REG_WE=1（Rd ← MEM[addr]）',
  },
  STOR: {
    op: 'STOR',
    bits: '0101',
    opCode: 5,
    shortJa: '書込',
    english: 'Store Direct',
    usesRd: false,
    usesRs: true,
    usesImm: true,
    immMax: 255,
    privileged: false,
    color: '#287a4e',
    accent: '#52e3b6',
    wireHint: 'MEM_WE=1（MEM/MMIO[addr] ← Rs）',
  },
  ADDI: {
    op: 'ADDI',
    bits: '0110',
    opCode: 6,
    shortJa: '即加算',
    english: 'Add Immediate',
    usesRd: true,
    usesRs: false,
    usesImm: true,
    immMax: 255,
    privileged: false,
    color: '#8c6520',
    accent: '#ffb347',
    wireHint: 'ALU_B=IMM, REG_WE=1（Rd ← Rd + imm）',
  },
  HALT: {
    op: 'HALT',
    bits: '0111',
    opCode: 7,
    shortJa: '停止',
    english: 'Halt CPU (Kernel)',
    usesRd: false,
    usesRs: false,
    usesImm: false,
    immMax: 0,
    privileged: true,
    color: '#5a3a4a',
    accent: '#f093b0',
    wireHint: 'PRIV=1, HALT=1（特権：K=1で安全停止／U=0でPRIV_FAULT）',
  },
  POP: {
    op: 'POP',
    bits: '1000',
    opCode: 8,
    shortJa: '取出',
    english: 'Stack Pop',
    usesRd: true,
    usesRs: false,
    usesImm: false,
    immMax: 0,
    privileged: false,
    color: '#206c7a',
    accent: '#7ee8ff',
    wireHint: 'SP+1, WD=MEM, REG_WE=1（Rd ← MEM[SP], SP++）',
  },
  RET: {
    op: 'RET',
    bits: '1001',
    opCode: 9,
    shortJa: '復帰',
    english: 'Return from Call',
    usesRd: false,
    usesRs: false,
    usesImm: false,
    immMax: 0,
    privileged: false,
    color: '#5c4b9e',
    accent: '#b7a6ff',
    wireHint: 'SP+1, RET=1（PC ← MEM[SP], SP++）',
  },
  PUSH: {
    op: 'PUSH',
    bits: '1010',
    opCode: 10,
    shortJa: '積む',
    english: 'Stack Push',
    usesRd: false,
    usesRs: true,
    usesImm: false,
    immMax: 0,
    privileged: false,
    color: '#1e7864',
    accent: '#5ce0a8',
    wireHint: 'SP-1, MEM_WE=1（SP--, MEM[SP] ← Rs）',
  },
  CALL: {
    op: 'CALL',
    bits: '1011',
    opCode: 11,
    shortJa: '呼出',
    english: 'Call Subroutine',
    usesRd: false,
    usesRs: false,
    usesImm: true,
    immMax: 127,
    privileged: false,
    color: '#4e52a8',
    accent: '#8da4ff',
    wireHint: 'SP-1, CALL=1（戻り番地PC+1をスタック退避しIMMへ呼出）',
  },
  LDR: {
    op: 'LDR',
    bits: '1100',
    opCode: 12,
    shortJa: '間接読',
    english: 'Load Indirect [Rs]',
    usesRd: true,
    usesRs: true,
    usesImm: false,
    immMax: 0,
    privileged: false,
    color: '#1f6f8b',
    accent: '#56ccf2',
    wireHint: 'DA=Rs, WD=MEM, REG_WE=1（Rd ← MEM[Rs]）',
  },
  STR: {
    op: 'STR',
    bits: '1101',
    opCode: 13,
    shortJa: '間接書',
    english: 'Store Indirect [Rs]',
    usesRd: true,
    usesRs: true,
    usesImm: false,
    immMax: 0,
    privileged: false,
    color: '#247a5e',
    accent: '#52e3b6',
    wireHint: 'DA=Rs, MEM_WE=1（MEM[Rs] ← Rd）',
  },
  SYSCALL: {
    op: 'SYSCALL',
    bits: '1110',
    opCode: 14,
    shortJa: 'OS呼出',
    english: 'System Call Trap',
    usesRd: false,
    usesRs: false,
    usesImm: true,
    immMax: 255,
    privileged: false,
    color: '#9c5c1f',
    accent: '#ffd166',
    wireHint: 'SYS=1（EPC←PC+1, K←1, 0x08番地カーネルへ安全昇格）',
  },
  IRET: {
    op: 'IRET',
    bits: '1111',
    opCode: 15,
    shortJa: '特権復帰',
    english: 'Return from Trap (Kernel)',
    usesRd: false,
    usesRs: false,
    usesImm: false,
    immMax: 0,
    privileged: true,
    color: '#8f3454',
    accent: '#ff8cb0',
    wireHint: 'PRIV=1, IRET=1（特権：K←0へ降格しEPCへ復帰／U=0でFAULT）',
  },
};

export const ARK8_OS_OP_ORDER = [
  'LDI', 'ADD', 'SUB', 'JNZ', 'LOAD', 'STOR', 'ADDI', 'HALT',
  'POP', 'RET', 'PUSH', 'CALL', 'LDR', 'STR', 'SYSCALL', 'IRET',
];

const CPU_IN_PINS = ['OP[3:0]', 'REG[3:0]', 'IMM[7:0]', 'RDATA[7:0]', 'BASE[7:0]', 'LIMIT[7:0]', 'IRQ', 'SP_LD', 'RST', 'CLK'];
const BUS_IN_PINS = ['PC[7:0]', 'DA[7:0]', 'DSEL', 'BOOT', 'WE'];
const MMIO_IN_PINS = ['ADDR[7:0]', 'MMIO_EN', 'WE'];
const MMU_IN_PINS = ['VA[7:0]', 'BASE[7:0]', 'LIMIT[7:0]', 'K_MODE', 'EN'];
const REG8_IN_PINS = ['D[7:0]', 'LOAD', 'RST', 'CLK'];
const TMR_IN_PINS = ['PERIOD[7:0]', 'LOAD', 'RST', 'CLK'];
const SRAM16_IN_PINS = ['A[3:0]', 'D[7:0]', 'WE', 'CLK'];

function fmtBin(val, width) {
  return (val & ((1 << width) - 1)).toString(2).padStart(width, '0');
}

function fmtAddrHint(imm) {
  if (imm === 0xf0) return '0xF0(CRT)';
  if (imm === 0xf1) return '0xF1(KB)';
  if (imm === 0xf2) return '0xF2(DISK)';
  if (imm === 0xf3) return '0xF3(TMR)';
  if (imm === 0xf4) return '0xF4(BASE)';
  if (imm === 0xf5) return '0xF5(LIMIT)';
  if (imm === 0xf6) return '0xF6(SP)';
  if (imm === 0xf7) return '0xF7(EPC)';
  return String(imm);
}

export function makeArk8OsInstruction(opRaw, rdRaw = 0, rsRaw = 0, immRaw = 0) {
  let op = String(opRaw || '').trim().toUpperCase();
  if (op === 'SYS') op = 'SYSCALL';
  const def = ARK8_OS_OPCODES[op];
  if (!def) return null;

  const rd = Math.max(0, Math.min(3, Math.trunc(Number(rdRaw) || 0)));
  const rs = Math.max(0, Math.min(3, Math.trunc(Number(rsRaw) || 0)));
  const rawImm = Math.max(0, Math.min(255, Math.trunc(Number(immRaw) || 0)));
  const cleanImm = def.usesImm ? Math.min(def.immMax, rawImm) : 0;
  const cleanRd = def.usesRd ? rd : 0;
  const cleanRs = def.usesRs ? rs : 0;

  let name = op;
  let comment = '';
  let rule = '';

  switch (op) {
    case 'LDI':
      name = `LDI R${cleanRd}, ${cleanImm}`;
      comment = `R${cleanRd} ← ${cleanImm}${cleanImm >= 32 && cleanImm <= 126 ? ` ('${String.fromCharCode(cleanImm)}')` : ''}`;
      rule = `R${cleanRd} に即値 ${cleanImm} をセット`;
      break;
    case 'ADD':
      name = `ADD R${cleanRd}, R${cleanRs}`;
      comment = `R${cleanRd} ← R${cleanRd} + R${cleanRs}`;
      rule = `R${cleanRd} に R${cleanRs} を足して保存`;
      break;
    case 'SUB':
      name = `SUB R${cleanRd}, R${cleanRs}`;
      comment = `R${cleanRd} ← R${cleanRd} − R${cleanRs}`;
      rule = `R${cleanRd} から R${cleanRs} を引いて保存`;
      break;
    case 'JNZ':
      name = `JNZ R${cleanRd}, ${cleanImm}`;
      comment = `R${cleanRd}≠0なら ${cleanImm}番へ`;
      rule = `R${cleanRd} ≠ 0 のとき PC ← ${cleanImm}`;
      break;
    case 'LOAD':
      name = `LOAD R${cleanRd}, [${cleanImm}]`;
      comment = `R${cleanRd} ← MEM[${fmtAddrHint(cleanImm)}]`;
      rule = `統一メモリ／MMIO [${fmtAddrHint(cleanImm)}] から R${cleanRd} へ読込`;
      break;
    case 'STOR':
      name = `STOR R${cleanRs}, [${cleanImm}]`;
      comment = `MEM[${fmtAddrHint(cleanImm)}] ← R${cleanRs}`;
      rule = `R${cleanRs} を統一メモリ／MMIO [${fmtAddrHint(cleanImm)}] へ書込`;
      break;
    case 'ADDI':
      name = `ADDI R${cleanRd}, ${cleanImm}`;
      comment = `R${cleanRd} ← R${cleanRd} + ${cleanImm}`;
      rule = `R${cleanRd} に即値 ${cleanImm} を加算`;
      break;
    case 'HALT':
      name = 'HALT';
      comment = '特権停止（K=1のみ許可）';
      rule = 'カーネルモードで安全停止（ユーザーならPRIV_FAULT）';
      break;
    case 'POP':
      name = `POP R${cleanRd}`;
      comment = `R${cleanRd} ← MEM[SP], SP++`;
      rule = `スタック先頭から R${cleanRd} へ取り出し SP を +1`;
      break;
    case 'RET':
      name = 'RET';
      comment = 'PC ← MEM[SP], SP++';
      rule = 'スタックから戻り番地を取り出しサブルーチンから復帰';
      break;
    case 'PUSH':
      name = `PUSH R${cleanRs}`;
      comment = `SP--, MEM[SP] ← R${cleanRs}`;
      rule = `SP を -1 して R${cleanRs} をスタックへ退避`;
      break;
    case 'CALL':
      name = `CALL ${cleanImm}`;
      comment = `PUSH(PC+1), PC ← ${cleanImm}`;
      rule = `戻り番地 PC+1 をスタックへ積み ${cleanImm}番のサブルーチンを呼出`;
      break;
    case 'LDR':
      name = `LDR R${cleanRd}, [R${cleanRs}]`;
      comment = `R${cleanRd} ← MEM[R${cleanRs}]`;
      rule = `ポインタ R${cleanRs} が指す番地から R${cleanRd} へ間接読込`;
      break;
    case 'STR':
      name = `STR R${cleanRd}, [R${cleanRs}]`;
      comment = `MEM[R${cleanRs}] ← R${cleanRd}`;
      rule = `R${cleanRd} をポインタ R${cleanRs} が指す番地へ間接書込`;
      break;
    case 'SYSCALL':
      name = cleanImm ? `SYSCALL ${cleanImm}` : 'SYSCALL';
      comment = `EPC←PC+1, K←1, PC←8`;
      rule = 'OSカーネル(0x08番地)へ安全にサービス要求をトラップ';
      break;
    case 'IRET':
      name = 'IRET';
      comment = 'K←0, PC←EPC（特権復帰）';
      rule = 'ユーザーモードへ降格し退避済み EPC へ復帰（U=0ではFAULT）';
      break;
  }

  const id = `A8OS_${op}_${cleanRd}_${cleanRs}_${cleanImm}`;
  const word16 = ((def.opCode & 0x0f) << 12) | ((cleanRd & 3) << 10) | ((cleanRs & 3) << 8) | (cleanImm & 0xff);
  const loByte = word16 & 0xff;
  const hiByte = (word16 >> 8) & 0xff;

  return {
    id,
    name,
    op,
    opCode: def.opCode,
    rd: cleanRd,
    rs: cleanRs,
    imm: cleanImm,
    val: cleanImm,
    word16,
    loByte,
    hiByte,
    hex16: `0x${word16.toString(16).toUpperCase().padStart(4, '0')}`,
    opcodeBits: def.bits,
    rdBits: fmtBin(cleanRd, 2),
    rsBits: fmtBin(cleanRs, 2),
    immBits: fmtBin(cleanImm, 8),
    privileged: Boolean(def.privileged),
    color: def.color,
    accent: def.accent,
    comment,
    rule,
  };
}

function parseRegToken(tok) {
  const s = String(tok || '').trim().replace(/^\[(.+)\]$/, '$1').trim();
  const m = s.match(/^R([0-3])$/i);
  return m ? Number(m[1]) : NaN;
}

function parseNumToken(tok) {
  const s = String(tok || '').trim().replace(/^\[(.+)\]$/, '$1').trim();
  if (/^'(.)'$/.test(s)) return s.charCodeAt(1) & 0xff;
  if (/^0b[01]+$/i.test(s)) return parseInt(s.slice(2), 2);
  if (/^0x[0-9a-f]+$/i.test(s)) return parseInt(s.slice(2), 16);
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  // Convenient MMIO symbolic aliases
  const upper = s.toUpperCase();
  if (upper === 'CRT') return MMIO_PORTS.CRT;
  if (upper === 'KB' || upper === 'KEYBOARD') return MMIO_PORTS.KEYBOARD;
  if (upper === 'DISK' || upper === 'DSK') return MMIO_PORTS.DISK;
  if (upper === 'TMR' || upper === 'TIMER') return MMIO_PORTS.TIMER;
  if (upper === 'BASE' || upper === 'MMU_BASE') return MMIO_PORTS.MMU_BASE;
  if (upper === 'LIMIT' || upper === 'MMU_LIMIT') return MMIO_PORTS.MMU_LIMIT;
  if (upper === 'SP') return MMIO_PORTS.SP_REG;
  return NaN;
}

export function parseArk8OsLine(rawLine) {
  const withoutComment = String(rawLine ?? '')
    .replace(/;.*$/, '')
    .replace(/\/\/.*$/, '')
    .trim();
  if (!withoutComment) return { ok: true, empty: true, part: null };

  const body = withoutComment
    .replace(/^\[?\d+番地?\]?\s*:?\s*/, '')
    .replace(/^(?:0x)?[0-9a-f]+\s*:\s*/i, '')
    .trim();
  if (!body) return { ok: true, empty: true, part: null };

  const tokens = body.split(/[\s,]+/).filter(Boolean);
  let op = tokens[0].toUpperCase();
  if (op === 'SYS') op = 'SYSCALL';
  const def = ARK8_OS_OPCODES[op];
  if (!def) {
    return {
      ok: false,
      error: `不明な命令「${tokens[0]}」（LDI/ADD/SUB/JNZ/LOAD/STOR/ADDI/HALT/POP/RET/PUSH/CALL/LDR/STR/SYSCALL/IRET）`,
    };
  }

  if (op === 'HALT' || op === 'RET' || op === 'IRET') {
    return { ok: true, empty: false, part: makeArk8OsInstruction(op, 0, 0, 0) };
  }

  if (op === 'SYSCALL') {
    const imm = tokens.length >= 2 ? parseNumToken(tokens[1]) : 0;
    if (!Number.isInteger(imm) || imm < 0 || imm > 255) {
      return { ok: false, error: 'SYSCALL の番号は 0〜255（省略時は 0）にしてください' };
    }
    return { ok: true, empty: false, part: makeArk8OsInstruction('SYSCALL', 0, 0, imm) };
  }

  if (op === 'CALL') {
    if (tokens.length < 2) {
      return { ok: false, error: 'CALL には呼び出し先番地が必要です（例: CALL 5）' };
    }
    const addr = parseNumToken(tokens[1]);
    if (!Number.isInteger(addr) || addr < 0 || addr > 127) {
      return { ok: false, error: 'CALL の飛び先番地は 0〜127 にしてください' };
    }
    return { ok: true, empty: false, part: makeArk8OsInstruction('CALL', 0, 0, addr) };
  }

  if (op === 'POP') {
    const rd = parseRegToken(tokens[1]);
    if (!Number.isInteger(rd)) {
      return { ok: false, error: 'POP にはレジスタ R0〜R3 を指定してください（例: POP R0）' };
    }
    return { ok: true, empty: false, part: makeArk8OsInstruction('POP', rd, 0, 0) };
  }

  if (op === 'PUSH') {
    const rs = parseRegToken(tokens[1]);
    if (!Number.isInteger(rs)) {
      return { ok: false, error: 'PUSH にはレジスタ R0〜R3 を指定してください（例: PUSH R0）' };
    }
    return { ok: true, empty: false, part: makeArk8OsInstruction('PUSH', 0, rs, 0) };
  }

  if (tokens.length < 3) {
    return {
      ok: false,
      error: `「${op}」には2つの引数が必要です（例: ${
        op === 'LDR' || op === 'STR'
          ? `${op} R0, [R1]`
          : op === 'STOR'
            ? 'STOR R0, [240]'
            : op === 'ADD' || op === 'SUB'
              ? `${op} R0, R1`
              : `${op} R0, 5`
      }）`,
    };
  }

  if (op === 'ADD' || op === 'SUB' || op === 'LDR' || op === 'STR') {
    const rd = parseRegToken(tokens[1]);
    const rs = parseRegToken(tokens[2]);
    if (!Number.isInteger(rd) || !Number.isInteger(rs)) {
      return { ok: false, error: `${op} は R0〜R3 を指定してください（例: ${op} R0, ${op === 'LDR' || op === 'STR' ? '[R1]' : 'R1'}）` };
    }
    return { ok: true, empty: false, part: makeArk8OsInstruction(op, rd, rs, 0) };
  }

  if (op === 'STOR') {
    const rs = parseRegToken(tokens[1]);
    const addr = parseNumToken(tokens[2]);
    if (!Number.isInteger(rs)) {
      return { ok: false, error: 'STOR の第1引数は R0〜R3 にしてください（例: STOR R0, [240]）' };
    }
    if (!Number.isInteger(addr) || addr < 0 || addr > 255) {
      return { ok: false, error: 'STOR の番地は 0〜255（[0]〜[255] / [0xF0]）にしてください' };
    }
    return { ok: true, empty: false, part: makeArk8OsInstruction('STOR', 0, rs, addr) };
  }

  // LDI / ADDI / JNZ / LOAD: Rd, imm/addr
  const rd = parseRegToken(tokens[1]);
  const imm = parseNumToken(tokens[2]);
  if (!Number.isInteger(rd)) {
    return { ok: false, error: `${op} の第1引数は R0〜R3 にしてください` };
  }
  if (!Number.isInteger(imm) || imm < 0 || imm > def.immMax) {
    return { ok: false, error: `${op} の数値は 0〜${def.immMax} にしてください` };
  }
  return { ok: true, empty: false, part: makeArk8OsInstruction(op, rd, 0, imm) };
}

export function resolveArk8OsSlot(slotVal) {
  if (!slotVal) return null;
  if (typeof slotVal === 'object' && slotVal.op) {
    return makeArk8OsInstruction(slotVal.op, slotVal.rd, slotVal.rs, slotVal.imm ?? slotVal.val);
  }
  if (typeof slotVal === 'string') {
    const m = slotVal.trim().match(/^A8(?:OS)?_([A-Z]+)_(\d+)_(\d+)_(\d+)$/i);
    if (m) {
      return makeArk8OsInstruction(m[1], Number(m[2]), Number(m[3]), Number(m[4]));
    }
    const parsed = parseArk8OsLine(slotVal);
    if (parsed.ok && parsed.part) return parsed.part;
  }
  return null;
}

export function formatArk8OsProgramText(stage, slots = {}) {
  const rows = stage?.asmProgramSpec?.rows || [];
  return rows
    .map((r) => {
      if (r.locked && r.fixedPart) {
        const fp = resolveArk8OsSlot(r.fixedPart) || r.fixedPart;
        return `${r.addr}: ${(fp.name || '').padEnd(16, ' ')} ; [固定] ${r.label || ''}`.trimEnd();
      }
      const part = resolveArk8OsSlot(slots[r.slotId]);
      if (!part) return `${r.addr}: `;
      return `${r.addr}: ${part.name.padEnd(16, ' ')} ; ${part.comment}`;
    })
    .join('\n');
}

export function assembleArk8OsProgramText(sourceText, stage) {
  const rows = stage?.asmProgramSpec?.rows || [];
  const rawLines = String(sourceText ?? '').split(/\r?\n/);
  const nextSlots = {};
  const errors = [];
  for (const r of rows) {
    if (!r.locked) nextSlots[r.slotId] = null;
  }

  const usedAddrs = new Set();
  rawLines.forEach((rawLine, lineIdx) => {
    const stripped = rawLine.replace(/;.*$/, '').replace(/\/\/.*$/, '').trim();
    if (!stripped) return;

    let targetAddr = lineIdx;
    const explicitAddr =
      stripped.match(/^\[?(\d+)番地?\]?\s*:?\s*(.*)$/) || stripped.match(/^(\d+)\s*:\s*(.*)$/);
    if (explicitAddr) {
      targetAddr = Number(explicitAddr[1]);
      if (!explicitAddr[2].trim()) return;
    }

    const row = rows.find((r) => r.addr === targetAddr);
    if (!row) {
      errors.push({
        line: lineIdx + 1,
        addr: targetAddr,
        message: `${lineIdx + 1}行目: ${targetAddr}番地は編集可能範囲外です`,
      });
      return;
    }
    if (row.locked) {
      const fixed = row.fixedPart ? resolveArk8OsSlot(row.fixedPart) : null;
      const parsedLocked = parseArk8OsLine(rawLine);
      if (!parsedLocked.ok || (fixed && parsedLocked.part?.id !== fixed.id)) {
        errors.push({
          line: lineIdx + 1,
          addr: row.addr,
          message: `${row.addr}番地はシステム固定命令（${fixed?.name || ''}）のため変更できません`,
        });
      }
      return;
    }
    if (usedAddrs.has(row.addr)) {
      errors.push({ line: lineIdx + 1, addr: row.addr, message: `${row.addr}番地が重複しています` });
      return;
    }
    usedAddrs.add(row.addr);

    const parsed = parseArk8OsLine(rawLine);
    if (!parsed.ok) {
      errors.push({ line: lineIdx + 1, addr: row.addr, message: `${row.addr}番地: ${parsed.error}` });
      return;
    }
    if (parsed.part) {
      nextSlots[row.slotId] = parsed.part.id;
    }
  });

  return { ok: errors.length === 0, slots: nextSlots, errors };
}

export function buildArk8OsRowMap(stage, slots = {}) {
  const rows = stage?.asmProgramSpec?.rows || [];
  const rowMap = new Map();
  for (const r of rows) {
    const part = r.locked && r.fixedPart ? resolveArk8OsSlot(r.fixedPart) : resolveArk8OsSlot(slots[r.slotId]);
    rowMap.set(r.addr, { row: r, part });
  }
  return rowMap;
}

/**
 * Runtime EDA truth-equivalence verification of the player's forged `SRAM_16B`
 * (9,156 MOSFETs) before tiling 16 verified banks into the 256B Unified Von Neumann RAM.
 * If the player breaks `SRAM_16B` (or Stage 00-C `NAND`), this throws immediately!
 */
export function verifySram16Equivalence(workingChips) {
  const sramDef = workingChips?.SRAM_16B;
  if (!sramDef?.circuit) {
    throw new Error('SRAM_16B 回路が見つかりません（STAGE 36 をクリアしてください）');
  }
  const sramSim = compileCircuit(sramDef.circuit, workingChips);
  sramSim.reset();
  const vectors = [
    [0, 0x41],
    [5, 0x76],
    [10, 0x7c],
    [15, 0xf2],
  ];
  for (const [addr, val] of vectors) {
    const r0 = sramSim.evaluate(packBusVector(SRAM16_IN_PINS, [addr, val, 1, 0]));
    const r1 = sramSim.evaluate(packBusVector(SRAM16_IN_PINS, [addr, val, 1, 1]));
    const r2 = sramSim.evaluate(packBusVector(SRAM16_IN_PINS, [addr, val, 1, 0]));
    if (r0.unstable || r1.unstable || r2.unstable) {
      throw new Error('SRAM_16B 実機検証エラー: 回路が発振しています');
    }
  }
  // Verify readback & WE=0 write protection across all 4 banks
  for (const [addr, val] of vectors) {
    sramSim.evaluate(packBusVector(SRAM16_IN_PINS, [addr, 0x99, 0, 0]));
    sramSim.evaluate(packBusVector(SRAM16_IN_PINS, [addr, 0x99, 0, 1]));
    const r2 = sramSim.evaluate(packBusVector(SRAM16_IN_PINS, [addr, 0x99, 0, 0]));
    const got = sramSim.getOutputBusValues()[0];
    if (r2.unstable || got !== val) {
      throw new Error(`SRAM_16B 実機検証エラー: [${addr}]番地の読出値=${got}（期待値 ${val}）`);
    }
  }
  const m = computeCircuitMetrics(sramDef.circuit, workingChips);
  return {
    verified: true,
    nandCount: m.nandCount,
    swCount: sramSim.swCount || m.swCount,
    pullCount: sramSim.pullCount || m.pullCount,
    isPhysicalSilicon: Boolean(sramSim.isPhysicalSilicon),
  };
}

/**
 * Compiles the full Chapter 4 OS-ready motherboard strictly from player silicon.
 */
export function compileArk8OsHardware(customChips = {}) {
  const workingChips = { ...customChips };
  const requiredIds = [
    'NAND', 'ASM_ENC', 'ASM_ENC8', 'REG_8B', 'SRAM_16B',
    'MEM_BUS8', 'MMIO_DEC', 'STACK_PTR', 'CMP_8B', 'TMR_IRQ',
    'MMU_8B', 'PRIV_CTRL', 'IRQ_VEC', 'INST_DEC16', 'ARK8_OS_HW',
  ];
  if (requiredIds.some((id) => !workingChips[id]?.circuit)) {
    provisionStandardChips(workingChips, { includeChapter4Hardware: true, provisioned: true });
  }

  const cpuDef = workingChips.ARK8_OS_HW;
  if (!cpuDef?.circuit) {
    throw new Error('ARK8_OS_HW 回路が見つかりません（STAGE 52 を先にクリアしてください）');
  }

  // Runtime verify player's SRAM_16B before instantiating the 16-bank 256B Unified RAM
  const sram16Check = verifySram16Equivalence(workingChips);

  const compileReq = (id) => {
    const def = workingChips[id];
    if (!def?.circuit) throw new Error(`${id} 回路が見つかりません`);
    return compileCircuit(def.circuit, workingChips);
  };

  const cpuSim = compileReq('ARK8_OS_HW');
  const busSim = compileReq('MEM_BUS8');
  const mmioSim = compileReq('MMIO_DEC');
  const tmrSim = compileReq('TMR_IRQ');
  const fetchMmuSim = compileReq('MMU_8B');
  const irLoSim = compileReq('REG_8B');
  const irHiSim = compileReq('REG_8B');
  const baseSim = compileReq('REG_8B');
  const limitSim = compileReq('REG_8B');
  const asmEnc8Sim = compileReq('ASM_ENC8');
  const regEncSim = compileReq('ASM_ENC');
  const instDec16Sim = compileReq('INST_DEC16');

  const cpuMetrics = computeCircuitMetrics(cpuDef.circuit, workingChips);
  const boardParts = ['ARK8_OS_HW', 'MEM_BUS8', 'MMIO_DEC', 'TMR_IRQ', 'MMU_8B'];
  let boardNandCount = 0;
  for (const id of boardParts) {
    boardNandCount += computeCircuitMetrics(workingChips[id].circuit, workingChips).nandCount;
  }
  const reg8M = computeCircuitMetrics(workingChips.REG_8B.circuit, workingChips);
  boardNandCount += reg8M.nandCount * 4; // IR_LO, IR_HI, MMU_BASE, MMU_LIMIT

  const boardSwCount =
    cpuSim.swCount +
    busSim.swCount +
    mmioSim.swCount +
    tmrSim.swCount +
    fetchMmuSim.swCount +
    irLoSim.swCount * 4;
  const boardPullCount =
    cpuSim.pullCount +
    busSim.pullCount +
    mmioSim.pullCount +
    tmrSim.pullCount +
    fetchMmuSim.pullCount +
    irLoSim.pullCount * 4;

  return {
    cpuSim,
    busSim,
    mmioSim,
    tmrSim,
    fetchMmuSim,
    irLoSim,
    irHiSim,
    baseSim,
    limitSim,
    asmEnc8Sim,
    regEncSim,
    instDec16Sim,
    metrics: cpuMetrics,
    sram16Check,
    siliconStats: {
      nandCount: cpuMetrics.nandCount,
      swCount: cpuSim.swCount || cpuMetrics.swCount,
      pullCount: cpuSim.pullCount || cpuMetrics.pullCount,
      boardNandCount,
      boardSwCount,
      boardPullCount,
      sram16Verified: true,
      sram16SwCount: sram16Check.swCount,
      isPhysicalSilicon: Boolean(cpuSim.isPhysicalSilicon && sram16Check.isPhysicalSilicon),
    },
    workingChips,
  };
}

/**
 * Encodes any 16-opcode ARK8-OS instruction using player-forged `ASM_ENC8` + `ASM_ENC`.
 */
export function encodeArk8OsInstructionPins(part, hw = null) {
  const opCode = (part?.opCode ?? ARK8_OS_OPCODES[part?.op]?.opCode ?? 0) & 0x0f;
  const op3 = (opCode >> 3) & 1;
  const lowIdx = opCode & 7;

  let op0 = lowIdx & 1;
  let op1 = (lowIdx >> 1) & 1;
  let op2 = (lowIdx >> 2) & 1;
  let keyFlag = 1;

  if (hw?.asmEnc8Sim) {
    const keyVec = Array.from({ length: 8 }, (_, i) => (i === lowIdx ? 1 : 0));
    hw.asmEnc8Sim.reset();
    const out = hw.asmEnc8Sim.evaluate(keyVec).outputs;
    op0 = out[0] ? 1 : 0;
    op1 = out[1] ? 1 : 0;
    op2 = out[2] ? 1 : 0;
    keyFlag = out[3] ? 1 : 0;
  }

  const encodeReg = (rIdx) => {
    const idx = rIdx & 3;
    if (hw?.regEncSim) {
      hw.regEncSim.reset();
      const out = hw.regEncSim.evaluate([idx === 0 ? 1 : 0, idx === 1 ? 1 : 0, idx === 2 ? 1 : 0, idx === 3 ? 1 : 0]).outputs;
      return [out[0] ? 1 : 0, out[1] ? 1 : 0];
    }
    return [idx & 1, (idx >> 1) & 1];
  };

  const [rd0, rd1] = encodeReg(part?.rd ?? 0);
  const [rs0, rs1] = encodeReg(part?.rs ?? 0);
  const immVal = (part?.imm ?? 0) & 0xff;
  const imm = numToBits(immVal, 8);

  const encOp = op0 | (op1 << 1) | (op2 << 2) | (op3 << 3);
  const regNibble = rs0 | (rs1 << 1) | (rd0 << 2) | (rd1 << 3);
  const hiByte = ((encOp & 0x0f) << 4) | (regNibble & 0x0f);
  const loByte = immVal;

  return {
    op0, op1, op2, op3,
    opCode: encOp,
    rd0, rd1, rs0, rs1,
    regNibble,
    imm,
    loByte,
    hiByte,
    word16: (hiByte << 8) | loByte,
    keyFlag,
    opcodeBits: `${op3}${op2}${op1}${op0}`,
    rdBits: `${rd1}${rd0}`,
    rsBits: `${rs1}${rs0}`,
    immBits: fmtBin(immVal, 8),
  };
}

export function probeArk8OsInstructionDecode(hw, part) {
  if (!part) {
    return {
      opCode: 0, op0: 0, op1: 0, op2: 0, op3: 0,
      rd0: 0, rd1: 0, rs0: 0, rs1: 0,
      imm: [0, 0, 0, 0, 0, 0, 0, 0],
      keyFlag: 0,
      sub: 0, aluB: 0, wd0: 0, br: 0,
      wd1: 0, regWe: 0, memWe: 0, memOp: 0,
      da0: 0, da1: 0, sp0: 0, sp1: 0,
      call: 0, ret: 0, sys: 0, iret: 0, halt: 0, priv: 0,
    };
  }
  const enc = encodeArk8OsInstructionPins(part, hw);
  let outBus = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  if (hw?.instDec16Sim) {
    hw.instDec16Sim.reset();
    hw.instDec16Sim.evaluate(packBusVector(['OP[3:0]'], [enc.opCode]));
    outBus = hw.instDec16Sim.getOutputBusValues();
  }
  const core = outBus[0] | 0;
  const mem = outBus[1] | 0;
  const stk = outBus[2] | 0;
  return {
    ...enc,
    sub: core & 1,
    aluB: (core >> 1) & 1,
    wd0: (core >> 2) & 1,
    br: (core >> 3) & 1,
    wd1: mem & 1,
    regWe: (mem >> 1) & 1,
    memWe: (mem >> 2) & 1,
    memOp: (mem >> 3) & 1,
    da0: stk & 1,
    da1: (stk >> 1) & 1,
    sp0: (stk >> 2) & 1,
    sp1: (stk >> 3) & 1,
    call: outBus[3] ? 1 : 0,
    ret: outBus[4] ? 1 : 0,
    sys: outBus[5] ? 1 : 0,
    iret: outBus[6] ? 1 : 0,
    halt: outBus[7] ? 1 : 0,
    priv: outBus[8] ? 1 : 0,
  };
}

function clockReg8(regSim, dVal, load, rst) {
  const r0 = regSim.evaluate(packBusVector(REG8_IN_PINS, [dVal & 0xff, load ? 1 : 0, rst ? 1 : 0, 0]));
  const r1 = regSim.evaluate(packBusVector(REG8_IN_PINS, [dVal & 0xff, load ? 1 : 0, rst ? 1 : 0, 1]));
  const r2 = regSim.evaluate(packBusVector(REG8_IN_PINS, [dVal & 0xff, load ? 1 : 0, rst ? 1 : 0, 0]));
  return { val: regSim.getOutputBusValues()[0], unstable: Boolean(r0.unstable || r1.unstable || r2.unstable) };
}

function clockTimer(tmrSim, period, load, rst) {
  const r0 = tmrSim.evaluate(packBusVector(TMR_IN_PINS, [period & 0xff, load ? 1 : 0, rst ? 1 : 0, 0]));
  const r1 = tmrSim.evaluate(packBusVector(TMR_IN_PINS, [period & 0xff, load ? 1 : 0, rst ? 1 : 0, 1]));
  const r2 = tmrSim.evaluate(packBusVector(TMR_IN_PINS, [period & 0xff, load ? 1 : 0, rst ? 1 : 0, 0]));
  const [cnt, irq] = tmrSim.getOutputBusValues();
  return { cnt, irq, unstable: Boolean(r0.unstable || r1.unstable || r2.unstable) };
}

function evalCpu(hw, op, reg, imm, rdata, base, limit, irq, spLd, rst, clk) {
  const res = hw.cpuSim.evaluate(
    packBusVector(CPU_IN_PINS, [
      op & 0x0f,
      reg & 0x0f,
      imm & 0xff,
      rdata & 0xff,
      base & 0xff,
      limit & 0xff,
      irq ? 1 : 0,
      spLd ? 1 : 0,
      rst ? 1 : 0,
      clk ? 1 : 0,
    ])
  );
  return { bus: hw.cpuSim.getOutputBusValues(), unstable: Boolean(res.unstable) };
}

/**
 * Non-destructive JTAG boundary scan on `ARK8_OS_HW` while `CLK = 0`:
 * Reads `R0..R3` directly from `QA[7:0]` without changing any flip-flop!
 */
export function probeArk8OsMachineState(hw, board) {
  const savedIn = hw.cpuSim.getInputs();
  const base = hw.baseSim.getOutputBusValues()[0];
  const limit = hw.limitSim.getOutputBusValues()[0];
  const [tmrCnt, irqPin] = hw.tmrSim.getOutputBusValues();
  const regs = [0, 0, 0, 0];

  for (let r = 0; r < 4; r++) {
    const res = evalCpu(hw, 0, r << 2, 0, 0, base, limit, 0, 0, 0, 0);
    regs[r] = res.bus[0];
    if (res.unstable) break;
  }

  hw.cpuSim.evaluate(savedIn);
  const out = hw.cpuSim.getOutputBusValues();

  return {
    regs,
    pc: out[3],
    sp: out[4],
    epc: out[5],
    kMode: out[7],
    trap: out[8],
    halt: out[9],
    base,
    limit,
    tmrCnt,
    tmrPeriod: board?.tmrPeriod ?? 0,
    irqPin,
    trapCause: board?.trapCause ?? TRAP_CAUSE.NONE,
    trapCauseName: TRAP_CAUSE_NAMES[board?.trapCause ?? 0] || 'NONE',
    crtText: board?.crtText ?? '',
    diskPtr: board?.diskPtr ?? 0,
    kbLen: board?.kbQueue?.length ?? 0,
    ram: board?.ram ? Array.from(board.ram) : new Array(256).fill(0),
  };
}

/**
 * Creates & hardware-resets a Chapter 4 Motherboard instance (Unified 256B RAM,
 * Text CRT, Keyboard, Disk, Timer, MMU Base/Limit, IR_LO/IR_HI, ARK8_OS_HW).
 */
export function resetArk8OsHardware(hw, options = {}) {
  const {
    rowMap = null,
    initialRam = null,
    userProgram = null,
    initialDisk = null,
    initialKeys = null,
    bootRom = null,
    bootEn = false,
  } = options;

  hw.cpuSim.reset();
  hw.busSim.reset();
  hw.mmioSim.reset();
  hw.tmrSim.reset();
  hw.fetchMmuSim.reset();
  hw.irLoSim.reset();
  hw.irHiSim.reset();
  hw.baseSim.reset();
  hw.limitSim.reset();

  clockReg8(hw.irLoSim, 0, 0, 1);
  clockReg8(hw.irHiSim, 0, 0, 1);
  clockReg8(hw.baseSim, 0, 0, 1);
  clockReg8(hw.limitSim, 0, 0, 1);
  clockTimer(hw.tmrSim, 0, 0, 1);

  // Synchronous Hardware RST pulse on ARK8_OS_HW (PC=0, SP=0xF0, EPC=0, K_MODE=1, R0..R3=0)
  evalCpu(hw, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0);
  evalCpu(hw, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1);
  evalCpu(hw, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);

  const ram = new Uint8Array(256);
  // 1. Seed initial RAM bytes (e.g. strings at 0x60 or data)
  if (initialRam && typeof initialRam === 'object') {
    for (const [addrStr, val] of Object.entries(initialRam)) {
      ram[Number(addrStr) & 0xff] = Number(val) & 0xff;
    }
  }
  // 2. Encode & load optional pre-loaded User Sandbox binary (e.g. Stage 54 at 0x40..0x4F)
  if (userProgram && Array.isArray(userProgram.instructions)) {
    const baseAddr = (userProgram.baseAddr ?? 0x40) & 0xff;
    userProgram.instructions.forEach((spec, idx) => {
      const part = resolveArk8OsSlot(spec);
      if (!part) return;
      const enc = encodeArk8OsInstructionPins(part, hw);
      const ba = (baseAddr + idx * 2) & 0xff;
      ram[ba] = enc.loByte;
      ram[(ba + 1) & 0xff] = enc.hiByte;
    });
  }
  // 3. Encode & load Kernel / main program rows into Unified 256B RAM via ASM_ENC8 + ASM_ENC!
  const instMap = new Map();
  if (rowMap instanceof Map) {
    for (const [addr, entry] of rowMap.entries()) {
      if (!entry?.part || addr < 0 || addr > 127) continue;
      const enc = encodeArk8OsInstructionPins(entry.part, hw);
      const ba = (addr << 1) & 0xff;
      ram[ba] = enc.loByte;
      ram[(ba + 1) & 0xff] = enc.hiByte;
      instMap.set(ba, entry.part);
    }
  }

  const disk = new Uint8Array(256);
  if (initialDisk) {
    if (typeof initialDisk === 'string') {
      for (let i = 0; i < Math.min(256, initialDisk.length); i++) disk[i] = initialDisk.charCodeAt(i) & 0xff;
    } else if (Array.isArray(initialDisk) || initialDisk instanceof Uint8Array) {
      for (let i = 0; i < Math.min(256, initialDisk.length); i++) disk[i] = Number(initialDisk[i]) & 0xff;
    }
  }

  const kbQueue = [];
  if (typeof initialKeys === 'string') {
    for (let i = 0; i < initialKeys.length; i++) kbQueue.push(initialKeys.charCodeAt(i) & 0xff);
  } else if (Array.isArray(initialKeys)) {
    for (const k of initialKeys) kbQueue.push(Number(k) & 0xff);
  }

  const bootRomBuf = new Uint8Array(16);
  if (bootRom && (Array.isArray(bootRom) || bootRom instanceof Uint8Array)) {
    for (let i = 0; i < Math.min(16, bootRom.length); i++) bootRomBuf[i] = Number(bootRom[i]) & 0xff;
  }

  const board = {
    ram,
    disk,
    diskPtr: 0,
    kbQueue,
    bootRom: bootRomBuf,
    bootEn: Boolean(bootEn),
    tmrPeriod: 0,
    crtText: '',
    trapCause: TRAP_CAUSE.NONE,
    instMap,
    userProgramBase: userProgram ? (userProgram.baseAddr ?? 0x40) & 0xff : null,
  };

  return { board, state: probeArk8OsMachineState(hw, board) };
}

/**
 * Executes ONE complete 3-phase Von Neumann cycle (`Boundary IRQ -> T0 FETCH_LO -> T1 FETCH_HI -> T2 EXEC`)
 * strictly through the player's compiled MOSFET netlists!
 */
export function stepArk8OsHardwareCycle(hw, board, stepIdx = 0) {
  const before = probeArk8OsMachineState(hw, board);
  const { pc: pcBefore, kMode: kBefore, base, limit, tmrCnt, irqPin } = before;
  let unstable = false;

  // Phase 0: Instruction-boundary Timer IRQ check (masked inside PRIV_CTRL when K=1!)
  if (irqPin === 1 && kBefore === 0) {
    const r0 = evalCpu(hw, 0, 0, 0, 0, base, limit, 1, 0, 0, 0);
    const r1 = evalCpu(hw, 0, 0, 0, 0, base, limit, 1, 0, 0, 1);
    const r2 = evalCpu(hw, 0, 0, 0, 0, base, limit, 0, 0, 0, 0);
    const tr = clockTimer(hw.tmrSim, board.tmrPeriod, 0, 0);
    unstable = Boolean(r0.unstable || r1.unstable || r2.unstable || tr.unstable);
    board.trapCause = TRAP_CAUSE.IRQ;
    const after = probeArk8OsMachineState(hw, board);
    return {
      halted: false,
      haltFlag: false,
      stepIdx,
      kind: 'IRQ',
      pcBefore,
      pcAfter: after.pc,
      physFetchAddr: (base + ((pcBefore << 1) & 0xff)) & 0xff,
      part: { op: 'IRQ', name: '⚡ TMR_IRQ (0x04)', color: '#c97828', accent: '#ffd166', hex16: 'TRAP' },
      dec: null,
      before,
      after,
      crtAppended: '',
      trapEvent: 'IRQ',
      blockedAttack: false,
      memWrite: null,
      jumped: true,
      unstable,
    };
  }

  // Phase T0 (FETCH_LO) & Phase T1 (FETCH_HI): real MMU_8B + MEM_BUS8 + REG_8B×2!
  const vaLo = (pcBefore << 1) & 0xff;
  const fmLo = hw.fetchMmuSim.evaluate(packBusVector(MMU_IN_PINS, [vaLo, base, limit, kBefore, 1]));
  const [paLo, fltLo, mmioFetchLo] = hw.fetchMmuSim.getOutputBusValues();
  const bsLo = hw.busSim.evaluate(packBusVector(BUS_IN_PINS, [paLo, 0, 0, board.bootEn ? 1 : 0, 0]));
  const [bAddrLo, romEnLo] = hw.busSim.getOutputBusValues();
  const rawLo = romEnLo ? board.bootRom[bAddrLo & 0x0f] : board.ram[bAddrLo];
  const irLoRes = clockReg8(hw.irLoSim, rawLo, 1, 0);

  const vaHi = ((pcBefore << 1) | 1) & 0xff;
  const fmHi = hw.fetchMmuSim.evaluate(packBusVector(MMU_IN_PINS, [vaHi, base, limit, kBefore, 1]));
  const [paHi, fltHi, mmioFetchHi] = hw.fetchMmuSim.getOutputBusValues();
  const bsHi = hw.busSim.evaluate(packBusVector(BUS_IN_PINS, [paHi, 0, 0, board.bootEn ? 1 : 0, 0]));
  const [bAddrHi, romEnHi] = hw.busSim.getOutputBusValues();
  const rawHi = romEnHi ? board.bootRom[bAddrHi & 0x0f] : board.ram[bAddrHi];
  const irHiRes = clockReg8(hw.irHiSim, rawHi, 1, 0);

  if (fmLo.unstable || fmHi.unstable || bsLo.unstable || bsHi.unstable || irLoRes.unstable || irHiRes.unstable) {
    unstable = true;
  }

  // Catch User instruction fetch out of bounds or into MMIO!
  if (kBefore === 0 && (fltLo || fltHi || mmioFetchLo || mmioFetchHi)) {
    const r0 = evalCpu(hw, 4, 0, 0xff, 0, base, limit, 0, 0, 0, 0);
    const r1 = evalCpu(hw, 4, 0, 0xff, 0, base, limit, 0, 0, 0, 1);
    const r2 = evalCpu(hw, 0, 0, 0, 0, base, limit, 0, 0, 0, 0);
    if (r0.unstable || r1.unstable || r2.unstable) unstable = true;
    board.trapCause = TRAP_CAUSE.MMU_FAULT;
    const after = probeArk8OsMachineState(hw, board);
    return {
      halted: false,
      haltFlag: false,
      stepIdx,
      kind: 'FETCH_FAULT',
      pcBefore,
      pcAfter: after.pc,
      physFetchAddr: bAddrLo,
      part: { op: 'FAULT', name: '🛡 FETCH_FAULT (0x0C)', color: '#a8423b', accent: '#ff8a7a', hex16: 'TRAP' },
      dec: null,
      before,
      after,
      crtAppended: '',
      trapEvent: 'MMU_FAULT',
      blockedAttack: true,
      memWrite: null,
      jumped: true,
      unstable,
    };
  }

  const loByte = irLoRes.val & 0xff;
  const hiByte = irHiRes.val & 0xff;
  const op = (hiByte >> 4) & 0x0f;
  const reg = hiByte & 0x0f;
  const rd = (reg >> 2) & 3;
  const rs = reg & 3;
  const imm = loByte;
  const opName = ARK8_OS_OP_ORDER[op] || 'LDI';
  const part = makeArk8OsInstruction(opName, rd, rs, imm);

  // Stop gracefully if Kernel fetches blank uninitialized memory (0x0000 after end of user program)?
  // Note: 0x0000 is `LDI R0, 0`, which is a valid instruction; programs terminate explicitly via `HALT` or `maxCycles`!

  // Phase T2 (EXEC): Pre-edge combinational address & MMIO resolution
  let pre = evalCpu(hw, op, reg, imm, 0, base, limit, 0, 0, 0, 0);
  if (pre.unstable) unstable = true;

  const bsExec = hw.busSim.evaluate(packBusVector(BUS_IN_PINS, [paLo, pre.bus[1], 1, board.bootEn ? 1 : 0, pre.bus[6]]));
  const [bAddr, romEn, mmioEn, ramWe] = hw.busSim.getOutputBusValues();
  const mmExec = hw.mmioSim.evaluate(packBusVector(MMIO_IN_PINS, [bAddr, mmioEn, pre.bus[6]]));
  const [crtSel, kbSel, dskSel, tmrSel, devWe] = hw.mmioSim.getOutputBusValues();
  if (bsExec.unstable || mmExec.unstable) unstable = true;

  const kPre0 = pre.bus[7];
  let rdata = romEn ? board.bootRom[bAddr & 0x0f] : board.ram[bAddr];
  if (mmioEn && kPre0) {
    if (crtSel) rdata = board.crtText.length & 0xff;
    else if (kbSel) rdata = board.kbQueue.length > 0 ? board.kbQueue[0] : 0;
    else if (dskSel) rdata = board.disk[board.diskPtr & 0xff];
    else if (tmrSel) rdata = tmrCnt;
    else if (bAddr === MMIO_PORTS.MMU_BASE) rdata = base;
    else if (bAddr === MMIO_PORTS.MMU_LIMIT) rdata = limit;
    else if (bAddr === MMIO_PORTS.SP_REG) rdata = pre.bus[4];
    else if (bAddr === MMIO_PORTS.EPC_REG) rdata = pre.bus[5];
    else if (bAddr === MMIO_PORTS.DISK_PTR) rdata = board.diskPtr & 0xff;
    else if (bAddr === MMIO_PORTS.TRAP_CAUSE) rdata = board.trapCause & 0xff;
  }

  const spLd = mmioEn && kPre0 && devWe && bAddr === MMIO_PORTS.SP_REG ? 1 : 0;

  // Re-settle CPU combinational paths with live rdata & spLd before rising clock edge
  pre = evalCpu(hw, op, reg, imm, rdata, base, limit, 0, spLd, 0, 0);
  const [, paPre, wdataPre, , , , memWePre, kPre, trapPre, haltPre] = pre.bus;
  if (pre.unstable) unstable = true;

  // Rising clock edge CLK: 0 -> 1 -> 0!
  const rise = evalCpu(hw, op, reg, imm, rdata, base, limit, 0, spLd, 0, 1);
  const fall = evalCpu(hw, op, reg, imm, rdata, base, limit, 0, 0, 0, 0);
  if (rise.unstable || fall.unstable) unstable = true;

  // Classify trap event (if any fired on this instruction!)
  let trapEvent = null;
  let blockedAttack = false;
  const dec = probeArk8OsInstructionDecode(hw, part);
  if (trapPre) {
    if (op === 14) {
      trapEvent = 'SYSCALL';
      board.trapCause = TRAP_CAUSE.SYSCALL;
    } else if (kPre === 0 && (dec.priv || (mmioEn && dec.memOp))) {
      // Check whether MMU also faulted (e.g. User STOR [0xF0] exceeds LIMIT)
      trapEvent = dec.priv ? 'PRIV_FAULT' : 'MMU_FAULT';
      board.trapCause = dec.priv ? TRAP_CAUSE.PRIV_FAULT : TRAP_CAUSE.MMU_FAULT;
      blockedAttack = Boolean(dec.memWe || dec.priv);
    } else {
      trapEvent = 'MMU_FAULT';
      board.trapCause = TRAP_CAUSE.MMU_FAULT;
      blockedAttack = Boolean(dec.memWe);
    }
  }

  // Synchronous Unified RAM & MMIO Peripheral Writes (STRICTLY gated by memWePre && !trapPre!)
  let crtAppended = '';
  let memWrite = null;
  let reloadedTimer = false;
  if (memWePre && !trapPre) {
    if (ramWe) {
      board.ram[bAddr] = wdataPre & 0xff;
      memWrite = { addr: bAddr, val: wdataPre & 0xff, region: 'RAM' };
    } else if (mmioEn && kPre && devWe) {
      memWrite = { addr: bAddr, val: wdataPre & 0xff, region: 'MMIO' };
      if (crtSel) {
        const ch = wdataPre === 10 ? '\n' : wdataPre >= 32 && wdataPre <= 126 ? String.fromCharCode(wdataPre) : '?';
        board.crtText += ch;
        crtAppended = ch;
      } else if (dskSel) {
        board.disk[board.diskPtr & 0xff] = wdataPre & 0xff;
        board.diskPtr = (board.diskPtr + 1) & 0xff;
      } else if (tmrSel) {
        board.tmrPeriod = wdataPre & 0xff;
        const tr = clockTimer(hw.tmrSim, board.tmrPeriod, 1, 0);
        if (tr.unstable) unstable = true;
        reloadedTimer = true;
      } else if (bAddr === MMIO_PORTS.MMU_BASE) {
        const br = clockReg8(hw.baseSim, wdataPre, 1, 0);
        if (br.unstable) unstable = true;
      } else if (bAddr === MMIO_PORTS.MMU_LIMIT) {
        const lr = clockReg8(hw.limitSim, wdataPre, 1, 0);
        if (lr.unstable) unstable = true;
      } else if (bAddr === MMIO_PORTS.DISK_PTR) {
        board.diskPtr = wdataPre & 0xff;
      }
    }
  }

  // MMIO Read side-effects (dequeue Keyboard / advance Disk pointer when Kernel reads)
  if (!trapPre && dec.wd1 && mmioEn && kPre) {
    if (kbSel && board.kbQueue.length > 0) board.kbQueue.shift();
    else if (dskSel) board.diskPtr = (board.diskPtr + 1) & 0xff;
  }

  // Tick hardware countdown Timer on every executed cycle (unless just reloaded!)
  if (!reloadedTimer) {
    const tr = clockTimer(hw.tmrSim, board.tmrPeriod, 0, 0);
    if (tr.unstable) unstable = true;
  }

  const after = probeArk8OsMachineState(hw, board);
  const jumped =
    Boolean(trapEvent) ||
    op === 11 ||
    op === 9 ||
    op === 15 ||
    (op === 3 && after.pc !== ((pcBefore + 1) & 0xff));

  return {
    halted: false,
    haltFlag: Boolean(haltPre),
    stepIdx,
    kind: 'EXEC',
    pcBefore,
    pcAfter: after.pc,
    physFetchAddr: bAddrLo,
    paExec: paPre,
    part,
    dec,
    before,
    after,
    crtAppended,
    trapEvent,
    blockedAttack,
    memWrite,
    jumped,
    unstable,
  };
}

/**
 * Runs a full Chapter 4 OS-hardware stage program on live compiled MOSFET silicon.
 */
export function runArk8OsProgram(stage, slots = {}, customChips = {}, overrides = {}) {
  const spec = stage?.asmProgramSpec || {};
  const maxCycles = overrides.maxCycles ?? spec.maxCycles ?? 120;
  const hw = compileArk8OsHardware(customChips);
  const rowMap = buildArk8OsRowMap(stage, slots);

  const initialRam = overrides.initialRam ?? spec.initialRam ?? null;
  const userProgram = overrides.userProgram ?? spec.userProgram ?? null;
  const initialDisk = overrides.initialDisk ?? spec.initialDisk ?? null;
  const initialKeys = overrides.initialKeys ?? spec.initialKeys ?? null;

  const { board, state: init } = resetArk8OsHardware(hw, {
    rowMap,
    initialRam,
    userProgram,
    initialDisk,
    initialKeys,
  });

  const trace = [];
  let state = init;
  let haltedNormally = false;
  let unstable = false;

  const stats = {
    cycles: 0,
    irqCount: 0,
    syscallCount: 0,
    faultCount: 0,
    blockedAttacks: 0,
    minSp: init.sp,
    enteredUserMode: false,
    usedCall: false,
    usedRet: false,
    usedLdr: false,
    usedStr: false,
    usedPush: false,
    usedPop: false,
    usedIret: false,
  };

  for (let c = 0; c < maxCycles; c++) {
    const st = stepArk8OsHardwareCycle(hw, board, c);
    if (st.unstable) unstable = true;
    trace.push(st);
    state = st.after;
    stats.cycles = c + 1;
    if (st.after.sp < stats.minSp) stats.minSp = st.after.sp;
    if (st.after.kMode === 0 || st.before.kMode === 0) stats.enteredUserMode = true;
    if (st.trapEvent === 'IRQ') stats.irqCount++;
    else if (st.trapEvent === 'SYSCALL') stats.syscallCount++;
    else if (st.trapEvent === 'MMU_FAULT' || st.trapEvent === 'PRIV_FAULT') stats.faultCount++;
    if (st.blockedAttack) stats.blockedAttacks++;

    const op = st.part?.op;
    if (op === 'CALL') stats.usedCall = true;
    else if (op === 'RET') stats.usedRet = true;
    else if (op === 'LDR') stats.usedLdr = true;
    else if (op === 'STR') stats.usedStr = true;
    else if (op === 'PUSH') stats.usedPush = true;
    else if (op === 'POP') stats.usedPop = true;
    else if (op === 'IRET') stats.usedIret = true;

    if (st.haltFlag) {
      haltedNormally = true;
      break;
    }
    if (unstable) break;
  }

  return {
    hw,
    board,
    init,
    final: state,
    trace,
    stats,
    haltedNormally,
    unstable,
  };
}

function stringToRamBytes(baseAddr, str) {
  const map = {};
  for (let i = 0; i < str.length; i++) {
    map[(baseAddr + i) & 0xff] = str.charCodeAt(i) & 0xff;
  }
  map[(baseAddr + str.length) & 0xff] = 0; // null terminator
  return map;
}

/**
 * Evaluates Chapter 4 OS-hardware stages (`stage_53` ARK5_CRT & `stage_54` GUARD_TRAP)
 * including dynamic anti-cheat generalization checks on live compiled MOSFET silicon!
 */
export function evaluateArk8OsStage(stage, slots = {}, customChips = {}) {
  const spec = stage?.asmProgramSpec;
  if (!spec) {
    return { passed: false, message: 'ARK8-OS プログラム仕様が見つかりません。', trace: [] };
  }

  const rowMap = buildArk8OsRowMap(stage, slots);
  const editablePlaced = (spec.rows || []).filter((r) => !r.locked && rowMap.get(r.addr)?.part).length;
  if (editablePlaced === 0) {
    return { passed: false, message: 'まず命令を書き込んでからテスト実行してください。', trace: [] };
  }

  let run;
  try {
    run = runArk8OsProgram(stage, slots, customChips);
  } catch (err) {
    return { passed: false, message: `実機ハードウェアエラー: ${err?.message || err}`, trace: [] };
  }

  if (run.unstable) {
    return { passed: false, message: 'ARK8_OS_HW または周辺回路で発振を検出しました。', run, trace: run.trace };
  }

  // Stage 53: ARK5_CRT — Real CALL/RET + LDR [Rs] + STOR [0xF0] Text CRT decoder
  if (stage.id === 'stage_53') {
    const targetText = spec.targetCrt || 'ARK5:SOS';
    const altText = spec.altCrt || 'HI,ARK7!';
    const strBase = spec.stringBaseAddr ?? 0x60;

    if (run.final.crtText !== targetText) {
      return {
        passed: false,
        message: `文字CRT出力が「${run.final.crtText || '(空)'}」です（目標:「${targetText}」）。CALL でサブルーチンを呼び、LDR [R1] で 0x60(96番地) から1文字ずつ読んで 0xF0(240番地) へ STOR しよう！`,
        run,
        trace: run.trace,
      };
    }
    if (!run.haltedNormally) {
      return {
        passed: false,
        message: 'CRT出力は一致しましたが、RET で戻ったあとに HALT で安全停止していません！',
        run,
        trace: run.trace,
      };
    }
    if (!run.stats.usedCall || !run.stats.usedRet || run.stats.minSp >= 240) {
      return {
        passed: false,
        message: 'サブルーチン未使用です！ CALL と RET で本物のスタック（SP: 240→239→240）を使って文字出力ルーチンを呼び出そう！',
        run,
        trace: run.trace,
      };
    }
    if (!run.stats.usedLdr) {
      return {
        passed: false,
        message: '直書きショートカットは不可！ LDR Rd, [Rs] の間接アドレッシングでメモリ上の文字列を読み取ろう！',
        run,
        trace: run.trace,
      };
    }

    // Anti-cheat generalization test with alternate string at 0x60!
    const run2 = runArk8OsProgram(stage, slots, customChips, {
      initialRam: stringToRamBytes(strBase, altText),
    });
    if (run2.unstable || run2.final.crtText !== altText || !run2.haltedNormally) {
      return {
        passed: false,
        message: `別電文テスト（「${altText}」）でのCRT出力が「${run2.final.crtText || '(空)'}」になりました。固定文字ではなく [0x60] 番地から NULL(0) まで汎用ループで読み出そう！`,
        run,
        trace: run.trace,
      };
    }

    return {
      passed: true,
      message: `受信成功！！実機 ARK8_OS_HW（MOSFET ${run.hw.siliconStats.swCount}個）が CALL/RET（SP最小 ${run.stats.minSp}）と LDR [Rs] で「${targetText}」と別電文「${altText}」の両方を文字CRTへ完全復号しました！`,
      run,
      trace: run.trace,
    };
  }

  // Stage 54: GUARD_TRAP (Chapter 4 Finale) — User Sandbox + SYSCALL + TMR_IRQ + MMU_FAULT Isolation!
  if (stage.id === 'stage_54') {
    const targetText = spec.targetCrt || 'A5!';
    const altText = spec.altCrt || 'OK!';

    if (run.final.crtText.includes('X')) {
      return {
        passed: false,
        message: `危険！ユーザーモードの不正文字「X」がCRTへ漏洩しました（出力:「${run.final.crtText}」）。MMU と PRIV_CTRL の保護を確認してください！`,
        run,
        trace: run.trace,
      };
    }
    if (!run.stats.enteredUserMode) {
      return {
        passed: false,
        message: 'ユーザーモード（K=0）へ遷移していません！ IRET を使ってサンドボックスを起動しよう！',
        run,
        trace: run.trace,
      };
    }
    if (run.stats.syscallCount < 2 || run.final.regs[2] !== 2) {
      return {
        passed: false,
        message: `0x08 SYSCALL ハンドラの処理回数が不足しています（R2=${run.final.regs[2]} / 目標 2）。8番地で STOR R1, [240] ➔ ADDI R2, 1 ➔ IRET を組もう！`,
        run,
        trace: run.trace,
      };
    }
    if (run.stats.irqCount < 1 || run.final.regs[3] < 1) {
      return {
        passed: false,
        message: `0x04 タイマーIRQハンドラのカウントが確認できません（IRQ=${run.stats.irqCount}, R3=${run.final.regs[3]}）。4番地で ADDI R3, 1 ➔ IRET を組もう！`,
        run,
        trace: run.trace,
      };
    }
    if (run.stats.faultCount < 1) {
      return {
        passed: false,
        message: 'MMU_FAULT（0x0C）トラップが発火していません！ ユーザープロセスの不正アクセスを保護回路で捕捉しよう！',
        run,
        trace: run.trace,
      };
    }
    if (run.final.crtText !== targetText || !run.haltedNormally || run.final.kMode !== 1) {
      return {
        passed: false,
        message: `CRT出力が「${run.final.crtText || '(空)'}」（目標:「${targetText}」）、またはカーネル安全停止（HALT）に達していません。12番地(0x0C FAULT)で LDI R0, 33('!') ➔ STOR R0, [240] ➔ HALT を組もう！`,
        run,
        trace: run.trace,
      };
    }

    // Anti-cheat generalization test with alternate User Sandbox ('O', 'K', rogue 'Z' -> expects "OK!")
    const altUserProgram = spec.altUserProgram || {
      baseAddr: 0x40,
      instructions: [
        { op: 'LDI', rd: 1, rs: 0, imm: 79 },    // 'O'
        { op: 'SYSCALL', rd: 0, rs: 0, imm: 1 },
        { op: 'LDI', rd: 1, rs: 0, imm: 75 },    // 'K'
        { op: 'SYSCALL', rd: 0, rs: 0, imm: 1 },
        { op: 'LDI', rd: 0, rs: 0, imm: 90 },    // 'Z' (rogue attack!)
        { op: 'STOR', rd: 0, rs: 0, imm: 0xf0 }, // ILLEGAL MMIO -> MMU_FAULT!
        { op: 'HALT', rd: 0, rs: 0, imm: 0 },
      ],
    };
    const run2 = runArk8OsProgram(stage, slots, customChips, { userProgram: altUserProgram });
    if (
      run2.unstable ||
      run2.final.crtText !== altText ||
      run2.final.crtText.includes('Z') ||
      run2.stats.syscallCount < 2 ||
      run2.stats.irqCount < 1 ||
      run2.stats.faultCount < 1 ||
      !run2.haltedNormally
    ) {
      return {
        passed: false,
        message: `別サンドボックス検証（「${altText}」）に失敗しました（出力:「${run2.final.crtText || '(空)'}」）。SYSCALL では固定文字ではなく R1 を CRT[240] へ出力しよう！`,
        run,
        trace: run.trace,
      };
    }

    return {
      passed: true,
      message: `第四章完全制覇！！実機 ARK8_OS_HW（MOSFET ${run.hw.siliconStats.swCount}個＋ボード計 ${run.hw.siliconStats.boardSwCount}個）が SYSCALL(×${run.stats.syscallCount})・タイマーIRQ(×${run.stats.irqCount})・MMU保護遮断(「X」「Z」完全ブロック) を実機上で証明しました！`,
      run,
      trace: run.trace,
    };
  }

  return { passed: true, message: 'ARK8-OS ハードウェア検証完了！', run, trace: run.trace };
}
