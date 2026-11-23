/**
 * SILICON GENESIS — Full-Screen Title & Atmospheric Story Prologue Overlay
 */

import { CHARACTERS } from '../data/characters.js';
import { PROLOGUE_STEPS } from '../data/prologue.js?v=35';
import { STAGES } from '../data/stages.js?v=35';
import { collectTermIdsFromTexts } from '../data/glossary.js?v=35';
import { isChapter1Cleared, isChapter2Unlocked } from '../state/storage.js?v=35';
import { sound } from '../audio/sound.js?v=35';
import {
  mountRichText,
  updateRichTextProgress,
  bindGlossaryDelegation,
  glossaryPopover,
} from './glossaryPopover.js?v=35';
import { EndingSceneCanvas } from './endingCanvas.js?v=35';

export class PrologueOverlay {
  constructor(
    rootEl,
    { onFinish, onContinue, onStartChapter2, onReplayEnding1, onReplayEnding2 }
  ) {
    this.root = rootEl;
    this.onFinish = onFinish;
    this.onContinue = onContinue;
    this.onStartChapter2 = onStartChapter2;
    this.onReplayEnding1 = onReplayEnding1;
    this.onReplayEnding2 = onReplayEnding2;

    this.titleScreen = rootEl.querySelector('#title-screen');
    this.storyScreen = rootEl.querySelector('#prologue-story');
    this.btnStartNew = rootEl.querySelector('#btn-title-start');
    this.btnContinue = rootEl.querySelector('#btn-title-continue');
    this.btnChapter2 = rootEl.querySelector('#btn-title-chapter2');
    this.btnReplayPrologue = rootEl.querySelector('#btn-title-prologue');
    this.endingReplaysWrap = rootEl.querySelector('#title-ending-replays');
    this.btnReplayEnd1 = rootEl.querySelector('#btn-title-end1');
    this.btnReplayEnd2 = rootEl.querySelector('#btn-title-end2');
    this.titleProgressMeta = rootEl.querySelector('#title-progress-meta');

    this.bgImg = rootEl.querySelector('#pro-bg');
    this.endingCanvas = new EndingSceneCanvas(rootEl.querySelector('#pro-ending-canvas'));
    this.moodLayer = rootEl.querySelector('#pro-mood');
    this.datelineEl = rootEl.querySelector('#pro-dateline');
    this.chapterCard = rootEl.querySelector('#pro-chapter-card');
    this.relicCard = rootEl.querySelector('#pro-nand-relic');
    this.stepCounter = rootEl.querySelector('#pro-step-counter');
    this.btnSkip = rootEl.querySelector('#btn-pro-skip');
    this.portraitWrap = rootEl.querySelector('#pro-portrait-wrap');
    this.portraitImg = rootEl.querySelector('#pro-portrait');
    this.speakerName = rootEl.querySelector('#pro-speaker');
    this.speakerRole = rootEl.querySelector('#pro-role');
    this.textEl = rootEl.querySelector('#pro-text');
    this.termHintEl = rootEl.querySelector('#pro-term-hint');
    this.btnPrev = rootEl.querySelector('#btn-pro-prev');
    this.btnNext = rootEl.querySelector('#btn-pro-next');
    this.choicesWrap = rootEl.querySelector('#pro-choices');
    this.storyTapArea = rootEl.querySelector('#pro-tap-area');

    this.activeSteps = PROLOGUE_STEPS;
    this.activeEndLabel = 'ミッション開始 ▶';
    this.activeOnComplete = null;
    this.activeInPrologue = true;
    this.stepIdx = 0;
    this.fullText = '';
    this.charIdx = 0;
    this.typing = false;
    this._richNodes = [];
    this.awaitingChoice = false;
    this.pendingReply = null;
    this._timer = null;

    this._bindEvents();
  }

