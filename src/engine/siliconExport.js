/**
 * SILICON GENESIS — Real Physical Silicon & Verilog-2001 HDL Blueprint Exporter
 *
 * Exports the player's actual forged circuit hierarchy (from Stage 00-A/B/C
 * physical `sg_nmos_sw` MOSFETs & `sg_pullup` pull-up resistors through
 * `NAND`, `NOT`, `ADD_4BIT`, `REG_4BIT`, `ARK4_CORE`, `COND_PC`, `INST_DEC`,
 * `ARK4_SYS`, `ASM_ENC`, `ROM_4W`, and optional live burned `ARK4_PROGRAM_ROM`)
 * as clean, syntactically valid IEEE 1364-2001 Verilog HDL with an exact
 * physical Bill of Materials (NAND / MOSFET / Pull-up Resistor counts).
 */

import { computeCircuitMetrics, getChipPorts, parsePinSpec } from './circuit.js';
import { provisionStandardChips } from './blueprints.js';
import {
  buildProgrammableRomCircuit,
  compileRomHardware,
  getRomFuseMatrix,
} from './romRunner.js';
import {
  buildArk8RomCircuit,
  compileArk8Hardware,
  getArk8RomFuseMatrix,
} from './romRunner8.js';

const VERILOG_RESERVED = new Set([
  'always', 'and', 'assign', 'automatic', 'begin', 'buf', 'bufif0', 'bufif1',
  'case', 'casex', 'casez', 'cell', 'cmos', 'config', 'deassign', 'default',
  'defparam', 'design', 'disable', 'edge', 'else', 'end', 'endcase', 'endconfig',
  'endfunction', 'endgenerate', 'endmodule', 'endprimitive', 'endspecify',
  'endtable', 'endtask', 'event', 'for', 'force', 'forever', 'fork', 'function',
  'generate', 'genvar', 'highz0', 'highz1', 'if', 'ifnone', 'incdir', 'include',
  'initial', 'inout', 'input', 'instance', 'integer', 'join', 'large', 'liblist',
  'library', 'localparam', 'macromodule', 'medium', 'module', 'nand', 'negedge',
  'nmos', 'nor', 'noshowcancelled', 'not', 'notif0', 'notif1', 'or', 'output',
  'parameter', 'pmos', 'posedge', 'primitive', 'pull0', 'pull1', 'pulldown',
  'pullup', 'pulsestyle_onevent', 'pulsestyle_ondetect', 'rcmos', 'real',
  'realtime', 'reg', 'release', 'repeat', 'rnmos', 'rpmos', 'rtran', 'rtranif0',
  'rtranif1', 'scalared', 'showcancelled', 'signed', 'small', 'specify',
  'specparam', 'strong0', 'strong1', 'supply0', 'supply1', 'table', 'task',
  'time', 'tran', 'tranif0', 'tranif1', 'tri', 'tri0', 'tri1', 'triand', 'trior',
  'trireg', 'unsigned', 'use', 'uwire', 'vectored', 'wait', 'wand', 'weak0',
  'weak1', 'while', 'wire', 'wor', 'xnor', 'xor',
]);

const PRIMITIVE_NON_MODULES = new Set([
  'SW', 'PULL', 'CONST_0', 'CONST_1',
  'SPLIT4', 'JOIN4', 'SPLIT8', 'JOIN8',
]);

function sanitizeIdent(raw, fallback = 'sig') {
  let s = String(raw ?? '')
    .trim()
    .replace(/[^A-Za-z0-9_]/g, '_');
  if (!s) s = fallback;
  if (/^[0-9]/.test(s)) s = `p_${s}`;
  if (VERILOG_RESERVED.has(s)) s = `sg_${s}`;
  return s;
}

function buildModulePorts(inputs = [], outputs = []) {
  const used = new Set();
  const alloc = (raw, fallback) => {
    const spec = parsePinSpec(raw);
    let name = sanitizeIdent(spec.base, fallback);
    if (used.has(name)) {
      let n = 2;
      while (used.has(`${name}_${n}`)) n++;
      name = `${name}_${n}`;
    }
    used.add(name);
    return { name, width: spec.width, hi: spec.hi, lo: spec.lo };
  };
  return {
    inPorts: inputs.map((name, i) => alloc(name, `in_${i}`)),
    outPorts: outputs.map((name, i) => alloc(name, `out_${i}`)),
  };
}

