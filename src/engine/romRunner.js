/**
 * SILICON GENESIS — Pure Physical-Silicon ROM Assembly Runner & Spec Evaluator
 *
 * Compiles the player's actual unmodified 7-pin `ARK4_SYS` circuit (and every
 * lower-level custom chip down to Stage 00-C's `SW` MOSFETs and `PULL` resistors!),
 * along with their `ASM_ENC` (Stage 22) and `DEC_2TO4`/`AND`/`OR` gate-level Mask
 * ROM matrix (Stage 23), and executes Stages 24–26 assembly programs directly
 * through physical gate-level simulation.
 *
 * Zero hidden external hardware, zero arithmetic or PC updates in JavaScript:
 * on every clock cycle, `[I0, I1, IMM0, IMM1, IMM2, IMM3, CLK]` are fed straight
 * into the unmodified 7-pin `ARK4_SYS` netlist, clocked `0 -> 1 -> 0`, and
 * `[ACC0..3, PC0..3]` are read directly from the simulated outputs.
 */

import { createEmptyCircuit, connectWire, computeCircuitMetrics } from './circuit.js';
import { compileCircuit } from './simulator.js';
import { provisionStandardChips } from './blueprints.js';

export function bitsToNum(arr, start = 0, len = 4) {
  let n = 0;
  for (let i = 0; i < len; i++) {
    if (arr[start + i]) n |= 1 << i;
  }
  return n;
}

export function numToBits(num, len = 4) {
  const out = [];
  for (let i = 0; i < len; i++) {
    out.push((num >> i) & 1);
  }
  return out;
}

/**
 * Compiles the player's unmodified 7-pin `ARK4_SYS`, `ASM_ENC` (Stage 22),
 * `INST_DEC`, `ZERO_4BIT`, and all dependent custom chips down to Stage 00-C
 * physical MOSFET (`SW`) + pull-up resistor (`PULL`) primitives.
 */
export function compileRomHardware(customChips = {}) {
  // Clone chip map and provision any missing dependencies without overwriting player chips
  const workingChips = { ...customChips };
  if (
    !workingChips.NAND ||
    !workingChips.ARK4_SYS ||
    !workingChips.ASM_ENC ||
    !workingChips.DEC_2TO4 ||
    !workingChips.OR ||
    !workingChips.AND
  ) {
    provisionStandardChips(workingChips, { includeChapter2Hardware: true, provisioned: true });
  }

  const ark4SysDef = workingChips.ARK4_SYS;
  if (!ark4SysDef || !ark4SysDef.circuit) {
    throw new Error('ARK4_SYS 回路が見つかりません（STAGE 21 を先にクリアしてください）');
  }

  const sim = compileCircuit(ark4SysDef.circuit, workingChips);
  const metrics = computeCircuitMetrics(ark4SysDef.circuit, workingChips);

  let asmEncSim = null;
  let asmEncNandCount = 0;
  if (workingChips.ASM_ENC?.circuit) {
    try {
      asmEncSim = compileCircuit(workingChips.ASM_ENC.circuit, workingChips);
      asmEncNandCount = computeCircuitMetrics(workingChips.ASM_ENC.circuit, workingChips).nandCount;
    } catch {
      asmEncSim = null;
    }
  }

  let rom4wNandCount = 0;
  if (workingChips.ROM_4W?.circuit) {
    try {
      rom4wNandCount = computeCircuitMetrics(workingChips.ROM_4W.circuit, workingChips).nandCount;
    } catch {
      rom4wNandCount = 0;
    }
  }

  let instDecSim = null;
  if (workingChips.INST_DEC?.circuit) {
    try {
      instDecSim = compileCircuit(workingChips.INST_DEC.circuit, workingChips);
    } catch {
      instDecSim = null;
    }
  }

  let zeroSim = null;
  if (workingChips.ZERO_4BIT?.circuit) {
    try {
      zeroSim = compileCircuit(workingChips.ZERO_4BIT.circuit, workingChips);
    } catch {
      zeroSim = null;
    }
  }

  const siliconStats = {
    nandCount: metrics.nandCount,
    swCount: sim.swCount,
    pullCount: sim.pullCount,
    isPhysicalSilicon: sim.isPhysicalSilicon,
  };

  return {
    sim,
    asmEncSim,
    instDecSim,
    zeroSim,
    metrics,
    asmEncNandCount,
    rom4wNandCount,
    workingChips,
    siliconStats,
  };
}

/**
 * Pure 3-cycle Hardware Power-On Reset (POR) through the unmodified 7-pin
 * `ARK4_SYS` circuit using 4-bit adder wrap-around (`15 + 1 = 0`):
 *   1. `LDI 1`  (`[0,0, 1,0,0,0, clk]`) -> `ACC = 1` (`Z = 0`)
 *   2. `JNZ 15` (`[1,1, 1,1,1,1, clk]`) -> `PC = 15` (`Z = 0` triggers branch!)
 *   3. `LDI 0`  (`[0,0, 0,0,0,0, clk]`) -> `ACC = 0` AND `PC_4BIT` wraps `15 + 1 = 0`!
 * Leaves the hardware cleanly initialized at `ACC = 0 (0000), PC = 0 (0000)`.
 */
export function resetRomHardware(hw) {
  hw.sim.reset();
  let unstable = false;

  const pulse = (i0, i1, imm0, imm1, imm2, imm3) => {
    const r0 = hw.sim.evaluate([i0, i1, imm0, imm1, imm2, imm3, 0]);
    const r1 = hw.sim.evaluate([i0, i1, imm0, imm1, imm2, imm3, 1]);
    const r2 = hw.sim.evaluate([i0, i1, imm0, imm1, imm2, imm3, 0]);
    if (r0.unstable || r1.unstable || r2.unstable) unstable = true;
    return r2;
  };

  // POR Cycle 1: LDI 1 -> ACC=1 (Z=0)
  pulse(0, 0, 1, 0, 0, 0);
  // POR Cycle 2: JNZ 15 -> PC=15 (branch fires since ACC=1 != 0)
  pulse(1, 1, 1, 1, 1, 1);
  // POR Cycle 3: LDI 0 -> ACC=0 and 4-bit PC wraps 15 + 1 = 0
  const res = pulse(0, 0, 0, 0, 0, 0);

  const outs = res.outputs;
  const acc = bitsToNum(outs, 0, 4);
  const pc = bitsToNum(outs, 4, 4);
  let z = acc === 0 ? 1 : 0;
  if (hw.zeroSim) {
    hw.zeroSim.reset();
    const zRes = hw.zeroSim.evaluate(outs.slice(0, 4));
    z = zRes.outputs[0] ? 1 : 0;
  }

  return {
    acc,
    pc,
    z,
    unstable,
  };
}

