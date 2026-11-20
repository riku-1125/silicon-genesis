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
const BOARD_W = 660;
const LEFT_X = 60;
const RIGHT_X = 600;
const RAIL_W = 66;
const RAIL_H = 30;
const PIN_STUB = 11;

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
      const maxPins = Math.max(this.stage.inputs.length, this.stage.outputs.length);
      this.boardH = maxPins >= 8 ? 500 : maxPins >= 6 ? 430 : 360;
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
    const padX = 12;
    const padY = 12;
    const sx = (rect.width - padX * 2) / BOARD_W;
    const sy = (rect.height - padY * 2) / this.boardH;
    this.scale = clamp(Math.min(sx, sy), 0.42, 2.2);
    this.offsetX = (rect.width - BOARD_W * this.scale) / 2;
    this.offsetY = (rect.height - this.boardH * this.scale) / 2;
  }

  /** Finds a clean unoccupied board position for auto-placing a chip. */
  findOpenSpot(chipType) {
    const dim = this.getChipDimensions(chipType);
    const cols = [230, 330, 430, 280, 380];
    const rows = [
      this.boardH * 0.3,
      this.boardH * 0.55,
      this.boardH * 0.76,
      this.boardH * 0.2,
      this.boardH * 0.45,
      this.boardH * 0.68,
    ];
    for (const ry of rows) {
      for (const cx of cols) {
        const x = snap(cx - dim.w / 2);
        const y = snap(clamp(ry - dim.h / 2, 24, this.boardH - dim.h - 24));
        const overlaps = (this.circuit?.nodes || []).some((n) => {
          const nd = this.getChipDimensions(n.type);
          return Math.abs(n.x - x) < (dim.w + nd.w) * 0.48 && Math.abs(n.y - y) < (dim.h + nd.h) * 0.48;
        });
        if (!overlaps) return { x, y };
      }
    }
    return {
      x: snap(BOARD_W / 2 - dim.w / 2 + ((Math.random() * 48) | 0) - 24),
      y: snap(this.boardH / 2 - dim.h / 2 + ((Math.random() * 48) | 0) - 24),
    };
  }

  getChipDimensions(type) {
    const def = getChipDef(type, this.customChips);
    if (!def) return { w: 78, h: 56, pinStep: 26 };
    if (type === 'SW') return { w: 112, h: 70, pinStep: 30 };
    if (type === 'PULL') return { w: 102, h: 64, pinStep: 28 };
    if (type === 'CONST_1' || type === 'CONST_0') return { w: 80, h: 54, pinStep: 26 };
    const maxPins = Math.max(def.inputs.length, def.outputs.length, 1);
    const pinStep = maxPins >= 8 ? 22 : maxPins >= 5 ? 24 : 28;
    const h = Math.max(54, maxPins * pinStep + 18);
    const labelLen = Math.max((def.name || type).length, 4);
    const w = maxPins >= 6 ? 106 : Math.max(76, labelLen * 11 + 36);
    return { w, h, pinStep };
  }

  _getInputRailPos(idx) {
    const n = this.stage?.inputs.length || 1;
    const topPad = n <= 2 ? 96 : n <= 4 ? 66 : 50;
    const bottomPad = n <= 2 ? 96 : n <= 4 ? 56 : 36;
    const avail = this.boardH - topPad - bottomPad;
    const step = n <= 1 ? 0 : avail / (n - 1);
    const y = n <= 1 ? this.boardH / 2 : topPad + idx * step;
    return {
      boxX: LEFT_X - RAIL_W / 2,
      boxY: y - RAIL_H / 2,
      boxW: RAIL_W,
      boxH: RAIL_H,
      pinX: LEFT_X + RAIL_W / 2 + PIN_STUB,
      pinY: y,
    };
  }

  _getOutputRailPos(idx) {
    const n = this.stage?.outputs.length || 1;
    const topPad = n <= 2 ? 96 : n <= 4 ? 66 : 50;
    const bottomPad = n <= 2 ? 96 : n <= 4 ? 56 : 36;
    const avail = this.boardH - topPad - bottomPad;
    const step = n <= 1 ? 0 : avail / (n - 1);
    const y = n <= 1 ? this.boardH / 2 : topPad + idx * step;
    return {
      boxX: RIGHT_X - RAIL_W / 2,
      boxY: y - RAIL_H / 2,
      boxW: RAIL_W,
      boxH: RAIL_H,
      pinX: RIGHT_X - RAIL_W / 2 - PIN_STUB,
      pinY: y,
    };
  }

  _getNodePinPos(node, side, pinIdx) {
    const def = getChipDef(node.type, this.customChips);
    const dim = this.getChipDimensions(node.type);
    const pins = side === 'in' ? (def?.inputs || []) : (def?.outputs || []);
    const n = pins.length;
    const totalH = (n - 1) * dim.pinStep;
    const startY = node.y + dim.h / 2 - totalH / 2;
    const y = n <= 1 ? node.y + dim.h / 2 : startY + pinIdx * dim.pinStep;
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

  _hitTestPin(wx, wy, filterRole = null) {
    const hitR = Math.max(19, 24 / this.scale);
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
    const pad = 6;
    for (let i = 0; i < this.stage.inputs.length; i++) {
      const r = this._getInputRailPos(i);
      if (wx >= r.boxX - pad && wx <= r.boxX + r.boxW + 2 && wy >= r.boxY - pad && wy <= r.boxY + r.boxH + pad) {
        return i;
      }
    }
    return -1;
  }

  _hitTestOutputLamp(wx, wy) {
    if (!this.stage) return -1;
    const pad = 6;
    for (let i = 0; i < this.stage.outputs.length; i++) {
      const r = this._getOutputRailPos(i);
      if (wx >= r.boxX - 2 && wx <= r.boxX + r.boxW + pad && wy >= r.boxY - pad && wy <= r.boxY + r.boxH + pad) {
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
      if (wx >= node.x - 4 && wx <= node.x + dim.w + 4 && wy >= node.y - 4 && wy <= node.y + dim.h + 4) {
        return node;
      }
    }
    return null;
  }

  _hitTestWire(wx, wy) {
    if (!this.circuit) return null;
    const tol = Math.max(13, 16 / this.scale);
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
        const x = snap(clamp(pt.x - dim.w / 2, LEFT_X + RAIL_W / 2 + 28, RIGHT_X - RAIL_W / 2 - dim.w - 28));
        const y = snap(clamp(pt.y - dim.h / 2, 16, this.boardH - dim.h - 16));
        const type = this.armedChipType;
        this.armedChipType = null;
        this.cb.onPlaceChip?.(type, x, y);
        this._notifySelection();
        return;
      }

      // 2. If already in Tap-to-Wire mode, prioritize completing onto a compatible target pin (or full rail switch/lamp!)
      if (this.pendingPin) {
        const neededRole = this.pendingPin.role === 'src' ? 'dst' : 'src';
        const targetPin = this._hitTestPin(pt.x, pt.y, neededRole);
        if (targetPin) {
          this._tryCompleteWire(this.pendingPin, targetPin);
          this._notifySelection();
          return;
        }
        // Convenience: tapping anywhere on the output lamp or input switch body while wiring completes it!
        if (neededRole === 'dst') {
          const outIdx = this._hitTestOutputLamp(pt.x, pt.y);
          if (outIdx >= 0) {
            this._tryCompleteWire(this.pendingPin, {
              role: 'dst',
              endpoint: { kind: 'output', pin: outIdx },
            });
            this._notifySelection();
            return;
          }
        } else {
          const inIdx = this._hitTestInputSwitch(pt.x, pt.y);
          if (inIdx >= 0) {
            this._tryCompleteWire(this.pendingPin, {
              role: 'src',
              endpoint: { kind: 'input', pin: inIdx },
            });
            this._notifySelection();
            return;
          }
        }
      }

      // 3. Pin hit test -> starts both tap-to-wire AND drag-to-wire
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

      // 4. Input toggle switch body
      const inIdx = this._hitTestInputSwitch(pt.x, pt.y);
      if (inIdx >= 0) {
        this.pendingPin = null;
        this.selectedNodeId = null;
        this.selectedWireId = null;
        this.cb.onToggleInput?.(inIdx);
        this._notifySelection();
        return;
      }

      // 5. Output lamp body -> start wiring from output pin
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

      // 6. Placed chip body -> drag or select
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
        this._notifySelection();
        return;
      }

      // 7. Wire hit test -> select (or tap again to snip!)
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
        const nextScale = clamp(this.gesture.startScale * (dist / this.gesture.startDist), 0.42, 2.5);
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
        if (Math.hypot(dx, dy) > 5) this.gesture.moved = true;
        const node = this.circuit?.nodes.find((n) => n.id === this.gesture.nodeId);
        if (node) {
          const dim = this.getChipDimensions(node.type);
          node.x = snap(clamp(this.gesture.origX + dx, LEFT_X + RAIL_W / 2 + 24, RIGHT_X - RAIL_W / 2 - dim.w - 24));
          node.y = snap(clamp(this.gesture.origY + dy, 14, this.boardH - dim.h - 14));
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
        const dropPin = this._hitTestPin(pt.x, pt.y, neededRole);
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

    // Subtle status pill at top-center of workbench if armed/wiring
    if (this.armedChipType) {
      const def = getChipDef(this.armedChipType, this.customChips);
      const hint = def?.shortRuleJa ? `｜${def.shortRuleJa}` : '';
      this._drawCanvasBanner(ctx, w, `＋ [${def?.name || this.armedChipType}] 置く場所をタップ${hint}`, '#ffb347');
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
    for (let x = 112; x <= 548; x += GRID * 2) {
      for (let y = 24; y <= this.boardH - 20; y += GRID * 2) {
        ctx.fillRect(x - 1, y - 1, 2, 2);
      }
    }

    // Left / Right rail separation tracks
    ctx.fillStyle = 'rgba(8, 13, 18, 0.55)';
    ctx.fillRect(10, 10, 96, this.boardH - 20);
    ctx.fillRect(BOARD_W - 106, 10, 96, this.boardH - 20);

    ctx.strokeStyle = 'rgba(220, 160, 75, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(106, 12);
    ctx.lineTo(106, this.boardH - 12);
    ctx.moveTo(BOARD_W - 106, 12);
    ctx.lineTo(BOARD_W - 106, this.boardH - 12);
    ctx.stroke();

    // Rail headers
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(230, 175, 95, 0.6)';
    ctx.fillText('INPUT', LEFT_X, 20);
    ctx.fillStyle = 'rgba(82, 227, 182, 0.65)';
    ctx.fillText('OUTPUT', RIGHT_X, 20);

    // Outer riveted border
    ctx.strokeStyle =
      this.highlightTestPulse > 0
        ? `rgba(82, 227, 182, ${0.4 + this.highlightTestPulse * 0.6})`
        : 'rgba(180, 145, 95, 0.35)';
    ctx.lineWidth = 2;
    this._roundRect(ctx, 4, 4, BOARD_W - 8, this.boardH - 8, 12);
    ctx.stroke();

    // Empty workbench hint for complete beginners on Stage 01
    if (this.circuit.nodes.length === 0 && !this.armedChipType) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(175, 198, 218, 0.32)';
      ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Hiragino Sans", sans-serif';
      ctx.fillText('下のパレットから部品をタップして配置', BOARD_W / 2, this.boardH / 2 - 10);
      ctx.font = '12px -apple-system, BlinkMacSystemFont, "Hiragino Sans", sans-serif';
      ctx.fillText('ピン同士をタップ（またはドラッグ）で配線！', BOARD_W / 2, this.boardH / 2 + 14);
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

        const midY = (p0.pinY + p1.pinY) / 2;
        const bx = side === 'in' ? 14 : BOARD_W - 14;
        ctx.save();
        ctx.strokeStyle = side === 'in' ? 'rgba(255, 179, 71, 0.5)' : 'rgba(82, 227, 182, 0.55)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bx + (side === 'in' ? 6 : -6), p0.boxY + 4);
        ctx.lineTo(bx, p0.boxY + 4);
        ctx.lineTo(bx, p1.boxY + p1.boxH - 4);
        ctx.lineTo(bx + (side === 'in' ? 6 : -6), p1.boxY + p1.boxH - 4);
        ctx.stroke();

        // Compact decimal readout pill
        const badgeText = `${g.label}=${val}`;
        ctx.font = 'bold 10px monospace';
        const bw = ctx.measureText(badgeText).width + 8;
        const rx = side === 'in' ? 10 : BOARD_W - bw - 10;
        const ry = p0.boxY - 17;
        ctx.fillStyle = 'rgba(13, 21, 29, 0.92)';
        this._roundRect(ctx, rx, ry, bw, 15, 4);
        ctx.fill();
        ctx.strokeStyle = side === 'in' ? 'rgba(255, 179, 71, 0.6)' : 'rgba(82, 227, 182, 0.6)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = side === 'in' ? '#ffd166' : '#52e3b6';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(badgeText, rx + bw / 2, ry + 8);
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

      // Switch casing
      ctx.save();
      ctx.fillStyle = on ? (isClk ? '#3f2a57' : '#3a2a12') : '#1a2430';
      this._roundRect(ctx, r.boxX, r.boxY, r.boxW, r.boxH, 7);
      ctx.fill();
      ctx.strokeStyle = on ? (isClk ? '#d09bff' : '#ffb84d') : '#44576a';
      ctx.lineWidth = on ? 2 : 1.5;
      ctx.stroke();

      // LED dot
      ctx.beginPath();
      ctx.arc(r.boxX + 12, r.pinY, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = on ? (isClk ? '#d8a8ff' : '#ffb84d') : '#2b3947';
      ctx.fill();

      // Label + value
      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = on ? '#fff1d0' : '#9fb3c8';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, r.boxX + 21, r.pinY);

      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'right';
      ctx.fillStyle = on ? '#ffd166' : '#5e7388';
      ctx.fillText(on ? '1' : '0', r.boxX + r.boxW - 6, r.pinY);

      // Pin stem + pad
      this._drawPinPad(ctx, r.boxX + r.boxW, r.pinY, r.pinX, r.pinY, on, false);
      ctx.restore();
    });
  }

  _drawOutputRail(ctx) {
    const outVals = this.simulator ? this.simulator.getOutputs() : [];
    this.stage.outputs.forEach((label, idx) => {
      const r = this._getOutputRailPos(idx);
      const on = Boolean(outVals[idx]);

      ctx.save();
      if (on) {
        ctx.shadowColor = 'rgba(82, 227, 182, 0.5)';
        ctx.shadowBlur = 12;
      }
      ctx.fillStyle = on ? '#12382c' : '#18212b';
      this._roundRect(ctx, r.boxX, r.boxY, r.boxW, r.boxH, 7);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.strokeStyle = on ? '#52e3b6' : '#3d4f60';
      ctx.lineWidth = on ? 2 : 1.5;
      ctx.stroke();

      // Value + label
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = on ? '#8fffdc' : '#5e7388';
      ctx.fillText(on ? '1' : '0', r.boxX + 7, r.pinY);

      ctx.textAlign = 'right';
      ctx.fillStyle = on ? '#eafff7' : '#9fb3c8';
      ctx.fillText(label, r.boxX + r.boxW - 18, r.pinY);

      // Lamp bulb
      ctx.beginPath();
      ctx.arc(r.boxX + r.boxW - 10, r.pinY, 5, 0, Math.PI * 2);
      ctx.fillStyle = on ? '#52e3b6' : '#25323f';
      ctx.fill();

      // Pin stem + pad
      this._drawPinPad(ctx, r.boxX, r.pinY, r.pinX, r.pinY, on, true);
      ctx.restore();
    });
  }

  _drawPinPad(ctx, baseX, baseY, pinX, pinY, high, isEmerald) {
    ctx.strokeStyle = high ? (isEmerald ? '#52e3b6' : '#ffb84d') : '#5d7288';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.lineTo(pinX, pinY);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(pinX, pinY, 5.5, 0, Math.PI * 2);
    ctx.fillStyle = high ? (isEmerald ? '#6ff5ca' : '#ffd166') : '#1d2a36';
    ctx.fill();
    ctx.strokeStyle = high ? '#ffffff' : '#7b92a8';
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }

  _drawNodes(ctx) {
    for (const node of this.circuit.nodes) {
      const def = getChipDef(node.type, this.customChips);
      const dim = this.getChipDimensions(node.type);
      const selected = this.selectedNodeId === node.id;
      const pinVals = this.simulator ? this.simulator.getNodePinValues(node.id) : { inputs: [], outputs: [] };

      ctx.save();
      // Drop shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      this._roundRect(ctx, node.x + 3, node.y + 4, dim.w, dim.h, 8);
      ctx.fill();

      // Ceramic/Bakelite IC Package body
      ctx.fillStyle = '#1b242f';
      this._roundRect(ctx, node.x, node.y, dim.w, dim.h, 8);
      ctx.fill();

      // Colored header stripe
      ctx.fillStyle = def?.color || '#5c6b7a';
      this._roundRect(ctx, node.x + 1, node.y + 1, dim.w - 2, 16, 7);
      ctx.fill();
      ctx.fillRect(node.x + 1, node.y + 9, dim.w - 2, 8);

      // DIP top notch
      ctx.fillStyle = '#10171f';
      ctx.beginPath();
      ctx.arc(node.x + dim.w / 2, node.y + 1, 5, 0, Math.PI);
      ctx.fill();

      // Border
      ctx.strokeStyle = selected ? '#ffd166' : (def?.accent || '#7c92a6');
      ctx.lineWidth = selected ? 2.5 : 1.4;
      this._roundRect(ctx, node.x, node.y, dim.w, dim.h, 8);
      ctx.stroke();

      // Chip title
      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(def?.name || node.type, node.x + dim.w / 2, node.y + 10);

      // Subtle physical diagram inside SW (animated switch blade) & PULL (resistor + earth drain)
      if (node.type === 'SW') {
        const flowOn = Boolean(pinVals.inputs[0]);
        const gateOn = Boolean(pinVals.inputs[1]);
        const cx = node.x + dim.w / 2 + 4;
        const cy = node.y + dim.h - 14;
        ctx.strokeStyle = gateOn ? (flowOn ? '#ffd166' : '#ffbe6b') : '#6f859b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx - 10, cy, 2.2, 0, Math.PI * 2);
        ctx.arc(cx + 10, cy, 2.2, 0, Math.PI * 2);
        ctx.stroke();
        // Pivoting switch blade (closes flat when ひねり=1, lifts open when ひねり=0!)
        ctx.beginPath();
        ctx.moveTo(cx - 8, cy);
        ctx.lineTo(cx + 8, gateOn ? cy : cy - 9);
        ctx.strokeStyle = gateOn ? '#ffd166' : '#8ea5bc';
        ctx.lineWidth = 2.4;
        ctx.stroke();
      } else if (node.type === 'PULL') {
        const drained = Boolean(pinVals.inputs[0]);
        const cx = node.x + dim.w / 2;
        const cy = node.y + dim.h - 15;
        // Mini zig-zag resistor + ground bars at bottom-center
        ctx.strokeStyle = drained ? '#ffb84d' : '#52e3b6';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(cx - 9, cy - 5);
        ctx.lineTo(cx - 5, cy - 8);
        ctx.lineTo(cx, cy - 2);
        ctx.lineTo(cx + 5, cy - 8);
        ctx.lineTo(cx + 9, cy - 5);
        ctx.stroke();
        // Earth ground symbol (⏚)
        ctx.strokeStyle = drained ? '#ffd166' : '#5f768c';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx, cy + 1);
        ctx.lineTo(cx, cy + 6);
        ctx.moveTo(cx - 7, cy + 6);
        ctx.lineTo(cx + 7, cy + 6);
        ctx.moveTo(cx - 4, cy + 9);
        ctx.lineTo(cx + 4, cy + 9);
        ctx.stroke();
      } else if (def && def.nandCount > 0) {
        // Subtle NAND count badge in center-bottom
        ctx.font = '9px monospace';
        ctx.fillStyle = 'rgba(180, 200, 220, 0.42)';
        ctx.fillText(`${def.nandCount}N`, node.x + dim.w / 2, node.y + dim.h - 7);
      }

      // Input pins (left)
      (def?.inputs || []).forEach((lbl, idx) => {
        const p = this._getNodePinPos(node, 'in', idx);
        const high = Boolean(pinVals.inputs[idx]);
        this._drawPinPad(ctx, node.x, p.y, p.x, p.y, high, false);
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = high ? '#ffd166' : '#8ea5bc';
        ctx.fillText(lbl, node.x + 5, p.y);
      });

      // Output pins (right)
      (def?.outputs || []).forEach((lbl, idx) => {
        const p = this._getNodePinPos(node, 'out', idx);
        const high = Boolean(pinVals.outputs[idx]);
        this._drawPinPad(ctx, node.x + dim.w, p.y, p.x, p.y, high, true);
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = high ? '#72f2c8' : '#8ea5bc';
        ctx.fillText(lbl, node.x + dim.w - 5, p.y);
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
