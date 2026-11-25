/**
 * SILICON GENESIS — Core Circuit Data Model & Built-in Primitives
 */

export const PRIMITIVE_CHIPS = {
  NAND: {
    id: 'NAND',
    name: 'NAND',
    shortName: 'NAND',
    titleJa: 'NAND（あまのじゃく素子）',
    shortRuleJa: 'AとBが両方1のときだけ0、それ以外は1',
    descJa: 'AとBの両方が1のときだけ0。それ以外はぜんぶ1を返す、すべての計算機の原点。',
    inputs: ['A', 'B'],
    outputs: ['OUT'],
    color: '#c97828',
    accent: '#ffb347',
    isPrimitive: true,
    nandCount: 1,
    swCount: 2,
    pullCount: 1,
    depth: 0,
  },
  CONST_0: {
    id: 'CONST_0',
    name: 'アース0',
    shortName: '0',
    titleJa: '定数 0（アース）',
    shortRuleJa: 'つねに 0（OFF）を出しつづける',
    descJa: 'つねに 0（OFF）を出しつづける基準端子。',
    inputs: [],
    outputs: ['0'],
    color: '#3f4f5f',
    accent: '#88a0b8',
    isPrimitive: true,
    nandCount: 0,
    swCount: 0,
    pullCount: 0,
    depth: 0,
  },
  CONST_1: {
    id: 'CONST_1',
    name: 'でんち',
    shortName: '1',
    titleJa: 'でんち（電源・つねに 1）',
    shortRuleJa: 'いつも「1（電気ON）」を流しつづける',
    descJa: 'つねに 1（電気ON）を流しつづけるスタート地点の電源（専門用語で VCC）。',
    inputs: [],
    outputs: ['1'],
    color: '#8c6620',
    accent: '#ffd166',
    isPrimitive: true,
    nandCount: 0,
    swCount: 0,
    pullCount: 0,
    depth: 0,
  },
  SW: {
    id: 'SW',
    name: 'じゃぐち',
    shortName: 'SW',
    titleJa: 'じゃぐち（電気スイッチ／トランジスタ）',
    shortRuleJa: '「ひねり=1」のときだけ「いり」を「でぐち」へ通す',
    descJa: '「ひねり」に 1 が来るとスイッチが閉じて、「いり」の電気を「でぐち」へ通す部品。専門用語では「トランジスタ（SW）」と呼びます。',
    inputs: ['いり', 'ひねり'],
    outputs: ['でぐち'],
    color: '#a85f24',
    accent: '#ffbe6b',
    isPrimitive: true,
    isPhysical: true,
    nandCount: 0,
    swCount: 1,
    pullCount: 0,
    depth: 0,
  },
  PULL: {
    id: 'PULL',
    name: 'はいすい',
    shortName: 'PULL',
    titleJa: 'はいすい（プルアップ抵抗＋排水TR回路）',
    shortRuleJa: '内蔵+5V電源から抵抗越しに普段は1、「ぬけ=1」で内蔵TRが開き地面へ落ちて0',
    descJa: 'Stage 00-B で組んだ「内蔵+5V電源 ➔ プルアップ抵抗 ➔ 地面(0V)へ抜くじゃぐち(トランジスタ)」を丸ごと収めた部品。普段は内蔵電源から抵抗越しに 1 を出しつづけ、「ぬけ」に合図(1)が届いた瞬間だけ中の排水用トランジスタが開いて地面へ落ち、出力が 0 になります。',
    inputs: ['ぬけ'],
    outputs: ['でぐち'],
    color: '#2e6a82',
    accent: '#7cd4f5',
    isPrimitive: true,
    isPhysical: true,
    nandCount: 0,
    swCount: 0,
    pullCount: 1,
    depth: 0,
  },
  SPLIT4: {
    id: 'SPLIT4',
    name: '4→1分岐',
    shortName: 'SPL4',
    titleJa: '4ビット分岐コネクタ（4→1×4）',
    shortRuleJa: '4本のリボン束線 D[3:0] を 1本ずつ（0〜3）へほどく物理コネクタ（0 NAND）',
    descJa: '4本の平行銅線（リボンケーブル）を1本ずつの電線（bit0〜bit3）へ分ける受動コネクタ。論理ゲートもトランジスタも一切含みません。',
    inputs: ['D[3:0]'],
    outputs: ['0', '1', '2', '3'],
    color: '#2e586e',
    accent: '#7cd4f5',
    isPrimitive: true,
    isBusAdapter: true,
    nandCount: 0,
    swCount: 0,
    pullCount: 0,
    depth: 0,
  },
  JOIN4: {
    id: 'JOIN4',
    name: '1→4結束',
    shortName: 'JON4',
    titleJa: '4ビット結束コネクタ（1×4→4）',
    shortRuleJa: '1本ずつの電線（0〜3）を 4本束線 D[3:0] へ束ねる物理コネクタ（0 NAND）',
    descJa: '4本の独立した電線（bit0〜bit3）を1本のリボンケーブルへ圧着する受動コネクタ。論理ゲートは0個です。',
    inputs: ['0', '1', '2', '3'],
    outputs: ['D[3:0]'],
    color: '#2e586e',
    accent: '#7cd4f5',
    isPrimitive: true,
    isBusAdapter: true,
    nandCount: 0,
    swCount: 0,
    pullCount: 0,
    depth: 0,
  },
  SPLIT8: {
    id: 'SPLIT8',
    name: '8→4+4分岐',
    shortName: 'SPL8',
    titleJa: '8ビット分岐コネクタ（8→下位4＋上位4）',
    shortRuleJa: '8本束線 D[7:0] を下位4bit L[3:0] と上位4bit H[3:0] へ分ける物理コネクタ（0 NAND）',
    descJa: '8ビット（1バイト）のリボンケーブルを、下位4ビット（0〜3）と上位4ビット（4〜7）の2本へ分ける受動コネクタ。ゲート数ゼロの純配線部品です。',
    inputs: ['D[7:0]'],
    outputs: ['L[3:0]', 'H[3:0]'],
    color: '#2d635d',
    accent: '#5ce0a8',
    isPrimitive: true,
    isBusAdapter: true,
    nandCount: 0,
    swCount: 0,
    pullCount: 0,
    depth: 0,
  },
  JOIN8: {
    id: 'JOIN8',
    name: '4+4→8結束',
    shortName: 'JON8',
    titleJa: '8ビット結束コネクタ（下位4＋上位4→8）',
    shortRuleJa: '下位4bit L[3:0] と上位4bit H[3:0] を8本束線 D[7:0] へ束ねる物理コネクタ（0 NAND）',
    descJa: '下位4ビットと上位4ビットのリボンケーブルを1本の8ビット（1バイト）バスへ圧着する受動コネクタ。ゲート数ゼロの純配線部品です。',
    inputs: ['L[3:0]', 'H[3:0]'],
    outputs: ['D[7:0]'],
    color: '#2d635d',
    accent: '#5ce0a8',
    isPrimitive: true,
    isBusAdapter: true,
    nandCount: 0,
    swCount: 0,
    pullCount: 0,
    depth: 0,
  },
};

