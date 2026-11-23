/**
 * SILICON GENESIS — Mobile-First Interactive Circuit Workbench Canvas
 *
 * Supports:
 *   - Tap-to-wire AND Drag-to-wire with generous touch hit areas (>=22px screen-space)
 *   - Tap-to-place chips from palette (with grid snap)
 *   - 1-finger chip dragging, 1-finger canvas pan, 2-finger pinch zoom, mouse wheel zoom
 *   - Fixed Left Input Switches & Right Output Lamps with live 4-bit decimal badges
 *   - Live glowing copper traces with flowing current pulses & oscillation sparks
 *   - Selection callbacks for mobile floating action pills (Duplicate / Inspect / Delete / Cut Wire)
 */

import { getChipDef } from '../engine/circuit.js';

const GRID = 16;
const BOARD_W = 760;
const RAIL_MARGIN = 12;
const RAIL_W = 92;
const LEFT_X = RAIL_MARGIN + RAIL_W / 2;       // 58 (switch box spans 12..104)
const RIGHT_X = BOARD_W - LEFT_X;              // 702 (lamp box spans 656..748)
const PIN_STUB = 14;                           // Clear copper stem separating body from circular socket
const RAIL_TRACK_W = RAIL_MARGIN + RAIL_W + 8; // 112 visual rail divider; pin pad pokes out at 118 / 642
const NODE_MIN_X = RAIL_TRACK_W + 30;          // 142 so node left pins (x - 14 = 128) stay clear of rail pins (118)

