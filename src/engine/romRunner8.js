/**
 * SILICON GENESIS — Chapter 3 ARK-8 Hardware-Backed 16-Bit ROM/RAM Assembly Runner
 *
 * Executes Chapter 3 assembly programs (STAGE 41–42) strictly through the player's
 * own compiled physical silicon:
 *   - `ASM_ENC8` (Stage 38): encodes 8 command keys -> `[OP0, OP1, OP2, KEY]`
 *   - `ASM_ENC`  (Stage 22): encodes 4 register keys (`R0..R3`) -> `[R0, R1, KEY]`
 *   - Gate-level 16-word × 16-bit Mask ROM built from player's `DEC_2TO4`, `AND`, `OR`
 *   - Unmodified `ARK8_SYS` (Stage 40) flattened all the way down to Stage 00-C
 *     player MOSFETs (`SW`) + Pull-up Resistors (`PULL`)!
 *
 * Non-destructive JTAG-style probing reads live `R0..R3` and `SRAM[0..15]` directly
 * from the compiled MOSFET netlist while `CLK = 0` — zero JS shadow registers or RAM!
 */

import { createEmptyCircuit, connectWire, computeCircuitMetrics, packBusVector } from './circuit.js';
import { compileCircuit } from './simulator.js';
import { provisionStandardChips } from './blueprints.js';
import { bitsToNum, numToBits } from './romRunner.js';

export const ARK8_OPCODES = {
  LDI: {
    op: 'LDI',
    bits: '000',
    opCode: 0,
    shortJa: '代入',
    english: 'Load Immediate',
    usesRd: true,
    usesRs: false,
    usesImm: true,
    immMax: 255,
    color: '#b87424',
    accent: '#ffd166',
    wireHint: 'WD=IMM, REG_WE=1（即値をRdへ代入）',
  },
  ADD: {
    op: 'ADD',
    bits: '001',
    opCode: 1,
    shortJa: '足す',
    english: 'Add Registers',
    usesRd: true,
    usesRs: true,
    usesImm: false,
    immMax: 0,
    color: '#2b7a5b',
    accent: '#5ce0a8',
    wireHint: 'ALU(A+B), REG_WE=1（Rd ← Rd + Rs）',
  },
  SUB: {
    op: 'SUB',
    bits: '010',
    opCode: 2,
    shortJa: '引く',
    english: 'Subtract Registers',
    usesRd: true,
    usesRs: true,
    usesImm: false,
    immMax: 0,
    color: '#a8423b',
    accent: '#ff8a7a',
    wireHint: 'SUB=1, REG_WE=1（Rd ← Rd - Rs）',
  },
  JNZ: {
    op: 'JNZ',
    bits: '011',
    opCode: 3,
    shortJa: '≠0飛ぶ',
    english: 'Jump if Not Zero',
    usesRd: true,
    usesRs: false,
    usesImm: true,
    immMax: 15,
    color: '#6e459c',
    accent: '#c89bff',
    wireHint: 'BR=1, REG_WE=0（Rd≠0ならIMM番地へ飛ぶ）',
  },
  LOAD: {
    op: 'LOAD',
    bits: '100',
    opCode: 4,
    shortJa: '読込',
    english: 'Load from SRAM',
    usesRd: true,
    usesRs: false,
    usesImm: true,
    immMax: 15,
    color: '#226b80',
    accent: '#56ccf2',
    wireHint: 'WD=MEM, REG_WE=1（Rd ← RAM[addr]）',
  },
  STOR: {
    op: 'STOR',
    bits: '101',
    opCode: 5,
    shortJa: '書込',
    english: 'Store to SRAM',
    usesRd: false,
    usesRs: true,
    usesImm: true,
    immMax: 15,
    color: '#287a4e',
    accent: '#52e3b6',
    wireHint: 'MEM_WE=1, REG_WE=0（RAM[addr] ← Rs）',
  },
  ADDI: {
    op: 'ADDI',
    bits: '110',
    opCode: 6,
    shortJa: '即加算',
    english: 'Add Immediate',
    usesRd: true,
    usesRs: false,
    usesImm: true,
    immMax: 255,
    color: '#8c6520',
    accent: '#ffb347',
    wireHint: 'ALU_B=IMM, REG_WE=1（Rd ← Rd + imm）',
  },
  HALT: {
    op: 'HALT',
    bits: '111',
    opCode: 7,
    shortJa: '停止',
    english: 'Halt CPU',
    usesRd: false,
    usesRs: false,
    usesImm: false,
    immMax: 0,
    color: '#5a3a4a',
    accent: '#f093b0',
    wireHint: 'HALT=1（PC停止・実行完了）',
  },
};

const ARK8_PIN_LABELS = ['OP0', 'OP1', 'OP2', 'RD0', 'RD1', 'RS0', 'RS1', 'IMM[7:0]', 'RST', 'CLK'];