export const ARK4_OPCODES = {
  LDI: {
    op: 'LDI',
    bits: '00',
    i1: 0,
    i0: 0,
    shortJa: '代入',
    english: 'Load Immediate',
    color: '#b87424',
    accent: '#ffd166',
    wireHint: 'SET=1, WE=1（数値をそのままACCへ保存）',
  },
  ADD: {
    op: 'ADD',
    bits: '01',
    i1: 0,
    i0: 1,
    shortJa: '足す',
    english: 'Add',
    color: '#2b7a5b',
    accent: '#5ce0a8',
    wireHint: 'OP=0, WE=1（今のACCに数値を足して保存）',
  },
  SUB: {
    op: 'SUB',
    bits: '10',
    i1: 1,
    i0: 0,
    shortJa: '引く',
    english: 'Subtract',
    color: '#a8423b',
    accent: '#ff8a7a',
    wireHint: 'OP=1, WE=1（今のACCから数値を引いて保存）',
  },
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

export function makeInstructionPart(opRaw, valRaw) {
  const op = String(opRaw || '').trim().toUpperCase();
  const def = ARK4_OPCODES[op];
  if (!def) return null;
  const val = Number.isFinite(Number(valRaw)) ? Math.max(0, Math.min(15, Math.trunc(Number(valRaw)))) : 0;
  const imm = numToBits(val, 4);
  const immBits = `${imm[3]}${imm[2]}${imm[1]}${imm[0]}`;

  let meta = '';
  let comment = '';
  let rule = '';
  if (op === 'LDI') {
    meta = `代入 (←${val})`;
    comment = `ACC ← ${val}`;
    rule = `ACC に ${val}（${immBits}）をそのままセット`;
  } else if (op === 'ADD') {
    meta = `足す (+${val})`;
    comment = `ACC ← ACC + ${val}`;
    rule = `今の ACC に +${val} を足して保存`;
  } else if (op === 'SUB') {
    meta = `引く (−${val})`;
    comment = `ACC ← ACC − ${val}`;
    rule = `今の ACC から ${val} を引いて保存`;
  } else if (op === 'JNZ') {
    meta = `≠0なら${val}番へ`;
    comment = `Z=0なら ${val}番地へ`;
    rule = `ACC≠0 (Z=0) なら ${val}番地へジャンプ`;
  }

  return {
    id: `ASM_${op}_${val}`,
    name: `${op} ${val}`,
    op,
    val,
    opcodeBits: def.bits,
    immBits,
    color: def.color,
    accent: def.accent,
    meta,
    comment,
    rule,
  };
}

function parseNumericLiteral(token) {
  const s = String(token || '').trim();
  if (/^0b[01]+$/i.test(s)) return parseInt(s.slice(2), 2);
  if (/^0x[0-9a-f]+$/i.test(s)) return parseInt(s.slice(2), 16);
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  return NaN;
}

/**
 * Parses a single line of ARK-4 assembly text, e.g.:
 *   "LDI 5", "1: SUB 1 ; decrement", "JNZ 0b0001", "LDI 0xF"
 */
export function parseAssemblyLine(rawLine) {
  const withoutComment = String(rawLine ?? '')
    .replace(/;.*$/, '')
    .replace(/\/\/.*$/, '')
    .trim();
  if (!withoutComment) {
    return { ok: true, empty: true, part: null };
  }

  // Strip optional leading address label like "0:" or "0x0:" or "[0番地]"
  const body = withoutComment
    .replace(/^\[?\d+番地\]?\s*:?\s*/, '')
    .replace(/^(?:0x)?[0-9a-f]+\s*:\s*/i, '')
    .trim();
  if (!body) {
    return { ok: true, empty: true, part: null };
  }

  const tokens = body.split(/[\s,]+/).filter(Boolean);
  const op = tokens[0].toUpperCase();
  const allowed = ['LDI', 'ADD', 'SUB', 'JNZ'];
  if (!allowed.includes(op)) {
    return {
      ok: false,
      error: `不明な命令「${tokens[0]}」（使える命令: LDI / ADD / SUB / JNZ）`,
    };
  }
  if (tokens.length < 2) {
    return {
      ok: false,
      error: `「${op}」のあとに 0〜15 の数値が必要です（例: ${op} 3）`,
    };
  }
  if (tokens.length > 2) {
    return {
      ok: false,
      error: `余分な文字「${tokens.slice(2).join(' ')}」があります（形式: ${op} 数値）`,
    };
  }

  const val = parseNumericLiteral(tokens[1]);
  if (!Number.isInteger(val) || val < 0 || val > 15) {
    return {
      ok: false,
      error: `数値「${tokens[1]}」は 0〜15 の整数にしてください（4ビット幅: 0000〜1111）`,
    };
  }

  return {
    ok: true,
    empty: false,
    op,
    val,
    part: makeInstructionPart(op, val),
  };
}

/**
 * Resolves any slot value format ('ASM_LDI_5', '{ op, val }', or text 'LDI 5')
 * into a canonical instruction part object.
 */
export function resolveSlotInstruction(slotVal, stage = null) {
  if (!slotVal) return null;

  if (typeof slotVal === 'object' && slotVal.op) {
    return makeInstructionPart(slotVal.op, slotVal.val);
  }

  if (typeof slotVal === 'string') {
    const trimmed = slotVal.trim();
    if (!trimmed) return null;

    // 1. Pre-defined stage card ID (e.g. 'ASM_LDI_5')
    if (stage?.physicsParts) {
      const legacy = stage.physicsParts.find((p) => p.id === trimmed);
      if (legacy && ARK4_OPCODES[String(legacy.op || '').toUpperCase()]) {
        const canonical = makeInstructionPart(legacy.op, legacy.val);
        return canonical ? { ...canonical, ...legacy, comment: canonical.comment } : null;
      }
    }

    // 2. Canonical ID 'ASM_OP_VAL'
    const idMatch = trimmed.match(/^ASM_(LDI|ADD|SUB|JNZ)_(\d+)$/i);
    if (idMatch) {
      return makeInstructionPart(idMatch[1], Number(idMatch[2]));
    }

    // 3. Raw assembly syntax 'LDI 5'
    const parsed = parseAssemblyLine(trimmed);
    if (parsed.ok && parsed.part) {
      return parsed.part;
    }
  }

  return null;
}

/**
 * Formats the stage's current ROM slots as a clean multi-line ARK-4 assembly listing.
 */
export function formatProgramText(stage, slots = {}) {
  const rows = stage?.asmProgramSpec?.rows || [];
  return rows
    .map((r) => {
      if (r.locked) {
        const fp = r.fixedPart;
        return `${r.addr}: ${fp.name.padEnd(6, ' ')} ; [固定回路] ${r.label || fp.rule || ''}`.trimEnd();
      }
      const part = resolveSlotInstruction(slots[r.slotId], stage);
      if (!part) {
        return `${r.addr}: `;
      }
      return `${r.addr}: ${part.name.padEnd(6, ' ')} ; ${part.comment}`;
    })
    .join('\n');
}

/**
 * Assembles multi-line raw ARK-4 assembly source text into stage ROM slots.
 * Each line corresponds to ROM address 0..N-1 (or explicit "N: ..." prefix).
 */
export function assembleProgramText(sourceText, stage) {
  const rows = stage?.asmProgramSpec?.rows || [];
  const rawLines = String(sourceText ?? '').split(/\r?\n/);
  const nextSlots = {};
  const errors = [];

  for (const r of rows) {
    if (!r.locked) nextSlots[r.slotId] = null;
  }

  // Map lines to ROM addresses (supports explicit "2: JNZ 1" or positional line index)
  const usedAddrs = new Set();
  rawLines.forEach((rawLine, lineIdx) => {
    const stripped = rawLine.replace(/;.*$/, '').replace(/\/\/.*$/, '').trim();
    if (!stripped) return;

    let targetAddr = lineIdx;
    const explicitAddr = stripped.match(/^\[?(\d+)番地\]?\s*:?\s*(.*)$/) || stripped.match(/^(\d+)\s*:\s*(.*)$/);
    if (explicitAddr) {
      targetAddr = Number(explicitAddr[1]);
      if (!explicitAddr[2].trim()) return;
    }

    const row = rows.find((r) => r.addr === targetAddr);
    if (!row) {
      errors.push({
        line: lineIdx + 1,
        addr: targetAddr,
        message: `${lineIdx + 1}行目: ${targetAddr}番地はこのステージのROM範囲外です（0〜${rows.length - 1}番地）`,
      });
      return;
    }

    if (row.locked) {
      // Allow the locked instruction line to remain untouched in text mode
      const parsedLocked = parseAssemblyLine(rawLine);
      if (
        !parsedLocked.ok ||
        (parsedLocked.part &&
          (parsedLocked.part.op !== row.fixedPart.op || parsedLocked.part.val !== row.fixedPart.val))
      ) {
        errors.push({
          line: lineIdx + 1,
          addr: row.addr,
          message: `${row.addr}番地はハードウェア固定命令（${row.fixedPart.name}）のため変更できません`,
        });
      }
      return;
    }

    if (usedAddrs.has(row.addr)) {
      errors.push({
        line: lineIdx + 1,
        addr: row.addr,
        message: `${row.addr}番地が重複して書かれています`,
      });
      return;
    }
    usedAddrs.add(row.addr);

    const parsed = parseAssemblyLine(rawLine);
    if (!parsed.ok) {
      errors.push({
        line: lineIdx + 1,
        addr: row.addr,
        message: `${row.addr}番地: ${parsed.error}`,
      });
      return;
    }
    if (parsed.part) {
      nextSlots[row.slotId] = parsed.part.id;
    }
  });

  return {
    ok: errors.length === 0,
    slots: nextSlots,
    errors,
  };
}

/**
 * Probes the player's own compiled ASM_ENC + INST_DEC circuits to show live
 * key-encoding (LDI/ADD/SUB/JNZ -> I1, I0, KEY) and control wires (OP, SET, WE, BR)
 * for any instruction being edited or executed.
 */
export function probeInstructionDecode(hw, part) {
  if (!part) {
    return {
      i0: 0,
      i1: 0,
      imm: [0, 0, 0, 0],
      keyFlag: 0,
      opcodeBits: '00',
      immBits: '0000',
      opFlag: 0,
      setFlag: 0,
      weFlag: 0,
      brFlag: 0,
    };
  }
  const pins = encodeInstructionPins(part, hw);
  let opFlag = part.op === 'SUB' ? 1 : 0;
  let setFlag = part.op === 'LDI' ? 1 : 0;
  let weFlag = part.op === 'JNZ' ? 0 : 1;
  let brFlag = part.op === 'JNZ' ? 1 : 0;
  if (hw?.instDecSim) {
    hw.instDecSim.reset();
    const decOut = hw.instDecSim.evaluate([pins.i0, pins.i1]).outputs;
    opFlag = decOut[0] ? 1 : 0;
    setFlag = decOut[1] ? 1 : 0;
    weFlag = decOut[2] ? 1 : 0;
    brFlag = decOut[3] ? 1 : 0;
  }
  return {
    ...pins,
    opFlag,
    setFlag,
    weFlag,
    brFlag,
  };
}

/**
 * Encodes an assembly instruction's command key (`LDI` / `ADD` / `SUB` / `JNZ`)
 * into `[I0, I1, KEY]` through the player's compiled `ASM_ENC` circuit (Stage 22)
 * when `hw` is provided, and converts the 4-bit immediate into `[IMM0..3]`.
 *
 * - `LDI` -> key `[1,0,0,0]` -> `ASM_ENC` -> `I0=0, I1=0, KEY=1`
 * - `ADD` -> key `[0,1,0,0]` -> `ASM_ENC` -> `I0=1, I1=0, KEY=1`
 * - `SUB` -> key `[0,0,1,0]` -> `ASM_ENC` -> `I0=0, I1=1, KEY=1`
 * - `JNZ` -> key `[0,0,0,1]` -> `ASM_ENC` -> `I0=1, I1=1, KEY=1`
 */
export function encodeInstructionPins(part, hw = null) {
  let i0 = 0;
  let i1 = 0;
  let keyFlag = 1;

  if (hw?.asmEncSim) {
    const keyVec = [
      part.op === 'LDI' ? 1 : 0,
      part.op === 'ADD' ? 1 : 0,
      part.op === 'SUB' ? 1 : 0,
      part.op === 'JNZ' ? 1 : 0,
    ];
    hw.asmEncSim.reset();
    const encOut = hw.asmEncSim.evaluate(keyVec).outputs;
    i0 = encOut[0] ? 1 : 0;
    i1 = encOut[1] ? 1 : 0;
    keyFlag = encOut[2] ? 1 : 0;
  } else {
    if (part.op === 'LDI') {
      i0 = 0;
      i1 = 0;
    } else if (part.op === 'ADD') {
      i0 = 1;
      i1 = 0;
    } else if (part.op === 'SUB') {
      i0 = 0;
      i1 = 1;
    } else if (part.op === 'JNZ') {
      i0 = 1;
      i1 = 1;
    } else {
      keyFlag = 0;
    }
  }

  const imm = numToBits(part.val ?? 0, 4);
  const opcodeBits = `${i1}${i0}`;
  const immBits = `${imm[3]}${imm[2]}${imm[1]}${imm[0]}`;

  return {
    i0,
    i1,
    imm,
    keyFlag,
    opcodeBits,
    immBits,
  };
}

/**
 * Builds a real gate-level 16-address × 7-bit Program ROM circuit out of the
 * player's own `DEC_2TO4`, `AND`, and `OR` chips (extending Stage 23 `ROM_4W`'s
 * exact `DEC2_4 + OR-plane` architecture to 4-bit PC addresses 0..15).
 *
 * Inputs:  `['PC0', 'PC1', 'PC2', 'PC3']`
 * Outputs: `['I0', 'I1', 'IMM0', 'IMM1', 'IMM2', 'IMM3', 'VALID']`
 */
export function buildProgrammableRomCircuit(rowMap, hw) {
  let c = createEmptyCircuit(
    ['PC0', 'PC1', 'PC2', 'PC3'],
    ['I0', 'I1', 'IMM0', 'IMM1', 'IMM2', 'IMM3', 'VALID']
  );

  let nid = 1;
  let wid = 1;
  const addNode = (type) => {
    const id = `rom_${type}_${nid++}`;
    c.nodes.push({ id, type, x: 100, y: 100 });
    return id;
  };
  const wire = (from, to) => {
    c = connectWire(c, from, to, () => `rom_w_${wid++}`);
  };

  // 2-level address decoder using the player's own DEC_2TO4 chips!
  const decLo = addNode('DEC_2TO4');
  const decHi = addNode('DEC_2TO4');
  wire({ kind: 'input', pin: 0 }, { kind: 'node', nodeId: decLo, pin: 0 });
  wire({ kind: 'input', pin: 1 }, { kind: 'node', nodeId: decLo, pin: 1 });
  wire({ kind: 'input', pin: 2 }, { kind: 'node', nodeId: decHi, pin: 0 });
  wire({ kind: 'input', pin: 3 }, { kind: 'node', nodeId: decHi, pin: 1 });

  // Collect active row-select endpoints for each of the 7 output planes
  const planes = Array.from({ length: 7 }, () => []);

  const entries = rowMap instanceof Map ? Array.from(rowMap.entries()) : [];
  for (const [addr, entry] of entries) {
    if (!entry?.part || addr < 0 || addr > 15) continue;
    const encoded = encodeInstructionPins(entry.part, hw);

    // Row select line: AND(decLo[addr & 3], decHi[(addr >> 2) & 3])
    const selAnd = addNode('AND');
    wire({ kind: 'node', nodeId: decLo, pin: addr & 3 }, { kind: 'node', nodeId: selAnd, pin: 0 });
    wire({ kind: 'node', nodeId: decHi, pin: (addr >> 2) & 3 }, { kind: 'node', nodeId: selAnd, pin: 1 });
    const selEp = { kind: 'node', nodeId: selAnd, pin: 0 };

    const wordBits = [
      encoded.i0,
      encoded.i1,
      encoded.imm[0],
      encoded.imm[1],
      encoded.imm[2],
      encoded.imm[3],
      encoded.keyFlag, // VALID = 1 only when player's ASM_ENC asserts KEY=1!
    ];
    for (let bitIdx = 0; bitIdx < 7; bitIdx++) {
      if (wordBits[bitIdx]) planes[bitIdx].push(selEp);
    }
  }

  // Fold each bit plane with a tree of the player's own OR gates (exact ROM_4W OR-plane!)
  for (let bitIdx = 0; bitIdx < 7; bitIdx++) {
    let eps = planes[bitIdx];
    if (eps.length === 0) {
      const z = addNode('CONST_0');
      wire({ kind: 'node', nodeId: z, pin: 0 }, { kind: 'output', pin: bitIdx });
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
    wire(eps[0], { kind: 'output', pin: bitIdx });
  }

  return c;
}

/**
 * Computes the physical Mask ROM fuse-burn matrix for visualization and Verilog
 * export by running every word through `encodeInstructionPins(part, hw)` so the
 * burned fuse pattern reflects the player's real `ASM_ENC` circuit.
 */
export function getRomFuseMatrix(rowMap, hw = null) {
  const entries = [];
  if (rowMap instanceof Map) {
    for (const [addr, entry] of rowMap.entries()) {
      entries.push({ addr, part: entry?.part || null });
    }
  } else if (Array.isArray(rowMap)) {
    for (const item of rowMap) {
      if (item && Number.isInteger(item.addr)) {
        entries.push({ addr: item.addr, part: item.part || null });
      }
    }
  }
  entries.sort((a, b) => a.addr - b.addr);

  let totalBurnedFuses = 0;
  let wordCount = 0;
  const rows = entries.map(({ addr, part }) => {
    const ab = numToBits(addr, 4);
    const addrBits = `${ab[3]}${ab[2]}${ab[1]}${ab[0]}`;
    if (!part) {
      return {
        addr,
        addrBits,
        part: null,
        i1: 0,
        i0: 0,
        imm: [0, 0, 0, 0],
        valid: 0,
      };
    }
    const enc = encodeInstructionPins(part, hw);
    const valid = enc.keyFlag ? 1 : 0;
    if (valid) {
      wordCount += 1;
      totalBurnedFuses +=
        (enc.i1 ? 1 : 0) +
        (enc.i0 ? 1 : 0) +
        (enc.imm[0] ? 1 : 0) +
        (enc.imm[1] ? 1 : 0) +
        (enc.imm[2] ? 1 : 0) +
        (enc.imm[3] ? 1 : 0);
    }
    return {
      addr,
      addrBits,
      part,
      i1: enc.i1,
      i0: enc.i0,
      imm: [...enc.imm],
      valid,
    };
  });

  return {
    rows,
    totalBurnedFuses,
    wordCount,
  };
}

export function buildRomRowMap(stage, slots = {}) {
  const rows = stage?.asmProgramSpec?.rows || [];
  const rowMap = new Map();
  for (const r of rows) {
    const part = r.locked
      ? r.fixedPart
      : resolveSlotInstruction(slots[r.slotId], stage);
    rowMap.set(r.addr, { row: r, part });
  }
  return rowMap;
}

/**
 * Executes a single clock cycle on the unmodified 7-pin `ARK4_SYS` hardware by
 * reading `[I0, I1, IMM0..3, VALID]` directly from the compiled gate-level ROM
 * matrix (`DEC_2TO4` + `AND` + `OR` + `ASM_ENC`) at the current hardware `PC`.
 */
export function stepRomHardwareCycle(hw, rowMap, stepIdx = 0, romSim = null) {
  const outsBefore = hw.sim.getOutputs();
  const accBefore = bitsToNum(outsBefore, 0, 4);
  const pcBitsBefore = outsBefore.slice(4, 8);
  const pcBefore = bitsToNum(outsBefore, 4, 4);

  let zBefore = accBefore === 0 ? 1 : 0;
  if (hw.zeroSim) {
    hw.zeroSim.reset();
    zBefore = hw.zeroSim.evaluate(outsBefore.slice(0, 4)).outputs[0] ? 1 : 0;
  }

  const activeRomSim = romSim || compileCircuit(buildProgrammableRomCircuit(rowMap, hw), hw.workingChips);
  activeRomSim.reset();
  const romRes = activeRomSim.evaluate(pcBitsBefore);
  const romOut = romRes.outputs;
  const valid = romOut[6] ? 1 : 0;

  if (!valid) {
    return {
      halted: true,
      accBefore,
      pcBefore,
      zBefore,
      unstable: Boolean(romRes.unstable),
    };
  }

  const i0 = romOut[0] ? 1 : 0;
  const i1 = romOut[1] ? 1 : 0;
  const imm = [romOut[2] ? 1 : 0, romOut[3] ? 1 : 0, romOut[4] ? 1 : 0, romOut[5] ? 1 : 0];
  const opcodeBits = `${i1}${i0}`;
  const immBits = `${imm[3]}${imm[2]}${imm[1]}${imm[0]}`;

  const entry = rowMap.get(pcBefore);
  const part = entry?.part || makeInstructionPart(['LDI', 'ADD', 'SUB', 'JNZ'][(i1 << 1) | i0], bitsToNum(imm, 0, 4));

  // Probe the player's own INST_DEC for live monitor display
  let opFlag = i1 === 1 && i0 === 0 ? 1 : 0;
  let setFlag = i1 === 0 && i0 === 0 ? 1 : 0;
  let weFlag = i1 === 1 && i0 === 1 ? 0 : 1;
  let brFlag = i1 === 1 && i0 === 1 ? 1 : 0;
  if (hw.instDecSim) {
    hw.instDecSim.reset();
    const decOut = hw.instDecSim.evaluate([i0, i1]).outputs;
    opFlag = decOut[0] ? 1 : 0;
    setFlag = decOut[1] ? 1 : 0;
    weFlag = decOut[2] ? 1 : 0;
    brFlag = decOut[3] ? 1 : 0;
  }

  // Feed 7 ROM output pins + CLK (0 -> 1 -> 0) directly into unmodified 7-pin ARK4_SYS!
  const vecSetup = [i0, i1, imm[0], imm[1], imm[2], imm[3], 0];
  const vecRise = [i0, i1, imm[0], imm[1], imm[2], imm[3], 1];
  const vecHold = [i0, i1, imm[0], imm[1], imm[2], imm[3], 0];

  const resSetup = hw.sim.evaluate(vecSetup);
  const resRise = hw.sim.evaluate(vecRise);
  const resHold = hw.sim.evaluate(vecHold);

  const unstable = Boolean(romRes.unstable || resSetup.unstable || resRise.unstable || resHold.unstable);
  const outsAfter = resHold.outputs;
  const accAfter = bitsToNum(outsAfter, 0, 4);
  const pcAfter = bitsToNum(outsAfter, 4, 4);

  let zAfter = accAfter === 0 ? 1 : 0;
  if (hw.zeroSim) {
    hw.zeroSim.reset();
    zAfter = hw.zeroSim.evaluate(outsAfter.slice(0, 4)).outputs[0] ? 1 : 0;
  }

  const seqNextPc = (pcBefore + 1) & 15;
  const jmpFired = brFlag === 1 && (pcAfter !== seqNextPc || (zBefore === 0 && pcAfter === part.val));

  return {
    halted: false,
    stepIdx,
    pc: pcBefore,
    pcNext: pcAfter,
    accBefore,
    acc: accAfter,
    zBefore,
    z: zAfter,
    op: part.op,
    val: part.val,
    partId: part.id,
    opName: part.name,
    opcodeBits,
    immBits,
    setFlag,
    opFlag,
    weFlag,
    brFlag,
    jmpFired,
    unstable,
    label: `${pcBefore}番地 [${part.name}]：ACC ${accBefore}→${accAfter} (Z=${zAfter}) ／ 次PC=${pcAfter}番地`,
  };
}

/**
 * Runs a complete ROM assembly program on the player's compiled `ASM_ENC` +
 * gate-level `ROM` (`DEC_2TO4` + `AND` + `OR`) + unmodified 7-pin `ARK4_SYS`
 * physical silicon hardware and returns the full cycle-by-cycle hardware trace.
 */
export function runRomProgram(stage, slots = {}, customChips = {}, { maxCycles = 14 } = {}) {
  let hw;
  try {
    hw = compileRomHardware(customChips);
  } catch (err) {
    return {
      trace: [],
      initAcc: 0,
      initPc: 0,
      finalAcc: 0,
      finalPc: 0,
      unstable: false,
      hitMaxCycles: false,
      compileError: err.message,
      siliconStats: { nandCount: 0, swCount: 0, pullCount: 0, isPhysicalSilicon: false },
      metrics: { nandCount: 0, swCount: 0, pullCount: 0, nodeCount: 0, wireCount: 0, depth: 0 },
    };
  }

  const por = resetRomHardware(hw);
  const rowMap = buildRomRowMap(stage, slots);

  // Build & compile the live gate-level ROM matrix from the player's own DEC_2TO4, AND, OR, ASM_ENC!
  let romSim;
  try {
    const romCircuit = buildProgrammableRomCircuit(rowMap, hw);
    romSim = compileCircuit(romCircuit, hw.workingChips);
  } catch (err) {
    return {
      trace: [],
      initAcc: por.acc,
      initPc: por.pc,
      finalAcc: por.acc,
      finalPc: por.pc,
      unstable: por.unstable,
      hitMaxCycles: false,
      compileError: `ROM回路コンパイルエラー: ${err.message}`,
      siliconStats: hw.siliconStats,
      metrics: hw.metrics,
    };
  }

  const trace = [];
  let acc = por.acc;
  let pc = por.pc;
  let unstable = por.unstable;
  let hitMaxCycles = false;

  for (let step = 0; step < maxCycles; step++) {
    const cycle = stepRomHardwareCycle(hw, rowMap, step, romSim);
    if (cycle.halted) {
      acc = cycle.accBefore;
      pc = cycle.pcBefore;
      if (cycle.unstable) unstable = true;
      break;
    }
    trace.push(cycle);
    acc = cycle.acc;
    pc = cycle.pcNext;
    if (cycle.unstable) {
      unstable = true;
      break;
    }
    // Check via real gate-level ROM whether next hardware PC address has a valid instruction (output pin 6 = VALID)
    romSim.reset();
    const nextRomCheck = romSim.evaluate(numToBits(pc, 4));
    if (!nextRomCheck.outputs[6]) {
      break;
    }
    if (step === maxCycles - 1) {
      hitMaxCycles = true;
    }
  }

  return {
    trace,
    initAcc: por.acc,
    initPc: por.pc,
    finalAcc: acc,
    finalPc: pc,
    unstable,
    hitMaxCycles,
    compileError: null,
    siliconStats: hw.siliconStats,
    metrics: {
      nandCount: hw.metrics.nandCount,
      swCount: hw.siliconStats.swCount,
      pullCount: hw.siliconStats.pullCount,
      isPhysicalSilicon: hw.siliconStats.isPhysicalSilicon,
      nodeCount: (stage?.asmProgramSpec?.rows || []).length,
      wireCount: hw.metrics.wireCount,
      depth: hw.metrics.depth,
    },
  };
}

/**
 * Specification-based grading for Stages 24 (`stage_22`), 25 (`stage_23`), and 26 (`stage_24`).
 *
 * Grades whether the player's program & physical silicon hardware achieved the
 * mission specification (initial condition, anti-shortcut invariants during
 * execution, and completion goal).
 */
export function evaluateRomStage(stage, slots = {}, customChips = {}) {
  const spec = stage?.asmProgramSpec;
  const rows = spec?.rows || [];
  const editableRows = rows.filter((r) => !r.locked);
  const missing = editableRows.find((r) => !resolveSlotInstruction(slots[r.slotId], stage));
  if (missing) {
    return {
      passed: false,
      error: `まだ「${missing.addr}番地」が空欄です！ すべての番地にアセンブリ命令を書き込もう。`,
      results: [],
      trace: [],
      passedCount: 0,
      totalCount: editableRows.length,
      metrics: { nandCount: 0, swCount: 0, pullCount: 0, nodeCount: rows.length, wireCount: 0, depth: 0 },
    };
  }

  const run = runRomProgram(stage, slots, customChips, { maxCycles: 14 });
  if (run.compileError) {
    return {
      passed: false,
      error: `自作CPUコンパイルエラー: ${run.compileError}`,
      results: [],
      trace: [],
      passedCount: 0,
      totalCount: editableRows.length,
      metrics: run.metrics,
    };
  }

  const { trace, finalAcc, finalPc, unstable, hitMaxCycles } = run;

  let passed = false;
  let failureStepIdx = -1;
  let error = null;

  if (unstable) {
    passed = false;
    failureStepIdx = trace.findIndex((t) => t.unstable);
    error = '💥 自作チップの内部で信号の発振（無限ループ）が発生しました！ 下位モジュールの配線を確認してください。';
  } else if (trace.length === 0) {
    passed = false;
    error = '0番地から命令を実行できませんでした。自作CPU（COND_PC）や ASM_ENC の配線を確認してください。';
  } else if (stage.id === 'stage_22') {
    // Stage 24 (`stage_22`) Specification:
    // 1. 0番地で初期基準内圧 ACC=5 をセットすること
    // 2. 3命令以上実行し、1番地以降で LDI 上書きせず ADD と SUB の両方を使って計算すること
    //    （例: LDI 5 → ADD 7 → SUB 4 でも LDI 5 → SUB 4 → ADD 7 でも合格！）
    // 3. 完了時に最終気圧 ACC=8 かつ 次PC=3番地 に到達すること
    const step0 = trace[0];
    const laterSteps = trace.slice(1);
    const overwriteStep = laterSteps.find((t) => t.op === 'LDI');
    const hasAdd = laterSteps.some((t) => t.op === 'ADD');
    const hasSub = laterSteps.some((t) => t.op === 'SUB');

    if (hitMaxCycles) {
      passed = false;
      failureStepIdx = trace.length - 1;
      error = '⏱ 実行ステップ上限（14サイクル）に達しました！ 無限ループになっていないか確認してください。';
    } else if (!step0 || step0.pc !== 0 || step0.acc !== 5) {
      passed = false;
      failureStepIdx = 0;
      error = `0番地の条件違反：最初に基準内圧「5」をセット（ACC=5）する必要があります（実測: 0番地実行後の ACC=${step0?.acc ?? '?'}）。`;
    } else if (trace.length < 3) {
      passed = false;
      failureStepIdx = trace.length - 1;
      error = `2番地まで最後まで実行されませんでした（次PC=${finalPc}番地）。`;
    } else if (overwriteStep) {
      passed = false;
      failureStepIdx = overwriteStep.stepIdx;
      error = `${overwriteStep.pc}番地の条件違反：LDI で数値を直接上書きするのではなく、0番地の内圧 5 から ADD / SUB を使って 8 を計算してください！`;
    } else if (!hasAdd || !hasSub) {
      passed = false;
      failureStepIdx = Math.min(2, trace.length - 1);
      error = '1〜2番地の条件違反：コンプレッサー加圧（ADD）と外気差圧調整（SUB）の両方を使って最終気圧 8 を計算してください！';
    } else if (finalAcc !== 8 || finalPc !== 3) {
      passed = false;
      failureStepIdx = trace.length - 1;
      error = `2番地完了時の条件違反：最終気圧 ACC=8（次PC=3番地）になる必要がありますが、実測は ACC=${finalAcc}（次PC=${finalPc}番地）でした。`;
    } else {
      passed = true;
    }
  } else if (stage.id === 'stage_23') {
    // Stage 25 (`stage_23`) Specification:
    // 1. 0〜2番地の足し算（LDI + ADD + ADD）で油圧ジャッキ推力「3×4＝12」（2番地完了時 ACC=12）を合成すること
    //    （LDI 3 -> ADD 3 -> ADD 6 でも LDI 3 -> ADD 6 -> ADD 3 でも合格！ いきなり LDI 12 は不可）
    // 2. 3番地で目標推力 12 を SUB で引いて差圧 ACC=0 (Z=1) にすること（LDI 0 での誤魔化しは不可）
    // 3. 4番地の固定命令 JNZ 0 を Z=1（不発・通過！）で抜けて 5番地（承認）へ到達すること（finalAcc=0, finalPc=5）
    const step0 = trace[0];
    const step1 = trace[1];
    const step2 = trace[2];
    const step3 = trace[3];
    const step4 = trace[4];
    const nonAddStep = [step1, step2].find((t) => t && t.op !== 'ADD');

    if (!step0 || step0.acc === 0) {
      passed = false;
      failureStepIdx = 0;
      error = `0番地の条件違反：まず0番地でポンプ初期推力（LDI 3 など）をセットしてください（0番地実行後の ACC=${step0?.acc ?? '?'}）。`;
    } else if (step0.acc >= 12) {
      passed = false;
      failureStepIdx = 0;
      error = `0番地の条件違反：12 を直接代入するのではなく、ポンプ1基ぶんの推力（3 など）から ADD を重ねて 3×4=12 を合成しよう！`;
    } else if (nonAddStep) {
      passed = false;
      failureStepIdx = nonAddStep.stepIdx;
      error = `${nonAddStep.pc}番地の条件違反：0〜2番地では ADD（足し算）を重ねて推力 3×4=12 を合成してください（現在: ${nonAddStep.opName}）。`;
    } else if (!step2 || step2.pc !== 2 || step2.acc !== 12) {
      passed = false;
      failureStepIdx = Math.min(2, trace.length - 1);
      error = `2番地完了時の条件違反：0〜2番地で「3×4＝12」を合成して ACC=12 にする必要がありますが、2番地実行後の ACC=${step2?.acc ?? '?'} でした。`;
    } else if (!step3 || step3.pc !== 3 || step3.op !== 'SUB' || step3.acc !== 0) {
      passed = false;
      failureStepIdx = Math.min(3, trace.length - 1);
      error =
        step3 && step3.op !== 'SUB'
          ? `3番地の条件違反：LDI 0 などで直接消すのではなく、目標推力 12 を SUB 12 で引いて差圧が 0 になることを確認しよう！`
          : `3番地の条件違反：目標推力12を引いて差を 0（ACC=0, Z=1）にする必要がありますが、3番地実行後の ACC=${step3?.acc ?? '?'} でした（不一致のため4番地の JNZ 0 が0番地へ差し戻しました）。`;
    } else if (hitMaxCycles) {
      passed = false;
      failureStepIdx = trace.length - 1;
      error = '⏱ 実行ステップ上限（14サイクル）に達しました！ 4番地の JNZ 0 を通過できるよう ACC=0 (Z=1) を確認してください。';
    } else if (!step4 || step4.pc !== 4 || step4.op !== 'JNZ' || step4.zBefore !== 1 || step4.jmpFired || finalAcc !== 0 || finalPc !== 5) {
      passed = false;
      failureStepIdx = trace.length - 1;
      error = `4番地チェックの条件違反：ACC=0 (Z=1) で JNZ 0 を飛ばずに通過し 5番地（承認）へ進む必要がありますが、最終状態は ACC=${finalAcc}, 次PC=${finalPc}番地 でした。`;
    } else {
      passed = true;
    }
  } else if (stage.id === 'stage_24') {
    // Stage 26 (`stage_24` — GRAND FINALE!) Specification:
    // Pure 4-line hardware JNZ countdown loop (ZERO locked rows, ZERO external board wrappers!):
    //   0: LDI 3   (initial timer = 3)
    //   1: SUB 1   (decrement: 3 -> 2 -> 1 -> 0)
    //   2: JNZ 1   (jump back while ACC != 0; exit to 3 when ACC == 0)
    //   3: LDI 15  (open main hatch: ACC = 15, next PC = 4)
    const step0 = trace[0];
    const backwardJnzJumps = trace.filter((t) => t.op === 'JNZ' && t.pcNext < t.pc);
    const jnzExitStep = trace.find((t) => t.op === 'JNZ' && t.accBefore === 0 && t.pcNext === t.pc + 1);
    const openStep = trace[trace.length - 1];

    // Verify chronological SUB countdown 3 -> 2 -> 1 -> 0 before outputting 15
    let countdownStage = 0;
    const subHistory = [];
    for (const t of trace) {
      if (t.op === 'SUB') {
        subHistory.push(`${t.accBefore}→${t.acc}`);
        if (countdownStage === 0 && t.accBefore === 3 && t.acc === 2) countdownStage = 1;
        else if (countdownStage === 1 && t.accBefore === 2 && t.acc === 1) countdownStage = 2;
        else if (countdownStage === 2 && t.accBefore === 1 && t.acc === 0) countdownStage = 3;
      }
    }

    if (!step0 || step0.pc !== 0 || step0.acc !== 3) {
      passed = false;
      failureStepIdx = 0;
      error =
        step0?.acc === 15
          ? '0番地の安全規定違反：カウントダウンを行わずにいきなり全開信号(15)を出すことはできません！ 0番地で初期値「3」をセットしてください。'
          : `0番地の条件違反：最初にカウントダウン初期値「3」（ACC=3）をセットする必要があります（実測: ACC=${step0?.acc ?? '?'}）。`;
    } else if (hitMaxCycles) {
      passed = false;
      failureStepIdx = trace.length - 1;
      error = '⏱ 実行ステップ上限（14サイクル）に達しました！ JNZ のジャンプ先（1番地）や減算命令（SUB 1）を確認してください。';
    } else if (countdownStage < 3) {
      passed = false;
      failureStepIdx = trace.findIndex((t) => t.pc === 1);
      if (failureStepIdx < 0) failureStepIdx = Math.min(1, trace.length - 1);
      error = `カウントダウン条件違反：SUB 命令と JNZ ループでタイマーを 3 → 2 → 1 → 0 と1ずつ減らす必要があります（SUB 実行履歴: [${subHistory.join(', ') || 'なし'}]）。`;
    } else if (backwardJnzJumps.length < 2 || !jnzExitStep) {
      passed = false;
      failureStepIdx = trace.findIndex((t) => t.op === 'JNZ');
      if (failureStepIdx < 0) failureStepIdx = Math.min(2, trace.length - 1);
      error = '2番地の条件分岐違反：JNZ 1 で ACC≠0 のあいだ1番地へ2回以上ループバックし、ACC=0 (Z=1) の瞬間に3番地へ脱出する必要があります。';
    } else if (!openStep || openStep.pc !== 3 || finalAcc !== 15 || finalPc !== 4) {
      passed = false;
      failureStepIdx = trace.length - 1;
      error = `3番地開門の条件違反：ループ脱出後に3番地で全開信号 ACC=15 (1111) を出力し次PC=4番地へ到達する必要があります（実測: ACC=${finalAcc}, 次PC=${finalPc}番地）。`;
    } else {
      passed = true;
    }
  } else {
    if (hitMaxCycles) {
      passed = false;
      failureStepIdx = trace.length - 1;
      error = '⏱ 実行ステップ上限（14サイクル）に達しました！ ループから脱出できていないか、ジャンプ先が誤っています。';
    } else {
      passed =
        finalAcc === spec?.targetAcc &&
        (spec?.targetPc === undefined || finalPc === spec.targetPc);
      if (!passed) {
        failureStepIdx = trace.length - 1;
        error = `最終結果 ACC=${finalAcc} (次PC=${finalPc}) が目標仕様 (ACC=${spec?.targetAcc}) と一致しませんでした。`;
      }
    }
  }

  const results = trace.map((t, idx) => {
    const isFailedStep =
      !passed && (idx === failureStepIdx || (failureStepIdx < 0 && idx === trace.length - 1));
    const isLast = idx === trace.length - 1;
    const expectedAcc = isFailedStep
      ? isLast && spec?.targetAcc !== undefined
        ? spec.targetAcc
        : t.acc
      : t.acc;
    return {
      index: idx,
      label: t.label,
      input: [idx],
      expected: numToBits(expectedAcc, 4),
      actual: numToBits(t.acc, 4),
      passed: !isFailedStep,
      unstable: t.unstable,
      traceStep: t,
    };
  });

  return {
    passed,
    error,
    unstable,
    hitMaxCycles,
    results,
    trace,
    passedCount: results.filter((r) => r.passed).length,
    totalCount: results.length,
    siliconStats: run.siliconStats,
    metrics: run.metrics,
  };
}
