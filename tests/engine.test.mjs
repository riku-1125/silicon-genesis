import test from 'node:test';
import assert from 'node:assert/strict';
import { STAGES, getStageById } from '../src/data/stages.js';
import { CODEX_ENTRIES } from '../src/data/codex.js';
import { PROLOGUE_STEPS } from '../src/data/prologue.js';
import {
  GLOSSARY_TERMS,
  MODULE_ENCYCLOPEDIA_IDS,
  tokenizeGlossaryText,
  getGlossaryTerm,
  getGlossaryTermForChip,
  getModulesForCodexId,
  isGlossaryTermUnlocked,
  isGlossaryDiagramUnlocked,
  isModuleEncyclopediaUnlocked,
  collectTermIdsFromTexts,
} from '../src/data/glossary.js';
import { loadSaveData, isStageUnlocked, isChapter1Cleared, isChapter2Unlocked } from '../src/state/storage.js';
import { createEmptyCircuit, cloneCircuit, connectWire, computeCircuitMetrics } from '../src/engine/circuit.js';
import { compileCircuit } from '../src/engine/simulator.js';
import { evaluateStage, reproduceDiagnosticState } from '../src/engine/evaluator.js';
import { provisionStandardChips } from '../src/engine/blueprints.js';
import {
  runRomProgram,
  evaluateRomStage,
  parseAssemblyLine,
  assembleProgramText,
  formatProgramText,
  compileRomHardware,
  probeInstructionDecode,
  makeInstructionPart,
} from '../src/engine/romRunner.js';

/**
 * Helper to concisely construct test circuits matching player editing actions.
 */
function buildCircuit(stage, nodes, wireSpecs) {
  let c = createEmptyCircuit(stage.inputs, stage.outputs);
  c.nodes = nodes.map((n, idx) => ({ id: n.id, type: n.type, x: 180 + idx * 60, y: 120 }));
  let wid = 1;
  for (const [from, to] of wireSpecs) {
    c = connectWire(c, from, to, () => `w${wid++}`);
  }
  return c;
}

const inp = (pin) => ({ kind: 'input', pin });
const out = (pin) => ({ kind: 'output', pin });
const np = (nodeId, pin) => ({ kind: 'node', nodeId, pin });

function registerChip(customChips, stage, circuit) {
  const metrics = computeCircuitMetrics(circuit, customChips);
  const reward = stage.rewardChip;
  customChips[reward.id] = {
    ...reward,
    inputs: [...stage.inputs],
    outputs: [...stage.outputs],
    circuit,
    nandCount: metrics.nandCount,
    depth: metrics.depth,
    stageId: stage.id,
  };
}

