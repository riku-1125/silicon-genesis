/**
 * SILICON GENESIS — Shared Live-Simulated Mini Schematic SVG Renderer
 *
 * Used by both:
 *   - ModalManager.openChipInspector (workbench & codex deep-dive)
 *   - GlossaryPopoverController (story-dialogue underlined term popovers)
 *
 * Renders the player's actual custom circuit layout as a crisp scalable SVG
 * and drives real-time signal animation through the compiled logic engine!
 */

import { STAGES } from '../data/stages.js?v=40';
import { PRIMITIVE_CHIPS, getChipDef, getChipPorts, getPinWidth, packBusVector } from '../engine/circuit.js';
import { compileCircuit } from '../engine/simulator.js';

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Computes clean normalized node coordinates & SVG viewBox while preserving
 * the player's exact relative spatial arrangement.
 */
function computeLayout(circuit, customChips) {
  const nodes = circuit.nodes || [];
  const busMode = Boolean(circuit.busMode) || [...(circuit.inputs || []), ...(circuit.outputs || [])].some((p) => getPinWidth(p) > 1);
  const nodeBox = (node) => {
    const def = getChipDef(node.type, customChips) || PRIMITIVE_CHIPS.NAND;
    const ports = getChipPorts(def, busMode);
    const mp = Math.max(ports.inputs.length, ports.outputs.length, 1);
    const step = mp >= 8 ? 22 : 26;
    const nh = Math.max(52, mp * step + 18);
    const nw = mp >= 6 ? 102 : Math.max(78, Math.round(Math.max((def.name || node.type).length, 4) * 9.5 + 24));
    return { nw, nh, def, ports, step };
  };

  let minX = Infinity;
  let minY = Infinity;
  for (const n of nodes) {
    if (typeof n.x === 'number') minX = Math.min(minX, n.x);
    if (typeof n.y === 'number') minY = Math.min(minY, n.y);
  }
  // Remove excess outer empty margin when chips were placed far down/right on tall portrait or wide landscape boards
  const shiftX = Number.isFinite(minX) && minX > 155 ? minX - 135 : 0;
  const shiftY = Number.isFinite(minY) && minY > 96 ? minY - 48 : 0;

  const placed = new Map();
  let maxRight = 510;
  let maxBottom = 260;
  for (const n of nodes) {
    const box = nodeBox(n);
    const x = Math.max(112, (n.x || 180) - shiftX);
    const y = Math.max(24, (n.y || 80) - shiftY);
    placed.set(n.id, { ...box, x, y });
    maxRight = Math.max(maxRight, x + box.nw);
    maxBottom = Math.max(maxBottom, y + box.nh);
  }

  const w = Math.max(640, Math.round(maxRight + 130));
  const maxPins = Math.max(circuit.inputs.length, circuit.outputs.length, 1);
  const minPinH = maxPins >= 8 ? 420 : maxPins >= 6 ? 340 : maxPins >= 4 ? 270 : 220;
  const h = Math.max(minPinH, Math.round(maxBottom + 36));

  return { w, h, placed };
}

