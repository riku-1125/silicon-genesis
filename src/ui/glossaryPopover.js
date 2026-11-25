/**
 * SILICON GENESIS — Progression-Locked Story Glossary Popover & Rich-Text Typewriter
 *
 * Enforces strict spoiler/answer protection:
 *   - Terms with a stage-clear path (`unlockClearedStage`) are STRICTLY LOCKED until that stage
 *     is cleared (`save.clearedStages.includes(unlockClearedStage)`).
 *   - Story vocabulary terms (`emp`, `insulator`, `relay`, `silicon`, etc.) are unlocked ONLY
 *     when the player actually encounters the dialogue line containing them (`save.discoveredTerms`).
 *   - Consequently, on Prologue Step 1 (`EMP`), ALL related links (`リレー`, `絶縁層`, `ショート`)
 *     are locked (`🔒 未取得`), preventing any chain-clicking into future terms or puzzle answers!
 */

import {
  getGlossaryTerm,
  getGlossaryTermForChip,
  tokenizeGlossaryText,
  hasGlossaryTerms,
  isGlossaryTermUnlocked,
  isGlossaryDiagramUnlocked,
} from '../data/glossary.js?v=43';
import { getChipDef, computeCircuitMetrics } from '../engine/circuit.js';
import { persistSaveData } from '../state/storage.js?v=43';
import { sound } from '../audio/sound.js?v=43';
import { StoryDiagramPlayer } from './storyDiagram.js?v=43';
import { renderMiniSchematicSvg, startMiniSchematicLoop } from './miniSchematic.js?v=43';

let _saveProvider = null;

/**
 * Populates containerEl with one stable DOM node per token (all initially empty for typing,
 * or full when instant=true). Records any linkable terms in this dialogue line into
 * `save.discoveredTerms` so they become accessible in the glossary from this moment onward.
 */
export function mountRichText(containerEl, text, { instant = false, excludeTermId = null, save = null } = {}) {
  const activeSave = save || (_saveProvider ? _saveProvider() : null);
  const tokens = tokenizeGlossaryText(text, excludeTermId, activeSave);
  containerEl.textContent = '';

  if (activeSave) {
    if (!Array.isArray(activeSave.discoveredTerms)) {
      activeSave.discoveredTerms = [];
    }
    let added = false;
    for (const tok of tokens) {
      if (tok.type === 'term' && tok.termId && !activeSave.discoveredTerms.includes(tok.termId)) {
        activeSave.discoveredTerms.push(tok.termId);
        added = true;
      }
    }
    if (added) {
      persistSaveData(activeSave);
    }
  }

  const nodes = tokens.map((tok) => {
    if (tok.type === 'term') {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'term-link';
      btn.dataset.termId = tok.termId;
      btn.setAttribute('aria-label', `${tok.text} の解説を見る`);
      if (instant) {
        btn.textContent = tok.text;
      } else {
        btn.classList.add('term-hidden');
        btn.textContent = '';
      }
      containerEl.appendChild(btn);
      return { node: btn, token: tok, isTerm: true };
    }
    const textNode = document.createTextNode(instant ? tok.text : '');
    containerEl.appendChild(textNode);
    return { node: textNode, token: tok, isTerm: false };
  });

  return { tokens, nodes, hasTerms: hasGlossaryTerms(tokens) };
}

/**
 * Updates stable mounted DOM nodes to show exactly `visibleChars` characters.
 */
export function updateRichTextProgress(nodes, visibleChars) {
  let remaining = visibleChars;
  for (const item of nodes) {
    const full = item.token.text;
    if (remaining <= 0) {
      if (item.node.textContent !== '') item.node.textContent = '';
      if (item.isTerm) item.node.classList.add('term-hidden');
    } else if (remaining >= full.length) {
      if (item.node.textContent !== full) item.node.textContent = full;
      if (item.isTerm) item.node.classList.remove('term-hidden');
      remaining -= full.length;
    } else {
      const slice = full.slice(0, remaining);
      if (item.node.textContent !== slice) item.node.textContent = slice;
      if (item.isTerm) item.node.classList.remove('term-hidden');
      remaining = 0;
    }
  }
}