/**
 * Physical 4-bit ribbon-connector port view for Chapter 1–2 4-bit chips when
 * placed inside a Chapter 3+ `busMode` circuit (exact 1:1 bit order match!).
 */
export const CHIP_BUS_PORTS = {
  ADD_4BIT: { inputs: ['A[3:0]', 'B[3:0]', 'CIN'], outputs: ['S[3:0]', 'COUT'] },
  MUX_4BIT: { inputs: ['A[3:0]', 'B[3:0]', 'SEL'], outputs: ['Y[3:0]'] },
  REG_4BIT: { inputs: ['D[3:0]', 'LOAD', 'CLK'], outputs: ['Q[3:0]'] },
  ZERO_4BIT: { inputs: ['A[3:0]'], outputs: ['Z'] },
  ALU_4BIT: { inputs: ['A[3:0]', 'B[3:0]', 'SUB'], outputs: ['Y[3:0]', 'COUT'] },
  PC_4BIT: { inputs: ['J[3:0]', 'JMP', 'CLK'], outputs: ['Q[3:0]'] },
};

/**
 * Parses physical bus width from a pin label:
 *   "A[3:0]" -> { label: "A[3:0]", base: "A", hi: 3, lo: 0, width: 4 }
 *   "D[7:0]" -> { label: "D[7:0]", base: "D", hi: 7, lo: 0, width: 8 }
 *   "CLK"    -> { label: "CLK",    base: "CLK", hi: 0, lo: 0, width: 1 }
 */
