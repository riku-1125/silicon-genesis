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
import { loadSaveData } from '../src/state/storage.js';
import { createEmptyCircuit, connectWire, computeCircuitMetrics } from '../src/engine/circuit.js';
import { compileCircuit } from '../src/engine/simulator.js';
import { evaluateStage } from '../src/engine/evaluator.js';

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

test('Full 20-stage campaign: circuit stages 00-C (NAND) through 17 (ARK-4 CPU) compile and pass bottom-up', () => {
  assert.equal(STAGES.length, 20);
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
  // 1. No false positives inside English words like WORLD or AETHER-IX
  const noFalsePos = tokenizeGlossaryText('送信電文："HELLO, WORLD." AETHER-IX は起動した。');
  assert.equal(noFalsePos.some((t) => t.type === 'term'), false);

  // 2. Longest-match compound terms
  const compound = tokenizeGlossaryText('P型シリコンとMOSFETトランジスタとNANDゲートと電磁パルス（EMP）');
  const termIds = compound.filter((t) => t.type === 'term').map((t) => [t.text, t.termId]);
  assert.deepEqual(termIds, [
    ['P型シリコン', 'p_silicon'],
    ['MOSFETトランジスタ', 'transistor'],
    ['NANDゲート', 'nand'],
    ['電磁パルス（EMP）', 'emp'],
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
  assert.equal(MODULE_ENCYCLOPEDIA_IDS.length, 21);
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
  }
});
