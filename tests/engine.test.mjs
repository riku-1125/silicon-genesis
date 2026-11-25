import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { STAGES, ACTS, getStageById } from '../src/data/stages.js';
import { CODEX_ENTRIES } from '../src/data/codex.js';
import { SYMBOL_CATALOG } from '../src/data/symbolReference.js';
import { PROLOGUE_STEPS } from '../src/data/prologue.js';
import {
  buildChapter1EndingSteps,
  buildChapter2EndingSteps,
  buildChapter3EndingSteps,
  buildChapter4EndingSteps,
  buildChapter5EndingSteps,
} from '../src/data/endings.js';
import { CHARACTERS, SCENES } from '../src/data/characters.js';
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
import {
  STORAGE_KEY,
  loadSaveData,
  persistSaveData,
  isStageUnlocked,
  isChapter1Cleared,
  isChapter2Unlocked,
  isChapter2Cleared,
  isChapter3Unlocked,
  isChapter3Cleared,
  isChapter4Unlocked,
  isChapter4Cleared,
  isChapter5Unlocked,
  isChapter5Cleared,
} from '../src/state/storage.js';
import { createEmptyCircuit, cloneCircuit, connectWire, computeCircuitMetrics } from '../src/engine/circuit.js';
import { compileCircuit } from '../src/engine/simulator.js';
import { evaluateStage, reproduceDiagnosticState } from '../src/engine/evaluator.js';
import { provisionStandardChips, buildBlueprintCircuit } from '../src/engine/blueprints.js';
import {
  ARK4_OPCODES,
  runRomProgram,
  evaluateRomStage,
  parseAssemblyLine,
  assembleProgramText,
  formatProgramText,
  compileRomHardware,
  resetRomHardware,
  buildRomRowMap,
  buildProgrammableRomCircuit,
  getRomFuseMatrix,
  probeInstructionDecode,
  makeInstructionPart,
} from '../src/engine/romRunner.js';
import {
  ARK8_OPCODES,
  assembleArk8ProgramText,
  formatArk8ProgramText,
  compileArk8Hardware,
  buildArk8RowMap,
  getArk8RomFuseMatrix,
  runArk8Program,
  evaluateArk8Stage,
} from '../src/engine/romRunner8.js';
import {
  ARK8_OS_OPCODES,
  MMIO_PORTS,
  parseArk8OsLine,
  assembleArk8OsProgramText,
  formatArk8OsProgramText,
  buildArk8OsRowMap,
  compileArk8OsHardware,
  runArk8OsProgram,
  evaluateArk8OsStage,
  getRamWriterAtStep,
} from '../src/engine/osHwRunner.js';
import { exportSiliconBlueprint } from '../src/engine/siliconExport.js';

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

test('Full 67-stage campaign (Ch.1 + Ch.2 + Ch.3 + Ch.4 + Ch.5): circuit stages 00-C (NAND) through 23 (ROM_4W) compile and pass bottom-up', () => {
  assert.equal(STAGES.length, 67);
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

  // Stage 19: COND_PC (ZERO_4BIT + NOT + AND + PC_4BIT = 229 NAND = 458 MOSFET + 229 PULL)
  {
    const st = getStageById('stage_19');
    const c = buildCircuit(
      st,
      [
        { id: 'z4', type: 'ZERO_4BIT' },
        { id: 'nz', type: 'NOT' },
        { id: 'and', type: 'AND' },
        { id: 'pc', type: 'PC_4BIT' },
      ],
      [
        [inp(0), np('z4', 0)], [inp(1), np('z4', 1)], [inp(2), np('z4', 2)], [inp(3), np('z4', 3)],
        [np('z4', 0), np('nz', 0)],
        [np('nz', 0), np('and', 0)], [inp(8), np('and', 1)],
        [inp(4), np('pc', 0)], [inp(5), np('pc', 1)], [inp(6), np('pc', 2)], [inp(7), np('pc', 3)],
        [np('and', 0), np('pc', 4)],
        [inp(9), np('pc', 5)],
        [np('pc', 0), out(0)], [np('pc', 1), out(1)], [np('pc', 2), out(2)], [np('pc', 3), out(3)],
      ]
    );
    const res = evaluateStage(st, c, customChips);
    assert.equal(res.passed, true, `Stage 19 (COND_PC) failed: ${JSON.stringify(res)}`);
    assert.equal(res.metrics.nandCount, 229);
    assert.equal(res.metrics.swCount, 458);
    assert.equal(res.metrics.pullCount, 229);
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
        [np('dec', 3), out(3)], // Y3 -> BR (JNZ)
      ]
    );
    const res = evaluateStage(st, c, customChips);
    assert.equal(res.passed, true, `Stage 20 (INST_DEC) failed: ${JSON.stringify(res)}`);
    assert.equal(res.metrics.nandCount, 11);
    registerChip(customChips, st, c);
  }

  // Stage 21: ARK4_SYS (INST_DEC + ARK4_CORE + COND_PC = 480 NAND = 960 MOSFET + 480 PULL)
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
    assert.equal(res.metrics.nandCount, 480);
    assert.equal(res.metrics.swCount, 960);
    assert.equal(res.metrics.pullCount, 480);
    registerChip(customChips, st, c);
  }

  // Stage 22: ASM_ENC (4->2 Command Key Encoder: LDI/ADD/SUB/JNZ -> 4 OR = 12 NAND)
  {
    const st = getStageById('stage_asm_enc');
    assert.deepEqual(st.inputs, ['LDI', 'ADD', 'SUB', 'JNZ']);
    const c = buildCircuit(
      st,
      [
        { id: 'oi0', type: 'OR' },
        { id: 'oi1', type: 'OR' },
        { id: 'ok1', type: 'OR' },
        { id: 'ok2', type: 'OR' },
      ],
      [
        [inp(1), np('oi0', 0)], [inp(3), np('oi0', 1)], [np('oi0', 0), out(0)],
        [inp(2), np('oi1', 0)], [inp(3), np('oi1', 1)], [np('oi1', 0), out(1)],
        [inp(0), np('ok1', 0)], [inp(1), np('ok1', 1)],
        [np('ok1', 0), np('ok2', 0)], [np('oi1', 0), np('ok2', 1)], [np('ok2', 0), out(2)],
      ]
    );
    const res = evaluateStage(st, c, customChips);
    assert.equal(res.passed, true, `Stage 22 (ASM_ENC) failed: ${JSON.stringify(res)}`);
    assert.equal(res.metrics.nandCount, 12);
    assert.equal(res.metrics.swCount, 24);
    assert.equal(res.metrics.pullCount, 12);
    registerChip(customChips, st, c);
  }

  // Stage 23: ROM_4W (4-Address Hardwired Program ROM: DEC_2TO4 + 4 OR = 22 NAND)
  {
    const st = getStageById('stage_rom_4w');
    const c = buildCircuit(
      st,
      [
        { id: 'dec', type: 'DEC_2TO4' },
        { id: 'oi0', type: 'OR' },
        { id: 'oi1', type: 'OR' },
        { id: 'om0', type: 'OR' },
        { id: 'om2', type: 'OR' },
      ],
      [
        [inp(0), np('dec', 0)], [inp(1), np('dec', 1)],
        [np('dec', 1), np('oi0', 0)], [np('dec', 3), np('oi0', 1)], [np('oi0', 0), out(0)],
        [np('dec', 2), np('oi1', 0)], [np('dec', 3), np('oi1', 1)], [np('oi1', 0), out(1)],
        [np('dec', 0), np('om0', 0)], [np('dec', 1), np('om0', 1)], [np('om0', 0), out(2)],
        [np('dec', 1), out(3)],
        [np('dec', 0), np('om2', 0)], [np('dec', 2), np('om2', 1)], [np('om2', 0), out(4)],
        [np('dec', 3), out(5)],
      ]
    );
    const res = evaluateStage(st, c, customChips);
    assert.equal(res.passed, true, `Stage 23 (ROM_4W) failed: ${JSON.stringify(res)}`);
    assert.equal(res.metrics.nandCount, 22);
    assert.equal(res.metrics.swCount, 44);
    assert.equal(res.metrics.pullCount, 22);
    registerChip(customChips, st, c);
  }
});