export function parsePinSpec(label) {
  const s = String(label ?? '');
  const m = s.match(/^(.+?)\[(\d+):(\d+)\]$/);
  if (m) {
    const hi = Number(m[2]);
    const lo = Number(m[3]);
    const width = Math.abs(hi - lo) + 1;
    return { label: s, base: m[1], hi, lo, width };
  }
  return { label: s, base: s, hi: 0, lo: 0, width: 1 };
}

export function getPinWidth(label) {
  return parsePinSpec(label).width;
}

export function getTotalPinBits(pinLabels = []) {
  let total = 0;
  for (const label of pinLabels) total += getPinWidth(label);
  return total;
}

/**
 * Packs logical per-pin values (e.g. [118, 124, 0] for ['A[7:0]', 'B[7:0]', 'CIN'])
 * into a flat LSB-first bit array (0/1, or null for don't-care).
 */
export function packBusVector(pinLabels = [], values = []) {
  const flat = [];
  for (let i = 0; i < pinLabels.length; i++) {
    const w = getPinWidth(pinLabels[i]);
    const val = values[i];
    if (val === null || val === undefined) {
      for (let b = 0; b < w; b++) flat.push(null);
    } else {
      const n = Number(val) | 0;
      for (let b = 0; b < w; b++) flat.push((n >> b) & 1);
    }
  }
  return flat;
}

/**
 * Unpacks a flat LSB-first bit array into per-pin integer values according to `pinLabels`.
 */
export function unpackBusVector(pinLabels = [], flatBits = []) {
  const out = [];
  let off = 0;
  for (let i = 0; i < pinLabels.length; i++) {
    const w = getPinWidth(pinLabels[i]);
    let val = 0;
    for (let b = 0; b < w; b++) {
      if (flatBits[off + b]) val |= 1 << b;
    }
    out.push(val);
    off += w;
  }
  return out;
}

export function getChipPorts(def, busMode = false) {
  if (!def) return { inputs: [], outputs: [] };
  if (busMode) {
    const bp = def.busPorts || CHIP_BUS_PORTS[def.id];
    if (bp) return { inputs: bp.inputs, outputs: bp.outputs };
  }
  return {
    inputs: def.inputs || [],
    outputs: def.outputs || [],
  };
}

export function getChipDef(type, customChips = {}) {
  return PRIMITIVE_CHIPS[type] || customChips[type] || null;
}

export function createEmptyCircuit(inputs, outputs, { busMode = false } = {}) {
  const hasBusPins = [...inputs, ...outputs].some((p) => getPinWidth(p) > 1);
  return {
    inputs: [...inputs],
    outputs: [...outputs],
    busMode: Boolean(busMode || hasBusPins),
    nodes: [],
    wires: [],
  };
}

export function cloneCircuit(circuit) {
  return {
    inputs: [...circuit.inputs],
    outputs: [...circuit.outputs],
    busMode: Boolean(circuit.busMode),
    nodes: circuit.nodes.map((n) => ({ ...n })),
    wires: circuit.wires.map((w) => ({
      id: w.id,
      from: { ...w.from },
      to: { ...w.to },
    })),
  };
}

/**
 * Computes physical SW/PULL primitive counts for a single NAND gate from the
 * player's Stage 00-C circuit when available, or falls back to canonical 2 SW + 1 PULL.
 */
function getNandPhysicalUnit(customChips = {}) {
  const nandCircuit = customChips?.NAND?.circuit;
  if (!nandCircuit || !Array.isArray(nandCircuit.nodes)) {
    return { swCount: 2, pullCount: 1 };
  }
  let swCount = 0;
  let pullCount = 0;
  for (const n of nandCircuit.nodes) {
    if (n.type === 'SW') swCount += 1;
    else if (n.type === 'PULL') pullCount += 1;
  }
  return { swCount, pullCount };
}

