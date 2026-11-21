/**
 * SILICON GENESIS — Tappable Story Glossary Popover (with Live Module Diagrams & Back History)
 *
 * Features:
 *   - Stable DOM-node typewriter (`mountRichText` / `updateRichTextProgress`) so tapping
 *     a highlighted term never drops clicks mid-typing and never advances the story.
 *   - Live interactive animated diagram (`StoryDiagramPlayer`) embedded directly inside
 *     the popover whenever the term represents a module, gate, or physical circuit!
 *   - History stack (`◀ ひとつ戻る`) when jumping across related terms or inline term links.
 */

import { getGlossaryTerm, tokenizeGlossaryText, hasGlossaryTerms } from '../data/glossary.js?v=18';
import { sound } from '../audio/sound.js?v=18';
import { StoryDiagramPlayer } from './storyDiagram.js?v=18';

/**
 * Populates containerEl with one stable DOM node per token (all initially empty for typing,
 * or full when instant=true). Returns node metadata for zero-thrash typewriter updates.
 */
export function mountRichText(containerEl, text, { instant = false, excludeTermId = null } = {}) {
  const tokens = tokenizeGlossaryText(text, excludeTermId);
  containerEl.textContent = '';

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
    this.diagramWrap = null;
    this.diagramCanvas = null;
    this.summaryEl = null;
    this.analogyWrap = null;
    this.analogyEl = null;
    this.relatedWrap = null;
    this.relatedList = null;
    this.closeBtn = null;
    this.doneBtn = null;

    this.currentTermId = null;
    this.history = [];
    this.diagramPlayer = new StoryDiagramPlayer();
    this._bound = false;
  }

  _ensureBound() {
    if (this._bound) return Boolean(this.root);
    if (typeof document === 'undefined') return false;
    const root = document.getElementById('glossary-popover');
    if (!root) return false;

    this.root = root;
    this.cardEl = root.querySelector('.gp-card');
    this.categoryEl = root.querySelector('#gp-category');
    this.backTopBtn = root.querySelector('#gp-back-top');
    this.backBottomBtn = root.querySelector('#gp-back-bottom');
    this.titleEl = root.querySelector('#gp-title');
    this.readingEl = root.querySelector('#gp-reading');
    this.pinsWrap = root.querySelector('#gp-pins-wrap');
    this.diagramWrap = root.querySelector('#gp-diagram-wrap');
    this.diagramCanvas = root.querySelector('#gp-live-canvas');
    this.summaryEl = root.querySelector('#gp-summary');
    this.analogyWrap = root.querySelector('#gp-analogy-wrap');
    this.analogyEl = root.querySelector('#gp-analogy');
    this.relatedWrap = root.querySelector('#gp-related-wrap');
    this.relatedList = root.querySelector('#gp-related-list');
    this.closeBtn = root.querySelector('#gp-close');
    this.doneBtn = root.querySelector('#gp-done');

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

    // Allow tapping inline highlighted terms inside the popover's own summary text!
    this.summaryEl?.addEventListener('click', (e) => {
      const btn = e.target.closest?.('.term-link[data-term-id]');
      if (!btn) return;
      e.stopPropagation();
      e.preventDefault();
      sound.playSwitch(true);
      this.navigateTo(btn.dataset.termId);
    });

    this.root.addEventListener('click', (e) => {
      e.stopPropagation();
      if (e.target === this.root) {
        sound.playSwitch(false);
        this.close();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) {
        e.stopPropagation();
        sound.playSwitch(false);
        this.close();
      }
    });

    this._bound = true;
    return true;
  }

  isOpen() {
    return Boolean(this.root && !this.root.classList.contains('hidden'));
  }

  /** Opens a term fresh (resets history stack unless pushHistory=true). */
  open(termId, { pushHistory = false } = {}) {
    if (!this._ensureBound()) return;
    const term = getGlossaryTerm(termId);
    if (!term) return;

    if (pushHistory && this.currentTermId && this.currentTermId !== termId) {
      this.history.push(this.currentTermId);
    } else if (!pushHistory) {
      this.history = [];
    }

    this.currentTermId = termId;
    this._renderTerm(term);
    this.root.classList.remove('hidden');
  }

  /** Navigates to another term from inside the popover, pushing current onto history. */
  navigateTo(termId) {
    if (!termId || termId === this.currentTermId) return;
    this.open(termId, { pushHistory: true });
  }

  /** Steps back to the previous term in the browsing history stack. */
  goBack() {
    if (this.history.length === 0) return;
    sound.playSwitch(false);
    const prevId = this.history.pop();
    const prevTerm = getGlossaryTerm(prevId);
    if (!prevTerm) return;
    this.currentTermId = prevId;
    this._renderTerm(prevTerm);
  }

  _renderTerm(term) {
    this.diagramPlayer.unmount();

    this.categoryEl.textContent = `📖 用語解説 // ${term.category}`;
    this.titleEl.textContent = term.title;
    this.readingEl.textContent = term.reading || '';
    this.readingEl.classList.toggle('hidden', !term.reading);

    // Optional module input/output pin spec badges
    if (this.pinsWrap) {
      if (term.pins) {
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

    // Embedded Live Interactive Diagram for Modules & Circuit Concepts!
    if (this.diagramWrap && this.diagramCanvas) {
      if (term.anim) {
        this.diagramWrap.classList.remove('hidden');
        requestAnimationFrame(() => {
          if (this.isOpen() && this.currentTermId === term.id) {
            this.diagramPlayer.mount(this.diagramCanvas, term.anim);
          }
        });
      } else {
        this.diagramWrap.classList.add('hidden');
      }
    }

    // Summary with inline tappable terms (excluding current term)
    mountRichText(this.summaryEl, term.summary, { instant: true, excludeTermId: term.id });

    if (term.analogy) {
      this.analogyEl.textContent = term.analogy;
      this.analogyWrap.classList.remove('hidden');
    } else {
      this.analogyWrap.classList.add('hidden');
    }

    // Related tappable term pills
    this.relatedList.textContent = '';
    const relatedEntries = (term.related || [])
      .map((id) => getGlossaryTerm(id))
      .filter(Boolean);

    if (relatedEntries.length > 0) {
      for (const rel of relatedEntries) {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'gp-related-chip';
        chip.textContent = `${rel.anim ? '⚡ ' : ''}${rel.title.split('（')[0]}`;
        chip.addEventListener('click', (e) => {
          e.stopPropagation();
          sound.playSwitch(true);
          this.navigateTo(rel.id);
        });
        this.relatedList.appendChild(chip);
      }
      this.relatedWrap.classList.remove('hidden');
    } else {
      this.relatedWrap.classList.add('hidden');
    }

    // Sync Back button visibility & previous term label
    const hasHistory = this.history.length > 0;
    const prevTerm = hasHistory ? getGlossaryTerm(this.history[this.history.length - 1]) : null;
    const prevShort = prevTerm ? prevTerm.title.split('（')[0] : '';

    if (this.backTopBtn) {
      this.backTopBtn.classList.toggle('hidden', !hasHistory);
      if (hasHistory) this.backTopBtn.textContent = `◀ 戻る`;
    }
    if (this.backBottomBtn) {
      this.backBottomBtn.classList.toggle('hidden', !hasHistory);
      if (hasHistory) {
        this.backBottomBtn.textContent = `◀ ひとつ戻る（${prevShort}）`;
      }
    }

    if (this.cardEl) this.cardEl.scrollTop = 0;
  }

  close() {
    this.diagramPlayer.unmount();
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