class GlossaryPopoverController {
  constructor() {
    this.root = null;
    this.cardEl = null;
    this.categoryEl = null;
    this.backTopBtn = null;
    this.backBottomBtn = null;
    this.titleEl = null;
    this.readingEl = null;
    this.pinsWrap = null;
    this.viewTabsWrap = null;
    this.tabDiagramBtn = null;
    this.tabCircuitBtn = null;
    this.diagramWrap = null;
    this.diagramHint = null;
    this.diagramCanvas = null;
    this.myCircuitWrap = null;
    this.circuitHeadEl = null;
    this.circuitStepBadgeEl = null;
    this.circuitSvgHostEl = null;
    this.circuitMetaEl = null;
    this.circuitSubchipsEl = null;
    this.summaryEl = null;
    this.analogyWrap = null;
    this.analogyEl = null;
    this.relatedWrap = null;
    this.relatedList = null;
    this.closeBtn = null;
    this.doneBtn = null;

    this.currentTermId = null;
    this.currentTerm = null;
    this.currentForged = null;
    this.activeView = 'diagram'; // 'diagram' | 'circuit'
    this.history = [];
    this.activeStoryTerms = null;
    this.inPrologue = false;
    this.diagramPlayer = new StoryDiagramPlayer();
    this._miniSimHandle = null;
    this._bound = false;
  }

  setSaveProvider(fn) {
    _saveProvider = fn;
  }

  getSave() {
    return _saveProvider ? _saveProvider() : null;
  }

  setActiveStoryContext({ activeTerms = null, inPrologue = false } = {}) {
    this.activeStoryTerms = activeTerms instanceof Set ? activeTerms : null;
    this.inPrologue = Boolean(inPrologue);
  }

