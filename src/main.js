/**
 * SILICON GENESIS — Main Application Orchestrator
 */

import { STAGES, ACTS, getStageById } from './data/stages.js?v=36';
import {
  buildChapter1EndingSteps,
  buildChapter2EndingSteps,
} from './data/endings.js?v=36';
import {
  PRIMITIVE_CHIPS,
  getChipDef,
  createEmptyCircuit,
  cloneCircuit,
  connectWire,
  removeNode,
  removeWire,
  computeCircuitMetrics,
} from './engine/circuit.js';
import { compileCircuit } from './engine/simulator.js';
import { evaluateStage, reproduceDiagnosticState } from './engine/evaluator.js';
import { provisionStandardChips } from './engine/blueprints.js';
import {
  loadSaveData,
  persistSaveData,
  resetSaveData,
  isChapter2Unlocked,
} from './state/storage.js?v=36';
import { sound } from './audio/sound.js?v=36';
import { SceneCanvas } from './ui/sceneCanvas.js?v=36';
import { WorkbenchCanvas } from './ui/workbenchCanvas.js?v=36';
import { PhysicsLabCanvas } from './ui/physicsLab.js?v=36';
import { AssemblyIdePanel } from './ui/assemblyIde.js?v=36';
import { DialogueController } from './ui/dialogue.js?v=36';
import { ModalManager } from './ui/modals.js?v=36';
import { PrologueOverlay } from './ui/prologue.js?v=36';
import { glossaryPopover } from './ui/glossaryPopover.js?v=36';

class SiliconGenesisApp {
  constructor() {
    this.save = loadSaveData();
    glossaryPopover.setSaveProvider(() => this.save);
    sound.setEnabled(this.save.soundEnabled);
    sound.setVolume(this.save.soundVolume ?? 0.8);
    sound.setBgmEnabled(this.save.bgmEnabled !== false);
    sound.setBgmVolume(this.save.bgmVolume ?? 0.55);
    sound.setDroneEnabled(this.save.droneEnabled);

    this.stage = null;
    this.circuit = null;
    this.simulator = null;
    this.inputBits = [];
    this.undoStack = [];
    this.redoStack = [];
    this.hintLevel = 1;
    this.isRunningTest = false;
    this._testRunToken = 0;
    this.lastEvalResult = null;
    this._pendingFinalClockResolve = null;
    this.selection = { nodeId: null, wireId: null, pendingPin: null, armedChipType: null };

    this._cacheDom();
    this.sceneCanvas = new SceneCanvas(this.dom.sceneCanvas);
    this.dialogue = new DialogueController(this.dom.dialogueBox, this.dom.storyTheater);
    this.modals = new ModalManager(this.dom.modalBackdrop);
    this.prologue = new PrologueOverlay(this.dom.prologueOverlay, {
      onFinish: () => {
        this.save.seenPrologue = true;
        persistSaveData(this.save);
        this.loadStage(this.save.currentStageId || 'stage_00a', { autoIntro: true });
        requestAnimationFrame(() => this._fitActiveCanvas());
      },
      onContinue: () => {
        this.loadStage(this.save.currentStageId || 'stage_00a', { autoIntro: true });
        requestAnimationFrame(() => this._fitActiveCanvas());
      },
      onStartChapter2: () => {
        this.startChapter2();
      },
      onReplayEnding1: () => {
        this._playChapterEnding(1, {
          endBtnLabel: 'タイトルへ戻る ▶',
          onComplete: () => this.prologue.showTitle(this.save),
        });
      },
      onReplayEnding2: () => {
        this._playChapterEnding(2, {
          endBtnLabel: 'タイトルへ戻る ▶',
          onComplete: () => this.prologue.showTitle(this.save),
        });
      },
    });
    this.workbench = new WorkbenchCanvas(this.dom.workbenchCanvas, {
      onPlaceChip: (type, x, y) => this.placeChip(type, x, y),
      onGrabChip: () => sound.haptic(8),
      onMoveChip: (nodeId, x, y) => this.moveChip(nodeId, x, y),
      onConnectWire: (from, to) => this.addWire(from, to),
      onDeleteWire: (wireId) => this.deleteWire(wireId),
      onToggleInput: (pinIdx) => this.toggleInputBit(pinIdx),
      onSelectionChange: (sel) => this.handleSelectionChange(sel),
    });
    this.physicsLab = new PhysicsLabCanvas(this.dom.physicsLabCanvas, {
      onArmedChange: (partId) => {
        this.selection = { ...this.selection, armedChipType: partId };
        this._highlightArmedPalette();
        this._renderSelectionToolbar();
      },
      onSlotsChange: (slots) => {
        if (!this.stage) return;
        this.save.physicsDrafts[this.stage.id] = slots;
        persistSaveData(this.save);
      },
      onPartPlaced: () => sound.playChipPlace(),
      onPartRemoved: () => sound.playDelete(),
      onToggleControl: (val) => sound.playSwitch(Boolean(val)),
      onFinalClockTriggered: () => {
        if (this._pendingFinalClockResolve) {
          const resolve = this._pendingFinalClockResolve;
          this._pendingFinalClockResolve = null;
          resolve();
        }
      },
      onLiveState: ({ inputs, outputs, unstable }) => {
        this.inputBits = inputs;
        if (unstable) sound.playAlarm();
        this.sceneCanvas.setState({
          stage: this.stage,
          inputs,
          outputs,
          cleared: this.save.clearedStages.includes(this.stage.id),
          testing: this.isRunningTest,
          unstable,
        });
      },
    });
    this.assemblyIde = new AssemblyIdePanel(this.dom.assemblyIde, this.dom.paletteScroll, {
      onSlotsChange: (slots) => {
        if (!this.stage) return;
        this.save.physicsDrafts[this.stage.id] = slots;
        persistSaveData(this.save);
      },
      onSound: (kind) => {
        if (kind === 'place') sound.playChipPlace();
        else if (kind === 'clock') sound.playClockPulse();
        else if (kind === 'error') sound.playTestStep(0, false);
        else sound.playSwitch(true);
      },
      onInspectChip: (chipId) => {
        const inspectChips = { ...this.save.customChips };
        if (!inspectChips[chipId]) {
          provisionStandardChips(inspectChips, { includeChapter2Hardware: true, provisioned: true });
        }
        this.modals.openChipInspector(chipId, inspectChips);
      },
      onOpenSpec: () => {
        const isCleared = this.stage ? this.save.clearedStages.includes(this.stage.id) : false;
        this.modals.openSpec(this.stage, isCleared);
      },
      onFinalClockTrigger: () => {
        if (this._pendingFinalClockResolve) {
          const resolve = this._pendingFinalClockResolve;
          this._pendingFinalClockResolve = null;
          resolve();
        }
      },
      onLiveState: ({ inputs, outputs, unstable }) => {
        this.inputBits = inputs;
        if (unstable) sound.playAlarm();
        this.sceneCanvas.setState({
          stage: this.stage,
          inputs,
          outputs,
          cleared: this.save.clearedStages.includes(this.stage.id),
          testing: this.isRunningTest,
          unstable,
        });
      },
    });

    this._bindUiEvents();
    this._syncQuickAudioButtons();
    this._applySceneCollapse(this.save.sceneCollapsed);

    this.sceneCanvas.start();
    this.workbench.start();
    this.physicsLab.start();

    this.loadStage(this.save.currentStageId || 'stage_00a', { autoIntro: false });
    this.prologue.showTitle(this.save);
    this._registerServiceWorker();
  }