function packArk8Input(op0, op1, op2, rd, rs, imm, rst, clk) {
  return packBusVector(ARK8_PIN_LABELS, [
    op0 ? 1 : 0,
    op1 ? 1 : 0,
    op2 ? 1 : 0,
    rd & 1,
    (rd >> 1) & 1,
    rs & 1,
    (rs >> 1) & 1,
    imm & 0xff,
    rst ? 1 : 0,
    clk ? 1 : 0,
  ]);
}

function fmtBin(val, width) {
  return (val & ((1 << width) - 1)).toString(2).padStart(width, '0');
}

export function makeArk8Instruction(opRaw, rdRaw = 0, rsRaw = 0, immRaw = 0) {
  const op = String(opRaw || '').trim().toUpperCase();
  const def = ARK8_OPCODES[op];
  if (!def) return null;
  const rd = Math.max(0, Math.min(3, Math.trunc(Number(rdRaw) || 0)));
  const rs = Math.max(0, Math.min(3, Math.trunc(Number(rsRaw) || 0)));
  const imm = Math.max(0, Math.min(255, Math.trunc(Number(immRaw) || 0)));

  let name = op;
  let comment = '';
  let rule = '';
  if (op === 'LDI') {
    name = `LDI R${rd}, ${imm}`;
    comment = `R${rd} ← ${imm}`;
    rule = `R${rd} に ${imm} をセット`;
  } else if (op === 'ADD') {
    name = `ADD R${rd}, R${rs}`;
    comment = `R${rd} ← R${rd} + R${rs}`;
    rule = `R${rd} に R${rs} を足して R${rd} へ保存`;
  } else if (op === 'SUB') {
    name = `SUB R${rd}, R${rs}`;
    comment = `R${rd} ← R${rd} − R${rs}`;
    rule = `R${rd} から R${rs} を引いて R${rd} へ保存`;
  } else if (op === 'JNZ') {
    name = `JNZ R${rd}, ${imm & 0x0f}`;
    comment = `R${rd}≠0なら ${imm & 0x0f}番地へ`;
    rule = `R${rd} ≠ 0 なら ${imm & 0x0f}番地へジャンプ`;
  } else if (op === 'LOAD') {
    name = `LOAD R${rd}, [${imm & 0x0f}]`;
    comment = `R${rd} ← RAM[${imm & 0x0f}]`;
    rule = `SRAM ${imm & 0x0f}番地から R${rd} へ読み込み`;
  } else if (op === 'STOR') {
    name = `STOR R${rs}, [${imm & 0x0f}]`;
    comment = `RAM[${imm & 0x0f}] ← R${rs}`;
    rule = `R${rs} の値を SRAM ${imm & 0x0f}番地へ書き込み`;
  } else if (op === 'ADDI') {
    name = `ADDI R${rd}, ${imm}`;
    comment = `R${rd} ← R${rd} + ${imm}`;
    rule = `R${rd} に即値 ${imm} を加算`;
  } else if (op === 'HALT') {
    name = 'HALT';
    comment = 'CPU停止（完了）';
    rule = 'HALT=1でPCを停止し計算終了';
  }

  const cleanImm = op === 'JNZ' || op === 'LOAD' || op === 'STOR' ? imm & 0x0f : op === 'ADD' || op === 'SUB' || op === 'HALT' ? 0 : imm;
  const cleanRd = def.usesRd ? rd : 0;
  const cleanRs = def.usesRs ? rs : 0;
  const id = `A8_${op}_${cleanRd}_${cleanRs}_${cleanImm}`;
  const word16 = ((def.opCode & 7) << 12) | (cleanRd << 10) | (cleanRs << 8) | cleanImm;

  return {
    id,
    name,
    op,
    rd: cleanRd,
    rs: cleanRs,
    imm: cleanImm,
    val: cleanImm,
    word16,
    hex16: `0x${word16.toString(16).toUpperCase().padStart(4, '0')}`,
    opcodeBits: `0${def.bits}`,
    rdBits: fmtBin(cleanRd, 2),
    rsBits: fmtBin(cleanRs, 2),
    immBits: fmtBin(cleanImm, 8),
    color: def.color,
    accent: def.accent,
    comment,
    rule,
  };
}

function parseRegToken(tok) {
  const m = String(tok || '').trim().match(/^R([0-3])$/i);
  return m ? Number(m[1]) : NaN;
}

function parseNumToken(tok) {
  const s = String(tok || '').trim().replace(/^\[(.+)\]$/, '$1');
  if (/^0b[01]+$/i.test(s)) return parseInt(s.slice(2), 2);
  if (/^0x[0-9a-f]+$/i.test(s)) return parseInt(s.slice(2), 16);
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  return NaN;
}

