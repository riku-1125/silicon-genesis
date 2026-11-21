/**
 * SILICON GENESIS — Hardware-Backed ROM Assembly Runner & Spec Evaluator
 *
 * Compiles the player's actual forged `ARK4_SYS` circuit (and all of its
 * dependent custom chips in `save.customChips` down to primitive NAND gates!)
 * and executes Stage 22–24 ROM assembly programs directly through the gate-level
 * circuit simulator.
 *
 * Zero arithmetic or PC updates are performed in JavaScript: on every cycle,
 * `[I0, I1, IMM0, IMM1, IMM2, IMM3, CLK, RET]` are fed into the compiled
 * circuit, clocked `0 -> 1 -> 0`, and `[ACC0..3, PC0..3]` are read directly
 * from the circuit outputs.
 */

import { cloneCircuit, computeCircuitMetrics } from './circuit.js';
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
 * Wraps the player's `ARK4_SYS` circuit with the B1 Hatch Console's external
 * return pull-down line `RET` (input pin 7).
 *
 * How the fixed external return circuit (`3番地: LOOP 1`) works in hardware:
 * - At `3番地`, the ROM board outputs machine code `11:0001` (`JZ 1`: `I0=1, I1=1, IMM=0001`)
 *   and asserts the board-level return pull-down line `RET = 1`.
 * - When `RET = 0` (all normal instructions `LDI`, `ADD`, `SUB`, `JZ`), `NOT(RET) = 1`,
 *   so the 4-bit AND mask passes `ACC0..3` straight into `COND_PC.V0..3` unchanged.
 * - When `RET = 1` (`LOOP 1`), `NOT(RET) = 0`, so the 4-bit AND mask pulls `COND_PC.V0..3`
 *   to `0000` (ground) while `INST_DEC` decodes `11` (`WE=0, BR=1`).
 *   Consequently:
 *     1) `ARK4_CPU` receives `WE=0` and holds `ACC` in its `REG_4B` without modifying it.
 *     2) `COND_PC` receives `V=0000` and `BR=1`, so the player's `ZERO_4B` outputs `Z=1`,
 *        `AND(Z, BR)` outputs `JMP=1`, and `PC_4B` latches `J=0001` (`1番地`) on `CLK↑`!
 */
export function buildRomBoardCircuit(ark4SysCircuit) {
  const c = cloneCircuit(ark4SysCircuit);
  const retPinIdx = c.inputs.length; // index 7 ('RET')
  c.inputs.push('RET');

  // Locate wires feeding V0..3 of COND_PC (or A0..3 of ZERO_4BIT if COND_PC was inlined)
  const condPcNodes = new Set(c.nodes.filter((n) => n.type === 'COND_PC').map((n) => n.id));
  const zeroNodes = new Set(c.nodes.filter((n) => n.type === 'ZERO_4BIT').map((n) => n.id));
  const targetNodeIds = condPcNodes.size > 0 ? condPcNodes : zeroNodes;

  if (targetNodeIds.size > 0) {
    const notNodeId = '__rom_ret_not';
    c.nodes.push({ id: notNodeId, type: 'NOT', x: 40, y: 40 });
    c.wires.push({
      id: '__rom_w_ret_not',
      from: { kind: 'input', pin: retPinIdx },
      to: { kind: 'node', nodeId: notNodeId, pin: 0 },
    });

    let maskIdx = 0;
    for (const w of c.wires) {
      if (
        w.to.kind === 'node' &&
        targetNodeIds.has(w.to.nodeId) &&
        w.to.pin >= 0 &&
        w.to.pin <= 3
      ) {
        const andNodeId = `__rom_vmask_${maskIdx++}`;
        c.nodes.push({ id: andNodeId, type: 'AND', x: 80, y: 40 + maskIdx * 20 });
        const origFrom = { ...w.from };
        // Redirect existing wire to come from the AND mask output
        w.from = { kind: 'node', nodeId: andNodeId, pin: 0 };
        // Wire original source -> AND.A (pin 0), and NOT(RET) -> AND.B (pin 1)
        c.wires.push({
          id: `__rom_w_va_${maskIdx}`,
          from: origFrom,
          to: { kind: 'node', nodeId: andNodeId, pin: 0 },
        });
        c.wires.push({
          id: `__rom_w_vb_${maskIdx}`,
          from: { kind: 'node', nodeId: notNodeId, pin: 0 },
          to: { kind: 'node', nodeId: andNodeId, pin: 1 },
        });
      }
    }
  }

  return c;
}