test('Full 27-stage campaign (Ch.1 + Ch.2): circuit stages 00-C (NAND) through 21 (ARK4_SYS) compile and pass bottom-up', () => {
  assert.equal(STAGES.length, 27);
  assert.equal(STAGES[0].id, 'stage_00a');
  assert.equal(STAGES[1].id, 'stage_00b');
  const customChips = {};

  // Stage 00-C: Physical NAND from VCC(1) + 2 series SW(TR) + PULL resistor!
  {
    const st = getStageById('stage_00');
    assert.equal(st.id, 'stage_00');
    const c = buildCircuit(
      st,
      [
        { id: 'vcc', type: 'CONST_1' },
        { id: 'sw1', type: 'SW' },
        { id: 'sw2', type: 'SW' },
        { id: 'pull', type: 'PULL' },
      ],
      [
        [np('vcc', 0), np('sw1', 0)], // VCC -> SW1.IN
        [inp(0), np('sw1', 1)],       // A -> SW1.G
        [np('sw1', 0), np('sw2', 0)], // SW1.OUT -> SW2.IN
        [inp(1), np('sw2', 1)],       // B -> SW2.G
        [np('sw2', 0), np('pull', 0)],// SW2.OUT -> PULL.GND
        [np('pull', 0), out(0)],      // PULL.OUT -> OUT
      ]
    );
    const res = evaluateStage(st, c, customChips);
    assert.equal(res.passed, true, `Stage 00 (Physical NAND) failed: ${JSON.stringify(res)}`);
    registerChip(customChips, st, c);
  }

  // Stage 01: NOT (1 NAND)
  {
    const st = getStageById('stage_01');
    assert.equal(st.id, 'stage_01');
    const c = buildCircuit(st, [{ id: 'g1', type: 'NAND' }], [
      [inp(0), np('g1', 0)],
      [inp(0), np('g1', 1)],
      [np('g1', 0), out(0)],
    ]);
    const res = evaluateStage(st, c, customChips);
    assert.equal(res.passed, true, `Stage 01 failed: ${JSON.stringify(res)}`);
    assert.equal(res.metrics.nandCount, 1);
    registerChip(customChips, st, c);
  }

  // Stage 02: AND (NAND + NOT = 2 NAND)
  {
    const st = getStageById('stage_02');
    const c = buildCircuit(
      st,
      [
        { id: 'n1', type: 'NAND' },
        { id: 'i1', type: 'NOT' },
      ],
      [
        [inp(0), np('n1', 0)],
        [inp(1), np('n1', 1)],
        [np('n1', 0), np('i1', 0)],
        [np('i1', 0), out(0)],
      ]
    );
    const res = evaluateStage(st, c, customChips);
    assert.equal(res.passed, true, `Stage 02 failed: ${JSON.stringify(res)}`);
    assert.equal(res.metrics.nandCount, 2);
    registerChip(customChips, st, c);
  }

  // Stage 03: OR (2 NOT + NAND = 3 NAND)
  {
    const st = getStageById('stage_03');
    const c = buildCircuit(
      st,
      [
        { id: 'na', type: 'NOT' },
        { id: 'nb', type: 'NOT' },
        { id: 'g', type: 'NAND' },
      ],
      [
        [inp(0), np('na', 0)],
        [inp(1), np('nb', 0)],
        [np('na', 0), np('g', 0)],
        [np('nb', 0), np('g', 1)],
        [np('g', 0), out(0)],
      ]
    );
    const res = evaluateStage(st, c, customChips);
    assert.equal(res.passed, true, `Stage 03 failed: ${JSON.stringify(res)}`);
    assert.equal(res.metrics.nandCount, 3);
    registerChip(customChips, st, c);
  }

  // Stage 04: XOR (OR + NAND + AND = 6 NAND)
  {
    const st = getStageById('stage_04');
    const c = buildCircuit(
      st,
      [
        { id: 'o1', type: 'OR' },
        { id: 'n1', type: 'NAND' },
        { id: 'a1', type: 'AND' },
      ],
      [
        [inp(0), np('o1', 0)],
        [inp(1), np('o1', 1)],
        [inp(0), np('n1', 0)],
        [inp(1), np('n1', 1)],
        [np('o1', 0), np('a1', 0)],
        [np('n1', 0), np('a1', 1)],
        [np('a1', 0), out(0)],
      ]
    );
    const res = evaluateStage(st, c, customChips);
    assert.equal(res.passed, true, `Stage 04 failed: ${JSON.stringify(res)}`);
    assert.equal(res.metrics.nandCount, 6);
    registerChip(customChips, st, c);
  }

  // Stage 05: HALF_ADDER (XOR + AND = 8 NAND)
  {
    const st = getStageById('stage_05');
    const c = buildCircuit(
      st,
      [
        { id: 'x1', type: 'XOR' },
        { id: 'a1', type: 'AND' },
      ],
      [
        [inp(0), np('x1', 0)],
        [inp(1), np('x1', 1)],
        [inp(0), np('a1', 0)],
        [inp(1), np('a1', 1)],
        [np('x1', 0), out(0)],
        [np('a1', 0), out(1)],
      ]
    );
    const res = evaluateStage(st, c, customChips);
    assert.equal(res.passed, true, `Stage 05 failed: ${JSON.stringify(res)}`);
    assert.equal(res.metrics.nandCount, 8);
    registerChip(customChips, st, c);
  }

  // Stage 06: FULL_ADDER (2 HALF_ADDER + OR = 19 NAND)
  {
    const st = getStageById('stage_06');
    const c = buildCircuit(
      st,
      [
        { id: 'ha1', type: 'HALF_ADDER' },
        { id: 'ha2', type: 'HALF_ADDER' },
        { id: 'o1', type: 'OR' },
      ],
      [
        [inp(0), np('ha1', 0)],
        [inp(1), np('ha1', 1)],
        [np('ha1', 0), np('ha2', 0)],
        [inp(2), np('ha2', 1)],
        [np('ha2', 0), out(0)],
        [np('ha1', 1), np('o1', 0)],
        [np('ha2', 1), np('o1', 1)],
        [np('o1', 0), out(1)],
      ]
    );
    const res = evaluateStage(st, c, customChips);
    assert.equal(res.passed, true, `Stage 06 failed: ${JSON.stringify(res)}`);
    assert.equal(res.metrics.nandCount, 19);
    registerChip(customChips, st, c);
  }

  // Stage 07: ADD_4BIT (4 FULL_ADDER = 76 NAND)
  {
    const st = getStageById('stage_07');
    const c = buildCircuit(
      st,
      [
        { id: 'fa0', type: 'FULL_ADDER' },
        { id: 'fa1', type: 'FULL_ADDER' },
        { id: 'fa2', type: 'FULL_ADDER' },
        { id: 'fa3', type: 'FULL_ADDER' },
      ],
      [
        [inp(0), np('fa0', 0)], [inp(4), np('fa0', 1)], [inp(8), np('fa0', 2)], [np('fa0', 0), out(0)],
        [inp(1), np('fa1', 0)], [inp(5), np('fa1', 1)], [np('fa0', 1), np('fa1', 2)], [np('fa1', 0), out(1)],
        [inp(2), np('fa2', 0)], [inp(6), np('fa2', 1)], [np('fa1', 1), np('fa2', 2)], [np('fa2', 0), out(2)],
        [inp(3), np('fa3', 0)], [inp(7), np('fa3', 1)], [np('fa2', 1), np('fa3', 2)], [np('fa3', 0), out(3)],
        [np('fa3', 1), out(4)],
      ]
    );
    const res = evaluateStage(st, c, customChips);
    assert.equal(res.passed, true, `Stage 07 failed: ${JSON.stringify(res)}`);
    assert.equal(res.metrics.nandCount, 76);
    registerChip(customChips, st, c);
  }

  // Stage 08: MUX (NOT + 2 AND + OR = 8 NAND)
  {
    const st = getStageById('stage_08');
    const c = buildCircuit(
      st,
      [
        { id: 'ns', type: 'NOT' },
        { id: 'a0', type: 'AND' },
        { id: 'a1', type: 'AND' },
        { id: 'o1', type: 'OR' },
      ],
      [
        [inp(2), np('ns', 0)],
        [inp(0), np('a0', 0)], [np('ns', 0), np('a0', 1)],
        [inp(1), np('a1', 0)], [inp(2), np('a1', 1)],
        [np('a0', 0), np('o1', 0)], [np('a1', 0), np('o1', 1)],
        [np('o1', 0), out(0)],
      ]
    );
    const res = evaluateStage(st, c, customChips);
    assert.equal(res.passed, true, `Stage 08 failed: ${JSON.stringify(res)}`);
    assert.equal(res.metrics.nandCount, 8);
    registerChip(customChips, st, c);
  }

  // Stage 09: MUX_4BIT (4 MUX = 32 NAND)
  {
    const st = getStageById('stage_09');
    const c = buildCircuit(
      st,
      [
        { id: 'm0', type: 'MUX' },
        { id: 'm1', type: 'MUX' },
        { id: 'm2', type: 'MUX' },
        { id: 'm3', type: 'MUX' },
      ],
      [
        [inp(0), np('m0', 0)], [inp(4), np('m0', 1)], [inp(8), np('m0', 2)], [np('m0', 0), out(0)],
        [inp(1), np('m1', 0)], [inp(5), np('m1', 1)], [inp(8), np('m1', 2)], [np('m1', 0), out(1)],
        [inp(2), np('m2', 0)], [inp(6), np('m2', 1)], [inp(8), np('m2', 2)], [np('m2', 0), out(2)],
        [inp(3), np('m3', 0)], [inp(7), np('m3', 1)], [inp(8), np('m3', 2)], [np('m3', 0), out(3)],
      ]
    );
    const res = evaluateStage(st, c, customChips);
    assert.equal(res.passed, true, `Stage 09 failed: ${JSON.stringify(res)}`);
    assert.equal(res.metrics.nandCount, 32);
    registerChip(customChips, st, c);
  }

  // Stage 10: DEC_2TO4 (2 NOT + 4 AND = 10 NAND)
  {
    const st = getStageById('stage_10');
    const c = buildCircuit(
      st,
      [
        { id: 'n0', type: 'NOT' },
        { id: 'n1', type: 'NOT' },
        { id: 'y0', type: 'AND' },
        { id: 'y1', type: 'AND' },
        { id: 'y2', type: 'AND' },
        { id: 'y3', type: 'AND' },
      ],
      [
        [inp(0), np('n0', 0)],
        [inp(1), np('n1', 0)],
        [np('n0', 0), np('y0', 0)], [np('n1', 0), np('y0', 1)], [np('y0', 0), out(0)],
        [inp(0), np('y1', 0)], [np('n1', 0), np('y1', 1)], [np('y1', 0), out(1)],
        [np('n0', 0), np('y2', 0)], [inp(1), np('y2', 1)], [np('y2', 0), out(2)],
        [inp(0), np('y3', 0)], [inp(1), np('y3', 1)], [np('y3', 0), out(3)],
      ]
    );
    const res = evaluateStage(st, c, customChips);
    assert.equal(res.passed, true, `Stage 10 failed: ${JSON.stringify(res)}`);
    assert.equal(res.metrics.nandCount, 10);
    registerChip(customChips, st, c);
  }

  // Stage 11: SR_LATCH (2 NOT + 2 cross-coupled NAND = 4 NAND)
  {
    const st = getStageById('stage_11');
    const c = buildCircuit(
      st,
      [
        { id: 'ns', type: 'NOT' },
        { id: 'nr', type: 'NOT' },
        { id: 'q', type: 'NAND' },
        { id: 'qn', type: 'NAND' },
      ],
      [
        [inp(0), np('ns', 0)],
        [inp(1), np('nr', 0)],
        [np('ns', 0), np('q', 0)],
        [np('qn', 0), np('q', 1)],
        [np('nr', 0), np('qn', 0)],
        [np('q', 0), np('qn', 1)],
        [np('q', 0), out(0)],
        [np('qn', 0), out(1)],
      ]
    );
    const res = evaluateStage(st, c, customChips);
    assert.equal(res.passed, true, `Stage 11 (SR_LATCH) failed: ${JSON.stringify(res)}`);
    assert.equal(res.metrics.nandCount, 4);
    registerChip(customChips, st, c);
  }

  // Stage 12: D_LATCH (NOT + 2 AND + SR_LATCH = 9 NAND)
  {
    const st = getStageById('stage_12');
    const c = buildCircuit(
      st,
      [
        { id: 'nd', type: 'NOT' },
        { id: 'as', type: 'AND' },
        { id: 'ar', type: 'AND' },
        { id: 'sr', type: 'SR_LATCH' },
      ],
      [
        [inp(0), np('nd', 0)],
        [inp(0), np('as', 0)], [inp(1), np('as', 1)],
        [np('nd', 0), np('ar', 0)], [inp(1), np('ar', 1)],
        [np('as', 0), np('sr', 0)],
        [np('ar', 0), np('sr', 1)],
        [np('sr', 0), out(0)],
      ]
    );
    const res = evaluateStage(st, c, customChips);
    assert.equal(res.passed, true, `Stage 12 (D_LATCH) failed: ${JSON.stringify(res)}`);
    assert.equal(res.metrics.nandCount, 9);
    registerChip(customChips, st, c);
  }

  // Stage 13: D_FF (Master-Slave: NOT + 2 D_LATCH = 19 NAND)
  {
    const st = getStageById('stage_13');
    const c = buildCircuit(
      st,
      [
        { id: 'nc', type: 'NOT' },
        { id: 'm', type: 'D_LATCH' },
        { id: 's', type: 'D_LATCH' },
      ],
      [
        [inp(1), np('nc', 0)],
        [inp(0), np('m', 0)], [np('nc', 0), np('m', 1)],
        [np('m', 0), np('s', 0)], [inp(1), np('s', 1)],
        [np('s', 0), out(0)],
      ]
    );
    const res = evaluateStage(st, c, customChips);
    assert.equal(res.passed, true, `Stage 13 (D_FF) failed: ${JSON.stringify(res)}`);
    assert.equal(res.metrics.nandCount, 19);
    registerChip(customChips, st, c);
  }

  // Stage 14: REG_4BIT (MUX_4BIT + 4 D_FF = 108 NAND)
  {
    const st = getStageById('stage_14');
    const c = buildCircuit(
      st,
      [
        { id: 'mx', type: 'MUX_4BIT' },
        { id: 'f0', type: 'D_FF' },
        { id: 'f1', type: 'D_FF' },
        { id: 'f2', type: 'D_FF' },
        { id: 'f3', type: 'D_FF' },
      ],
      [
        // MUX A = feedback Q0..Q3
        [np('f0', 0), np('mx', 0)],
        [np('f1', 0), np('mx', 1)],
        [np('f2', 0), np('mx', 2)],
        [np('f3', 0), np('mx', 3)],
        // MUX B = external D0..D3
        [inp(0), np('mx', 4)],
        [inp(1), np('mx', 5)],
        [inp(2), np('mx', 6)],
        [inp(3), np('mx', 7)],
        // MUX SEL = LOAD (pin 4)
        [inp(4), np('mx', 8)],
        // D_FF inputs + CLK (pin 5)
        [np('mx', 0), np('f0', 0)], [inp(5), np('f0', 1)], [np('f0', 0), out(0)],
        [np('mx', 1), np('f1', 0)], [inp(5), np('f1', 1)], [np('f1', 0), out(1)],
        [np('mx', 2), np('f2', 0)], [inp(5), np('f2', 1)], [np('f2', 0), out(2)],
        [np('mx', 3), np('f3', 0)], [inp(5), np('f3', 1)], [np('f3', 0), out(3)],
      ]
    );
    const res = evaluateStage(st, c, customChips);
    assert.equal(res.passed, true, `Stage 14 (REG_4BIT) failed: ${JSON.stringify(res)}`);
    assert.equal(res.metrics.nandCount, 108);
    registerChip(customChips, st, c);
  }

  // Stage 15: ALU_4BIT (4 XOR + ADD_4BIT = 100 NAND)
  {
    const st = getStageById('stage_15');
    const c = buildCircuit(
      st,
      [
        { id: 'x0', type: 'XOR' },
        { id: 'x1', type: 'XOR' },
        { id: 'x2', type: 'XOR' },
        { id: 'x3', type: 'XOR' },
        { id: 'add', type: 'ADD_4BIT' },
      ],
      [
        [inp(0), np('add', 0)], [inp(1), np('add', 1)], [inp(2), np('add', 2)], [inp(3), np('add', 3)],
        [inp(4), np('x0', 0)], [inp(8), np('x0', 1)], [np('x0', 0), np('add', 4)],
        [inp(5), np('x1', 0)], [inp(8), np('x1', 1)], [np('x1', 0), np('add', 5)],
        [inp(6), np('x2', 0)], [inp(8), np('x2', 1)], [np('x2', 0), np('add', 6)],
        [inp(7), np('x3', 0)], [inp(8), np('x3', 1)], [np('x3', 0), np('add', 7)],
        [inp(8), np('add', 8)],
        [np('add', 0), out(0)], [np('add', 1), out(1)], [np('add', 2), out(2)], [np('add', 3), out(3)],
        [np('add', 4), out(4)],
      ]
    );
    const res = evaluateStage(st, c, customChips);
    assert.equal(res.passed, true, `Stage 15 (ALU_4BIT) failed: ${JSON.stringify(res)}`);
    assert.equal(res.metrics.nandCount, 100);
    registerChip(customChips, st, c);
  }

  // Stage 16: PC_4BIT (ADD_4BIT + MUX_4BIT + REG_4BIT + CONST_0 + CONST_1 = 216 NAND)
  {
    const st = getStageById('stage_16');
    const c = buildCircuit(
      st,
      [
        { id: 'c0', type: 'CONST_0' },
        { id: 'c1', type: 'CONST_1' },
        { id: 'add', type: 'ADD_4BIT' },
        { id: 'mx', type: 'MUX_4BIT' },
        { id: 'reg', type: 'REG_4BIT' },
      ],
      [
        // ADD_4BIT(A=Q, B=0000, CIN=1)
        [np('reg', 0), np('add', 0)], [np('reg', 1), np('add', 1)], [np('reg', 2), np('add', 2)], [np('reg', 3), np('add', 3)],
        [np('c0', 0), np('add', 4)], [np('c0', 0), np('add', 5)], [np('c0', 0), np('add', 6)], [np('c0', 0), np('add', 7)],
        [np('c1', 0), np('add', 8)],
        // MUX_4BIT(A=ADD.S, B=J, SEL=JMP)
        [np('add', 0), np('mx', 0)], [np('add', 1), np('mx', 1)], [np('add', 2), np('mx', 2)], [np('add', 3), np('mx', 3)],
        [inp(0), np('mx', 4)], [inp(1), np('mx', 5)], [inp(2), np('mx', 6)], [inp(3), np('mx', 7)],
        [inp(4), np('mx', 8)],
        // REG_4BIT(D=MUX.Y, LOAD=1, CLK=CLK)
        [np('mx', 0), np('reg', 0)], [np('mx', 1), np('reg', 1)], [np('mx', 2), np('reg', 2)], [np('mx', 3), np('reg', 3)],
        [np('c1', 0), np('reg', 4)],
        [inp(5), np('reg', 5)],
        // Outputs
        [np('reg', 0), out(0)], [np('reg', 1), out(1)], [np('reg', 2), out(2)], [np('reg', 3), out(3)],
      ]
    );
    const res = evaluateStage(st, c, customChips);
    assert.equal(res.passed, true, `Stage 16 (PC_4BIT) failed: ${JSON.stringify(res)}`);
    assert.equal(res.metrics.nandCount, 216);
    registerChip(customChips, st, c);
  }

  // Stage 17: ARK4_CORE (ALU_4BIT + MUX_4BIT + REG_4BIT = 240 NAND!)
  {
    const st = getStageById('stage_17');
    const c = buildCircuit(
      st,
      [
        { id: 'alu', type: 'ALU_4BIT' },
        { id: 'mx', type: 'MUX_4BIT' },
        { id: 'reg', type: 'REG_4BIT' },
      ],
      [
        // ALU(A=ACC, B=IMM, SUB=OP)
        [np('reg', 0), np('alu', 0)], [np('reg', 1), np('alu', 1)], [np('reg', 2), np('alu', 2)], [np('reg', 3), np('alu', 3)],
        [inp(0), np('alu', 4)], [inp(1), np('alu', 5)], [inp(2), np('alu', 6)], [inp(3), np('alu', 7)],
        [inp(4), np('alu', 8)],
        // MUX(A=ALU.Y, B=IMM, SEL=SET)
        [np('alu', 0), np('mx', 0)], [np('alu', 1), np('mx', 1)], [np('alu', 2), np('mx', 2)], [np('alu', 3), np('mx', 3)],
        [inp(0), np('mx', 4)], [inp(1), np('mx', 5)], [inp(2), np('mx', 6)], [inp(3), np('mx', 7)],
        [inp(5), np('mx', 8)],
        // REG(D=MUX.Y, LOAD=WE, CLK=CLK)
        [np('mx', 0), np('reg', 0)], [np('mx', 1), np('reg', 1)], [np('mx', 2), np('reg', 2)], [np('mx', 3), np('reg', 3)],
        [inp(6), np('reg', 4)],
        [inp(7), np('reg', 5)],
        // Outputs ACC0..ACC3
        [np('reg', 0), out(0)], [np('reg', 1), out(1)], [np('reg', 2), out(2)], [np('reg', 3), out(3)],
      ]
    );
    const res = evaluateStage(st, c, customChips);
    assert.equal(res.passed, true, `Stage 17 (ARK4_CORE) failed: ${JSON.stringify(res)}`);
    assert.equal(res.metrics.nandCount, 240);
    registerChip(customChips, st, c);
  }

  // Stage 18: ZERO_4BIT (3 OR + 1 NOT = 10 NAND)
  {
    const st = getStageById('stage_18');
    const c = buildCircuit(
      st,
      [
        { id: 'o01', type: 'OR' },
        { id: 'o23', type: 'OR' },
        { id: 'oall', type: 'OR' },
        { id: 'inv', type: 'NOT' },
      ],
      [
        [inp(0), np('o01', 0)], [inp(1), np('o01', 1)],
        [inp(2), np('o23', 0)], [inp(3), np('o23', 1)],
        [np('o01', 0), np('oall', 0)], [np('o23', 0), np('oall', 1)],
        [np('oall', 0), np('inv', 0)],
        [np('inv', 0), out(0)],
      ]
    );
    const res = evaluateStage(st, c, customChips);
    assert.equal(res.passed, true, `Stage 18 (ZERO_4BIT) failed: ${JSON.stringify(res)}`);
    assert.equal(res.metrics.nandCount, 10);
    registerChip(customChips, st, c);
  }

  // Stage 19: COND_PC (ZERO_4BIT + AND + PC_4BIT = 228 NAND)
  {
    const st = getStageById('stage_19');
    const c = buildCircuit(
      st,
      [
        { id: 'z4', type: 'ZERO_4BIT' },
        { id: 'and', type: 'AND' },
        { id: 'pc', type: 'PC_4BIT' },
      ],
      [
        [inp(0), np('z4', 0)], [inp(1), np('z4', 1)], [inp(2), np('z4', 2)], [inp(3), np('z4', 3)],
        [np('z4', 0), np('and', 0)], [inp(8), np('and', 1)],
        [inp(4), np('pc', 0)], [inp(5), np('pc', 1)], [inp(6), np('pc', 2)], [inp(7), np('pc', 3)],
        [np('and', 0), np('pc', 4)],
        [inp(9), np('pc', 5)],
        [np('pc', 0), out(0)], [np('pc', 1), out(1)], [np('pc', 2), out(2)], [np('pc', 3), out(3)],
      ]
    );
    const res = evaluateStage(st, c, customChips);
    assert.equal(res.passed, true, `Stage 19 (COND_PC) failed: ${JSON.stringify(res)}`);
    assert.equal(res.metrics.nandCount, 228);
    registerChip(customChips, st, c);
  }

  // Stage 20: INST_DEC (DEC_2TO4 + NOT = 11 NAND)
  {
    const st = getStageById('stage_20');
    const c = buildCircuit(
      st,
      [
        { id: 'dec', type: 'DEC_2TO4' },
        { id: 'not', type: 'NOT' },
      ],
      [
        [inp(0), np('dec', 0)], [inp(1), np('dec', 1)],
        [np('dec', 2), out(0)], // Y2 -> OP (SUB)
        [np('dec', 0), out(1)], // Y0 -> SET (LDI)
        [np('dec', 3), np('not', 0)], [np('not', 0), out(2)], // !Y3 -> WE
        [np('dec', 3), out(3)], // Y3 -> BR (JZ)
      ]
    );
    const res = evaluateStage(st, c, customChips);
    assert.equal(res.passed, true, `Stage 20 (INST_DEC) failed: ${JSON.stringify(res)}`);
    assert.equal(res.metrics.nandCount, 11);
    registerChip(customChips, st, c);
  }

  // Stage 21: ARK4_SYS (INST_DEC + ARK4_CORE + COND_PC = 479 NAND)
  {
    const st = getStageById('stage_21');
    const c = buildCircuit(
      st,
      [
        { id: 'idec', type: 'INST_DEC' },
        { id: 'cpu', type: 'ARK4_CORE' },
        { id: 'cpc', type: 'COND_PC' },
      ],
      [
        // I0..1 -> INST_DEC
        [inp(0), np('idec', 0)], [inp(1), np('idec', 1)],
        // IMM0..3 -> ARK4_CORE.IMM0..3 & COND_PC.J0..3
        [inp(2), np('cpu', 0)], [inp(3), np('cpu', 1)], [inp(4), np('cpu', 2)], [inp(5), np('cpu', 3)],
        [inp(2), np('cpc', 4)], [inp(3), np('cpc', 5)], [inp(4), np('cpc', 6)], [inp(5), np('cpc', 7)],
        // INST_DEC -> ARK4_CORE (OP, SET, WE) & COND_PC (BR)
        [np('idec', 0), np('cpu', 4)],
        [np('idec', 1), np('cpu', 5)],
        [np('idec', 2), np('cpu', 6)],
        [np('idec', 3), np('cpc', 8)],
        // CLK -> ARK4_CORE.CLK & COND_PC.CLK
        [inp(6), np('cpu', 7)],
        [inp(6), np('cpc', 9)],
        // ARK4_CORE.ACC0..3 -> out(0..3) & COND_PC.V0..3
        [np('cpu', 0), out(0)], [np('cpu', 1), out(1)], [np('cpu', 2), out(2)], [np('cpu', 3), out(3)],
        [np('cpu', 0), np('cpc', 0)], [np('cpu', 1), np('cpc', 1)], [np('cpu', 2), np('cpc', 2)], [np('cpu', 3), np('cpc', 3)],
        // COND_PC.PC0..3 -> out(4..7)
        [np('cpc', 0), out(4)], [np('cpc', 1), out(5)], [np('cpc', 2), out(6)], [np('cpc', 3), out(7)],
      ]
    );
    const res = evaluateStage(st, c, customChips);
    assert.equal(res.passed, true, `Stage 21 (ARK4_SYS) failed: ${JSON.stringify(res)}`);
    assert.equal(res.metrics.nandCount, 479);
    registerChip(customChips, st, c);
  }
});