function snap(v) {
  return Math.round(v / GRID) * GRID;
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function evalCubic(p0, p1, p2, p3, t) {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;
  return {
    x: mt2 * mt * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t2 * t * p3.x,
    y: mt2 * mt * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t2 * t * p3.y,
  };
}

export class WorkbenchCanvas {
  constructor(canvas, callbacks = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cb = callbacks;

    this.stage = null;
    this.circuit = null;
    this.customChips = {};
    this.simulator = null;
    this.inputBits = [];
    this.boardH = 380;

    // Camera transform (screen = world * scale + offset)
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;

    // Interactive states
    this.armedChipType = null;
    this.pendingPin = null;       // { role: 'src'|'dst', endpoint, x, y }
    this.wireDragPos = null;      // current world pointer while dragging a wire
    this.selectedNodeId = null;
    this.selectedWireId = null;
    this.highlightTestPulse = 0;
    this.particles = [];

    // Pointer tracking (multi-touch ready)
    this.pointers = new Map();
    this.gesture = null;          // { kind: 'pan'|'dragNode'|'wire'|'pinch', ... }
    this.time = 0;
    this._raf = null;

    this._bindEvents();
  }

  setContext({ stage, circuit, customChips, simulator, inputBits, fit = false }) {
    const stageChanged = stage && stage !== this.stage;
    if (stage !== undefined) this.stage = stage;
    if (circuit !== undefined) this.circuit = circuit;
    if (customChips !== undefined) this.customChips = customChips;
    if (simulator !== undefined) this.simulator = simulator;
    if (inputBits !== undefined) this.inputBits = inputBits;

    if (this.stage) {
      this.boardH = Math.max(this.boardH, this._getMinBoardH());
    }

    if (stageChanged || fit) {
      this.pendingPin = null;
      this.wireDragPos = null;
      this.selectedNodeId = null;
      this.selectedWireId = null;
      this.armedChipType = null;
      this.fitToView();
      this._notifySelection();
    }
  }

  _getMinBoardH() {
    if (!this.stage) return 460;
    const maxPins = Math.max(this.stage.inputs.length, this.stage.outputs.length);
    return maxPins >= 8 ? 580 : maxPins >= 6 ? 500 : 460;
  }

  setArmedChip(chipType) {
    this.armedChipType = chipType;
    if (chipType) {
      this.pendingPin = null;
      this.selectedNodeId = null;
      this.selectedWireId = null;
    }
    this._notifySelection();
  }

  clearSelection() {
    this.selectedNodeId = null;
    this.selectedWireId = null;
    this.pendingPin = null;
    this.wireDragPos = null;
    this._notifySelection();
  }

  triggerTestFlash() {
    this.highlightTestPulse = 1.0;
  }

  spawnBurst(wx, wy, color = '#ffd166', count = 12) {
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const spd = 38 + Math.random() * 75;
      this.particles.push({
        x: wx,
        y: wy,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        life: 0.45 + Math.random() * 0.2,
        maxLife: 0.65,
        color,
        r: 2 + Math.random() * 2,
      });
    }
  }

  fitToView() {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width < 20 || rect.height < 20) return;
    const padX = 6;
    const padY = 6;
    const sx = (rect.width - padX * 2) / BOARD_W;
    const minH = this._getMinBoardH();
    // On portrait mobile screens, expand boardH vertically so the PCB fills the entire workbench height!
    const portraitWorldH = sx > 0 ? Math.floor((rect.height - padY * 2) / sx) : minH;
    let maxNodeBottom = 0;
    for (const n of this.circuit?.nodes || []) {
      const dim = this.getChipDimensions(n.type);
      maxNodeBottom = Math.max(maxNodeBottom, n.y + dim.h + 24);
    }
    this.boardH = clamp(Math.max(minH, portraitWorldH, maxNodeBottom), minH, 1120);

    const sy = (rect.height - padY * 2) / this.boardH;
    this.scale = clamp(Math.min(sx, sy), 0.34, 2.4);
    this.offsetX = (rect.width - BOARD_W * this.scale) / 2;
    this.offsetY = (rect.height - this.boardH * this.scale) / 2;
  }

  zoomBy(factor) {
    const rect = this.canvas.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const nextScale = clamp(this.scale * factor, 0.34, 2.5);
    const wx = (cx - this.offsetX) / this.scale;
    const wy = (cy - this.offsetY) / this.scale;
    this.scale = nextScale;
    this.offsetX = cx - wx * this.scale;
    this.offsetY = cy - wy * this.scale;
  }

  /** Finds a clean unoccupied board position for auto-placing a chip. */
  findOpenSpot(chipType) {
    const dim = this.getChipDimensions(chipType);
    const midX = BOARD_W / 2;
    const minX = NODE_MIN_X;
    const maxX = Math.max(minX, BOARD_W - NODE_MIN_X - dim.w);
    const minY = this.boardH >= 640 ? 96 : 64;
    const maxY = Math.max(minY, this.boardH - dim.h - 48);
    const cols = [midX - 150, midX - 50, midX + 50, midX + 150, midX - 100, midX, midX + 100];
    const rows = [
      this.boardH * 0.34,
      this.boardH * 0.50,
      this.boardH * 0.66,
      this.boardH * 0.24,
      this.boardH * 0.42,
      this.boardH * 0.58,
      this.boardH * 0.74,
      this.boardH * 0.82,
    ];
    for (const ry of rows) {
      for (const cx of cols) {
        const x = snap(clamp(cx - dim.w / 2, minX, maxX));
        const y = snap(clamp(ry - dim.h / 2, minY, maxY));
        const overlaps = (this.circuit?.nodes || []).some((n) => {
          const nd = this.getChipDimensions(n.type);
          return Math.abs(n.x - x) < (dim.w + nd.w) * 0.52 && Math.abs(n.y - y) < (dim.h + nd.h) * 0.52;
        });
        if (!overlaps) return { x, y };
      }
    }
    return {
      x: snap(clamp(BOARD_W / 2 - dim.w / 2 + ((Math.random() * 64) | 0) - 32, minX, maxX)),
      y: snap(clamp(this.boardH / 2 - dim.h / 2 + ((Math.random() * 64) | 0) - 32, minY, maxY)),
    };
  }

  getChipDimensions(type) {
    const def = getChipDef(type, this.customChips);
    if (!def) return { w: 84, h: 56, pinStep: 28 };
    if (type === 'SW') return { w: 102, h: 66, pinStep: 28 };
    if (type === 'PULL') return { w: 96, h: 62, pinStep: 28 };
    if (type === 'CONST_1' || type === 'CONST_0') return { w: 78, h: 50, pinStep: 24 };
    const maxPins = Math.max(def.inputs.length, def.outputs.length, 1);
    const pinStep = maxPins >= 8 ? 22 : maxPins >= 5 ? 25 : 28;
    const h = Math.max(56, maxPins * pinStep + 22);
    const labelLen = Math.max((def.name || type).length, 4);
    const w = maxPins >= 6 ? 104 : Math.max(84, Math.round(labelLen * 10 + 34));
    return { w, h, pinStep };
  }

  _getRailMetrics(n) {
    const count = Math.max(1, n || 1);
    const hasGroups = Boolean(
      this.stage?.pinGroups?.inputs?.length || this.stage?.pinGroups?.outputs?.length
    );
    const topMargin = this.boardH >= 640 ? 96 : 74;
    const bottomMargin = this.boardH >= 640 ? 74 : 38;
    const avail = Math.max(120, this.boardH - topMargin - bottomMargin);
    const idealStep = count <= 2 ? 168 : count <= 4 ? 136 : count <= 6 ? 108 : count <= 8 ? 88 : 78;
    const totalSpan = count <= 1 ? 0 : Math.min(avail, (count - 1) * idealStep);
    const step = count <= 1 ? avail : totalSpan / (count - 1);
    const centerY = topMargin + avail / 2;
    const startY = count <= 1 ? centerY : centerY - totalSpan / 2;

    const preferredH = count <= 4 ? 64 : count <= 6 ? 54 : count <= 8 ? 46 : 40;
    const minGap = hasGroups ? 22 : 12;
    const maxSafeH = count <= 1 ? preferredH : Math.max(30, Math.floor(step - minGap));
    const boxH = clamp(Math.min(preferredH, maxSafeH), 30, 64);

    return { startY, step, boxH };
  }

  _getInputRailPos(idx) {
    const n = this.stage?.inputs.length || 1;
    const { startY, step, boxH } = this._getRailMetrics(n);
    const y = n <= 1 ? startY : startY + idx * step;
    const boxX = LEFT_X - RAIL_W / 2;
    return {
      boxX,
      boxY: y - boxH / 2,
      boxW: RAIL_W,
      boxH,
      step,
      pinX: boxX + RAIL_W + PIN_STUB,
      pinY: y,
    };
  }

  _getOutputRailPos(idx) {
    const n = this.stage?.outputs.length || 1;
    const { startY, step, boxH } = this._getRailMetrics(n);
    const y = n <= 1 ? startY : startY + idx * step;
    const boxX = RIGHT_X - RAIL_W / 2;
    return {
      boxX,
      boxY: y - boxH / 2,
      boxW: RAIL_W,
      boxH,
      step,
      pinX: boxX - PIN_STUB,
      pinY: y,
    };
  }

  _getNodePinPos(node, side, pinIdx) {
    const def = getChipDef(node.type, this.customChips);
    const dim = this.getChipDimensions(node.type);
    const pins = side === 'in' ? (def?.inputs || []) : (def?.outputs || []);
    const n = pins.length;
    const bodyTop = node.y + 20;
    const bodyH = Math.max(24, dim.h - 20);
    const totalH = (n - 1) * dim.pinStep;
    const startY = bodyTop + bodyH / 2 - totalH / 2;
    const y = n <= 1 ? bodyTop + bodyH / 2 : startY + pinIdx * dim.pinStep;
    const x = side === 'in' ? node.x - PIN_STUB : node.x + dim.w + PIN_STUB;
    return { x, y };
  }

  _getEndpointPos(ep) {
    if (ep.kind === 'input') {
      const r = this._getInputRailPos(ep.pin);
      return { x: r.pinX, y: r.pinY };
    }
    if (ep.kind === 'output') {
      const r = this._getOutputRailPos(ep.pin);
      return { x: r.pinX, y: r.pinY };
    }
    if (ep.kind === 'node') {
      const node = this.circuit?.nodes.find((n) => n.id === ep.nodeId);
      if (!node) return null;
      return this._getNodePinPos(node, ep._side || 'out', ep.pin);
    }
    return null;
  }

  _getWireCurve(wire) {
    const fromPos = this._getEndpointPos({ ...wire.from, _side: 'out' });
    const toPos = this._getEndpointPos({ ...wire.to, _side: 'in' });
    if (!fromPos || !toPos) return null;
    const dx = toPos.x - fromPos.x;
    // Feedback loop (wire going right-to-left) arches smoothly outward so it's super readable!
    if (dx < 24) {
      const loopSpan = clamp(Math.abs(dx) * 0.45 + 56, 56, 145);
      const bendY = fromPos.y < this.boardH / 2 ? -36 : 36;
      return {
        p0: fromPos,
        p1: { x: fromPos.x + loopSpan, y: fromPos.y + bendY },
        p2: { x: toPos.x - loopSpan, y: toPos.y + bendY },
        p3: toPos,
      };
    }
    const ctrl = clamp(dx * 0.45, 32, 130);
    return {
      p0: fromPos,
      p1: { x: fromPos.x + ctrl, y: fromPos.y },
      p2: { x: toPos.x - ctrl, y: toPos.y },
      p3: toPos,
    };
  }

  _screenToWorld(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    return {
      x: (sx - this.offsetX) / this.scale,
      y: (sy - this.offsetY) / this.scale,
      sx,
      sy,
    };
  }

  /** Collects all interactive pins for hit testing and highlighting. */
  _allPins() {
    const pins = [];
    if (!this.stage || !this.circuit) return pins;

    // External inputs act as signal SOURCES ('src')
    for (let i = 0; i < this.stage.inputs.length; i++) {
      const r = this._getInputRailPos(i);
      pins.push({
        role: 'src',
        endpoint: { kind: 'input', pin: i },
        x: r.pinX,
        y: r.pinY,
        label: this.stage.inputs[i],
      });
    }
    // External outputs act as signal DESTINATIONS ('dst')
    for (let i = 0; i < this.stage.outputs.length; i++) {
      const r = this._getOutputRailPos(i);
      pins.push({
        role: 'dst',
        endpoint: { kind: 'output', pin: i },
        x: r.pinX,
        y: r.pinY,
        label: this.stage.outputs[i],
      });
    }
    // Node pins
    for (const node of this.circuit.nodes) {
      const def = getChipDef(node.type, this.customChips);
      if (!def) continue;
      def.inputs.forEach((lbl, idx) => {
        const p = this._getNodePinPos(node, 'in', idx);
        pins.push({
          role: 'dst',
          endpoint: { kind: 'node', nodeId: node.id, pin: idx },
          x: p.x,
          y: p.y,
          label: lbl,
        });
      });
      def.outputs.forEach((lbl, idx) => {
        const p = this._getNodePinPos(node, 'out', idx);
        pins.push({
          role: 'src',
          endpoint: { kind: 'node', nodeId: node.id, pin: idx },
          x: p.x,
          y: p.y,
          label: lbl,
        });
      });
    }
    return pins;
  }

  _hitTestPin(wx, wy, filterRole = null, { dropGenerous = false } = {}) {
    // Clamp world radius so pins stay easy to hit on mobile WITHOUT swallowing chip bodies or input buttons!
    const hitR = dropGenerous
      ? clamp(28 / this.scale, 24, 44)
      : clamp(21 / this.scale, 18, 30);
    let best = null;
    let bestDist = hitR;
    for (const pin of this._allPins()) {
      if (filterRole && pin.role !== filterRole) continue;
      const d = Math.hypot(pin.x - wx, pin.y - wy);
      if (d < bestDist) {
        bestDist = d;
        best = pin;
      }
    }
    return best;
  }

  _hitTestInputSwitch(wx, wy) {
    if (!this.stage) return -1;
    const n = this.stage.inputs.length;
    for (let i = 0; i < n; i++) {
      const r = this._getInputRailPos(i);
      // Generous non-overlapping vertical touch padding + full left-edge reach!
      const halfGap = n <= 1 ? 22 : Math.max(4, Math.floor((r.step - r.boxH) / 2) - 1);
      const padY = Math.min(20, halfGap);
      if (wx >= 0 && wx <= r.boxX + r.boxW + 2 && wy >= r.boxY - padY && wy <= r.boxY + r.boxH + padY) {
        return i;
      }
    }
    return -1;
  }

  _hitTestOutputLamp(wx, wy) {
    if (!this.stage) return -1;
    const n = this.stage.outputs.length;
    for (let i = 0; i < n; i++) {
      const r = this._getOutputRailPos(i);
      const halfGap = n <= 1 ? 22 : Math.max(4, Math.floor((r.step - r.boxH) / 2) - 1);
      const padY = Math.min(20, halfGap);
      if (wx >= r.boxX - 2 && wx <= BOARD_W && wy >= r.boxY - padY && wy <= r.boxY + r.boxH + padY) {
        return i;
      }
    }
    return -1;
  }

  _hitTestNode(wx, wy) {
    if (!this.circuit) return null;
    for (let i = this.circuit.nodes.length - 1; i >= 0; i--) {
      const node = this.circuit.nodes[i];
      const dim = this.getChipDimensions(node.type);
      // Exact chip interior body (+2px top/bottom comfort); pins sit outside at +/- PIN_STUB (14px)!
      if (wx >= node.x - 1 && wx <= node.x + dim.w + 1 && wy >= node.y - 2 && wy <= node.y + dim.h + 2) {
        return node;
      }
    }
    return null;
  }

  _hitTestWire(wx, wy) {
    if (!this.circuit) return null;
    const tol = clamp(15 / this.scale, 12, 22);
    let best = null;
    let bestDist = tol;
    for (const wire of this.circuit.wires) {
      const curve = this._getWireCurve(wire);
      if (!curve) continue;
      for (let s = 1; s < 16; s++) {
        const pt = evalCubic(curve.p0, curve.p1, curve.p2, curve.p3, s / 16);
        const d = Math.hypot(pt.x - wx, pt.y - wy);
        if (d < bestDist) {
          bestDist = d;
          best = wire;
        }
      }
    }
    return best;
  }

  _tryCompleteWire(pinA, pinB) {
    if (!pinA || !pinB || pinA.role === pinB.role) return false;
    const src = pinA.role === 'src' ? pinA.endpoint : pinB.endpoint;
    const dst = pinA.role === 'dst' ? pinA.endpoint : pinB.endpoint;
    const dstPos = pinA.role === 'dst' ? pinA : pinB;
    if (dstPos && typeof dstPos.x === 'number') {
      this.spawnBurst(dstPos.x, dstPos.y, '#52e3b6', 10);
    }
    this.pendingPin = null;
    this.wireDragPos = null;
    this.cb.onConnectWire?.(src, dst);
    return true;
  }

  _notifySelection() {
    this.cb.onSelectionChange?.({
      nodeId: this.selectedNodeId,
      wireId: this.selectedWireId,
      pendingPin: this.pendingPin,
      armedChipType: this.armedChipType,
    });
  }

  _bindEvents() {
    const el = this.canvas;

    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      el.setPointerCapture?.(e.pointerId);
      const pt = this._screenToWorld(e.clientX, e.clientY);
      this.pointers.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });

      // Two-finger pinch zoom
      if (this.pointers.size === 2) {
        const [p1, p2] = Array.from(this.pointers.values());
        const rect = el.getBoundingClientRect();
        this.gesture = {
          kind: 'pinch',
          startDist: Math.hypot(p2.clientX - p1.clientX, p2.clientY - p1.clientY) || 1,
          startScale: this.scale,
          midX: (p1.clientX + p2.clientX) / 2 - rect.left,
          midY: (p1.clientY + p2.clientY) / 2 - rect.top,
          startOffsetX: this.offsetX,
          startOffsetY: this.offsetY,
        };
        this.wireDragPos = null;
        return;
      }

      // 1. Armed chip placement
      if (this.armedChipType) {
        const dim = this.getChipDimensions(this.armedChipType);
        const minX = NODE_MIN_X;
        const maxX = Math.max(minX, BOARD_W - NODE_MIN_X - dim.w);
        const minY = this.boardH >= 640 ? 84 : 52;
        const x = snap(clamp(pt.x - dim.w / 2, minX, maxX));
        const y = snap(clamp(pt.y - dim.h / 2, minY, this.boardH - dim.h - 20));
        const type = this.armedChipType;
        this.armedChipType = null;
        this.cb.onPlaceChip?.(type, x, y);
        this._notifySelection();
        return;
      }

      // 2. If already in Tap-to-Wire mode, prioritize completing onto a compatible target pin (or rail switch/lamp!)
      if (this.pendingPin) {
        const neededRole = this.pendingPin.role === 'src' ? 'dst' : 'src';
        const targetPin = this._hitTestPin(pt.x, pt.y, neededRole, { dropGenerous: true });
        if (targetPin) {
          this._tryCompleteWire(this.pendingPin, targetPin);
          this._notifySelection();
          return;
        }
        // Convenience: tapping anywhere on the output lamp or input switch body while wiring completes it!
        if (neededRole === 'dst') {
          const outIdx = this._hitTestOutputLamp(pt.x, pt.y);
          if (outIdx >= 0) {
            const r = this._getOutputRailPos(outIdx);
            this._tryCompleteWire(this.pendingPin, {
              role: 'dst',
              endpoint: { kind: 'output', pin: outIdx },
              x: r.pinX,
              y: r.pinY,
            });
            this._notifySelection();
            return;
          }
        } else {
          const inIdx = this._hitTestInputSwitch(pt.x, pt.y);
          if (inIdx >= 0) {
            const r = this._getInputRailPos(inIdx);
            this._tryCompleteWire(this.pendingPin, {
              role: 'src',
              endpoint: { kind: 'input', pin: inIdx },
              x: r.pinX,
              y: r.pinY,
            });
            this._notifySelection();
            return;
          }
        }
      }

      // 3. Input toggle switch body FIRST -> tapping the switch pill ALWAYS toggles 0<->1, never hijacked by pin hitbox!
      const inIdx = this._hitTestInputSwitch(pt.x, pt.y);
      if (inIdx >= 0) {
        this.pendingPin = null;
        this.selectedNodeId = null;
        this.selectedWireId = null;
        this.cb.onToggleInput?.(inIdx);
        this._notifySelection();
        return;
      }

      // 4. Placed chip body SECOND -> touching inside a module ALWAYS selects & moves it (never stolen by pins or underlying wires!)
      const node = this._hitTestNode(pt.x, pt.y);
      if (node) {
        this.pendingPin = null;
        this.selectedWireId = null;
        this.selectedNodeId = node.id;
        this.gesture = {
          kind: 'dragNode',
          nodeId: node.id,
          origX: node.x,
          origY: node.y,
          startWX: pt.x,
          startWY: pt.y,
          moved: false,
        };
        this.cb.onGrabChip?.(node.id);
        this._notifySelection();
        return;
      }

      // 5. Pin socket hit test -> starts both tap-to-wire AND drag-to-wire cleanly from protruding copper pads
      const hitPin = this._hitTestPin(pt.x, pt.y);
      if (hitPin) {
        this.selectedNodeId = null;
        this.selectedWireId = null;
        this.gesture = {
          kind: 'wire',
          startPin: hitPin,
          startX: e.clientX,
          startY: e.clientY,
          moved: false,
        };
        this.wireDragPos = { x: pt.x, y: pt.y };
        return;
      }

      // 6. Output lamp body -> start wiring from output pin
      const outIdx = this._hitTestOutputLamp(pt.x, pt.y);
      if (outIdx >= 0) {
        const r = this._getOutputRailPos(outIdx);
        const lampPin = { role: 'dst', endpoint: { kind: 'output', pin: outIdx }, x: r.pinX, y: r.pinY };
        this.selectedNodeId = null;
        this.selectedWireId = null;
        this.gesture = {
          kind: 'wire',
          startPin: lampPin,
          startX: e.clientX,
          startY: e.clientY,
          moved: false,
        };
        this.wireDragPos = { x: pt.x, y: pt.y };
        return;
      }

      // 7. Wire hit test (strictly BEHIND chips & pins) -> select (or tap again to snip!)
      const wire = this._hitTestWire(pt.x, pt.y);
      if (wire) {
        this.pendingPin = null;
        this.selectedNodeId = null;
        if (this.selectedWireId === wire.id) {
          this.selectedWireId = null;
          this.cb.onDeleteWire?.(wire.id);
        } else {
          this.selectedWireId = wire.id;
        }
        this._notifySelection();
        return;
      }

      // 8. Empty space -> pan camera (and clear pending wire/selection on simple tap)
      this.gesture = {
        kind: 'pan',
        startX: e.clientX,
        startY: e.clientY,
        origOffsetX: this.offsetX,
        origOffsetY: this.offsetY,
        moved: false,
      };
    });

    el.addEventListener('pointermove', (e) => {
      if (!this.pointers.has(e.pointerId)) return;
      this.pointers.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });

      if (!this.gesture) return;

      if (this.gesture.kind === 'pinch' && this.pointers.size === 2) {
        const [p1, p2] = Array.from(this.pointers.values());
        const dist = Math.hypot(p2.clientX - p1.clientX, p2.clientY - p1.clientY) || 1;
        const nextScale = clamp(this.gesture.startScale * (dist / this.gesture.startDist), 0.36, 2.5);
        const worldMidX = (this.gesture.midX - this.gesture.startOffsetX) / this.gesture.startScale;
        const worldMidY = (this.gesture.midY - this.gesture.startOffsetY) / this.gesture.startScale;
        this.scale = nextScale;
        this.offsetX = this.gesture.midX - worldMidX * this.scale;
        this.offsetY = this.gesture.midY - worldMidY * this.scale;
        return;
      }

      const pt = this._screenToWorld(e.clientX, e.clientY);

      if (this.gesture.kind === 'wire') {
        if (Math.hypot(e.clientX - this.gesture.startX, e.clientY - this.gesture.startY) > 10) {
          this.gesture.moved = true;
        }
        this.wireDragPos = { x: pt.x, y: pt.y };
        return;
      }

      if (this.gesture.kind === 'dragNode') {
        const dx = pt.x - this.gesture.startWX;
        const dy = pt.y - this.gesture.startWY;
        if (Math.hypot(dx, dy) > 4) this.gesture.moved = true;
        const node = this.circuit?.nodes.find((n) => n.id === this.gesture.nodeId);
        if (node) {
          const dim = this.getChipDimensions(node.type);
          const minX = NODE_MIN_X;
          const maxX = Math.max(minX, BOARD_W - NODE_MIN_X - dim.w);
          const minY = this.boardH >= 640 ? 78 : 48;
          // Smooth continuous drag while moving; snaps crisply to grid on pointer release!
          node.x = clamp(this.gesture.origX + dx, minX, maxX);
          node.y = clamp(this.gesture.origY + dy, minY, this.boardH - dim.h - 16);
        }
        return;
      }

      if (this.gesture.kind === 'pan') {
        const dx = e.clientX - this.gesture.startX;
        const dy = e.clientY - this.gesture.startY;
        if (Math.hypot(dx, dy) > 6) this.gesture.moved = true;
        this.offsetX = this.gesture.origOffsetX + dx;
        this.offsetY = this.gesture.origOffsetY + dy;
      }
    });

    const endPointer = (e) => {
      const wasGesture = this.gesture;
      this.pointers.delete(e.pointerId);

      if (wasGesture?.kind === 'wire') {
        const pt = this._screenToWorld(e.clientX, e.clientY);
        const neededRole = wasGesture.startPin.role === 'src' ? 'dst' : 'src';
        let dropPin = this._hitTestPin(pt.x, pt.y, neededRole, { dropGenerous: true });
        // Also allow dropping a dragged wire straight onto an Output Lamp or Input Switch body!
        if (!dropPin && wasGesture.moved) {
          if (neededRole === 'dst') {
            const outIdx = this._hitTestOutputLamp(pt.x, pt.y);
            if (outIdx >= 0) {
              const r = this._getOutputRailPos(outIdx);
              dropPin = { role: 'dst', endpoint: { kind: 'output', pin: outIdx }, x: r.pinX, y: r.pinY };
            }
          } else {
            const inIdx = this._hitTestInputSwitch(pt.x, pt.y);
            if (inIdx >= 0) {
              const r = this._getInputRailPos(inIdx);
              dropPin = { role: 'src', endpoint: { kind: 'input', pin: inIdx }, x: r.pinX, y: r.pinY };
            }
          }
        }
        if (wasGesture.moved && dropPin) {
          this._tryCompleteWire(wasGesture.startPin, dropPin);
        } else if (!wasGesture.moved) {
          // Quick tap on a pin toggles Tap-to-Wire mode!
          if (
            this.pendingPin &&
            this.pendingPin.x === wasGesture.startPin.x &&
            this.pendingPin.y === wasGesture.startPin.y
          ) {
            this.pendingPin = null;
          } else {
            this.pendingPin = wasGesture.startPin;
          }
        } else {
          this.pendingPin = null;
        }
        this.wireDragPos = null;
        this._notifySelection();
      } else if (wasGesture?.kind === 'dragNode' && wasGesture.moved) {
        const node = this.circuit?.nodes.find((n) => n.id === wasGesture.nodeId);
        if (node) {
          const dim = this.getChipDimensions(node.type);
          const minX = NODE_MIN_X;
          const maxX = Math.max(minX, BOARD_W - NODE_MIN_X - dim.w);
          const minY = this.boardH >= 640 ? 78 : 48;
          node.x = snap(clamp(node.x, minX, maxX));
          node.y = snap(clamp(node.y, minY, this.boardH - dim.h - 16));
          this.cb.onMoveChip?.(node.id, node.x, node.y);
        }
      } else if (wasGesture?.kind === 'pan' && !wasGesture.moved) {
        if (this.pendingPin || this.selectedNodeId || this.selectedWireId) {
          this.pendingPin = null;
          this.selectedNodeId = null;
          this.selectedWireId = null;
          this._notifySelection();
        }
      }

      if (this.pointers.size === 0) {
        this.gesture = null;
      }
    };

    el.addEventListener('pointerup', endPointer);
    el.addEventListener('pointercancel', endPointer);

    // Desktop scroll-wheel zoom
    el.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const rect = el.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const factor = e.deltaY < 0 ? 1.12 : 0.89;
        const nextScale = clamp(this.scale * factor, 0.42, 2.5);
        const wx = (mx - this.offsetX) / this.scale;
        const wy = (my - this.offsetY) / this.scale;
        this.scale = nextScale;
        this.offsetX = mx - wx * this.scale;
        this.offsetY = my - wy * this.scale;
      },
      { passive: false }
    );
  }

  start() {
    if (this._raf) return;
    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      this.time += dt;
      if (this.highlightTestPulse > 0) {
        this.highlightTestPulse = Math.max(0, this.highlightTestPulse - dt * 1.8);
      }
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.92;
        p.vy *= 0.92;
        p.life -= dt;
        if (p.life <= 0) this.particles.splice(i, 1);
      }
      this.render();
      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  }

  stop() {
    if (this._raf) {
      cancelAnimationFrame(this._raf);
      this._raf = null;
    }
  }

  _resizeIfNeeded() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
      this.fitToView();
    }
    return { w: rect.width, h: rect.height, dpr };
  }

  render() {
    const { w, h, dpr } = this._resizeIfNeeded();
    if (w < 10 || h < 10) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.scale(dpr, dpr);

    // Outer recessed dark steel chassis
    ctx.fillStyle = '#0d131a';
    ctx.fillRect(0, 0, w, h);

    if (!this.stage || !this.circuit) {
      ctx.restore();
      return;
    }

    // Apply camera transform
    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);

    this._drawBoardFrame(ctx);
    this._drawPinGroupBadges(ctx);
    this._drawWires(ctx);
    this._drawLiveWirePreview(ctx);
    this._drawInputRail(ctx);
    this._drawOutputRail(ctx);
    this._drawNodes(ctx);
    this._drawWiringTargetHighlights(ctx);
    this._drawParticles(ctx);

    ctx.restore();

    // Subtle status pill at top-center of workbench if armed / dragging / wiring
    if (this.armedChipType) {
      const def = getChipDef(this.armedChipType, this.customChips);
      const hint = def?.shortRuleJa ? `｜${def.shortRuleJa}` : '';
      this._drawCanvasBanner(ctx, w, `＋ [${def?.name || this.armedChipType}] 置く場所をタップ${hint}`, '#ffb347');
    } else if (this.gesture?.kind === 'dragNode' && this.gesture.moved) {
      this._drawCanvasBanner(ctx, w, '✋ モジュールを移動中（指を離すと配置）', '#ffd166');
    } else if (this.pendingPin) {
      const msg =
        this.pendingPin.role === 'src'
          ? '⚡ 接続先の「入力ピン（丸印）」をタップ'
          : '⚡ 接続元の「出力ピン（丸印）」をタップ';
      this._drawCanvasBanner(ctx, w, msg, '#52e3b6');
    } else if (this.simulator?.unstable) {
      this._drawCanvasBanner(ctx, w, '⚠ 信号が無限ループ（発振）しています！', '#ff6b6b');
    }

    ctx.restore();
  }

  _drawCanvasBanner(ctx, w, text, accent) {
    ctx.save();
    ctx.font = 'bold 11.5px -apple-system, BlinkMacSystemFont, "Hiragino Sans", sans-serif';
    const tw = Math.min(w - 20, ctx.measureText(text).width + 24);
    const x = (w - tw) / 2;
    const y = 46;
    ctx.fillStyle = 'rgba(12, 18, 25, 0.94)';
    this._roundRect(ctx, x, y, tw, 26, 13);
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = accent;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, y + 13.5, tw - 16);
    ctx.restore();
  }

  _drawBoardFrame(ctx) {
    // PCB dark emerald-slate surface
    ctx.fillStyle = '#111a22';
    this._roundRect(ctx, 4, 4, BOARD_W - 8, this.boardH - 8, 12);
    ctx.fill();

    // Subtle vintage PCB copper trace artwork + brass corner mounting rivets
    ctx.strokeStyle = 'rgba(184, 138, 72, 0.07)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(124, 34);
    ctx.lineTo(186, 34);
    ctx.lineTo(206, 54);
    ctx.moveTo(536, this.boardH - 34);
    ctx.lineTo(464, this.boardH - 34);
    ctx.lineTo(444, this.boardH - 54);
    ctx.stroke();

    const rivets = [
      [14, 14],
      [BOARD_W - 14, 14],
      [14, this.boardH - 14],
      [BOARD_W - 14, this.boardH - 14],
    ];
    for (const [rx, ry] of rivets) {
      ctx.beginPath();
      ctx.arc(rx, ry, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#2a3642';
      ctx.fill();
      ctx.strokeStyle = 'rgba(184, 138, 72, 0.45)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Subtle solder-dot grid
    ctx.fillStyle = 'rgba(130, 165, 195, 0.14)';
    for (let x = RAIL_TRACK_W + 14; x <= BOARD_W - RAIL_TRACK_W - 14; x += GRID * 2) {
      for (let y = 24; y <= this.boardH - 20; y += GRID * 2) {
        ctx.fillRect(x - 1, y - 1, 2, 2);
      }
    }

    // Left / Right rail separation tracks
    ctx.fillStyle = 'rgba(8, 13, 18, 0.55)';
    ctx.fillRect(8, 10, RAIL_TRACK_W - 8, this.boardH - 20);
    ctx.fillRect(BOARD_W - RAIL_TRACK_W, 10, RAIL_TRACK_W - 8, this.boardH - 20);

    ctx.strokeStyle = 'rgba(220, 160, 75, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(RAIL_TRACK_W, 12);
    ctx.lineTo(RAIL_TRACK_W, this.boardH - 12);
    ctx.moveTo(BOARD_W - RAIL_TRACK_W, 12);
    ctx.lineTo(BOARD_W - RAIL_TRACK_W, this.boardH - 12);
    ctx.stroke();

    // Rail headers (positioned cleanly above first pin or tucked cleanly at bottom when tightly packed)
    const firstInY = this._getInputRailPos(0).boxY;
    const firstOutY = this._getOutputRailPos(0).boxY;
    const hasInGroup = Boolean(this.stage?.pinGroups?.inputs?.length);
    const hasOutGroup = Boolean(this.stage?.pinGroups?.outputs?.length);
    const inHeaderY = firstInY - (hasInGroup ? 28 : 14);
    const outHeaderY = firstOutY - (hasOutGroup ? 28 : 14);
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(235, 182, 102, 0.72)';
    ctx.fillText('INPUT (タップ切替)', LEFT_X, inHeaderY >= 86 ? inHeaderY : this.boardH - 18, RAIL_W + 6);
    ctx.fillStyle = 'rgba(82, 227, 182, 0.75)';
    ctx.fillText('OUTPUT', RIGHT_X, outHeaderY >= 32 ? outHeaderY : this.boardH - 18);

    // Outer riveted border
    ctx.strokeStyle =
      this.highlightTestPulse > 0
        ? `rgba(82, 227, 182, ${0.4 + this.highlightTestPulse * 0.6})`
        : 'rgba(180, 145, 95, 0.35)';
    ctx.lineWidth = 2;
    this._roundRect(ctx, 4, 4, BOARD_W - 8, this.boardH - 8, 12);
    ctx.stroke();

    // Empty workbench hint for complete beginners
    if (this.circuit.nodes.length === 0 && !this.armedChipType) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(175, 198, 218, 0.34)';
      ctx.font = 'bold 14.5px -apple-system, BlinkMacSystemFont, "Hiragino Sans", sans-serif';
      ctx.fillText('下のパレットから部品をタップして配置', BOARD_W / 2, this.boardH / 2 - 14);
      ctx.font = '12.5px -apple-system, BlinkMacSystemFont, "Hiragino Sans", sans-serif';
      ctx.fillText('部品の本体ドラッグで移動 ／ 丸ピン同士で配線！', BOARD_W / 2, this.boardH / 2 + 12);
      ctx.restore();
    }
  }

  _drawPinGroupBadges(ctx) {
    const groups = this.stage?.pinGroups;
    if (!groups) return;

    const drawGroups = (list, side) => {
      if (!list) return;
      for (const g of list) {
        const firstIdx = g.indices[0];
        const lastIdx = g.indices[g.indices.length - 1];
        const p0 = side === 'in' ? this._getInputRailPos(firstIdx) : this._getOutputRailPos(firstIdx);
        const p1 = side === 'in' ? this._getInputRailPos(lastIdx) : this._getOutputRailPos(lastIdx);
        const bits = side === 'in' ? this.inputBits : (this.simulator ? this.simulator.getOutputs() : []);
        let val = 0;
        g.indices.forEach((pinIdx, bitPos) => {
          if (bits[pinIdx]) val |= 1 << bitPos;
        });

        const bx = side === 'in' ? 6 : BOARD_W - 6;
        ctx.save();
        ctx.strokeStyle = side === 'in' ? 'rgba(255, 179, 71, 0.6)' : 'rgba(82, 227, 182, 0.62)';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(bx + (side === 'in' ? 5 : -5), p0.boxY + 5);
        ctx.lineTo(bx, p0.boxY + 5);
        ctx.lineTo(bx, p1.boxY + p1.boxH - 5);
        ctx.lineTo(bx + (side === 'in' ? 5 : -5), p1.boxY + p1.boxH - 5);
        ctx.stroke();

        // Compact crisp decimal readout pill directly above the group
        const badgeText = `${g.label}=${val}`;
        ctx.font = 'bold 11px monospace';
        const bw = ctx.measureText(badgeText).width + 10;
        const rx = side === 'in' ? RAIL_MARGIN : BOARD_W - RAIL_MARGIN - bw;
        const ry = p0.boxY - 19;
        ctx.fillStyle = 'rgba(13, 21, 29, 0.94)';
        this._roundRect(ctx, rx, ry, bw, 16, 5);
        ctx.fill();
        ctx.strokeStyle = side === 'in' ? 'rgba(255, 179, 71, 0.7)' : 'rgba(82, 227, 182, 0.7)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.fillStyle = side === 'in' ? '#ffd166' : '#52e3b6';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(badgeText, rx + bw / 2, ry + 8.5);
        ctx.restore();
      }
    };

    drawGroups(groups.inputs, 'in');
    drawGroups(groups.outputs, 'out');
  }

  _drawInputRail(ctx) {
    const outputs = this.inputBits;
    this.stage.inputs.forEach((label, idx) => {
      const r = this._getInputRailPos(idx);
      const on = Boolean(outputs[idx]);
      const isClk = label === 'CLK';
      const tall = r.boxH >= 50;

      ctx.save();
      // Tactile button drop shadow so it looks unmistakably pressable!
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      this._roundRect(ctx, r.boxX, r.boxY + 3, r.boxW, r.boxH, 10);
      ctx.fill();

      // Switch casing
      if (on) {
        ctx.shadowColor = isClk ? 'rgba(208, 155, 255, 0.42)' : 'rgba(255, 184, 77, 0.45)';
        ctx.shadowBlur = 10;
      }
      ctx.fillStyle = on ? (isClk ? '#442b62' : '#4a3312') : '#1c2836';
      this._roundRect(ctx, r.boxX, r.boxY, r.boxW, r.boxH, 10);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Subtle top inner bevel highlight
      ctx.fillStyle = on ? 'rgba(255, 240, 200, 0.12)' : 'rgba(255, 255, 255, 0.06)';
      this._roundRect(ctx, r.boxX + 2, r.boxY + 2, r.boxW - 4, Math.min(14, r.boxH * 0.34), 8);
      ctx.fill();

      // Crisp outer border around the full switch casing
      ctx.strokeStyle = on ? (isClk ? '#d8a8ff' : '#ffc15e') : '#50677f';
      ctx.lineWidth = on ? 2.4 : 1.8;
      this._roundRect(ctx, r.boxX, r.boxY, r.boxW, r.boxH, 10);
      ctx.stroke();

      // Label (large, legible even when zoomed out on mobile!)
      const labelFont = tall ? 14 : 12.5;
      ctx.font = `bold ${labelFont}px monospace`;
      ctx.fillStyle = on ? '#fff5dc' : '#c3d5e6';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, r.boxX + 9, r.pinY, r.boxW - 49);

      // Tactile visual toggle pill (ON=1 / OFF=0) inside the right half of the switch button
      const pillW = 34;
      const pillH = tall ? 22 : 18;
      const pillX = r.boxX + r.boxW - pillW - 6;
      const pillY = r.pinY - pillH / 2;
      ctx.fillStyle = on ? (isClk ? '#7b48b5' : '#b86d14') : '#101821';
      this._roundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
      ctx.fill();
      ctx.strokeStyle = on ? (isClk ? '#e4c4ff' : '#ffd98a') : '#3c5064';
      ctx.lineWidth = 1.4;
      ctx.stroke();

      // Sliding thumb dot + crisp 0/1 digit
      const thumbR = Math.max(5.5, pillH / 2 - 3.5);
      const thumbX = on ? pillX + pillW - thumbR - 3 : pillX + thumbR + 3;
      ctx.beginPath();
      ctx.arc(thumbX, r.pinY, thumbR, 0, Math.PI * 2);
      ctx.fillStyle = on ? '#fff6dc' : '#6f859b';
      ctx.fill();

      ctx.font = `bold ${tall ? 11 : 10}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = on ? '#fff7e0' : '#8ea4ba';
      ctx.fillText(on ? '1' : '0', on ? pillX + 9.5 : pillX + pillW - 9.5, r.pinY + 0.5);

      // Pin stem + distinct circular wiring pad protruding to the right
      this._drawPinPad(ctx, r.boxX + r.boxW, r.pinY, r.pinX, r.pinY, on, false);
      ctx.restore();
    });
  }

  _drawOutputRail(ctx) {
    const outVals = this.simulator ? this.simulator.getOutputs() : [];
    this.stage.outputs.forEach((label, idx) => {
      const r = this._getOutputRailPos(idx);
      const on = Boolean(outVals[idx]);
      const tall = r.boxH >= 50;

      ctx.save();
      if (on) {
        ctx.shadowColor = 'rgba(82, 227, 182, 0.55)';
        ctx.shadowBlur = 14;
      }
      ctx.fillStyle = on ? '#123e30' : '#18222d';
      this._roundRect(ctx, r.boxX, r.boxY, r.boxW, r.boxH, 10);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.strokeStyle = on ? '#5ef0c2' : '#43586d';
      ctx.lineWidth = on ? 2.4 : 1.7;
      ctx.stroke();

      // Bit value pill on left side of lamp
      ctx.font = `bold ${tall ? 14.5 : 13}px monospace`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = on ? '#8fffdc' : '#6c849c';
      ctx.fillText(on ? '1' : '0', r.boxX + 10, r.pinY);

      // Output label
      ctx.font = `bold ${tall ? 13.5 : 12}px monospace`;
      ctx.textAlign = 'right';
      ctx.fillStyle = on ? '#eefff9' : '#afc3d6';
      ctx.fillText(label, r.boxX + r.boxW - 25, r.pinY, r.boxW - 44);

      // Bright LED lamp bulb
      const bulbR = tall ? 7 : 5.8;
      ctx.beginPath();
      ctx.arc(r.boxX + r.boxW - 13, r.pinY, bulbR, 0, Math.PI * 2);
      ctx.fillStyle = on ? '#5ef0c2' : '#253342';
      ctx.fill();
      ctx.strokeStyle = on ? '#d4fff0' : '#465c72';
      ctx.lineWidth = 1.4;
      ctx.stroke();

      // Pin stem + circular wiring pad protruding to the left
      this._drawPinPad(ctx, r.boxX, r.pinY, r.pinX, r.pinY, on, true);
      ctx.restore();
    });
  }

  _drawPinPad(ctx, baseX, baseY, pinX, pinY, high, isEmerald) {
    ctx.strokeStyle = high ? (isEmerald ? '#52e3b6' : '#ffb84d') : '#688098';
    ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.lineTo(pinX, pinY);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(pinX, pinY, 6.8, 0, Math.PI * 2);
    ctx.fillStyle = high ? (isEmerald ? '#6ff5ca' : '#ffd166') : '#1c2a38';
    ctx.fill();
    ctx.strokeStyle = high ? '#ffffff' : '#90aac4';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  _drawNodes(ctx) {
    for (const node of this.circuit.nodes) {
      const def = getChipDef(node.type, this.customChips);
      const dim = this.getChipDimensions(node.type);
      const selected = this.selectedNodeId === node.id;
      const isDragging = this.gesture?.kind === 'dragNode' && this.gesture.nodeId === node.id && this.gesture.moved;
      const pinVals = this.simulator ? this.simulator.getNodePinValues(node.id) : { inputs: [], outputs: [] };

      ctx.save();

      // Crisp dashed grid-snap landing ghost while actively dragging a module!
      if (isDragging) {
        const minX = NODE_MIN_X;
        const maxX = Math.max(minX, BOARD_W - NODE_MIN_X - dim.w);
        const minY = this.boardH >= 640 ? 78 : 48;
        const gx = snap(clamp(node.x, minX, maxX));
        const gy = snap(clamp(node.y, minY, this.boardH - dim.h - 16));
        ctx.save();
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = 'rgba(255, 209, 102, 0.55)';
        ctx.lineWidth = 1.8;
        this._roundRect(ctx, gx, gy, dim.w, dim.h, 9);
        ctx.stroke();
        ctx.restore();
      }

      // Drop shadow (elevated while dragging!)
      ctx.fillStyle = isDragging ? 'rgba(0, 0, 0, 0.62)' : 'rgba(0, 0, 0, 0.46)';
      this._roundRect(ctx, node.x + (isDragging ? 6 : 3), node.y + (isDragging ? 9 : 4), dim.w, dim.h, 9);
      ctx.fill();

      // Ceramic/Bakelite IC Package body
      ctx.fillStyle = isDragging ? '#222f3e' : '#1b242f';
      this._roundRect(ctx, node.x, node.y, dim.w, dim.h, 9);
      ctx.fill();

      // Colored header stripe (20px tall drag handle)
      ctx.fillStyle = def?.color || '#5c6b7a';
      this._roundRect(ctx, node.x + 1, node.y + 1, dim.w - 2, 19, 8);
      ctx.fill();
      ctx.fillRect(node.x + 1, node.y + 11, dim.w - 2, 10);

      // Subtle grip dots on left/right of header bar to signal "draggable module!"
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      for (const gx of [node.x + 7, node.x + dim.w - 7]) {
        ctx.fillRect(gx - 1, node.y + 6, 2, 2);
        ctx.fillRect(gx - 1, node.y + 10, 2, 2);
        ctx.fillRect(gx - 1, node.y + 14, 2, 2);
      }

      // DIP top notch
      ctx.fillStyle = '#10171f';
      ctx.beginPath();
      ctx.arc(node.x + dim.w / 2, node.y + 1, 5, 0, Math.PI);
      ctx.fill();

      // Border
      if (isDragging) {
        ctx.shadowColor = 'rgba(255, 209, 102, 0.55)';
        ctx.shadowBlur = 12;
      }
      ctx.strokeStyle = isDragging || selected ? '#ffd166' : (def?.accent || '#7c92a6');
      ctx.lineWidth = isDragging ? 3 : selected ? 2.5 : 1.6;
      this._roundRect(ctx, node.x, node.y, dim.w, dim.h, 9);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Chip title
      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(def?.name || node.type, node.x + dim.w / 2, node.y + 11.5, dim.w - 22);

      // Subtle physical diagram inside SW (animated switch blade) & PULL (resistor + earth drain)
      if (node.type === 'SW') {
        const flowOn = Boolean(pinVals.inputs[0]);
        const gateOn = Boolean(pinVals.inputs[1]);
        const cx = node.x + dim.w / 2 + 4;
        const cy = node.y + dim.h - 15;
        ctx.strokeStyle = gateOn ? (flowOn ? '#ffd166' : '#ffbe6b') : '#6f859b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx - 10, cy, 2.4, 0, Math.PI * 2);
        ctx.arc(cx + 10, cy, 2.4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - 8, cy);
        ctx.lineTo(cx + 8, gateOn ? cy : cy - 9);
        ctx.strokeStyle = gateOn ? '#ffd166' : '#8ea5bc';
        ctx.lineWidth = 2.6;
        ctx.stroke();
      } else if (node.type === 'PULL') {
        const drained = Boolean(pinVals.inputs[0]);
        const cx = node.x + dim.w / 2;
        const cy = node.y + dim.h - 16;
        ctx.strokeStyle = drained ? '#ffb84d' : '#52e3b6';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(cx - 10, cy - 5);
        ctx.lineTo(cx - 5, cy - 9);
        ctx.lineTo(cx, cy - 2);
        ctx.lineTo(cx + 5, cy - 9);
        ctx.lineTo(cx + 10, cy - 5);
        ctx.stroke();
        ctx.strokeStyle = drained ? '#ffd166' : '#5f768c';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(cx, cy + 1);
        ctx.lineTo(cx, cy + 6);
        ctx.moveTo(cx - 7, cy + 6);
        ctx.lineTo(cx + 7, cy + 6);
        ctx.moveTo(cx - 4, cy + 9.5);
        ctx.lineTo(cx + 4, cy + 9.5);
        ctx.stroke();
      } else if (def && def.nandCount > 0) {
        ctx.font = 'bold 9.5px monospace';
        ctx.fillStyle = 'rgba(180, 200, 220, 0.44)';
        ctx.fillText(`${def.nandCount}N`, node.x + dim.w / 2, node.y + dim.h - 8);
      }

      // Input pins (left)
      (def?.inputs || []).forEach((lbl, idx) => {
        const p = this._getNodePinPos(node, 'in', idx);
        const high = Boolean(pinVals.inputs[idx]);
        this._drawPinPad(ctx, node.x, p.y, p.x, p.y, high, false);
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = high ? '#ffd166' : '#9bb3c9';
        ctx.fillText(lbl, node.x + 6, p.y);
      });

      // Output pins (right)
      (def?.outputs || []).forEach((lbl, idx) => {
        const p = this._getNodePinPos(node, 'out', idx);
        const high = Boolean(pinVals.outputs[idx]);
        this._drawPinPad(ctx, node.x + dim.w, p.y, p.x, p.y, high, true);
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = high ? '#72f2c8' : '#9bb3c9';
        ctx.fillText(lbl, node.x + dim.w - 6, p.y);
      });

      ctx.restore();
    }
  }

  _drawWires(ctx) {
    const unstable = Boolean(this.simulator?.unstable);
    for (const wire of this.circuit.wires) {
      const curve = this._getWireCurve(wire);
      if (!curve) continue;
      const high = this.simulator ? this.simulator.getWireValue(wire.id) === 1 : false;
      const selected = this.selectedWireId === wire.id;

      ctx.save();
      ctx.lineCap = 'round';

      // Dark outer casing for crisp wire crossing readability
      ctx.beginPath();
      ctx.moveTo(curve.p0.x, curve.p0.y);
      ctx.bezierCurveTo(curve.p1.x, curve.p1.y, curve.p2.x, curve.p2.y, curve.p3.x, curve.p3.y);
      ctx.strokeStyle = 'rgba(8, 13, 19, 0.85)';
      ctx.lineWidth = selected ? 8 : 6;
      ctx.stroke();

      // Main conductive wire
      if (selected) {
        ctx.strokeStyle = '#ff6b6b';
        ctx.lineWidth = 4;
      } else if (unstable) {
        ctx.strokeStyle = Math.sin(this.time * 24) > 0 ? '#ff5252' : '#ff9f43';
        ctx.lineWidth = 3.2;
      } else if (high) {
        ctx.shadowColor = 'rgba(255, 184, 77, 0.65)';
        ctx.shadowBlur = 8;
        ctx.strokeStyle = '#ffb84d';
        ctx.lineWidth = 3.2;
      } else {
        ctx.strokeStyle = '#475c70';
        ctx.lineWidth = 2.4;
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Flowing electric current pulse particles along active wires!
      if (high && !selected && !unstable) {
        const phase = (this.time * 0.9) % 1;
        for (let k = 0; k < 2; k++) {
          const t = (phase + k * 0.5) % 1;
          const pt = evalCubic(curve.p0, curve.p1, curve.p2, curve.p3, t);
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 2.7, 0, Math.PI * 2);
          ctx.fillStyle = '#fff5cc';
          ctx.fill();
        }
      }
      ctx.restore();
    }
  }

  _drawLiveWirePreview(ctx) {
    const startPin = this.gesture?.kind === 'wire' ? this.gesture.startPin : this.pendingPin;
    if (!startPin) return;

    // Highlight active start pin
    ctx.save();
    const pulse = 9 + Math.sin(this.time * 8) * 2.5;
    ctx.beginPath();
    ctx.arc(startPin.x, startPin.y, pulse, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // Rubber-band wire during active drag
    if (this.wireDragPos) {
      const from = startPin;
      const to = this.wireDragPos;
      const ctrl = clamp(Math.abs(to.x - from.x) * 0.45, 28, 110);
      ctx.beginPath();
      ctx.setLineDash([6, 5]);
      ctx.moveTo(from.x, from.y);
      ctx.bezierCurveTo(
        from.x + (startPin.role === 'src' ? ctrl : -ctrl),
        from.y,
        to.x + (startPin.role === 'src' ? -ctrl : ctrl),
        to.y,
        to.x,
        to.y
      );
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 2.6;
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }

  _drawWiringTargetHighlights(ctx) {
    const activePin = this.gesture?.kind === 'wire' ? this.gesture.startPin : this.pendingPin;
    if (!activePin) return;
    const targetRole = activePin.role === 'src' ? 'dst' : 'src';
    const r = 10 + Math.sin(this.time * 7) * 2;
    ctx.save();
    for (const pin of this._allPins()) {
      if (pin.role !== targetRole) continue;
      ctx.beginPath();
      ctx.arc(pin.x, pin.y, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(82, 227, 182, 0.85)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
  }

  _drawParticles(ctx) {
    if (this.particles.length === 0) return;
    ctx.save();
    for (const p of this.particles) {
      const a = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * (0.5 + a * 0.6), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  _roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }
}