/**
 * Compiles the player's `ARK4_SYS` and all dependent custom chips into a live
 * gate-level simulator instance.
 */
export function compileRomHardware(customChips = {}) {
  // Clone chip map and provision any missing dependencies without touching player chips
  const workingChips = { ...customChips };
  if (!workingChips.ARK4_SYS) {
    provisionStandardChips(workingChips, { includeChapter2Hardware: true, provisioned: true });
  }

  const ark4SysDef = workingChips.ARK4_SYS;
  if (!ark4SysDef || !ark4SysDef.circuit) {
    throw new Error('ARK4_SYS 回路が見つかりません（STAGE 21 を先にクリアしてください）');
  }

  const boardCircuit = buildRomBoardCircuit(ark4SysDef.circuit);
  const sim = compileCircuit(boardCircuit, workingChips);
  const metrics = computeCircuitMetrics(ark4SysDef.circuit, workingChips);

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

  return {
    sim,
    instDecSim,
    zeroSim,
    metrics,
    workingChips,
  };
}

/**
 * Performs a 2-cycle Hardware Power-On Reset (POR) through the compiled
 * `ARK4_SYS` circuit so `ACC = 0 (0000)` and `PC = 0 (0000)` before Cycle 0:
 *   1. `LDI 0` (`I=00, IMM=0000, RET=0`) clocked `0 -> 1 -> 0` to load `ACC = 0`
 *   2. `JZ 0`  (`I=11, IMM=0000, RET=0`) clocked `0 -> 1 -> 0` to jump `PC = 0`
 */
export function resetRomHardware(hw) {
  hw.sim.reset();

  // POR Pulse 1: LDI 0 (I0=0, I1=0, IMM=0000, RET=0)
  hw.sim.evaluate([0, 0, 0, 0, 0, 0, 0, 0]);
  hw.sim.evaluate([0, 0, 0, 0, 0, 0, 1, 0]);
  hw.sim.evaluate([0, 0, 0, 0, 0, 0, 0, 0]);

  // POR Pulse 2: JZ 0 (I0=1, I1=1, IMM=0000, RET=0)
  hw.sim.evaluate([1, 1, 0, 0, 0, 0, 0, 0]);
  hw.sim.evaluate([1, 1, 0, 0, 0, 0, 1, 0]);
  const res = hw.sim.evaluate([1, 1, 0, 0, 0, 0, 0, 0]);

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
    unstable: Boolean(res.unstable),
  };
}

/**
 * Decodes an assembly card into the exact `[I0, I1]` and `RET` hardware lines.
 * - `00` (LDI)  -> `I0=0, I1=0, RET=0`
 * - `01` (ADD)  -> `I0=1, I1=0, RET=0`
 * - `10` (SUB)  -> `I0=0, I1=1, RET=0`
 * - `11` (JZ)   -> `I0=1, I1=1, RET=0`
 * - `LOOP`      -> `I0=1, I1=1, RET=1` (Machine code `11:0001` = `JZ 1` + External Return Pull-down `RET=1`)
 */
export function encodeInstructionPins(part) {
  let i0 = 0;
  let i1 = 0;
  let ret = 0;

  if (part.op === 'LDI') {
    i0 = 0;
    i1 = 0;
  } else if (part.op === 'ADD') {
    i0 = 1;
    i1 = 0;
  } else if (part.op === 'SUB') {
    i0 = 0;
    i1 = 1;
  } else if (part.op === 'JZ') {
    i0 = 1;
    i1 = 1;
  } else if (part.op === 'LOOP') {
    i0 = 1;
    i1 = 1;
    ret = 1;
  }

  const imm = numToBits(part.val ?? 0, 4);
  const opcodeBits = `${i1}${i0}`;
  const immBits = `${imm[3]}${imm[2]}${imm[1]}${imm[0]}`;

  return {
    i0,
    i1,
    imm,
    ret,
    opcodeBits,
    immBits,
  };
}

export function buildRomRowMap(stage, slots = {}) {
  const rows = stage?.asmProgramSpec?.rows || [];
  const rowMap = new Map();
  for (const r of rows) {
    const part = r.locked
      ? r.fixedPart
      : (stage.physicsParts || []).find((p) => p.id === slots[r.slotId]) || null;
    rowMap.set(r.addr, { row: r, part });
  }
  return rowMap;
}

/**
 * Executes a single clock cycle on the compiled `ARK4_SYS` hardware at the
 * current hardware `PC` address.
 */