export function parseArk8AssemblyLine(rawLine) {
  const withoutComment = String(rawLine ?? '')
    .replace(/;.*$/, '')
    .replace(/\/\/.*$/, '')
    .trim();
  if (!withoutComment) return { ok: true, empty: true, part: null };

  const body = withoutComment
    .replace(/^\[?\d+番地\]?\s*:?\s*/, '')
    .replace(/^(?:0x)?[0-9a-f]+\s*:\s*/i, '')
    .trim();
  if (!body) return { ok: true, empty: true, part: null };

  const tokens = body.split(/[\s,]+/).filter(Boolean);
  const op = tokens[0].toUpperCase();
  const def = ARK8_OPCODES[op];
  if (!def) {
    return {
      ok: false,
      error: `不明な命令「${tokens[0]}」（LDI / ADD / SUB / JNZ / LOAD / STOR / ADDI / HALT）`,
    };
  }

  if (op === 'HALT') {
    return { ok: true, empty: false, part: makeArk8Instruction('HALT', 0, 0, 0) };
  }

  if (tokens.length < 3) {
    return {
      ok: false,
      error: `「${op}」には2つの引数が必要です（例: ${op === 'STOR' ? 'STOR R0, [2]' : op === 'ADD' || op === 'SUB' ? `${op} R0, R1` : `${op} R0, 5`}）`,
    };
  }

  if (op === 'ADD' || op === 'SUB') {
    const rd = parseRegToken(tokens[1]);
    const rs = parseRegToken(tokens[2]);
    if (!Number.isInteger(rd) || !Number.isInteger(rs)) {
      return { ok: false, error: `${op} は R0〜R3 を指定してください（例: ${op} R0, R1）` };
    }
    return { ok: true, empty: false, part: makeArk8Instruction(op, rd, rs, 0) };
  }

  if (op === 'STOR') {
    const rs = parseRegToken(tokens[1]);
    const addr = parseNumToken(tokens[2]);
    if (!Number.isInteger(rs)) {
      return { ok: false, error: 'STOR の第1引数は R0〜R3 にしてください（例: STOR R0, [2]）' };
    }
    if (!Number.isInteger(addr) || addr < 0 || addr > 15) {
      return { ok: false, error: 'SRAM番地は 0〜15（[0]〜[15]）にしてください' };
    }
    return { ok: true, empty: false, part: makeArk8Instruction('STOR', 0, rs, addr) };
  }

  // LDI / ADDI / JNZ / LOAD: Rd, imm/addr
  const rd = parseRegToken(tokens[1]);
  const imm = parseNumToken(tokens[2]);
  if (!Number.isInteger(rd)) {
    return { ok: false, error: `${op} の第1引数は R0〜R3 にしてください` };
  }
  const maxVal = def.immMax;
  if (!Number.isInteger(imm) || imm < 0 || imm > maxVal) {
    return { ok: false, error: `${op} の数値は 0〜${maxVal} にしてください` };
  }
  return { ok: true, empty: false, part: makeArk8Instruction(op, rd, 0, imm) };
}

export function resolveArk8Slot(slotVal) {
  if (!slotVal) return null;
  if (typeof slotVal === 'object' && slotVal.op) {
    return makeArk8Instruction(slotVal.op, slotVal.rd, slotVal.rs, slotVal.imm ?? slotVal.val);
  }
  if (typeof slotVal === 'string') {
    const m = slotVal.trim().match(/^A8_(LDI|ADD|SUB|JNZ|LOAD|STOR|ADDI|HALT)_(\d+)_(\d+)_(\d+)$/i);
    if (m) {
      return makeArk8Instruction(m[1], Number(m[2]), Number(m[3]), Number(m[4]));
    }
    const parsed = parseArk8AssemblyLine(slotVal);
    if (parsed.ok && parsed.part) return parsed.part;
  }
  return null;
}

export function formatArk8ProgramText(stage, slots = {}) {
  const rows = stage?.asmProgramSpec?.rows || [];
  return rows
    .map((r) => {
      if (r.locked && r.fixedPart) {
        return `${r.addr}: ${r.fixedPart.name.padEnd(14, ' ')} ; [固定] ${r.label || ''}`.trimEnd();
      }
      const part = resolveArk8Slot(slots[r.slotId]);
      if (!part) return `${r.addr}: `;
      return `${r.addr}: ${part.name.padEnd(14, ' ')} ; ${part.comment}`;
    })
    .join('\n');
}