test('Detects unstable ring oscillator (NAND output looped directly to both inputs)', () => {
  const st = getStageById('stage_01');
  const c = buildCircuit(st, [{ id: 'osc', type: 'NAND' }], [
    [np('osc', 0), np('osc', 0)],
    [np('osc', 0), np('osc', 1)],
    [np('osc', 0), out(0)],
  ]);
  const sim = compileCircuit(c, {});
  const res = sim.evaluate([0]);
  assert.equal(res.unstable, true);

  const evalRes = evaluateStage(st, c, {});
  assert.equal(evalRes.passed, false);
  assert.equal(evalRes.unstable, true);
});

test('Rejects unauthorized chips including physical SW/PULL in Stage 01 (strict bottom-up rule)', () => {
  const st = getStageById('stage_01'); // Stage 01 only allows NAND
  const fakeChips = {
    NOT: { id: 'NOT', inputs: ['IN'], outputs: ['OUT'], circuit: createEmptyCircuit(['IN'], ['OUT']) },
  };
  const c = buildCircuit(st, [{ id: 'cheat', type: 'NOT' }], [
    [inp(0), np('cheat', 0)],
    [np('cheat', 0), out(0)],
  ]);
  const res = evaluateStage(st, c, fakeChips);
  assert.equal(res.passed, false);
  assert.match(res.error, /使用できない部品/);

  // Physical PULL cannot be used in Stage 01 either
  const cPhys = buildCircuit(st, [{ id: 'p', type: 'PULL' }], [
    [inp(0), np('p', 0)],
    [np('p', 0), out(0)],
  ]);
  const resPhys = evaluateStage(st, cPhys, {});
  assert.equal(resPhys.passed, false);
  assert.match(resPhys.error, /使用できない部品/);
});

