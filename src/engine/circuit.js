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
    depth: 0,
  },
  PULL: {
    id: 'PULL',
    name: 'はいすい',
    shortName: 'PULL',
    titleJa: 'はいすい（抜け道バルブ／プルアップ抵抗）',
    shortRuleJa: 'ふだんは 1、「ぬけ」に1が来ると電気が抜けて 0',
    descJa: 'ふだんは自動で 1 を出しつづけるが、「ぬけ」に電気(1)が流れ込んで地面へ抜けると出力が 0 に落ちる部品。専門用語では「プルアップ抵抗（PULL）」と呼びます。',
    inputs: ['ぬけ'],
    outputs: ['でぐち'],
    color: '#2e6a82',
    accent: '#7cd4f5',
    isPrimitive: true,
    isPhysical: true,
    nandCount: 0,
    depth: 0,
  },
};

export function getChipDef(type, customChips = {}) {
  return PRIMITIVE_CHIPS[type] || customChips[type] || null;
}

export function createEmptyCircuit(inputs, outputs) {
  return {
    inputs: [...inputs],
    outputs: [...outputs],
    nodes: [],
    wires: [],
  };
}

export function cloneCircuit(circuit) {
  return {
    inputs: [...circuit.inputs],
    outputs: [...circuit.outputs],
    nodes: circuit.nodes.map((n) => ({ ...n })),
    wires: circuit.wires.map((w) => ({
      id: w.id,
      from: { ...w.from },
      to: { ...w.to },
    })),
  };
}

/**
 * Recursively computes total primitive NAND gates and abstraction depth
 * for a circuit given the player's custom chip library.
 */
export function computeCircuitMetrics(circuit, customChips = {}, visited = new Set()) {
  let nandCount = 0;
  let maxChildDepth = -1;

  for (const node of circuit.nodes) {
    if (node.type === 'NAND') {
      nandCount += 1;
      maxChildDepth = Math.max(maxChildDepth, 0);
    } else if (
      node.type === 'CONST_0' ||
      node.type === 'CONST_1' ||
      node.type === 'SW' ||
      node.type === 'PULL'
    ) {
      maxChildDepth = Math.max(maxChildDepth, 0);
    } else {
      const def = customChips[node.type];
      if (!def) continue;
      if (visited.has(node.type)) continue;
      if (typeof def.nandCount === 'number' && typeof def.depth === 'number') {
        nandCount += def.nandCount;
        maxChildDepth = Math.max(maxChildDepth, def.depth);
      } else if (def.circuit) {
        const nextVisited = new Set(visited);
        nextVisited.add(node.type);
        const m = computeCircuitMetrics(def.circuit, customChips, nextVisited);
        nandCount += m.nandCount;
        maxChildDepth = Math.max(maxChildDepth, m.depth);
      }
    }
  }

  return {
    nandCount,
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