export function renderMiniSchematicSvg(circuit, customChips) {
  const { w, h, placed } = computeLayout(circuit, customChips);

  const inPos = (idx) => {
    const n = circuit.inputs.length;
    const y = n <= 1 ? h / 2 : 34 + (idx * (h - 68)) / (n - 1);
    return { x: 86, y };
  };
  const outPos = (idx) => {
    const n = circuit.outputs.length;
    const y = n <= 1 ? h / 2 : 34 + (idx * (h - 68)) / (n - 1);
    return { x: w - 86, y };
  };

  const getEp = (ep, side) => {
    if (ep.kind === 'input') return inPos(ep.pin);
    if (ep.kind === 'output') return outPos(ep.pin);
    const box = placed.get(ep.nodeId);
    if (!box) return { x: w / 2, y: h / 2 };
    const pins = side === 'in' ? box.ports.inputs : box.ports.outputs;
    const startY = box.y + box.nh / 2 - ((pins.length - 1) * box.step) / 2;
    const y = pins.length <= 1 ? box.y + box.nh / 2 : startY + ep.pin * box.step;
    return { x: side === 'in' ? box.x : box.x + box.nw, y };
  };

  const wiresSvg = (circuit.wires || [])
    .map((wire) => {
      const a = getEp(wire.from, 'out');
      const b = getEp(wire.to, 'in');
      const dx = b.x - a.x;
      let pathD;
      if (dx < 20) {
        const span = Math.max(46, Math.min(110, Math.abs(dx) * 0.45 + 46));
        const bend = a.y < h / 2 ? -32 : 32;
        pathD = `M${a.x},${a.y} C${a.x + span},${a.y + bend} ${b.x - span},${b.y + bend} ${b.x},${b.y}`;
      } else {
        const c = Math.max(30, dx * 0.45);
        pathD = `M${a.x},${a.y} C${a.x + c},${a.y} ${b.x - c},${b.y} ${b.x},${b.y}`;
      }
      return `
        <path class="mini-wire-base" data-mini-wire="${esc(wire.id)}" d="${pathD}" fill="none" stroke="#33485c" stroke-width="2.6" opacity="0.88"/>
        <path class="mini-wire-flow" data-mini-wire-flow="${esc(wire.id)}" d="${pathD}" fill="none" stroke="#ffd166" stroke-width="2.8" opacity="0"/>
      `;
    })
    .join('');

  const nodesSvg = (circuit.nodes || [])
    .map((node) => {
      const box = placed.get(node.id);
      if (!box) return '';
      const { x, y, nw, nh, def } = box;
      return `
        <g class="mini-node-group" data-mini-node-group="${esc(node.id)}">
          <rect data-mini-node="${esc(node.id)}" data-accent="${esc(def.accent || '#8aa')}" x="${x}" y="${y}" width="${nw}" height="${nh}" rx="6" fill="#1b2530" stroke="${esc(def.accent || '#8aa')}" stroke-width="2"/>
          <text x="${x + nw / 2}" y="${y + nh / 2 - 2}" text-anchor="middle" fill="#fff" font-size="12.5" font-family="monospace" font-weight="bold">${esc(def.name)}</text>
          <text data-mini-node-val="${esc(node.id)}" x="${x + nw / 2}" y="${y + nh / 2 + 13}" text-anchor="middle" fill="#88a2bc" font-size="10.5" font-family="monospace" font-weight="bold">OUT: -</text>
        </g>
      `;
    })
    .join('');

  const inSvg = (circuit.inputs || [])
    .map((lbl, i) => {
      const p = inPos(i);
      return `
        <g class="mini-in-pin">
          <rect data-mini-in-rect="${i}" x="10" y="${p.y - 12}" width="76" height="24" rx="5" fill="#1b2632" stroke="#486078" stroke-width="1.8"/>
          <text data-mini-in-text="${i}" data-lbl="${esc(lbl)}" x="48" y="${p.y + 4}" text-anchor="middle" fill="#a8bed4" font-size="11.5" font-family="monospace" font-weight="bold">${esc(lbl)}=0</text>
        </g>
      `;
    })
    .join('');

  const outSvg = (circuit.outputs || [])
    .map((lbl, i) => {
      const p = outPos(i);
      return `
        <g class="mini-out-pin">
          <rect data-mini-out-rect="${i}" x="${w - 86}" y="${p.y - 12}" width="76" height="24" rx="5" fill="#16222d" stroke="#3b5368" stroke-width="1.8"/>
          <text data-mini-out-text="${i}" data-lbl="${esc(lbl)}" x="${w - 48}" y="${p.y + 4}" text-anchor="middle" fill="#95acc2" font-size="11.5" font-family="monospace" font-weight="bold">${esc(lbl)}=0</text>
        </g>
      `;
    })
    .join('');

  return `
    <div class="mini-svg-wrap">
      <svg viewBox="0 0 ${w} ${h}" class="mini-svg">
        <rect x="0" y="0" width="${w}" height="${h}" rx="10" fill="#0d141c"/>
        ${wiresSvg}
        ${inSvg}
        ${outSvg}
        ${nodesSvg}
      </svg>
    </div>
  `;
}

