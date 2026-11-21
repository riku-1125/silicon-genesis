/**
 * SILICON GENESIS — Industrial CRT Modals
 * Spec/Truth Table, Progressive Hints, Test Debugger, Chip Forging Victory,
 * Campaign Map, CS History Codex, and Custom Chip Internal Schematic Inspector.
 */

import { ACTS, STAGES, SANDBOX_STAGE } from '../data/stages.js?v=20';
import { CODEX_ENTRIES } from '../data/codex.js?v=20';
import {
  GLOSSARY_TERMS,
  MODULE_ENCYCLOPEDIA_IDS,
  getGlossaryTerm,
  isGlossaryTermUnlocked,
  isModuleEncyclopediaUnlocked,
} from '../data/glossary.js?v=20';
import { PRIMITIVE_CHIPS, getChipDef } from '../engine/circuit.js';
import { isStageUnlocked } from '../state/storage.js';
import { sound } from '../audio/sound.js?v=20';
import { StoryDiagramGroup } from './storyDiagram.js?v=20';
import { glossaryPopover } from './glossaryPopover.js?v=20';

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatBits(bits) {
  if (!bits) return '-';
  return bits.map((b) => (b === null || b === undefined ? '×' : String(b))).join('');
}

export class ModalManager {
  constructor(backdropEl) {
    this.backdrop = backdropEl;
    this.panel = backdropEl.querySelector('#modal-panel');
    this.titleEl = backdropEl.querySelector('#modal-title');
    this.bodyEl = backdropEl.querySelector('#modal-body');
    this.footerEl = backdropEl.querySelector('#modal-footer');
    this.closeBtn = backdropEl.querySelector('#modal-close');
    this.diagramGroup = new StoryDiagramGroup();

    this.closeBtn.addEventListener('click', () => this.close());
    this.backdrop.addEventListener('click', (e) => {
      if (e.target === this.backdrop) this.close();
    });
  }

  open({ title, bodyHtml, footerHtml = '' }) {
    this.diagramGroup.unmountAll();
    this.titleEl.textContent = title;
    this.bodyEl.innerHTML = bodyHtml;
    this.footerEl.innerHTML = footerHtml;
    this.backdrop.classList.remove('hidden');
  }

  close() {
    this.diagramGroup.unmountAll();
    this.backdrop.classList.add('hidden');
  }

  // ===========================================================================
  // 1. SPEC & TRUTH TABLE MODAL
  // ===========================================================================
  openSpec(stage, isCleared) {
    const pinInputsHtml = (stage.pinHelp?.inputs || stage.inputs)
      .map((line) => `<li><code>${esc(line)}</code></li>`)
      .join('');
    const pinOutputsHtml = (stage.pinHelp?.outputs || stage.outputs)
      .map((line) => `<li><code>${esc(line)}</code></li>`)
      .join('');

    const rowsHtml = stage.tests
      .map((t, idx) => {
        const inp = t.displayInput || t.input;
        return `
          <tr>
            <td class="mono dim">${idx + 1}</td>
            <td>${esc(t.label)}</td>
            <td class="mono amber">${formatBits(inp)}</td>
            <td class="mono emerald">${formatBits(t.expected)}</td>
          </tr>
        `;
      })
      .join('');

    const physicsLabCard =
      stage.mode === 'physics' && Array.isArray(stage.physicsParts)
        ? `
      <div class="callout callout-amber">
        <div class="callout-title">使う材料・物理部品</div>
        <ul style="margin:4px 0 0;padding-left:16px;font-size:12px;line-height:1.6;">
          ${stage.physicsParts
            .map((p) => `<li><b>${esc(p.name)}（${esc(p.meta)}）</b>：${esc(p.rule)}</li>`)
            .join('')}
        </ul>
      </div>
    `
        : '';

    const physicsCard = `
      <div class="callout callout-amber">
        <div class="callout-title">3つの部品のしくみ（Stage 00-C 専用）</div>
        <ul style="margin:4px 0 0;padding-left:16px;font-size:12px;line-height:1.6;">
          <li><b>🔋 でんち</b>：つねに <code>1</code>（電気ON）を流しつづけるスタート地点</li>
          <li><b>🚰 じゃぐち</b>：<code>ひねり=1</code> のときだけ栓が開き、<code>いり</code> の電気を <code>でぐち</code> へ通す</li>
          <li><b>🕳 はいすい</b>：ふだんは <code>でぐち=1</code>。でも <code>ぬけ</code> に電気(1)が流れ込むと地面へ抜けて <code>でぐち=0</code>！</li>
        </ul>
      </div>
    `;

    const nandCard = `
      <div class="callout callout-amber">
        <div class="callout-title">基本部品「NAND（あまのじゃく素子）」のルール</div>
        <div class="nand-mini-table">
          <span>0 & 0 → <b>1</b></span>
          <span>0 & 1 → <b>1</b></span>
          <span>1 & 0 → <b>1</b></span>
          <span class="zero">1 & 1 → <b>0</b></span>
        </div>
      </div>
    `;

    const incidentHtml = stage.incidentBrief
      ? `
        <div class="spec-incident-box">
          <div class="inc-head">🚨 発生中のトラブル // ${esc(stage.incidentBrief.where)}</div>
          <div class="inc-row"><span class="inc-lbl bad">異常</span><span>${esc(stage.incidentBrief.trouble)}</span></div>
          <div class="inc-row"><span class="inc-lbl ok">条件</span><span class="inc-cond">${esc(stage.incidentBrief.condition)}</span></div>
          ${stage.incidentBrief.stakes ? `<div class="inc-row"><span class="inc-lbl goal">目的</span><span>${esc(stage.incidentBrief.stakes)}</span></div>` : ''}
        </div>
      `
      : '';

    this.open({
      title: `仕様書 · STAGE ${stage.code}「${isCleared ? stage.revealedTitle : stage.title}」`,
      bodyHtml: `
        ${incidentHtml}
        <div class="spec-goal">${esc(stage.plainGoal)}</div>
        <p class="spec-note">${esc(stage.beginnerNote)}</p>
        ${stage.mode === 'physics' ? physicsLabCard : stage.number === 0 ? physicsCard : stage.number <= 4 ? nandCard : ''}
        <div class="spec-cols">
          <div class="spec-box">
            <h4>入力ピン（左）</h4>
            <ul>${pinInputsHtml}</ul>
          </div>
          <div class="spec-box">
            <h4>出力ピン（右）</h4>
            <ul>${pinOutputsHtml}</ul>
          </div>
        </div>
        ${
          stage.tests.length > 0
            ? `
          <h4 class="section-heading">テスト判定パターン（${stage.mode === 'sequential' ? '時系列・記憶あり' : '全パターン評価'}）</h4>
          <div class="table-wrap">
            <table class="crt-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>条件</th>
                  <th>入力 (${esc(stage.inputs.join(','))})</th>
                  <th>期待出力 (${esc(stage.outputs.join(','))})</th>
                </tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
            </table>
          </div>`
            : ''
        }
      `,
      footerHtml: `<button class="btn btn-primary" data-close-modal>作業台へ戻る</button>`,
    });

    this.footerEl.querySelector('[data-close-modal]')?.addEventListener('click', () => this.close());
  }

