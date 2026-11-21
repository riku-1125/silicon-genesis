/**
 * SILICON GENESIS — Story Dialogue & Spacious Mobile Story-Theater Controller
 *
 * Uses a spacious full-screen visual-novel reader (#story-theater) whenever
 * multi-line intro/outro story conversations play (so mobile players get big,
 * crisp, unclipped Japanese text!), and collapses down to a compact, unclipped
 * Mission Strip (#dialogue-box) during active circuit wiring.
 */

import { CHARACTERS, SCENES } from '../data/characters.js';
import { STAGES } from '../data/stages.js?v=27';
import { collectTermIdsFromTexts } from '../data/glossary.js?v=27';
import { sound } from '../audio/sound.js?v=27';
import {
  mountRichText,
  updateRichTextProgress,
  bindGlossaryDelegation,
  glossaryPopover,
} from './glossaryPopover.js?v=27';
import { StoryDiagramPlayer } from './storyDiagram.js?v=27';

export class DialogueController {
  constructor(stripEl, theaterEl) {
    // Compact Mission Strip (above workbench)
    this.strip = stripEl;
    this.stripPortrait = stripEl.querySelector('#dlg-portrait');
    this.stripSpeaker = stripEl.querySelector('#dlg-speaker');
    this.stripProgress = stripEl.querySelector('#dlg-progress');
    this.stripText = stripEl.querySelector('#dlg-text');
    this.btnOpenStory = stripEl.querySelector('#btn-open-story');

    // Spacious Story Theater Overlay
    this.theater = theaterEl;
    this.stBg = theaterEl.querySelector('#st-bg');
    this.stBadge = theaterEl.querySelector('#st-stage-badge');
    this.stProgress = theaterEl.querySelector('#st-progress');
    this.btnSkip = theaterEl.querySelector('#btn-st-skip');
    this.stVisualCard = theaterEl.querySelector('#st-visual-card');
    this.stCard = theaterEl.querySelector('#st-card');
    this.stPortrait = theaterEl.querySelector('#st-portrait');
    this.stSpeaker = theaterEl.querySelector('#st-speaker');
    this.stRole = theaterEl.querySelector('#st-role');
    this.stTextScroll = theaterEl.querySelector('.st-text-scroll');
    this.stText = theaterEl.querySelector('#st-text');
    this.stTapHint = theaterEl.querySelector('.st-tap-hint');
    this.btnPrev = theaterEl.querySelector('#btn-st-prev');
    this.btnNext = theaterEl.querySelector('#btn-st-next');

    this.lines = [];
    this.index = 0;
    this.fullText = '';
    this.charIdx = 0;
    this.typing = false;
    this._richNodes = [];
    this._timer = null;
    this.onComplete = null;
    this.idleGoal = '';
    this.endBtnLabel = '作業を始める ▶';
    this.diagramPlayer = new StoryDiagramPlayer();

    // Reopen stage intro story from mission strip
    const reopen = (e) => {
      e.stopPropagation();
      this.strip.dispatchEvent(new CustomEvent('replay-intro', { bubbles: true }));
    };
    this.btnOpenStory.addEventListener('click', reopen);
    this.strip.addEventListener('click', reopen);

    // Story theater controls
    this.btnSkip.addEventListener('click', (e) => {
      e.stopPropagation();
      sound.playSwitch(false);
      this._finishLines();
    });
    this.btnPrev.addEventListener('click', (e) => {
      e.stopPropagation();
      this.goBack();
    });
    this.btnNext.addEventListener('click', (e) => {
      e.stopPropagation();
      this.advance();
    });
    this._downX = 0;
    this._downY = 0;
    this.theater.addEventListener('pointerdown', (e) => {
      this._downX = e.clientX;
      this._downY = e.clientY;
    });
    this.theater.addEventListener('click', (e) => {
      if (e.target.closest('button, .vc-live-canvas')) return;
      if (Math.hypot(e.clientX - this._downX, e.clientY - this._downY) > 12) return;
      this.advance();
    });

    bindGlossaryDelegation(this.stText, () => this._finishTypingNow());
    bindGlossaryDelegation(this.stVisualCard, () => this._finishTypingNow());
  }