/**
 * Compiles `circuit` with the real simulation engine and animates the SVG inside `containerEl`.
 * Returns `{ sim, stop }` so callers can clean up the interval timer cleanly on close.
 */
export function startMiniSchematicLoop(
  containerEl,
  circuit,
  customChips,
  chipType,
  { liveInputs = null, badgeSelector = '#inspector-live-step-badge' } = {}
) {
  if (!containerEl || !circuit) return null;
  let sim;
  try {
    sim = compileCircuit(circuit, customChips);
  } catch {
    return null;
  }

  const stage =
    chipType === 'NAND'
      ? STAGES.find((s) => s.id === 'stage_00')
      : STAGES.find((s) => s.rewardChip?.id === chipType);

  const hasLiveInputs =
    Array.isArray(liveInputs) && liveInputs.length === circuit.inputs.length;

  let steps = [];
  if (hasLiveInputs) {
    steps = [
      {
        label: `🔍 現在の盤面からの入力 (${circuit.inputs.map((l, i) => `${l}=${liveInputs[i]}`).join(', ')})`,
        input: [...liveInputs],
        isLiveBoardStep: true,
      },
    ];
  } else if (Array.isArray(stage?.tests) && stage.tests.length > 0) {
    steps = stage.tests;
  } else {
    const nIn = Math.min(3, circuit.inputs.length);
    const count = Math.max(1, 1 << nIn);
    steps = Array.from({ length: count }, (_, mask) => {
      const inp = circuit.inputs.map((_, i) => (mask >> i) & 1);
      return {
        label: `${circuit.inputs.map((l, i) => `${l}=${inp[i]}`).join(', ')}`,
        input: inp,
      };
    });
  }

  const isCombinational = !stage || stage.mode === 'combinational';
  let stepIdx = 0;

  const applyStep = (idx) => {
    if (!containerEl) return;
    const step = steps[idx];
    if (!step) return;

    if (isCombinational || idx === 0) {
      sim.reset();
    }
    if (Array.isArray(step.busPhases)) {
      for (const bp of step.busPhases) {
        sim.evaluate(packBusVector(circuit.inputs, bp));
      }
    } else if (Array.isArray(step.phases)) {
      for (const ph of step.phases) {
        sim.evaluate(ph);
      }
    } else if (Array.isArray(step.busInput)) {
      sim.evaluate(packBusVector(circuit.inputs, step.busInput));
    } else if (Array.isArray(step.input)) {
      sim.evaluate(step.input);
    }

    const inVals = sim.getInputBusValues();
    const outVals = sim.getOutputBusValues();

    const badgeEl = badgeSelector ? containerEl.querySelector(badgeSelector) : null;
    if (badgeEl) {
      badgeEl.textContent = step.isLiveBoardStep
        ? `${step.label}`
        : `⚡ 自動シミュレーション (${idx + 1}/${steps.length})：${step.label}${steps.length > 1 ? '  [タップで次へ]' : ''}`;
    }

    // 1. Update Input Terminals
    inVals.forEach((val, i) => {
      const rect = containerEl.querySelector(`[data-mini-in-rect="${i}"]`);
      const txt = containerEl.querySelector(`[data-mini-in-text="${i}"]`);
      const active = val > 0;
      if (rect) {
        rect.setAttribute('fill', active ? '#3b2a10' : '#1b2632');
        rect.setAttribute('stroke', active ? '#ffd166' : '#486078');
      }
      if (txt) {
        const lbl = txt.getAttribute('data-lbl') || `IN${i}`;
        txt.textContent = `${lbl}=${val}`;
        txt.setAttribute('fill', active ? '#ffe599' : '#8fa6bc');
      }
    });

    // 2. Update Output Terminals
    outVals.forEach((val, i) => {
      const rect = containerEl.querySelector(`[data-mini-out-rect="${i}"]`);
      const txt = containerEl.querySelector(`[data-mini-out-text="${i}"]`);
      const active = val > 0;
      if (rect) {
        rect.setAttribute('fill', active ? '#123d2f' : '#16222d');
        rect.setAttribute('stroke', active ? '#52e3b6' : '#3b5368');
      }
      if (txt) {
        const lbl = txt.getAttribute('data-lbl') || `OUT${i}`;
        txt.textContent = `${lbl}=${val}`;
        txt.setAttribute('fill', active ? '#8fffdc' : '#8fa6bc');
      }
    });

    // 3. Update Wires (glowing flowing current when carrying non-zero value!)
    for (const wire of circuit.wires || []) {
      const bw = sim.getWireBusValue(wire.id);
      const val = bw.value > 0 ? 1 : 0;
      const baseEl = containerEl.querySelector(`[data-mini-wire="${wire.id}"]`);
      const flowEl = containerEl.querySelector(`[data-mini-wire-flow="${wire.id}"]`);
      const sw = bw.width > 1 ? (bw.width >= 8 ? '4.8' : '3.8') : '2.6';
      if (baseEl) {
        baseEl.setAttribute('stroke-width', sw);
        baseEl.setAttribute('stroke', val ? (bw.width > 1 ? '#56ccf2' : '#d98a2b') : '#2e4154');
        baseEl.setAttribute('opacity', val ? '0.95' : '0.65');
      }
      if (flowEl) {
        flowEl.setAttribute('stroke-width', sw);
        flowEl.setAttribute('stroke', bw.width > 1 ? '#7ef7cf' : '#ffd166');
        flowEl.setAttribute('opacity', val ? '0.95' : '0');
      }
    }

    // 4. Update Sub-Chip Nodes
    for (const node of circuit.nodes || []) {
      const pinVals = sim.getNodePinBusValues(node.id);
      const outs = pinVals.outputs || [];
      const anyHigh = outs.some((o) => o.value > 0);
      const rectEl = containerEl.querySelector(`[data-mini-node="${node.id}"]`);
      const valEl = containerEl.querySelector(`[data-mini-node-val="${node.id}"]`);
      if (rectEl) {
        const accent = rectEl.getAttribute('data-accent') || '#8aa';
        rectEl.setAttribute('fill', anyHigh ? '#1f2e3d' : '#17202a');
        rectEl.setAttribute('stroke', anyHigh ? accent : '#3e5368');
        rectEl.setAttribute('stroke-width', anyHigh ? '2.4' : '1.6');
      }
      if (valEl) {
        const summary = outs.map((o) => o.value).join(',');
        valEl.textContent = summary.length > 9 ? `OUT:${summary.slice(0, 8)}…` : `OUT: ${summary}`;
        valEl.setAttribute('fill', anyHigh ? '#72f2c8' : '#7b93ab');
      }
    }
  };

  applyStep(0);
  let timer = null;
  const badgeEl = badgeSelector ? containerEl.querySelector(badgeSelector) : null;
  let onBadgeClick = null;

  const startCycle = () => {
    if (timer) clearInterval(timer);
    if (steps.length > 1) {
      timer = setInterval(() => {
        stepIdx = (stepIdx + 1) % steps.length;
        applyStep(stepIdx);
      }, 1800);
    }
  };

  if (steps.length > 1) {
    startCycle();
    if (badgeEl) {
      badgeEl.classList.add('is-interactive');
      badgeEl.setAttribute('role', 'button');
      badgeEl.setAttribute('tabindex', '0');
      badgeEl.setAttribute('title', 'タップで次のテストパターンへ切替');
      onBadgeClick = (e) => {
        if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
        if (e.type === 'keydown') e.preventDefault();
        e.stopPropagation();
        stepIdx = (stepIdx + 1) % steps.length;
        applyStep(stepIdx);
        startCycle();
      };
      badgeEl.addEventListener('click', onBadgeClick);
      badgeEl.addEventListener('keydown', onBadgeClick);
    }
  }

  return {
    sim,
    stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      if (badgeEl && onBadgeClick) {
        badgeEl.removeEventListener('click', onBadgeClick);
        badgeEl.removeEventListener('keydown', onBadgeClick);
        badgeEl.classList.remove('is-interactive');
      }
    },
  };
}