  _ensureBound() {
    if (this._bound) return Boolean(this.root);
    if (typeof document === 'undefined') return false;
    const root = document.getElementById('glossary-popover');
    if (!root) return false;

    this.root = root;
    this.cardEl = root.querySelector('.gp-card');
    this.bodyEl = root.querySelector('.gp-body');
    this.categoryEl = root.querySelector('#gp-category');
    this.backTopBtn = root.querySelector('#gp-back-top');
    this.backBottomBtn = root.querySelector('#gp-back-bottom');
    this.titleEl = root.querySelector('#gp-title');
    this.readingEl = root.querySelector('#gp-reading');
    this.pinsWrap = root.querySelector('#gp-pins-wrap');
    this.viewTabsWrap = root.querySelector('#gp-view-tabs');
    this.tabDiagramBtn = root.querySelector('#gp-tab-diagram');
    this.tabCircuitBtn = root.querySelector('#gp-tab-circuit');
    this.diagramWrap = root.querySelector('#gp-diagram-wrap');
    this.diagramHint = root.querySelector('.gp-diagram-hint');
    this.diagramCanvas = root.querySelector('#gp-live-canvas');
    this.myCircuitWrap = root.querySelector('#gp-my-circuit-wrap');
    this.circuitHeadEl = root.querySelector('#gp-circuit-head');
    this.circuitStepBadgeEl = root.querySelector('#gp-circuit-step-badge');
    this.circuitSvgHostEl = root.querySelector('#gp-circuit-svg-host');
    this.circuitMetaEl = root.querySelector('#gp-circuit-meta');
    this.circuitSubchipsEl = root.querySelector('#gp-circuit-subchips');
    this.summaryEl = root.querySelector('#gp-summary');
    this.analogyWrap = root.querySelector('#gp-analogy-wrap');
    this.analogyEl = root.querySelector('#gp-analogy');
    this.relatedWrap = root.querySelector('#gp-related-wrap');
    this.relatedList = root.querySelector('#gp-related-list');
    this.closeBtn = root.querySelector('#gp-close');
    this.doneBtn = root.querySelector('#gp-done');

    this.tabDiagramBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.activeView === 'diagram') return;
      sound.playSwitch(true);
      this._setActiveView('diagram');
    });

    this.tabCircuitBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.activeView === 'circuit' || !this.currentForged?.circuit) return;
      sound.playSwitch(true);
      this._setActiveView('circuit');
    });

    const closeHandler = (e) => {
      e.stopPropagation();
      sound.playSwitch(false);
      this.close();
    };
    this.closeBtn?.addEventListener('click', closeHandler);
    this.doneBtn?.addEventListener('click', closeHandler);

    const backHandler = (e) => {
      e.stopPropagation();
      this.goBack();
    };
    this.backTopBtn?.addEventListener('click', backHandler);
    this.backBottomBtn?.addEventListener('click', backHandler);

    this.root.addEventListener('click', (e) => {
      e.stopPropagation();
      if (e.target === this.root) {
        sound.playSwitch(false);
        this.close();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (!this.isOpen() || e.__sgGlossaryHandled) return;
      if (e.key === 'Escape') {
        e.__sgGlossaryHandled = true;
        e.stopImmediatePropagation();
        e.preventDefault();
        sound.playSwitch(false);
        this.close();
      } else if ((e.key === 'ArrowLeft' || e.key === 'Backspace') && this.history.length > 0) {
        e.__sgGlossaryHandled = true;
        e.stopImmediatePropagation();
        e.preventDefault();
        this.goBack();
      }
    });

    this._bound = true;
    return true;
  }

  isOpen() {
    return Boolean(this.root && !this.root.classList.contains('hidden'));
  }

  open(termId, { pushHistory = false, preferMyCircuit = false } = {}) {
    if (!this._ensureBound()) return;
    const term = getGlossaryTerm(termId);
    if (!term) return;

    const save = this.getSave();
    if (!isGlossaryTermUnlocked(termId, save, this.activeStoryTerms, this.inPrologue)) {
      return;
    }

    if (pushHistory && this.currentTermId && this.currentTermId !== termId) {
      this.history.push({ termId: this.currentTermId, view: this.activeView });
    } else if (!pushHistory) {
      this.history = [];
    }

    this.currentTermId = termId;
    this._renderTerm(term, { preferMyCircuit });
    this.root.classList.remove('hidden');
  }

  navigateTo(termId, { preferMyCircuit = false } = {}) {
    if (!termId || termId === this.currentTermId) return;
    const save = this.getSave();
    if (!isGlossaryTermUnlocked(termId, save, this.activeStoryTerms, this.inPrologue)) return;
    this.open(termId, { pushHistory: true, preferMyCircuit });
  }

  goBack() {
    if (this.history.length === 0) return;
    sound.playSwitch(false);
    const prev = this.history.pop();
    const prevId = typeof prev === 'string' ? prev : prev.termId;
    const prevView = typeof prev === 'string' ? 'diagram' : prev.view;
    const prevTerm = getGlossaryTerm(prevId);
    if (!prevTerm) return;
    this.currentTermId = prevId;
    this._renderTerm(prevTerm, { preferMyCircuit: prevView === 'circuit' });
  }

  _stopMiniSim() {
    if (this._miniSimHandle) {
      this._miniSimHandle.stop();
      this._miniSimHandle = null;
    }
  }

  _setActiveView(view) {
    const term = this.currentTerm;
    const forged = this.currentForged;
    const save = this.getSave();
    const hasCircuit = Boolean(forged?.circuit);
    const target = view === 'circuit' && hasCircuit ? 'circuit' : 'diagram';
    this.activeView = target;

    this.tabDiagramBtn?.classList.toggle('active', target === 'diagram');
    this.tabDiagramBtn?.setAttribute('aria-selected', target === 'diagram' ? 'true' : 'false');
    this.tabCircuitBtn?.classList.toggle('active', target === 'circuit');
    this.tabCircuitBtn?.setAttribute('aria-selected', target === 'circuit' ? 'true' : 'false');

    if (target === 'circuit' && hasCircuit && term) {
      this.diagramPlayer.unmount();
      this.diagramWrap?.classList.add('hidden');
      this.myCircuitWrap?.classList.remove('hidden');
      this._mountMyCircuit(term, forged, save?.customChips || {});
    } else {
      this._stopMiniSim();
      this.myCircuitWrap?.classList.add('hidden');
      if (term?.anim && this.diagramWrap && this.diagramCanvas) {
        this.diagramWrap.classList.remove('hidden');
        this.diagramCanvas.classList.remove('hidden');
        if (this.diagramHint) {
          this.diagramHint.textContent = '⚡ 動くモジュール図解（タップで状態切替）';
        }
        requestAnimationFrame(() => {
          if (this.isOpen() && this.currentTermId === term.id && this.activeView === 'diagram') {
            this.diagramPlayer.mount(this.diagramCanvas, term.anim);
          }
        });
      }
    }
  }

  _mountMyCircuit(term, forged, customChips) {
    this._stopMiniSim();
    const circuit = forged.circuit;
    const chipId = term.chipId;
    const isProv = Boolean(forged.provisioned);

    if (this.circuitHeadEl) {
      this.circuitHeadEl.textContent = isProv
        ? `📦 標準支給された [${forged.name || chipId}] の回路`
        : chipId === 'NAND'
          ? `🔧 あなたが物理スイッチから創った [NAND] の実回路`
          : `🔧 あなたが作った [${forged.name || chipId}] の実回路`;
    }

    if (this.circuitSvgHostEl) {
      this.circuitSvgHostEl.innerHTML = renderMiniSchematicSvg(circuit, customChips);
    }

    if (this.circuitMetaEl) {
      const nodeCount = circuit.nodes?.length || 0;
      const wireCount = circuit.wires?.length || 0;
      const calcMetrics = computeCircuitMetrics(circuit, customChips);
      const nandCount = forged.nandCount ?? calcMetrics?.nandCount ?? 0;
      const swCount = forged.swCount ?? calcMetrics?.swCount ?? (chipId === 'NAND' ? 2 : nandCount * 2);
      const pullCount = forged.pullCount ?? calcMetrics?.pullCount ?? (chipId === 'NAND' ? 1 : nandCount);
      const nandLabel =
        chipId === 'NAND'
          ? `MOSFET ${swCount}個 ＋ 抵抗 ${pullCount}本`
          : `実効NAND: ${nandCount}個（MOSFET ${swCount}個＋抵抗 ${pullCount}本）`;
      this.circuitMetaEl.innerHTML = `
        <span class="gp-meta-pill">部品 <b>${nodeCount}</b></span>
        <span class="gp-meta-pill">配線 <b>${wireCount}</b></span>
        <span class="gp-meta-pill amber">${nandLabel}</span>
      `;
    }

    // Build clickable sub-chip links so the player can drill down into lower-level forged circuits!
    if (this.circuitSubchipsEl) {
      this.circuitSubchipsEl.textContent = '';
      const seenTypes = new Set();
      const drillItems = [];
      for (const n of circuit.nodes || []) {
        if (!n.type || seenTypes.has(n.type)) continue;
        seenTypes.add(n.type);
        const subTerm = getGlossaryTermForChip(n.type);
        if (!subTerm || subTerm.id === term.id) continue;
        if (!isGlossaryTermUnlocked(subTerm.id, this.getSave(), this.activeStoryTerms, this.inPrologue)) {
          continue;
        }
        const subHasCircuit = Boolean(customChips?.[n.type]?.circuit);
        const subDef = getChipDef(n.type, customChips);
        drillItems.push({
          term: subTerm,
          label: subDef?.name || n.type,
          hasCircuit: subHasCircuit,
        });
      }

      if (drillItems.length > 0) {
        const lbl = document.createElement('div');
        lbl.className = 'gp-subchips-lbl';
        lbl.textContent = '🔍 この中で使っている部品を見る：';
        this.circuitSubchipsEl.appendChild(lbl);

        const row = document.createElement('div');
        row.className = 'gp-related-list';
        for (const item of drillItems) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = `gp-related-chip ${item.hasCircuit ? 'my-circuit-jump' : ''}`;
          btn.textContent = item.hasCircuit
            ? `🔧 ${item.label} の自作回路`
            : `⚡ ${item.label}`;
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            sound.playSwitch(true);
            this.navigateTo(item.term.id, { preferMyCircuit: item.hasCircuit });
          });
          row.appendChild(btn);
        }
        this.circuitSubchipsEl.appendChild(row);
        this.circuitSubchipsEl.classList.remove('hidden');
      } else {
        this.circuitSubchipsEl.classList.add('hidden');
      }
    }

    this._miniSimHandle = startMiniSchematicLoop(
      this.myCircuitWrap,
      circuit,
      customChips,
      chipId,
      { badgeSelector: '#gp-circuit-step-badge' }
    );
  }

  _renderTerm(term, { preferMyCircuit = false } = {}) {
    this.diagramPlayer.unmount();
    this._stopMiniSim();
    const save = this.getSave();
    const diagramUnlocked = isGlossaryDiagramUnlocked(
      term.id,
      save,
      this.activeStoryTerms,
      this.inPrologue
    );
    const forged =
      diagramUnlocked && term.chipId && save?.customChips?.[term.chipId]?.circuit
        ? save.customChips[term.chipId]
        : null;

    this.currentTerm = term;
    this.currentForged = forged;

    this.categoryEl.textContent = `📖 用語解説 // ${term.category}`;
    this.titleEl.textContent = term.title;
    this.readingEl.textContent = term.reading || '';
    this.readingEl.classList.toggle('hidden', !term.reading);

    if (this.pinsWrap) {
      if (term.pins && diagramUnlocked) {
        const ins = (term.pins.inputs || []).join(', ');
        const outs = (term.pins.outputs || []).join(', ');
        this.pinsWrap.innerHTML = `
          <span class="gp-pin-pill in">入力: <b>${ins}</b></span>
          <span class="gp-pin-pill out">出力: <b>${outs}</b></span>
        `;
        this.pinsWrap.classList.remove('hidden');
      } else {
        this.pinsWrap.classList.add('hidden');
        this.pinsWrap.innerHTML = '';
      }
    }

    // View tabs (Conceptual Live Diagram <-> Player's Actual Forged Circuit!)
    if (forged) {
      this.viewTabsWrap?.classList.remove('hidden');
      if (this.tabCircuitBtn) {
        this.tabCircuitBtn.textContent = forged.provisioned
          ? '📦 支給された回路'
          : '🔧 自分が作った回路';
      }
      this._setActiveView(preferMyCircuit ? 'circuit' : 'diagram');
    } else {
      this.viewTabsWrap?.classList.add('hidden');
      this.myCircuitWrap?.classList.add('hidden');
      this.activeView = 'diagram';

      // Embedded Live Interactive Diagram (ONLY if diagram is unlocked!)
      if (this.diagramWrap && this.diagramCanvas) {
        if (term.anim && diagramUnlocked) {
          this.diagramWrap.classList.remove('hidden');
          this.diagramCanvas.classList.remove('hidden');
          if (this.diagramHint) {
            this.diagramHint.textContent = '⚡ 動くモジュール図解（タップで状態切替）';
          }
          requestAnimationFrame(() => {
            if (this.isOpen() && this.currentTermId === term.id) {
              this.diagramPlayer.mount(this.diagramCanvas, term.anim);
            }
          });
        } else if (term.anim && !diagramUnlocked) {
          this.diagramWrap.classList.remove('hidden');
          this.diagramCanvas.classList.add('hidden');
          if (this.diagramHint) {
            this.diagramHint.textContent = `🔒 内部構造の動的図解は ${term.unlockLabel || 'ステージクリア'} で解放されます`;
          }
        } else {
          this.diagramWrap.classList.add('hidden');
        }
      }
    }

    // Plain readable summary text (all links live in the explicit lock-checked related section below!)
    const summaryText = !diagramUnlocked && term.preClearSummary ? term.preClearSummary : term.summary;
    this.summaryEl.textContent = summaryText;

    if (term.analogy) {
      this.analogyEl.textContent = term.analogy;
      this.analogyWrap.classList.remove('hidden');
    } else {
      this.analogyWrap.classList.add('hidden');
    }

    // Related term pills: strictly checked via isGlossaryTermUnlocked(rel.id, save)!
    this.relatedList.textContent = '';
    const relatedEntries = (term.related || [])
      .map((id) => getGlossaryTerm(id))
      .filter(Boolean);

    if (relatedEntries.length > 0) {
      for (const rel of relatedEntries) {
        const relUnlocked = isGlossaryTermUnlocked(
          rel.id,
          save,
          this.activeStoryTerms,
          this.inPrologue
        );
        if (relUnlocked) {
          const chip = document.createElement('button');
          chip.type = 'button';
          chip.className = 'gp-related-chip';
          const hasDiag = isGlossaryDiagramUnlocked(
            rel.id,
            save,
            this.activeStoryTerms,
            this.inPrologue
          );
          const relForged = Boolean(hasDiag && rel.chipId && save?.customChips?.[rel.chipId]?.circuit);
          chip.textContent = `${relForged ? '🔧 ' : hasDiag ? '⚡ ' : '📖 '}${rel.title.split('（')[0]}`;
          chip.addEventListener('click', (e) => {
            e.stopPropagation();
            sound.playSwitch(true);
            this.navigateTo(rel.id);
          });
          this.relatedList.appendChild(chip);
        } else {
          const lockedBadge = document.createElement('span');
          lockedBadge.className = 'gp-related-chip locked';
          lockedBadge.textContent = `🔒 未取得（${rel.unlockLabel || '進行で解放'}）`;
          this.relatedList.appendChild(lockedBadge);
        }
      }
      this.relatedWrap.classList.remove('hidden');
    } else {
      this.relatedWrap.classList.add('hidden');
    }

    // Sync Back button visibility & previous term label
    const hasHistory = this.history.length > 0;
    const prevEntry = hasHistory ? this.history[this.history.length - 1] : null;
    const prevId = typeof prevEntry === 'string' ? prevEntry : prevEntry?.termId;
    const prevTerm = prevId ? getGlossaryTerm(prevId) : null;
    const prevShort = prevTerm ? prevTerm.title.split('（')[0] : '';

    if (this.backTopBtn) {
      this.backTopBtn.classList.toggle('hidden', !hasHistory);
      if (hasHistory) this.backTopBtn.textContent = '◀ 戻る';
    }
    if (this.backBottomBtn) {
      this.backBottomBtn.classList.toggle('hidden', !hasHistory);
      if (hasHistory) {
        this.backBottomBtn.textContent = `◀ ひとつ戻る（${prevShort}）`;
      }
    }

    if (this.bodyEl) this.bodyEl.scrollTop = 0;
    else if (this.cardEl) this.cardEl.scrollTop = 0;
  }

  close() {
    this.diagramPlayer.unmount();
    this._stopMiniSim();
    if (!this.root) return;
    this.root.classList.add('hidden');
  }
}

export const glossaryPopover = new GlossaryPopoverController();

/**
 * Attaches delegated click handling for `.term-link[data-term-id]` inside a container.
 */
export function bindGlossaryDelegation(containerEl, onBeforeOpen = null) {
  if (!containerEl) return;
  containerEl.addEventListener('click', (e) => {
    const btn = e.target.closest?.('.term-link[data-term-id]');
    if (!btn) return;
    e.stopPropagation();
    e.preventDefault();
    onBeforeOpen?.();
    sound.playSwitch(true);
    glossaryPopover.open(btn.dataset.termId);
  });
}