export function stepRomHardwareCycle(hw, rowMap, stepIdx = 0) {
  const outsBefore = hw.sim.getOutputs();
  const accBefore = bitsToNum(outsBefore, 0, 4);
  const pcBefore = bitsToNum(outsBefore, 4, 4);

  let zBefore = accBefore === 0 ? 1 : 0;
  if (hw.zeroSim) {
    hw.zeroSim.reset();
    zBefore = hw.zeroSim.evaluate(outsBefore.slice(0, 4)).outputs[0] ? 1 : 0;
  }

  const entry = rowMap.get(pcBefore);
  if (!entry || !entry.part) {
    return {
      halted: true,
      accBefore,
      pcBefore,
      zBefore,
    };
  }

  const part = entry.part;
  const { i0, i1, imm, ret, opcodeBits, immBits } = encodeInstructionPins(part);

  // Probe the player's own INST_DEC for live monitor display
  let opFlag = part.op === 'SUB' ? 1 : 0;
  let setFlag = part.op === 'LDI' ? 1 : 0;
  let weFlag = part.op === 'JZ' || part.op === 'LOOP' ? 0 : 1;
  let brFlag = part.op === 'JZ' || part.op === 'LOOP' ? 1 : 0;
  if (hw.instDecSim) {
    hw.instDecSim.reset();
    const decOut = hw.instDecSim.evaluate([i0, i1]).outputs;
    opFlag = decOut[0] ? 1 : 0;
    setFlag = decOut[1] ? 1 : 0;
    weFlag = decOut[2] ? 1 : 0;
    brFlag = decOut[3] ? 1 : 0;
  }

  // Feed instruction + immediate + RET into ARK4_SYS and pulse CLK: 0 -> 1 -> 0
  const vecSetup = [i0, i1, imm[0], imm[1], imm[2], imm[3], 0, ret];
  const vecRise = [i0, i1, imm[0], imm[1], imm[2], imm[3], 1, ret];
  const vecHold = [i0, i1, imm[0], imm[1], imm[2], imm[3], 0, ret];

  const resSetup = hw.sim.evaluate(vecSetup);
  const resRise = hw.sim.evaluate(vecRise);
  const resHold = hw.sim.evaluate(vecHold);

  const unstable = Boolean(resSetup.unstable || resRise.unstable || resHold.unstable);
  const outsAfter = resHold.outputs;
  const accAfter = bitsToNum(outsAfter, 0, 4);
  const pcAfter = bitsToNum(outsAfter, 4, 4);

  let zAfter = accAfter === 0 ? 1 : 0;
  if (hw.zeroSim) {
    hw.zeroSim.reset();
    zAfter = hw.zeroSim.evaluate(outsAfter.slice(0, 4)).outputs[0] ? 1 : 0;
  }

  const seqNextPc = (pcBefore + 1) & 15;
  const jmpFired = brFlag === 1 && (pcAfter !== seqNextPc || part.val === seqNextPc);

  const retNote = ret ? ' [外部帰還RET=1]' : '';
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
    retBit: ret,
    setFlag,
    opFlag,
    weFlag,
    brFlag,
    jmpFired,
    unstable,
    label: `${pcBefore}番地 [${part.name}${retNote}]：ACC ${accBefore}→${accAfter} (Z=${zAfter}) ／ 次PC=${pcAfter}番地`,
  };
}

/**
 * Runs a complete ROM assembly program on the player's compiled `ARK4_SYS`
 * hardware and returns the full cycle-by-cycle hardware trace.
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
      metrics: { nandCount: 0, nodeCount: 0, wireCount: 0, depth: 0 },
    };
  }

  const por = resetRomHardware(hw);
  const rowMap = buildRomRowMap(stage, slots);

  const trace = [];
  let acc = por.acc;
  let pc = por.pc;
  let unstable = por.unstable;
  let hitMaxCycles = false;

  for (let step = 0; step < maxCycles; step++) {
    const cycle = stepRomHardwareCycle(hw, rowMap, step);
    if (cycle.halted) {
      acc = cycle.accBefore;
      pc = cycle.pcBefore;
      break;
    }
    trace.push(cycle);
    acc = cycle.acc;
    pc = cycle.pcNext;
    if (cycle.unstable) {
      unstable = true;
      break;
    }
    // Check if next PC is still inside populated ROM
    const nextEntry = rowMap.get(pc);
    if (!nextEntry || !nextEntry.part) {
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
    metrics: {
      nandCount: hw.metrics.nandCount,
      nodeCount: (stage?.asmProgramSpec?.rows || []).length,
      wireCount: hw.metrics.wireCount,
      depth: hw.metrics.depth,
    },
  };
}

/**
 * Specification-based grading for Stages 22, 23, and 24.
 *
 * Grades whether the player's program & hardware achieved the mission
 * specification (initial condition, safety invariants during execution,
 * and completion goal), rather than requiring identical card order to a single
 * model answer.
 */