function fmtWidthPrefix(width) {
  return width > 1 ? `[${width - 1}:0] ` : '';
}

function normalizeRomRows(romRows) {
  if (!romRows) return null;
  const map = new Map();
  if (romRows instanceof Map) {
    for (const [addr, entry] of romRows.entries()) {
      const part = entry?.part ?? (entry?.op ? entry : null);
      if (part && Number.isInteger(addr)) {
        map.set(addr, { part });
      }
    }
  } else if (Array.isArray(romRows)) {
    for (const entry of romRows) {
      if (!entry || !Number.isInteger(entry.addr)) continue;
      const part = entry.part ?? (entry.op ? entry : null);
      if (part) {
        map.set(entry.addr, { part });
      }
    }
  }
  return map.size > 0 ? map : null;
}

function collectCircuitDeps(circuit) {
  const deps = new Set();
  if (!circuit || !Array.isArray(circuit.nodes)) return deps;
  for (const node of circuit.nodes) {
    if (!PRIMITIVE_NON_MODULES.has(node.type)) {
      deps.add(node.type);
    }
  }
  return deps;
}

/**
 * Emits one Verilog-2001 module definition for a circuit.
 */
function emitCircuitModule(modName, circuit, portTable, workingChips, { commentLines = [] } = {}) {
  const ports = portTable.get(modName);
  const { inPorts, outPorts } = ports;
  const lines = [];

  for (const cLine of commentLines) {
    lines.push(`// ${cLine}`);
  }

  const allPortDecls = [
    ...inPorts.map((p) => `  input  wire ${fmtWidthPrefix(p.width)}${p.name}`),
    ...outPorts.map((p) => `  output wire ${fmtWidthPrefix(p.width)}${p.name}`),
  ];

  if (allPortDecls.length === 0) {
    lines.push(`module ${modName} ();`);
  } else {
    lines.push(`module ${modName} (`);
    lines.push(allPortDecls.join(',\n'));
    lines.push(');');
  }

  const circuitBusMode =
    Boolean(circuit.busMode) ||
    inPorts.some((p) => p.width > 1) ||
    outPorts.some((p) => p.width > 1);

  // Assign deterministic, collision-free tags to every node
  const nodeTag = new Map();
  const nodeById = new Map();
  const usedTags = new Set([...inPorts.map((p) => p.name), ...outPorts.map((p) => p.name)]);
  for (let i = 0; i < circuit.nodes.length; i++) {
    const node = circuit.nodes[i];
    nodeById.set(node.id, node);
    let base = sanitizeIdent(node.id, `n${i}`);
    if (usedTags.has(base)) {
      let k = 2;
      while (usedTags.has(`${base}_${k}`)) k++;
      base = `${base}_${k}`;
    }
    usedTags.add(base);
    nodeTag.set(node.id, base);
  }

  // Index wires by destination for O(1) lookup
  const nodeInputWire = new Map(); // `${nodeId}:${pin}` -> wire.from
  const extOutputWire = new Map(); // outPin -> wire.from
  for (const w of circuit.wires || []) {
    if (w.to?.kind === 'node') {
      nodeInputWire.set(`${w.to.nodeId}:${w.to.pin}`, w.from);
    } else if (w.to?.kind === 'output') {
      extOutputWire.set(w.to.pin, w.from);
    }
  }

  const getNodeOutWidths = (node) => {
    if (node.type === 'SW' || node.type === 'PULL' || node.type === 'NAND') return [1];
    if (node.type === 'CONST_0' || node.type === 'CONST_1') return [1];
    if (node.type === 'SPLIT4') return [1, 1, 1, 1];
    if (node.type === 'JOIN4') return [4];
    if (node.type === 'SPLIT8') return [4, 4];
    if (node.type === 'JOIN8') return [8];
    const def = workingChips[node.type];
    if (def) {
      const ports = getChipPorts(def, circuitBusMode);
      return ports.outputs.map((p) => parsePinSpec(p).width);
    }
    const childMod = sanitizeIdent(node.type, 'CHIP');
    const childPorts = portTable.get(childMod);
    if (childPorts) return childPorts.outPorts.map((p) => p.width);
    return [];
  };

  const resolveExpr = (from, expectedWidth = 1) => {
    const zeroLit = `${expectedWidth}'b${'0'.repeat(expectedWidth)}`;
    const oneLit = `${expectedWidth}'b${'1'.repeat(expectedWidth)}`;
    if (!from) return zeroLit;
    if (from.kind === 'input') {
      const p = inPorts[from.pin];
      if (!p) return zeroLit;
      if (p.width === 1 && expectedWidth > 1) return `{${expectedWidth}{${p.name}}}`;
      return p.name;
    }
    if (from.kind === 'node') {
      const srcNode = nodeById.get(from.nodeId);
      if (!srcNode) return zeroLit;
      if (srcNode.type === 'CONST_0') return zeroLit;
      if (srcNode.type === 'CONST_1') return oneLit;
      const tag = nodeTag.get(srcNode.id);
      const srcWidths = getNodeOutWidths(srcNode);
      const srcW = srcWidths[from.pin] || 1;
      const sym = `w_${tag}_o${from.pin}`;
      if (srcW === 1 && expectedWidth > 1) return `{${expectedWidth}{${sym}}}`;
      return sym;
    }
    return zeroLit;
  };

  // Declare internal wires for every non-constant node output
  const wireDecls = [];
  for (const node of circuit.nodes) {
    if (node.type === 'CONST_0' || node.type === 'CONST_1') continue;
    const tag = nodeTag.get(node.id);
    const outWidths = getNodeOutWidths(node);
    for (let p = 0; p < outWidths.length; p++) {
      wireDecls.push(`  wire ${fmtWidthPrefix(outWidths[p])}w_${tag}_o${p};`);
    }
  }
  if (wireDecls.length > 0) {
    lines.push(...wireDecls);
    lines.push('');
  }

  // Emit submodule / physical primitive instantiations
  const instLines = [];
  for (const node of circuit.nodes) {
    if (node.type === 'CONST_0' || node.type === 'CONST_1') continue;
    const tag = nodeTag.get(node.id);
    if (node.type === 'SW') {
      const inFlow = resolveExpr(nodeInputWire.get(`${node.id}:0`), 1);
      const gate = resolveExpr(nodeInputWire.get(`${node.id}:1`), 1);
      instLines.push(`  sg_nmos_sw u_${tag} (.in_flow(${inFlow}), .gate(${gate}), .out_flow(w_${tag}_o0));`);
    } else if (node.type === 'PULL') {
      const drainCtl = resolveExpr(nodeInputWire.get(`${node.id}:0`), 1);
      instLines.push(`  sg_pullup  u_${tag} (.drain_ctl(${drainCtl}), .out_sig(w_${tag}_o0));`);
    } else if (node.type === 'SPLIT4') {
      const busExpr = resolveExpr(nodeInputWire.get(`${node.id}:0`), 4);
      for (let b = 0; b < 4; b++) {
        instLines.push(`  assign w_${tag}_o${b} = ${busExpr}[${b}];`);
      }
    } else if (node.type === 'JOIN4') {
      const b0 = resolveExpr(nodeInputWire.get(`${node.id}:0`), 1);
      const b1 = resolveExpr(nodeInputWire.get(`${node.id}:1`), 1);
      const b2 = resolveExpr(nodeInputWire.get(`${node.id}:2`), 1);
      const b3 = resolveExpr(nodeInputWire.get(`${node.id}:3`), 1);
      instLines.push(`  assign w_${tag}_o0 = {${b3}, ${b2}, ${b1}, ${b0}};`);
    } else if (node.type === 'SPLIT8') {
      const busExpr = resolveExpr(nodeInputWire.get(`${node.id}:0`), 8);
      instLines.push(`  assign w_${tag}_o0 = ${busExpr}[3:0];`);
      instLines.push(`  assign w_${tag}_o1 = ${busExpr}[7:4];`);
    } else if (node.type === 'JOIN8') {
      const loExpr = resolveExpr(nodeInputWire.get(`${node.id}:0`), 4);
      const hiExpr = resolveExpr(nodeInputWire.get(`${node.id}:1`), 4);
      instLines.push(`  assign w_${tag}_o0 = {${hiExpr}, ${loExpr}};`);
    } else {
      const childMod = sanitizeIdent(node.type, 'CHIP');
      const childPorts = portTable.get(childMod);
      if (!childPorts) continue;
      const def = workingChips[node.type];
      const viewPorts = def ? getChipPorts(def, circuitBusMode) : null;
      const usesBusAdapterView =
        circuitBusMode &&
        viewPorts &&
        (viewPorts.inputs.length !== childPorts.inPorts.length ||
          viewPorts.outputs.length !== childPorts.outPorts.length);

      const conns = [];
      if (usesBusAdapterView) {
        // Expand bus view pins bit-by-bit onto the child module's 1-bit Verilog ports
        let flatInIdx = 0;
        for (let vp = 0; vp < viewPorts.inputs.length; vp++) {
          const w = parsePinSpec(viewPorts.inputs[vp]).width;
          const expr = resolveExpr(nodeInputWire.get(`${node.id}:${vp}`), w);
          if (w === 1) {
            const cp = childPorts.inPorts[flatInIdx++];
            if (cp) conns.push(`.${cp.name}(${expr})`);
          } else {
            for (let b = 0; b < w; b++) {
              const cp = childPorts.inPorts[flatInIdx++];
              if (cp) {
                const bitExpr = expr.includes("'") ? `${expr.endsWith('1') ? "1'b1" : "1'b0"}` : `${expr}[${b}]`;
                conns.push(`.${cp.name}(${bitExpr})`);
              }
            }
          }
        }
        let flatOutIdx = 0;
        for (let vp = 0; vp < viewPorts.outputs.length; vp++) {
          const w = parsePinSpec(viewPorts.outputs[vp]).width;
          if (w === 1) {
            const cp = childPorts.outPorts[flatOutIdx++];
            if (cp) conns.push(`.${cp.name}(w_${tag}_o${vp})`);
          } else {
            for (let b = 0; b < w; b++) {
              const cp = childPorts.outPorts[flatOutIdx++];
              if (cp) conns.push(`.${cp.name}(w_${tag}_o${vp}[${b}])`);
            }
          }
        }
      } else {
        for (let i = 0; i < childPorts.inPorts.length; i++) {
          const cp = childPorts.inPorts[i];
          const expr = resolveExpr(nodeInputWire.get(`${node.id}:${i}`), cp.width);
          conns.push(`.${cp.name}(${expr})`);
        }
        for (let o = 0; o < childPorts.outPorts.length; o++) {
          const cp = childPorts.outPorts[o];
          conns.push(`.${cp.name}(w_${tag}_o${o})`);
        }
      }
      instLines.push(`  ${childMod} u_${tag} (${conns.join(', ')});`);
    }
  }
  if (instLines.length > 0) {
    lines.push(...instLines);
    lines.push('');
  }

  // Emit output continuous assignments
  for (let i = 0; i < outPorts.length; i++) {
    const op = outPorts[i];
    const expr = resolveExpr(extOutputWire.get(i), op.width);
    lines.push(`  assign ${op.name} = ${expr};`);
  }

  lines.push('endmodule');
  return lines.join('\n');
}