test('Detects unstable ring oscillator (both primitive NAND and physical MOSFET+PULL NAND)', () => {
  const st = getStageById('stage_01');
  const c = buildCircuit(st, [{ id: 'osc', type: 'NAND' }], [
    [np('osc', 0), np('osc', 0)],
    [np('osc', 0), np('osc', 1)],
    [np('osc', 0), out(0)],
  ]);
  const sim = compileCircuit(c, {});
  assert.equal(sim.isPhysicalSilicon, false);
  const res = sim.evaluate([0]);
  assert.equal(res.unstable, true);

  const evalRes = evaluateStage(st, c, {});
  assert.equal(evalRes.passed, false);
  assert.equal(evalRes.unstable, true);

  // Also verify oscillation detection on physical MOSFET+Resistor flattened NAND!
  const physChips = {};
  provisionStandardChips(physChips, { includeChapter2Hardware: false, provisioned: false });
  const physSim = compileCircuit(c, physChips);
  assert.equal(physSim.isPhysicalSilicon, true);
  assert.equal(physSim.swCount, 2);
  assert.equal(physSim.pullCount, 1);
  assert.equal(physSim.evaluate([0]).unstable, true);
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

test('v37 Clean v2 Silicon Save: ignores legacy v1 saves and cleanly persists/loads silicon_genesis_save_v2', () => {
  assert.equal(STORAGE_KEY, 'silicon_genesis_save_v2');
  const prevStorage = globalThis.localStorage;
  const store = new Map([
    [
      'silicon_genesis_save_v1',
      JSON.stringify({
        version: 1,
        currentStageId: 'stage_24',
        clearedStages: ['stage_00a', 'stage_01', 'stage_17', 'stage_21'],
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
    // Legacy v1 save is cleanly ignored (fresh v2 start for JNZ + physical silicon)
    const fresh = loadSaveData();
    assert.equal(fresh.version, 2);
    assert.equal(fresh.currentStageId, 'stage_00a');
    assert.deepEqual(fresh.clearedStages, []);
    assert.deepEqual(fresh.seenTheaterStages, []);

    // Persisting and reloading v2 save works cleanly
    fresh.clearedStages = ['stage_00a', 'stage_00b', 'stage_00'];
    fresh.currentStageId = 'stage_01';
    persistSaveData(fresh);
    const reloaded = loadSaveData();
    assert.equal(reloaded.version, 2);
    assert.equal(reloaded.currentStageId, 'stage_01');
    assert.deepEqual(reloaded.clearedStages, ['stage_00a', 'stage_00b', 'stage_00']);
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
  assert.equal(MODULE_ENCYCLOPEDIA_IDS.length, 62);
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

test('Priority 1 & 3: Stages 24-26 execute on unmodified 7-pin ARK4_SYS hardware with pure JNZ, accept valid alternatives, and propagate lower-level chip edits', () => {
  const customChips = {};
  provisionStandardChips(customChips, { includeChapter2Hardware: true, provisioned: false });

  // 1. Stage 24 (`stage_22`): Both standard order (LDI 5 -> ADD 7 -> SUB 4) and alternative order (LDI 5 -> SUB 4 -> ADD 7) pass on real ARK4_SYS!
  const st22 = getStageById('stage_22');
  const res22Std = evaluateRomStage(
    st22,
    { line_0: 'ASM_LDI_5', line_1: 'ASM_ADD_7', line_2: 'ASM_SUB_4' },
    customChips
  );
  assert.equal(res22Std.passed, true, `Stage 24 standard order failed: ${JSON.stringify(res22Std)}`);
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
  assert.equal(res22Alt.passed, true, `Stage 24 valid alternative order (5-4+7=8) should pass: ${JSON.stringify(res22Alt)}`);
  assert.deepEqual(res22Alt.trace.map((t) => [t.accBefore, t.acc, t.pc, t.pcNext]), [
    [0, 5, 0, 1],
    [5, 1, 1, 2],
    [1, 8, 2, 3],
  ]);

  // Invalid order on Stage 24 (starting with ADD 7 instead of setting base pressure 5 at 0番地) is rejected with specific address reason
  const res22Bad = evaluateRomStage(
    st22,
    { line_0: 'ASM_ADD_7', line_1: 'ASM_LDI_5', line_2: 'ASM_SUB_4' },
    customChips
  );
  assert.equal(res22Bad.passed, false);
  assert.match(res22Bad.error, /0番地/);

  // 2. Stage 25 (`stage_23`): 5 rows (0..3 editable + locked 4: JNZ 0). Both (LDI 3 -> ADD 3 -> ADD 6 -> SUB 12) and (LDI 3 -> ADD 6 -> ADD 3 -> SUB 12) pass through JNZ 0 with Z=1 -> PC=5!
  const st23 = getStageById('stage_23');
  const res23Std = evaluateRomStage(
    st23,
    { line_0: 'ASM_LDI_3', line_1: 'ASM_ADD_3', line_2: 'ASM_ADD_6', line_3: 'ASM_SUB_12' },
    customChips
  );
  assert.equal(res23Std.passed, true, `Stage 25 standard failed: ${JSON.stringify(res23Std)}`);
  assert.equal(res23Std.trace.length, 5);
  assert.equal(res23Std.trace[4].op, 'JNZ');
  assert.equal(res23Std.trace[4].zBefore, 1);
  assert.equal(res23Std.trace[4].jmpFired, false);
  assert.equal(res23Std.trace[4].pcNext, 5);

  const res23Alt = evaluateRomStage(
    st23,
    { line_0: 'ASM_LDI_3', line_1: 'ASM_ADD_6', line_2: 'ASM_ADD_3', line_3: 'ASM_SUB_12' },
    customChips
  );
  assert.equal(res23Alt.passed, true, `Stage 25 alternative (3+6+3=12) should pass: ${JSON.stringify(res23Alt)}`);

  // Mismatched calculation on Stage 25 causes locked 4: JNZ 0 to fire and loop back to 0番地 -> fails cleanly!
  const res23Mismatch = evaluateRomStage(
    st23,
    { line_0: 'ASM_LDI_3', line_1: 'ASM_ADD_3', line_2: 'ASM_ADD_5', line_3: 'ASM_SUB_12' },
    customChips
  );
  assert.equal(res23Mismatch.passed, false);
  assert.match(res23Mismatch.error, /2番地/);

  // 3. Stage 26 (`stage_24`): Pure 4-line hardware JNZ countdown loop (ZERO locked rows, ZERO external RET/LOOP!)
  const st24 = getStageById('stage_24');
  assert.equal(st24.asmProgramSpec.rows.length, 4);
  assert.equal(st24.asmProgramSpec.rows.some((r) => r.locked), false);
  const validSlots24 = {
    line_0: 'ASM_LDI_3',
    line_1: 'ASM_SUB_1',
    line_2: 'ASM_JNZ_1',
    line_3: 'ASM_LDI_15',
  };
  const res24 = evaluateRomStage(st24, validSlots24, customChips);
  assert.equal(res24.passed, true, `Stage 26 pure JNZ failed: ${JSON.stringify(res24)}`);
  assert.equal(res24.trace.length, 8);
  assert.deepEqual(
    res24.trace.map((t) => [t.pc, t.opName, t.accBefore, t.acc, t.pcNext]),
    [
      [0, 'LDI 3', 0, 3, 1],
      [1, 'SUB 1', 3, 2, 2],
      [2, 'JNZ 1', 2, 2, 1],
      [1, 'SUB 1', 2, 1, 2],
      [2, 'JNZ 1', 1, 1, 1],
      [1, 'SUB 1', 1, 0, 2],
      [2, 'JNZ 1', 0, 0, 3],
      [3, 'LDI 15', 0, 15, 4],
    ]
  );

  // Stage 26 rejects shortcuts that skip countdown (LDI 15 at 0番地 or SUB 3 skipping 2 & 1)
  const res24Shortcut = evaluateRomStage(
    st24,
    { line_0: 'ASM_LDI_15', line_1: 'ASM_SUB_1', line_2: 'ASM_JNZ_1', line_3: 'ASM_LDI_3' },
    customChips
  );
  assert.equal(res24Shortcut.passed, false);
  assert.match(res24Shortcut.error, /カウントダウン/);

  const res24SkipSub = evaluateRomStage(
    st24,
    { line_0: 'ASM_LDI_3', line_1: 'ASM_SUB_3', line_2: 'ASM_JNZ_1', line_3: 'ASM_LDI_15' },
    customChips
  );
  assert.equal(res24SkipSub.passed, false);
  assert.match(res24SkipSub.error, /カウントダウン/);

  // 4. Lower-level custom chip mutation propagation proof:
  //    a) Disconnect S0 output wire inside lower-level chip ADD_4BIT -> propagates up through ALU_4BIT -> ARK4_CORE -> ARK4_SYS and changes Stage 24 & 26 outputs!
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
  assert.equal(res22BrokenAdd.passed, false, 'Broken lower-level ADD_4BIT must cause Stage 24 to fail');
  const res24BrokenAdd = evaluateRomStage(st24, validSlots24, mutatedAddChips);
  assert.equal(res24BrokenAdd.passed, false, 'Broken lower-level ADD_4BIT must propagate to Stage 26 countdown');

  //    b) Break ZERO_4BIT (remove wires so Z is always 0 -> NOT(Z)=1 -> JNZ always jumps!) -> propagates through COND_PC -> ARK4_SYS and prevents JNZ 1 from exiting loop!
  const mutatedZeroChips = { ...customChips };
  const brokenZeroCircuit = cloneCircuit(customChips.ZERO_4BIT.circuit);
  brokenZeroCircuit.wires = [];
  mutatedZeroChips.ZERO_4BIT = { ...customChips.ZERO_4BIT, circuit: brokenZeroCircuit };

  const res24BrokenZero = evaluateRomStage(st24, validSlots24, mutatedZeroChips);
  assert.equal(res24BrokenZero.passed, false, 'Broken lower-level ZERO_4BIT must prevent Stage 26 JNZ breakout');
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

  // 2. Sequential circuit diagnostic reproduction: build a buggy PC_4BIT where JMP is masked by NOT(J3),
  //    so step ① (J=0, JMP=1 -> 0) and steps ②..④ (1 -> 2 -> 3) pass, while step ⑤ (J=10, JMP=1 -> expected 10, actual 4) fails!
  const st16 = getStageById('stage_16');
  const buggyPc = cloneCircuit(customChips.PC_4BIT.circuit);
  buggyPc.nodes.push(
    { id: 'bug_nj3', type: 'NOT', x: 100, y: 200 },
    { id: 'bug_mask', type: 'AND', x: 160, y: 200 }
  );
  buggyPc.wires = buggyPc.wires.filter(
    (w) => !(w.from.kind === 'input' && w.from.pin === 4)
  );
  buggyPc.wires.push(
    { id: 'bw1', from: inp(3), to: np('bug_nj3', 0) },
    { id: 'bw2', from: inp(4), to: np('bug_mask', 0) },
    { id: 'bw3', from: np('bug_nj3', 0), to: np('bug_mask', 1) },
    { id: 'bw4', from: np('bug_mask', 0), to: np('mx', 8) }
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

  // 4. v2 Save loading & locked stage redirection:
  const prevStorage = globalThis.localStorage;
  const v2Payload = {
    version: 2,
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
  const store = new Map([[STORAGE_KEY, JSON.stringify(v2Payload)]]);
  globalThis.localStorage = {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, v),
    removeItem: (k) => store.delete(k),
  };
  try {
    const loaded = loadSaveData();
    assert.equal(loaded.currentStageId, 'stage_05');
    assert.deepEqual(loaded.clearedStages, v2Payload.clearedStages);
    assert.equal(loaded.customChips.NOT.provisioned, undefined);
    assert.equal(loaded.drafts.stage_05.nodes.length, 1);
    assert.equal(isStageUnlocked(loaded, 'stage_05'), true);
    assert.equal(isStageUnlocked(loaded, 'stage_18'), false);
    assert.equal(isChapter2Unlocked(loaded), false);

    // Save parked on locked stage_18 without clearing stage_17 falls back cleanly to stage_05
    store.set(STORAGE_KEY, JSON.stringify({ ...v2Payload, currentStageId: 'stage_18', chapter2Unlocked: true }));
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

test('v37 Free-Form ARK-4 Assembler (JNZ ISA), Text Parser, Live INST_DEC Probe & Anti-Shortcut Spec Guards', () => {
  const customChips = {};
  provisionStandardChips(customChips, { includeChapter2Hardware: true, provisioned: false });

  // 1. parseAssemblyLine handles decimal, binary (0b), hex (0x), comments, and line prefixes
  const pDec = parseAssemblyLine('0: ldi 5 ; base pressure');
  assert.equal(pDec.ok, true);
  assert.equal(pDec.op, 'LDI');
  assert.equal(pDec.val, 5);
  assert.equal(pDec.part.opcodeBits, '00');
  assert.equal(pDec.part.immBits, '0101');

  const pBin = parseAssemblyLine('3: LDI 0b1111 // open hatch');
  assert.equal(pBin.ok, true);
  assert.equal(pBin.val, 15);
  assert.equal(pBin.part.immBits, '1111');

  const pHex = parseAssemblyLine('SUB 0xC');
  assert.equal(pHex.ok, true);
  assert.equal(pHex.op, 'SUB');
  assert.equal(pHex.val, 12);
  assert.equal(pHex.part.opcodeBits, '10');
  assert.equal(pHex.part.immBits, '1100');

  const pJnz = parseAssemblyLine('2: JNZ 1');
  assert.equal(pJnz.ok, true);
  assert.equal(pJnz.op, 'JNZ');
  assert.equal(pJnz.val, 1);
  assert.equal(pJnz.part.opcodeBits, '11');
  assert.equal(pJnz.part.immBits, '0001');

  // Legacy JZ & fake LOOP are strictly rejected (only LDI / ADD / SUB / JNZ exist)
  assert.equal(parseAssemblyLine('JZ 4').ok, false);
  assert.equal(parseAssemblyLine('LOOP 1').ok, false);

  // Invalid syntax & out-of-range operands fail cleanly with Japanese errors
  const badOp = parseAssemblyLine('MOV 3');
  assert.equal(badOp.ok, false);
  assert.match(badOp.error, /不明な命令/);

  const badRange = parseAssemblyLine('LDI 16');
  assert.equal(badRange.ok, false);
  assert.match(badRange.error, /0〜15/);

  // 2. Live INST_DEC probe reflects compiled hardware control wires for every opcode (no ret field!)
  const hw = compileRomHardware(customChips);
  const dLdi = probeInstructionDecode(hw, makeInstructionPart('LDI', 3));
  assert.deepEqual([dLdi.i1, dLdi.i0, dLdi.opFlag, dLdi.setFlag, dLdi.weFlag, dLdi.brFlag], [0, 0, 0, 1, 1, 0]);
  assert.equal('ret' in dLdi, false);
  const dSub = probeInstructionDecode(hw, makeInstructionPart('SUB', 1));
  assert.deepEqual([dSub.i1, dSub.i0, dSub.opFlag, dSub.setFlag, dSub.weFlag, dSub.brFlag], [1, 0, 1, 0, 1, 0]);
  const dJnz = probeInstructionDecode(hw, makeInstructionPart('JNZ', 1));
  assert.deepEqual([dJnz.i1, dJnz.i0, dJnz.opFlag, dJnz.setFlag, dJnz.weFlag, dJnz.brFlag], [1, 1, 0, 0, 0, 1]);

  // 3. Stage 26 (`stage_24`) 4-line raw assembly text assembles cleanly (ZERO locked lines) and clears on unmodified 7-pin ARK4_SYS!
  const st24 = getStageById('stage_24');
  const raw24 = [
    '0: LDI 3      ; 初期値',
    '1: SUB 1      ; 1減らす',
    '2: JNZ 1      ; 0でなければ1番地へ戻る',
    '3: LDI 0b1111 ; 大ハッチ全開!',
  ].join('\n');
  const asm24 = assembleProgramText(raw24, st24);
  assert.equal(asm24.ok, true, `Expected Stage 26 assembly to parse cleanly: ${JSON.stringify(asm24)}`);
  const eval24 = evaluateRomStage(st24, asm24.slots, customChips);
  assert.equal(eval24.passed, true, `Assembled Stage 26 text failed hardware eval: ${JSON.stringify(eval24)}`);
  assert.equal(eval24.trace.length, 8);

  // Format -> re-assemble round-trip preserves valid program
  const formatted24 = formatProgramText(st24, asm24.slots);
  const roundTrip24 = assembleProgramText(formatted24, st24);
  assert.equal(roundTrip24.ok, true);
  assert.deepEqual(roundTrip24.slots, asm24.slots);

  // Attempting to overwrite Stage 25 locked line 4 (`4: JNZ 0`) in text mode yields a clear error
  const st23 = getStageById('stage_23');
  const badLocked25 = assembleProgramText('0: LDI 3\n1: ADD 3\n2: ADD 6\n3: SUB 12\n4: ADD 1', st23);
  assert.equal(badLocked25.ok, false);
  assert.match(badLocked25.errors[0].message, /固定命令/);

  // 4. Anti-shortcut spec checks on Stage 24 (`stage_22`) & Stage 25 (`stage_23`)
  const st22 = getStageById('stage_22');
  const cheat22 = evaluateRomStage(st22, { line_0: 'LDI 5', line_1: 'LDI 8', line_2: 'ADD 0' }, customChips);
  assert.equal(cheat22.passed, false);
  assert.match(cheat22.error, /直接上書き/);
  const noSub22 = evaluateRomStage(st22, { line_0: 'LDI 5', line_1: 'ADD 2', line_2: 'ADD 1' }, customChips);
  assert.equal(noSub22.passed, false);
  const creative22 = evaluateRomStage(st22, { line_0: 'LDI 5', line_1: 'ADD 4', line_2: 'SUB 1' }, customChips);
  assert.equal(creative22.passed, true);

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

test('v34 Chapter I & II Cinematic Endings: rich beats, dynamic hardware stats, interactive choices & glossary round-trip', () => {
  const ch1 = buildChapter1EndingSteps({
    ark4NandCount: 288,
    forgedChipCount: 17,
    clearedCount: 20,
  });
  const ch2 = buildChapter2EndingSteps({
    ark4SysNandCount: 512,
    forgedChipCount: 21,
    clearedCount: 27,
  });

  assert.ok(ch1.length >= 12, `Chapter 1 ending should have >=12 beats, got ${ch1.length}`);
  assert.ok(ch2.length >= 14, `Chapter 2 ending should have >=14 beats, got ${ch2.length}`);

  // Dynamic player hardware stats appear in the ending narration
  assert.ok(ch1.some((s) => s.text.includes('288') && s.text.includes('576')));
  assert.ok(ch1.some((s) => s.text.includes('17 種')));
  assert.ok(ch2.some((s) => s.text.includes('512') && s.text.includes('1024')));
  assert.ok(ch2.some((s) => s.chapterCard?.sub?.includes('512 NAND')));

  // Cohesive high-detail ending scenes + subtle lighting VFX and interactive choices are present in both
  assert.ok(ch1.some((s) => s.scene === './assets/scene_ending_ch1.jpg' && s.canvasScene === 'fx_hub_awaken'));
  assert.ok(ch1.some((s) => s.canvasScene === 'fx_beacon' && s.canvasPhase === 1));
  assert.ok(ch2.some((s) => s.scene === './assets/scene_ending_bluesky.jpg' && s.canvasScene === 'fx_bluesky_breeze'));
  assert.ok(ch2.some((s) => s.canvasScene === 'fx_hatch_light'));
  assert.ok(ch1.some((s) => Array.isArray(s.choices) && s.choices.length >= 3));
  assert.ok(ch2.some((s) => Array.isArray(s.choices) && s.choices.length >= 3));

  const validSpeakers = new Set([null, 'kagari', 'mina', 'hako']);
  for (const step of [...ch1, ...ch2]) {
    assert.ok(validSpeakers.has(step.speaker), `Unexpected speaker '${step.speaker}'`);
    assert.ok(typeof step.text === 'string' && step.text.length > 0);
    const toks = tokenizeGlossaryText(step.text);
    assert.equal(toks.map((t) => t.text).join(''), step.text);
    for (const c of step.choices || []) {
      assert.ok(validSpeakers.has(c.replySpeaker));
      const cToks = tokenizeGlossaryText(c.replyText);
      assert.equal(cToks.map((t) => t.text).join(''), c.replyText);
    }
  }
});

test('v36 Zero Physical Leaps: ASM_ENC & gate-level DEC2_4 ROM execute end-to-end, propagate faults, and enforce strict progression', () => {
  const customChips = {};
  provisionStandardChips(customChips, { includeChapter2Hardware: true, provisioned: false });
  assert.ok(customChips.NAND?.circuit, 'Stage 00-C physical NAND blueprint must be provisioned');
  assert.ok(customChips.ASM_ENC?.circuit, 'ASM_ENC blueprint must be provisioned');
  assert.ok(customChips.ROM_4W?.circuit, 'ROM_4W blueprint must be provisioned');

  const st24 = getStageById('stage_24');
  const validSlots24 = {
    line_0: 'ASM_LDI_3',
    line_1: 'ASM_SUB_1',
    line_2: 'ASM_JNZ_1',
    line_3: 'ASM_LDI_15',
  };

  // 1. Clean end-to-end execution through ASM_ENC -> gate-level ROM -> unmodified 7-pin ARK4_SYS passes!
  const cleanRes = evaluateRomStage(st24, validSlots24, customChips);
  assert.equal(cleanRes.passed, true, `Full ASM_ENC->ROM->ARK4_SYS run failed: ${JSON.stringify(cleanRes)}`);

  // 2. Break player's ASM_ENC (disconnect I1 output pin 1) -> SUB & JNZ encode wrongly -> Stage 26 fails!
  const brokenEncChips = { ...customChips };
  const brokenEncCircuit = cloneCircuit(customChips.ASM_ENC.circuit);
  brokenEncCircuit.wires = brokenEncCircuit.wires.filter((w) => !(w.to.kind === 'output' && w.to.pin === 1));
  brokenEncChips.ASM_ENC = { ...customChips.ASM_ENC, circuit: brokenEncCircuit };

  const resBrokenEnc = evaluateRomStage(st24, validSlots24, brokenEncChips);
  assert.equal(resBrokenEnc.passed, false, 'Broken ASM_ENC.I1 must propagate into assembly execution and fail Stage 26');

  // 3. Break player's ASM_ENC.KEY (disconnect pin 2) -> ROM VALID stays 0 -> CPU halts at 0 cycles!
  const brokenKeyChips = { ...customChips };
  const brokenKeyCircuit = cloneCircuit(customChips.ASM_ENC.circuit);
  brokenKeyCircuit.wires = brokenKeyCircuit.wires.filter((w) => !(w.to.kind === 'output' && w.to.pin === 2));
  brokenKeyChips.ASM_ENC = { ...customChips.ASM_ENC, circuit: brokenKeyCircuit };

  const resBrokenKey = evaluateRomStage(st24, validSlots24, brokenKeyChips);
  assert.equal(resBrokenKey.passed, false, 'Broken ASM_ENC.KEY must stop ROM output validation');
  assert.equal(resBrokenKey.trace.length, 0, 'With KEY=0 on every row, gate-level ROM VALID=0 halts immediately');

  // 4. Break player's DEC_2TO4 (disconnect Y1 output) -> gate-level ROM cannot read address 1 -> Stage 26 fails!
  const brokenDecChips = { ...customChips };
  const brokenDecCircuit = cloneCircuit(customChips.DEC_2TO4.circuit);
  brokenDecCircuit.wires = brokenDecCircuit.wires.filter((w) => !(w.to.kind === 'output' && w.to.pin === 1));
  brokenDecChips.DEC_2TO4 = { ...customChips.DEC_2TO4, circuit: brokenDecCircuit };

  const resBrokenDec = evaluateRomStage(st24, validSlots24, brokenDecChips);
  assert.equal(resBrokenDec.passed, false, 'Broken DEC_2TO4 must break gate-level ROM address decoding');

  // 5. Linear progression: clearing stage_21 unlocks stage_asm_enc (STAGE 22), while stage_rom_4w stays locked until stage_asm_enc cleared
  const post21Save = { clearedStages: ['stage_21'] };
  assert.equal(isStageUnlocked(post21Save, 'stage_asm_enc'), true);
  assert.equal(isStageUnlocked(post21Save, 'stage_rom_4w'), false);
  assert.equal(isStageUnlocked(post21Save, 'stage_22'), false);
});

test('v37 Full Physical Silicon: MOSFET+PULL flattening & fault propagation, zero RET/LOOP backdoor, ROM Fuse Matrix & Verilog HDL Export', () => {
  const customChips = {};
  provisionStandardChips(customChips, { includeChapter2Hardware: true, provisioned: false });

  // 1. ARK4_SYS compiles directly on 7 pins with TRUE physical silicon (960 MOSFETs + 480 resistors, 0 primitive NANDs!)
  const hw = compileRomHardware(customChips);
  assert.equal(hw.sim.numExtIn, 7, 'ARK4_SYS must run strictly on 7 pins (zero hidden RET pin)');
  assert.equal(hw.sim.numExtOut, 8);
  assert.equal(hw.sim.isPhysicalSilicon, true);
  assert.equal(hw.sim.swCount, 960);
  assert.equal(hw.sim.pullCount, 480);
  assert.equal(hw.sim.nandGateCount, 0);
  assert.deepEqual(hw.siliconStats, {
    nandCount: 480,
    swCount: 960,
    pullCount: 480,
    isPhysicalSilicon: true,
  });

  // Pure 3-cycle POR through unmodified 7-pin ARK4_SYS settles cleanly at ACC=0, PC=0, Z=1
  const por = resetRomHardware(hw);
  assert.deepEqual(por, { acc: 0, pc: 0, z: 1, unstable: false });

  // 2. Breaking Stage 00-C physical NAND circuit propagates ALL the way up and breaks NOT and ARK4_SYS!
  const brokenNandChips = { ...customChips };
  const brokenNandCircuit = cloneCircuit(customChips.NAND.circuit);
  // Disconnect PULL output -> OUT inside Stage 00-C physical NAND
  brokenNandCircuit.wires = brokenNandCircuit.wires.filter((w) => w.to.kind !== 'output');
  brokenNandChips.NAND = { ...customChips.NAND, circuit: brokenNandCircuit };

  const notStage = getStageById('stage_01');
  const brokenNotRes = evaluateStage(notStage, customChips.NOT.circuit, brokenNandChips);
  assert.equal(brokenNotRes.passed, false, 'Broken Stage 00-C NAND must propagate up and break Stage 01 NOT');

  const st24 = getStageById('stage_24');
  const slots24 = {
    line_0: 'ASM_LDI_3',
    line_1: 'ASM_SUB_1',
    line_2: 'ASM_JNZ_1',
    line_3: 'ASM_LDI_15',
  };
  const brokenSysRes = evaluateRomStage(st24, slots24, brokenNandChips);
  assert.equal(brokenSysRes.passed, false, 'Broken Stage 00-C NAND must propagate all the way up and break ARK4_SYS Stage 26');

  // 3. Zero hidden RET/LOOP backdoor: ISA keys, 7-output ROM circuit, pure JNZ loop
  assert.deepEqual(Object.keys(ARK4_OPCODES), ['LDI', 'ADD', 'SUB', 'JNZ']);
  const rowMap24 = buildRomRowMap(st24, slots24);
  const romCirc = buildProgrammableRomCircuit(rowMap24, hw);
  assert.deepEqual(romCirc.inputs, ['PC0', 'PC1', 'PC2', 'PC3']);
  assert.deepEqual(romCirc.outputs, ['I0', 'I1', 'IMM0', 'IMM1', 'IMM2', 'IMM3', 'VALID']);

  const run24 = runRomProgram(st24, slots24, customChips);
  assert.equal(run24.finalAcc, 15);
  assert.equal(run24.finalPc, 4);
  assert.equal(run24.siliconStats.isPhysicalSilicon, true);
  assert.equal(run24.trace.filter((t) => t.op === 'JNZ' && t.pcNext < t.pc).length, 2);

  // 4. getRomFuseMatrix() returns accurate burned fuses reflecting player's live ASM_ENC
  const fuseMatrix = getRomFuseMatrix(rowMap24, hw);
  assert.equal(fuseMatrix.wordCount, 4);
  // LDI 3 (00:0011 = 2) + SUB 1 (10:0001 = 2) + JNZ 1 (11:0001 = 3) + LDI 15 (00:1111 = 4) = 11 burned fuses
  assert.equal(fuseMatrix.totalBurnedFuses, 11);
  assert.deepEqual(
    fuseMatrix.rows.map((r) => [r.addr, r.addrBits, r.i1, r.i0, r.imm, r.valid]),
    [
      [0, '0000', 0, 0, [1, 1, 0, 0], 1],
      [1, '0001', 1, 0, [1, 0, 0, 0], 1],
      [2, '0010', 1, 1, [1, 0, 0, 0], 1],
      [3, '0011', 0, 0, [1, 1, 1, 1], 1],
    ]
  );

  // 5. exportSiliconBlueprint() generates authentic Verilog-2001 HDL and exact BOM (accepts both fuseMatrix.rows & rowMap)
  const bpFromRows = exportSiliconBlueprint(customChips, {
    romRows: fuseMatrix.rows,
    stageTitle: 'STAGE 26: 青空へのカウントダウン',
  });
  const bpFromMap = exportSiliconBlueprint(customChips, {
    romRows: rowMap24,
    stageTitle: 'STAGE 26: 青空へのカウントダウン',
  });
  assert.equal(bpFromRows.verilog, bpFromMap.verilog);

  const { verilog, summaryJa, stats } = bpFromRows;
  assert.match(verilog, /module sg_nmos_sw/);
  assert.match(verilog, /module sg_pullup/);
  assert.match(verilog, /\bnmos\b/);
  assert.match(verilog, /\bpullup\b/);
  assert.match(verilog, /module NAND\b/);
  assert.match(verilog, /module ARK4_SYS\b/);
  assert.match(verilog, /module ASM_ENC\b/);
  assert.match(verilog, /module ROM_4W\b/);
  assert.match(verilog, /module ARK4_PROGRAM_ROM\b/);

  // Balanced module / endmodule count
  const modOpens = (verilog.match(/^\s*module\s+[A-Za-z_]/gm) || []).length;
  const modCloses = (verilog.match(/^\s*endmodule\b/gm) || []).length;
  assert.equal(modOpens, modCloses);
  assert.ok(modOpens >= 25, `Expected >=25 Verilog modules (2 primitives + 23 chips + ROM), got ${modOpens}`);

  // Exact BOM stats
  assert.equal(stats.cpuNandCount, 480);
  assert.equal(stats.cpuSwCount, 960);
  assert.equal(stats.cpuPullCount, 480);
  assert.equal(stats.encNandCount, 12);
  assert.equal(stats.encSwCount, 24);
  assert.equal(stats.encPullCount, 12);
  assert.ok(stats.romNandCount > 0);
  assert.equal(stats.romSwCount, stats.romNandCount * 2);
  assert.equal(stats.romPullCount, stats.romNandCount);
  assert.equal(stats.totalNandCount, stats.cpuNandCount + stats.encNandCount + stats.romNandCount);
  assert.equal(stats.totalSwCount, stats.cpuSwCount + stats.encSwCount + stats.romSwCount);
  assert.equal(stats.totalPullCount, stats.cpuPullCount + stats.encPullCount + stats.romPullCount);
  assert.ok(stats.moduleCount >= 24);
  assert.ok(summaryJa.includes(String(stats.totalSwCount)));
  assert.ok(summaryJa.includes(String(stats.totalPullCount)));
});

test('v38 Chapter 3: Bus Bundles, Writable SRAM, 8-Bit ARK8_SYS (14,806 MOSFETs), Loop Mul, Fault Propagation & Verilog Bus Export', () => {
  const customChips = {};
  provisionStandardChips(customChips, { includeChapter3Hardware: true, provisioned: false });

  // 1. All 14 Chapter 3 circuit stages (STAGE 27 MUX4_4B .. STAGE 40 ARK8_SYS) compile & pass on true physical MOSFETs!
  const ch3CircuitStages = STAGES.filter((s) => s.chapter === 3 && s.mode !== 'physics');
  assert.equal(ch3CircuitStages.length, 14);
  for (const st of ch3CircuitStages) {
    const chipId = st.rewardChip.id;
    const def = customChips[chipId];
    assert.ok(def?.circuit, `Missing Chapter 3 blueprint for ${chipId}`);
    const res = evaluateStage(st, def.circuit, customChips);
    assert.equal(res.passed, true, `Stage ${st.code} (${chipId}) failed: ${JSON.stringify(res)}`);
  }

  // Exact verified physical silicon counts for ARK8_SYS
  const hw8 = compileArk8Hardware(customChips);
  assert.equal(hw8.sim.isPhysicalSilicon, true);
  assert.equal(hw8.sim.nandGateCount, 0);
  assert.equal(hw8.siliconStats.nandCount, 7403);
  assert.equal(hw8.siliconStats.swCount, 14806);
  assert.equal(hw8.siliconStats.pullCount, 7403);

  // 2. Stage 41 (`stage_41`): Microgrid surplus (180 - 115 = 65 & dynamic 210 - 90 = 120)
  const st41 = getStageById('stage_41');
  const asm41Text = [
    '0: LOAD R0, [0] ; solar',
    '1: LOAD R1, [1] ; load',
    '2: SUB R0, R1   ; surplus',
    '3: STOR R0, [2] ; write battery cmd',
    '4: HALT',
  ].join('\n');
  const parsed41 = assembleArk8ProgramText(asm41Text, st41);
  assert.equal(parsed41.ok, true, `Stage 41 assembly parse failed: ${JSON.stringify(parsed41.errors)}`);
  const eval41 = evaluateArk8Stage(st41, parsed41.slots, customChips);
  assert.equal(eval41.passed, true, `Stage 41 failed: ${eval41.message}`);
  assert.equal(eval41.run.final.ram[2], 65);

  // Reject hardcoded shortcut on Stage 41 (LDI 65 -> STOR [2])
  const cheat41 = assembleArk8ProgramText('0: LDI R0, 65\n1: STOR R0, [2]\n2: HALT', st41);
  assert.equal(evaluateArk8Stage(st41, cheat41.slots, customChips).passed, false);

  // 3. Stage 42 (`stage_42`): General Loop Multiplication on real MOSFET SRAM (22*11=242 & 15*6=90)
  const st42 = getStageById('stage_42');
  const asm42Text = [
    '0: LOAD R0, [0]',
    '1: LOAD R1, [1]',
    '2: LDI R2, 0',
    '3: LDI R3, 1',
    '4: ADD R2, R0',
    '5: SUB R1, R3',
    '6: JNZ R1, 4',
    '7: STOR R2, [2]',
    '8: HALT',
  ].join('\n');
  const parsed42 = assembleArk8ProgramText(asm42Text, st42);
  assert.equal(parsed42.ok, true, `Stage 42 assembly parse failed: ${JSON.stringify(parsed42.errors)}`);
  // Format -> re-assemble round-trip
  const rt42 = assembleArk8ProgramText(formatArk8ProgramText(st42, parsed42.slots), st42);
  assert.equal(rt42.ok, true);
  assert.deepEqual(rt42.slots, parsed42.slots);

  const eval42 = evaluateArk8Stage(st42, parsed42.slots, customChips);
  assert.equal(eval42.passed, true, `Stage 42 failed: ${eval42.message}`);
  assert.equal(eval42.run.final.ram[2], 242);
  assert.equal(eval42.run.final.regs[1], 0);
  assert.equal(eval42.run.final.regs[2], 242);
  assert.ok(eval42.trace.length >= 35, `Expected full 11-iteration loop trace, got ${eval42.trace.length}`);

  // Reject hardcoded shortcut on Stage 42
  const cheat42 = assembleArk8ProgramText('0: LDI R2, 242\n1: STOR R2, [2]\n2: HALT', st42);
  assert.equal(evaluateArk8Stage(st42, cheat42.slots, customChips).passed, false);

  // 4. Physical fault propagation: breaking Stage 00-C NAND or ASM_ENC8 breaks Stage 42 on ARK8_SYS!
  const brokenNandChips = { ...customChips };
  const brokenNand = cloneCircuit(customChips.NAND.circuit);
  brokenNand.wires = brokenNand.wires.filter((w) => w.to.kind !== 'output');
  brokenNandChips.NAND = { ...customChips.NAND, circuit: brokenNand };
  assert.equal(evaluateArk8Stage(st42, parsed42.slots, brokenNandChips).passed, false);

  const brokenEnc8Chips = { ...customChips };
  const brokenEnc8 = cloneCircuit(customChips.ASM_ENC8.circuit);
  brokenEnc8.wires = brokenEnc8.wires.filter((w) => !(w.to.kind === 'output' && w.to.pin === 2));
  brokenEnc8Chips.ASM_ENC8 = { ...customChips.ASM_ENC8, circuit: brokenEnc8 };
  assert.equal(evaluateArk8Stage(st42, parsed42.slots, brokenEnc8Chips).passed, false);

  // 5. 16-bit Mask ROM Fuse Matrix & Verilog-2001 Bus Export (`romArch: 'ark8'`)
  assert.deepEqual(Object.keys(ARK8_OPCODES), ['LDI', 'ADD', 'SUB', 'JNZ', 'LOAD', 'STOR', 'ADDI', 'HALT']);
  const rowMap42 = buildArk8RowMap(st42, parsed42.slots);
  const fuse42 = getArk8RomFuseMatrix(rowMap42, hw8);
  assert.equal(fuse42.wordCount, 9);
  assert.ok(fuse42.totalBurnedFuses > 20);

  const bp8 = exportSiliconBlueprint(customChips, {
    romRows: fuse42.rows,
    romArch: 'ark8',
    stageTitle: 'STAGE 42: 記憶の大地・真の汎用ループ乗算',
  });
  assert.match(bp8.verilog, /module ARK8_SYS\b/);
  assert.match(bp8.verilog, /module SRAM_16B\b/);
  assert.match(bp8.verilog, /module ASM_ENC8\b/);
  assert.match(bp8.verilog, /module ARK8_PROGRAM_ROM\b/);
  assert.match(bp8.verilog, /\[7:0\]/);
  const opens8 = (bp8.verilog.match(/^\s*module\s+[A-Za-z_]/gm) || []).length;
  const closes8 = (bp8.verilog.match(/^\s*endmodule\b/gm) || []).length;
  assert.equal(opens8, closes8);
  assert.ok(opens8 >= 38, `Expected >=38 Verilog modules for full ARK8 stack, got ${opens8}`);
  assert.equal(bp8.stats.cpuNandCount, 7403);
  assert.equal(bp8.stats.cpuSwCount, 14806);
  assert.equal(bp8.stats.cpuPullCount, 7403);

  // 6. Chapter 3 progression locks, Chapter 3 Ending beats, glossary round-trip & clean prose (no raw markdown)
  const postCh1Save = { clearedStages: ['stage_17'] };
  assert.equal(isChapter2Cleared(postCh1Save), false);
  assert.equal(isChapter3Unlocked(postCh1Save), false);
  assert.equal(isStageUnlocked(postCh1Save, 'stage_27'), false);

  const postCh2Save = { clearedStages: ['stage_17', 'stage_24'] };
  assert.equal(isChapter2Cleared(postCh2Save), true);
  assert.equal(isChapter3Unlocked(postCh2Save), true);
  assert.equal(isChapter3Cleared(postCh2Save), false);
  assert.equal(isStageUnlocked(postCh2Save, 'stage_27'), true);
  assert.equal(isStageUnlocked(postCh2Save, 'stage_28'), false);

  const postCh3Save = { clearedStages: ['stage_17', 'stage_24', 'stage_42'] };
  assert.equal(isChapter3Cleared(postCh3Save), true);

  const ch3Ending = buildChapter3EndingSteps({
    ark8SysNandCount: 7403,
    ark8SysSwCount: 14806,
    ark8SysPullCount: 7403,
  });
  assert.ok(ch3Ending.length >= 10);
  assert.ok(ch3Ending.some((s) => s.text.includes('7403') && s.text.includes('14806')));
  assert.ok(ch3Ending.some((s) => Array.isArray(s.choices) && s.choices.length === 3));
  const validSpeakers = new Set([null, 'kagari', 'mina', 'hako', 'kai']);
  for (const step of ch3Ending) {
    assert.ok(validSpeakers.has(step.speaker), `Unexpected Chapter 3 ending speaker '${step.speaker}'`);
    assert.ok(!step.text.includes('**') && !step.text.includes('`'), `Raw markdown in Ch3 ending: ${step.text}`);
    assert.equal(tokenizeGlossaryText(step.text).map((t) => t.text).join(''), step.text);
  }
  for (const st of STAGES.filter((s) => s.chapter === 3)) {
    for (const line of [...(st.introDialogue || []), ...(st.outroDialogue || [])]) {
      assert.ok(validSpeakers.has(line.speaker), `Unexpected Ch3 speaker '${line.speaker}' in ${st.id}`);
      assert.ok(!line.text.includes('**') && !line.text.includes('`'), `Raw markdown in ${st.id}: ${line.text}`);
    }
  }
});

test('v39 Chapter 3 6-Chapter Continuity: zero stale 16-bit CPU/RAM rebuild text, accurate Ch.4-6 foreshadowing & v39 cache bump', () => {
  // 1. ZERO stale 16-bit CPU/RAM rebuild or 10-chapter strings across Chapter 3 data & UI files
  const ch3Files = [
    'src/data/chapter3Stages.js',
    'src/data/endings.js',
    'src/data/codex.js',
    'src/data/glossary.js',
    'src/ui/modals.js',
  ];
  const forbiddenPatterns = [
    /16ビット化/,
    /16ビットRAM/,
    /16ビット統一ノイマン/,
    /16bit真ノイマン/,
    /16ビット真ノイマン/,
    /10章/,
    /汎用計算機とブート/,
  ];
  for (const relPath of ch3Files) {
    const src = readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf8');
    for (const pat of forbiddenPatterns) {
      assert.equal(pat.test(src), false, `Stale text matching ${pat} found in ${relPath}`);
    }
  }

  // 2. Accurate 16-bit instruction-word mentions remain intact
  const codexSrc = readFileSync(new URL('../src/data/codex.js', import.meta.url), 'utf8');
  assert.match(codexSrc, /16bit拡張命令|16ビット/);

  // 3. Stage 29 (ADD_8B) & Stage 32 (ALU_8B) & Stage 40 (ARK8_SYS) accurately foreshadow Ch.4-6 reuse
  const st29Outro = getStageById('stage_29').outroDialogue.map((d) => d.text).join('\n');
  assert.match(st29Outro, /Base\/Limit MMU/);
  assert.match(st29Outro, /スタックポインタ/);

  const st32Outro = getStageById('stage_32').outroDialogue.map((d) => d.text).join('\n');
  assert.match(st32Outro, /Base\/Limit MMU/);

  const st40Outro = getStageById('stage_40').outroDialogue.map((d) => d.text).join('\n');
  assert.match(st40Outro, /第4章/);
  assert.match(st40Outro, /第6章/);

  // 4. Chapter 3 Ending asserts full 6-Chapter continuity (Ch.4 Hardware -> Ch.5 Kernel -> Ch.6 UNIX ARK-OS)
  const ch3Ending = buildChapter3EndingSteps({
    ark8SysNandCount: 7403,
    ark8SysSwCount: 14806,
    ark8SysPullCount: 7403,
  });
  const endingCorpus = ch3Ending
    .flatMap((s) => [s.text, ...(s.choices || []).map((c) => c.replyText)])
    .join('\n');
  for (const expectedToken of [
    '全6章',
    'ADD_8B',
    'ALU_8B',
    'REGFILE_4',
    'PC_8B',
    'SRAM_16B',
    '統一RAM',
    'スタック',
    'MMIO',
    'IRQ',
    'Base/Limit MMU',
    'SYSCALL',
    '第4章',
    'OS対応PCハードウェア完結',
    '第5章',
    'OSカーネル中核',
    'ブートローダ',
    'alloc/free',
    'マルチタスク',
    '第6章',
    'ファイルシステム',
    'arksh',
    'ARK-OS',
  ]) {
    assert.ok(endingCorpus.includes(expectedToken), `Chapter 3 Ending missing 6-chapter continuity token '${expectedToken}'`);
  }
  for (const step of ch3Ending) {
    assert.ok(!step.text.includes('**') && !step.text.includes('`'));
    assert.equal(tokenizeGlossaryText(step.text).map((t) => t.text).join(''), step.text);
    for (const c of step.choices || []) {
      assert.ok(!c.replyText.includes('**') && !c.replyText.includes('`'));
      assert.equal(tokenizeGlossaryText(c.replyText).map((t) => t.text).join(''), c.replyText);
    }
  }

  // 5. Codex entry `ark8_horizon` accurately documents 8-bit UNIX continuity & exact silicon counts
  const ark8CodexText = CODEX_ENTRIES.ark8_horizon.body.join('\n');
  for (const token of ['14,806', '7,403', 'UZI', 'FUZIX', '全6章', '第4章', 'Base/Limit MMU', '第5章', '第6章', 'arksh', 'ARK-OS']) {
    assert.ok(ark8CodexText.includes(token), `CODEX_ENTRIES.ark8_horizon missing '${token}'`);
  }

  // 6. Cache version moved past v38 with zero leftover v38 references
  for (const relPath of ['index.html', 'sw.js', 'src/main.js', 'src/ui/modals.js', 'src/ui/ark8Ide.js']) {
    const src = readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf8');
    assert.equal(/\?v=38|silicon-genesis-v38/.test(src), false, `Leftover v38 cache string in ${relPath}`);
    assert.equal(/\?v=(?:39|40|41|42|43)|silicon-genesis-v(?:39|40|41|42|43)/.test(src), true, `Missing v39+ cache string in ${relPath}`);
  }
});

test('v40 Chapter 4: OS-Ready PC Hardware (ARK8_OS_HW 12,588 MOSFETs), ARK5_CRT, GUARD_TRAP 3-Vector Sandbox, Fault Propagation, Verilog-2001 & Ending', () => {
  const customChips = {};
  provisionStandardChips(customChips, { includeChapter4Hardware: true, provisioned: false });

  // 1. All 10 Chapter 4 hardware stages (STAGE 43 MEM_BUS8 .. STAGE 52 ARK8_OS_HW) compile & pass bottom-up
  //    strictly on real Stage 00-C MOSFETs (isPhysicalSilicon === true, nandGateCount === 0) with exact BOMs!
  const expectedCh4Boms = {
    MEM_BUS8: [244, 488, 244],
    MMIO_DEC: [26, 52, 26],
    STACK_PTR: [1090, 2180, 1090],
    CMP_8B: [223, 446, 223],
    TMR_IRQ: [923, 1846, 923],
    MMU_8B: [821, 1642, 821],
    PRIV_CTRL: [46, 92, 46],
    IRQ_VEC: [1694, 3388, 1694],
    INST_DEC16: [113, 226, 113],
    ARK8_OS_HW: [6294, 12588, 6294],
  };

  const ch4HwStages = STAGES.filter((s) => s.chapter === 4 && s.mode !== 'physics');
  assert.equal(ch4HwStages.length, 10);
  for (const st of ch4HwStages) {
    const chipId = st.rewardChip.id;
    const def = customChips[chipId];
    assert.ok(def?.circuit, `Missing Chapter 4 blueprint for ${chipId}`);
    const sim = compileCircuit(def.circuit, customChips);
    assert.equal(sim.isPhysicalSilicon, true, `${chipId} must run on real Stage 00-C MOSFETs`);
    assert.equal(sim.nandGateCount, 0, `${chipId} must have 0 primitive NAND gates`);
    const res = evaluateStage(st, def.circuit, customChips);
    assert.equal(res.passed, true, `Stage ${st.code} (${chipId}) failed: ${JSON.stringify(res)}`);
    const [expN, expSw, expPull] = expectedCh4Boms[chipId];
    assert.equal(res.metrics.nandCount, expN, `${chipId} NAND count mismatch`);
    assert.equal(res.metrics.swCount, expSw, `${chipId} MOSFET count mismatch`);
    assert.equal(res.metrics.pullCount, expPull, `${chipId} PULL count mismatch`);
  }

  // Exact compiled motherboard & ARK8_OS_HW silicon stats
  assert.equal(Object.keys(ARK8_OS_OPCODES).length, 16);
  const hwOs = compileArk8OsHardware(customChips);
  assert.equal(hwOs.cpuSim.isPhysicalSilicon, true);
  assert.equal(hwOs.cpuSim.nandGateCount, 0);
  assert.equal(hwOs.siliconStats.isPhysicalSilicon, true);
  assert.equal(hwOs.siliconStats.nandCount, 6294);
  assert.equal(hwOs.siliconStats.swCount, 12588);
  assert.equal(hwOs.siliconStats.pullCount, 6294);
  assert.equal(hwOs.siliconStats.boardSwCount, 18880);
  assert.equal(hwOs.siliconStats.sram16Verified, true);
  assert.equal(hwOs.siliconStats.sram16SwCount, 9156);

  // Parser checks: hex, char literal, MMIO port alias, indirect register, invalid opcode
  assert.equal(parseArk8OsLine('0: LDI R1, 0x60 ; radio string').part.imm, 96);
  assert.equal(parseArk8OsLine('8: STOR R1, [CRT]').part.imm, MMIO_PORTS.CRT);
  assert.equal(parseArk8OsLine("12: LDI R0, '!'").part.imm, 33);
  assert.equal(parseArk8OsLine('5: LDR R0, [R1]').part.op, 'LDR');
  assert.equal(parseArk8OsLine('BADOP R0, 1').ok, false);

  // 2. Stage 53 (`stage_53`, ARK5_CRT): passes primary ("ARK5:SOS") & secondary anti-cheat ("HI,ARK7!")
  //    on live MOSFET ARK8_OS_HW, exercises real CALL/RET + SP stack, and rejects hardcoded shortcuts!
  const st53 = getStageById('stage_53');
  const asm53Text = [
    '0: LDI R1, 0x60',
    '1: CALL 5',
    '2: HALT',
    '5: LDR R0, [R1]',
    '6: JNZ R0, 8',
    '7: RET',
    '8: STOR R0, [0xF0]',
    '9: ADDI R1, 1',
    '10: LDI R3, 1',
    '11: JNZ R3, 5',
  ].join('\n');
  const parsed53 = assembleArk8OsProgramText(asm53Text, st53);
  assert.equal(parsed53.ok, true, `Stage 53 parse failed: ${JSON.stringify(parsed53.errors)}`);
  const rt53 = assembleArk8OsProgramText(formatArk8OsProgramText(st53, parsed53.slots), st53);
  assert.equal(rt53.ok, true);
  assert.deepEqual(rt53.slots, parsed53.slots);

  const eval53 = evaluateArk8OsStage(st53, parsed53.slots, customChips);
  assert.equal(eval53.passed, true, `Stage 53 (ARK5_CRT) failed: ${eval53.message}`);
  assert.equal(eval53.run.final.crtText, 'ARK5:SOS');
  assert.equal(eval53.run.haltedNormally, true);
  assert.equal(eval53.run.stats.usedCall, true);
  assert.equal(eval53.run.stats.usedRet, true);
  assert.equal(eval53.run.stats.usedLdr, true);
  assert.equal(eval53.run.stats.minSp, 239, 'CALL must physically decrement SP 240 -> 239');
  assert.equal(eval53.run.final.sp, 240, 'RET must physically restore SP 239 -> 240');

  // Verify Stage 53 rejects direct hardcoded shortcut (no CALL/RET or LDR)
  const cheat53Direct = assembleArk8OsProgramText(
    '0: LDI R0, 65\n1: STOR R0, [240]\n2: HALT',
    st53
  );
  assert.equal(evaluateArk8OsStage(st53, cheat53Direct.slots, customChips).passed, false);

  // Verify Stage 53 rejects LDR loop without CALL/RET stack usage
  const cheat53NoCall = assembleArk8OsProgramText(
    [
      '0: LDI R1, 0x60',
      '1: LDR R0, [R1]',
      '2: JNZ R0, 4',
      '3: HALT',
      '4: STOR R0, [0xF0]',
      '5: ADDI R1, 1',
      '6: LDI R3, 1',
      '7: JNZ R3, 1',
    ].join('\n'),
    st53
  );
  assert.equal(evaluateArk8OsStage(st53, cheat53NoCall.slots, customChips).passed, false);

  // 3. Stage 54 (`stage_54`, GUARD_TRAP): passes primary ("A5!") & secondary anti-cheat ("OK!")
  //    with real User-mode SYSCALL, TMR_IRQ preemption, and physical MMU_8B/PRIV_CTRL blocking
  //    rogue User STOR [0xF0] 'X' attack without touching CRT or Kernel RAM!
  const st54 = getStageById('stage_54');
  assert.equal(st54.isChapter4Finale, true);
  const asm54Text = [
    '0: LDI R0, 64',
    '1: STOR R0, [244]',
    '2: LDI R0, 32',
    '3: JNZ R0, 16',
    '4: ADDI R3, 1',
    '5: IRET',
    '8: STOR R1, [240]',
    '9: ADDI R2, 1',
    '10: IRET',
    "12: LDI R0, '!'",
    '13: STOR R0, [240]',
    '14: HALT',
    '16: STOR R0, [245]',
    '17: LDI R0, 4',
    '18: STOR R0, [243]',
    '19: IRET',
  ].join('\n');
  const parsed54 = assembleArk8OsProgramText(asm54Text, st54);
  assert.equal(parsed54.ok, true, `Stage 54 parse failed: ${JSON.stringify(parsed54.errors)}`);
  const rt54 = assembleArk8OsProgramText(formatArk8OsProgramText(st54, parsed54.slots), st54);
  assert.equal(rt54.ok, true);
  assert.deepEqual(rt54.slots, parsed54.slots);

  // Attempting to overwrite locked Boot line 0 is cleanly rejected
  const badLock54 = assembleArk8OsProgramText('0: HALT\n4: ADDI R3, 1\n5: IRET', st54);
  assert.equal(badLock54.ok, false);

  const eval54 = evaluateArk8OsStage(st54, parsed54.slots, customChips);
  assert.equal(eval54.passed, true, `Stage 54 (GUARD_TRAP) failed: ${eval54.message}`);
  assert.equal(eval54.run.final.crtText, 'A5!');
  assert.equal(eval54.run.final.crtText.includes('X'), false, 'Rogue User STOR "X" must never touch CRT');
  assert.equal(eval54.run.haltedNormally, true);
  assert.equal(eval54.run.final.kMode, 1, 'Must halt cleanly in Kernel mode');
  assert.equal(eval54.run.stats.enteredUserMode, true);
  assert.equal(eval54.run.stats.syscallCount, 2);
  assert.equal(eval54.run.final.regs[2], 2);
  assert.ok(eval54.run.stats.irqCount >= 1 && eval54.run.final.regs[3] >= 1, 'Real TMR_IRQ preemption must fire');
  assert.ok(eval54.run.stats.faultCount >= 1 && eval54.run.stats.blockedAttacks >= 1, 'MMU_8B/PRIV_CTRL must physically block rogue STOR');
  // Kernel RAM Boot/Vector region (0x00..0x27) must remain byte-for-byte intact after rogue User attack!
  assert.deepEqual(
    eval54.run.final.ram.slice(0, 0x28),
    eval54.run.init.ram.slice(0, 0x28),
    'Kernel Boot & Trap Vector RAM must remain completely untouched by rogue User attack'
  );

  // Verify Stage 54 rejects hardcoded SYSCALL that fails secondary "OK!" generalization check
  const cheat54Hardcoded = assembleArk8OsProgramText(
    [
      '0: LDI R0, 64', '1: STOR R0, [244]', '2: LDI R0, 32', '3: JNZ R0, 16',
      '4: ADDI R3, 1', '5: IRET',
      '8: LDI R0, 65', '9: STOR R0, [240]', '10: IRET',
      '12: LDI R0, 33', '13: STOR R0, [240]', '14: HALT',
      '16: STOR R0, [245]', '17: LDI R0, 4', '18: STOR R0, [243]', '19: IRET',
    ].join('\n'),
    st54
  );
  assert.equal(evaluateArk8OsStage(st54, cheat54Hardcoded.slots, customChips).passed, false);

  // 4. Physical fault propagation: breaking Stage 00-C NAND OR breaking MMU_8B / PRIV_CTRL / SRAM_16B fails Stage 54!
  for (const faultChipId of ['NAND', 'MMU_8B', 'PRIV_CTRL', 'SRAM_16B']) {
    const brokenChips = { ...customChips };
    const brokenCircuit = cloneCircuit(customChips[faultChipId].circuit);
    brokenCircuit.wires = brokenCircuit.wires.filter((w) => w.to.kind !== 'output');
    brokenChips[faultChipId] = { ...customChips[faultChipId], circuit: brokenCircuit };
    const faultRes = evaluateArk8OsStage(st54, parsed54.slots, brokenChips);
    assert.equal(faultRes.passed, false, `Breaking ${faultChipId} must propagate and fail Stage 54`);
  }

  // 5. exportSiliconBlueprint(..., { romArch: 'ark8_os' }) & { romArch: 'auto' } emit balanced IEEE 1364-2001 Verilog-2001
  const rowMap54 = buildArk8OsRowMap(st54, parsed54.slots);
  const bpOs = exportSiliconBlueprint(customChips, {
    romRows: rowMap54,
    romArch: 'ark8_os',
    stageTitle: 'STAGE 54: 三種の防壁・OSトラップ防衛戦',
  });
  for (const expectedMod of [
    /module sg_nmos_sw\b/,
    /module sg_pullup\b/,
    /module MEM_BUS8\b/,
    /module MMIO_DEC\b/,
    /module STACK_PTR\b/,
    /module CMP_8B\b/,
    /module TMR_IRQ\b/,
    /module MMU_8B\b/,
    /module PRIV_CTRL\b/,
    /module IRQ_VEC\b/,
    /module INST_DEC16\b/,
    /module ARK8_OS_HW\b/,
    /ARK8_OS_UNIFIED_RAM/,
    /Board Silicon/,
  ]) {
    assert.match(bpOs.verilog, expectedMod, `Verilog export missing ${expectedMod}`);
  }
  const opensOs = (bpOs.verilog.match(/^\s*module\s+[A-Za-z_]/gm) || []).length;
  const closesOs = (bpOs.verilog.match(/^\s*endmodule\b/gm) || []).length;
  assert.equal(opensOs, closesOs, 'Balanced module/endmodule count required');
  assert.ok(opensOs >= 50, `Expected >=50 Verilog modules for full ARK8_OS_HW stack, got ${opensOs}`);
  assert.equal(bpOs.stats.cpuNandCount, 6294);
  assert.equal(bpOs.stats.cpuSwCount, 12588);
  assert.equal(bpOs.stats.cpuPullCount, 6294);
  assert.equal(bpOs.stats.romNandCount, 0);
  assert.equal(bpOs.stats.totalSwCount, bpOs.stats.totalNandCount * 2);
  assert.equal(bpOs.stats.totalPullCount, bpOs.stats.totalNandCount);

  // Auto-detect export (used by Codex modal after clearing Ch.4) must also select ARK8_OS_HW cleanly
  const bpAuto = exportSiliconBlueprint(customChips, {
    romArch: 'auto',
    stageTitle: 'STAGE 54: Codex Export',
  });
  assert.match(bpAuto.verilog, /Board Silicon/);
  assert.equal(bpAuto.stats.cpuNandCount, 6294);
  assert.equal(bpAuto.stats.romNandCount, 0);

  // 6. Chapter 4 progression locks, Ending beats, anim/asset wiring & ?v=40 cache consistency
  const preCh4Save = { clearedStages: ['stage_17', 'stage_24', 'stage_41'], chapter4Unlocked: true };
  assert.equal(isChapter4Unlocked(preCh4Save), false, 'Stale chapter4Unlocked flag must not bypass stage_42');
  assert.equal(isChapter4Cleared(preCh4Save), false);
  assert.equal(isStageUnlocked(preCh4Save, 'stage_43'), false);

  const postCh3Save = { clearedStages: ['stage_17', 'stage_24', 'stage_42'] };
  assert.equal(isChapter4Unlocked(postCh3Save), true);
  assert.equal(isChapter4Cleared(postCh3Save), false);
  assert.equal(isStageUnlocked(postCh3Save, 'stage_43'), true);
  assert.equal(isStageUnlocked(postCh3Save, 'stage_44'), false);

  const postCh4Save = { clearedStages: ['stage_17', 'stage_24', 'stage_42', 'stage_54'] };
  assert.equal(isChapter4Cleared(postCh4Save), true);

  // Chapter 4 Ending beats: dynamic stats, 3 choices, ren speaker valid, lossless glossary round-trip, zero raw markdown
  assert.ok(CHARACTERS.ren && CHARACTERS.ren.portrait === './assets/portrait_ren.jpg');
  assert.ok(SCENES.ark5_station && SCENES.ark5_station.image === './assets/scene_ark5_station.jpg');

  const ch4Ending = buildChapter4EndingSteps({
    ark8OsNandCount: 6294,
    ark8OsSwCount: 12588,
    ark8OsPullCount: 6294,
  });
  assert.ok(ch4Ending.length >= 10, `Expected >=10 Chapter 4 ending beats, got ${ch4Ending.length}`);
  assert.ok(ch4Ending.some((s) => s.text.includes('6294') && s.text.includes('12588')));
  assert.ok(ch4Ending.some((s) => s.speaker === 'ren'));
  assert.ok(ch4Ending.some((s) => Array.isArray(s.choices) && s.choices.length === 3));

  const validCh4Speakers = new Set([null, 'kagari', 'mina', 'hako', 'kai', 'ren']);
  for (const step of ch4Ending) {
    assert.ok(validCh4Speakers.has(step.speaker), `Unexpected Ch4 ending speaker '${step.speaker}'`);
    assert.ok(!step.text.includes('**') && !step.text.includes('`'), `Raw markdown in Ch4 ending: ${step.text}`);
    assert.equal(tokenizeGlossaryText(step.text).map((t) => t.text).join(''), step.text);
    for (const c of step.choices || []) {
      assert.ok(validCh4Speakers.has(c.replySpeaker), `Unexpected Ch4 choice speaker '${c.replySpeaker}'`);
      assert.ok(!c.replyText.includes('**') && !c.replyText.includes('`'));
      assert.equal(tokenizeGlossaryText(c.replyText).map((t) => t.text).join(''), c.replyText);
    }
  }

  // Zero raw markdown across all Chapter 4 stages & all anim keys present in storyDiagram.js
  const storyDiagramSrc = readFileSync(new URL('../src/ui/storyDiagram.js', import.meta.url), 'utf8');
  for (const st of STAGES.filter((s) => s.chapter === 4)) {
    for (const line of [...(st.introDialogue || []), ...(st.outroDialogue || [])]) {
      assert.ok(validCh4Speakers.has(line.speaker), `Unexpected Ch4 speaker '${line.speaker}' in ${st.id}`);
      assert.ok(!line.text.includes('**') && !line.text.includes('`'), `Raw markdown in ${st.id}: ${line.text}`);
      assert.equal(tokenizeGlossaryText(line.text).map((t) => t.text).join(''), line.text);
      if (line.visualCard?.anim) {
        assert.ok(
          new RegExp(`\\b${line.visualCard.anim}\\b`).test(storyDiagramSrc),
          `Missing storyDiagram.js anim '${line.visualCard.anim}' used in ${st.id}`
        );
      }
    }
  }
  for (const modId of MODULE_ENCYCLOPEDIA_IDS.slice(42)) {
    const entry = getGlossaryTerm(modId);
    assert.ok(entry?.anim, `Missing Ch4 glossary anim for ${modId}`);
    assert.ok(
      new RegExp(`\\b${entry.anim}\\b`).test(storyDiagramSrc),
      `Missing storyDiagram.js anim '${entry.anim}' for glossary module '${modId}'`
    );
  }

  // Cache consistency: ?v=40..42 across index.html, sw.js & UI modules, zero v=39 leftovers, Ren & ARK-5 assets in sw.js
  const swSrc = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.match(swSrc, /portrait_ren\.jpg/);
  assert.match(swSrc, /scene_ark5_station\.jpg/);
  assert.match(swSrc, /osHwRunner\.js\?v=(?:40|41|42|43)/);
  assert.match(swSrc, /ark8OsIde\.js\?v=(?:40|41|42|43)/);
  for (const relPath of [
    'index.html',
    'sw.js',
    'src/main.js',
    'src/ui/modals.js',
    'src/ui/prologue.js',
    'src/ui/ark8Ide.js',
    'src/ui/ark8OsIde.js',
    'src/ui/dialogue.js',
    'src/ui/storyDiagram.js',
  ]) {
    const src = readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf8');
    assert.equal(/\?v=39|silicon-genesis-v39/.test(src), false, `Leftover v39 cache string in ${relPath}`);
    assert.equal(/\?v=(?:40|41|42|43)|silicon-genesis-v(?:40|41|42|43)/.test(src), true, `Missing v40+ cache string in ${relPath}`);
  }
});

test('v41 Chapter 5: OS Kernel Core (Stages 55–62) — Live 18,880-MOSFET Execution, Silicon Fault Propagation, Progression, Ending & Cache', () => {
  // 1. ACT XII & ACT XIII + all 10 Chapter 5 stages (stage_55, stage_55b, stage_55c, stage_56..stage_62) metadata, scenes, and anim keys
  const act12 = ACTS.find((a) => a.id === 12);
  const act13 = ACTS.find((a) => a.id === 13);
  assert.ok(act12 && act12.chapter === 5 && act12.roman === 'ACT XII', 'ACT XII must exist for Chapter 5');
  assert.ok(act13 && act13.chapter === 5 && act13.roman === 'ACT XIII', 'ACT XIII must exist for Chapter 5');

  const ch5Stages = STAGES.filter((s) => s.chapter === 5);
  const expectedIds = [
    'stage_55', 'stage_55b', 'stage_55c', 'stage_56', 'stage_57', 'stage_58',
    'stage_59', 'stage_60', 'stage_61', 'stage_62',
  ];
  assert.deepEqual(ch5Stages.map((s) => s.id), expectedIds);
  assert.equal(getStageById('stage_62').isChapter5Finale, true);
  assert.ok(SCENES.storm_core && SCENES.storm_core.image === './assets/scene_storm_core.jpg');
  assert.equal(existsSync(new URL('../assets/scene_storm_core.jpg', import.meta.url)), true);

  const storyDiagramSrc = readFileSync(new URL('../src/ui/storyDiagram.js', import.meta.url), 'utf8');
  const validSpeakers = new Set([null, 'kagari', 'mina', 'hako', 'kai', 'ren']);
  const assertNoRawMarkdown = (text, ctxLabel) => {
    if (typeof text !== 'string') return;
    assert.equal(
      text.includes('**') || text.includes('`'),
      false,
      `Raw Markdown found in ${ctxLabel}: ${text.slice(0, 120)}`
    );
  };

  for (const st of ch5Stages) {
    assert.equal(st.chapter, 5);
    assert.equal(st.kind, 'ark8_os_program');
    assert.ok(SCENES[st.scene], `Invalid scene '${st.scene}' in ${st.id}`);
    assert.ok(st.act === 12 || st.act === 13, `Unexpected act ${st.act} in ${st.id}`);

    // Zero raw Markdown in all player-facing stage text fields
    for (const [field, val] of [
      ['title', st.title],
      ['revealedTitle', st.revealedTitle],
      ['plainGoal', st.plainGoal],
      ['beginnerNote', st.beginnerNote],
      ['clearText', st.clearText],
      ['incidentBrief.where', st.incidentBrief?.where],
      ['incidentBrief.trouble', st.incidentBrief?.trouble],
      ['incidentBrief.condition', st.incidentBrief?.condition],
      ['incidentBrief.shortRule', st.incidentBrief?.shortRule],
      ['incidentBrief.stakes', st.incidentBrief?.stakes],
      ['asmProgramSpec.goalTitle', st.asmProgramSpec?.goalTitle],
      ['rewardChip.description', st.rewardChip?.description],
    ]) {
      assertNoRawMarkdown(val, `${st.id}.${field}`);
    }
    for (const [i, hint] of (st.hints || []).entries()) {
      assertNoRawMarkdown(hint, `${st.id}.hints[${i}]`);
    }
    for (const r of st.asmProgramSpec?.rows || []) {
      assertNoRawMarkdown(r.label, `${st.id}.rows[${r.addr}].label`);
    }
    for (const line of [...(st.introDialogue || []), ...(st.outroDialogue || [])]) {
      assert.ok(validSpeakers.has(line.speaker), `Unexpected speaker '${line.speaker}' in ${st.id}`);
      assertNoRawMarkdown(line.text, `${st.id}.dialogue`);
      assert.equal(tokenizeGlossaryText(line.text).map((t) => t.text).join(''), line.text);
      if (line.visualCard) {
        assertNoRawMarkdown(line.visualCard.tag, `${st.id}.visualCard.tag`);
        assertNoRawMarkdown(line.visualCard.title, `${st.id}.visualCard.title`);
        assertNoRawMarkdown(line.visualCard.rule, `${st.id}.visualCard.rule`);
        if (line.visualCard.anim) {
          assert.ok(
            new RegExp(`case '${line.visualCard.anim}'`).test(storyDiagramSrc),
            `Missing storyDiagram.js anim '${line.visualCard.anim}' in ${st.id}`
          );
        }
      }
    }
    for (const cid of st.codexUnlock || []) {
      assert.ok(CODEX_ENTRIES[cid], `Missing codex entry '${cid}' referenced by ${st.id}`);
    }
  }

  // Zero raw Markdown in Chapter 5 Codex & Glossary entries + valid anim keys for Ch.5 modules (52..61)
  for (const cid of [
    'disk_bootloader',
    'calling_convention_stack',
    'user_heap_malloc_strdup',
    'memory_allocator_heap',
    'syscall_abi_dispatch',
    'preemptive_microkernel',
  ]) {
    const entry = CODEX_ENTRIES[cid];
    assert.ok(entry, `Missing Chapter 5 codex entry '${cid}'`);
    assertNoRawMarkdown(entry.term, `codex.${cid}.term`);
    assertNoRawMarkdown(entry.subtitle, `codex.${cid}.subtitle`);
    for (const [i, para] of (entry.body || []).entries()) {
      assertNoRawMarkdown(para, `codex.${cid}.body[${i}]`);
    }
  }
  const ch5ModIds = MODULE_ENCYCLOPEDIA_IDS.slice(52);
  assert.deepEqual(ch5ModIds, [
    'boot_loader',
    'stack_abi',
    'malloc_strdup',
    'kalloc_map',
    'heap_sbrk',
    'syscall_mux',
    'pcb_ctx',
    'rr_sched',
    'fault_isolate',
    'ark_kernel_core',
  ]);
  for (const modId of ch5ModIds) {
    const entry = getGlossaryTerm(modId);
    assert.ok(entry?.anim, `Missing Ch5 glossary anim for '${modId}'`);
    assert.ok(
      new RegExp(`case '${entry.anim}'`).test(storyDiagramSrc),
      `Missing storyDiagram.js anim '${entry.anim}' for Ch5 module '${modId}'`
    );
    assertNoRawMarkdown(entry.title, `glossary.${modId}.title`);
    assertNoRawMarkdown(entry.summary, `glossary.${modId}.summary`);
    assertNoRawMarkdown(entry.analogy, `glossary.${modId}.analogy`);
  }
  for (const termId of [
    'bootloader', 'calling_convention', 'user_heap', 'bitmap_alloc', 'heap_memory', 'pcb_concept',
    'vdso_trampoline', 'round_robin', 'fault_isolation', 'microkernel',
  ]) {
    const entry = getGlossaryTerm(termId);
    assert.ok(entry, `Missing Ch5 glossary term '${termId}'`);
    assertNoRawMarkdown(entry.title, `glossary.${termId}.title`);
    assertNoRawMarkdown(entry.summary, `glossary.${termId}.summary`);
    assertNoRawMarkdown(entry.analogy, `glossary.${termId}.analogy`);
  }

  // 2. Live 18,880-MOSFET execution of ALL 10 Chapter 5 stages (Primary + Anti-cheat)
  //    PLUS formatArk8OsProgramText -> assembleArk8OsProgramText round-trip!
  const customChips = {};
  provisionStandardChips(customChips, { includeChapter4Hardware: true, provisioned: false });
  const idealSlotsById = {};

  for (const st of ch5Stages) {
    const idealSlots = {};
    for (const r of st.asmProgramSpec.rows) {
      if (!r.locked) {
        assert.ok(r.ideal, `Missing ideal instruction for ${st.id} addr ${r.addr}`);
        idealSlots[r.slotId] = r.ideal;
      }
    }
    const formatted = formatArk8OsProgramText(st, idealSlots);
    const reparsed = assembleArk8OsProgramText(formatted, st);
    assert.equal(reparsed.ok, true, `${st.id} text round-trip failed: ${JSON.stringify(reparsed.errors)}`);
    assert.deepEqual(reparsed.slots, idealSlots, `${st.id} slots mismatch after round-trip`);
    idealSlotsById[st.id] = reparsed.slots;

    const evalRes = evaluateArk8OsStage(st, reparsed.slots, customChips);
    assert.equal(evalRes.passed, true, `${st.id} live MOSFET execution failed: ${evalRes.message}`);
    assertNoRawMarkdown(evalRes.message, `${st.id}.evalRes.message`);
    assert.equal(evalRes.run.haltedNormally, true, `${st.id} must halt cleanly`);
    assert.equal(evalRes.run.hw.siliconStats.isPhysicalSilicon, true);
    assert.equal(evalRes.run.hw.siliconStats.boardSwCount, 18880);

    if (st.id === 'stage_55') {
      assert.equal(evalRes.run.final.crtText, 'OS!');
      assert.equal(evalRes.run.final.diskPtr, 15);
      assert.equal(evalRes.run.stats.usedStr, true);
      assert.equal(evalRes.run.stats.usedCall, true);
      assert.equal(evalRes.run.stats.usedRet, true);
      assert.ok(evalRes.run.stats.maxPcExecuted >= 32);
    } else if (st.id === 'stage_55b') {
      assert.equal(evalRes.run.final.crtText, 'BA');
      assert.ok(evalRes.run.stats.minSp <= 237);
      assert.equal(evalRes.run.final.sp, 240);
      assert.equal(evalRes.run.stats.usedPush, true);
      assert.equal(evalRes.run.stats.usedPop, true);
      assert.equal(evalRes.run.stats.usedCall, true);
      assert.equal(evalRes.run.stats.usedRet, true);
    } else if (st.id === 'stage_55c') {
      assert.equal(evalRes.run.final.crtText, 'OK:MK:!R');
      assert.equal(evalRes.run.final.sp, 240);
      assert.deepEqual(evalRes.run.final.ram.slice(80, 83), [79, 75, 0]);
      assert.equal(evalRes.run.final.ram[112], 1);
      assert.equal(evalRes.run.final.ram[128], 1);
    } else if (st.id === 'stage_56') {
      assert.equal(evalRes.run.final.crtText, '130');
      assert.deepEqual(evalRes.run.final.ram.slice(96, 100), [1, 1, 1, 1]);
    } else if (st.id === 'stage_57') {
      assert.equal(evalRes.run.final.crtText, 'H!S');
      assert.equal(evalRes.run.final.ram[96], 52);
      assert.equal(evalRes.run.final.ram[0x80 + 46], 72);
      assert.equal(evalRes.run.stats.enteredUserMode, true);
    } else if (st.id === 'stage_58') {
      assert.equal(evalRes.run.final.crtText, 'ARK8');
      assert.equal(evalRes.run.final.kbLen, 0);
      assert.ok(evalRes.run.stats.userSyscallCount >= 10);
    } else if (st.id === 'stage_59') {
      assert.equal(evalRes.run.final.crtText, 'A1B2');
      assert.ok(evalRes.run.stats.contextSwitchCount >= 4);
      assert.ok(evalRes.run.stats.userBaseVisited.size >= 2);
      assert.equal(evalRes.run.final.ram[96], 0);
      assert.equal(evalRes.run.final.ram[104], 0);
    } else if (st.id === 'stage_60') {
      assert.equal(evalRes.run.final.crtText, 'WPWPPP');
      assert.ok(evalRes.run.stats.irqCount >= 3);
      assert.ok(evalRes.run.stats.contextSwitchCount >= 4);
      assert.ok(evalRes.run.stats.userBaseVisited.size >= 2);
    } else if (st.id === 'stage_61') {
      assert.equal(evalRes.run.final.crtText, 'ARB!K');
      assert.equal(evalRes.run.final.crtText.includes('X'), false);
      assert.equal(evalRes.run.stats.faultCount, 1);
      assert.ok(evalRes.run.stats.blockedAttacks >= 1);
      assert.equal(evalRes.run.final.ram[220], 0);
      assert.equal(evalRes.run.final.ram[236], 0);
    } else if (st.id === 'stage_62') {
      assert.equal(evalRes.run.final.crtText, 'ARB!K');
      assert.equal(evalRes.run.final.crtText.includes('X'), false);
      assert.equal(evalRes.run.final.diskPtr, 29);
      assert.equal(evalRes.run.stats.bitmap0SetHigh, true);
      assert.ok(evalRes.run.stats.irqCount >= 1);
      assert.equal(evalRes.run.stats.faultCount, 1);
      assert.ok(evalRes.run.stats.blockedAttacks >= 1);
      assert.ok(evalRes.run.stats.contextSwitchCount >= 2);
      assert.equal(evalRes.run.final.ram[214], 0);
      assert.equal(evalRes.run.final.ram[222], 0);
      assert.equal(evalRes.run.final.ram[230], 0);
      assert.equal(evalRes.run.final.ram[238], 0);
    }
  }

  // 3. Physical silicon fault propagation across all 5 core chips (NAND, SRAM_16B, TMR_IRQ, MMU_8B, PRIV_CTRL)
  const sabotageChecks = [
    ['NAND', 'stage_55'],
    ['SRAM_16B', 'stage_56'],
    ['TMR_IRQ', 'stage_60'],
    ['MMU_8B', 'stage_61'],
    ['PRIV_CTRL', 'stage_62'],
  ];
  for (const [chipId, targetStageId] of sabotageChecks) {
    const brokenChips = { ...customChips };
    const brokenCircuit = cloneCircuit(customChips[chipId].circuit);
    brokenCircuit.wires = brokenCircuit.wires.filter((w) => w.to.kind !== 'output');
    brokenChips[chipId] = { ...customChips[chipId], circuit: brokenCircuit };
    const targetSt = getStageById(targetStageId);
    const faultRes = evaluateArk8OsStage(targetSt, idealSlotsById[targetStageId], brokenChips);
    assert.equal(
      faultRes.passed,
      false,
      `Sabotaging physical chip ${chipId} must propagate and fail ${targetStageId}`
    );
  }

  // 4. storage.js Chapter 5 unlock/clear & sequential stage_55..stage_62 progression
  const preCh5Save = { clearedStages: ['stage_17', 'stage_24', 'stage_42', 'stage_53'], chapter5Unlocked: true };
  assert.equal(isChapter5Unlocked(preCh5Save), false, 'Stale chapter5Unlocked flag must not bypass stage_54');
  assert.equal(isChapter5Cleared(preCh5Save), false);
  assert.equal(isStageUnlocked(preCh5Save, 'stage_55'), false);

  const postCh4Save = { clearedStages: ['stage_17', 'stage_24', 'stage_42', 'stage_54'] };
  assert.equal(isChapter5Unlocked(postCh4Save), true);
  assert.equal(isChapter5Cleared(postCh4Save), false);
  assert.equal(isStageUnlocked(postCh4Save, 'stage_55'), true);
  assert.equal(isStageUnlocked(postCh4Save, 'stage_55b'), false);
  assert.equal(isStageUnlocked(postCh4Save, 'stage_55c'), false);
  assert.equal(isStageUnlocked(postCh4Save, 'stage_56'), false);

  const progSave = { clearedStages: ['stage_17', 'stage_24', 'stage_42', 'stage_54'] };
  for (let i = 0; i < expectedIds.length; i++) {
    const curId = expectedIds[i];
    assert.equal(isStageUnlocked(progSave, curId), true, `${curId} should be unlocked`);
    if (i + 1 < expectedIds.length) {
      assert.equal(isStageUnlocked(progSave, expectedIds[i + 1]), false, `${expectedIds[i + 1]} should still be locked`);
    }
    assert.equal(isChapter5Cleared(progSave), false);
    progSave.clearedStages.push(curId);
  }
  assert.equal(isChapter5Cleared(progSave), true);

  // 5. buildChapter5EndingSteps: beats, dynamic hardware stats, interactive choices & lossless glossary round-trip
  const ch5Ending = buildChapter5EndingSteps({
    ark8OsNandCount: 6294,
    ark8OsSwCount: 12588,
    ark8OsPullCount: 6294,
  });
  assert.ok(ch5Ending.length >= 10, `Expected >=10 Chapter 5 ending beats, got ${ch5Ending.length}`);
  assert.ok(ch5Ending.some((s) => s.text.includes('6294') && s.text.includes('12588')));
  assert.ok(ch5Ending.some((s) => s.speaker === 'ren'));
  assert.ok(ch5Ending.some((s) => Array.isArray(s.choices) && s.choices.length === 3));
  for (const [idx, step] of ch5Ending.entries()) {
    assert.ok(validSpeakers.has(step.speaker), `Unexpected Ch5 ending speaker '${step.speaker}'`);
    assert.equal(
      existsSync(new URL(`../${step.scene.replace(/^\.\//, '')}`, import.meta.url)),
      true,
      `Missing Ch5 ending scene image '${step.scene}'`
    );
    assertNoRawMarkdown(step.text, `ch5Ending[${idx}].text`);
    assert.equal(tokenizeGlossaryText(step.text).map((t) => t.text).join(''), step.text);
    for (const c of step.choices || []) {
      assert.ok(validSpeakers.has(c.replySpeaker), `Unexpected Ch5 choice speaker '${c.replySpeaker}'`);
      assertNoRawMarkdown(c.label, `ch5Ending[${idx}].choice.label`);
      assertNoRawMarkdown(c.replyText, `ch5Ending[${idx}].choice.replyText`);
      assert.equal(tokenizeGlossaryText(c.replyText).map((t) => t.text).join(''), c.replyText);
    }
  }

  // 6. index.html, sw.js (silicon-genesis-v41/42, scene_storm_core.jpg, chapter5Stages.js) & ZERO leftover v=40 across codebase
  const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(indexHtml, /styles\/main\.css\?v=(?:41|42|43)/);
  assert.match(indexHtml, /src\/main\.js\?v=(?:41|42|43)/);
  assert.match(indexHtml, /id="btn-title-chapter5"/);
  assert.match(indexHtml, /id="btn-title-end5"/);

  const swSrc = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.match(swSrc, /silicon-genesis-v(?:41|42|43)/);
  assert.match(swSrc, /scene_storm_core\.jpg/);
  assert.match(swSrc, /chapter5Stages\.js/);
  assert.match(swSrc, /osHwRunner\.js\?v=(?:41|42|43)/);
  assert.match(swSrc, /ark8OsIde\.js\?v=(?:41|42|43)/);

  const collectFiles = (dirUrl, prefix) => {
    const out = [];
    for (const ent of readdirSync(dirUrl, { withFileTypes: true })) {
      const rel = `${prefix}/${ent.name}`;
      if (ent.isDirectory()) {
        out.push(...collectFiles(new URL(`${ent.name}/`, dirUrl), rel));
      } else if (ent.name.endsWith('.js') || ent.name.endsWith('.css')) {
        out.push(rel);
      }
    }
    return out;
  };
  const checkedPaths = [
    'index.html',
    'sw.js',
    ...collectFiles(new URL('../src/', import.meta.url), 'src'),
    ...collectFiles(new URL('../styles/', import.meta.url), 'styles'),
  ];
  for (const relPath of checkedPaths) {
    const src = readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf8');
    assert.equal(
      /\?v=40\b|silicon-genesis-v40\b/.test(src),
      false,
      `Leftover v40 cache string found in ${relPath}`
    );
  }
});

test('v42 Chapter 5 Complete: STACK_ABI, MALLOC_STRDUP & RAM Write-Blame Observability', () => {
  // 1. Sequential ACT XII placement (stage_55 -> stage_55b -> stage_55c -> stage_56), metadata & progression
  const st55 = getStageById('stage_55');
  const st55b = getStageById('stage_55b');
  const st55c = getStageById('stage_55c');
  const st56 = getStageById('stage_56');
  assert.ok(st55 && st55b && st55c && st56);

  const idx55 = STAGES.findIndex((s) => s.id === 'stage_55');
  assert.deepEqual(
    STAGES.slice(idx55, idx55 + 4).map((s) => s.id),
    ['stage_55', 'stage_55b', 'stage_55c', 'stage_56']
  );
  for (const st of [st55, st55b, st55c, st56]) {
    assert.equal(st.chapter, 5);
    assert.equal(st.act, 12);
  }
  assert.equal(st55b.code, '55-B');
  assert.equal(st55b.rewardChip.id, 'STACK_ABI');
  assert.equal(st55b.asmProgramSpec.memInspectorPreset, 'stack_abi');
  assert.equal(getGlossaryTerm('stack_abi')?.anim, 'ch5_stack_abi');
  assert.ok(st55b.introDialogue.some((d) => d.visualCard?.anim === 'ch5_stack_abi'));

  assert.equal(st55c.code, '55-C');
  assert.equal(st55c.rewardChip.id, 'MALLOC_STRDUP');
  assert.equal(st55c.asmProgramSpec.memInspectorPreset, 'malloc_strdup');
  assert.equal(getGlossaryTerm('malloc_strdup')?.anim, 'ch5_malloc_strdup');
  assert.ok(st55c.introDialogue.some((d) => d.visualCard?.anim === 'ch5_malloc_strdup'));

  // Exact sequential isStageUnlocked gate: stage_55 -> stage_55b -> stage_55c -> stage_56
  const baseCleared = ['stage_17', 'stage_24', 'stage_42', 'stage_54'];
  assert.equal(isStageUnlocked({ clearedStages: [...baseCleared] }, 'stage_55'), true);
  assert.equal(isStageUnlocked({ clearedStages: [...baseCleared] }, 'stage_55b'), false);
  assert.equal(isStageUnlocked({ clearedStages: [...baseCleared, 'stage_55'] }, 'stage_55b'), true);
  assert.equal(isStageUnlocked({ clearedStages: [...baseCleared, 'stage_55'] }, 'stage_55c'), false);
  assert.equal(isStageUnlocked({ clearedStages: [...baseCleared, 'stage_55', 'stage_55b'] }, 'stage_55c'), true);
  assert.equal(isStageUnlocked({ clearedStages: [...baseCleared, 'stage_55', 'stage_55b'] }, 'stage_56'), false);
  assert.equal(isStageUnlocked({ clearedStages: [...baseCleared, 'stage_55', 'stage_55b', 'stage_55c'] }, 'stage_56'), true);

  // 2. Zero raw Markdown (`**` or backticks) across ALL 10 Chapter 5 stages, CODEX_ENTRIES, GLOSSARY_TERMS & SYMBOL_CATALOG
  const assertNoRawMarkdownDeep = (val, label) => {
    if (typeof val === 'string') {
      assert.equal(
        val.includes('**') || val.includes('`'),
        false,
        `Raw Markdown found in ${label}: ${val.slice(0, 120)}`
      );
    } else if (Array.isArray(val)) {
      val.forEach((item, i) => assertNoRawMarkdownDeep(item, `${label}[${i}]`));
    } else if (val && typeof val === 'object') {
      for (const [k, v] of Object.entries(val)) {
        assertNoRawMarkdownDeep(v, `${label}.${k}`);
      }
    }
  };
  for (const st of STAGES.filter((s) => s.chapter === 5)) {
    assertNoRawMarkdownDeep(st, st.id);
  }
  assertNoRawMarkdownDeep(CODEX_ENTRIES, 'CODEX_ENTRIES');
  assertNoRawMarkdownDeep(GLOSSARY_TERMS, 'GLOSSARY_TERMS');
  assertNoRawMarkdownDeep(SYMBOL_CATALOG, 'SYMBOL_CATALOG');

  // 3. Live 18,880-MOSFET execution, text round-trip, secondary anti-cheat runs & RAM Write-Blame!
  const customChips = {};
  provisionStandardChips(customChips, { includeChapter4Hardware: true, provisioned: false });

  const extractIdealSlots = (st) => {
    const slots = {};
    for (const r of st.asmProgramSpec.rows) {
      if (!r.locked) slots[r.slotId] = r.ideal;
    }
    const text = formatArk8OsProgramText(st, slots);
    const parsed = assembleArk8OsProgramText(text, st);
    assert.equal(parsed.ok, true, `${st.id} round-trip failed: ${JSON.stringify(parsed.errors)}`);
    assert.deepEqual(parsed.slots, slots);
    return parsed.slots;
  };

  // Stage 55-B (STACK_ABI): "BA" & secondary "YX", minSp <= 237, Write-Blame stack clobber detection on 0xEE!
  const slots55b = extractIdealSlots(st55b);
  const eval55b = evaluateArk8OsStage(st55b, slots55b, customChips);
  assert.equal(eval55b.passed, true, `stage_55b failed: ${eval55b.message}`);
  assert.equal(eval55b.run.hw.siliconStats.isPhysicalSilicon, true);
  assert.equal(eval55b.run.hw.siliconStats.boardSwCount, 18880);
  assert.equal(eval55b.run.final.crtText, 'BA');
  assert.ok(eval55b.run.stats.minSp <= 237, `Expected minSp <= 237, got ${eval55b.run.stats.minSp}`);
  assert.equal(eval55b.run.final.sp, 240);

  const alt55b = runArk8OsProgram(st55b, slots55b, customChips, {
    hw: eval55b.run.hw,
    fast: true,
    initialRam: st55b.asmProgramSpec.altInitialRam,
  });
  assert.equal(alt55b.haltedNormally, true);
  assert.equal(alt55b.final.crtText, 'YX');
  assert.ok(alt55b.stats.minSp <= 237);
  assert.equal(alt55b.final.sp, 240);

  // Temporal RAM Write-Blame on 0xEE (238): step 10 => PC 19 PUSH R1 ('A'=65), step 99 => PC 16 PUSH R0 ('!'=33)
  const blame55bEarly = getRamWriterAtStep(eval55b.run.ramWriteLog, 0xee, 10);
  assert.ok(blame55bEarly, 'Expected write record on 0xEE by step 10');
  assert.equal(blame55bEarly.pc, 19);
  assert.equal(blame55bEarly.op, 'PUSH');
  assert.equal(blame55bEarly.name, 'PUSH R1');
  assert.equal(blame55bEarly.val, 65); // 'A'

  const blame55bLate = getRamWriterAtStep(eval55b.run.ramWriteLog, 0xee, 99);
  assert.ok(blame55bLate, 'Expected overwrite record on 0xEE by step 99');
  assert.equal(blame55bLate.pc, 16);
  assert.equal(blame55bLate.op, 'PUSH');
  assert.equal(blame55bLate.name, 'PUSH R0');
  assert.equal(blame55bLate.val, 33); // '!'
  assert.ok(blame55bLate.stepIdx > blame55bEarly.stepIdx, 'Clobber write must occur after original PUSH R1');

  // Stage 55-C (MALLOC_STRDUP): "OK:MK:!R" & secondary "HI:WI:!R", virgin static 0x50, alloc->free->reuse on 0x70!
  const slots55c = extractIdealSlots(st55c);
  const eval55c = evaluateArk8OsStage(st55c, slots55c, customChips, { hw: eval55b.run.hw });
  assert.equal(eval55c.passed, true, `stage_55c failed: ${eval55c.message}`);
  assert.equal(eval55c.run.final.crtText, 'OK:MK:!R');
  assert.equal(eval55c.run.final.sp, 240);

  const alt55c = runArk8OsProgram(st55c, slots55c, customChips, {
    hw: eval55c.run.hw,
    fast: true,
    initialRam: st55c.asmProgramSpec.altInitialRam,
  });
  assert.equal(alt55c.haltedNormally, true);
  assert.equal(alt55c.final.crtText, 'HI:WI:!R');
  assert.equal(alt55c.final.sp, 240);

  // Temporal RAM Write-Blame on stage_55c:
  //   - 0x50 (static source "OK") is NEVER written -> getRamWriterAtStep(..., 0x50, 999) === null!
  //   - 0x70 (Chunk 0 header) records full alloc(1) -> free(0) -> reuse(1) lifecycle!
  assert.equal(getRamWriterAtStep(eval55c.run.ramWriteLog, 0x50, 999), null);
  const chunk0Writes = eval55c.run.ramWriteLog.filter((e) => e.addr === 0x70);
  assert.deepEqual(
    chunk0Writes.map((e) => e.val),
    [1, 0, 1],
    'Chunk 0 header [0x70] must record alloc(1) -> free(0) -> reuse(1)'
  );
  assert.equal(getRamWriterAtStep(eval55c.run.ramWriteLog, 0x70, chunk0Writes[0].stepIdx)?.val, 1);
  assert.equal(getRamWriterAtStep(eval55c.run.ramWriteLog, 0x70, chunk0Writes[1].stepIdx)?.val, 0);
  assert.equal(getRamWriterAtStep(eval55c.run.ramWriteLog, 0x70, chunk0Writes[2].stepIdx)?.val, 1);

  // 4. Physical silicon sabotage: breaking NAND or SRAM_16B fails BOTH stage_55b & stage_55c!
  for (const chipId of ['NAND', 'SRAM_16B']) {
    const brokenChips = { ...customChips };
    const brokenCircuit = cloneCircuit(customChips[chipId].circuit);
    brokenCircuit.wires = brokenCircuit.wires.filter((w) => w.to.kind !== 'output');
    brokenChips[chipId] = { ...customChips[chipId], circuit: brokenCircuit };
    assert.equal(
      evaluateArk8OsStage(st55b, slots55b, brokenChips).passed,
      false,
      `Breaking physical ${chipId} must fail stage_55b`
    );
    assert.equal(
      evaluateArk8OsStage(st55c, slots55c, brokenChips).passed,
      false,
      `Breaking physical ${chipId} must fail stage_55c`
    );
  }

  // 5. storyDiagram.js, ark8OsIde.js Write-Blame UI hooks & ZERO leftover v=41 / silicon-genesis-v41 across codebase
  const storyDiagramSrc = readFileSync(new URL('../src/ui/storyDiagram.js', import.meta.url), 'utf8');
  assert.match(storyDiagramSrc, /case 'ch5_stack_abi':/);
  assert.match(storyDiagramSrc, /case 'ch5_malloc_strdup':/);

  const ideSrc = readFileSync(new URL('../src/ui/ark8OsIde.js', import.meta.url), 'utf8');
  assert.match(ideSrc, /\bgetRamWriterAtStep\b/);
  assert.match(ideSrc, /stack_abi/);
  assert.match(ideSrc, /malloc_strdup/);
  assert.match(ideSrc, /os-fetch-boundary/);
  assert.match(ideSrc, /os-dual-gutter/);

  const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(indexHtml, /styles\/main\.css\?v=43/);
  assert.match(indexHtml, /src\/main\.js\?v=43/);

  const swSrc = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.match(swSrc, /silicon-genesis-v43/);
  assert.match(swSrc, /osHwRunner\.js\?v=43/);
  assert.match(swSrc, /ark8OsIde\.js\?v=43/);

  const collectFiles = (dirUrl, prefix) => {
    const out = [];
    for (const ent of readdirSync(dirUrl, { withFileTypes: true })) {
      const rel = `${prefix}/${ent.name}`;
      if (ent.isDirectory()) {
        out.push(...collectFiles(new URL(`${ent.name}/`, dirUrl), rel));
      } else if (ent.name.endsWith('.js') || ent.name.endsWith('.css')) {
        out.push(rel);
      }
    }
    return out;
  };
  const checkedPaths = [
    'index.html',
    'sw.js',
    ...collectFiles(new URL('../src/', import.meta.url), 'src'),
    ...collectFiles(new URL('../styles/', import.meta.url), 'styles'),
  ];
  for (const relPath of checkedPaths) {
    const src = readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf8');
    assert.equal(
      /\?v=42\b|silicon-genesis-v42\b/.test(src),
      false,
      `Leftover v42 cache string found in ${relPath}`
    );
  }
});

test('Stage 12 (D_LATCH) respects hold-time locking across all 16 commutative NAND/AND pin permutations', () => {
  const st12 = getStageById('stage_12');
  const baseChips = {};
  provisionStandardChips(baseChips, { includeChapter1Hardware: true });

  for (let mask = 0; mask < 16; mask++) {
    const swapNand = Boolean(mask & 1);
    const swapAnd = Boolean(mask & 2);
    const swapAs = Boolean(mask & 4);
    const swapAr = Boolean(mask & 8);

    const chips = JSON.parse(JSON.stringify(baseChips));
    if (swapNand) {
      for (const w of chips.NAND.circuit.wires) {
        if (w.from.kind === 'input') w.from.pin = 1 - w.from.pin;
      }
    }
    if (swapAnd) {
      for (const w of chips.AND.circuit.wires) {
        if (w.from.kind === 'input') w.from.pin = 1 - w.from.pin;
      }
    }
    const c12 = buildBlueprintCircuit('stage_12');
    for (const w of c12.wires) {
      if (swapAs && w.to.kind === 'node' && w.to.nodeId === 'as') w.to.pin = 1 - w.to.pin;
      if (swapAr && w.to.kind === 'node' && w.to.nodeId === 'ar') w.to.pin = 1 - w.to.pin;
    }

    const res = evaluateStage(st12, c12, chips);
    assert.equal(
      res.passed,
      true,
      `Stage 12 failed for permutation mask=${mask} (swapNand=${swapNand}, swapAnd=${swapAnd}, swapAs=${swapAs}, swapAr=${swapAr}): ${JSON.stringify(res.results)}`
    );
  }

  // Negative check: pass-through wire D -> Q (no WE lock) must still FAIL
  const broken = buildCircuit(st12, [], [[inp(0), out(0)]]);
  const badRes = evaluateStage(st12, broken, baseChips);
  assert.equal(badRes.passed, false, 'Broken pass-through D->Q must fail Stage 12');

  // Verify real-world Verilog / Netlist / FPGA / Photolithography explainer glossary links
  const freshSave = { clearedStages: [], customChips: {}, discoveredTerms: [] };
  const modalsSrc = readFileSync(new URL('../src/ui/modals.js', import.meta.url), 'utf8');
  for (const tid of ['verilog_hdl', 'netlist', 'fpga', 'photolithography']) {
    const term = getGlossaryTerm(tid);
    assert.ok(term, `Missing glossary term ${tid}`);
    assert.equal(isGlossaryTermUnlocked(tid, freshSave), true, `${tid} should be unlocked from start`);
    assert.equal(/\*\*|`/.test(term.summary + (term.analogy || '')), false, `No raw markdown in ${tid}`);
    assert.ok(modalsSrc.includes(`data-term-id="${tid}"`), `modals.js must link ${tid}`);
  }
});