  playLines(
    lines,
    {
      onComplete = null,
      fallbackGoal = '',
      incidentBrief = null,
      sceneKey = 'shelter_hub',
      stageBadge = '',
      endLabel = '回路を組む ▶',
    } = {}
  ) {
    this._stopTimer();
    this.lines = Array.isArray(lines) ? lines : [];
    this.index = 0;
    this.onComplete = onComplete;
    this.endBtnLabel = endLabel;
    this.incidentBrief = incidentBrief;
    if (fallbackGoal) this.idleGoal = fallbackGoal;

    // Update compact mission strip immediately so it's ready underneath
    this.showGoal(this.idleGoal, 'hako', incidentBrief);

    if (this.lines.length === 0) {
      this.theater.classList.add('hidden');
      if (this.onComplete) this.onComplete();
      return;
    }

    const sceneDef = SCENES[sceneKey] || SCENES.shelter_hub;
    this.stBg.src = sceneDef.image;
    this.stBadge.textContent = stageBadge || sceneDef.label;
    this.theater.classList.remove('hidden');
    this._showLine(0);
  }

  showGoal(goalText, speakerKey = 'hako', incidentBrief = null) {
    this.idleGoal = goalText;
    const ch = CHARACTERS[speakerKey] || CHARACTERS.hako;
    this.stripPortrait.src = ch.portrait;
    this.stripPortrait.alt = ch.name;
    this.stripSpeaker.textContent = incidentBrief ? `🚨 ${incidentBrief.where}` : ch.name;
    this.stripSpeaker.style.color = incidentBrief ? '#ffb84d' : ch.color;
    this.stripProgress.textContent = incidentBrief ? 'TROUBLE' : 'MISSION';
    this.stripText.textContent = incidentBrief
      ? `${incidentBrief.shortRule || incidentBrief.condition}`
      : goalText;
    this.strip.style.setProperty('--speaker-color', ch.color);
  }

  isOpen() {
    return !this.theater.classList.contains('hidden');
  }

  close() {
    this._stopTimer();
    this.diagramPlayer.unmount();
    glossaryPopover.close();
    glossaryPopover.setActiveStoryContext({ activeTerms: null, inPrologue: false });
    this.theater.classList.add('hidden');
  }