test('Auto-migrates legacy pre-Stage-00 save to Stage 00 with empty seenTheaterStages', () => {
  const prevStorage = globalThis.localStorage;
  const store = new Map([
    [
      'silicon_genesis_save_v1',
      JSON.stringify({
        version: 1,
        currentStageId: 'stage_01',
        clearedStages: [],
        seenPrologue: true,
        seenIntroStages: ['stage_01'],
      }),
    ],
  ]);
  globalThis.localStorage = {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, v),
    removeItem: (k) => store.delete(k),
  };
  try {
    const save = loadSaveData();
    assert.equal(save.currentStageId, 'stage_00a');
    assert.deepEqual(save.seenTheaterStages, []);
  } finally {
    globalThis.localStorage = prevStorage;
  }
});

test('Story Glossary tokenizer: longest-match, ASCII boundaries, round-trip preservation & valid related links', () => {
  // 1. No false positives inside English words like WORLD or AETHER-IX, nor 'リレー' inside 'バトンリレー'/'バケツリレー'
  const noFalsePos = tokenizeGlossaryText('送信電文："HELLO, WORLD." AETHER-IX はバトンリレーとバケツリレーで起動した。');
  assert.equal(noFalsePos.some((t) => t.type === 'term'), false);

  // 2. Longest-match compound terms (including アース0 and 1ビット金庫)
  const compound = tokenizeGlossaryText('P型シリコンとMOSFETトランジスタとNANDゲートと電磁パルス（EMP）とアース0と1ビット金庫');
  const termIds = compound.filter((t) => t.type === 'term').map((t) => [t.text, t.termId]);
  assert.deepEqual(termIds, [
    ['P型シリコン', 'p_silicon'],
    ['MOSFETトランジスタ', 'transistor'],
    ['NANDゲート', 'nand'],
    ['電磁パルス（EMP）', 'emp'],
    ['アース0', 'earth'],
    ['1ビット金庫', 'd_latch'],
  ]);

  // 3. Round-trip preservation across EVERY dialogue line in Prologue & all 20 Stages
  let totalTermsHighlighted = 0;
  for (const step of PROLOGUE_STEPS) {
    const toks = tokenizeGlossaryText(step.text);
    assert.equal(toks.map((t) => t.text).join(''), step.text);
    totalTermsHighlighted += toks.filter((t) => t.type === 'term').length;
  }
  const animKeys = new Set();
  for (const st of STAGES) {
    for (const line of [...(st.introDialogue || []), ...(st.outroDialogue || [])]) {
      const toks = tokenizeGlossaryText(line.text);
      assert.equal(toks.map((t) => t.text).join(''), line.text);
      totalTermsHighlighted += toks.filter((t) => t.type === 'term').length;
      if (line.visualCard?.anim) animKeys.add(line.visualCard.anim);
    }
  }
  assert.ok(totalTermsHighlighted >= 60, `Expected rich glossary coverage, got ${totalTermsHighlighted}`);
  assert.ok(animKeys.size >= 30, `Expected 30+ distinct live story & goal diagrams across all 20 stages, got ${animKeys.size}`);

  // 4. Every module in MODULE_ENCYCLOPEDIA_IDS exists and has a live animated diagram (`anim`)
  assert.equal(MODULE_ENCYCLOPEDIA_IDS.length, 26);
  for (const modId of MODULE_ENCYCLOPEDIA_IDS) {
    const entry = getGlossaryTerm(modId);
    assert.ok(entry, `Missing module encyclopedia entry '${modId}'`);
    assert.ok(entry.anim, `Module encyclopedia entry '${modId}' is missing live diagram 'anim'`);
  }

  // 5. excludeTermId prevents self-linking inside a term's own explanation
  const selfExcluded = tokenizeGlossaryText('NANDの後ろにNOTをつないでANDゲートを作る', 'and_gate');
  const linkedIds = selfExcluded.filter((t) => t.type === 'term').map((t) => t.termId);
  assert.deepEqual(linkedIds, ['nand', 'not_gate']);

  // 6. Progression lock: story vocabulary for reached stages is freely browsable,
  //    while unacquired stage-clear modules & diagrams stay strictly locked until cleared!
  const freshSave = { currentStageId: 'stage_00a', clearedStages: [] };
  assert.equal(isGlossaryTermUnlocked('emp', freshSave), true);
  assert.equal(isGlossaryTermUnlocked('relay', freshSave), true);
  assert.equal(isGlossaryTermUnlocked('insulator', freshSave), true);
  assert.equal(isGlossaryTermUnlocked('p_silicon', freshSave), true);   // Reached stage 00-A vocabulary
  assert.equal(isGlossaryTermUnlocked('n_silicon', freshSave), true);   // Reached stage 00-A vocabulary
  assert.equal(isGlossaryTermUnlocked('binary', freshSave), false);     // Not yet reached stage 05
  assert.equal(isGlossaryTermUnlocked('clock', freshSave), false);      // Not yet reached stage 13
  assert.equal(isGlossaryTermUnlocked('transistor', freshSave), false); // Locked until 00-A cleared!
  assert.equal(isGlossaryTermUnlocked('pullup', freshSave), false);     // Locked until 00-B cleared!
  assert.equal(isGlossaryTermUnlocked('short_circuit', freshSave), false); // Locked until 00-B cleared!
  assert.equal(isGlossaryTermUnlocked('not_gate', freshSave), false);   // Locked until 01 cleared!
  assert.equal(isGlossaryDiagramUnlocked('nand', freshSave), false);    // NAND diagram locked until 00-C cleared!
  for (const modId of MODULE_ENCYCLOPEDIA_IDS) {
    assert.equal(isModuleEncyclopediaUnlocked(modId, freshSave), false, `Module '${modId}' should be locked on fresh save`);
  }

  // Tokenizer with freshSave only links unlocked terms (no spoilers!)
  const lockedToks = tokenizeGlossaryText('P型シリコンでMOSFETトランジスタとNOTゲートを作る', null, freshSave);
  assert.deepEqual(
    lockedToks.filter((t) => t.type === 'term').map((t) => t.termId),
    ['p_silicon']
  );

  // After clearing 00-A, 00-B, 00-C, 01: those modules unlock while Stage 02 (AND) remains locked!
  const midSave = {
    currentStageId: 'stage_02',
    clearedStages: ['stage_00a', 'stage_00b', 'stage_00', 'stage_01'],
  };
  assert.equal(isModuleEncyclopediaUnlocked('transistor', midSave), true);
  assert.equal(isModuleEncyclopediaUnlocked('nand', midSave), true);
  assert.equal(isModuleEncyclopediaUnlocked('not_gate', midSave), true);
  assert.equal(isModuleEncyclopediaUnlocked('and_gate', midSave), false); // Current stage target still locked!
  assert.equal(isGlossaryTermUnlocked('and_gate', midSave), false);

  // 7. Every related term link resolves cleanly, and bidirectional Module <-> CS History links are complete
  for (const term of Object.values(GLOSSARY_TERMS)) {
    for (const relId of term.related || []) {
      assert.ok(getGlossaryTerm(relId), `Missing related glossary term '${relId}' in '${term.id}'`);
    }
  }
  for (const modId of MODULE_ENCYCLOPEDIA_IDS) {
    const mod = getGlossaryTerm(modId);
    assert.ok(typeof mod.act === 'number', `Module '${modId}' missing numeric act`);
    assert.ok(Array.isArray(mod.codexIds) && mod.codexIds.length > 0, `Module '${modId}' missing codexIds`);
    for (const cid of mod.codexIds) {
      assert.ok(CODEX_ENTRIES[cid], `Module '${modId}' references unknown codexId '${cid}'`);
    }
  }
  for (const codexId of Object.keys(CODEX_ENTRIES)) {
    const linkedMods = getModulesForCodexId(codexId);
    assert.ok(linkedMods.length > 0, `CS History Codex entry '${codexId}' has no linked modules`);
  }
  for (const st of STAGES) {
    if (st.rewardChip?.id) {
      const chipTerm = getGlossaryTermForChip(st.rewardChip.id);
      assert.ok(chipTerm && chipTerm.anim, `Reward chip '${st.rewardChip.id}' missing glossary term or anim`);
    }
    // No stage revealedTitle or hint should leak raw internal chip IDs like MUX_4BIT or DEC_2TO4
    for (const rawId of ['HALF_ADDER', 'FULL_ADDER', 'ADD_4BIT', 'MUX_4BIT', 'DEC_2TO4', 'REG_4BIT', 'ALU_4BIT', 'PC_4BIT']) {
      assert.ok(!st.revealedTitle.includes(rawId), `Stage ${st.code} revealedTitle contains internal ID '${rawId}'`);
    }
  }
});

