/**
 * SILICON GENESIS — Tappable Story Glossary Popover & Stable Rich-Text Typewriter
 *
 * Renders dialogue tokens into stable DOM nodes (plain Text nodes + <button class="term-link">)
 * so tapping a highlighted technical term works reliably even while the rest of a line is
 * still typing, and NEVER triggers dialogue advance.
 */

import { getGlossaryTerm, tokenizeGlossaryText, hasGlossaryTerms } from '../data/glossary.js?v=17';
import { sound } from '../audio/sound.js?v=17';

/**
 * Populates containerEl with one stable DOM node per token (all initially empty for typing,
 * or full when instant=true). Returns node metadata for zero-thrash typewriter updates.
 */
export function mountRichText(containerEl, text, { instant = false } = {}) {
  const tokens = tokenizeGlossaryText(text);
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
 * Already-typed buttons stay untouched in the DOM so touch/click never drops!
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
    this.categoryEl = null;
    this.titleEl = null;
    this.readingEl = null;
    this.summaryEl = null;
    this.analogyWrap = null;
    this.analogyEl = null;
    this.relatedWrap = null;
    this.relatedList = null;
    this.closeBtn = null;
    this.doneBtn = null;
    this._bound = false;
  }

  _ensureBound() {
    if (this._bound) return Boolean(this.root);
    if (typeof document === 'undefined') return false;
    const root = document.getElementById('glossary-popover');
    if (!root) return false;

    this.root = root;
    this.categoryEl = root.querySelector('#gp-category');
    this.titleEl = root.querySelector('#gp-title');
    this.readingEl = root.querySelector('#gp-reading');
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

  open(termId) {
    if (!this._ensureBound()) return;
    const term = getGlossaryTerm(termId);
    if (!term) return;

    this.categoryEl.textContent = `📖 用語解説 // ${term.category}`;
    this.titleEl.textContent = term.title;
    this.readingEl.textContent = term.reading || '';
    this.readingEl.classList.toggle('hidden', !term.reading);
    this.summaryEl.textContent = term.summary;

    if (term.analogy) {
      this.analogyEl.textContent = term.analogy;
      this.analogyWrap.classList.remove('hidden');
    } else {
      this.analogyWrap.classList.add('hidden');
    }

    // Related tappable term pills for curious beginners
    this.relatedList.textContent = '';
    const relatedEntries = (term.related || [])
      .map((id) => getGlossaryTerm(id))
      .filter(Boolean);

    if (relatedEntries.length > 0) {
      for (const rel of relatedEntries) {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'gp-related-chip';
        chip.textContent = rel.title.split('（')[0];
        chip.addEventListener('click', (e) => {
          e.stopPropagation();
          sound.playSwitch(true);
          this.open(rel.id);
        });
        this.relatedList.appendChild(chip);
      }
      this.relatedWrap.classList.remove('hidden');
    } else {
      this.relatedWrap.classList.add('hidden');
    }

    this.root.classList.remove('hidden');
  }

  close() {
    if (!this.root) return;
    this.root.classList.add('hidden');
  }
}

export const glossaryPopover = new GlossaryPopoverController();

/**
 * Attaches delegated click handling for `.term-link[data-term-id]` inside a container.
 * Stops event propagation so tapping a term never advances dialogue.
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
