/**
 * SILICON GENESIS — Recursive-Flattening NAND Netlist Compiler & Simulator
 *
 * Compiles any user circuit (referencing NAND, CONST_0, CONST_1, and nested
 * player-created custom chips to arbitrary depth) into a flat array of primitive
 * NAND gates with persistent state, supporting:
 *   - Pure combinational logic (NOT, AND, OR, XOR, Adders, MUX, Decoders, ALU)
 *   - Feedback & bistable memory (SR_LATCH, D_LATCH)
 *   - Synchronous edge-triggered Master-Slave flip-flops (D_FF, REG_4BIT, PC_4BIT, ARK4_CORE)
 *   - Real-time pin & wire signal extraction for live visualization
 *   - Accurate odd-inverter oscillation detection
 */

import { getChipDef } from './circuit.js';

const MAX_NESTING_DEPTH = 20;
const SLOT_CONST_0 = 0;
const SLOT_CONST_1 = 1;
const GATE_NAND = 0;
const GATE_SW = 1;
const GATE_PULL = 2;

/**
 * Compiles a top-level circuit + customChips library into a flat NetlistSimulator.
 */
export function compileCircuit(circuit, customChips = {}) {
  const numExtIn = circuit.inputs.length;
  const numExtOut = circuit.outputs.length;

  // Handle graph for wire resolution before flattening to slots:
  // Each handle either has a `driverSlot` (if it's a real signal source: CONST, EXT_IN, or NAND out)
  // OR a `parentHandle` (if driven by a wire from another handle).
  const handleDriverSlot = []; // -1 if not a direct driver
  const handleParent = [];     // -1 if unwired

  function allocHandle(driverSlot = -1) {
    const id = handleDriverSlot.length;
    handleDriverSlot.push(driverSlot);
    handleParent.push(-1);
    return id;
  }

  function linkHandle(dstHandle, srcHandle) {
    if (dstHandle >= 0 && srcHandle >= 0) {
      handleParent[dstHandle] = srcHandle;
    }
  }

  // Slot layout:
  //   0               -> CONST_0
  //   1               -> CONST_1
  //   2 .. 2+numIn-1  -> top-level external inputs
  //   2+numIn .. end  -> primitive NAND gate outputs
  const gateSlotBase = 2 + numExtIn;
  const gates = []; // { inAHandle, inBHandle, outSlot }

  const topInputHandles = [];
  for (let i = 0; i < numExtIn; i++) {
    topInputHandles.push(allocHandle(2 + i));
  }
  const topOutputHandles = [];
  for (let i = 0; i < numExtOut; i++) {
    topOutputHandles.push(allocHandle(-1));
  }

  // Maps for live UI inspection on the top-level canvas
  const topNodePinHandles = new Map(); // nodeId -> { inHandles: number[], outHandles: number[] }
  const topWireSourceHandles = new Map(); // wireId -> handleId

  function instantiateCircuit(subCircuit, extInHandles, extOutHandles, depth, isTopLevel) {
    if (depth > MAX_NESTING_DEPTH) {
      throw new Error('Chip nesting depth exceeded maximum limit.');
    }

    const nodePinMap = new Map(); // nodeId -> { inHandles, outHandles }

    // 1. Instantiate all nodes first (so feedback wires between any two nodes work!)
    for (const node of subCircuit.nodes) {
      const def = getChipDef(node.type, customChips);
      if (!def) {
        // Missing chip definition: create disconnected dummy handles
        const entry = { inHandles: [], outHandles: [] };
        nodePinMap.set(node.id, entry);
        if (isTopLevel) topNodePinHandles.set(node.id, entry);
        continue;
      }

      if (node.type === 'NAND') {
        const inA = allocHandle(-1);
        const inB = allocHandle(-1);
        const outSlot = gateSlotBase + gates.length;
        const outH = allocHandle(outSlot);
        gates.push({ type: GATE_NAND, inAHandle: inA, inBHandle: inB, outSlot });
        const entry = { inHandles: [inA, inB], outHandles: [outH] };
        nodePinMap.set(node.id, entry);
        if (isTopLevel) topNodePinHandles.set(node.id, entry);
      } else if (node.type === 'SW') {
        const inFlow = allocHandle(-1);
        const inGate = allocHandle(-1);
        const outSlot = gateSlotBase + gates.length;
        const outH = allocHandle(outSlot);
        gates.push({ type: GATE_SW, inAHandle: inFlow, inBHandle: inGate, outSlot });
        const entry = { inHandles: [inFlow, inGate], outHandles: [outH] };
        nodePinMap.set(node.id, entry);
        if (isTopLevel) topNodePinHandles.set(node.id, entry);
      } else if (node.type === 'PULL') {
        const inDrain = allocHandle(-1);
        const outSlot = gateSlotBase + gates.length;
        const outH = allocHandle(outSlot);
        gates.push({ type: GATE_PULL, inAHandle: inDrain, inBHandle: -1, outSlot });
        const entry = { inHandles: [inDrain], outHandles: [outH] };
        nodePinMap.set(node.id, entry);
        if (isTopLevel) topNodePinHandles.set(node.id, entry);
      } else if (node.type === 'CONST_0') {
        const outH = allocHandle(SLOT_CONST_0);
        const entry = { inHandles: [], outHandles: [outH] };
        nodePinMap.set(node.id, entry);
        if (isTopLevel) topNodePinHandles.set(node.id, entry);
      } else if (node.type === 'CONST_1') {
        const outH = allocHandle(SLOT_CONST_1);
        const entry = { inHandles: [], outHandles: [outH] };
        nodePinMap.set(node.id, entry);
        if (isTopLevel) topNodePinHandles.set(node.id, entry);
      } else if (def.circuit) {
        const inHandles = def.inputs.map(() => allocHandle(-1));
        const outHandles = def.outputs.map(() => allocHandle(-1));
        const entry = { inHandles, outHandles };
        nodePinMap.set(node.id, entry);
        if (isTopLevel) topNodePinHandles.set(node.id, entry);

        // Recursively expand the player's actual custom chip circuit!
        instantiateCircuit(def.circuit, inHandles, outHandles, depth + 1, false);
      }
    }

    // 2. Wire endpoints together
    for (const wire of subCircuit.wires) {
      let srcH = -1;
      if (wire.from.kind === 'input') {
        srcH = extInHandles[wire.from.pin] ?? -1;
      } else if (wire.from.kind === 'node') {
        const entry = nodePinMap.get(wire.from.nodeId);
        srcH = entry ? (entry.outHandles[wire.from.pin] ?? -1) : -1;
      }

      let dstH = -1;
      if (wire.to.kind === 'output') {
        dstH = extOutHandles[wire.to.pin] ?? -1;
      } else if (wire.to.kind === 'node') {
        const entry = nodePinMap.get(wire.to.nodeId);
        dstH = entry ? (entry.inHandles[wire.to.pin] ?? -1) : -1;
      }

      if (srcH >= 0 && dstH >= 0) {
        linkHandle(dstH, srcH);
      }
      if (isTopLevel && srcH >= 0) {
        topWireSourceHandles.set(wire.id, srcH);
      }
    }
  }

  instantiateCircuit(circuit, topInputHandles, topOutputHandles, 0, true);

  // 3. Resolve every handle to its ultimate driving signal slot (memoized, cycle-safe)
  const resolvedCache = new Int32Array(handleDriverSlot.length);
  resolvedCache.fill(-2); // -2 = unvisited, -3 = visiting

  function resolveSlot(handleId) {
    if (handleId < 0) return SLOT_CONST_0;
    const cached = resolvedCache[handleId];
    if (cached >= 0) return cached;
    if (cached === -3) {
      // Pure wire-only loop with no gate in between -> break safely to 0
      return SLOT_CONST_0;
    }
    if (handleDriverSlot[handleId] >= 0) {
      resolvedCache[handleId] = handleDriverSlot[handleId];
      return handleDriverSlot[handleId];
    }
    const parent = handleParent[handleId];
    if (parent < 0) {
      resolvedCache[handleId] = SLOT_CONST_0;
      return SLOT_CONST_0;
    }
    resolvedCache[handleId] = -3;
    const slot = resolveSlot(parent);
    resolvedCache[handleId] = slot;
    return slot;
  }

  const numGates = gates.length;
  const totalSlots = gateSlotBase + numGates;
  const gateTypes = new Uint8Array(numGates);
  const inA = new Int32Array(numGates);
  const inB = new Int32Array(numGates);
  for (let g = 0; g < numGates; g++) {
    gateTypes[g] = gates[g].type;
    inA[g] = resolveSlot(gates[g].inAHandle);
    inB[g] = resolveSlot(gates[g].inBHandle);
  }

  const extOutSlots = new Int32Array(numExtOut);
  for (let i = 0; i < numExtOut; i++) {
    extOutSlots[i] = resolveSlot(topOutputHandles[i]);
  }

  // Resolve top-level UI pin & wire slots
  const topNodeSlots = new Map();
  for (const [nodeId, entry] of topNodePinHandles.entries()) {
    topNodeSlots.set(nodeId, {
      inputs: entry.inHandles.map((h) => resolveSlot(h)),
      outputs: entry.outHandles.map((h) => resolveSlot(h)),
    });
  }
  const topWireSlots = new Map();
  for (const [wireId, srcH] of topWireSourceHandles.entries()) {
    topWireSlots.set(wireId, resolveSlot(srcH));
  }

  return new NetlistSimulator({
    numExtIn,
    numExtOut,
    numGates,
    gateSlotBase,
    totalSlots,
    gateTypes,
    inA,
    inB,
    extOutSlots,
    topNodeSlots,
    topWireSlots,
  });
}