/**
 * Recursively computes total primitive NAND gates, physical MOSFET (SW) / pull-up
 * resistor (PULL) counts, and abstraction depth for a circuit given `customChips`.
 */
export function computeCircuitMetrics(circuit, customChips = {}, visited = new Set(), _memo = null) {
  const memo = _memo || new Map();
  const nandUnit = getNandPhysicalUnit(customChips);
  let nandCount = 0;
  let swCount = 0;
  let pullCount = 0;
  let maxChildDepth = -1;

  for (const node of circuit.nodes) {
    if (node.type === 'NAND') {
      nandCount += 1;
      swCount += nandUnit.swCount;
      pullCount += nandUnit.pullCount;
      maxChildDepth = Math.max(maxChildDepth, 0);
    } else if (node.type === 'SW') {
      swCount += 1;
      maxChildDepth = Math.max(maxChildDepth, 0);
    } else if (node.type === 'PULL') {
      pullCount += 1;
      maxChildDepth = Math.max(maxChildDepth, 0);
    } else if (
      node.type === 'CONST_0' ||
      node.type === 'CONST_1' ||
      node.type === 'SPLIT4' ||
      node.type === 'JOIN4' ||
      node.type === 'SPLIT8' ||
      node.type === 'JOIN8'
    ) {
      maxChildDepth = Math.max(maxChildDepth, 0);
    } else {
      const def = customChips[node.type];
      if (!def) continue;
      if (visited.has(node.type)) continue;
      if (def.circuit) {
        let m = memo.get(node.type);
        if (!m) {
          const nextVisited = new Set(visited);
          nextVisited.add(node.type);
          m = computeCircuitMetrics(def.circuit, customChips, nextVisited, memo);
          memo.set(node.type, m);
        }
        nandCount += m.nandCount;
        swCount += m.swCount;
        pullCount += m.pullCount;
        maxChildDepth = Math.max(maxChildDepth, m.depth);
      } else if (typeof def.nandCount === 'number') {
        nandCount += def.nandCount;
        swCount += typeof def.swCount === 'number' ? def.swCount : def.nandCount * nandUnit.swCount;
        pullCount += typeof def.pullCount === 'number' ? def.pullCount : def.nandCount * nandUnit.pullCount;
        if (typeof def.depth === 'number') {
          maxChildDepth = Math.max(maxChildDepth, def.depth);
        }
      }
    }
  }

  return {
    nandCount,
    swCount,
    pullCount,
    nodeCount: circuit.nodes.length,
    wireCount: circuit.wires.length,
    depth: maxChildDepth + 1,
  };
}

/**
 * Checks whether two endpoints refer to the same pin.
 */
export function sameEndpoint(a, b) {
  if (!a || !b || a.kind !== b.kind || a.pin !== b.pin) return false;
  if (a.kind === 'node') return a.nodeId === b.nodeId;
  return true;
}

/**
 * Adds a wire to circuit (replacing any existing wire connected to the same target input pin).
 * Returns a new circuit object.
 */
export function connectWire(circuit, from, to, idGen = () => `w_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`) {
  // Prevent self-connecting an identical pin or invalid directions
  if (!from || !to) return circuit;
  if (from.kind !== 'input' && from.kind !== 'node') return circuit;
  if (to.kind !== 'output' && to.kind !== 'node') return circuit;

  const filtered = circuit.wires.filter((w) => !sameEndpoint(w.to, to));
  const nextWire = {
    id: idGen(),
    from: { ...from },
    to: { ...to },
  };
  return {
    ...circuit,
    wires: [...filtered, nextWire],
  };
}

/**
 * Removes a node and all wires attached to it.
 */
export function removeNode(circuit, nodeId) {
  return {
    ...circuit,
    nodes: circuit.nodes.filter((n) => n.id !== nodeId),
    wires: circuit.wires.filter(
      (w) =>
        !(w.from.kind === 'node' && w.from.nodeId === nodeId) &&
        !(w.to.kind === 'node' && w.to.nodeId === nodeId)
    ),
  };
}

/**
 * Removes a single wire by id.
 */
export function removeWire(circuit, wireId) {
  return {
    ...circuit,
    wires: circuit.wires.filter((w) => w.id !== wireId),
  };
}
