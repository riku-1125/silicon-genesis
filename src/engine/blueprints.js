/**
 * SILICON GENESIS — Canonical Bottom-Up Circuit Blueprints
 *
 * Used when provisioning standard working circuits for players who launch
 * Chapter 2 directly from the Home screen, and for automated integration tests.
 *
 * Provisioned chips are marked with `provisioned: true` so the UI and save data
 * clearly distinguish "provisioned standard chips (支給品)" from "player-forged
 * chips (自作済み)".
 */

import { STAGES, getStageById } from '../data/stages.js';
import { createEmptyCircuit, connectWire, computeCircuitMetrics } from './circuit.js';

const inp = (pin) => ({ kind: 'input', pin });
const out = (pin) => ({ kind: 'output', pin });
const np = (nodeId, pin) => ({ kind: 'node', nodeId, pin });

export const STANDARD_BLUEPRINTS = {
  stage_00: {
    nodes: [
      { id: 'vcc', type: 'CONST_1' },
      { id: 'sw1', type: 'SW' },
      { id: 'sw2', type: 'SW' },
      { id: 'pull', type: 'PULL' },
    ],
    wires: [
      [np('vcc', 0), np('sw1', 0)],
      [inp(0), np('sw1', 1)],
      [np('sw1', 0), np('sw2', 0)],
      [inp(1), np('sw2', 1)],
      [np('sw2', 0), np('pull', 0)],
      [np('pull', 0), out(0)],
    ],
  },
  stage_01: {
    nodes: [{ id: 'g1', type: 'NAND' }],
    wires: [
      [inp(0), np('g1', 0)],
      [inp(0), np('g1', 1)],
      [np('g1', 0), out(0)],
    ],
  },
  stage_02: {
    nodes: [
      { id: 'n1', type: 'NAND' },
      { id: 'i1', type: 'NOT' },
    ],
    wires: [
      [inp(0), np('n1', 0)],
      [inp(1), np('n1', 1)],
      [np('n1', 0), np('i1', 0)],
      [np('i1', 0), out(0)],
    ],
  },
  stage_03: {
    nodes: [
      { id: 'na', type: 'NOT' },
      { id: 'nb', type: 'NOT' },
      { id: 'g', type: 'NAND' },
    ],
    wires: [
      [inp(0), np('na', 0)],
      [inp(1), np('nb', 0)],
      [np('na', 0), np('g', 0)],
      [np('nb', 0), np('g', 1)],
      [np('g', 0), out(0)],
    ],
  },
  stage_04: {
    nodes: [
      { id: 'o1', type: 'OR' },
      { id: 'n1', type: 'NAND' },
      { id: 'a1', type: 'AND' },
    ],
    wires: [
      [inp(0), np('o1', 0)],
      [inp(1), np('o1', 1)],
      [inp(0), np('n1', 0)],
      [inp(1), np('n1', 1)],
      [np('o1', 0), np('a1', 0)],
      [np('n1', 0), np('a1', 1)],
      [np('a1', 0), out(0)],
    ],
  },
  stage_05: {
    nodes: [
      { id: 'x1', type: 'XOR' },
      { id: 'a1', type: 'AND' },
    ],
    wires: [
      [inp(0), np('x1', 0)],
      [inp(1), np('x1', 1)],
      [inp(0), np('a1', 0)],
      [inp(1), np('a1', 1)],
      [np('x1', 0), out(0)],
      [np('a1', 0), out(1)],
    ],
  },
  stage_06: {
    nodes: [
      { id: 'ha1', type: 'HALF_ADDER' },
      { id: 'ha2', type: 'HALF_ADDER' },
      { id: 'o1', type: 'OR' },
    ],
    wires: [
      [inp(0), np('ha1', 0)],
      [inp(1), np('ha1', 1)],
      [np('ha1', 0), np('ha2', 0)],
      [inp(2), np('ha2', 1)],
      [np('ha2', 0), out(0)],
      [np('ha1', 1), np('o1', 0)],
      [np('ha2', 1), np('o1', 1)],
      [np('o1', 0), out(1)],
    ],
  },
  stage_07: {
    nodes: [
      { id: 'fa0', type: 'FULL_ADDER' },
      { id: 'fa1', type: 'FULL_ADDER' },
      { id: 'fa2', type: 'FULL_ADDER' },
      { id: 'fa3', type: 'FULL_ADDER' },
    ],
    wires: [
      [inp(0), np('fa0', 0)], [inp(4), np('fa0', 1)], [inp(8), np('fa0', 2)], [np('fa0', 0), out(0)],
      [inp(1), np('fa1', 0)], [inp(5), np('fa1', 1)], [np('fa0', 1), np('fa1', 2)], [np('fa1', 0), out(1)],
      [inp(2), np('fa2', 0)], [inp(6), np('fa2', 1)], [np('fa1', 1), np('fa2', 2)], [np('fa2', 0), out(2)],
      [inp(3), np('fa3', 0)], [inp(7), np('fa3', 1)], [np('fa2', 1), np('fa3', 2)], [np('fa3', 0), out(3)],
      [np('fa3', 1), out(4)],
    ],
  },
  stage_08: {
    nodes: [
      { id: 'ns', type: 'NOT' },
      { id: 'a0', type: 'AND' },
      { id: 'a1', type: 'AND' },
      { id: 'o1', type: 'OR' },
    ],
    wires: [
      [inp(2), np('ns', 0)],
      [inp(0), np('a0', 0)], [np('ns', 0), np('a0', 1)],
      [inp(1), np('a1', 0)], [inp(2), np('a1', 1)],
      [np('a0', 0), np('o1', 0)], [np('a1', 0), np('o1', 1)],
      [np('o1', 0), out(0)],
    ],
  },
  stage_09: {
    nodes: [
      { id: 'm0', type: 'MUX' },
      { id: 'm1', type: 'MUX' },
      { id: 'm2', type: 'MUX' },
      { id: 'm3', type: 'MUX' },
    ],
    wires: [
      [inp(0), np('m0', 0)], [inp(4), np('m0', 1)], [inp(8), np('m0', 2)], [np('m0', 0), out(0)],
      [inp(1), np('m1', 0)], [inp(5), np('m1', 1)], [inp(8), np('m1', 2)], [np('m1', 0), out(1)],
      [inp(2), np('m2', 0)], [inp(6), np('m2', 1)], [inp(8), np('m2', 2)], [np('m2', 0), out(2)],
      [inp(3), np('m3', 0)], [inp(7), np('m3', 1)], [inp(8), np('m3', 2)], [np('m3', 0), out(3)],
    ],
  },
  stage_10: {
    nodes: [
      { id: 'n0', type: 'NOT' },
      { id: 'n1', type: 'NOT' },
      { id: 'y0', type: 'AND' },
      { id: 'y1', type: 'AND' },
      { id: 'y2', type: 'AND' },
      { id: 'y3', type: 'AND' },
    ],
    wires: [
      [inp(0), np('n0', 0)],
      [inp(1), np('n1', 0)],
      [np('n0', 0), np('y0', 0)], [np('n1', 0), np('y0', 1)], [np('y0', 0), out(0)],
      [inp(0), np('y1', 0)], [np('n1', 0), np('y1', 1)], [np('y1', 0), out(1)],
      [np('n0', 0), np('y2', 0)], [inp(1), np('y2', 1)], [np('y2', 0), out(2)],
      [inp(0), np('y3', 0)], [inp(1), np('y3', 1)], [np('y3', 0), out(3)],
    ],
  },
  stage_11: {
    nodes: [
      { id: 'ns', type: 'NOT' },
      { id: 'nr', type: 'NOT' },
      { id: 'q', type: 'NAND' },
      { id: 'qn', type: 'NAND' },
    ],
    wires: [
      [inp(0), np('ns', 0)],
      [inp(1), np('nr', 0)],
      [np('ns', 0), np('q', 0)],
      [np('qn', 0), np('q', 1)],
      [np('nr', 0), np('qn', 0)],
      [np('q', 0), np('qn', 1)],
      [np('q', 0), out(0)],
      [np('qn', 0), out(1)],
    ],
  },
  stage_12: {
    nodes: [
      { id: 'nd', type: 'NOT' },
      { id: 'as', type: 'AND' },
      { id: 'ar', type: 'AND' },
      { id: 'sr', type: 'SR_LATCH' },
    ],
    wires: [
      [inp(0), np('nd', 0)],
      [inp(0), np('as', 0)], [inp(1), np('as', 1)],
      [np('nd', 0), np('ar', 0)], [inp(1), np('ar', 1)],
      [np('as', 0), np('sr', 0)],
      [np('ar', 0), np('sr', 1)],
      [np('sr', 0), out(0)],
    ],
  },
  stage_13: {
    nodes: [
      { id: 'nc', type: 'NOT' },
      { id: 'm', type: 'D_LATCH' },
      { id: 's', type: 'D_LATCH' },
    ],
    wires: [
      [inp(1), np('nc', 0)],
      [inp(0), np('m', 0)], [np('nc', 0), np('m', 1)],
      [np('m', 0), np('s', 0)], [inp(1), np('s', 1)],
      [np('s', 0), out(0)],
    ],
  },
  stage_14: {
    nodes: [
      { id: 'mx', type: 'MUX_4BIT' },
      { id: 'f0', type: 'D_FF' },
      { id: 'f1', type: 'D_FF' },
      { id: 'f2', type: 'D_FF' },
      { id: 'f3', type: 'D_FF' },
    ],
    wires: [
      [np('f0', 0), np('mx', 0)],
      [np('f1', 0), np('mx', 1)],
      [np('f2', 0), np('mx', 2)],
      [np('f3', 0), np('mx', 3)],
      [inp(0), np('mx', 4)],
      [inp(1), np('mx', 5)],
      [inp(2), np('mx', 6)],
      [inp(3), np('mx', 7)],
      [inp(4), np('mx', 8)],
      [np('mx', 0), np('f0', 0)], [inp(5), np('f0', 1)], [np('f0', 0), out(0)],
      [np('mx', 1), np('f1', 0)], [inp(5), np('f1', 1)], [np('f1', 0), out(1)],
      [np('mx', 2), np('f2', 0)], [inp(5), np('f2', 1)], [np('f2', 0), out(2)],
      [np('mx', 3), np('f3', 0)], [inp(5), np('f3', 1)], [np('f3', 0), out(3)],
    ],
  },
  stage_15: {
    nodes: [
      { id: 'x0', type: 'XOR' },
      { id: 'x1', type: 'XOR' },
      { id: 'x2', type: 'XOR' },
      { id: 'x3', type: 'XOR' },
      { id: 'add', type: 'ADD_4BIT' },
    ],
    wires: [
      [inp(0), np('add', 0)], [inp(1), np('add', 1)], [inp(2), np('add', 2)], [inp(3), np('add', 3)],
      [inp(4), np('x0', 0)], [inp(8), np('x0', 1)], [np('x0', 0), np('add', 4)],
      [inp(5), np('x1', 0)], [inp(8), np('x1', 1)], [np('x1', 0), np('add', 5)],
      [inp(6), np('x2', 0)], [inp(8), np('x2', 1)], [np('x2', 0), np('add', 6)],
      [inp(7), np('x3', 0)], [inp(8), np('x3', 1)], [np('x3', 0), np('add', 7)],
      [inp(8), np('add', 8)],
      [np('add', 0), out(0)], [np('add', 1), out(1)], [np('add', 2), out(2)], [np('add', 3), out(3)],
      [np('add', 4), out(4)],
    ],
  },
  stage_16: {
    nodes: [
      { id: 'c0', type: 'CONST_0' },
      { id: 'c1', type: 'CONST_1' },
      { id: 'add', type: 'ADD_4BIT' },
      { id: 'mx', type: 'MUX_4BIT' },
      { id: 'reg', type: 'REG_4BIT' },
    ],
    wires: [
      [np('reg', 0), np('add', 0)], [np('reg', 1), np('add', 1)], [np('reg', 2), np('add', 2)], [np('reg', 3), np('add', 3)],
      [np('c0', 0), np('add', 4)], [np('c0', 0), np('add', 5)], [np('c0', 0), np('add', 6)], [np('c0', 0), np('add', 7)],
      [np('c1', 0), np('add', 8)],
      [np('add', 0), np('mx', 0)], [np('add', 1), np('mx', 1)], [np('add', 2), np('mx', 2)], [np('add', 3), np('mx', 3)],
      [inp(0), np('mx', 4)], [inp(1), np('mx', 5)], [inp(2), np('mx', 6)], [inp(3), np('mx', 7)],
      [inp(4), np('mx', 8)],
      [np('mx', 0), np('reg', 0)], [np('mx', 1), np('reg', 1)], [np('mx', 2), np('reg', 2)], [np('mx', 3), np('reg', 3)],
      [np('c1', 0), np('reg', 4)],
      [inp(5), np('reg', 5)],
      [np('reg', 0), out(0)], [np('reg', 1), out(1)], [np('reg', 2), out(2)], [np('reg', 3), out(3)],
    ],
  },
  stage_17: {
    nodes: [
      { id: 'alu', type: 'ALU_4BIT' },
      { id: 'mx', type: 'MUX_4BIT' },
      { id: 'reg', type: 'REG_4BIT' },
    ],
    wires: [
      [np('reg', 0), np('alu', 0)], [np('reg', 1), np('alu', 1)], [np('reg', 2), np('alu', 2)], [np('reg', 3), np('alu', 3)],
      [inp(0), np('alu', 4)], [inp(1), np('alu', 5)], [inp(2), np('alu', 6)], [inp(3), np('alu', 7)],
      [inp(4), np('alu', 8)],
      [np('alu', 0), np('mx', 0)], [np('alu', 1), np('mx', 1)], [np('alu', 2), np('mx', 2)], [np('alu', 3), np('mx', 3)],
      [inp(0), np('mx', 4)], [inp(1), np('mx', 5)], [inp(2), np('mx', 6)], [inp(3), np('mx', 7)],
      [inp(5), np('mx', 8)],
      [np('mx', 0), np('reg', 0)], [np('mx', 1), np('reg', 1)], [np('mx', 2), np('reg', 2)], [np('mx', 3), np('reg', 3)],
      [inp(6), np('reg', 4)],
      [inp(7), np('reg', 5)],
      [np('reg', 0), out(0)], [np('reg', 1), out(1)], [np('reg', 2), out(2)], [np('reg', 3), out(3)],
    ],
  },
  stage_18: {
    nodes: [
      { id: 'o01', type: 'OR' },
      { id: 'o23', type: 'OR' },
      { id: 'oall', type: 'OR' },
      { id: 'inv', type: 'NOT' },
    ],
    wires: [
      [inp(0), np('o01', 0)], [inp(1), np('o01', 1)],
      [inp(2), np('o23', 0)], [inp(3), np('o23', 1)],
      [np('o01', 0), np('oall', 0)], [np('o23', 0), np('oall', 1)],
      [np('oall', 0), np('inv', 0)],
      [np('inv', 0), out(0)],
    ],
  },
  stage_19: {
    nodes: [
      { id: 'z4', type: 'ZERO_4BIT' },
      { id: 'nz', type: 'NOT' },
      { id: 'and', type: 'AND' },
      { id: 'pc', type: 'PC_4BIT' },
    ],
    wires: [
      [inp(0), np('z4', 0)], [inp(1), np('z4', 1)], [inp(2), np('z4', 2)], [inp(3), np('z4', 3)],
      [np('z4', 0), np('nz', 0)],
      [np('nz', 0), np('and', 0)], [inp(8), np('and', 1)],
      [inp(4), np('pc', 0)], [inp(5), np('pc', 1)], [inp(6), np('pc', 2)], [inp(7), np('pc', 3)],
      [np('and', 0), np('pc', 4)],
      [inp(9), np('pc', 5)],
      [np('pc', 0), out(0)], [np('pc', 1), out(1)], [np('pc', 2), out(2)], [np('pc', 3), out(3)],
    ],
  },
  stage_20: {
    nodes: [
      { id: 'dec', type: 'DEC_2TO4' },
      { id: 'not', type: 'NOT' },
    ],
    wires: [
      [inp(0), np('dec', 0)], [inp(1), np('dec', 1)],
      [np('dec', 2), out(0)],
      [np('dec', 0), out(1)],
      [np('dec', 3), np('not', 0)], [np('not', 0), out(2)],
      [np('dec', 3), out(3)],
    ],
  },
  stage_21: {
    nodes: [
      { id: 'idec', type: 'INST_DEC' },
      { id: 'cpu', type: 'ARK4_CORE' },
      { id: 'cpc', type: 'COND_PC' },
    ],
    wires: [
      [inp(0), np('idec', 0)], [inp(1), np('idec', 1)],
      [inp(2), np('cpu', 0)], [inp(3), np('cpu', 1)], [inp(4), np('cpu', 2)], [inp(5), np('cpu', 3)],
      [inp(2), np('cpc', 4)], [inp(3), np('cpc', 5)], [inp(4), np('cpc', 6)], [inp(5), np('cpc', 7)],
      [np('idec', 0), np('cpu', 4)],
      [np('idec', 1), np('cpu', 5)],
      [np('idec', 2), np('cpu', 6)],
      [np('idec', 3), np('cpc', 8)],
      [inp(6), np('cpu', 7)],
      [inp(6), np('cpc', 9)],
      [np('cpu', 0), out(0)], [np('cpu', 1), out(1)], [np('cpu', 2), out(2)], [np('cpu', 3), out(3)],
      [np('cpu', 0), np('cpc', 0)], [np('cpu', 1), np('cpc', 1)], [np('cpu', 2), np('cpc', 2)], [np('cpu', 3), np('cpc', 3)],
      [np('cpc', 0), out(4)], [np('cpc', 1), out(5)], [np('cpc', 2), out(6)], [np('cpc', 3), out(7)],
    ],
  },
  stage_asm_enc: {
    inputs: ['LDI', 'ADD', 'SUB', 'JNZ'],
    outputs: ['I0', 'I1', 'KEY'],
    nodes: [
      { id: 'oi0', type: 'OR' },
      { id: 'oi1', type: 'OR' },
      { id: 'ok1', type: 'OR' },
      { id: 'ok2', type: 'OR' },
    ],
    wires: [
      [inp(1), np('oi0', 0)], [inp(3), np('oi0', 1)], [np('oi0', 0), out(0)],
      [inp(2), np('oi1', 0)], [inp(3), np('oi1', 1)], [np('oi1', 0), out(1)],
      [inp(0), np('ok1', 0)], [inp(1), np('ok1', 1)],
      [np('ok1', 0), np('ok2', 0)], [np('oi1', 0), np('ok2', 1)], [np('ok2', 0), out(2)],
    ],
  },
  stage_rom_4w: {
    nodes: [
      { id: 'dec', type: 'DEC_2TO4' },
      { id: 'oi0', type: 'OR' },
      { id: 'oi1', type: 'OR' },
      { id: 'om0', type: 'OR' },
      { id: 'om2', type: 'OR' },
    ],
    wires: [
      [inp(0), np('dec', 0)], [inp(1), np('dec', 1)],
      [np('dec', 1), np('oi0', 0)], [np('dec', 3), np('oi0', 1)], [np('oi0', 0), out(0)],
      [np('dec', 2), np('oi1', 0)], [np('dec', 3), np('oi1', 1)], [np('oi1', 0), out(1)],
      [np('dec', 0), np('om0', 0)], [np('dec', 1), np('om0', 1)], [np('om0', 0), out(2)],
      [np('dec', 1), out(3)],
      [np('dec', 0), np('om2', 0)], [np('dec', 2), np('om2', 1)], [np('om2', 0), out(4)],
      [np('dec', 3), out(5)],
    ],
  },
};