/**
 * Exports the player's forged physical silicon hardware (and optional burned
 * assembly ROM program) as syntactically valid Verilog-2001 HDL plus exact
 * Bill of Materials stats.
 */
export function exportSiliconBlueprint(
  customChips = {},
  { romCircuit = null, romRows = null, romArch = null, stageTitle = '' } = {}
) {
  const workingChips = {};
  for (const [id, def] of Object.entries(customChips || {})) {
    if (def && def.circuit) {
      workingChips[id] = def;
    }
  }

  // Normalize optional live assembly ROM rows into a Map<addr, { part }>
  const normalizedRomMap = normalizeRomRows(romRows);
  const isAutoArch = !romArch || romArch === 'auto';
  const isArk8Os =
    romArch === 'ark8_os' ||
    (isAutoArch && Boolean(workingChips.ARK8_OS_HW?.circuit) && !normalizedRomMap);
  const isArk8Rom =
    !isArk8Os &&
    (romArch === 'ark8' ||
      (normalizedRomMap && Array.from(normalizedRomMap.values()).some((e) => e.part?.word16 !== undefined)));
  const romModName = isArk8Os ? 'ARK8_OS_UNIFIED_RAM' : isArk8Rom ? 'ARK8_PROGRAM_ROM' : 'ARK4_PROGRAM_ROM';

  // Lazily build canonical fallback chips ONLY to fill any missing referenced dependency
  let canonicalFallback = null;
  const getFallback = () => {
    if (!canonicalFallback) {
      canonicalFallback = provisionStandardChips(
        {},
        { includeChapter3Hardware: true, includeChapter4Hardware: isArk8Os || Boolean(workingChips.ARK8_OS_HW), provisioned: true }
      );
    }
    return canonicalFallback;
  };

  // Ensure full Chapter 4 motherboard modules are included when exporting `romArch: 'ark8_os'`
  if (isArk8Os) {
    const fb = getFallback();
    const ch4Reqs = [
      'NAND', 'ASM_ENC', 'ASM_ENC8', 'REG_8B', 'SRAM_16B',
      'MEM_BUS8', 'MMIO_DEC', 'STACK_PTR', 'CMP_8B', 'TMR_IRQ',
      'MMU_8B', 'PRIV_CTRL', 'IRQ_VEC', 'INST_DEC16', 'ARK8_OS_HW',
    ];
    for (const req of ch4Reqs) {
      if (!workingChips[req] && fb[req]) {
        workingChips[req] = fb[req];
      }
    }
  }

  // Build live programmable ROM circuit if romRows (or romCircuit) is supplied (Ch.2 / Ch.3 Mask ROMs)
  let liveRomCircuit = romCircuit || null;
  let fuseMatrix = null;
  if (!isArk8Os && !liveRomCircuit && normalizedRomMap) {
    const fb = getFallback();
    const reqs = isArk8Rom
      ? ['NAND', 'NOT', 'AND', 'OR', 'DEC_2TO4', 'ASM_ENC', 'ASM_ENC8']
      : ['NAND', 'NOT', 'AND', 'OR', 'DEC_2TO4', 'ASM_ENC'];
    for (const req of reqs) {
      if (!workingChips[req] && fb[req]) {
        workingChips[req] = fb[req];
      }
    }
    if (isArk8Rom) {
      let hw8 = null;
      try {
        hw8 = compileArk8Hardware(workingChips);
      } catch {
        hw8 = null;
      }
      liveRomCircuit = buildArk8RomCircuit(normalizedRomMap, hw8);
      fuseMatrix = getArk8RomFuseMatrix(normalizedRomMap, hw8);
    } else {
      let hwForEnc = null;
      try {
        hwForEnc = compileRomHardware(workingChips);
      } catch {
        hwForEnc = null;
      }
      liveRomCircuit = buildProgrammableRomCircuit(normalizedRomMap, hwForEnc);
      fuseMatrix = getRomFuseMatrix(normalizedRomMap, hwForEnc);
    }
  }

  // Transitively resolve all missing referenced sub-chips (including Stage 00-C NAND!)
  const pendingIds = new Set(Object.keys(workingChips));
  if (liveRomCircuit) {
    for (const dep of collectCircuitDeps(liveRomCircuit)) {
      pendingIds.add(dep);
    }
  }
  const visitedResolve = new Set();
  while (pendingIds.size > 0) {
    const nextBatch = Array.from(pendingIds);
    pendingIds.clear();
    for (const chipId of nextBatch) {
      if (visitedResolve.has(chipId)) continue;
      visitedResolve.add(chipId);
      if (!workingChips[chipId]) {
        const fb = getFallback();
        if (fb[chipId]?.circuit) {
          workingChips[chipId] = fb[chipId];
        }
      }
      const def = workingChips[chipId];
      if (def?.circuit) {
        for (const dep of collectCircuitDeps(def.circuit)) {
          if (!visitedResolve.has(dep)) pendingIds.add(dep);
        }
      }
    }
  }

  // Topologically sort all chip modules bottom-up (dependencies defined before users)
  const orderedIds = [];
  const tempMark = new Set();
  const permMark = new Set();
  const visitTopo = (id) => {
    if (permMark.has(id) || tempMark.has(id)) return;
    const def = workingChips[id];
    if (!def?.circuit) return;
    tempMark.add(id);
    for (const dep of collectCircuitDeps(def.circuit)) {
      if (workingChips[dep]?.circuit) {
        visitTopo(dep);
      }
    }
    tempMark.delete(id);
    permMark.add(id);
    orderedIds.push(id);
  };
  // Visit NAND first so it always appears immediately after physical primitives
  if (workingChips.NAND) visitTopo('NAND');
  for (const id of Object.keys(workingChips)) {
    visitTopo(id);
  }

  // Pre-build sanitized port tables for every module
  const portTable = new Map();
  for (const id of orderedIds) {
    const def = workingChips[id];
    const modName = sanitizeIdent(id, 'CHIP');
    const ins = def.inputs?.length ? def.inputs : def.circuit.inputs || [];
    const outs = def.outputs?.length ? def.outputs : def.circuit.outputs || [];
    portTable.set(modName, buildModulePorts(ins, outs));
  }
  if (liveRomCircuit) {
    portTable.set(
      romModName,
      buildModulePorts(liveRomCircuit.inputs || [], liveRomCircuit.outputs || [])
    );
  }

  // Compute physical Bill of Materials (BOM)
  const zeroM = { nandCount: 0, swCount: 0, pullCount: 0 };
  const cpuDef =
    (romArch === 'ark4'
      ? workingChips.ARK4_SYS || workingChips.ARK4_CORE
      : romArch === 'ark8'
        ? workingChips.ARK8_SYS
        : isArk8Os
          ? workingChips.ARK8_OS_HW
          : workingChips.ARK8_OS_HW || workingChips.ARK8_SYS || workingChips.ARK4_SYS || workingChips.ARK4_CORE) || null;
  const cpuM = cpuDef?.circuit ? computeCircuitMetrics(cpuDef.circuit, workingChips) : zeroM;
  const encDef = workingChips.ASM_ENC8 || workingChips.ASM_ENC || null;
  const encM = encDef?.circuit ? computeCircuitMetrics(encDef.circuit, workingChips) : zeroM;
  const romM = liveRomCircuit
    ? computeCircuitMetrics(liveRomCircuit, workingChips)
    : !isArk8Os && workingChips.ROM_4W?.circuit
      ? computeCircuitMetrics(workingChips.ROM_4W.circuit, workingChips)
      : zeroM;

  let totalNandCount = cpuM.nandCount + encM.nandCount + romM.nandCount;
  let totalSwCount = cpuM.swCount + encM.swCount + romM.swCount;
  let totalPullCount = cpuM.pullCount + encM.pullCount + romM.pullCount;

  // If exporting full Chapter 4 OS-ready motherboard, also report motherboard support silicon
  let boardSupportM = zeroM;
  if (isArk8Os) {
    const supIds = ['MEM_BUS8', 'MMIO_DEC', 'TMR_IRQ', 'MMU_8B'];
    for (const sid of supIds) {
      if (workingChips[sid]?.circuit) {
        const sm = computeCircuitMetrics(workingChips[sid].circuit, workingChips);
        boardSupportM = {
          nandCount: boardSupportM.nandCount + sm.nandCount,
          swCount: boardSupportM.swCount + sm.swCount,
          pullCount: boardSupportM.pullCount + sm.pullCount,
        };
      }
    }
    if (workingChips.REG_8B?.circuit) {
      const rm = computeCircuitMetrics(workingChips.REG_8B.circuit, workingChips);
      boardSupportM = {
        nandCount: boardSupportM.nandCount + rm.nandCount * 4,
        swCount: boardSupportM.swCount + rm.swCount * 4,
        pullCount: boardSupportM.pullCount + rm.pullCount * 4,
      };
    }
  }

  // If player exported early (before forging ARK4_CORE/SYS), summarize top-most forged module
  if (totalNandCount === 0 && totalSwCount === 0 && orderedIds.length > 0) {
    const topDef = workingChips[orderedIds[orderedIds.length - 1]];
    const topM = computeCircuitMetrics(topDef.circuit, workingChips);
    totalNandCount = topM.nandCount;
    totalSwCount = topM.swCount;
    totalPullCount = topM.pullCount;
  }

  const moduleCount = orderedIds.length + (liveRomCircuit ? 1 : 0);

  const stats = {
    cpuNandCount: cpuM.nandCount,
    cpuSwCount: cpuM.swCount,
    cpuPullCount: cpuM.pullCount,
    encNandCount: encM.nandCount,
    encSwCount: encM.swCount,
    encPullCount: encM.pullCount,
    romNandCount: romM.nandCount,
    romSwCount: romM.swCount,
    romPullCount: romM.pullCount,
    totalNandCount,
    totalSwCount,
    totalPullCount,
    moduleCount,
  };

  // Assemble full Verilog-2001 HDL document
  const blocks = [];

  const headerLines = [
    '// ============================================================================',
    '// SILICON GENESIS — Full Physical Silicon Netlist (IEEE 1364-2001 Verilog HDL)',
    ...(stageTitle ? [`// Stage / Target : ${stageTitle}`] : []),
    `// CPU Silicon    : ${cpuDef ? cpuDef.id : 'NONE'} (${stats.cpuNandCount} NAND = ${stats.cpuSwCount} MOSFET + ${stats.cpuPullCount} Pull-up Resistors)`,
    ...(isArk8Os
      ? [
          `// Board Silicon  : MEM_BUS8 + MMIO_DEC + TMR_IRQ + MMU_8B + 4xREG_8B (${boardSupportM.nandCount} NAND = ${boardSupportM.swCount} MOSFET + ${boardSupportM.pullCount} Pull-up Resistors)`,
          '// Unified Memory : 256-Byte Von Neumann RAM (16x verified SRAM_16B banks, 0x00..0xEF RAM / 0xF0..0xFF MMIO)',
        ]
      : []),
    `// Key Encoder    : ${encDef ? encDef.id : 'NONE'} (${stats.encNandCount} NAND = ${stats.encSwCount} MOSFET + ${stats.encPullCount} Pull-up Resistors)`,
    `// Program Memory : ${isArk8Os ? 'ARK8_OS_UNIFIED_RAM (256B)' : liveRomCircuit ? romModName : workingChips.ROM_4W ? 'ROM_4W' : 'NONE'} (${stats.romNandCount} NAND = ${stats.romSwCount} MOSFET + ${stats.romPullCount} Pull-up Resistors)`,
    `// TOTAL SILICON  : ${stats.totalNandCount} NAND = ${stats.totalSwCount} MOSFET + ${stats.totalPullCount} Pull-up Resistors (${stats.moduleCount} Modules)`,
    '// ============================================================================',
    '',
    '`timescale 1ns/1ps',
  ];
  blocks.push(headerLines.join('\n'));

  // Physical Silicon Primitives (Stage 00-A MOSFET & Stage 00-B Pull-up Resistor)
  blocks.push([
    '// Physical Primitive 1: N-Channel MOSFET Switch (Forged in Stage 00-A)',
    'module sg_nmos_sw (',
    '  input  wire in_flow,',
    '  input  wire gate,',
    '  output wire out_flow',
    ');',
    '  wire n_ch;',
    '  nmos u_fet (n_ch, in_flow, gate);',
    '  pulldown (n_ch);',
    '  assign out_flow = n_ch;',
    'endmodule',
  ].join('\n'));

  blocks.push([
    '// Physical Primitive 2: Pull-up Resistor + Ground-Drain MOSFET (Forged in Stage 00-B)',
    'module sg_pullup (',
    '  input  wire drain_ctl,',
    '  output wire out_sig',
    ');',
    '  supply0 gnd;',
    '  wire node_pull;',
    '  pullup (node_pull);',
    '  nmos u_drain_fet (node_pull, gnd, drain_ctl);',
    '  assign out_sig = node_pull;',
    'endmodule',
  ].join('\n'));

  // Emit every player-forged hardware module bottom-up
  for (const id of orderedIds) {
    const def = workingChips[id];
    const modName = sanitizeIdent(id, 'CHIP');
    const m = computeCircuitMetrics(def.circuit, workingChips);
    const label = def.titleJa ? `${id} — ${def.titleJa}` : id;
    const metricComment =
      id === 'NAND'
        ? `${label} (${m.swCount} MOSFET + ${m.pullCount} Pull-up Resistors)`
        : `${label} (${m.nandCount} NAND = ${m.swCount} MOSFET + ${m.pullCount} Pull-up Resistors)`;
    blocks.push(
      emitCircuitModule(modName, def.circuit, portTable, workingChips, {
        commentLines: [metricComment],
      })
    );
  }

  // Emit optional live burned Mask ROM module
  if (liveRomCircuit) {
    const romComments = [
      `${romModName} — Burned Mask ROM Matrix (${romM.nandCount} NAND = ${romM.swCount} MOSFET + ${romM.pullCount} Pull-up Resistors)`,
    ];
    if (fuseMatrix) {
      romComments.push(
        `Burned Words: ${fuseMatrix.wordCount}, Total Burned OR-Plane Fuses: ${fuseMatrix.totalBurnedFuses}`
      );
      for (const r of fuseMatrix.rows) {
        if (!r.part) continue;
        if (isArk8Rom) {
          romComments.push(`  [${r.addrBits}] addr ${r.addr}: ${r.part.name.padEnd(14, ' ')} -> ${r.part.hex16 || ''}`);
        } else {
          const immBits = `${r.imm[3]}${r.imm[2]}${r.imm[1]}${r.imm[0]}`;
          romComments.push(`  [${r.addrBits}] addr ${r.addr}: ${r.part.name.padEnd(6, ' ')} -> ${r.i1}${r.i0}:${immBits}`);
        }
      }
    }
    blocks.push(
      emitCircuitModule(romModName, liveRomCircuit, portTable, workingChips, {
        commentLines: romComments,
      })
    );
  } else if (isArk8Os && normalizedRomMap && normalizedRomMap.size > 0) {
    const progComments = [
      '// ============================================================================',
      '// ARK8_OS_UNIFIED_RAM — 256B Unified Von Neumann Program Image (16-Bit Words)',
    ];
    const sorted = Array.from(normalizedRomMap.entries()).sort((a, b) => a[0] - b[0]);
    for (const [addr, entry] of sorted) {
      if (!entry?.part) continue;
      const ba = (addr << 1) & 0xff;
      const baHex = `0x${ba.toString(16).toUpperCase().padStart(2, '0')}`;
      progComments.push(
        `//   [PC ${String(addr).padStart(2, ' ')} @ ${baHex}]: ${(entry.part.name || '').padEnd(16, ' ')} -> ${entry.part.hex16 || ''}`
      );
    }
    progComments.push('// ============================================================================');
    blocks.push(progComments.join('\n'));
  }

  const verilog = `${blocks.join('\n\n')}\n`;

  const summaryJa =
    stats.totalSwCount > 0
      ? `合計 ${stats.totalNandCount} NAND（MOSFET ${stats.totalSwCount}個 ＋ プルアップ抵抗 ${stats.totalPullCount}本 ／ ${stats.moduleCount}モジュール）— 砂から組み上げた実回路そのままの Verilog HDL 設計図`
      : 'まだ鍛造済みの論理回路モジュールがありません（Stage 00-C 以降で設計図が生成されます）';

  return {
    verilog,
    summaryJa,
    stats,
  };
}