export function evaluateRomStage(stage, slots = {}, customChips = {}) {
  const spec = stage?.asmProgramSpec;
  const rows = spec?.rows || [];
  const editableRows = rows.filter((r) => !r.locked);
  const missing = editableRows.find((r) => !slots[r.slotId]);
  if (missing) {
    return {
      passed: false,
      error: `まだ「${missing.label}」が空欄です！ 下の命令カードをすべての番地にセットしよう。`,
      results: [],
      trace: [],
      passedCount: 0,
      totalCount: editableRows.length,
      metrics: { nandCount: 0, nodeCount: rows.length, wireCount: 0, depth: 0 },
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
    error = '0番地から命令を実行できませんでした。自作CPU（COND_PC）の初期番地出力を確認してください。';
  } else if (stage.id === 'stage_24' && (trace[0].pc !== 0 || trace[0].acc !== 3)) {
    const step0 = trace[0];
    passed = false;
    failureStepIdx = 0;
    error =
      step0?.acc === 15
        ? '0番地の安全規定違反：カウントダウンを行わずにいきなり全開信号(15)を出すことはできません！ 0番地で初期値「3」をセットしてください。'
        : `0番地の条件違反：最初にカウントダウン初期値「3」（ACC=3）をセットする必要があります（実測: ACC=${step0?.acc ?? '?'}）。`;
  } else if (hitMaxCycles) {
    passed = false;
    failureStepIdx = trace.length - 1;
    error = '⏱ 実行ステップ上限（14サイクル）に達しました！ ループから脱出できていないか、ジャンプ先が誤っています。';
  } else if (stage.id === 'stage_22') {
    // Stage 22 Specification:
    // 1. 0番地で初期基準内圧 ACC=5 をセットすること
    // 2. 1〜2番地で加圧(+7)と減圧(-4)を行い（順不同OK: 5+7-4=8 も 5-4+7=8 も両方安全）、
    //    3命令完了時に最終気圧 ACC=8 かつ 次PC=3番地 に到達すること
    const step0 = trace[0];
    if (!step0 || step0.pc !== 0 || step0.acc !== 5) {
      passed = false;
      failureStepIdx = 0;
      error = `0番地の条件違反：最初に基準内圧「5」をセット（ACC=5）する必要があります（実測: 0番地実行後の ACC=${step0?.acc ?? '?'}）。`;
    } else if (trace.length < 3) {
      passed = false;
      failureStepIdx = trace.length - 1;
      error = `2番地まで最後まで実行されませんでした（次PC=${finalPc}番地）。`;
    } else if (finalAcc !== 8 || finalPc !== 3) {
      passed = false;
      failureStepIdx = trace.length - 1;
      error = `2番地完了時の条件違反：最終気圧 ACC=8（次PC=3番地）になる必要がありますが、実測は ACC=${finalAcc}（次PC=${finalPc}番地）でした。`;
    } else {
      passed = true;
    }
  } else if (stage.id === 'stage_23') {
    // Stage 23 Specification:
    // 1. 0〜2番地の足し算・代入で油圧ジャッキ推力「3×4＝12」（2番地完了時 ACC=12）を合成すること
    //    （LDI 3 -> ADD 3 -> ADD 6 でも LDI 3 -> ADD 6 -> ADD 3 でも両方合格！）
    // 2. 3番地で目標推力 12 を引いて差圧 ACC=0 (Z=1) にすること
    // 3. 4番地の JZ 6 で 6番地（開錠承認）へジャンプ完了（finalAcc=0, finalPc=6）すること
    const step0 = trace[0];
    const step2 = trace[2];
    const step3 = trace[3];
    const step4 = trace[4];
    if (!step0 || step0.acc === 0) {
      passed = false;
      failureStepIdx = 0;
      error = `0番地の条件違反：まず0番地でポンプ初期推力（LDI 3）をセットしてください（0番地実行後の ACC=${step0?.acc ?? '?'}）。`;
    } else if (!step2 || step2.pc !== 2 || step2.acc !== 12) {
      passed = false;
      failureStepIdx = Math.min(2, trace.length - 1);
      error = `2番地完了時の条件違反：0〜2番地で「3×4＝12」を合成して ACC=12 にする必要がありますが、2番地実行後の ACC=${step2?.acc ?? '?'} でした。`;
    } else if (!step3 || step3.pc !== 3 || step3.acc !== 0) {
      passed = false;
      failureStepIdx = Math.min(3, trace.length - 1);
      error = `3番地の条件違反：目標推力12を引いて差を 0（ACC=0, Z=1）にする必要がありますが、3番地実行後の ACC=${step3?.acc ?? '?'} でした。`;
    } else if (!step4 || finalAcc !== 0 || finalPc !== 6) {
      passed = false;
      failureStepIdx = trace.length - 1;
      error = `4番地分岐の条件違反：Z=1 で 6番地へジャンプする必要がありますが、最終状態は ACC=${finalAcc}, 次PC=${finalPc}番地 でした。`;
    } else {
      passed = true;
    }
  } else if (stage.id === 'stage_24') {
    // Stage 24 Specification:
    // 1. 0番地でタイマー初期値 ACC=3 をセットすること
    // 2. ループ（1番地〜3番地）で ACC が 3 → 2 → 1 → 0 と1ずつカウントダウンされること
    //    （いきなり0番地で LDI 15 を出してカウントダウンを飛ばした場合は不合格！）
    // 3. ACC=0 (Z=1) になった瞬間に 2番地の JZ 4 で 4番地へループ脱出すること
    // 4. 4番地で地上大ハッチ全開信号 ACC=15 (1111)、次PC=5番地 を出力すること
    const step0 = trace[0];
    const countdownAfter1 = trace.filter((t) => t.pc === 1).map((t) => t.acc);
    const loopReturns = trace.filter((t) => t.pc === 3 && t.pcNext === 1);
    const breakoutStep = trace.find((t) => t.pc === 2 && t.acc === 0 && t.pcNext === 4);
    const openStep = trace[trace.length - 1];

    if (!step0 || step0.pc !== 0 || step0.acc !== 3) {
      passed = false;
      failureStepIdx = 0;
      error =
        step0?.acc === 15
          ? '0番地の安全規定違反：カウントダウンを行わずにいきなり全開信号(15)を出すことはできません！ 0番地で初期値「3」をセットしてください。'
          : `0番地の条件違反：最初にカウントダウン初期値「3」（ACC=3）をセットする必要があります（実測: ACC=${step0?.acc ?? '?'}）。`;
    } else if (
      countdownAfter1.length !== 3 ||
      countdownAfter1[0] !== 2 ||
      countdownAfter1[1] !== 1 ||
      countdownAfter1[2] !== 0
    ) {
      passed = false;
      failureStepIdx = trace.findIndex((t) => t.pc === 1);
      if (failureStepIdx < 0) failureStepIdx = Math.min(1, trace.length - 1);
      error = `1番地〜3番地ループの条件違反：タイマーを 3 → 2 → 1 → 0 と1ずつ減らす必要があります（1番地実行後のACC履歴: [${countdownAfter1.join(' → ') || 'なし'}]）。`;
    } else if (loopReturns.length !== 2 || !breakoutStep) {
      passed = false;
      failureStepIdx = trace.findIndex((t) => t.pc === 2);
      if (failureStepIdx < 0) failureStepIdx = trace.length - 1;
      error = '2番地の条件分岐違反：ACCが0になるまで3番地(LOOP 1)経由で繰り返し、ACC=0 (Z=1) の瞬間に4番地へジャンプ（JZ 4）する必要があります。';
    } else if (!openStep || openStep.pc !== 4 || finalAcc !== 15 || finalPc !== 5) {
      passed = false;
      failureStepIdx = trace.length - 1;
      error = `4番地開門の条件違反：ループ脱出後に4番地で全開信号 ACC=15 (1111) を出力する必要があります（実測: ACC=${finalAcc}, 次PC=${finalPc}番地）。`;
    } else {
      passed = true;
    }
  } else {
    passed =
      finalAcc === spec?.targetAcc &&
      (spec?.targetPc === undefined || finalPc === spec.targetPc);
    if (!passed) {
      failureStepIdx = trace.length - 1;
      error = `最終結果 ACC=${finalAcc} (次PC=${finalPc}) が目標仕様 (ACC=${spec?.targetAcc}) と一致しませんでした。`;
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
    metrics: run.metrics,
  };
}