export function buildBlueprintCircuit(stageIdOrStage) {
  const stage = typeof stageIdOrStage === 'string' ? getStageById(stageIdOrStage) : stageIdOrStage;
  const bp = STANDARD_BLUEPRINTS[stage?.id];
  if (!stage || !bp) return null;

  const inputs = bp.inputs ? [...bp.inputs] : [...stage.inputs];
  const outputs = bp.outputs ? [...bp.outputs] : [...stage.outputs];
  let c = createEmptyCircuit(inputs, outputs);
  c.nodes = bp.nodes.map((n, idx) => ({
    id: n.id,
    type: n.type,
    x: n.x ?? 180 + (idx % 3) * 145,
    y: n.y ?? 90 + Math.floor(idx / 3) * 110,
  }));
  let wid = 1;
  for (const [from, to] of bp.wires) {
    c = connectWire(c, from, to, () => `w${wid++}`);
  }
  return c;
}

export function buildStandardChipDef(stageIdOrStage, customChips, { provisioned = true } = {}) {
  const stage = typeof stageIdOrStage === 'string' ? getStageById(stageIdOrStage) : stageIdOrStage;
  const reward = stage?.rewardChip;
  if (!stage || !reward || reward.isLabReward) return null;
  const circuit = buildBlueprintCircuit(stage);
  if (!circuit) return null;
  const metrics = computeCircuitMetrics(circuit, customChips);
  return {
    ...reward,
    inputs: reward.inputs ? [...reward.inputs] : [...circuit.inputs],
    outputs: reward.outputs ? [...reward.outputs] : [...circuit.outputs],
    circuit,
    nandCount: metrics.nandCount,
    swCount: metrics.swCount,
    pullCount: metrics.pullCount,
    depth: metrics.depth,
    stageId: stage.id,
    provisioned,
    createdAt: Date.now(),
  };
}

/**
 * Provisions any missing standard chips into `customChips` without overwriting
 * any chips the player has already forged. Always ensures Stage 00-C (`NAND`)
 * is provisioned first so all compiled hardware runs on true MOSFET+Resistor silicon.
 */
export function provisionStandardChips(
  customChips,
  { includeChapter2Hardware = false, provisioned = true } = {}
) {
  if (!customChips.NAND) {
    const st0 = getStageById('stage_00');
    if (st0) {
      const def = buildStandardChipDef(st0, customChips, { provisioned });
      if (def) customChips.NAND = def;
    }
  }

  const targetStages = STAGES.filter((s) =>
    includeChapter2Hardware ? s.mode !== 'physics' : s.chapter !== 2 && s.mode !== 'physics'
  );

  for (const st of targetStages) {
    const reward = st.rewardChip;
    if (!reward || reward.isLabReward) continue;
    if (!customChips[reward.id]) {
      const def = buildStandardChipDef(st, customChips, { provisioned });
      if (def) {
        customChips[reward.id] = def;
      }
    }
  }
  return customChips;
}