test('Priority 1 & 3: Stages 22-24 execute on compiled ARK4_SYS hardware, accept valid alternative programs, and propagate lower-level chip edits', () => {
  const customChips = {};
  provisionStandardChips(customChips, { includeChapter2Hardware: true, provisioned: false });

  // 1. Stage 22: Both standard order (LDI 5 -> ADD 7 -> SUB 4) and alternative order (LDI 5 -> SUB 4 -> ADD 7) pass on real ARK4_SYS!
  const st22 = getStageById('stage_22');
  const res22Std = evaluateRomStage(
    st22,
    { line_0: 'ASM_LDI_5', line_1: 'ASM_ADD_7', line_2: 'ASM_SUB_4' },
    customChips
  );
  assert.equal(res22Std.passed, true, `Stage 22 standard order failed: ${JSON.stringify(res22Std)}`);
  assert.deepEqual(res22Std.trace.map((t) => [t.accBefore, t.acc, t.pc, t.pcNext]), [
    [0, 5, 0, 1],
    [5, 12, 1, 2],
    [12, 8, 2, 3],
  ]);

  const res22Alt = evaluateRomStage(
    st22,
    { line_0: 'ASM_LDI_5', line_1: 'ASM_SUB_4', line_2: 'ASM_ADD_7' },
    customChips
  );
  assert.equal(res22Alt.passed, true, `Stage 22 valid alternative order (5-4+7=8) should pass: ${JSON.stringify(res22Alt)}`);
  assert.deepEqual(res22Alt.trace.map((t) => [t.accBefore, t.acc, t.pc, t.pcNext]), [
    [0, 5, 0, 1],
    [5, 1, 1, 2],
    [1, 8, 2, 3],
  ]);

  // Invalid order on Stage 22 (starting with ADD 7 instead of setting base pressure 5 at 0番地) is rejected with specific address reason
  const res22Bad = evaluateRomStage(
    st22,
    { line_0: 'ASM_ADD_7', line_1: 'ASM_LDI_5', line_2: 'ASM_SUB_4' },
    customChips
  );
  assert.equal(res22Bad.passed, false);
  assert.match(res22Bad.error, /0番地/);

  // 2. Stage 23: Both (LDI 3 -> ADD 3 -> ADD 6 -> SUB 12) and (LDI 3 -> ADD 6 -> ADD 3 -> SUB 12) pass!
  const st23 = getStageById('stage_23');
  const res23Std = evaluateRomStage(
    st23,
    { line_0: 'ASM_LDI_3', line_1: 'ASM_ADD_3', line_2: 'ASM_ADD_6', line_3: 'ASM_SUB_12' },
    customChips
  );
  assert.equal(res23Std.passed, true, `Stage 23 standard failed: ${JSON.stringify(res23Std)}`);
  assert.equal(res23Std.trace[res23Std.trace.length - 1].pcNext, 6);

  const res23Alt = evaluateRomStage(
    st23,
    { line_0: 'ASM_LDI_3', line_1: 'ASM_ADD_6', line_2: 'ASM_ADD_3', line_3: 'ASM_SUB_12' },
    customChips
  );
  assert.equal(res23Alt.passed, true, `Stage 23 alternative (3+6+3=12) should pass: ${JSON.stringify(res23Alt)}`);

  // 3. Stage 24: Countdown loop (3 -> 2 -> 1 -> 0 -> JZ 4 -> LDI 15) passes through compiled ARK4_SYS + external RET=1 pull-down
  const st24 = getStageById('stage_24');
  const validSlots24 = {
    line_0: 'ASM_LDI_3',
    line_1: 'ASM_SUB_1',
    line_2: 'ASM_JZ_4',
    line_4: 'ASM_LDI_15',
  };
  const res24 = evaluateRomStage(st24, validSlots24, customChips);
  assert.equal(res24.passed, true, `Stage 24 failed: ${JSON.stringify(res24)}`);
  assert.equal(res24.trace.length, 10);
  assert.deepEqual(
    res24.trace.map((t) => [t.pc, t.opName, t.accBefore, t.acc, t.pcNext]),
    [
      [0, 'LDI 3', 0, 3, 1],
      [1, 'SUB 1', 3, 2, 2],
      [2, 'JZ 4', 2, 2, 3],
      [3, 'LOOP 1', 2, 2, 1],
      [1, 'SUB 1', 2, 1, 2],
      [2, 'JZ 4', 1, 1, 3],
      [3, 'LOOP 1', 1, 1, 1],
      [1, 'SUB 1', 1, 0, 2],
      [2, 'JZ 4', 0, 0, 4],
      [4, 'LDI 15', 0, 15, 5],
    ]
  );

  // Stage 24 rejects a shortcut that puts LDI 15 at 0番地 without executing the countdown loop
  const res24Shortcut = evaluateRomStage(
    st24,
    { line_0: 'ASM_LDI_15', line_1: 'ASM_SUB_1', line_2: 'ASM_JZ_4', line_4: 'ASM_LDI_3' },
    customChips
  );
  assert.equal(res24Shortcut.passed, false);
  assert.match(res24Shortcut.error, /カウントダウン/);

  // 4. Lower-level custom chip mutation propagation proof:
  //    a) Disconnect S0 output wire inside lower-level chip ADD_4BIT -> propagates up through ALU_4BIT -> ARK4_CORE -> ARK4_SYS and changes Stage 22 & 24 outputs!
  const mutatedAddChips = { ...customChips };
  const brokenAddCircuit = cloneCircuit(customChips.ADD_4BIT.circuit);
  brokenAddCircuit.wires = brokenAddCircuit.wires.filter(
    (w) => !(w.to.kind === 'output' && w.to.pin === 0)
  );
  mutatedAddChips.ADD_4BIT = { ...customChips.ADD_4BIT, circuit: brokenAddCircuit };

  const res22BrokenAdd = evaluateRomStage(
    st22,
    { line_0: 'ASM_LDI_5', line_1: 'ASM_ADD_7', line_2: 'ASM_SUB_4' },
    mutatedAddChips
  );
  assert.equal(res22BrokenAdd.passed, false, 'Broken lower-level ADD_4BIT must cause Stage 22 to fail');
  const res24BrokenAdd = evaluateRomStage(st24, validSlots24, mutatedAddChips);
  assert.equal(res24BrokenAdd.passed, false, 'Broken lower-level ADD_4BIT must propagate to Stage 24 countdown');

  //    b) Break ZERO_4BIT (remove final NOT inversion wire so Z is always 0) -> propagates through COND_PC -> ARK4_SYS and prevents JZ 4 from breaking out of the loop!
  const mutatedZeroChips = { ...customChips };
  const brokenZeroCircuit = cloneCircuit(customChips.ZERO_4BIT.circuit);
  brokenZeroCircuit.wires = [];
  mutatedZeroChips.ZERO_4BIT = { ...customChips.ZERO_4BIT, circuit: brokenZeroCircuit };

  const res24BrokenZero = evaluateRomStage(st24, validSlots24, mutatedZeroChips);
  assert.equal(res24BrokenZero.passed, false, 'Broken lower-level ZERO_4BIT must prevent Stage 24 JZ breakout');
});