  // ===========================================================================
  // 2. PROGRESSIVE 3-TIER HINT MODAL
  // ===========================================================================
  openHints(stage, revealedCount, onRevealMore) {
    const hints = stage.hints || [];
    const renderBody = (count) => {
      const items = hints
        .map((h, i) => {
          if (i < count) {
            return `
              <div class="hint-card revealed">
                <div class="hint-badge">HINT LEVEL ${i + 1}</div>
                <p>${esc(h)}</p>
              </div>
            `;
          }
          return `
            <div class="hint-card locked">
              <div class="hint-badge">HINT LEVEL ${i + 1}（未解放）</div>
              <p class="dim">必要なときだけ下のボタンで段階的に開けます。</p>
            </div>
          `;
        })
        .join('');

      this.open({
        title: `段階ヒント · STAGE ${stage.code}`,
        bodyHtml: `
          <p class="spec-note">いきなり答えを見ずに、まずは「考え方」から少しずつひらめきを探そう！</p>
          <div class="hint-list">${items}</div>
        `,
        footerHtml: `
          ${
            count < hints.length
              ? `<button class="btn btn-amber" id="btn-reveal-hint">次のヒントを見る (${count}/${hints.length})</button>`
              : ''
          }
          <button class="btn btn-ghost" data-close-modal>閉じる</button>
        `,
      });

      this.footerEl.querySelector('#btn-reveal-hint')?.addEventListener('click', () => {
        const next = Math.min(hints.length, count + 1);
        onRevealMore(next);
        renderBody(next);
      });
      this.footerEl.querySelector('[data-close-modal]')?.addEventListener('click', () => this.close());
    };

    renderBody(Math.max(1, revealedCount));
  }