export function assembleArk8ProgramText(sourceText, stage) {
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
      stripped.match(/^\[?(\d+)番地\]?\s*:?\s*(.*)$/) || stripped.match(/^(\d+)\s*:\s*(.*)$/);
    if (explicitAddr) {
      targetAddr = Number(explicitAddr[1]);
      if (!explicitAddr[2].trim()) return;
    }

    const row = rows.find((r) => r.addr === targetAddr);
    if (!row) {
      errors.push({
        line: lineIdx + 1,
        addr: targetAddr,
        message: `${lineIdx + 1}行目: ${targetAddr}番地は範囲外です（0〜${rows.length - 1}番地）`,
      });
      return;
    }
    if (row.locked) return;
    if (usedAddrs.has(row.addr)) {
      errors.push({ line: lineIdx + 1, addr: row.addr, message: `${row.addr}番地が重複しています` });
      return;
    }
    usedAddrs.add(row.addr);

    const parsed = parseArk8AssemblyLine(rawLine);
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

export function compileArk8Hardware(customChips = {}) {
  const workingChips = { ...customChips };
  if (
    !workingChips.ARK8_SYS ||
    !workingChips.ASM_ENC8 ||
    !workingChips.ASM_ENC ||
    !workingChips.DEC_2TO4 ||
    !workingChips.OR ||
    !workingChips.AND ||
    !workingChips.NAND
  ) {
    provisionStandardChips(workingChips, { includeChapter3Hardware: true, provisioned: true });
  }

  const ark8Def = workingChips.ARK8_SYS;
  if (!ark8Def?.circuit) {
    throw new Error('ARK8_SYS 回路が見つかりません（STAGE 40 を先にクリアしてください）');
  }

  const sim = compileCircuit(ark8Def.circuit, workingChips);
  const metrics = computeCircuitMetrics(ark8Def.circuit, workingChips);

  const compileSub = (id) => {
    if (!workingChips[id]?.circuit) return null;
    try {
      return compileCircuit(workingChips[id].circuit, workingChips);
    } catch {
      return null;
    }
  };

  const asmEnc8Sim = compileSub('ASM_ENC8');
  const regEncSim = compileSub('ASM_ENC'); // Reuses Stage 22 4->2 encoder for R0..R3!
  const instDec8Sim = compileSub('INST_DEC8');

  const asmEnc8NandCount = workingChips.ASM_ENC8?.circuit
    ? computeCircuitMetrics(workingChips.ASM_ENC8.circuit, workingChips).nandCount
    : 0;

  return {
    sim,
    asmEnc8Sim,
    regEncSim,
    instDec8Sim,
    metrics,
    asmEnc8NandCount,
    siliconStats: {
      nandCount: metrics.nandCount,
      swCount: sim.swCount || metrics.swCount,
      pullCount: sim.pullCount || metrics.pullCount,
      isPhysicalSilicon: Boolean(sim.isPhysicalSilicon),
    },
    workingChips,
  };
}

/**
 * Encodes an ARK-8 instruction through BOTH player-forged encoders:
 *   - `ASM_ENC8` (Stage 38): 8 command keys -> `[OP0, OP1, OP2, KEY]`
 *   - `ASM_ENC`  (Stage 22): 4 register keys (`R0..R3`) -> `[RD0, RD1]` & `[RS0, RS1]`
 */
export function encodeArk8InstructionPins(part, hw = null) {
  const opOrder = ['LDI', 'ADD', 'SUB', 'JNZ', 'LOAD', 'STOR', 'ADDI', 'HALT'];
  let op0 = 0;
  let op1 = 0;
  let op2 = 0;
  let keyFlag = 1;

  if (hw?.asmEnc8Sim) {
    const keyVec = opOrder.map((k) => (part.op === k ? 1 : 0));
    hw.asmEnc8Sim.reset();
    const out = hw.asmEnc8Sim.evaluate(keyVec).outputs;
    op0 = out[0] ? 1 : 0;
    op1 = out[1] ? 1 : 0;
    op2 = out[2] ? 1 : 0;
    keyFlag = out[3] ? 1 : 0;
  } else {
    const idx = opOrder.indexOf(part.op);
    if (idx < 0) keyFlag = 0;
    else {
      op0 = idx & 1;
      op1 = (idx >> 1) & 1;
      op2 = (idx >> 2) & 1;
    }
  }

  const encodeReg = (rIdx) => {
    if (hw?.regEncSim) {
      hw.regEncSim.reset();
      const out = hw.regEncSim.evaluate([rIdx === 0 ? 1 : 0, rIdx === 1 ? 1 : 0, rIdx === 2 ? 1 : 0, rIdx === 3 ? 1 : 0]).outputs;
      return [out[0] ? 1 : 0, out[1] ? 1 : 0];
    }
    return [rIdx & 1, (rIdx >> 1) & 1];
  };

  const [rd0, rd1] = encodeReg(part.rd ?? 0);
  const [rs0, rs1] = encodeReg(part.rs ?? 0);
  const imm = numToBits(part.imm ?? 0, 8);

  return {
    op0,
    op1,
    op2,
    rd0,
    rd1,
    rs0,
    rs1,
    imm,
    keyFlag,
    opcodeBits: `0${op2}${op1}${op0}`,
    rdBits: `${rd1}${rd0}`,
    rsBits: `${rs1}${rs0}`,
    immBits: `${imm[7]}${imm[6]}${imm[5]}${imm[4]}${imm[3]}${imm[2]}${imm[1]}${imm[0]}`,
  };
}

export function probeArk8InstructionDecode(hw, part) {
  if (!part) {
    return {
      op0: 0, op1: 0, op2: 0, rd0: 0, rd1: 0, rs0: 0, rs1: 0,
      imm: [0, 0, 0, 0, 0, 0, 0, 0],
      keyFlag: 0,
      sub: 0, aluB: 0, wd0: 0, wd1: 0, regWe: 0, memWe: 0, br: 0, halt: 0,
    };
  }
  const enc = encodeArk8InstructionPins(part, hw);
  let flags = [0, 0, 0, 0, 0, 0, 0, 0];
  if (hw?.instDec8Sim) {
    hw.instDec8Sim.reset();
    flags = hw.instDec8Sim.evaluate([enc.op0, enc.op1, enc.op2]).outputs;
  }
  return {
    ...enc,
    sub: flags[0] ? 1 : 0,
    aluB: flags[1] ? 1 : 0,
    wd0: flags[2] ? 1 : 0,
    wd1: flags[3] ? 1 : 0,
    regWe: flags[4] ? 1 : 0,
    memWe: flags[5] ? 1 : 0,
    br: flags[6] ? 1 : 0,
    halt: flags[7] ? 1 : 0,
  };
}

/**
 * Builds a real gate-level 16-word × 16-bit Mask ROM circuit from player's
 * `DEC_2TO4`, `AND`, and `OR` chips.
 * Outputs: `['OP0','OP1','OP2','RD0','RD1','RS0','RS1','IMM0'..'IMM7','VALID']` (16 bits).
 */
export function buildArk8RomCircuit(rowMap, hw) {
  let c = createEmptyCircuit(
    ['PC0', 'PC1', 'PC2', 'PC3'],
    ['OP0', 'OP1', 'OP2', 'RD0', 'RD1', 'RS0', 'RS1', 'IMM0', 'IMM1', 'IMM2', 'IMM3', 'IMM4', 'IMM5', 'IMM6', 'IMM7', 'VALID']
  );

  let nid = 1;
  let wid = 1;
  const addNode = (type) => {
    const id = `r8_${type}_${nid++}`;
    c.nodes.push({ id, type, x: 100, y: 100 });
    return id;
  };
  const wire = (from, to) => {
    c = connectWire(c, from, to, () => `r8w_${wid++}`);
  };

  const decLo = addNode('DEC_2TO4');
  const decHi = addNode('DEC_2TO4');
  wire({ kind: 'input', pin: 0 }, { kind: 'node', nodeId: decLo, pin: 0 });
  wire({ kind: 'input', pin: 1 }, { kind: 'node', nodeId: decLo, pin: 1 });
  wire({ kind: 'input', pin: 2 }, { kind: 'node', nodeId: decHi, pin: 0 });
  wire({ kind: 'input', pin: 3 }, { kind: 'node', nodeId: decHi, pin: 1 });

  const planes = Array.from({ length: 16 }, () => []);
  for (const [addr, entry] of rowMap.entries()) {
    if (!entry?.part || addr < 0 || addr > 15) continue;
    const enc = encodeArk8InstructionPins(entry.part, hw);
    const selAnd = addNode('AND');
    wire({ kind: 'node', nodeId: decLo, pin: addr & 3 }, { kind: 'node', nodeId: selAnd, pin: 0 });
    wire({ kind: 'node', nodeId: decHi, pin: (addr >> 2) & 3 }, { kind: 'node', nodeId: selAnd, pin: 1 });
    const selEp = { kind: 'node', nodeId: selAnd, pin: 0 };

    const bits = [
      enc.op0, enc.op1, enc.op2,
      enc.rd0, enc.rd1, enc.rs0, enc.rs1,
      ...enc.imm,
      enc.keyFlag,
    ];
    for (let b = 0; b < 16; b++) {
      if (bits[b]) planes[b].push(selEp);
    }
  }

  for (let b = 0; b < 16; b++) {
    let eps = planes[b];
    if (eps.length === 0) {
      const z = addNode('CONST_0');
      wire({ kind: 'node', nodeId: z, pin: 0 }, { kind: 'output', pin: b });
      continue;
    }
    while (eps.length > 1) {
      const next = [];
      for (let i = 0; i < eps.length; i += 2) {
        if (i + 1 < eps.length) {
          const orNode = addNode('OR');
          wire(eps[i], { kind: 'node', nodeId: orNode, pin: 0 });
          wire(eps[i + 1], { kind: 'node', nodeId: orNode, pin: 1 });
          next.push({ kind: 'node', nodeId: orNode, pin: 0 });
        } else {
          next.push(eps[i]);
        }
      }
      eps = next;
    }
    wire(eps[0], { kind: 'output', pin: b });
  }

  return c;
}

export function buildArk8RowMap(stage, slots = {}) {
  const rows = stage?.asmProgramSpec?.rows || [];
  const rowMap = new Map();
  for (const r of rows) {
    const part = r.locked && r.fixedPart ? r.fixedPart : resolveArk8Slot(slots[r.slotId]);
    rowMap.set(r.addr, { row: r, part });
  }
  return rowMap;
}

export function getArk8RomFuseMatrix(rowMap, hw = null) {
  const rows = [];
  let totalBurnedFuses = 0;
  let wordCount = 0;
  const sorted = Array.from(rowMap.entries()).sort((a, b) => a[0] - b[0]);
  for (const [addr, entry] of sorted) {
    const addrBits = addr.toString(2).padStart(4, '0');
    const part = entry?.part || null;
    if (!part) {
      rows.push({
        addr, addrBits, part: null,
        op2: 0, op1: 0, op0: 0, rd1: 0, rd0: 0, rs1: 0, rs0: 0,
        imm: [0, 0, 0, 0, 0, 0, 0, 0], valid: 0,
      });
      continue;
    }
    const enc = encodeArk8InstructionPins(part, hw);
    wordCount++;
    const bits = [enc.op2, enc.op1, enc.op0, enc.rd1, enc.rd0, enc.rs1, enc.rs0, ...enc.imm];
    for (const bit of bits) if (bit) totalBurnedFuses++;
    rows.push({
      addr, addrBits, part,
      op2: enc.op2, op1: enc.op1, op0: enc.op0,
      rd1: enc.rd1, rd0: enc.rd0, rs1: enc.rs1, rs0: enc.rs0,
      imm: enc.imm,
      valid: enc.keyFlag,
    });
  }
  return { rows, totalBurnedFuses, wordCount };
}

/**
 * Non-destructive JTAG boundary scan on `ARK8_SYS` while `CLK = 0`:
 * Reads `R0..R3` directly from `QA[7:0]` and `SRAM[0..15]` directly from `MEM[7:0]`
 * without altering any flip-flop state!
 */
export function probeArk8MachineState(hw) {
  const savedIn = hw.sim.getInputs();
  const regs = [0, 0, 0, 0];
  const ram = new Array(16).fill(0);

  for (let addr = 0; addr < 16; addr++) {
    const rIdx = addr < 4 ? addr : 0;
    const probeIn = packArk8Input(0, 0, 0, rIdx, 0, addr, 0, 0);
    const res = hw.sim.evaluate(probeIn);
    const bus = hw.sim.getOutputBusValues();
    if (addr < 4) regs[addr] = bus[0];
    ram[addr] = bus[1];
    if (res.unstable) break;
  }

  // Restore original CLK=0 inputs cleanly
  hw.sim.evaluate(savedIn);
  const outBus = hw.sim.getOutputBusValues();
  return {
    regs,
    ram,
    pc: outBus[2],
    z: outBus[3],
    halt: outBus[4],
  };
}

/**
 * Performs a real 1-cycle synchronous Hardware Reset (`RST = 1`, `CLK: 0 -> 1 -> 0`)
 * through the player's own `REG_8B` reset pins, plus optionally seeds initial SRAM
 * data using real `LDI R0, val` + `STOR R0, [addr]` hardware cycles before resetting `R0` & `PC`!
 */
export function resetArk8Hardware(hw, initialRam = null) {
  hw.sim.reset();

  // Hardware RST pulse: clears R0..R3 and PC to 0 simultaneously!
  hw.sim.evaluate(packArk8Input(0, 0, 0, 0, 0, 0, 1, 0));
  hw.sim.evaluate(packArk8Input(0, 0, 0, 0, 0, 0, 1, 1));
  hw.sim.evaluate(packArk8Input(0, 0, 0, 0, 0, 0, 0, 0));

  // Pre-load stage initial SRAM values via genuine hardware LDI + STOR cycles (zero JS memory hack!)
  if (initialRam && typeof initialRam === 'object') {
    for (const [addrStr, val] of Object.entries(initialRam)) {
      const addr = Number(addrStr) & 0x0f;
      const v = Number(val) & 0xff;
      // LDI R0, v (OP=000)
      hw.sim.evaluate(packArk8Input(0, 0, 0, 0, 0, v, 0, 0));
      hw.sim.evaluate(packArk8Input(0, 0, 0, 0, 0, v, 0, 1));
      hw.sim.evaluate(packArk8Input(0, 0, 0, 0, 0, v, 0, 0));
      // STOR R0, [addr] (OP=101 -> op0=1, op1=0, op2=1)
      hw.sim.evaluate(packArk8Input(1, 0, 1, 0, 0, addr, 0, 0));
      hw.sim.evaluate(packArk8Input(1, 0, 1, 0, 0, addr, 0, 1));
      hw.sim.evaluate(packArk8Input(1, 0, 1, 0, 0, addr, 0, 0));
    }
    // Final Hardware RST pulse so R0..R3 = 0 and PC = 0 while SRAM retains loaded data!
    hw.sim.evaluate(packArk8Input(0, 0, 0, 0, 0, 0, 1, 0));
    hw.sim.evaluate(packArk8Input(0, 0, 0, 0, 0, 0, 1, 1));
    hw.sim.evaluate(packArk8Input(0, 0, 0, 0, 0, 0, 0, 0));
  }

  return probeArk8MachineState(hw);
}

export function stepArk8HardwareCycle(hw, rowMap, stepIdx = 0, romSim = null) {
  const before = probeArk8MachineState(hw);
  const pcBefore = before.pc;
  const pcBits = numToBits(pcBefore & 0x0f, 4);

  const activeRomSim = romSim || compileCircuit(buildArk8RomCircuit(rowMap, hw), hw.workingChips);
  activeRomSim.reset();
  const romRes = activeRomSim.evaluate(pcBits);
  const ro = romRes.outputs;
  const valid = ro[15] ? 1 : 0;

  if (!valid || pcBefore > 15) {
    return { halted: true, reason: 'empty', before, after: before, unstable: Boolean(romRes.unstable) };
  }

  const op0 = ro[0] ? 1 : 0;
  const op1 = ro[1] ? 1 : 0;
  const op2 = ro[2] ? 1 : 0;
  const rd = (ro[3] ? 1 : 0) | ((ro[4] ? 1 : 0) << 1);
  const rs = (ro[5] ? 1 : 0) | ((ro[6] ? 1 : 0) << 1);
  const imm = bitsToNum(ro, 7, 8);
  const opNames = ['LDI', 'ADD', 'SUB', 'JNZ', 'LOAD', 'STOR', 'ADDI', 'HALT'];
  const opIdx = op0 | (op1 << 1) | (op2 << 2);
  const entry = rowMap.get(pcBefore);
  const part = entry?.part || makeArk8Instruction(opNames[opIdx], rd, rs, imm);

  // Drive compiled ARK8_SYS hardware with exact ROM output wires: CLK 0 -> 1 -> 0
  hw.sim.evaluate(packArk8Input(op0, op1, op2, rd, rs, imm, 0, 0));
  const resRise = hw.sim.evaluate(packArk8Input(op0, op1, op2, rd, rs, imm, 0, 1));
  const resFall = hw.sim.evaluate(packArk8Input(op0, op1, op2, rd, rs, imm, 0, 0));
  const unstable = Boolean(romRes.unstable || resRise.unstable || resFall.unstable);

  const after = probeArk8MachineState(hw);
  const dec = probeArk8InstructionDecode(hw, part);
  const jumped = part.op === 'JNZ' && after.pc !== ((pcBefore + 1) & 0xff);

  return {
    halted: false,
    haltFlag: after.halt === 1 || part.op === 'HALT',
    stepIdx,
    pcBefore,
    pcAfter: after.pc,
    part,
    dec,
    before,
    after,
    jumped,
    unstable,
  };
}

export function runArk8Program(stage, slots = {}, customChips = {}, maxCycles = 48) {
  const hw = compileArk8Hardware(customChips);
  const initialRam = stage?.asmProgramSpec?.initialRam || null;
  const init = resetArk8Hardware(hw, initialRam);
  const rowMap = buildArk8RowMap(stage, slots);
  const romCircuit = buildArk8RomCircuit(rowMap, hw);
  const romSim = compileCircuit(romCircuit, hw.workingChips);

  const trace = [];
  let state = init;
  let haltedNormally = false;
  let unstable = false;

  for (let c = 0; c < maxCycles; c++) {
    const st = stepArk8HardwareCycle(hw, rowMap, c, romSim);
    if (st.unstable) unstable = true;
    if (st.halted) {
      haltedNormally = true;
      break;
    }
    trace.push(st);
    state = st.after;
    if (st.haltFlag) {
      haltedNormally = true;
      break;
    }
    if (unstable) break;
  }

  return {
    hw,
    romCircuit,
    romMetrics: computeCircuitMetrics(romCircuit, hw.workingChips),
    init,
    final: state,
    trace,
    haltedNormally,
    unstable,
  };
}

export function evaluateArk8Stage(stage, slots = {}, customChips = {}) {
  const spec = stage?.asmProgramSpec;
  if (!spec) {
    return { passed: false, message: 'ARK-8 プログラム仕様が見つかりません。', trace: [] };
  }

  // Ensure at least one instruction is placed
  const rows = spec.rows || [];
  const rowMap = buildArk8RowMap(stage, slots);
  const placedCount = Array.from(rowMap.values()).filter((e) => e.part).length;
  if (placedCount === 0) {
    return { passed: false, message: 'まず命令を書き込んでからテスト実行してください。', trace: [] };
  }

  const run = runArk8Program(stage, slots, customChips, spec.maxCycles || 48);
  if (run.unstable) {
    return { passed: false, message: 'ARK8_SYS または ROM 回路で発振を検出しました。', run, trace: run.trace };
  }

  // Stage 41: Microgrid Power Surplus (RAM[0]=180 solar, RAM[1]=115 load -> compute RAM[2]=65 surplus)
  if (stage.id === 'stage_41') {
    const usedLoad = run.trace.some((t) => t.part.op === 'LOAD');
    const usedSub = run.trace.some((t) => t.part.op === 'SUB');
    const usedStor = run.trace.some((t) => t.part.op === 'STOR');
    const actualVal = run.final.ram[2];
    if (actualVal !== 65) {
      return {
        passed: false,
        message: `RAM[2]（余剰電力）が ${actualVal} です（目標: 65 = 180 − 115）。RAM[0]とRAM[1]を LOAD し、SUB で引いて RAM[2] へ STOR しよう！`,
        run,
        trace: run.trace,
      };
    }
    if (!usedLoad || !usedSub || !usedStor) {
      return {
        passed: false,
        message: '直書きショートカットは不可！RAM[0]とRAM[1]から LOAD ➔ SUB ➔ RAM[2] へ STOR する本物の計算手順で組もう！',
        run,
        trace: run.trace,
      };
    }
    // Also verify dynamic generality with a second SRAM input test (RAM[0]=210, RAM[1]=90 -> RAM[2]=120)!
    const run2 = runArk8Program(
      { ...stage, asmProgramSpec: { ...spec, initialRam: { 0: 210, 1: 90 } } },
      slots,
      customChips,
      spec.maxCycles || 48
    );
    if (run2.final.ram[2] !== 120) {
      return {
        passed: false,
        message: `別データ検証 (210 − 90) で RAM[2]=${run2.final.ram[2]} になりました（期待値 120）。定数 65 ではなく RAM[0]−RAM[1] を計算しよう！`,
        run,
        trace: run.trace,
      };
    }
    return {
      passed: true,
      message: `完璧！実機 ARK8_SYS（MOSFET ${run.hw.siliconStats.swCount}個）が 180−115=65 と別データ 210−90=120 の両方で RAM[2] へ正確に記録しました！`,
      run,
      trace: run.trace,
    };
  }

  // Stage 42: True General Loop Multiplication via SRAM (RAM[0] * RAM[1] -> RAM[2])
  // Primary test: 22 × 11 = 242 (total survivors of ARK-7 118 + ARK-3 124 = 242!)
  // Secondary dynamic test: 15 × 6 = 90 (proves genuine general algorithm, zero hardcoding!)
  if (stage.id === 'stage_42') {
    const backwardJumps = run.trace.filter((t) => t.part.op === 'JNZ' && t.pcAfter < t.pcBefore).length;
    const usedLoad = run.trace.some((t) => t.part.op === 'LOAD');
    const usedStor = run.trace.some((t) => t.part.op === 'STOR');
    const actualVal = run.final.ram[2];
    if (actualVal !== 242) {
      return {
        passed: false,
        message: `RAM[2]（総配給数）が ${actualVal} です（目標: 242 = RAM[0](22) × RAM[1](11)）。ループで足し込んで RAM[2] へ保存しよう！`,
        run,
        trace: run.trace,
      };
    }
    if (!usedLoad || !usedStor || backwardJumps < 2) {
      return {
        passed: false,
        message: '直書きショートカットは不可！RAM[0]・RAM[1] を LOAD し、JNZ ループで汎用乗算して RAM[2] へ STOR しよう！',
        run,
        trace: run.trace,
      };
    }
    const run2 = runArk8Program(
      { ...stage, asmProgramSpec: { ...spec, initialRam: { 0: 15, 1: 6 } } },
      slots,
      customChips,
      64
    );
    if (run2.final.ram[2] !== 90) {
      return {
        passed: false,
        message: `汎用アルゴリズム検証 (15 × 6) で RAM[2]=${run2.final.ram[2]} になりました（期待値 90）。固定値ではなく RAM[0]×RAM[1] のループ乗算にしよう！`,
        run,
        trace: run.trace,
      };
    }
    return {
      passed: true,
      message: `第三章完全制覇！！実機 ARK8_SYS（MOSFET ${run.hw.siliconStats.swCount}個）が 22×11=242 と 15×6=90 の汎用ループ乗算を RAM 上で完全実行しました！`,
      run,
      trace: run.trace,
    };
  }

  return { passed: true, message: 'ARK-8 プログラム検証完了！', run, trace: run.trace };
}