test('Priority 2: Stage 07 exhaustive 512-combination check catches counterexamples & reproduceDiagnosticState restores sequential failure states', () => {
  const customChips = {};
  provisionStandardChips(customChips, { includeChapter2Hardware: false, provisioned: false });

  // 1. Stage 07: Build a sneaky buggy 4-bit adder that passes ALL 9 representative tests
  //    but flips S0 when (A1=1, A0=0, B1=1, B0=0), e.g., A=2, B=2, CIN=0!
  const st07 = getStageById('stage_07');
  const sneakyAdd4 = cloneCircuit(customChips.ADD_4BIT.circuit);
  sneakyAdd4.nodes.push(
    { id: 'na0', type: 'NOT', x: 100, y: 100 },
    { id: 'nb0', type: 'NOT', x: 100, y: 140 },
    { id: 'pa', type: 'AND', x: 140, y: 100 },
    { id: 'pb', type: 'AND', x: 140, y: 140 },
    { id: 'trig', type: 'AND', x: 180, y: 120 },
    { id: 'corrupt', type: 'XOR', x: 220, y: 120 }
  );
  // Reroute fa0.SUM -> corrupt.A, trig -> corrupt.B, corrupt.OUT -> S0
  sneakyAdd4.wires = sneakyAdd4.wires.filter((w) => !(w.to.kind === 'output' && w.to.pin === 0));
  let swid = 900;
  for (const [from, to] of [
    [inp(0), np('na0', 0)],
    [inp(4), np('nb0', 0)],
    [inp(1), np('pa', 0)], [np('na0', 0), np('pa', 1)],
    [inp(5), np('pb', 0)], [np('nb0', 0), np('pb', 1)],
    [np('pa', 0), np('trig', 0)], [np('pb', 0), np('trig', 1)],
    [np('fa0', 0), np('corrupt', 0)], [np('trig', 0), np('corrupt', 1)],
    [np('corrupt', 0), out(0)],
  ]) {
    sneakyAdd4.wires.push({ id: `sw${swid++}`, from, to });
  }
  const eval07 = evaluateStage(st07, sneakyAdd4, customChips);
  assert.equal(eval07.passed, false, 'Sneaky adder passing only 9 representative cases must fail 512-check');
  assert.equal(eval07.passedCount, 9, 'All 9 representative cases pass');
  const ceIdx = eval07.results.findIndex((r) => r.isCounterexample);
  assert.equal(ceIdx, 9, 'Counterexample appended as 10th diagnostic row');
  assert.ok(eval07.error && eval07.error.includes('全512通り'), `Expected 512-check error, got: ${eval07.error}`);
  // Reproduce the dynamically discovered counterexample on the workbench!
  const diag07 = reproduceDiagnosticState(st07, sneakyAdd4, customChips, eval07, ceIdx);
  assert.deepEqual(diag07.simulator.getOutputs(), eval07.results[ceIdx].actual);
  assert.notDeepEqual(diag07.simulator.getOutputs(), eval07.results[ceIdx].expected);

  // 2. Sequential circuit diagnostic reproduction: build a buggy PC_4BIT where JMP is ignored (MUX_4BIT SEL not connected),
  //    so steps ①..④ (0 -> 1 -> 2 -> 3) pass by wrap-around +1, and step ⑤ (J=10, JMP=1 -> expected 10, actual 4) fails!
  const st16 = getStageById('stage_16');
  const buggyPc = cloneCircuit(customChips.PC_4BIT.circuit);
  buggyPc.wires = buggyPc.wires.filter(
    (w) => !(w.from.kind === 'input' && w.from.pin === 4)
  );
  const eval16 = evaluateStage(st16, buggyPc, customChips);
  assert.equal(eval16.passed, false);
  const failStepIdx = eval16.results.findIndex((r) => !r.passed);
  assert.equal(failStepIdx, 4, 'Should pass steps 0..3 and fail at step 4 (JMP to 10)');

  // Reproduce step 4 on the workbench: must replay steps 0..4 so Q is 4 ([0,0,1,0]), NOT 0 or 1!
  const diag = reproduceDiagnosticState(st16, buggyPc, customChips, eval16, failStepIdx);
  assert.deepEqual(diag.simulator.getOutputs(), eval16.results[failStepIdx].actual);
  assert.deepEqual(diag.simulator.getOutputs(), [0, 0, 1, 0]); // 4 in little-endian binary
});