  _bindEvents() {
    this.btnStartNew.addEventListener('click', () => {
      sound.playPowerUp();
      this.startStory();
    });

    this.btnContinue.addEventListener('click', () => {
      sound.playSwitch(true);
      this.hide();
      this.onContinue?.();
    });

    this.btnChapter2?.addEventListener('click', () => {
      if (this.btnChapter2.classList.contains('locked')) {
        sound.playSwitch(false);
        this.onStartChapter2?.();
        return;
      }
      sound.playPowerUp();
      this.hide();
      this.onStartChapter2?.();
    });

    this.btnReplayPrologue.addEventListener('click', () => {
      sound.playPowerUp();
      this.startStory();
    });

    this.btnReplayEnd1?.addEventListener('click', () => {
      sound.playPowerUp();
      this.onReplayEnding1?.();
    });

    this.btnReplayEnd2?.addEventListener('click', () => {
      sound.playPowerUp();
      this.onReplayEnding2?.();
    });

    this.btnSkip.addEventListener('click', (e) => {
      e.stopPropagation();
      sound.playSwitch(false);
      this._finishStory();
    });

    this.btnPrev.addEventListener('click', (e) => {
      e.stopPropagation();
      this._goBack();
    });

    this.btnNext.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.awaitingChoice) return;
      this._advance();
    });

    this._downX = 0;
    this._downY = 0;
    this.storyTapArea.addEventListener('pointerdown', (e) => {
      this._downX = e.clientX;
      this._downY = e.clientY;
    });
    this.storyTapArea.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      if (this.awaitingChoice) return;
      if (Math.hypot(e.clientX - this._downX, e.clientY - this._downY) > 12) return;
      this._advance();
    });

    bindGlossaryDelegation(this.textEl, () => this._finishTypingNow());
  }

  showTitle(save) {
    this._stopTimer();
    const hasProgress = Boolean(
      save.seenPrologue || (save.clearedStages && save.clearedStages.length > 0)
    );
    const clearedCount = save.clearedStages?.length || 0;
    const curStage = STAGES.find((s) => s.id === save.currentStageId) || STAGES[0];
    const allChips = Object.values(save.customChips || {});
    const provisionedCount = allChips.filter((c) => c?.provisioned).length;
    const forgedCount = allChips.length - provisionedCount;

    this.root.classList.remove('hidden');
    this.titleScreen.classList.remove('hidden');
    this.storyScreen.classList.add('hidden');
    sound.setBgmTrack('title');

    if (hasProgress) {
      this.btnStartNew.classList.add('hidden');
      this.btnContinue.classList.remove('hidden');
      this.btnReplayPrologue.classList.remove('hidden');
      this.btnContinue.textContent = `▶ つづきから（STAGE ${curStage.code}）`;
      this.titleProgressMeta.textContent =
        provisionedCount > 0
          ? `自作クリア: ${clearedCount} / ${STAGES.length} · チップ: 自作 ${forgedCount}種 / 支給品 ${provisionedCount}種`
          : `復興進捗: ${clearedCount} / ${STAGES.length} 回路復元済 · 自作チップ ${forgedCount}種`;
      this.titleProgressMeta.classList.remove('hidden');
    } else {
      this.btnStartNew.classList.remove('hidden');
      this.btnContinue.classList.add('hidden');
      this.btnReplayPrologue.classList.add('hidden');
      this.titleProgressMeta.classList.add('hidden');
    }

    if (this.btnChapter2) {
      const ch2Open = isChapter2Unlocked(save);
      const ch2Stages = STAGES.filter((s) => s.chapter === 2);
      const clearedSet = new Set(save.clearedStages || []);
      const anyCh2Cleared = ch2Stages.some((s) => clearedSet.has(s.id));
      const nextCh2 = ch2Stages.find((s) => !clearedSet.has(s.id)) || ch2Stages[ch2Stages.length - 1];
      this.btnChapter2.classList.toggle('locked', !ch2Open);
      this.btnChapter2.setAttribute('aria-disabled', ch2Open ? 'false' : 'true');
      if (!ch2Open) {
        this.btnChapter2.textContent = '🔒 第二章：青空への帰還（第一章クリアで解放）';
      } else {
        this.btnChapter2.textContent =
          anyCh2Cleared && nextCh2
            ? `☀ 第二章：青空への帰還（STAGE ${nextCh2.code}〜）`
            : '☀ 第二章：青空への帰還（STAGE 18〜）';
      }
    }
    if (this.endingReplaysWrap) {
      const ch1Done = isChapter1Cleared(save);
      const ch2Done = Boolean(save?.clearedStages?.includes('stage_24'));
      this.endingReplaysWrap.classList.toggle('hidden', !ch1Done && !ch2Done);
      this.btnReplayEnd1?.classList.toggle('hidden', !ch1Done);
      this.btnReplayEnd2?.classList.toggle('hidden', !ch2Done);
    }
  }

  startStory() {
    this.playSequence(PROLOGUE_STEPS, {
      endBtnLabel: 'ミッション開始 ▶',
      onComplete: this.onFinish,
      inPrologue: true,
    });
  }

  playEnding(steps, { endBtnLabel = '達成レコードへ ▶', onComplete = null } = {}) {
    this.playSequence(steps, {
      endBtnLabel,
      onComplete,
      inPrologue: false,
    });
  }

  playSequence(steps, { endBtnLabel = '次へ ▶', onComplete = null, inPrologue = false } = {}) {
    this._stopTimer();
    this.endingCanvas.stop();
    this.activeSteps = Array.isArray(steps) && steps.length > 0 ? steps : PROLOGUE_STEPS;
    this.activeEndLabel = endBtnLabel;
    this.activeOnComplete = onComplete;
    this.activeInPrologue = Boolean(inPrologue);

    this.root.classList.remove('hidden');
    this.titleScreen.classList.add('hidden');
    this.storyScreen.classList.remove('hidden');
    this.stepIdx = 0;
    this.pendingReply = null;
    this.awaitingChoice = false;
    this._renderStep(0);
  }

  hide() {
    this._stopTimer();
    this.endingCanvas.setScene(null);
    glossaryPopover.close();
    glossaryPopover.setActiveStoryContext({ activeTerms: null, inPrologue: false });
    this.root.classList.add('hidden');
  }

  _renderStep(idx, { instant = false } = {}) {
    const steps = this.activeSteps || PROLOGUE_STEPS;
    const step = steps[idx];
    if (!step) {
      this._finishStory();
      return;
    }

    // Strict position-based unlocking in prologue; in endings allow all terms unlocked by current save!
    const seenTexts = steps.slice(0, idx + 1).map((s) => s.text);
    const save = this.activeInPrologue ? null : glossaryPopover.getSave();
    const activeTerms = collectTermIdsFromTexts(seenTexts, save);
    glossaryPopover.setActiveStoryContext({ activeTerms, inPrologue: this.activeInPrologue });

    this.awaitingChoice = false;
    this.pendingReply = false;
    this.choicesWrap.classList.add('hidden');
    this.choicesWrap.innerHTML = '';
    this.btnPrev.disabled = idx <= 0;
    this.btnNext.disabled = false;

    // Live 16-bit Pixel-Art Ending Scene Canvas OR Backdrop Image
    if (step.canvasScene) {
      this.endingCanvas.setScene(step.canvasScene, { phase: step.canvasPhase || 0 });
    } else {
      this.endingCanvas.setScene(null);
    }

    // Backdrop transition (also stays underneath as fallback)
    if (step.scene && this.bgImg.getAttribute('src') !== step.scene) {
      this.bgImg.classList.remove('bg-fade-in');
      void this.bgImg.offsetWidth;
      this.bgImg.src = step.scene;
      this.bgImg.classList.add('bg-fade-in');
    }

    // Mood lighting & optional screen shake
    this.moodLayer.className = `pro-mood mood-${step.mood || 'dim'}`;
    this.storyScreen.classList.remove('pro-shake');
    if (step.fx === 'shake' && !instant) {
      void this.storyScreen.offsetWidth;
      this.storyScreen.classList.add('pro-shake');
    }

    // SFX & director-curated BGM mood cues (resolves accurately even when stepping backward!)
    sound.setBgmTrack(this._resolveStepBgm(idx));

    if (!instant) {
      if (step.sfx === 'alarm') sound.playAlarm();
      else if (step.sfx === 'powerup') sound.playPowerUp();
    }

    // Dateline & step counter
    this.datelineEl.textContent = step.dateline || '';
    this.stepCounter.textContent = `${idx + 1} / ${steps.length}`;

    // Cinematic chapter / ending interstitial banner
    if (this.chapterCard) {
      if (step.chapterCard) {
        const cc = step.chapterCard;
        this.chapterCard.innerHTML = `
          <div class="ch-roman">${cc.roman}</div>
          <div class="ch-title">${cc.title}</div>
          <div class="ch-sub">${cc.sub}</div>
        `;
        this.chapterCard.classList.remove('hidden');
      } else {
        this.chapterCard.classList.add('hidden');
      }
    }

    // NAND relic showcase card
    this.relicCard.classList.toggle('hidden', !step.showNandRelic);

    // Speaker & portrait
    this._applySpeaker(step.speaker);
    if (this.textEl) this.textEl.scrollTop = 0;
    const afterText = () => {
      if (step.choices && step.choices.length > 0) {
        this._showChoices(step.choices);
      }
    };
    if (instant) {
      this._stopTimer();
      this.fullText = step.text;
      const mounted = mountRichText(this.textEl, step.text, { instant: true });
      this._richNodes = mounted.nodes;
      if (this.termHintEl) this.termHintEl.classList.toggle('hidden', !mounted.hasTerms);
      this.typing = false;
      this.btnNext.textContent =
        this.stepIdx >= steps.length - 1 ? this.activeEndLabel : '次へ ▶';
      afterText();
    } else {
      this._typeText(step.text, step.speaker, afterText);
    }
  }

  _applySpeaker(speakerKey) {
    if (!speakerKey) {
      this.portraitWrap.classList.add('hidden');
      this.speakerName.textContent = 'SYSTEM ARCHIVE';
      this.speakerName.style.color = '#b88a48';
      this.speakerRole.textContent = '地下シェルター記録ログ';
      this.storyScreen.style.setProperty('--pro-accent', '#b88a48');
      return;
    }
    const ch = CHARACTERS[speakerKey] || CHARACTERS.kagari;
    this.portraitWrap.classList.remove('hidden');
    this.portraitImg.src = ch.portrait;
    this.portraitImg.alt = ch.name;
    this.speakerName.textContent = ch.name;
    this.speakerName.style.color = ch.color;
    this.speakerRole.textContent = ch.role;
    this.storyScreen.style.setProperty('--pro-accent', ch.color);
  }

  _typeText(text, speakerKey, onDone = null) {
    this._stopTimer();
    this.fullText = text;
    this.charIdx = 0;
    this.typing = true;
    const mounted = mountRichText(this.textEl, text, { instant: false });
    this._richNodes = mounted.nodes;
    if (this.termHintEl) this.termHintEl.classList.toggle('hidden', !mounted.hasTerms);
    const steps = this.activeSteps || PROLOGUE_STEPS;
    this.btnNext.textContent =
      this.stepIdx >= steps.length - 1 ? this.activeEndLabel : '次へ ▶';
    this._onTypeDone = onDone;

    const pitch =
      speakerKey === 'mina' ? 560 : speakerKey === 'kagari' ? 420 : speakerKey === 'hako' ? 310 : 370;

    this._timer = setInterval(() => {
      this.charIdx += 2;
      if (this.charIdx >= this.fullText.length) {
        this._finishTypingNow();
      } else {
        updateRichTextProgress(this._richNodes, this.charIdx);
        if (this.charIdx % 6 === 0) sound.playBlip(pitch);
      }
    }, 24);
  }

  _finishTypingNow() {
    if (!this.typing) return;
    this._stopTimer();
    this.charIdx = this.fullText.length;
    updateRichTextProgress(this._richNodes, this.charIdx);
    this.typing = false;
    if (this._onTypeDone) {
      const cb = this._onTypeDone;
      this._onTypeDone = null;
      cb();
    }
  }

  _showChoices(choices) {
    this.awaitingChoice = true;
    this.btnNext.disabled = true;
    this.btnNext.textContent = '返答を選択';
    this.choicesWrap.innerHTML = '';
    this.choicesWrap.classList.remove('hidden');

    choices.forEach((choice) => {
      const btn = document.createElement('button');
      btn.className = 'pro-choice-btn';
      btn.textContent = choice.label;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        sound.playWireConnect();
        this.awaitingChoice = false;
        this.btnNext.disabled = false;
        this.choicesWrap.classList.add('hidden');
        this.pendingReply = true;
        this._applySpeaker(choice.replySpeaker);
        this._typeText(choice.replyText, choice.replySpeaker);
      });
      this.choicesWrap.appendChild(btn);
    });
  }

  _goBack() {
    this._stopTimer();
    if (this.pendingReply) {
      // Return from choice reaction back to the choice prompt cleanly!
      sound.playSwitch(false);
      this._renderStep(this.stepIdx, { instant: true });
      return;
    }
    if (this.stepIdx <= 0) return;
    sound.playSwitch(false);
    this.stepIdx--;
    this._renderStep(this.stepIdx, { instant: true });
  }

  _advance() {
    if (this.typing) {
      this._finishTypingNow();
      return;
    }

    const steps = this.activeSteps || PROLOGUE_STEPS;
    sound.playSwitch(true);
    this.pendingReply = false;
    this.stepIdx++;
    if (this.stepIdx >= steps.length) {
      this._finishStory();
    } else {
      this._renderStep(this.stepIdx);
    }
  }

  _finishStory() {
    const doneCb = this.activeOnComplete || this.onFinish;
    this.activeOnComplete = null;
    this.hide();
    doneCb?.();
  }

  _resolveStepBgm(idx) {
    const steps = this.activeSteps || PROLOGUE_STEPS;
    for (let i = idx; i >= 0; i--) {
      if (steps[i]?.bgm) return steps[i].bgm;
    }
    const mood = steps[idx]?.mood;
    if (mood === 'alert') return 'crisis';
    if (mood === 'amber' || mood === 'dawn' || mood === 'bluesky') return 'finale';
    if (mood === 'calm') return 'story';
    return 'title';
  }

  _stopTimer() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }
}
