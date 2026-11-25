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
  // ============================================================================
  // CHAPTER 3 — THE LAND OF MEMORY (RAM, 8-Bit Data Path & ARK-8 Computer)
  // ============================================================================
  stage_27: {
    busMode: true,
    nodes: [
      { id: 'm01', type: 'MUX_4BIT', x: 220, y: 110 },
      { id: 'm23', type: 'MUX_4BIT', x: 220, y: 260 },
      { id: 'mout', type: 'MUX_4BIT', x: 430, y: 185 },
    ],
    wires: [
      [inp(0), np('m01', 0)], [inp(1), np('m01', 1)], [inp(4), np('m01', 2)],
      [inp(2), np('m23', 0)], [inp(3), np('m23', 1)], [inp(4), np('m23', 2)],
      [np('m01', 0), np('mout', 0)], [np('m23', 0), np('mout', 1)], [inp(5), np('mout', 2)],
      [np('mout', 0), out(0)],
    ],
  },
  stage_28: {
    busMode: true,
    nodes: [
      { id: 'dec', type: 'DEC_2TO4', x: 170, y: 140 },
      { id: 'we0', type: 'AND', x: 280, y: 60 },
      { id: 'we1', type: 'AND', x: 280, y: 140 },
      { id: 'we2', type: 'AND', x: 280, y: 220 },
      { id: 'we3', type: 'AND', x: 280, y: 300 },
      { id: 'r0', type: 'REG_4BIT', x: 400, y: 50 },
      { id: 'r1', type: 'REG_4BIT', x: 400, y: 140 },
      { id: 'r2', type: 'REG_4BIT', x: 400, y: 230 },
      { id: 'r3', type: 'REG_4BIT', x: 400, y: 320 },
      { id: 'mux', type: 'MUX4_4B', x: 560, y: 160 },
    ],
    wires: [
      [inp(0), np('dec', 0)], [inp(1), np('dec', 1)],
      [np('dec', 0), np('we0', 0)], [inp(3), np('we0', 1)],
      [np('dec', 1), np('we1', 0)], [inp(3), np('we1', 1)],
      [np('dec', 2), np('we2', 0)], [inp(3), np('we2', 1)],
      [np('dec', 3), np('we3', 0)], [inp(3), np('we3', 1)],
      [inp(2), np('r0', 0)], [np('we0', 0), np('r0', 1)], [inp(4), np('r0', 2)],
      [inp(2), np('r1', 0)], [np('we1', 0), np('r1', 1)], [inp(4), np('r1', 2)],
      [inp(2), np('r2', 0)], [np('we2', 0), np('r2', 1)], [inp(4), np('r2', 2)],
      [inp(2), np('r3', 0)], [np('we3', 0), np('r3', 1)], [inp(4), np('r3', 2)],
      [np('r0', 0), np('mux', 0)], [np('r1', 0), np('mux', 1)],
      [np('r2', 0), np('mux', 2)], [np('r3', 0), np('mux', 3)],
      [inp(0), np('mux', 4)], [inp(1), np('mux', 5)],
      [np('mux', 0), out(0)],
    ],
  },
  stage_29: {
    busMode: true,
    nodes: [
      { id: 'sa', type: 'SPLIT8', x: 180, y: 110 },
      { id: 'sb', type: 'SPLIT8', x: 180, y: 240 },
      { id: 'alo', type: 'ADD_4BIT', x: 340, y: 100 },
      { id: 'ahi', type: 'ADD_4BIT', x: 340, y: 240 },
      { id: 'js', type: 'JOIN8', x: 520, y: 170 },
    ],
    wires: [
      [inp(0), np('sa', 0)], [inp(1), np('sb', 0)],
      [np('sa', 0), np('alo', 0)], [np('sb', 0), np('alo', 1)], [inp(2), np('alo', 2)],
      [np('sa', 1), np('ahi', 0)], [np('sb', 1), np('ahi', 1)], [np('alo', 1), np('ahi', 2)],
      [np('alo', 0), np('js', 0)], [np('ahi', 0), np('js', 1)],
      [np('js', 0), out(0)], [np('ahi', 1), out(1)],
    ],
  },
  stage_30: {
    busMode: true,
    nodes: [
      { id: 'sd', type: 'SPLIT8', x: 170, y: 110 },
      { id: 'z0', type: 'CONST_0', x: 170, y: 230 },
      { id: 'orL', type: 'OR', x: 270, y: 310 },
      { id: 'mlo', type: 'MUX_4BIT', x: 310, y: 80 },
      { id: 'mhi', type: 'MUX_4BIT', x: 310, y: 200 },
      { id: 'rlo', type: 'REG_4BIT', x: 450, y: 80 },
      { id: 'rhi', type: 'REG_4BIT', x: 450, y: 200 },
      { id: 'jq', type: 'JOIN8', x: 580, y: 140 },
    ],
    wires: [
      [inp(0), np('sd', 0)],
      [inp(1), np('orL', 0)], [inp(2), np('orL', 1)],
      [np('sd', 0), np('mlo', 0)], [np('z0', 0), np('mlo', 1)], [inp(2), np('mlo', 2)],
      [np('sd', 1), np('mhi', 0)], [np('z0', 0), np('mhi', 1)], [inp(2), np('mhi', 2)],
      [np('mlo', 0), np('rlo', 0)], [np('orL', 0), np('rlo', 1)], [inp(3), np('rlo', 2)],
      [np('mhi', 0), np('rhi', 0)], [np('orL', 0), np('rhi', 1)], [inp(3), np('rhi', 2)],
      [np('rlo', 0), np('jq', 0)], [np('rhi', 0), np('jq', 1)],
      [np('jq', 0), out(0)],
    ],
  },
  stage_31: {
    busMode: true,
    nodes: [
      { id: 'sp', type: 'SPLIT4', x: 180, y: 150 },
      { id: 'x0', type: 'XOR', x: 330, y: 60 },
      { id: 'x1', type: 'XOR', x: 330, y: 130 },
      { id: 'x2', type: 'XOR', x: 330, y: 200 },
      { id: 'x3', type: 'XOR', x: 330, y: 270 },
      { id: 'jn', type: 'JOIN4', x: 490, y: 150 },
    ],
    wires: [
      [inp(0), np('sp', 0)],
      [np('sp', 0), np('x0', 0)], [inp(1), np('x0', 1)], [np('x0', 0), np('jn', 0)],
      [np('sp', 1), np('x1', 0)], [inp(1), np('x1', 1)], [np('x1', 0), np('jn', 1)],
      [np('sp', 2), np('x2', 0)], [inp(1), np('x2', 1)], [np('x2', 0), np('jn', 2)],
      [np('sp', 3), np('x3', 0)], [inp(1), np('x3', 1)], [np('x3', 0), np('jn', 3)],
      [np('jn', 0), out(0)],
    ],
  },
  stage_32: {
    busMode: true,
    nodes: [
      { id: 'sb', type: 'SPLIT8', x: 160, y: 170 },
      { id: 'xlo', type: 'XOR_4B', x: 260, y: 110 },
      { id: 'xhi', type: 'XOR_4B', x: 260, y: 230 },
      { id: 'jb', type: 'JOIN8', x: 360, y: 170 },
      { id: 'add', type: 'ADD_8B', x: 450, y: 130 },
      { id: 'sy', type: 'SPLIT8', x: 540, y: 230 },
      { id: 'zlo', type: 'ZERO_4BIT', x: 420, y: 310 },
      { id: 'zhi', type: 'ZERO_4BIT', x: 420, y: 380 },
      { id: 'zand', type: 'AND', x: 550, y: 340 },
      { id: 'sh', type: 'SPLIT4', x: 550, y: 420 },
    ],
    wires: [
      [inp(1), np('sb', 0)],
      [np('sb', 0), np('xlo', 0)], [inp(2), np('xlo', 1)],
      [np('sb', 1), np('xhi', 0)], [inp(2), np('xhi', 1)],
      [np('xlo', 0), np('jb', 0)], [np('xhi', 0), np('jb', 1)],
      [inp(0), np('add', 0)], [np('jb', 0), np('add', 1)], [inp(2), np('add', 2)],
      [np('add', 0), out(0)], [np('add', 1), out(2)],
      [np('add', 0), np('sy', 0)],
      [np('sy', 0), np('zlo', 0)], [np('sy', 1), np('zhi', 0)],
      [np('zlo', 0), np('zand', 0)], [np('zhi', 0), np('zand', 1)], [np('zand', 0), out(1)],
      [np('sy', 1), np('sh', 0)], [np('sh', 3), out(3)],
    ],
  },
  stage_33: {
    busMode: true,
    nodes: [
      { id: 's0', type: 'SPLIT8', x: 180, y: 60 },
      { id: 's1', type: 'SPLIT8', x: 180, y: 140 },
      { id: 's2', type: 'SPLIT8', x: 180, y: 220 },
      { id: 's3', type: 'SPLIT8', x: 180, y: 300 },
      { id: 'mlo', type: 'MUX4_4B', x: 360, y: 110 },
      { id: 'mhi', type: 'MUX4_4B', x: 360, y: 260 },
      { id: 'jy', type: 'JOIN8', x: 540, y: 185 },
    ],
    wires: [
      [inp(0), np('s0', 0)], [inp(1), np('s1', 0)], [inp(2), np('s2', 0)], [inp(3), np('s3', 0)],
      [np('s0', 0), np('mlo', 0)], [np('s1', 0), np('mlo', 1)], [np('s2', 0), np('mlo', 2)], [np('s3', 0), np('mlo', 3)],
      [inp(4), np('mlo', 4)], [inp(5), np('mlo', 5)],
      [np('s0', 1), np('mhi', 0)], [np('s1', 1), np('mhi', 1)], [np('s2', 1), np('mhi', 2)], [np('s3', 1), np('mhi', 3)],
      [inp(4), np('mhi', 4)], [inp(5), np('mhi', 5)],
      [np('mlo', 0), np('jy', 0)], [np('mhi', 0), np('jy', 1)],
      [np('jy', 0), out(0)],
    ],
  },
  stage_34: {
    busMode: true,
    nodes: [
      { id: 'dec', type: 'DEC_2TO4', x: 160, y: 150 },
      { id: 'we0', type: 'AND', x: 260, y: 60 },
      { id: 'we1', type: 'AND', x: 260, y: 140 },
      { id: 'we2', type: 'AND', x: 260, y: 220 },
      { id: 'we3', type: 'AND', x: 260, y: 300 },
      { id: 'r0', type: 'REG_8B', x: 370, y: 50 },
      { id: 'r1', type: 'REG_8B', x: 370, y: 140 },
      { id: 'r2', type: 'REG_8B', x: 370, y: 230 },
      { id: 'r3', type: 'REG_8B', x: 370, y: 320 },
      { id: 'ma', type: 'MUX4_8B', x: 540, y: 100 },
      { id: 'mb', type: 'MUX4_8B', x: 540, y: 270 },
    ],
    wires: [
      [inp(0), np('dec', 0)], [inp(1), np('dec', 1)],
      [np('dec', 0), np('we0', 0)], [inp(3), np('we0', 1)],
      [np('dec', 1), np('we1', 0)], [inp(3), np('we1', 1)],
      [np('dec', 2), np('we2', 0)], [inp(3), np('we2', 1)],
      [np('dec', 3), np('we3', 0)], [inp(3), np('we3', 1)],
      [inp(2), np('r0', 0)], [np('we0', 0), np('r0', 1)], [inp(8), np('r0', 2)], [inp(9), np('r0', 3)],
      [inp(2), np('r1', 0)], [np('we1', 0), np('r1', 1)], [inp(8), np('r1', 2)], [inp(9), np('r1', 3)],
      [inp(2), np('r2', 0)], [np('we2', 0), np('r2', 1)], [inp(8), np('r2', 2)], [inp(9), np('r2', 3)],
      [inp(2), np('r3', 0)], [np('we3', 0), np('r3', 1)], [inp(8), np('r3', 2)], [inp(9), np('r3', 3)],
      [np('r0', 0), np('ma', 0)], [np('r1', 0), np('ma', 1)], [np('r2', 0), np('ma', 2)], [np('r3', 0), np('ma', 3)],
      [inp(4), np('ma', 4)], [inp(5), np('ma', 5)], [np('ma', 0), out(0)],
      [np('r0', 0), np('mb', 0)], [np('r1', 0), np('mb', 1)], [np('r2', 0), np('mb', 2)], [np('r3', 0), np('mb', 3)],
      [inp(6), np('mb', 4)], [inp(7), np('mb', 5)], [np('mb', 0), out(1)],
    ],
  },
  stage_35: {
    busMode: true,
    nodes: [
      { id: 'sd', type: 'SPLIT8', x: 180, y: 170 },
      { id: 'rlo', type: 'RAM_4W', x: 340, y: 100 },
      { id: 'rhi', type: 'RAM_4W', x: 340, y: 240 },
      { id: 'jq', type: 'JOIN8', x: 520, y: 170 },
    ],
    wires: [
      [inp(2), np('sd', 0)],
      [inp(0), np('rlo', 0)], [inp(1), np('rlo', 1)], [np('sd', 0), np('rlo', 2)], [inp(3), np('rlo', 3)], [inp(4), np('rlo', 4)],
      [inp(0), np('rhi', 0)], [inp(1), np('rhi', 1)], [np('sd', 1), np('rhi', 2)], [inp(3), np('rhi', 3)], [inp(4), np('rhi', 4)],
      [np('rlo', 0), np('jq', 0)], [np('rhi', 0), np('jq', 1)],
      [np('jq', 0), out(0)],
    ],
  },
  stage_36: {
    busMode: true,
    nodes: [
      { id: 'sa', type: 'SPLIT4', x: 150, y: 130 },
      { id: 'dec', type: 'DEC_2TO4', x: 240, y: 210 },
      { id: 'we0', type: 'AND', x: 330, y: 60 },
      { id: 'we1', type: 'AND', x: 330, y: 140 },
      { id: 'we2', type: 'AND', x: 330, y: 220 },
      { id: 'we3', type: 'AND', x: 330, y: 300 },
      { id: 'b0', type: 'RAM4_8B', x: 430, y: 50 },
      { id: 'b1', type: 'RAM4_8B', x: 430, y: 140 },
      { id: 'b2', type: 'RAM4_8B', x: 430, y: 230 },
      { id: 'b3', type: 'RAM4_8B', x: 430, y: 320 },
      { id: 'mq', type: 'MUX4_8B', x: 580, y: 170 },
    ],
    wires: [
      [inp(0), np('sa', 0)],
      [np('sa', 2), np('dec', 0)], [np('sa', 3), np('dec', 1)],
      [np('dec', 0), np('we0', 0)], [inp(2), np('we0', 1)],
      [np('dec', 1), np('we1', 0)], [inp(2), np('we1', 1)],
      [np('dec', 2), np('we2', 0)], [inp(2), np('we2', 1)],
      [np('dec', 3), np('we3', 0)], [inp(2), np('we3', 1)],
      [np('sa', 0), np('b0', 0)], [np('sa', 1), np('b0', 1)], [inp(1), np('b0', 2)], [np('we0', 0), np('b0', 3)], [inp(3), np('b0', 4)],
      [np('sa', 0), np('b1', 0)], [np('sa', 1), np('b1', 1)], [inp(1), np('b1', 2)], [np('we1', 0), np('b1', 3)], [inp(3), np('b1', 4)],
      [np('sa', 0), np('b2', 0)], [np('sa', 1), np('b2', 1)], [inp(1), np('b2', 2)], [np('we2', 0), np('b2', 3)], [inp(3), np('b2', 4)],
      [np('sa', 0), np('b3', 0)], [np('sa', 1), np('b3', 1)], [inp(1), np('b3', 2)], [np('we3', 0), np('b3', 3)], [inp(3), np('b3', 4)],
      [np('b0', 0), np('mq', 0)], [np('b1', 0), np('mq', 1)], [np('b2', 0), np('mq', 2)], [np('b3', 0), np('mq', 3)],
      [np('sa', 2), np('mq', 4)], [np('sa', 3), np('mq', 5)],
      [np('mq', 0), out(0)],
    ],
  },
  stage_37: {
    busMode: true,
    nodes: [
      { id: 'sv', type: 'SPLIT8', x: 160, y: 70 },
      { id: 'zlo', type: 'ZERO_4BIT', x: 250, y: 50 },
      { id: 'zhi', type: 'ZERO_4BIT', x: 250, y: 120 },
      { id: 'zand', type: 'AND', x: 350, y: 80 },
      { id: 'notZ', type: 'NOT', x: 430, y: 80 },
      { id: 'jmpA', type: 'AND', x: 510, y: 100 },
      { id: 'z0', type: 'CONST_0', x: 160, y: 240 },
      { id: 'c1', type: 'CONST_1', x: 160, y: 310 },
      { id: 'add', type: 'ADD_8B', x: 270, y: 240 },
      { id: 'mux', type: 'MUX4_8B', x: 410, y: 230 },
      { id: 'notH', type: 'NOT', x: 410, y: 370 },
      { id: 'reg', type: 'REG_8B', x: 550, y: 240 },
    ],
    wires: [
      [inp(0), np('sv', 0)],
      [np('sv', 0), np('zlo', 0)], [np('sv', 1), np('zhi', 0)],
      [np('zlo', 0), np('zand', 0)], [np('zhi', 0), np('zand', 1)],
      [np('zand', 0), np('notZ', 0)],
      [np('notZ', 0), np('jmpA', 0)], [inp(2), np('jmpA', 1)],
      [np('reg', 0), np('add', 0)], [np('z0', 0), np('add', 1)], [np('c1', 0), np('add', 2)],
      [np('add', 0), np('mux', 0)], [inp(1), np('mux', 1)], [np('z0', 0), np('mux', 2)], [np('z0', 0), np('mux', 3)],
      [np('jmpA', 0), np('mux', 4)], [np('z0', 0), np('mux', 5)],
      [inp(3), np('notH', 0)],
      [np('mux', 0), np('reg', 0)], [np('notH', 0), np('reg', 1)], [inp(4), np('reg', 2)], [inp(5), np('reg', 3)],
      [np('reg', 0), out(0)],
    ],
  },
  stage_38: {
    nodes: [
      { id: 'elo', type: 'ASM_ENC', x: 200, y: 110 },
      { id: 'ehi', type: 'ASM_ENC', x: 200, y: 260 },
      { id: 'o0', type: 'OR', x: 420, y: 90 },
      { id: 'o1', type: 'OR', x: 420, y: 185 },
      { id: 'ok', type: 'OR', x: 420, y: 285 },
    ],
    wires: [
      [inp(0), np('elo', 0)], [inp(1), np('elo', 1)], [inp(2), np('elo', 2)], [inp(3), np('elo', 3)],
      [inp(4), np('ehi', 0)], [inp(5), np('ehi', 1)], [inp(6), np('ehi', 2)], [inp(7), np('ehi', 3)],
      [np('elo', 0), np('o0', 0)], [np('ehi', 0), np('o0', 1)], [np('o0', 0), out(0)],
      [np('elo', 1), np('o1', 0)], [np('ehi', 1), np('o1', 1)], [np('o1', 0), out(1)],
      [np('ehi', 2), out(2)],
      [np('elo', 2), np('ok', 0)], [np('ehi', 2), np('ok', 1)], [np('ok', 0), out(3)],
    ],
  },
  stage_39: {
    nodes: [
      { id: 'dec', type: 'DEC_2TO4', x: 160, y: 130 },
      { id: 'n2', type: 'NOT', x: 160, y: 280 },
      { id: 'a_sub', type: 'AND', x: 310, y: 40 },
      { id: 'a_addi', type: 'AND', x: 310, y: 100 },
      { id: 'a_ldi', type: 'AND', x: 310, y: 160 },
      { id: 'a_ld', type: 'AND', x: 310, y: 220 },
      { id: 'a_st', type: 'AND', x: 310, y: 280 },
      { id: 'a_br', type: 'AND', x: 310, y: 340 },
      { id: 'a_hlt', type: 'AND', x: 310, y: 400 },
      { id: 'o_no1', type: 'OR', x: 440, y: 300 },
      { id: 'o_no2', type: 'OR', x: 520, y: 330 },
      { id: 'n_we', type: 'NOT', x: 590, y: 240 },
    ],
    wires: [
      [inp(0), np('dec', 0)], [inp(1), np('dec', 1)], [inp(2), np('n2', 0)],
      [np('dec', 2), np('a_sub', 0)], [np('n2', 0), np('a_sub', 1)], [np('a_sub', 0), out(0)],
      [np('dec', 2), np('a_addi', 0)], [inp(2), np('a_addi', 1)], [np('a_addi', 0), out(1)],
      [np('dec', 0), np('a_ldi', 0)], [np('n2', 0), np('a_ldi', 1)], [np('a_ldi', 0), out(2)],
      [np('dec', 0), np('a_ld', 0)], [inp(2), np('a_ld', 1)], [np('a_ld', 0), out(3)],
      [np('dec', 1), np('a_st', 0)], [inp(2), np('a_st', 1)], [np('a_st', 0), out(5)],
      [np('dec', 3), np('a_br', 0)], [np('n2', 0), np('a_br', 1)], [np('a_br', 0), out(6)],
      [np('dec', 3), np('a_hlt', 0)], [inp(2), np('a_hlt', 1)], [np('a_hlt', 0), out(7)],
      [np('a_br', 0), np('o_no1', 0)], [np('a_st', 0), np('o_no1', 1)],
      [np('o_no1', 0), np('o_no2', 0)], [np('a_hlt', 0), np('o_no2', 1)],
      [np('o_no2', 0), np('n_we', 0)], [np('n_we', 0), out(4)],
    ],
  },
  stage_40: {
    busMode: true,
    nodes: [
      { id: 'dec', type: 'INST_DEC8', x: 170, y: 60 },
      { id: 'rf', type: 'REGFILE_4', x: 330, y: 80 },
      { id: 'z0', type: 'CONST_0', x: 170, y: 260 },
      { id: 'simm', type: 'SPLIT8', x: 170, y: 340 },
      { id: 'mb', type: 'MUX4_8B', x: 470, y: 170 },
      { id: 'alu', type: 'ALU_8B', x: 590, y: 80 },
      { id: 'ram', type: 'SRAM_16B', x: 330, y: 320 },
      { id: 'mwb', type: 'MUX4_8B', x: 480, y: 330 },
      { id: 'pc', type: 'PC_8B', x: 590, y: 250 },
    ],
    wires: [
      [inp(0), np('dec', 0)], [inp(1), np('dec', 1)], [inp(2), np('dec', 2)],
      // REGFILE_4: WA0, WA1, WD, WE, RA0, RA1, RB0, RB1, RST, CLK
      [inp(3), np('rf', 0)], [inp(4), np('rf', 1)], [np('mwb', 0), np('rf', 2)], [np('dec', 4), np('rf', 3)],
      [inp(3), np('rf', 4)], [inp(4), np('rf', 5)], [inp(5), np('rf', 6)], [inp(6), np('rf', 7)],
      [inp(8), np('rf', 8)], [inp(9), np('rf', 9)],
      // ALU B-MUX: QB vs IMM
      [np('rf', 1), np('mb', 0)], [inp(7), np('mb', 1)], [np('z0', 0), np('mb', 2)], [np('z0', 0), np('mb', 3)],
      [np('dec', 1), np('mb', 4)], [np('z0', 0), np('mb', 5)],
      // ALU_8B: QA, B_in, SUB
      [np('rf', 0), np('alu', 0)], [np('mb', 0), np('alu', 1)], [np('dec', 0), np('alu', 2)],
      // SRAM_16B: IMM[3:0], QB, MEM_WE, CLK
      [inp(7), np('simm', 0)],
      [np('simm', 0), np('ram', 0)], [np('rf', 1), np('ram', 1)], [np('dec', 5), np('ram', 2)], [inp(9), np('ram', 3)],
      // Writeback MUX4_8B: 00=ALU, 01=IMM, 10=MEM, 11=0
      [np('alu', 0), np('mwb', 0)], [inp(7), np('mwb', 1)], [np('ram', 0), np('mwb', 2)], [np('z0', 0), np('mwb', 3)],
      [np('dec', 2), np('mwb', 4)], [np('dec', 3), np('mwb', 5)],
      // PC_8B: V=QA, J=IMM, BR, HALT, RST, CLK
      [np('rf', 0), np('pc', 0)], [inp(7), np('pc', 1)], [np('dec', 6), np('pc', 2)],
      [np('dec', 7), np('pc', 3)], [inp(8), np('pc', 4)], [inp(9), np('pc', 5)],
      // Outputs: QA[7:0], MEM[7:0], PC[7:0], Z, HALT
      [np('rf', 0), out(0)], [np('ram', 0), out(1)], [np('pc', 0), out(2)],
      [np('alu', 1), out(3)], [np('dec', 7), out(4)],
    ],
  },
};

export function buildBlueprintCircuit(stageIdOrStage) {
  const stage = typeof stageIdOrStage === 'string' ? getStageById(stageIdOrStage) : stageIdOrStage;
  const bp = STANDARD_BLUEPRINTS[stage?.id];
  if (!stage || !bp) return null;

  const inputs = bp.inputs ? [...bp.inputs] : [...stage.inputs];
  const outputs = bp.outputs ? [...bp.outputs] : [...stage.outputs];
  let c = createEmptyCircuit(inputs, outputs, { busMode: Boolean(bp.busMode || stage.busMode) });
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
  { includeChapter2Hardware = false, includeChapter3Hardware = false, provisioned = true } = {}
) {
  if (!customChips.NAND) {
    const st0 = getStageById('stage_00');
    if (st0) {
      const def = buildStandardChipDef(st0, customChips, { provisioned });
      if (def) customChips.NAND = def;
    }
  }

  const maxChapter = includeChapter3Hardware ? 3 : includeChapter2Hardware ? 2 : 1;
  const targetStages = STAGES.filter(
    (s) => (s.chapter || 1) <= maxChapter && s.mode !== 'physics'
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