test('Chapter 2 unlock requires clearing Chapter 1 (Stage 17) while preserving legacy saves and provisioned chip metadata', () => {
  const customChips = {};
  provisionStandardChips(customChips, { includeChapter2Hardware: false, provisioned: false });
  const playerForgedNot = {
    ...customChips.NOT,
    provisioned: false,
    customTag: 'PLAYER_FORGED',
  };
  const midCh1Save = {
    currentStageId: 'stage_01',
    clearedStages: ['stage_00a', 'stage_00b', 'stage_00', 'stage_01'],
    customChips: {
      NAND: { ...customChips.NAND, provisioned: false },
      NOT: playerForgedNot,
    },
    chapter2Unlocked: true, // even a stale legacy flag must NOT bypass Chapter 1 clear requirement
  };

  // 1. Provisioning standard chips preserves player-forged NOT and marks missing chips as provisioned:true
  provisionStandardChips(midCh1Save.customChips, { includeChapter2Hardware: false, provisioned: true });
  assert.equal(midCh1Save.customChips.NOT.provisioned, false);
  assert.equal(midCh1Save.customChips.NOT.customTag, 'PLAYER_FORGED');
  assert.equal(midCh1Save.customChips.AND.provisioned, true);
  assert.equal(midCh1Save.customChips.ARK4_CORE.provisioned, true);

  // 2. Chapter 2 is strictly LOCKED until Stage 17 (Chapter 1 finale) is cleared!
  assert.equal(isChapter1Cleared(midCh1Save), false);
  assert.equal(isChapter2Unlocked(midCh1Save), false);
  assert.equal(isStageUnlocked(midCh1Save, 'stage_02'), true);
  assert.equal(isStageUnlocked(midCh1Save, 'stage_17'), false);
  assert.equal(isStageUnlocked(midCh1Save, 'stage_18'), false);
  assert.equal(isStageUnlocked(midCh1Save, 'stage_19'), false);

  // 3. Clearing Stage 17 immediately unlocks Chapter 2 (Stage 18), while Stage 19 still requires Stage 18
  const ch1ClearedSave = {
    ...midCh1Save,
    clearedStages: [
      'stage_00a', 'stage_00b', 'stage_00', 'stage_01', 'stage_02', 'stage_03', 'stage_04',
      'stage_05', 'stage_06', 'stage_07', 'stage_08', 'stage_09', 'stage_10', 'stage_11',
      'stage_12', 'stage_13', 'stage_14', 'stage_15', 'stage_16', 'stage_17',
    ],
  };
  assert.equal(isChapter1Cleared(ch1ClearedSave), true);
  assert.equal(isChapter2Unlocked(ch1ClearedSave), true);
  assert.equal(isStageUnlocked(ch1ClearedSave, 'stage_18'), true);
  assert.equal(isStageUnlocked(ch1ClearedSave, 'stage_19'), false);

  // 4. Legacy save compatibility:
  //    a) Normal legacy saves keep all customChips, drafts, and progress intact.
  //    b) Saves previously parked on locked stage_18 without clearing stage_17 cleanly migrate to their next unlocked stage.
  const prevStorage = globalThis.localStorage;
  const legacyPayload = {
    version: 1,
    currentStageId: 'stage_05',
    clearedStages: ['stage_00a', 'stage_00b', 'stage_00', 'stage_01', 'stage_02', 'stage_03', 'stage_04'],
    customChips: {
      NOT: { id: 'NOT', name: 'NOT', inputs: ['IN'], outputs: ['OUT'], circuit: customChips.NOT.circuit, nandCount: 1 },
    },
    drafts: {
      stage_05: { inputs: ['A', 'B'], outputs: ['SUM', 'CARRY'], nodes: [{ id: 'd1', type: 'XOR', x: 200, y: 120 }], wires: [] },
    },
    unlockedCodex: ['nand_universality', 'not_gate'],
    seenPrologue: true,
  };
  const store = new Map([['silicon_genesis_save_v1', JSON.stringify(legacyPayload)]]);
  globalThis.localStorage = {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, v),
    removeItem: (k) => store.delete(k),
  };
  try {
    const loaded = loadSaveData();
    assert.equal(loaded.currentStageId, 'stage_05');
    assert.deepEqual(loaded.clearedStages, legacyPayload.clearedStages);
    assert.equal(loaded.customChips.NOT.provisioned, undefined);
    assert.equal(loaded.drafts.stage_05.nodes.length, 1);
    assert.equal(isStageUnlocked(loaded, 'stage_05'), true);
    assert.equal(isStageUnlocked(loaded, 'stage_18'), false);
    assert.equal(isChapter2Unlocked(loaded), false);

    // Save parked on locked stage_18 without clearing stage_17 falls back cleanly to stage_05
    store.set('silicon_genesis_save_v1', JSON.stringify({ ...legacyPayload, currentStageId: 'stage_18', chapter2Unlocked: true }));
    const migrated = loadSaveData();
    assert.equal(migrated.currentStageId, 'stage_05');
    assert.equal(isChapter2Unlocked(migrated), false);
  } finally {
    globalThis.localStorage = prevStorage;
  }
});