  _showLine(idx, { instant = false } = {}) {
    const line = this.lines[idx];
    if (!line) return;
    const ch = CHARACTERS[line.speaker] || CHARACTERS.kagari;

    // Position-aware glossary lock: ONLY terms from already-cleared stages + lines 0..idx of the current conversation are unlocked!
    const save = glossaryPopover.getSave();
    const clearedSet = new Set(save?.clearedStages || []);
    const clearedStageTexts = STAGES.filter((s) => clearedSet.has(s.id)).flatMap((s) => [
      ...(s.introDialogue || []).flatMap((l) => [l.text, l.visualCard?.rule || '']),
      ...(s.outroDialogue || []).flatMap((l) => [l.text, l.visualCard?.rule || '']),
    ]);
    const seenTexts = [
      ...clearedStageTexts,
      ...this.lines.slice(0, idx + 1).flatMap((l) => [l.text, l.visualCard?.rule || '']),
    ];
    const activeTerms = collectTermIdsFromTexts(seenTexts, save);
    glossaryPopover.setActiveStoryContext({ activeTerms, inPrologue: false });

    this.stPortrait.src = ch.portrait;
    this.stPortrait.alt = ch.name;
    this.stSpeaker.textContent = ch.name;
    this.stSpeaker.style.color = ch.color;
    this.stRole.textContent = ch.role;
    this.theater.style.setProperty('--pro-accent', ch.color);
    this.btnPrev.disabled = idx <= 0;

    // Optional illustrated / live-animated guide card OR automatic Incident Trouble Summary Card!
    this.diagramPlayer.unmount();
    let cardHasTerms = false;
    if (this.stVisualCard) {
      const isLastLine = idx === this.lines.length - 1;
      if (line.visualCard) {
        const vc = line.visualCard;
        this.stVisualCard.className = 'st-visual-card';
        this.stVisualCard.style.setProperty('--vc-accent', vc.accent || '#ffb84d');
        this.stVisualCard.innerHTML = `
          <div class="vc-tag">${vc.tag || '博士のメモ'}</div>
          <div class="vc-title">${vc.title || ''}</div>
          ${
            vc.anim
              ? `<div class="vc-live-wrap"><canvas class="vc-live-canvas" aria-label="${vc.title || '動く論理図解'}"></canvas></div>`
              : vc.diagram
                ? `<div class="vc-diagram">${vc.diagram}</div>`
                : ''
          }
          <div class="vc-rule"></div>
        `;
        const ruleEl = this.stVisualCard.querySelector('.vc-rule');
        if (ruleEl && vc.rule) {
          const mountedRule = mountRichText(ruleEl, vc.rule, { instant: true });
          cardHasTerms = mountedRule.hasTerms;
        }
        if (vc.anim) {
          const liveCanvas = this.stVisualCard.querySelector('.vc-live-canvas');
          if (liveCanvas) this.diagramPlayer.mount(liveCanvas, vc.anim);
        }
      } else if (this.incidentBrief && (line.showIncident || isLastLine)) {
        const ib = this.incidentBrief;
        this.stVisualCard.className = 'st-visual-card st-incident-card';
        this.stVisualCard.style.setProperty('--vc-accent', '#ff7b6b');
        this.stVisualCard.innerHTML = `
          <div class="inc-head">🚨 現場トラブル要約 // ${ib.where}</div>
          <div class="inc-row"><span class="inc-lbl bad">異常</span><span>${ib.trouble}</span></div>
          <div class="inc-row"><span class="inc-lbl ok">目標</span><span class="inc-cond">${ib.condition}</span></div>
        `;
      } else {
        this.stVisualCard.className = 'st-visual-card hidden';
        this.stVisualCard.innerHTML = '';
      }
    }

    this.fullText = line.text;
    if (this.stTextScroll) this.stTextScroll.scrollTop = 0;
    this.stProgress.textContent = `${idx + 1} / ${this.lines.length}`;
    this.btnNext.textContent = idx < this.lines.length - 1 ? '次へ ▶' : this.endBtnLabel;

    this._stopTimer();
    const mounted = mountRichText(this.stText, this.fullText, { instant });
    this._richNodes = mounted.nodes;
    if (this.stTapHint) {
      const anyTerms = mounted.hasTerms || cardHasTerms;
      this.stTapHint.textContent = anyTerms ? '💡 下線タップで用語解説' : 'タップでも進む';
      this.stTapHint.classList.toggle('term-hint-active', anyTerms);
    }

    if (instant) {
      this.charIdx = this.fullText.length;
      this.typing = false;
      return;
    }

    this.charIdx = 0;
    this.typing = true;

    const pitch = line.speaker === 'mina' ? 560 : line.speaker === 'kagari' ? 420 : 320;
    this._timer = setInterval(() => {
      this.charIdx += 2;
      if (this.charIdx >= this.fullText.length) {
        this._finishTypingNow();
      } else {
        updateRichTextProgress(this._richNodes, this.charIdx);
        if (this.charIdx % 6 === 0) sound.playBlip(pitch);
      }
    }, 22);
  }

  _finishTypingNow() {
    if (!this.typing) return;
    this._stopTimer();
    this.charIdx = this.fullText.length;
    updateRichTextProgress(this._richNodes, this.charIdx);
    this.typing = false;
  }

  goBack() {
    if (this.lines.length === 0 || this.index <= 0) return;
    sound.playSwitch(false);
    this.index--;
    this._showLine(this.index, { instant: true });
  }

  advance() {
    if (this.lines.length === 0) {
      this.theater.classList.add('hidden');
      return;
    }
    if (this.typing) {
      this._finishTypingNow();
      return;
    }
    sound.playSwitch(true);
    if (this.index < this.lines.length - 1) {
      this.index++;
      this._showLine(this.index);
    } else {
      this._finishLines();
    }
  }

  _finishLines() {
    this._stopTimer();
    this.diagramPlayer.unmount();
    glossaryPopover.close();
    this.lines = [];
    this.typing = false;
    this.theater.classList.add('hidden');
    const cb = this.onComplete;
    this.onComplete = null;
    if (cb) cb();
  }

  _stopTimer() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }
}