  // ===========================================================================
  // 3. TEST FAILURE / DIAGNOSTIC DEBUGGER MODAL
  // ===========================================================================
  openTestDiagnostics(stage, evalResult, onLoadCase) {
    const rowsHtml = evalResult.results
      .map((r) => {
        const cls = r.passed ? 'row-pass' : 'row-fail';
        const status = r.unstable ? '⚠ 発振' : r.passed ? '✔ OK' : '✘ NG';
        return `
          <tr class="${cls}" data-case-idx="${r.index}">
            <td class="mono">${r.index + 1}</td>
            <td>
              <div>${esc(r.label)}</div>
              ${!r.passed ? `<button class="mini-inspect-btn" data-load-idx="${r.index}">この入力を回路に再現 ▶</button>` : ''}
            </td>
            <td class="mono">${formatBits(r.input)}</td>
            <td class="mono emerald">${formatBits(r.expected)}</td>
            <td class="mono ${r.passed ? 'emerald' : 'crimson'}">${r.unstable ? 'ERR' : formatBits(r.actual)}</td>
            <td class="mono bold">${status}</td>
          </tr>
        `;
      })
      .join('');

    this.open({
      title: `ハコ診断レポート：${evalResult.passedCount} / ${evalResult.totalCount} 合格`,
      bodyHtml: `
        ${
          evalResult.error
            ? `<div class="callout callout-crimson">⚠ ${esc(evalResult.error)}</div>`
            : `<div class="callout callout-amber">
                不合格の行にある <b>「この入力を回路に再現」</b> を押すと、その入力状態がそのまま回路にセットされます。光っている配線をたどって原因を探そう！
              </div>`
        }
        <div class="table-wrap">
          <table class="crt-table">
            <thead>
              <tr>
                <th>#</th>
                <th>テストケース</th>
                <th>入力</th>
                <th>期待</th>
                <th>結果</th>
                <th>判定</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>
      `,
      footerHtml: `<button class="btn btn-primary" data-close-modal>回路を修正する</button>`,
    });

    this.bodyEl.querySelectorAll('[data-load-idx]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.loadIdx);
        onLoadCase(idx);
        this.close();
      });
    });
    this.footerEl.querySelector('[data-close-modal]')?.addEventListener('click', () => this.close());
  }

  // ===========================================================================
  // 4. VICTORY & CUSTOM CHIP FORGING MODAL
  // ===========================================================================
  openVictory(stage, chipDef, metrics, hasNextStage, { onNext, onOpenCodex, onStay }) {
    const codexCards = (stage.codexUnlock || [])
      .map((cid) => CODEX_ENTRIES[cid])
      .filter(Boolean)
      .map(
        (entry) => `
          <div class="codex-preview">
            <div class="codex-tag">📖 CS史アーカイブ解放 · ${esc(entry.year)}</div>
            <div class="codex-term">${esc(entry.term)}</div>
            <p>${esc(entry.body[0])}</p>
          </div>
        `
      )
      .join('');

    const finaleBanner = stage.isFinale
      ? `<div class="callout callout-emerald">
          <b>🎉 文明再起動達成 — ARK-4 稼働開始！</b><br>
          地上ビーコンから <code>"HELLO, WORLD."</code> が発信されました！ 自由実験室（FREE LAB）で全カスタムチップを使った自由設計も楽しめます。
        </div>`
      : '';

    const metaText =
      stage.id === 'stage_00a'
        ? `半導体構造：<b>N型×2 ＋ ガラス ＋ 金属電極</b>`
        : stage.id === 'stage_00b'
          ? `物理回路：<b>プルアップ抵抗 ＋ 接地スイッチ</b>`
          : stage.id === 'stage_00'
            ? `物理スイッチ(TR): <b>${metrics.nodeCount}</b>部品`
            : `実効NAND: <b>${metrics.nandCount}</b>個 <span class="dim">(TR換算 ${metrics.nandCount * 2}個)</span>`;

    const forgedCaption =
      stage.id === 'stage_00a'
        ? `砂から創り上げた物理スイッチ <b>[じゃぐち（トランジスタ）]</b> の製法を習得しました！`
        : stage.id === 'stage_00b'
          ? `ショートを防ぎ安全に反転する <b>[はいすい（プルアップ抵抗）]</b> の製法を習得しました！ いよいよNANDを組もう！`
          : stage.id === 'stage_00'
            ? `物理スイッチから組み上げた原板 <b>[NAND]</b> をB4焼付け機へセットしました！ これ以降はこの <b>NAND</b> だけを量産して上位回路を創り上げます。`
            : `あなたの回路をカスタムICチップ <b>[${esc(chipDef.name)}]</b> としてパレットに永続登録しました！`;

    this.open({
      title: stage.isFinale ? '★ SILICON GENESIS — 文明再起動完了！' : `✔ STAGE ${stage.code} クリア！`,
      bodyHtml: `
        ${finaleBanner}
        <div class="victory-chip-stage">
          <div class="forged-chip" style="--chip-color:${esc(chipDef.color)}; --chip-accent:${esc(chipDef.accent)}">
            <div class="forged-chip-head">${esc(chipDef.name)}</div>
            <div class="forged-chip-body">
              <div class="forged-pins-col">
                ${chipDef.inputs.slice(0, 6).map((p) => `<span>● ${esc(p)}</span>`).join('')}
                ${chipDef.inputs.length > 6 ? `<span>+${chipDef.inputs.length - 6}</span>` : ''}
              </div>
              <div class="forged-chip-center">
                <div class="forged-title">${esc(stage.revealedTitle)}</div>
                <div class="forged-meta">${metaText}</div>
              </div>
              <div class="forged-pins-col right">
                ${chipDef.outputs.slice(0, 6).map((p) => `<span>${esc(p)} ●</span>`).join('')}
              </div>
            </div>
          </div>
          <p class="forged-caption">${forgedCaption}</p>
        </div>
        ${codexCards}
      `,
      footerHtml: `
        ${
          hasNextStage
            ? `<button class="btn btn-emerald" id="btn-victory-next">次のミッションへ進む ▶</button>`
            : `<button class="btn btn-emerald" id="btn-victory-sandbox">自由実験室（FREE LAB）へ ▶</button>`
        }
        <button class="btn btn-amber" id="btn-victory-codex">📖 CS図鑑を読む</button>
        <button class="btn btn-ghost" id="btn-victory-stay">この回路に留まる</button>
      `,
    });

    this.footerEl.querySelector('#btn-victory-next')?.addEventListener('click', () => {
      this.close();
      onNext();
    });
    this.footerEl.querySelector('#btn-victory-sandbox')?.addEventListener('click', () => {
      this.close();
      onNext('sandbox');
    });
    this.footerEl.querySelector('#btn-victory-codex')?.addEventListener('click', () => {
      this.close();
      onOpenCodex();
    });
    this.footerEl.querySelector('#btn-victory-stay')?.addEventListener('click', () => {
      this.close();
      onStay?.();
    });
  }

  // ===========================================================================
  // 5. CAMPAIGN STAGE MAP & SAVE MANAGEMENT MODAL
  // ===========================================================================
  openMap(save, currentStageId, { onSelectStage, onReplayPrologue, onResetSave }) {
    const actsHtml = ACTS.map((act) => {
      const stagesInAct = STAGES.filter((s) => s.act === act.id);
      const cards = stagesInAct
        .map((st) => {
          const unlocked = isStageUnlocked(save, st.id);
          const cleared = save.clearedStages.includes(st.id);
          const active = st.id === currentStageId;
          const nandBest = save.bestNandCounts[st.id];
          return `
            <button
              class="map-stage-btn ${cleared ? 'cleared' : ''} ${active ? 'active' : ''} ${!unlocked ? 'locked' : ''}"
              data-stage-id="${st.id}"
              ${!unlocked ? 'disabled' : ''}
            >
              <span class="map-code">${st.code}</span>
              <span class="map-info">
                <span class="map-name">${esc(cleared ? st.revealedTitle : st.title)}</span>
                <span class="map-sub">
                  ${
                    cleared
                      ? st.id === 'stage_00a'
                        ? `✔ 構造体得 [じゃぐち / MOSFET]`
                        : st.id === 'stage_00b'
                          ? `✔ 構造体得 [はいすい / プルアップ抵抗]`
                          : st.id === 'stage_00'
                            ? `✔ 原板登録済 [NAND] · 物理スイッチ`
                            : `✔ チップ登録済 [${st.rewardChip.name}] · ${nandBest ?? '?'} NAND`
                      : unlocked
                        ? '挑戦可能'
                        : '🔒 前のステージをクリアで解放'
                  }
                </span>
              </span>
            </button>
          `;
        })
        .join('');

      return `
        <div class="map-act-group">
          <div class="map-act-header" style="border-left-color:${act.color}">
            <span class="map-act-roman" style="color:${act.color}">${act.roman}</span>
            <span class="map-act-title">${esc(act.title)}</span>
            <span class="map-act-sub">${esc(act.subtitle)}</span>
          </div>
          <div class="map-stage-list">${cards}</div>
        </div>
      `;
    }).join('');

    const sandboxUnlocked = isStageUnlocked(save, 'sandbox');
    const clearedTotal = save.clearedStages.length;

    this.open({
      title: `ミッションマップ（進捗 ${clearedTotal} / ${STAGES.length}）`,
      bodyHtml: `
        <div class="map-sandbox-wrap">
          <button class="map-stage-btn prologue-replay-btn" id="btn-map-prologue">
            <span class="map-code">PRO</span>
            <span class="map-info">
              <span class="map-name">🎬 オープニング物語（プロローグ）</span>
              <span class="map-sub">2094年・地下シェルター「アーク7」導入ストーリーを再生</span>
            </span>
          </button>
        </div>
        <div class="map-sandbox-wrap">
          <button class="map-stage-btn sandbox-btn ${currentStageId === 'sandbox' ? 'active' : ''} ${!sandboxUnlocked ? 'locked' : ''}" data-stage-id="sandbox" ${!sandboxUnlocked ? 'disabled' : ''}>
            <span class="map-code">LAB</span>
            <span class="map-info">
              <span class="map-name">${esc(SANDBOX_STAGE.title)}</span>
              <span class="map-sub">${sandboxUnlocked ? '自作チップを自由に組んで実験！' : '🔒 STAGE 01 クリアで解放'}</span>
            </span>
          </button>
        </div>
        ${actsHtml}
        <div class="danger-zone">
          <button class="btn btn-danger-outline" id="btn-reset-save">セーブデータを初期化</button>
        </div>
      `,
      footerHtml: `<button class="btn btn-ghost" data-close-modal>閉じる</button>`,
    });

    this.bodyEl.querySelector('#btn-map-prologue')?.addEventListener('click', () => {
      this.close();
      onReplayPrologue?.();
    });

    this.bodyEl.querySelectorAll('[data-stage-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const sid = btn.dataset.stageId;
        this.close();
        onSelectStage(sid);
      });
    });

    this.bodyEl.querySelector('#btn-reset-save')?.addEventListener('click', () => {
      if (window.confirm('進行状況と自作チップをすべて初期化して最初から始めますか？')) {
        this.close();
        onResetSave();
      }
    });
    this.footerEl.querySelector('[data-close-modal]')?.addEventListener('click', () => this.close());
  }

  // ===========================================================================
  // 6. 2-TAB ENCYCLOPEDIA: MODULE ENCYCLOPEDIA (LIVE DIAGRAMS) & CS HISTORY CODEX
  // ===========================================================================
  openCodex(
    saveOrUnlockedIds = [],
    {
      highlightIds = [],
      initialTab = null,
      showAllModules = false,
      onNextStage = null,
      nextStageLabel = '次のミッションへ進む ▶',
      onBackToVictory = null,
    } = {}
  ) {
    const isSaveObj = saveOrUnlockedIds && !Array.isArray(saveOrUnlockedIds) && typeof saveOrUnlockedIds === 'object';
    const save = isSaveObj
      ? saveOrUnlockedIds
      : {
          unlockedCodex: Array.isArray(saveOrUnlockedIds) ? saveOrUnlockedIds : [],
          clearedStages: [],
          customChips: {},
        };

    const unlockedSet = new Set(save.unlockedCodex || []);
    const clearedSet = new Set(save.clearedStages || []);
    const customChips = save.customChips || {};
    const highlightSet = new Set(highlightIds);

    const allHistoryEntries = Object.values(CODEX_ENTRIES);
    const unlockedHistoryCount = allHistoryEntries.filter((e) => unlockedSet.has(e.id)).length;

    const moduleEntries = MODULE_ENCYCLOPEDIA_IDS.map((id) => getGlossaryTerm(id)).filter(Boolean);
    const isModuleUnlocked = (term) => isModuleEncyclopediaUnlocked(term.id, isSaveObj ? save : null);
    const unlockedModuleCount = moduleEntries.filter((m) => isModuleUnlocked(m)).length;

    let activeTab = initialTab || (highlightIds.length > 0 ? 'history' : 'modules');
    const moduleHistory = []; // Stack of module termIds for "◀ ひとつ戻る" navigation

    const renderModalContent = (scrollTargetModuleId = null) => {
      // 1. Build Module Encyclopedia HTML (strictly locked until each stage is cleared!)
      const moduleCardsHtml = moduleEntries
        .map((term) => {
          const unlocked = isModuleUnlocked(term);
          const cleared = term.stageId ? clearedSet.has(term.stageId) : unlocked;
          const forged = term.chipId ? customChips[term.chipId] : null;

          if (!unlocked) {
            return `
              <div class="codex-entry locked" data-module-id="${esc(term.id)}">
                <div class="codex-entry-head">
                  <span class="codex-act">${esc(term.category)}</span>
                  <span class="codex-title">🔒 未取得モジュール（${esc(term.unlockLabel || 'クリアで解放')}）</span>
                </div>
                <p class="dim">対応するステージを自力でクリアすると、モジュールの解説と動的図解が登録されます。</p>
              </div>
            `;
          }

          const statusBadge = forged
            ? `<span class="mod-status-badge forged">✔ 自作チップ登録済 · 実効 ${forged.nandCount ?? 0} NAND</span>`
            : cleared
              ? `<span class="mod-status-badge cleared">✔ クリア・習得済</span>`
              : `<span class="mod-status-badge">📖 動的図解</span>`;

          const pinsHtml = term.pins
            ? `
              <div class="gp-pins-wrap">
                <span class="gp-pin-pill in">入力: <b>${esc((term.pins.inputs || []).join(', '))}</b></span>
                <span class="gp-pin-pill out">出力: <b>${esc((term.pins.outputs || []).join(', '))}</b></span>
              </div>
            `
            : '';

          const diagramHtml = term.anim
            ? `
              <div class="vc-live-wrap codex-diagram-wrap">
                <canvas class="vc-live-canvas codex-live-canvas" data-anim="${esc(term.anim)}" aria-label="${esc(term.title)} 動く図解"></canvas>
              </div>
            `
            : '';

          const relatedTerms = (term.related || [])
            .map((rid) => getGlossaryTerm(rid))
            .filter(Boolean);

          const relatedHtml =
            relatedTerms.length > 0
              ? `
                <div class="codex-related-row">
                  <span class="codex-related-lbl">関連解説：</span>
                  ${relatedTerms
                    .map((rel) => {
                      const isMod = MODULE_ENCYCLOPEDIA_IDS.includes(rel.id);
                      const relOpen = isMod
                        ? isModuleUnlocked(rel)
                        : isGlossaryTermUnlocked(rel.id, isSaveObj ? save : null);
                      if (!relOpen) {
                        const lockReason = rel.unlockClearedStage
                          ? rel.unlockLabel || 'クリアで解放'
                          : '物語の進行で解放';
                        return `<span class="gp-related-chip locked">🔒 未取得（${esc(lockReason)}）</span>`;
                      }
                      return `
                        <button type="button" class="gp-related-chip" data-jump-term="${esc(rel.id)}" data-from-module="${esc(term.id)}">
                          ${isMod ? '⚡ ' : '📖 '}${esc(rel.title.split('（')[0])}
                        </button>
                      `;
                    })
                    .join('')}
                </div>
              `
              : '';

          const inspectBtnHtml =
            forged && term.chipId
              ? `
                <div class="codex-inspect-row">
                  <button type="button" class="mini-inspect-btn" data-inspect-chip="${esc(term.chipId)}">
                    🔍 あなたが設計した [${esc(forged.name || term.chipId)}] の内部回路を見る ▶
                  </button>
                </div>
              `
              : '';

          return `
            <div class="codex-entry module-codex-card" data-module-id="${esc(term.id)}">
              <div class="codex-entry-head">
                <span class="codex-act">${esc(term.category)}</span>
                ${statusBadge}
              </div>
              <div class="codex-title" style="margin-bottom:2px;">${esc(term.title)}</div>
              <div class="codex-subtitle">${esc(term.reading || '')}</div>
              ${pinsHtml}
              ${diagramHtml}
              <p>${esc(term.summary)}</p>
              ${
                term.analogy
                  ? `<div class="gp-analogy-wrap" style="margin-top:8px;">
                      <div class="gp-analogy-lbl">💡 たとえるなら</div>
                      <div class="gp-analogy">${esc(term.analogy)}</div>
                    </div>`
                  : ''
              }
              ${inspectBtnHtml}
              ${relatedHtml}
            </div>
          `;
        })
        .join('');

      // 2. Build CS History Archive HTML
      const historyListHtml = allHistoryEntries
        .map((entry) => {
          const open = unlockedSet.has(entry.id);
          const isNew = highlightSet.has(entry.id);
          if (!open) {
            return `
              <div class="codex-entry locked">
                <div class="codex-entry-head">
                  <span class="codex-act">${esc(entry.act)}</span>
                  <span class="codex-title">🔒 未解読アーカイブ</span>
                </div>
                <p class="dim">対応する回路を自力で組み上げると、篝博士の解説ログが解放されます。</p>
              </div>
            `;
          }
          return `
            <div class="codex-entry ${isNew ? 'codex-new' : ''}" data-codex-id="${esc(entry.id)}">
              <div class="codex-entry-head">
                <span class="codex-act">${esc(entry.act)} · ${esc(entry.year)}${isNew ? ' <span class="codex-new-badge">NEW!</span>' : ''}</span>
                <span class="codex-title">${esc(entry.term)}</span>
              </div>
              <div class="codex-subtitle">${esc(entry.subtitle)}</div>
              ${entry.body.map((p) => `<p>${esc(p)}</p>`).join('')}
            </div>
          `;
        })
        .join('');

      const prevModuleId = moduleHistory.length > 0 ? moduleHistory[moduleHistory.length - 1] : null;
      const prevModuleTerm = prevModuleId ? getGlossaryTerm(prevModuleId) : null;
      const prevModuleShort = prevModuleTerm ? prevModuleTerm.title.split('（')[0] : '';

      const bodyHtml = `
        <div class="codex-tabs-bar">
          <button type="button" class="codex-tab-btn ${activeTab === 'modules' ? 'active' : ''}" data-codex-tab="modules">
            ⚡ モジュール図鑑 (${unlockedModuleCount}/${moduleEntries.length})
          </button>
          <button type="button" class="codex-tab-btn ${activeTab === 'history' ? 'active' : ''}" data-codex-tab="history">
            📜 CS歴史図鑑 (${unlockedHistoryCount}/${allHistoryEntries.length})
          </button>
        </div>

        ${
          activeTab === 'modules'
            ? `
              <div class="codex-module-toolbar">
                <span class="codex-toolbar-note">👆 解放済みの動的図解はタップで入力パターンを切り替えられます</span>
              </div>
              <div id="codex-back-bar" class="codex-back-bar ${prevModuleTerm ? '' : 'hidden'}">
                <button type="button" id="btn-codex-history-back" class="btn btn-amber codex-history-back-btn">
                  ◀ ひとつ前の解説へ戻る（${esc(prevModuleShort)}）
                </button>
              </div>
              <div class="codex-list">${moduleCardsHtml}</div>
            `
            : `<div class="codex-list">${historyListHtml}</div>`
        }
      `;

      const footerHtml = onNextStage
        ? `
          <button class="btn btn-emerald" id="btn-codex-next">${esc(nextStageLabel)}</button>
          ${onBackToVictory ? `<button class="btn btn-ghost" id="btn-codex-back">クリア画面へ戻る</button>` : ''}
          <button class="btn btn-ghost" data-close-modal>閉じる</button>
        `
        : `<button class="btn btn-primary" data-close-modal>閉じる</button>`;

      this.open({
        title: `📖 アーク7 技術・歴史図鑑`,
        bodyHtml,
        footerHtml,
      });

      // Mount live interactive canvases when on the Modules tab!
      if (activeTab === 'modules') {
        this.diagramGroup.mountAll(this.bodyEl);
      }

      // Bind tab switching
      this.bodyEl.querySelectorAll('[data-codex-tab]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const nextTab = btn.dataset.codexTab;
          if (!nextTab || nextTab === activeTab) return;
          sound.playSwitch(true);
          activeTab = nextTab;
          renderModalContent();
        });
      });

      // Bind "◀ ひとつ前の解説へ戻る" button
      this.bodyEl.querySelector('#btn-codex-history-back')?.addEventListener('click', () => {
        if (moduleHistory.length === 0) return;
        sound.playSwitch(false);
        const targetId = moduleHistory.pop();
        renderModalContent(targetId);
      });

      // Bind related module/term jump chips (only unlocked chips have data-jump-term)
      this.bodyEl.querySelectorAll('[data-jump-term]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const targetId = btn.dataset.jumpTerm;
          const fromId = btn.dataset.fromModule;
          if (!targetId) return;
          sound.playSwitch(true);

          if (MODULE_ENCYCLOPEDIA_IDS.includes(targetId)) {
            const targetTerm = getGlossaryTerm(targetId);
            if (!targetTerm || !isModuleUnlocked(targetTerm)) return;
            if (fromId && fromId !== targetId) {
              moduleHistory.push(fromId);
            }
            renderModalContent(targetId);
          } else {
            if (!isGlossaryTermUnlocked(targetId, isSaveObj ? save : null)) return;
            glossaryPopover.open(targetId);
          }
        });
      });

      // Bind "自分の設計回路を見る" buttons
      this.bodyEl.querySelectorAll('[data-inspect-chip]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const chipId = btn.dataset.inspectChip;
          if (!chipId) return;
          sound.playSwitch(true);
          this.openChipInspector(chipId, customChips, {
            onBack: () => {
              this.openCodex(saveOrUnlockedIds, {
                highlightIds,
                initialTab: 'modules',
                onNextStage,
                nextStageLabel,
                onBackToVictory,
              });
            },
          });
        });
      });

      // Scroll to target module card (with golden highlight flash) or newly unlocked CS history card
      if (activeTab === 'modules' && scrollTargetModuleId) {
        const card = this.bodyEl.querySelector(`[data-module-id="${scrollTargetModuleId}"]`);
        if (card) {
          card.classList.add('codex-jump-highlight');
          requestAnimationFrame(() => card.scrollIntoView({ behavior: 'smooth', block: 'start' }));
        }
      } else if (activeTab === 'history' && highlightIds.length > 0) {
        const target = this.bodyEl.querySelector(`[data-codex-id="${highlightIds[0]}"]`);
        if (target) {
          requestAnimationFrame(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }));
        }
      }

      this.footerEl.querySelector('#btn-codex-next')?.addEventListener('click', () => {
        this.close();
        onNextStage?.();
      });
      this.footerEl.querySelector('#btn-codex-back')?.addEventListener('click', () => {
        onBackToVictory?.();
      });
      this.footerEl.querySelector('[data-close-modal]')?.addEventListener('click', () => this.close());
    };

    renderModalContent();
  }

  // ===========================================================================
  // 7. CUSTOM CHIP INTERNAL SCHEMATIC INSPECTOR
  // ===========================================================================
  openPhysicsPartInfo(part) {
    if (!part) return;
    this.open({
      title: `物理材料メモ · ${part.name}`,
      bodyHtml: `
        <div class="callout callout-amber">
          <div class="callout-title">${esc(part.name)}（${esc(part.meta)}）</div>
          <div>${esc(part.rule)}</div>
        </div>
        <p class="spec-note">${esc(part.descJa || '')}</p>
      `,
      footerHtml: `<button class="btn btn-primary" data-close-modal>閉じる</button>`,
    });
    this.footerEl.querySelector('[data-close-modal]')?.addEventListener('click', () => this.close());
  }

  openChipInspector(chipType, customChips, { onBack = null } = {}) {
    const def = getChipDef(chipType, customChips);
    if (!def) return;

    const customNandCircuit = chipType === 'NAND' ? customChips?.NAND?.circuit : null;
    const circuitToShow = customNandCircuit || def.circuit;

    let schematicHtml = '';
    if (circuitToShow) {
      const heading =
        chipType === 'NAND'
          ? `あなたが物理スイッチから創り上げた NAND 原板（${circuitToShow.nodes.length}部品）`
          : `あなたが設計した内部回路（${circuitToShow.nodes.length}チップ / 実効 ${def.nandCount} NAND）`;
      schematicHtml = `
        <h4 class="section-heading">${heading}</h4>
        ${this._renderMiniSchematicSvg(circuitToShow, customChips)}
      `;
    } else if (def.isPrimitive) {
      schematicHtml = `
        <div class="callout callout-amber">
          <b>基本物理素子（これ以上分解できません）</b><br>
          ${esc(def.descJa)}
        </div>
      `;
    }

    this.open({
      title: `チップ解析 · ${def.name}（${def.titleJa || def.id}）`,
      bodyHtml: `
        <p class="spec-note">${esc(def.descJa || '')}</p>
        <div class="chip-stats-row">
          <div class="stat-pill">入力: <b>${def.inputs.length}</b> (${esc(def.inputs.join(', ') || 'なし')})</div>
          <div class="stat-pill">出力: <b>${def.outputs.length}</b> (${esc(def.outputs.join(', '))})</div>
          <div class="stat-pill">実効NAND: <b>${def.nandCount ?? 0}</b></div>
          <div class="stat-pill">抽象階層: <b>Lv.${def.depth ?? 0}</b></div>
        </div>
        ${schematicHtml}
      `,
      footerHtml: `
        ${onBack ? `<button class="btn btn-amber" id="btn-inspector-back">◀ モジュール図鑑へ戻る</button>` : ''}
        <button class="btn btn-primary" data-close-modal>閉じる</button>
      `,
    });

    this.footerEl.querySelector('#btn-inspector-back')?.addEventListener('click', () => {
      sound.playSwitch(false);
      onBack?.();
    });
    this.footerEl.querySelector('[data-close-modal]')?.addEventListener('click', () => this.close());
  }

  // ===========================================================================
  // 8. SETTINGS MODAL (AUDIO, VOLUME SLIDER, SOUND TEST, RESET SAVE)
  // ===========================================================================
  openSettings(
    save,
    audioStatusText,
    bgmTrackName,
    {
      onChangeBgmEnabled,
      onChangeBgmVolume,
      onChangeSoundEnabled,
      onChangeVolume,
      onChangeDrone,
      onTestSound,
      onReturnTitle,
      onReplayPrologue,
      onResetSave,
    }
  ) {
    const volPct = Math.round((save.soundVolume ?? 0.8) * 100);
    const bgmPct = Math.round((save.bgmVolume ?? 0.55) * 100);
    const clearedCount = save.clearedStages?.length || 0;
    const chipCount = Object.keys(save.customChips || {}).length;

    this.open({
      title: '⚙ システム設定（BGM・音量・セーブ）',
      bodyHtml: `
        <div class="settings-section">
          <div class="settings-heading">BGM・サウンド設定</div>
          <div id="set-bgm-now" class="bgm-now-pill">♪ BGM: ${esc(bgmTrackName || '待機中')}</div>

          <label class="setting-row">
            <span class="setting-info">
              <span class="setting-label">BGM（シンセ音楽）</span>
              <span class="setting-sub">場面に合わせて切り替わる専用サウンドトラック</span>
            </span>
            <input type="checkbox" id="set-bgm-enabled" class="setting-toggle" ${save.bgmEnabled !== false ? 'checked' : ''} />
          </label>

          <div class="setting-row setting-slider-row">
            <div class="setting-slider-head">
              <span class="setting-label">BGM 音量</span>
              <span id="set-bgm-vol-val" class="mono emerald bold">${bgmPct}%</span>
            </div>
            <input type="range" id="set-bgm-vol-range" class="setting-range" min="0" max="100" step="5" value="${bgmPct}" />
          </div>

          <label class="setting-row">
            <span class="setting-info">
              <span class="setting-label">効果音（SE）</span>
              <span class="setting-sub">スイッチ音・配線スナップ・会話音・クリア和音</span>
            </span>
            <input type="checkbox" id="set-sound-enabled" class="setting-toggle" ${save.soundEnabled ? 'checked' : ''} />
          </label>

          <div class="setting-row setting-slider-row">
            <div class="setting-slider-head">
              <span class="setting-label">効果音 音量</span>
              <span id="set-volume-val" class="mono amber bold">${volPct}%</span>
            </div>
            <input type="range" id="set-volume-range" class="setting-range" min="0" max="100" step="5" value="${volPct}" />
          </div>

          <label class="setting-row">
            <span class="setting-info">
              <span class="setting-label">地下シェルター環境音</span>
              <span class="setting-sub">わずかなCRT・発電炉の低音ハム音</span>
            </span>
            <input type="checkbox" id="set-drone-enabled" class="setting-toggle" ${save.droneEnabled ? 'checked' : ''} />
          </label>

          <div class="sound-test-box">
            <button type="button" id="btn-sound-test" class="btn btn-amber">🔊 テスト音を鳴らす</button>
            <div id="set-audio-status" class="audio-status-note">音声エンジン: ${esc(audioStatusText)}</div>
            <div class="audio-status-tip">※ スマホで音が出ない場合は、本体の音量ボタンとマナーモード（消音スイッチ）もご確認ください。</div>
          </div>
        </div>

        <div class="settings-section">
          <div class="settings-heading">セーブデータ・最初からプレイ</div>
          <div class="save-summary-box">
            <div>現在の進捗：<b>${clearedCount} / ${STAGES.length}</b> ステージクリア ／ 自作チップ <b>${chipCount}</b> 種</div>
          </div>
          <div class="settings-actions-col">
            ${
              onReturnTitle
                ? `<button type="button" id="btn-set-return-title" class="btn btn-primary">🏠 タイトル画面（ホーム）へ戻る</button>`
                : ''
            }
            <button type="button" id="btn-set-replay-pro" class="btn btn-ghost">🎬 プロローグをもう一度観る（データ保持）</button>
            <button type="button" id="btn-set-reset-save" class="btn btn-danger-solid">🗑 セーブデータを消して最初からプレイ</button>
          </div>
        </div>
      `,
      footerHtml: `<button class="btn btn-primary" data-close-modal>閉じる</button>`,
    });

    const chkBgm = this.bodyEl.querySelector('#set-bgm-enabled');
    const sliderBgm = this.bodyEl.querySelector('#set-bgm-vol-range');
    const lblBgm = this.bodyEl.querySelector('#set-bgm-vol-val');
    const bgmNowEl = this.bodyEl.querySelector('#set-bgm-now');
    const chkSound = this.bodyEl.querySelector('#set-sound-enabled');
    const sliderVol = this.bodyEl.querySelector('#set-volume-range');
    const lblVol = this.bodyEl.querySelector('#set-volume-val');
    const chkDrone = this.bodyEl.querySelector('#set-drone-enabled');
    const statusEl = this.bodyEl.querySelector('#set-audio-status');

    chkBgm?.addEventListener('change', () => {
      const name = onChangeBgmEnabled?.(chkBgm.checked);
      if (name && bgmNowEl) bgmNowEl.textContent = `♪ BGM: ${name}`;
    });

    sliderBgm?.addEventListener('input', () => {
      const pct = Number(sliderBgm.value);
      lblBgm.textContent = `${pct}%`;
      onChangeBgmVolume?.(pct / 100);
    });

    chkSound?.addEventListener('change', () => {
      onChangeSoundEnabled?.(chkSound.checked);
    });

    sliderVol?.addEventListener('input', () => {
      const pct = Number(sliderVol.value);
      lblVol.textContent = `${pct}%`;
      onChangeVolume?.(pct / 100);
    });
    sliderVol?.addEventListener('change', () => {
      const status = onTestSound?.();
      if (status && statusEl) statusEl.textContent = `音声エンジン: ${status}`;
    });

    chkDrone?.addEventListener('change', () => {
      onChangeDrone?.(chkDrone.checked);
    });

    this.bodyEl.querySelector('#btn-sound-test')?.addEventListener('click', () => {
      const status = onTestSound?.();
      if (status && statusEl) statusEl.textContent = `音声エンジン: ${status}`;
    });

    this.bodyEl.querySelector('#btn-set-return-title')?.addEventListener('click', () => {
      this.close();
      onReturnTitle?.();
    });

    this.bodyEl.querySelector('#btn-set-replay-pro')?.addEventListener('click', () => {
      this.close();
      onReplayPrologue?.();
    });

    this.bodyEl.querySelector('#btn-set-reset-save')?.addEventListener('click', () => {
      if (window.confirm('セーブデータと自作チップをすべて消去して、最初から（プロローグから）やり直しますか？')) {
        this.close();
        onResetSave?.();
      }
    });

    this.footerEl.querySelector('[data-close-modal]')?.addEventListener('click', () => this.close());
  }

  _renderMiniSchematicSvg(circuit, customChips) {
    const w = 660;
    const maxPins = Math.max(circuit.inputs.length, circuit.outputs.length);
    const h = maxPins >= 8 ? 500 : maxPins >= 6 ? 430 : 360;

    const inPos = (idx) => {
      const n = circuit.inputs.length;
      const y = n <= 1 ? h / 2 : 36 + (idx * (h - 72)) / (n - 1);
      return { x: 86, y };
    };
    const outPos = (idx) => {
      const n = circuit.outputs.length;
      const y = n <= 1 ? h / 2 : 36 + (idx * (h - 72)) / (n - 1);
      return { x: 574, y };
    };
    const nodePos = (node) => {
      const def = getChipDef(node.type, customChips) || PRIMITIVE_CHIPS.NAND;
      const mp = Math.max(def.inputs.length, def.outputs.length, 1);
      const step = mp >= 8 ? 22 : 26;
      const nh = Math.max(52, mp * step + 18);
      const nw = mp >= 6 ? 100 : 78;
      return { nw, nh, def, step };
    };

    const getEp = (ep, side) => {
      if (ep.kind === 'input') return inPos(ep.pin);
      if (ep.kind === 'output') return outPos(ep.pin);
      const node = circuit.nodes.find((n) => n.id === ep.nodeId);
      if (!node) return { x: w / 2, y: h / 2 };
      const { nw, nh, def, step } = nodePos(node);
      const pins = side === 'in' ? def.inputs : def.outputs;
      const startY = node.y + nh / 2 - ((pins.length - 1) * step) / 2;
      const y = pins.length <= 1 ? node.y + nh / 2 : startY + ep.pin * step;
      return { x: side === 'in' ? node.x : node.x + nw, y };
    };

    const wiresSvg = circuit.wires
      .map((wire) => {
        const a = getEp(wire.from, 'out');
        const b = getEp(wire.to, 'in');
        const c = Math.max(30, Math.abs(b.x - a.x) * 0.45);
        return `<path d="M${a.x},${a.y} C${a.x + c},${a.y} ${b.x - c},${b.y} ${b.x},${b.y}" fill="none" stroke="#ffb84d" stroke-width="2.5" opacity="0.82"/>`;
      })
      .join('');

    const nodesSvg = circuit.nodes
      .map((node) => {
        const { nw, nh, def } = nodePos(node);
        return `
          <rect x="${node.x}" y="${node.y}" width="${nw}" height="${nh}" rx="6" fill="#1b2530" stroke="${esc(def.accent || '#8aa')}" stroke-width="2"/>
          <text x="${node.x + nw / 2}" y="${node.y + nh / 2 + 4}" text-anchor="middle" fill="#fff" font-size="13" font-family="monospace" font-weight="bold">${esc(def.name)}</text>
        `;
      })
      .join('');

    const inSvg = circuit.inputs
      .map((lbl, i) => {
        const p = inPos(i);
        return `<rect x="14" y="${p.y - 12}" width="72" height="24" rx="5" fill="#23303d" stroke="#ffb84d"/><text x="50" y="${p.y + 4}" text-anchor="middle" fill="#ffd166" font-size="12" font-family="monospace">${esc(lbl)}</text>`;
      })
      .join('');

    const outSvg = circuit.outputs
      .map((lbl, i) => {
        const p = outPos(i);
        return `<rect x="574" y="${p.y - 12}" width="72" height="24" rx="5" fill="#17332a" stroke="#52e3b6"/><text x="610" y="${p.y + 4}" text-anchor="middle" fill="#72f2c8" font-size="12" font-family="monospace">${esc(lbl)}</text>`;
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
}