test('v29 Mobile Audio Lifecycle: uses ambient audioSession, zero <audio> hijack, suspends on background & stays idle when muted', async () => {
  const { sound } = await import('../src/audio/sound.js');
  let suspendedCount = 0;
  let resumedCount = 0;
  let ctxCreatedCount = 0;
  const fakeAudioSession = { type: 'auto' };

  const prevAudioCtx = globalThis.AudioContext;
  const prevNavDesc = Object.getOwnPropertyDescriptor(globalThis, 'navigator');

  class MockAudioContext {
    constructor() {
      ctxCreatedCount++;
      this.state = 'running';
      this.currentTime = 0;
      this.destination = {};
    }
    createGain() {
      return {
        gain: {
          value: 1,
          setValueAtTime() {},
          setTargetAtTime() {},
          linearRampToValueAtTime() {},
          exponentialRampToValueAtTime() {},
          cancelScheduledValues() {},
        },
        connect() {},
        disconnect() {},
      };
    }
    createOscillator() {
      return {
        type: 'sine',
        frequency: { value: 440, setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} },
        detune: { setValueAtTime() {} },
        connect() {},
        start() {},
        stop() {},
      };
    }
    createBiquadFilter() {
      return {
        type: 'lowpass',
        Q: { value: 1 },
        frequency: { value: 800, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} },
        connect() {},
      };
    }
    createDelay() {
      return { delayTime: { value: 0.3 }, connect() {} };
    }
    createDynamicsCompressor() {
      return { threshold: { value: 0 }, knee: { value: 0 }, ratio: { value: 1 }, connect() {} };
    }
    createBuffer() {
      return {};
    }
    createBufferSource() {
      return { buffer: null, connect() {}, start() {} };
    }
    suspend() {
      suspendedCount++;
      this.state = 'suspended';
      return Promise.resolve();
    }
    resume() {
      resumedCount++;
      this.state = 'running';
      return Promise.resolve();
    }
  }

  globalThis.AudioContext = MockAudioContext;
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { audioSession: fakeAudioSession },
  });

  try {
    // 1. When muted (both BGM and SE off), unlock() must NOT wake AudioContext or touch audioSession
    sound.ctx = null;
    sound._unlocked = false;
    sound._pageHidden = false;
    sound.setBgmEnabled(false);
    sound.setEnabled(false);
    sound.unlock();
    assert.equal(ctxCreatedCount, 0, 'Muted engine must not create AudioContext on tap');
    assert.equal(fakeAudioSession.type, 'auto', 'Muted engine must not touch audioSession');

    // 2. Enabling audio uses 'ambient' (coexists with Spotify/Apple Music) and never uses HTML5 <audio>
    sound.setEnabled(true);
    sound.setBgmEnabled(true);
    sound.setBgmTrack('workbench');
    sound.unlock();
    assert.equal(fakeAudioSession.type, 'ambient', 'Must use ambient audioSession, never exclusive playback');
    assert.equal('_silentAudio' in sound, false, 'Must not instantiate HTML5 <audio> silencer');
    assert.ok(sound._bgmTimer !== null, 'BGM timer should be active while visible and enabled');

    // 3. Backgrounding immediately stops BGM timer and suspends AudioContext
    sound.suspendForBackground();
    assert.equal(sound._bgmTimer, null, 'BGM timer must stop immediately on background');
    assert.equal(sound.ctx.state, 'suspended', 'AudioContext must suspend immediately on background');
    assert.ok(suspendedCount >= 1);

    // 4. Returning to foreground resumes cleanly
    sound.resumeFromForeground();
    await Promise.resolve();
    assert.equal(sound.ctx.state, 'running', 'AudioContext should resume on foreground');
    assert.ok(resumedCount >= 1);

    // 5. Muting both BGM & SE immediately stops timer and suspends AudioContext so external music plays undisturbed
    sound.setBgmEnabled(false);
    sound.setEnabled(false);
    assert.equal(sound._bgmTimer, null);
    assert.equal(sound.ctx.state, 'suspended');
    assert.equal(sound.getAudioMode(), 'muted');
  } finally {
    sound._stopBgmLoop();
    sound.stopDrone();
    sound.ctx = null;
    globalThis.AudioContext = prevAudioCtx;
    if (prevNavDesc) {
      Object.defineProperty(globalThis, 'navigator', prevNavDesc);
    }
  }
});

test('v33 Free-Form ARK-4 Assembler, Text Parser, Live INST_DEC Probe & Anti-Shortcut Spec Guards', () => {
  const customChips = {};
  provisionStandardChips(customChips, { includeChapter2Hardware: true, provisioned: false });

  // 1. parseAssemblyLine handles decimal, binary (0b), hex (0x), comments, and line prefixes
  const pDec = parseAssemblyLine('0: ldi 5 ; base pressure');
  assert.equal(pDec.ok, true);
  assert.equal(pDec.op, 'LDI');
  assert.equal(pDec.val, 5);
  assert.equal(pDec.part.opcodeBits, '00');
  assert.equal(pDec.part.immBits, '0101');

  const pBin = parseAssemblyLine('4: LDI 0b1111 // open hatch');
  assert.equal(pBin.ok, true);
  assert.equal(pBin.val, 15);
  assert.equal(pBin.part.immBits, '1111');

  const pHex = parseAssemblyLine('SUB 0xC');
  assert.equal(pHex.ok, true);
  assert.equal(pHex.op, 'SUB');
  assert.equal(pHex.val, 12);
  assert.equal(pHex.part.opcodeBits, '10');
  assert.equal(pHex.part.immBits, '1100');

  // Invalid syntax & out-of-range operands fail cleanly with Japanese errors
  const badOp = parseAssemblyLine('MOV 3');
  assert.equal(badOp.ok, false);
  assert.match(badOp.error, /不明な命令/);

  const badRange = parseAssemblyLine('LDI 16');
  assert.equal(badRange.ok, false);
  assert.match(badRange.error, /0〜15/);

  // 2. Live INST_DEC probe reflects compiled hardware control wires for every opcode
  const hw = compileRomHardware(customChips);
  const dLdi = probeInstructionDecode(hw, makeInstructionPart('LDI', 3));
  assert.deepEqual([dLdi.i1, dLdi.i0, dLdi.opFlag, dLdi.setFlag, dLdi.weFlag, dLdi.brFlag], [0, 0, 0, 1, 1, 0]);
  const dSub = probeInstructionDecode(hw, makeInstructionPart('SUB', 1));
  assert.deepEqual([dSub.i1, dSub.i0, dSub.opFlag, dSub.setFlag, dSub.weFlag, dSub.brFlag], [1, 0, 1, 0, 1, 0]);
  const dJz = probeInstructionDecode(hw, makeInstructionPart('JZ', 4));
  assert.deepEqual([dJz.i1, dJz.i0, dJz.opFlag, dJz.setFlag, dJz.weFlag, dJz.brFlag], [1, 1, 0, 0, 0, 1]);

  // 3. Stage 24 raw assembly source text assembles cleanly, protects locked line 3, and clears on real ARK4_SYS!
  const st24 = getStageById('stage_24');
  const raw24 = [
    '0: LDI 3      ; 初期値',
    '1: SUB 1      ; 1減らす',
    '2: JZ 4       ; 0なら4番地へ',
    '3: LOOP 1     ; 固定回路',
    '4: LDI 0b1111 ; 大ハッチ全開!',
  ].join('\n');
  const asm24 = assembleProgramText(raw24, st24);
  assert.equal(asm24.ok, true, `Expected Stage 24 assembly to parse cleanly: ${JSON.stringify(asm24)}`);
  const eval24 = evaluateRomStage(st24, asm24.slots, customChips);
  assert.equal(eval24.passed, true, `Assembled Stage 24 text failed hardware eval: ${JSON.stringify(eval24)}`);
  assert.equal(eval24.trace.length, 10);

  // Format -> re-assemble round-trip preserves valid program
  const formatted24 = formatProgramText(st24, asm24.slots);
  const roundTrip24 = assembleProgramText(formatted24, st24);
  assert.equal(roundTrip24.ok, true);
  assert.deepEqual(roundTrip24.slots, asm24.slots);

  // Attempting to overwrite locked line 3 in text mode yields a clear error
  const badLocked = assembleProgramText('0: LDI 3\n1: SUB 1\n2: JZ 4\n3: ADD 1\n4: LDI 15', st24);
  assert.equal(badLocked.ok, false);
  assert.match(badLocked.errors[0].message, /固定命令/);

  // 4. Anti-shortcut spec checks on Stage 22 & Stage 23
  const st22 = getStageById('stage_22');
  const cheat22 = evaluateRomStage(st22, { line_0: 'LDI 5', line_1: 'LDI 8', line_2: 'ADD 0' }, customChips);
  assert.equal(cheat22.passed, false);
  assert.match(cheat22.error, /直接上書き/);
  const creative22 = evaluateRomStage(st22, { line_0: 'LDI 5', line_1: 'ADD 2', line_2: 'ADD 1' }, customChips);
  assert.equal(creative22.passed, true);

  const st23 = getStageById('stage_23');
  const cheat23Ldi12 = evaluateRomStage(
    st23,
    { line_0: 'LDI 12', line_1: 'ADD 0', line_2: 'ADD 0', line_3: 'SUB 12' },
    customChips
  );
  assert.equal(cheat23Ldi12.passed, false);
  assert.match(cheat23Ldi12.error, /直接代入/);

  const cheat23Ldi0 = evaluateRomStage(
    st23,
    { line_0: 'LDI 3', line_1: 'ADD 3', line_2: 'ADD 6', line_3: 'LDI 0' },
    customChips
  );
  assert.equal(cheat23Ldi0.passed, false);
  assert.match(cheat23Ldi0.error, /SUB 12/);
});