  _cacheDom() {
    const $ = (id) => document.getElementById(id);
    this.dom = {
      app: $('app'),
      stagePill: $('btn-stage-pill'),
      stageActBadge: $('stage-act-badge'),
      stageTitleText: $('stage-title-text'),
      btnQuickAudio: $('btn-quick-audio'),
      iconQuickAudio: $('icon-quick-audio'),
      lblQuickAudio: $('lbl-quick-audio'),
      btnTitleAudio: $('btn-title-audio'),
      btnCodex: $('btn-codex'),
      btnSettings: $('btn-settings'),
      btnTitleSettings: $('btn-title-settings'),
      btnToggleScene: $('btn-toggle-scene'),
      storySection: $('story-section'),
      sceneCanvas: $('scene-canvas'),
      dialogueBox: $('dialogue-box'),
      storyTheater: $('story-theater'),
      workbenchCanvas: $('workbench-canvas'),
      physicsLabCanvas: $('physics-lab-canvas'),
      assemblyIde: $('assembly-ide'),
      wbToolsTl: $('wb-tools-tl'),
      selectionToolbar: $('selection-toolbar'),
      btnUndo: $('btn-undo'),
      btnZoomOut: $('btn-zoom-out'),
      btnResetView: $('btn-reset-view'),
      btnZoomIn: $('btn-zoom-in'),
      btnClearBoard: $('btn-clear-board'),
      btnClockPulse: $('btn-clock-pulse'),
      btnNextStageQuick: $('btn-next-stage-quick'),
      paletteLabel: $('palette-label'),
      paletteScroll: $('palette-scroll'),
      btnSpec: $('btn-spec'),
      btnHint: $('btn-hint'),
      btnRunTest: $('btn-run-test'),
      testProgressBar: $('test-progress-bar'),
      testProgressLabel: $('test-progress-label'),
      prologueOverlay: $('prologue-overlay'),
      modalBackdrop: $('modal-backdrop'),
      toast: $('toast'),
    };
  }