export class NetlistSimulator {
  constructor(compiled) {
    this.numExtIn = compiled.numExtIn;
    this.numExtOut = compiled.numExtOut;
    this.numGates = compiled.numGates;
    this.gateSlotBase = compiled.gateSlotBase;
    this.totalSlots = compiled.totalSlots;
    this.gateTypes = compiled.gateTypes;
    this.inA = compiled.inA;
    this.inB = compiled.inB;
    this.extOutSlots = compiled.extOutSlots;
    this.topNodeSlots = compiled.topNodeSlots;
    this.topWireSlots = compiled.topWireSlots;

    this.slots = new Uint8Array(this.totalSlots);
    this.nextVals = new Uint8Array(this.numGates);
    this.lastTicks = 0;
    this.unstable = false;
    this.reset();
  }

  reset() {
    this.slots.fill(0);
    this.slots[SLOT_CONST_0] = 0;
    this.slots[SLOT_CONST_1] = 1;
    this.unstable = false;
    this.lastTicks = 0;
  }

  /**
   * Apply external input bits (array of 0/1) and propagate until settled.
   * Preserves internal gate state across calls (essential for latches/flip-flops!).
   */
  evaluate(inputBits, maxJacobiTicks = 180) {
    const { slots, nextVals, gateTypes, inA, inB, numGates, gateSlotBase, numExtIn } = this;
    slots[SLOT_CONST_0] = 0;
    slots[SLOT_CONST_1] = 1;

    for (let i = 0; i < numExtIn; i++) {
      slots[2 + i] = inputBits[i] ? 1 : 0;
    }

    let settled = false;
    let ticks = 0;

    if (numGates === 0) {
      settled = true;
    } else {
      // Phase 1: Synchronous Jacobi propagation (exact unit-delay per gate)
      for (let t = 0; t < maxJacobiTicks; t++) {
        ticks = t + 1;
        let changed = false;
        for (let g = 0; g < numGates; g++) {
          const gt = gateTypes[g];
          const a = slots[inA[g]];
          const b = slots[inB[g]];
          const out = gt === GATE_NAND ? ((a & b) ? 0 : 1) : gt === GATE_SW ? ((a & b) ? 1 : 0) : (a ? 0 : 1);
          nextVals[g] = out;
          if (out !== slots[gateSlotBase + g]) {
            changed = true;
          }
        }
        for (let g = 0; g < numGates; g++) {
          slots[gateSlotBase + g] = nextVals[g];
        }
        if (!changed) {
          settled = true;
          break;
        }
      }

      // Phase 2: Deterministic symmetry breaker (Gauss-Seidel pass)
      if (!settled) {
        for (let t = 0; t < 40; t++) {
          ticks++;
          let changed = false;
          for (let g = 0; g < numGates; g++) {
            const gt = gateTypes[g];
            const a = slots[inA[g]];
            const b = slots[inB[g]];
            const out = gt === GATE_NAND ? ((a & b) ? 0 : 1) : gt === GATE_SW ? ((a & b) ? 1 : 0) : (a ? 0 : 1);
            const slotIdx = gateSlotBase + g;
            if (out !== slots[slotIdx]) {
              slots[slotIdx] = out;
              changed = true;
            }
          }
          if (!changed) {
            settled = true;
            break;
          }
        }
      }
    }

    this.lastTicks = ticks;
    this.unstable = !settled;

    return {
      outputs: this.getOutputs(),
      unstable: this.unstable,
      ticks: this.lastTicks,
    };
  }

  getOutputs() {
    const out = new Array(this.numExtOut);
    for (let i = 0; i < this.numExtOut; i++) {
      out[i] = this.slots[this.extOutSlots[i]] ? 1 : 0;
    }
    return out;
  }

  getInputs() {
    const inp = new Array(this.numExtIn);
    for (let i = 0; i < this.numExtIn; i++) {
      inp[i] = this.slots[2 + i] ? 1 : 0;
    }
    return inp;
  }

  getWireValue(wireId) {
    const slot = this.topWireSlots.get(wireId);
    return slot === undefined ? 0 : (this.slots[slot] ? 1 : 0);
  }

  getNodePinValues(nodeId) {
    const entry = this.topNodeSlots.get(nodeId);
    if (!entry) return { inputs: [], outputs: [] };
    return {
      inputs: entry.inputs.map((s) => (this.slots[s] ? 1 : 0)),
      outputs: entry.outputs.map((s) => (this.slots[s] ? 1 : 0)),
    };
  }
}