  _bindUiEvents() {
    this.dom.stagePill.addEventListener('click', () => {
      sound.playSwitch(true);
      this.modals.openMap(this.save, this.stage.id, {
        onSelectStage: (sid) => this.loadStage(sid, { autoIntro: true }),
        onGoHome: () => {
          this._saveDraft();
          this.dialogue.close();
          sound.playSwitch(false);
          this.prologue.showTitle(this.save);
        },
        onReplayPrologue: () => {
          sound.playPowerUp();
          this.prologue.startStory();
        },
        onReplayEnding1: () => {
          this._playChapterEnding(1, {
            endBtnLabel: '作業台へ戻る ▶',
            onComplete: () => sound.setBgmTrack(this._getStageWorkBgm(this.stage)),
          });
        },
        onReplayEnding2: () => {
          this._playChapterEnding(2, {
            endBtnLabel: '作業台へ戻る ▶',
            onComplete: () => sound.setBgmTrack(this._getStageWorkBgm(this.stage)),
          });
        },
        onResetSave: () => {
          this.save = resetSaveData();
          this.loadStage('stage_00a', { autoIntro: false });
          this.prologue.showTitle(this.save);
          this.showToast('セーブデータを初期化しました');
        },
      });
    });

    this.dom.btnQuickAudio?.addEventListener('click', () => this._cycleQuickAudioMode());
    this.dom.btnTitleAudio?.addEventListener('click', () => this._cycleQuickAudioMode());

    this.dom.btnCodex.addEventListener('click', () => {
      sound.playSwitch(true);
      this.modals.openCodex(this.save);
    });

    const openSettingsHandler = (fromTitle = false) => {
      sound.unlock();
      sound.playSwitch(true);
      this.modals.openSettings(this.save, sound.getStateSummary(), sound.getCurrentTrackName(), {
        onChangeBgmEnabled: (enabled) => {
          this.save.bgmEnabled = enabled;
          sound.setBgmEnabled(enabled);
          this._syncQuickAudioButtons();
          persistSaveData(this.save);
          return sound.getCurrentTrackName();
        },
        onChangeBgmVolume: (vol) => {
          this.save.bgmVolume = vol;
          sound.setBgmVolume(vol);
          persistSaveData(this.save);
        },
        onChangeSoundEnabled: (enabled) => {
          this.save.soundEnabled = enabled;
          sound.setEnabled(enabled);
          if (enabled) sound.playSwitch(true);
          this._syncQuickAudioButtons();
          persistSaveData(this.save);
        },
        onChangeVolume: (vol) => {
          this.save.soundVolume = vol;
          sound.setVolume(vol);
          persistSaveData(this.save);
        },
        onChangeDrone: (enabled) => {
          this.save.droneEnabled = enabled;
          sound.setDroneEnabled(enabled);
          persistSaveData(this.save);
        },
        onTestSound: () => {
          if (!this.save.soundEnabled) {
            this.save.soundEnabled = true;
            sound.setEnabled(true);
            this._syncQuickAudioButtons();
            persistSaveData(this.save);
          }
          sound.playSoundTest();
          return sound.getStateSummary();
        },
        onReturnTitle: fromTitle
          ? null
          : () => {
              this._saveDraft();
              this.dialogue.close();
              sound.playSwitch(false);
              this.prologue.showTitle(this.save);
            },
        onReplayPrologue: () => {
          this.dialogue.close();
          sound.playPowerUp();
          this.prologue.startStory();
        },
        onResetSave: () => {
          this.dialogue.close();
          this.save = resetSaveData();
          sound.setEnabled(this.save.soundEnabled);
          sound.setVolume(this.save.soundVolume);
          sound.setBgmEnabled(this.save.bgmEnabled);
          sound.setBgmVolume(this.save.bgmVolume);
          sound.setDroneEnabled(this.save.droneEnabled);
          this._syncQuickAudioButtons();
          this.loadStage('stage_00a', { autoIntro: false });
          this.prologue.showTitle(this.save);
          this.showToast('セーブデータを消去しました。最初から始められます！');
        },
      });
    };

    this.dom.btnSettings.addEventListener('click', () => openSettingsHandler(false));
    this.dom.btnTitleSettings.addEventListener('click', () => openSettingsHandler(true));

    this.dom.btnToggleScene.addEventListener('click', () => {
      this.save.sceneCollapsed = !this.save.sceneCollapsed;
      this._applySceneCollapse(this.save.sceneCollapsed);
      persistSaveData(this.save);
      sound.playSwitch(!this.save.sceneCollapsed);
      setTimeout(() => this._fitActiveCanvas(), 220);
    });

    this.dom.dialogueBox.addEventListener('replay-intro', () => {
      const act = ACTS.find((a) => a.id === this.stage.act) || ACTS[0];
      sound.playSwitch(true);
      sound.setBgmTrack(this._getStageStoryBgm(this.stage));
      this.dialogue.playLines(this.stage.introDialogue, {
        fallbackGoal: this.stage.plainGoal,
        incidentBrief: this.stage.incidentBrief || null,
        sceneKey: this.stage.scene,
        stageBadge: this.stage.isSandbox ? 'FREE LAB' : `${act.roman} · STAGE ${this.stage.code}`,
        endLabel:
          this.stage.kind === 'assembly_program'
            ? 'プログラムを組む ▶'
            : this.stage.mode === 'physics'
              ? '実験台へ ▶'
              : '回路を組む ▶',
        onComplete: () => {
          sound.setBgmTrack(this._getStageWorkBgm(this.stage));
        },
      });
    });

    this.dom.btnUndo.addEventListener('click', () => this.undo());
    this.dom.btnZoomOut?.addEventListener('click', () => {
      if (this.stage?.mode === 'physics') return;
      sound.playSwitch(false);
      this.workbench.zoomBy(0.82);
    });
    this.dom.btnResetView.addEventListener('click', () => {
      sound.playSwitch(true);
      this._fitActiveCanvas();
    });
    this.dom.btnZoomIn?.addEventListener('click', () => {
      if (this.stage?.mode === 'physics') return;
      sound.playSwitch(true);
      this.workbench.zoomBy(1.22);
    });
    this.dom.btnClearBoard.addEventListener('click', () => {
      if (this.stage.kind === 'assembly_program') {
        this.assemblyIde.clearAll();
        sound.playDelete();
        return;
      }
      if (this.stage.mode === 'physics') {
        if (!Object.values(this.physicsLab.slots || {}).some(Boolean)) return;
        this.physicsLab.clearAll();
        sound.playDelete();
        return;
      }
      if (this.circuit.nodes.length === 0 && this.circuit.wires.length === 0) return;
      sound.playSwitch(false);
      this.modals.openConfirm({
        title: '盤面クリアの確認',
        message: '作業台の部品と配線をすべてクリアしますか？',
        subMessage: 'クリア後も左上の「↶ 戻す」ボタン（または Ctrl+Z）で元に戻せます。',
        confirmLabel: '✕ すべてクリア',
        cancelLabel: 'キャンセル',
        danger: true,
        onConfirm: () => {
          this._pushUndo();
          this.circuit = createEmptyCircuit(this.stage.inputs, this.stage.outputs);
          sound.playDelete();
          this._afterCircuitEdit();
          this.showToast('作業台をクリアしました（↶ で元に戻せます）');
        },
      });
    });

    this.dom.btnClockPulse.addEventListener('click', () => this.pulseClock());
    this.dom.btnNextStageQuick.addEventListener('click', () => {
      const next = this._getNextStage();
      sound.playSwitch(true);
      this.loadStage(next ? next.id : 'sandbox', { autoIntro: true });
    });

    this.dom.btnSpec.addEventListener('click', () => {
      sound.playSwitch(true);
      const isCleared = this.save.clearedStages.includes(this.stage.id);
      this.modals.openSpec(this.stage, isCleared);
    });

    this.dom.btnHint.addEventListener('click', () => {
      sound.playSwitch(true);
      this.modals.openHints(this.stage, this.hintLevel, (next) => {
        this.hintLevel = next;
      });
    });

    this.dom.btnRunTest.addEventListener('click', () => {
      if (this._pendingFinalClockResolve) {
        const resolve = this._pendingFinalClockResolve;
        this._pendingFinalClockResolve = null;
        resolve();
        return;
      }
      if (this.stage.isSandbox) {
        this.pulseClock();
        return;
      }
      if (this.isRunningTest) return;
      this.runAnimatedTestSuite();
    });

    // Keyboard shortcuts & layered Escape/Story navigation for desktop & keyboard players
    window.addEventListener('keydown', (e) => {
      // 1. Glossary Popover is always topmost (prevents Escape from double-closing underlying modal
      //    and prevents ArrowLeft/Backspace from firing twice across window listeners!)
      if (glossaryPopover.isOpen()) {
        if (e.key === 'Escape') {
          e.__sgGlossaryHandled = true;
          e.stopImmediatePropagation();
          e.preventDefault();
          sound.playSwitch(false);
          glossaryPopover.close();
        } else if ((e.key === 'ArrowLeft' || e.key === 'Backspace') && glossaryPopover.history.length > 0) {
          e.__sgGlossaryHandled = true;
          e.stopImmediatePropagation();
          e.preventDefault();
          glossaryPopover.goBack();
        }
        return;
      }

      // 2. Active Modal
      if (!this.dom.modalBackdrop.classList.contains('hidden')) {
        if (e.key === 'Escape') {
          e.preventDefault();
          sound.playSwitch(false);
          this.modals.close();
        }
        return;
      }

      const tag = e.target?.tagName;
      if (tag === 'TEXTAREA' || tag === 'INPUT' || e.target?.isContentEditable) {
        return;
      }

      // 3. Prologue / Cinematic Ending reader navigation
      if (this.prologue.isStoryOpen()) {
        if (e.key === 'ArrowRight' || (e.key === ' ' && tag !== 'BUTTON')) {
          e.preventDefault();
          this.prologue.advanceByKey();
        } else if (e.key === 'Enter' && tag !== 'BUTTON') {
          e.preventDefault();
          this.prologue.advanceByKey();
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          this.prologue.goBackByKey();
        }
        return;
      }

      // 4. Story Theater reader navigation
      if (this.dialogue.isOpen()) {
        if (e.key === 'ArrowRight' || (e.key === ' ' && tag !== 'BUTTON')) {
          e.preventDefault();
          this.dialogue.advance();
        } else if (e.key === 'Enter' && tag !== 'BUTTON') {
          e.preventDefault();
          this.dialogue.advance();
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          this.dialogue.goBack();
        }
        return;
      }

      // Ignore workbench shortcuts while Title Screen is open
      if (!this.dom.prologueOverlay.classList.contains('hidden')) {
        return;
      }

      // 5. Circuit Workbench shortcuts
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) this.redo();
        else this.undo();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        this.redo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (this.selection.nodeId) this.deleteSelectedNode();
        else if (this.selection.wireId) this.deleteWire(this.selection.wireId);
      } else if (e.key === 'Escape') {
        if (this.stage?.mode === 'physics') {
          this.physicsLab.setArmedPart(null);
        } else {
          this.workbench.setArmedChip(null);
          this.workbench.clearSelection();
        }
      } else if (this.stage?.mode !== 'physics' && (e.key === '+' || e.key === '=')) {
        this.workbench.zoomBy(1.18);
      } else if (this.stage?.mode !== 'physics' && e.key === '-') {
        this.workbench.zoomBy(0.84);
      } else if (this.stage?.mode !== 'physics' && e.key === '0') {
        this._fitActiveCanvas();
      }
    });

    const scheduleRefit = () => {
      this._fitActiveCanvas();
      requestAnimationFrame(() => this._fitActiveCanvas());
      clearTimeout(this._refitTimer);
      this._refitTimer = setTimeout(() => this._fitActiveCanvas(), 200);
    };
    window.addEventListener('resize', scheduleRefit);
    window.addEventListener('orientationchange', scheduleRefit);
    window.visualViewport?.addEventListener('resize', scheduleRefit);
  }

  _fitActiveCanvas() {
    if (this.stage?.kind === 'assembly_program') {
      return;
    }
    if (this.stage?.mode === 'physics') {
      this.physicsLab.fitToView();
    } else {
      this.workbench.fitToView();
    }
  }

  _cycleQuickAudioMode() {
    const mode = sound.getAudioMode();
    if (mode === 'all' || mode === 'bgm_only') {
      // 1st tap: turn off game BGM so user can listen to Spotify / Apple Music, keep tactile SE!
      this.save.bgmEnabled = false;
      this.save.soundEnabled = true;
      sound.setBgmEnabled(false);
      sound.setEnabled(true);
      sound.playSwitch(false);
      this.showToast('BGMをOFFにしました（効果音のみ・別アプリ音楽と併用OK）');
    } else if (mode === 'se_only') {
      // 2nd tap: full mute (suspends AudioContext completely)
      this.save.bgmEnabled = false;
      this.save.soundEnabled = false;
      sound.setBgmEnabled(false);
      sound.setEnabled(false);
      this.showToast('ゲーム音をすべてミュートにしました');
    } else {
      // 3rd tap: restore BGM + SE
      this.save.bgmEnabled = true;
      this.save.soundEnabled = true;
      sound.setEnabled(true);
      sound.setBgmEnabled(true);
      sound.playSwitch(true);
      this.showToast('BGM・効果音をONにしました');
    }
    this._syncQuickAudioButtons();
    persistSaveData(this.save);
  }

  _syncQuickAudioButtons() {
    const mode = sound.getAudioMode();
    const isSeOnly = mode === 'se_only';
    const isMuted = mode === 'muted';
    const isBgmOnly = mode === 'bgm_only';

    const btn = this.dom.btnQuickAudio;
    if (btn) {
      btn.classList.toggle('is-se-only', isSeOnly);
      btn.classList.toggle('is-muted', isMuted);
      if (this.dom.iconQuickAudio) {
        this.dom.iconQuickAudio.textContent = isMuted ? '🔇' : isSeOnly ? '🔉' : '🔊';
      }
      if (this.dom.lblQuickAudio) {
        this.dom.lblQuickAudio.textContent = isMuted ? '消音' : isSeOnly ? 'SE' : isBgmOnly ? '曲' : '音';
      }
    }

    const tbtn = this.dom.btnTitleAudio;
    if (tbtn) {
      tbtn.classList.toggle('is-se-only', isSeOnly);
      tbtn.classList.toggle('is-muted', isMuted);
      tbtn.textContent = isMuted
        ? '🔇 消音中'
        : isSeOnly
          ? '🔉 効果音のみ'
          : isBgmOnly
            ? '🎵 BGMのみ'
            : '🔊 BGM+SE';
    }
  }

  _applySceneCollapse(collapsed) {
    this.dom.storySection.classList.toggle('collapsed', Boolean(collapsed));
    this.dom.btnToggleScene.textContent = collapsed ? '▼ 物語を開く' : '▲ 回路を広く';
    this.dom.btnToggleScene.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
  }

  // ===========================================================================
  // STAGE LOADING & PALETTE
  // ===========================================================================
  loadStage(stageId, { autoIntro = false } = {}) {
    this._testRunToken++;
    this._pendingFinalClockResolve = null;
    this.isRunningTest = false;
    this.lastEvalResult = null;
    this.stage = getStageById(stageId);
    this.save.currentStageId = this.stage.id;
    this.hintLevel = 1;
    this.undoStack = [];
    this.redoStack = [];

    // Restore saved draft, stage initialCircuit (e.g. Stage 11 direct-wire demo), or start clean
    const savedDraft = this.save.drafts[this.stage.id];
    if (
      savedDraft &&
      Array.isArray(savedDraft.inputs) &&
      savedDraft.inputs.length === this.stage.inputs.length &&
      Array.isArray(savedDraft.outputs) &&
      savedDraft.outputs.length === this.stage.outputs.length
    ) {
      this.circuit = cloneCircuit(savedDraft);
    } else if (this.stage.initialCircuit) {
      this.circuit = cloneCircuit(this.stage.initialCircuit);
    } else {
      this.circuit = createEmptyCircuit(this.stage.inputs, this.stage.outputs);
    }

    this.inputBits = new Array(this.stage.inputs.length).fill(0);

    // Header badge & title
    const act = ACTS.find((a) => a.id === this.stage.act) || ACTS[0];
    const isCleared = this.save.clearedStages.includes(this.stage.id);
    this.dom.stageActBadge.textContent = this.stage.isSandbox ? 'FREE LAB' : `${act.roman} · ${this.stage.code}`;
    this.dom.stageActBadge.style.borderColor = act.color;
    this.dom.stageActBadge.style.color = act.color;
    this.dom.stageTitleText.textContent = isCleared ? this.stage.revealedTitle : this.stage.title;

    // Clock pulse & quick next-stage button visibility
    const hasClk = this.stage.inputs.includes('CLK') && this.stage.mode !== 'physics';
    this.dom.btnClockPulse.classList.toggle('hidden', !hasClk);
    this._syncNextStageQuickBtn();

    // Test button label (reflects Chief Engineer promotion in Chapter 2!)
    this.dom.btnRunTest.disabled = false;
    this.dom.btnRunTest.classList.remove('final-clock-ready');
    this.dom.btnRunTest.textContent = this._getDefaultRunBtnLabel();
    this.dom.testProgressBar.classList.add('hidden');

    // Dialogue: guarantee full-screen Story Theater opens at least once per stage!
    const theaterKey = this.stage.id === 'stage_00' ? 'stage_00_guided' : this.stage.id;
    const alreadyShownTheater = this.save.seenTheaterStages.includes(theaterKey);
    const openingTheater = autoIntro && !alreadyShownTheater && this.stage.introDialogue.length > 0;
    if (openingTheater) {
      this.save.seenTheaterStages.push(theaterKey);
      this.dialogue.playLines(this.stage.introDialogue, {
        fallbackGoal: this.stage.plainGoal,
        incidentBrief: this.stage.incidentBrief || null,
        sceneKey: this.stage.scene,
        stageBadge: this.stage.isSandbox ? 'FREE LAB' : `${act.roman} · STAGE ${this.stage.code}`,
        endLabel:
          this.stage.kind === 'assembly_program'
            ? 'プログラムを組む ▶'
            : this.stage.mode === 'physics'
              ? '実験台へ ▶'
              : '回路を組む ▶',
        onComplete: () => {
          if (this.dom.prologueOverlay.classList.contains('hidden')) {
            sound.setBgmTrack(this._getStageWorkBgm(this.stage));
          }
        },
      });
    } else {
      this.dialogue.close();
      this.dialogue.showGoal(this.stage.plainGoal, 'hako', this.stage.incidentBrief || null);
    }

    const isAssembly = this.stage.kind === 'assembly_program';
    const isPhysics = this.stage.mode === 'physics';
    const isPhysicsCanvas = isPhysics && !isAssembly;

    this.dom.app.classList.toggle('mode-assembly', isAssembly);
    this.dom.workbenchCanvas.classList.toggle('hidden', isPhysics);
    this.dom.physicsLabCanvas.classList.toggle('hidden', !isPhysicsCanvas);
    this.dom.assemblyIde.classList.toggle('hidden', !isAssembly);
    this.dom.wbToolsTl?.classList.toggle('hidden', isAssembly);
    if (this.dom.paletteLabel) {
      this.dom.paletteLabel.textContent = isAssembly ? '命令' : '部品';
    }
    this.dom.btnUndo.classList.toggle('hidden', isPhysics);
    this.dom.btnZoomOut?.classList.toggle('hidden', isPhysics);
    this.dom.btnZoomIn?.classList.toggle('hidden', isPhysics);
    this.selection = { nodeId: null, wireId: null, pendingPin: null, armedChipType: null };
    this._renderSelectionToolbar();

    if (isAssembly) {
      this.simulator = null;
      this.assemblyIde.setStage(
        this.stage,
        this.save.physicsDrafts?.[this.stage.id] || null,
        this.save.customChips
      );
    } else if (isPhysicsCanvas) {
      this._renderPalette();
      this.simulator = null;
      this.physicsLab.setStage(
        this.stage,
        this.save.physicsDrafts?.[this.stage.id] || null,
        this.save.customChips
      );
      requestAnimationFrame(() => this.physicsLab.fitToView());
    } else {
      this._renderPalette();
      this._rebuildSimulator({ reset: true });
      this.workbench.setContext({
        stage: this.stage,
        circuit: this.circuit,
        customChips: this.save.customChips,
        simulator: this.simulator,
        inputBits: this.inputBits,
        fit: true,
      });
      this._syncSceneCanvas();
    }

    // Match BGM smoothly to whether we're reading the Story Theater scene or working on the board!
    if (this.dom.prologueOverlay.classList.contains('hidden')) {
      sound.setBgmTrack(
        openingTheater ? this._getStageStoryBgm(this.stage) : this._getStageWorkBgm(this.stage)
      );
    }

    this._syncUndoBtn();
    persistSaveData(this.save);
  }

  _getDefaultRunBtnLabel() {
    if (this.stage?.isSandbox) return '⚡ CLK脈動';
    if (this.stage?.chapter === 2) return '▶ 主任決裁・テスト実行';
    return '▶ テスト実行';
  }

  _getStageStoryBgm(stage) {
    if (!stage) return 'story';
    if (stage.storyBgm) return stage.storyBgm;
    return stage.isFinale ? 'finale' : 'story';
  }

  _getStageWorkBgm(stage) {
    if (!stage) return 'workbench';
    return stage.isFinale || stage.isSandbox ? 'finale' : 'workbench';
  }

  _getNextStage() {
    if (!this.stage || this.stage.isSandbox) return null;
    const curIdx = STAGES.findIndex((s) => s.id === this.stage.id);
    return curIdx >= 0 && curIdx < STAGES.length - 1 ? STAGES[curIdx + 1] : null;
  }

  _syncNextStageQuickBtn() {
    if (!this.stage || this.stage.isSandbox) {
      this.dom.btnNextStageQuick.classList.add('hidden');
      return;
    }
    const isCleared = this.save.clearedStages.includes(this.stage.id);
    const next = this._getNextStage();
    this.dom.btnNextStageQuick.classList.toggle('hidden', !isCleared);
    if (isCleared) {
      this.dom.btnNextStageQuick.textContent = next ? `次へ (${next.code}) ▶` : '自由実験室 ▶';
    }
  }

  _getAvailableChipIds() {
    const list = [...(this.stage.allowedPrimitives || ['NAND'])];
    const orderedCustomIds = STAGES.map((s) => s.rewardChip?.id).filter(Boolean);

    for (const cid of orderedCustomIds) {
      if (list.includes(cid)) continue;
      if (!this.save.customChips[cid]) continue;
      if (this.stage.allowedCustomChips === null || this.stage.allowedCustomChips.includes(cid)) {
        list.push(cid);
      }
    }
    return list;
  }

  _renderPalette() {
    this.dom.paletteScroll.innerHTML = '';

    // Physics Lab Stages (00-A: MOSFET Silicon, 00-B: Pull-Up Resistor)
    if (this.stage.mode === 'physics' && Array.isArray(this.stage.physicsParts)) {
      for (const part of this.stage.physicsParts) {
        const wrap = document.createElement('div');
        wrap.className = 'palette-chip-wrap';

        const btn = document.createElement('button');
        btn.className = 'palette-chip';
        btn.dataset.chipId = part.id;
        btn.style.setProperty('--chip-color', part.color || '#567');
        btn.style.setProperty('--chip-accent', part.accent || '#abc');
        btn.innerHTML = `
          <span class="pchip-name">${part.name}</span>
          <span class="pchip-meta">${part.meta}</span>
        `;

        btn.addEventListener('click', () => {
          if (this.selection.armedChipType === part.id) {
            sound.playChipPlace();
            this.physicsLab.autoPlacePart(part.id);
          } else {
            sound.playSwitch(true);
            this.physicsLab.setArmedPart(part.id);
          }
          this._highlightArmedPalette();
        });

        const infoBtn = document.createElement('button');
        infoBtn.className = 'pchip-info';
        infoBtn.textContent = 'i';
        infoBtn.title = `${part.name} の説明を見る`;
        infoBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          sound.playSwitch(true);
          this.modals.openPhysicsPartInfo(part);
        });

        wrap.appendChild(btn);
        wrap.appendChild(infoBtn);
        this.dom.paletteScroll.appendChild(wrap);
      }
      this._highlightArmedPalette();
      return;
    }

    const ids = this._getAvailableChipIds();

    for (const id of ids) {
      const def = getChipDef(id, this.save.customChips);
      if (!def) continue;

      const isProv = Boolean(def.provisioned);
      const metaLabel =
        id === 'NAND'
          ? '基本'
          : id === 'SW'
            ? 'スイッチ'
            : id === 'PULL'
              ? '抜けると0'
              : id === 'CONST_1'
                ? 'いつも1'
                : id === 'CONST_0'
                  ? 'いつも0'
                  : isProv
                    ? `${def.nandCount}N·支給`
                    : `${def.nandCount}N`;

      const wrap = document.createElement('div');
      wrap.className = 'palette-chip-wrap';

      const btn = document.createElement('button');
      btn.className = 'palette-chip';
      btn.dataset.chipId = id;
      btn.style.setProperty('--chip-color', def.color || '#567');
      btn.style.setProperty('--chip-accent', def.accent || '#abc');
      btn.innerHTML = `
        <span class="pchip-name">${def.name}</span>
        <span class="pchip-meta">${metaLabel}</span>
      `;

      // Tap once to arm tap-to-place; tap a second time while armed to auto-place cleanly!
      btn.addEventListener('click', () => {
        if (this.selection.armedChipType === id) {
          const spot = this.workbench.findOpenSpot(id);
          this.workbench.setArmedChip(null);
          this.placeChip(id, spot.x, spot.y);
        } else {
          sound.playSwitch(true);
          this.workbench.setArmedChip(id);
        }
        this._highlightArmedPalette();
      });

      const infoBtn = document.createElement('button');
      infoBtn.className = 'pchip-info';
      infoBtn.textContent = 'i';
      infoBtn.title = `${def.name} の詳細を見る`;
      infoBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        sound.playSwitch(true);
        this.modals.openChipInspector(id, this.save.customChips);
      });

      wrap.appendChild(btn);
      wrap.appendChild(infoBtn);
      this.dom.paletteScroll.appendChild(wrap);
    }

    this._highlightArmedPalette();
  }

  _highlightArmedPalette() {
    const armed = this.selection.armedChipType;
    this.dom.paletteScroll.querySelectorAll('.palette-chip').forEach((el) => {
      el.classList.toggle('armed', el.dataset.chipId === armed);
    });
  }

  // ===========================================================================
  // CIRCUIT EDITING & LIVE SIMULATION
  // ===========================================================================
  _pushUndo() {
    this.undoStack.push(cloneCircuit(this.circuit));
    if (this.undoStack.length > 40) this.undoStack.shift();
    this.redoStack = [];
    this._syncUndoBtn();
  }

  undo() {
    if (this.undoStack.length === 0) return;
    this.redoStack.push(cloneCircuit(this.circuit));
    this.circuit = this.undoStack.pop();
    sound.playDelete();
    this.workbench.clearSelection();
    this._afterCircuitEdit();
  }

  redo() {
    if (this.redoStack.length === 0) return;
    this.undoStack.push(cloneCircuit(this.circuit));
    this.circuit = this.redoStack.pop();
    sound.playChipPlace();
    this.workbench.clearSelection();
    this._afterCircuitEdit();
  }

  _syncUndoBtn() {
    this.dom.btnUndo.disabled = this.undoStack.length === 0;
  }

  placeChip(type, x, y) {
    this._pushUndo();
    const node = {
      id: `n_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      x,
      y,
    };
    this.circuit.nodes.push(node);
    const dim = this.workbench.getChipDimensions(type);
    this.workbench.spawnBurst(x + dim.w / 2, y + dim.h / 2, '#ffd166', 12);
    sound.playChipPlace();
    this._afterCircuitEdit();
  }

  moveChip(nodeId, x, y) {
    // Save updated position to draft
    this._saveDraft();
  }

  addWire(from, to) {
    this._pushUndo();
    this.circuit = connectWire(this.circuit, from, to);
    sound.playWireConnect();
    this._afterCircuitEdit();
  }

  deleteWire(wireId) {
    this._pushUndo();
    this.circuit = removeWire(this.circuit, wireId);
    sound.playDelete();
    this.workbench.clearSelection();
    this._afterCircuitEdit();
  }

  deleteSelectedNode() {
    if (!this.selection.nodeId) return;
    this._pushUndo();
    this.circuit = removeNode(this.circuit, this.selection.nodeId);
    sound.playDelete();
    this.workbench.clearSelection();
    this._afterCircuitEdit();
  }

  duplicateSelectedNode() {
    if (!this.selection.nodeId) return;
    const orig = this.circuit.nodes.find((n) => n.id === this.selection.nodeId);
    if (!orig) return;
    this.placeChip(orig.type, orig.x + 24, orig.y + 32);
  }

  toggleInputBit(pinIdx) {
    this.inputBits[pinIdx] = this.inputBits[pinIdx] ? 0 : 1;
    sound.playSwitch(Boolean(this.inputBits[pinIdx]));
    this._evaluateLive();
  }

  pulseClock() {
    const clkIdx = this.stage.inputs.indexOf('CLK');
    if (clkIdx < 0) return;
    sound.playClockPulse();
    // Clean rising-edge pulse: settle at 0 -> rise to 1 -> fall to 0
    this.inputBits[clkIdx] = 0;
    this._evaluateLive();
    this.inputBits[clkIdx] = 1;
    this._evaluateLive();
    this.workbench.triggerTestFlash();
    setTimeout(() => {
      if (this.stage.inputs[clkIdx] === 'CLK') {
        this.inputBits[clkIdx] = 0;
        this._evaluateLive();
      }
    }, 180);
  }

  handleSelectionChange(sel) {
    this.selection = sel;
    this._highlightArmedPalette();
    this._renderSelectionToolbar();
  }

  _renderSelectionToolbar() {
    const bar = this.dom.selectionToolbar;
    bar.innerHTML = '';

    if (this.selection.nodeId) {
      const node = this.circuit.nodes.find((n) => n.id === this.selection.nodeId);
      if (!node) {
        bar.classList.add('hidden');
        return;
      }
      const def = getChipDef(node.type, this.save.customChips);
      bar.classList.remove('hidden');
      bar.innerHTML = `
        <span class="sel-label">${def?.name || node.type}</span>
        <button class="sel-btn" id="sel-dup">複製</button>
        <button class="sel-btn" id="sel-inspect">📖 解説・内部</button>
        <button class="sel-btn danger" id="sel-del">削除</button>
      `;
      bar.querySelector('#sel-dup').addEventListener('click', () => this.duplicateSelectedNode());
      bar.querySelector('#sel-inspect').addEventListener('click', () => {
        sound.playSwitch(true);
        const liveNodeInputs = this.simulator
          ? this.simulator.getNodePinValues(node.id)?.inputs || null
          : null;
        this.modals.openChipInspector(node.type, this.save.customChips, {
          liveInputs: liveNodeInputs,
          backLabel: '◀ 調査中の盤面へ戻る',
        });
      });
      bar.querySelector('#sel-del').addEventListener('click', () => this.deleteSelectedNode());
    } else if (this.selection.wireId) {
      bar.classList.remove('hidden');
      bar.innerHTML = `
        <span class="sel-label">配線を選択中</span>
        <button class="sel-btn danger" id="sel-cut">✂ 配線を切る</button>
      `;
      bar.querySelector('#sel-cut').addEventListener('click', () => this.deleteWire(this.selection.wireId));
    } else if (this.selection.pendingPin || this.selection.armedChipType) {
      const armedType = this.selection.armedChipType;
      const armedDef = armedType && this.stage?.mode !== 'physics' ? getChipDef(armedType, this.save.customChips) : null;
      bar.classList.remove('hidden');
      bar.innerHTML = `
        <span class="sel-label">${armedDef ? `${armedDef.name} を配置` : armedType ? '配置モード' : '配線モード'}</span>
        ${armedDef ? `<button class="sel-btn" id="sel-armed-inspect">📖 解説・内部</button>` : ''}
        <button class="sel-btn" id="sel-cancel">キャンセル</button>
      `;
      bar.querySelector('#sel-armed-inspect')?.addEventListener('click', () => {
        sound.playSwitch(true);
        this.modals.openChipInspector(armedType, this.save.customChips);
      });
      bar.querySelector('#sel-cancel').addEventListener('click', () => {
        if (this.stage?.mode === 'physics') {
          this.physicsLab.setArmedPart(null);
        } else {
          this.workbench.setArmedChip(null);
          this.workbench.clearSelection();
        }
      });
    } else {
      bar.classList.add('hidden');
    }
  }

  _afterCircuitEdit() {
    this._saveDraft();
    this._rebuildSimulator({ reset: this.stage.mode !== 'sequential' });
    this.workbench.setContext({
      circuit: this.circuit,
      simulator: this.simulator,
      inputBits: this.inputBits,
    });
    this._syncUndoBtn();
  }

  _saveDraft() {
    this.save.drafts[this.stage.id] = cloneCircuit(this.circuit);
    persistSaveData(this.save);
  }

  _rebuildSimulator({ reset = false } = {}) {
    try {
      this.simulator = compileCircuit(this.circuit, this.save.customChips);
      if (reset) this.simulator.reset();
      this._evaluateLive();
    } catch (err) {
      this.showToast(`コンパイルエラー: ${err.message}`);
    }
  }

  _evaluateLive() {
    if (!this.simulator) return;
    this.simulator.evaluate(this.inputBits);
    this.workbench.setContext({
      simulator: this.simulator,
      inputBits: this.inputBits,
    });
    this._syncSceneCanvas();
  }

  _syncSceneCanvas() {
    this.sceneCanvas.setState({
      stage: this.stage,
      inputs: this.inputBits,
      outputs: this.simulator ? this.simulator.getOutputs() : [],
      cleared: this.save.clearedStages.includes(this.stage.id),
      testing: this.isRunningTest,
      unstable: Boolean(this.simulator?.unstable),
    });
  }

  // ===========================================================================
  // ANIMATED TEST SUITE & CHIP FORGING
  // ===========================================================================
  async runAnimatedTestSuite() {
    if (this.stage.mode === 'physics') {
      await this._runPhysicsTestSuite();
      return;
    }

    const evalResult = evaluateStage(this.stage, this.circuit, this.save.customChips);
    this.lastEvalResult = evalResult;

    if (evalResult.results.length === 0) {
      this.modals.openTestDiagnostics(this.stage, evalResult, () => {});
      return;
    }

    const token = ++this._testRunToken;
    this.isRunningTest = true;
    this.dom.btnRunTest.disabled = true;
    this.dom.testProgressBar.classList.remove('hidden');

    // Replay each test step visually on the live workbench!
    this.simulator = compileCircuit(this.circuit, this.save.customChips);
    this.simulator.reset();
    if (this.stage.mode === 'sequential' && Array.isArray(this.stage.initSteps)) {
      for (const initInput of this.stage.initSteps) {
        this.simulator.evaluate(initInput);
      }
    }

    const stepDelay = evalResult.results.length > 7 ? 260 : 360;

    for (let i = 0; i < evalResult.results.length; i++) {
      if (token !== this._testRunToken) return;
      const step = evalResult.results[i];
      this.dom.testProgressLabel.textContent = `検証中 ${i + 1}/${evalResult.results.length}: ${step.label}`;

      if (this.stage.mode === 'combinational') {
        this.simulator.reset();
      }
      if (Array.isArray(step.phases)) {
        for (const phaseInput of step.phases) {
          this.inputBits = [...phaseInput];
          this.simulator.evaluate(this.inputBits);
        }
      } else {
        this.inputBits = [...step.input];
        this.simulator.evaluate(this.inputBits);
      }

      this.workbench.setContext({
        simulator: this.simulator,
        inputBits: this.inputBits,
      });
      this.workbench.triggerTestFlash();
      this._syncSceneCanvas();
      sound.playTestStep(i, step.passed);

      await new Promise((r) => setTimeout(r, stepDelay));
    }

    if (token !== this._testRunToken) return;
    this.isRunningTest = false;
    this.dom.btnRunTest.disabled = false;
    this.dom.testProgressBar.classList.add('hidden');

    if (evalResult.passed) {
      this._handleStageClear(evalResult.metrics);
    } else {
      this.modals.openTestDiagnostics(this.stage, evalResult, (caseIdx) => {
        this._loadDiagnosticCase(caseIdx);
      });
    }
  }

  async _runPhysicsTestSuite({ skipFinalClockPause = false } = {}) {
    const isAsm = this.stage.kind === 'assembly_program';
    const evalResult = isAsm
      ? this.assemblyIde.evaluateAssembly()
      : this.physicsLab.evaluatePhysics();
    this.lastEvalResult = evalResult;
    if (!evalResult.results || evalResult.results.length === 0) {
      sound.playTestStep(0, false);
      this.modals.openTestDiagnostics(this.stage, evalResult, () => {});
      return;
    }

    const token = ++this._testRunToken;
    this.isRunningTest = true;
    this.dom.btnRunTest.disabled = true;
    this.dom.testProgressBar.classList.remove('hidden');

    const prefix = isAsm ? '実機CPU実行' : '物理検証';
    const stepDelay = evalResult.results.length > 5 ? 300 : 520;

    // On Stage 24 (Grand Finale II), pause right before the final hatch-opening command (4番地: LDI 15)
    // on a first-time clear so the player personally delivers the final clock pulse!
    const shouldPauseBeforeFinalOpen =
      this.stage.isChapter2Finale &&
      evalResult.passed &&
      evalResult.results.length >= 2 &&
      !skipFinalClockPause &&
      !this.save.clearedStages.includes(this.stage.id);

    const preLoopEnd = shouldPauseBeforeFinalOpen
      ? evalResult.results.length - 1
      : evalResult.results.length;

    const showStep = (idxVal) => {
      if (isAsm) this.assemblyIde.setTraceStep(idxVal);
      else this.physicsLab.setControlBit(idxVal);
    };

    for (let i = 0; i < preLoopEnd; i++) {
      if (token !== this._testRunToken) return;
      const step = evalResult.results[i];
      this.dom.testProgressLabel.textContent = `${prefix} ${i + 1}/${evalResult.results.length}: ${step.label}`;
      showStep(step.input[0]);
      sound.playTestStep(i, step.passed);
      await new Promise((r) => setTimeout(r, stepDelay));
    }

    if (token !== this._testRunToken) return;

    if (shouldPauseBeforeFinalOpen) {
      const finalIdx = evalResult.results.length - 1;
      const finalStep = evalResult.results[finalIdx];
      if (isAsm) this.assemblyIde.setAwaitingFinalClock(true);
      else this.physicsLab.setAwaitingFinalClock(true);
      this.dom.testProgressLabel.textContent =
        '⚡ カウント0達成・4番地到達！ 最終開門クロックを入力せよ！';
      this.dom.btnRunTest.disabled = false;
      this.dom.btnRunTest.classList.add('final-clock-ready');
      this.dom.btnRunTest.textContent = '⚡ 最終開門CLK送出 (1111)！';

      await new Promise((resolve) => {
        this._pendingFinalClockResolve = resolve;
      });
      if (token !== this._testRunToken) return;

      if (isAsm) this.assemblyIde.setAwaitingFinalClock(false);
      else this.physicsLab.setAwaitingFinalClock(false);
      this.dom.btnRunTest.disabled = true;
      this.dom.btnRunTest.classList.remove('final-clock-ready');
      this.dom.testProgressLabel.textContent = `⚡ 最終開門クロック実行: ${finalStep.label}`;
      showStep(finalStep.input[0]);
      sound.playClockPulse();
      sound.playTestStep(finalIdx, true);
      await new Promise((r) => setTimeout(r, 420));
    }

    if (token !== this._testRunToken) return;
    this.isRunningTest = false;
    this.dom.btnRunTest.disabled = false;
    this.dom.btnRunTest.textContent = this._getDefaultRunBtnLabel();
    this.dom.testProgressBar.classList.add('hidden');

    if (evalResult.passed) {
      this._handleStageClear(evalResult.metrics);
    } else {
      this.modals.openTestDiagnostics(this.stage, evalResult, (caseIdx) => {
        const step = evalResult.results[caseIdx];
        if (step) showStep(step.input[0]);
      });
    }
  }

  _loadDiagnosticCase(caseIdx) {
    const diag = reproduceDiagnosticState(
      this.stage,
      this.circuit,
      this.save.customChips,
      this.lastEvalResult,
      caseIdx
    );
    this.simulator = diag.simulator;
    this.inputBits = diag.inputBits;

    this.workbench.setContext({
      simulator: this.simulator,
      inputBits: this.inputBits,
    });
    this._syncSceneCanvas();
    this.showToast(`ケース #${caseIdx + 1} の入力と記憶状態を盤面に再現しました`);
  }

  _handleStageClear(metrics) {
    sound.playVictory();
    if (this.stage.mode !== 'physics') {
      this.workbench.spawnBurst(330, 180, '#52e3b6', 24);
      this.workbench.spawnBurst(330, 180, '#ffd166', 16);
    }

    // 1. Forge & permanently save custom chip with player's actual circuit (provisioned: false = 自作済み!)
    const reward = this.stage.rewardChip;
    const chipDef = {
      ...reward,
      inputs: reward.inputs ? [...reward.inputs] : [...this.stage.inputs],
      outputs: reward.outputs ? [...reward.outputs] : [...this.stage.outputs],
      circuit: this.stage.mode === 'physics' ? null : cloneCircuit(this.circuit),
      nandCount: metrics.nandCount,
      depth: metrics.depth,
      stageId: this.stage.id,
      provisioned: false,
      createdAt: Date.now(),
    };
    if (!reward.isLabReward) {
      this.save.customChips[reward.id] = chipDef;
    }

    // 2. Mark stage cleared & record best NAND count
    if (!this.save.clearedStages.includes(this.stage.id)) {
      this.save.clearedStages.push(this.stage.id);
    }
    const prevBest = this.save.bestNandCounts[this.stage.id];
    if (prevBest === undefined || metrics.nandCount < prevBest) {
      this.save.bestNandCounts[this.stage.id] = metrics.nandCount;
    }

    // 3. Unlock CS Codex entries
    for (const cid of this.stage.codexUnlock || []) {
      if (!this.save.unlockedCodex.includes(cid)) {
        this.save.unlockedCodex.push(cid);
      }
    }

    persistSaveData(this.save);
    this.dom.stageTitleText.textContent = this.stage.revealedTitle;
    this._syncNextStageQuickBtn();
    this._syncSceneCanvas();

    // 4. Play post-clear revelation dialogue (or full-screen Chapter Ending!), then open Chip Forging ceremony!
    sound.setBgmTrack(this.stage.isFinale ? 'finale' : 'story');
    const nextStage = this._getNextStage();
    const isCh1Finale = this.stage.id === 'stage_17';
    const isCh2Finale = this.stage.id === 'stage_24';
    const journeyStats = this._collectEndingStats(metrics);

    const openCeremony = () => {
      this.modals.openVictory(this.stage, chipDef, metrics, Boolean(nextStage), {
        journeyStats,
        onReplayEnding:
          isCh1Finale || isCh2Finale
            ? () =>
                this._playChapterEnding(isCh2Finale ? 2 : 1, {
                  endBtnLabel: '達成レコードへ戻る ▶',
                  onComplete: () => openCeremony(),
                })
            : null,
        onNext: (overrideId) => {
          this.loadStage(overrideId || nextStage?.id || 'sandbox', { autoIntro: true });
        },
        onOpenCodex: () => {
          this.modals.openCodex(this.save, {
            highlightIds: this.stage.codexUnlock || [],
            nextStageLabel: nextStage ? `次のミッションへ進む (${nextStage.code}) ▶` : '自由実験室（FREE LAB）へ ▶',
            onNextStage: () => {
              this.loadStage(nextStage?.id || 'sandbox', { autoIntro: true });
            },
            onBackToVictory: () => openCeremony(),
          });
        },
        onStay: () => {
          sound.setBgmTrack(this._getStageWorkBgm(this.stage));
        },
      });
    };

    if (isCh1Finale) {
      this.dialogue.showGoal(`✔ 第一章完結：${this.stage.revealedTitle}`, 'hako');
      this._playChapterEnding(1, {
        endBtnLabel: '第一章・達成レコードへ ▶',
        metrics,
        onComplete: openCeremony,
      });
    } else if (isCh2Finale) {
      this.dialogue.showGoal(`☀ 第二章完結：${this.stage.revealedTitle}`, 'hako');
      this._playChapterEnding(2, {
        endBtnLabel: 'グランドフィナーレ認定証へ ▶',
        metrics,
        onComplete: openCeremony,
      });
    } else if (this.stage.outroDialogue && this.stage.outroDialogue.length > 0) {
      const act = ACTS.find((a) => a.id === this.stage.act) || ACTS[0];
      this.dialogue.playLines(this.stage.outroDialogue, {
        fallbackGoal: `✔ クリア済：${this.stage.revealedTitle}`,
        sceneKey: this.stage.scene,
        stageBadge: `✔ CLEAR · ${act.roman} ${this.stage.code}`,
        endLabel: this.stage.kind === 'assembly_program' ? '実行結果へ ▶' : 'チップ登録へ ▶',
        onComplete: openCeremony,
      });
    } else {
      openCeremony();
    }
  }

  _collectEndingStats(latestMetrics = null) {
    const chips = this.save?.customChips || {};
    const forgedChipCount = Object.values(chips).filter((c) => c && !c.provisioned).length;
    const ark4NandCount =
      this.save?.bestNandCounts?.stage_17 ??
      chips.ARK4_CORE?.nandCount ??
      (this.stage?.id === 'stage_17' ? latestMetrics?.nandCount : null) ??
      240;
    const ark4SysNandCount =
      chips.ARK4_SYS?.nandCount ??
      this.save?.bestNandCounts?.stage_21 ??
      (this.stage?.id === 'stage_24' ? latestMetrics?.nandCount : null) ??
      479;
    return {
      ark4NandCount,
      ark4SysNandCount,
      forgedChipCount: Math.max(forgedChipCount, 1),
      clearedCount: (this.save?.clearedStages || []).length,
    };
  }

  _playChapterEnding(chapterNum, { endBtnLabel = '次へ ▶', metrics = null, onComplete = null } = {}) {
    const stats = this._collectEndingStats(metrics);
    const steps =
      chapterNum === 2 ? buildChapter2EndingSteps(stats) : buildChapter1EndingSteps(stats);
    this.dialogue.close();
    this.prologue.playEnding(steps, {
      endBtnLabel,
      onComplete,
    });
  }

  // ===========================================================================
  // CHAPTER 2 LAUNCH (UNLOCKED UPON CLEARING CHAPTER 1 / STAGE 17)
  // ===========================================================================
  startChapter2() {
    if (!isChapter2Unlocked(this.save)) {
      sound.playSwitch(false);
      this.showToast('第一章（STAGE 17：自作CPU起動）をクリアすると第二章が解放されます！');
      return;
    }
    this._ensureChapter1ChipsForChapter2();
    const ch2Stages = STAGES.filter((s) => s.chapter === 2);
    const clearedSet = new Set(this.save.clearedStages || []);
    const curIsCh2 = ch2Stages.some((s) => s.id === this.save.currentStageId);
    const firstUnclearedCh2 = ch2Stages.find((s) => !clearedSet.has(s.id));
    const targetId = curIsCh2
      ? this.save.currentStageId
      : firstUnclearedCh2
        ? firstUnclearedCh2.id
        : 'stage_18';

    this.loadStage(targetId, { autoIntro: true });
    requestAnimationFrame(() => this._fitActiveCanvas());
  }

  _ensureChapter1ChipsForChapter2() {
    this.save.seenPrologue = true;
    this.save.chapter2Unlocked = true;

    // Provision standard working circuits for any Chapter 1 modules the player has not yet forged,
    // marking them with `provisioned: true` while keeping Chapter 1 stages uncleared until solved!
    provisionStandardChips(this.save.customChips, {
      includeChapter2Hardware: false,
      provisioned: true,
    });

    const ch1Stages = STAGES.filter((s) => s.chapter !== 2);
    for (const st of ch1Stages) {
      for (const cid of st.codexUnlock || []) {
        if (!this.save.unlockedCodex.includes(cid)) {
          this.save.unlockedCodex.push(cid);
        }
      }
    }

    persistSaveData(this.save);
  }

  showToast(message) {
    this.dom.toast.textContent = message;
    this.dom.toast.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      this.dom.toast.classList.remove('show');
    }, 2400);
  }

  _registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      const hadController = Boolean(navigator.serviceWorker.controller);
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (hadController && !refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
      navigator.serviceWorker
        .register('./sw.js?v=36', { updateViaCache: 'none' })
        .then((reg) => reg.update().catch(() => {}))
        .catch(() => {});
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.__SG_APP__ = new SiliconGenesisApp();
});
