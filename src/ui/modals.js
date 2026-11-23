/**
 * SILICON GENESIS — Industrial CRT Modals
 * Spec/Truth Table, Progressive Hints, Test Debugger, Chip Forging Victory,
 * Campaign Map, CS History Codex, and Custom Chip Internal Schematic Inspector.
 */

import { ACTS, STAGES, SANDBOX_STAGE } from '../data/stages.js?v=29';
import { CODEX_ENTRIES } from '../data/codex.js?v=29';
import {
  GLOSSARY_TERMS,
  MODULE_ENCYCLOPEDIA_IDS,
  getGlossaryTerm,
  getGlossaryTermForChip,
  getModulesForCodexId,
  isGlossaryTermUnlocked,
  isModuleEncyclopediaUnlocked,
} from '../data/glossary.js?v=29';
import { PRIMITIVE_CHIPS, getChipDef } from '../engine/circuit.js';
import { compileCircuit } from '../engine/simulator.js';
import { isStageUnlocked } from '../state/storage.js';
import { sound } from '../audio/sound.js?v=29';
import { StoryDiagramGroup } from './storyDiagram.js?v=29';
import { glossaryPopover } from './glossaryPopover.js?v=29';

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

function formatComparedActualBits(actual, expected, outputNames = []) {
  if (!actual) return '-';
  return actual
    .map((b, i) => {
      const valStr = b === null || b === undefined ? '×' : String(b);
      const exp = expected ? expected[i] : undefined;
      const isDiff = exp !== null && exp !== undefined && b !== exp;
      if (!isDiff) return `<span>${esc(valStr)}</span>`;
      const pinLbl = outputNames[i] || `OUT${i}`;
      return `<span class="bit-diff-badge" title="${esc(pinLbl)}: 期待=${exp} / 実測=${valStr}">${esc(valStr)}</span>`;
    })
    .join('');
}

function buildPinDiffSummary(actual, expected, outputNames = []) {
  if (!actual || !expected) return '';
  const diffs = [];
  for (let i = 0; i < expected.length; i++) {
    const exp = expected[i];
    if (exp === null || exp === undefined) continue;
    const act = actual[i];
    if (act !== exp) {
      const pinLbl = outputNames[i] || `OUT${i}`;
      diffs.push(`<b>${esc(pinLbl)}</b> (期待<code>${exp}</code>≠実測<code class="bad">${act ?? '?'}</code>)`);
    }
  }
  if (diffs.length === 0) return '';
  return `<div class="diag-pin-diffs">不一致出力: ${diffs.join(' · ')}</div>`;
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
    this._miniSimTimer = null;

    this.closeBtn.addEventListener('click', () => this.close());
    this.backdrop.addEventListener('click', (e) => {
      if (e.target === this.backdrop) this.close();
    });
  }

  _stopMiniSchematicLoop() {
    if (this._miniSimTimer) {
      clearInterval(this._miniSimTimer);
      this._miniSimTimer = null;
    }
  }

  open({ title, bodyHtml, footerHtml = '' }) {
    this._stopMiniSchematicLoop();
    this.diagramGroup.unmountAll();
    this.titleEl.textContent = title;
    this.bodyEl.innerHTML = bodyHtml;
    this.footerEl.innerHTML = footerHtml;
    this.backdrop.classList.remove('hidden');
  }

  close() {
    this._stopMiniSchematicLoop();
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

    const asmSpecCard =
      stage.kind === 'assembly_program' && stage.asmProgramSpec
        ? `
      <div class="callout callout-emerald" style="margin-bottom:10px;">
        <div class="callout-title">🎯 ミッション採点仕様（あなたの自作CPU [ARK4_SYS] で実機検証）</div>
        <ul style="margin:4px 0 0;padding-left:16px;font-size:12px;line-height:1.6;">
          <li><b>開始状態</b>：ハードウェア初期化（POR）により <code>PC=0番地, ACC=0 (0000)</code> からスタート</li>
          <li><b>途中で守る条件</b>：${esc(
            stage.id === 'stage_22'
              ? '0番地で初期基準内圧「5」をセット（ACC=5）した上で、加圧(+7)と減圧(-4)を実行すること（加圧・減圧の順序はどちらが先でも合格！）'
              : stage.id === 'stage_23'
                ? '0〜2番地の足し算で「3×4＝12」（2番地完了時 ACC=12）を合成し、3番地で目標値12を引いて差を 0（Z=1）にすること（ADD 3 と ADD 6 の順序はどちらが先でも合格！）'
                : '0番地で初期値「3」をセットし、1〜3番地の帰還ループで ACC を「3 → 2 → 1 → 0」と1ずつ減らし、0 (Z=1) の瞬間に2番地の JZ 4 で4番地へ脱出すること'
          )}</li>
          <li><b>成功条件</b>：${esc(
            stage.id === 'stage_22'
              ? '3命令完了時に最終気圧 ACC=8 (1000)、次PC=3番地に到達していること'
              : stage.id === 'stage_23'
                ? '4番地の JZ 6 が発火し、ACC=0 (Z=1) のまま次PC=6番地（開錠承認）へジャンプしていること'
                : 'ループ脱出後に4番地で地上大ハッチ全開信号 ACC=15 (1111)、次PC=5番地を出力すること'
          )}</li>
        </ul>
      </div>
    `
        : '';

    const physicsLabCard =
      stage.mode === 'physics' && Array.isArray(stage.physicsParts)
        ? `
      ${asmSpecCard}
      <div class="callout callout-amber">
        <div class="callout-title">${stage.kind === 'assembly_program' ? '使うアセンブリ命令カード（ROM）' : '使う材料・物理部品'}</div>
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
          <li><b>🔋 でんち</b>：つねに <code>1</code> を出す電源。2個のじゃぐちが両方開いたときに「はいすい」へ合図を送るスタート地点</li>
          <li><b>🚰 じゃぐち</b>：00-Aで創ったトランジスタ。<code>ひねり=1</code> のときだけ栓が開き、<code>いり</code> の電気を <code>でぐち</code> へ通す</li>
          <li><b>🕳 はいすい</b>：00-Bで組んだ「内蔵+5V電源→抵抗→地面へ抜くじゃぐちTR」のセット。普段は内蔵電源から抵抗越しに <code>でぐち=1</code> を出し、<code>ぬけ=1</code> の合図が届いた瞬間だけ中の排水TRが開いて地面へ落ち <code>でぐち=0</code>！</li>
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
    const outNames = stage?.outputs || [];
    const rowsHtml = evalResult.results
      .map((r) => {
        const cls = r.passed ? 'row-pass' : 'row-fail';
        const status = r.unstable ? '⚠ 発振' : r.passed ? '✔ OK' : '✘ NG';
        const pinDiffHtml = !r.passed && !r.unstable ? buildPinDiffSummary(r.actual, r.expected, outNames) : '';
        const actualHtml = r.unstable
          ? 'ERR'
          : r.passed
            ? formatBits(r.actual)
            : formatComparedActualBits(r.actual, r.expected, outNames);
        return `
          <tr class="${cls}" data-case-idx="${r.index}">
            <td class="mono">${r.index + 1}</td>
            <td>
              <div>${esc(r.label)}</div>
              ${pinDiffHtml}
              ${!r.passed ? `<button class="mini-inspect-btn" data-load-idx="${r.index}">🔍 この入力を盤面で調べる ▶</button>` : ''}
            </td>
            <td class="mono">${formatBits(r.input)}</td>
            <td class="mono emerald">${formatBits(r.expected)}</td>
            <td class="mono ${r.passed ? 'emerald' : 'crimson'}">${actualHtml}</td>
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
            : ''
        }
        <div class="callout callout-amber">
          不合格の行にある <b>「🔍 この入力を盤面で調べる」</b> を押すと、そのステップの入力と記憶状態がそのまま作業台に再現されます（赤枠の数字が期待値と異なる出力ビットです）。盤面上のチップを選んで <b>「📖 解説・内部」</b> を開けば、内部配線もそのまま調べられます！
        </div>
        <div class="table-wrap">
          <table class="crt-table">
            <thead>
              <tr>
                <th>#</th>
                <th>テストケース</th>
                <th>入力</th>
                <th>期待値</th>
                <th>実測値</th>
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

    const finaleBanner = stage.isChapter2Finale
      ? `<div class="callout callout-emerald">
          <b>☀ 第二章完結 — 42年ぶりの青空への帰還！！</b><br>
          砂（シリコン）と1個のスイッチから始まったあなたの計算機 <code>ARK4_SYS</code> とアセンブリ・プログラムが、ついにアーク7の地上大ハッチを全開にし、118人の生存者を青空の下へ導きました！
        </div>`
      : stage.isFinale
        ? `<div class="callout callout-emerald">
            <b>🎉 第一章完結 — 自作CPU『ARK-4』稼働開始！</b><br>
            地上ビーコンから <code>"HELLO, WORLD."</code> が発信され、さらに <b>☀ 第二章「青空への帰還」（STAGE 18〜24）</b> が解放されました！
          </div>`
        : '';

    const metaText =
      stage.id === 'stage_00a'
        ? `半導体構造：<b>N型×2 ＋ ガラス ＋ 金属電極</b>`
        : stage.id === 'stage_00b'
          ? `物理回路：<b>プルアップ抵抗 ＋ 接地スイッチ</b>`
          : stage.id === 'stage_00'
            ? `物理スイッチ(TR): <b>${metrics.nodeCount}</b>部品`
            : stage.kind === 'assembly_program'
              ? `ROM命令数: <b>${metrics.nodeCount}行</b> <span class="dim">(ARK4_SYS 実効 ${metrics.nandCount} NAND)</span>`
              : `実効NAND: <b>${metrics.nandCount}</b>個 <span class="dim">(TR換算 ${metrics.nandCount * 2}個)</span>`;

    const forgedCaption =
      stage.id === 'stage_00a'
        ? `砂から創り上げた物理スイッチ <b>[じゃぐち（トランジスタ）]</b> の製法を習得しました！`
        : stage.id === 'stage_00b'
          ? `ショートを防ぎ安全に反転する <b>[はいすい（プルアップ抵抗）]</b> の製法を習得しました！ いよいよNANDを組もう！`
          : stage.id === 'stage_00'
            ? `物理スイッチから組み上げた原板 <b>[NAND]</b> をB4焼付け機へセットしました！ これ以降はこの <b>NAND</b> だけを量産して上位回路を創り上げます。`
            : stage.kind === 'assembly_program'
              ? `あなたのノイマン型計算機 <b>[ARK4_SYS]</b> の上で、アセンブリ言語プログラム <b>[${esc(chipDef.name)}]</b> が完全動作しました！`
              : `あなたの回路をカスタムICチップ <b>[${esc(chipDef.name)}]</b> としてパレットに永続登録しました！`;

    const nextBtnLabel =
      stage.id === 'stage_17'
        ? '☀ 第二章「青空への帰還」(STAGE 18) へ進む ▶'
        : '次のミッションへ進む ▶';

    this.open({
      title: stage.isChapter2Finale
        ? '☀ SILICON GENESIS — 第二章・青空への帰還 完結！！'
        : stage.isFinale
          ? '★ 第一章完結 — 文明再起動完了！'
          : `✔ STAGE ${stage.code} クリア！`,
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
            ? `<button class="btn btn-emerald" id="btn-victory-next">${nextBtnLabel}</button>`
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
  openMap(save, currentStageId, { onSelectStage, onReplayPrologue, onGoHome, onResetSave }) {
    const actsHtml = ACTS.map((act) => {
      const stagesInAct = STAGES.filter((s) => s.act === act.id);
      const chapterBannerHtml =
        act.id === 6
          ? `<div class="map-chapter-banner">
              <span>☀ 第二章：青空への帰還（ノイマン型計算機＆アセンブリ編）</span>
              <span class="mono" style="font-size:11px;opacity:0.85;">STAGE 18〜24</span>
            </div>`
          : '';
      const cards = stagesInAct
        .map((st) => {
          const unlocked = isStageUnlocked(save, st.id);
          const cleared = save.clearedStages.includes(st.id);
          const active = st.id === currentStageId;
          const nandBest = save.bestNandCounts[st.id];
          const chipObj = st.rewardChip?.id ? save.customChips?.[st.rewardChip.id] : null;
          const isProvisioned = Boolean(!cleared && chipObj?.provisioned);
          return `
            <button
              class="map-stage-btn ${cleared ? 'cleared' : isProvisioned ? 'provisioned' : ''} ${active ? 'active' : ''} ${!unlocked ? 'locked' : ''}"
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
                        ? `✔ 自作クリア済 [じゃぐち / MOSFET]`
                        : st.id === 'stage_00b'
                          ? `✔ 自作クリア済 [はいすい / プルアップ抵抗]`
                          : st.id === 'stage_00'
                            ? `✔ 自作原板登録済 [NAND] · 物理スイッチ`
                            : st.kind === 'assembly_program'
                              ? `✔ プログラム稼働済 [${st.rewardChip?.name || 'ASM'}] · ROM制御`
                              : `✔ 自作チップ登録済 [${st.rewardChip?.name || st.code}] · ${nandBest ?? chipObj?.nandCount ?? '?'} NAND`
                      : isProvisioned
                        ? `📦 支給品 [${st.rewardChip?.name}] で稼働中 · 利用可能（自作に挑戦できます）`
                        : unlocked
                          ? '▶ 利用可能（挑戦可能）'
                          : '🔒 前のステージをクリアで解放'
                  }
                </span>
              </span>
            </button>
          `;
        })
        .join('');

      return `
        ${chapterBannerHtml}
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
          <button class="map-stage-btn prologue-replay-btn" id="btn-map-home">
            <span class="map-code">HOME</span>
            <span class="map-info">
              <span class="map-name">🏠 タイトル画面（ホーム）へ戻る</span>
              <span class="map-sub">第一章・第二章の選択やプロローグ再生へ戻る</span>
            </span>
          </button>
        </div>
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

    this.bodyEl.querySelector('#btn-map-home')?.addEventListener('click', () => {
      this.close();
      onGoHome?.();
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
  // 6. 2-TAB ENCYCLOPEDIA: HIERARCHICAL MODULE PULL-DOWNS & CS HISTORY CODEX
  // ===========================================================================
  openCodex(
    saveOrUnlockedIds = [],
    {
      highlightIds = [],
      initialTab = null,
      initialModuleId = null,
      initialCodexId = null,
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
    const unlockedHistoryEntries = allHistoryEntries.filter((e) => unlockedSet.has(e.id));
    const unlockedHistoryCount = unlockedHistoryEntries.length;

    const moduleEntries = MODULE_ENCYCLOPEDIA_IDS.map((id) => getGlossaryTerm(id)).filter(Boolean);
    const isModuleUnlocked = (term) => isModuleEncyclopediaUnlocked(term.id, isSaveObj ? save : null);
    const unlockedModules = moduleEntries.filter((m) => isModuleUnlocked(m));
    const unlockedModuleCount = unlockedModules.length;

    let activeTab = initialTab || (highlightIds.length > 0 || initialCodexId ? 'history' : 'modules');

    // Unified cross-tab navigation history stack: Array<{ tab: 'modules'|'history', id: string, label: string }>
    const navHistory = [];

    // Hierarchical pull-down expansion state for Module Encyclopedia (Level 1: Acts, Level 2: Modules)
    const expandedActs = new Set();
    const expandedModules = new Set();

    if (initialModuleId) {
      const initMod = getGlossaryTerm(initialModuleId);
      if (initMod && isModuleUnlocked(initMod)) {
        expandedActs.add(initMod.act ?? 0);
        expandedModules.add(initMod.id);
      }
    }
    if (expandedActs.size === 0) {
      if (unlockedModules.length > 0) {
        const latestMod = unlockedModules[unlockedModules.length - 1];
        expandedActs.add(latestMod.act ?? 0);
        expandedModules.add(latestMod.id);
      } else {
        expandedActs.add(0);
      }
    }

    // Pull-down expansion state for CS History Codex
    const expandedCodexIds = new Set();
    if (initialCodexId && unlockedSet.has(initialCodexId)) {
      expandedCodexIds.add(initialCodexId);
    }
    for (const hid of highlightIds) {
      if (unlockedSet.has(hid)) expandedCodexIds.add(hid);
    }
    if (expandedCodexIds.size === 0 && unlockedHistoryEntries.length > 0) {
      expandedCodexIds.add(unlockedHistoryEntries[unlockedHistoryEntries.length - 1].id);
    }

    const renderModalContent = (scrollTargetId = null) => {
      // -----------------------------------------------------------------------
      // 1. Build Hierarchical Module Encyclopedia HTML (Act Pull-Down -> Module Pull-Down)
      // -----------------------------------------------------------------------
      const moduleActGroupsHtml = ACTS.map((act) => {
        const modsInAct = moduleEntries.filter((m) => (m.act ?? 0) === act.id);
        if (modsInAct.length === 0) return '';
        const unlockedInAct = modsInAct.filter((m) => isModuleUnlocked(m));
        const isActOpen = expandedActs.has(act.id);

        const modItemsHtml = modsInAct
          .map((term) => {
            const unlocked = isModuleUnlocked(term);
            const cleared = term.stageId ? clearedSet.has(term.stageId) : unlocked;
            const forged = term.chipId ? customChips[term.chipId] : null;

            if (!unlocked) {
              return `
                <div class="codex-item-locked-row" data-module-id="${esc(term.id)}">
                  <span class="codex-locked-icon">🔒</span>
                  <span class="codex-locked-text">未取得モジュール（${esc(term.unlockLabel || 'クリアで解放')}）</span>
                </div>
              `;
            }

            const isModOpen = expandedModules.has(term.id);
            const isProvisionedOnly = Boolean(!cleared && (forged?.provisioned || save.chapter2Unlocked));
            const shortBadge = isProvisionedOnly
              ? `<span class="mod-status-badge provisioned">📦 支給品</span>`
              : forged
                ? `<span class="mod-status-badge forged">✔ 自作済</span>`
                : cleared
                  ? `<span class="mod-status-badge cleared">✔ 習得済</span>`
                  : `<span class="mod-status-badge">📖 図解</span>`;

            if (!isModOpen) {
              return `
                <div class="codex-item-accordion collapsed" data-module-id="${esc(term.id)}">
                  <button type="button" class="codex-item-pull-btn" data-toggle-module="${esc(term.id)}" aria-expanded="false">
                    <span class="codex-item-pull-left">
                      <span class="codex-item-icon">⚡</span>
                      <span class="codex-item-title">${esc(term.title)}</span>
                    </span>
                    <span class="codex-item-pull-right">
                      ${shortBadge}
                      <span class="codex-pull-caret">▸</span>
                    </span>
                  </button>
                </div>
              `;
            }

            const detailBadge = isProvisionedOnly
              ? `<span class="mod-status-badge provisioned">📦 標準支給品（未自作）${forged ? ` · 実効 ${forged.nandCount ?? 0} NAND` : ''}</span>`
              : forged
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

            // Cross-links to CS History Codex
            const linkedCodexEntries = (term.codexIds || [])
              .map((cid) => CODEX_ENTRIES[cid])
              .filter(Boolean);

            const codexCrossLinkHtml =
              linkedCodexEntries.length > 0
                ? `
                  <div class="codex-crosslink-box">
                    <div class="codex-crosslink-lbl">📜 CS歴史図鑑（歴史・物理アーカイブ）：</div>
                    <div class="codex-crosslink-list">
                      ${linkedCodexEntries
                        .map((entry) => {
                          const isHistoryOpen = unlockedSet.has(entry.id);
                          if (!isHistoryOpen) {
                            return `<span class="gp-related-chip locked">🔒 CS歴史：未解読アーカイブ</span>`;
                          }
                          return `
                            <button
                              type="button"
                              class="codex-crosslink-btn to-history"
                              data-jump-codex="${esc(entry.id)}"
                              data-from-module="${esc(term.id)}"
                            >
                              📜 ${esc(entry.term)} (${esc(entry.year)}) を読む ▶
                            </button>
                          `;
                        })
                        .join('')}
                    </div>
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
                          return `<span class="gp-related-chip locked">🔒 未取得（${esc(rel.unlockLabel || '進行で解放')}）</span>`;
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
                    <button type="button" class="mini-inspect-btn" data-inspect-chip="${esc(term.chipId)}" data-from-module="${esc(term.id)}">
                      🔍 あなたが設計した [${esc(forged.name || term.chipId)}] の内部回路を見る ▶
                    </button>
                  </div>
                `
                : '';

            return `
              <div class="codex-item-accordion expanded module-codex-card" data-module-id="${esc(term.id)}">
                <button type="button" class="codex-item-pull-btn active" data-toggle-module="${esc(term.id)}" aria-expanded="true">
                  <span class="codex-item-pull-left">
                    <span class="codex-item-icon">⚡</span>
                    <span class="codex-item-title">${esc(term.title)}</span>
                  </span>
                  <span class="codex-item-pull-right">
                    ${shortBadge}
                    <span class="codex-pull-caret">▾</span>
                  </span>
                </button>
                <div class="codex-item-body">
                  <div class="codex-entry-head">
                    <span class="codex-act">${esc(term.category)} · ${esc(term.reading || '')}</span>
                    ${detailBadge}
                  </div>
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
                  ${codexCrossLinkHtml}
                  ${relatedHtml}
                </div>
              </div>
            `;
          })
          .join('');

        return `
          <div class="codex-act-group ${isActOpen ? 'open' : 'collapsed'}" data-act-group="${act.id}">
            <button
              type="button"
              class="codex-act-pull-btn"
              data-toggle-act="${act.id}"
              aria-expanded="${isActOpen ? 'true' : 'false'}"
              style="--act-color:${esc(act.color)}"
            >
              <span class="codex-act-pull-left">
                <span class="codex-act-roman" style="color:${esc(act.color)}">${esc(act.roman)}</span>
                <span class="codex-act-name">${esc(act.title)} <span class="codex-act-sub">（${esc(act.subtitle)}）</span></span>
              </span>
              <span class="codex-act-pull-right">
                <span class="codex-act-count ${unlockedInAct.length > 0 ? 'has-unlocked' : ''}">${unlockedInAct.length} / ${modsInAct.length}</span>
                <span class="codex-pull-caret">${isActOpen ? '▾' : '▸'}</span>
              </span>
            </button>
            ${isActOpen ? `<div class="codex-act-items">${modItemsHtml}</div>` : ''}
          </div>
        `;
      }).join('');

      // -----------------------------------------------------------------------
      // 2. Build Pull-Down CS History Archive HTML with Cross-Links to Modules
      // -----------------------------------------------------------------------
      const historyListHtml = allHistoryEntries
        .map((entry) => {
          const open = unlockedSet.has(entry.id);
          const isNew = highlightSet.has(entry.id);
          if (!open) {
            return `
              <div class="codex-item-locked-row">
                <span class="codex-locked-icon">🔒</span>
                <span class="codex-locked-text">[${esc(entry.act)}] 未解読アーカイブ（対応回路のクリアで解放）</span>
              </div>
            `;
          }

          const isEntryExpanded = expandedCodexIds.has(entry.id);
          const linkedModules = getModulesForCodexId(entry.id);

          if (!isEntryExpanded) {
            return `
              <div class="codex-item-accordion collapsed ${isNew ? 'codex-new' : ''}" data-codex-id="${esc(entry.id)}">
                <button type="button" class="codex-item-pull-btn" data-toggle-codex="${esc(entry.id)}" aria-expanded="false">
                  <span class="codex-item-pull-left">
                    <span class="codex-item-icon">📜</span>
                    <span class="codex-item-title">${esc(entry.term)}${isNew ? ' <span class="codex-new-badge">NEW!</span>' : ''}</span>
                  </span>
                  <span class="codex-item-pull-right">
                    <span class="codex-year-pill">${esc(entry.act)} · ${esc(entry.year)}</span>
                    <span class="codex-pull-caret">▸</span>
                  </span>
                </button>
              </div>
            `;
          }

          const moduleCrossLinkHtml =
            linkedModules.length > 0
              ? `
                <div class="codex-crosslink-box">
                  <div class="codex-crosslink-lbl">⚡ 対応モジュール（動く図解・回路仕様）：</div>
                  <div class="codex-crosslink-list">
                    ${linkedModules
                      .map((mod) => {
                        const modOpen = isModuleUnlocked(mod);
                        if (!modOpen) {
                          return `<span class="gp-related-chip locked">🔒 ${esc(mod.unlockLabel || '未取得モジュール')}</span>`;
                        }
                        return `
                          <button
                            type="button"
                            class="codex-crosslink-btn to-module"
                            data-jump-module="${esc(mod.id)}"
                            data-from-codex="${esc(entry.id)}"
                          >
                            ⚡ ${esc(mod.title)}（動的図解を見る）▶
                          </button>
                        `;
                      })
                      .join('')}
                  </div>
                </div>
              `
              : '';

          return `
            <div class="codex-item-accordion expanded ${isNew ? 'codex-new' : ''}" data-codex-id="${esc(entry.id)}">
              <button type="button" class="codex-item-pull-btn active" data-toggle-codex="${esc(entry.id)}" aria-expanded="true">
                <span class="codex-item-pull-left">
                  <span class="codex-item-icon">📜</span>
                  <span class="codex-item-title">${esc(entry.term)}${isNew ? ' <span class="codex-new-badge">NEW!</span>' : ''}</span>
                </span>
                <span class="codex-item-pull-right">
                  <span class="codex-year-pill">${esc(entry.act)} · ${esc(entry.year)}</span>
                  <span class="codex-pull-caret">▾</span>
                </span>
              </button>
              <div class="codex-item-body">
                <div class="codex-subtitle">${esc(entry.subtitle)}</div>
                ${entry.body.map((p) => `<p>${esc(p)}</p>`).join('')}
                ${moduleCrossLinkHtml}
              </div>
            </div>
          `;
        })
        .join('');

      const prevNav = navHistory.length > 0 ? navHistory[navHistory.length - 1] : null;
      const allModsExpanded =
        unlockedModules.length > 0 && unlockedModules.every((m) => expandedModules.has(m.id));
      const allHistoryExpanded =
        unlockedHistoryEntries.length > 0 && unlockedHistoryEntries.every((e) => expandedCodexIds.has(e.id));

      const bodyHtml = `
        <div class="codex-tabs-bar">
          <button type="button" class="codex-tab-btn ${activeTab === 'modules' ? 'active' : ''}" data-codex-tab="modules">
            ⚡ モジュール図鑑 (${unlockedModuleCount}/${moduleEntries.length})
          </button>
          <button type="button" class="codex-tab-btn ${activeTab === 'history' ? 'active' : ''}" data-codex-tab="history">
            📜 CS歴史図鑑 (${unlockedHistoryCount}/${allHistoryEntries.length})
          </button>
        </div>

        <div id="codex-back-bar" class="codex-back-bar ${prevNav ? '' : 'hidden'}">
          <button type="button" id="btn-codex-history-back" class="btn btn-amber codex-history-back-btn">
            ◀ ひとつ前の解説へ戻る（${esc(prevNav ? prevNav.label : '')}）
          </button>
        </div>

        ${
          activeTab === 'modules'
            ? `
              <div class="codex-module-toolbar">
                <span class="codex-toolbar-note">▾ 章とモジュールをタップで開閉（図解は自動で動きます）</span>
                ${
                  unlockedModules.length > 1
                    ? `<button type="button" id="btn-codex-toggle-all-mods" class="codex-fold-all-btn">
                        ${allModsExpanded ? '▲ すべて折りたたむ' : '▼ 取得済みをすべて開く'}
                      </button>`
                    : ''
                }
              </div>
              <div class="codex-hierarchy-list">${moduleActGroupsHtml}</div>
            `
            : `
              <div class="codex-module-toolbar">
                <span class="codex-toolbar-note">▾ 項目をタップで開閉（対応モジュール図解へジャンプ可）</span>
                ${
                  unlockedHistoryEntries.length > 1
                    ? `<button type="button" id="btn-codex-toggle-all-hist" class="codex-fold-all-btn">
                        ${allHistoryExpanded ? '▲ すべて折りたたむ' : '▼ 解読済みをすべて開く'}
                      </button>`
                    : ''
                }
              </div>
              <div class="codex-hierarchy-list">${historyListHtml}</div>
            `
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

      // Mount live interactive canvases for currently expanded modules!
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

      // Bind Level 1 Act pull-down headers
      this.bodyEl.querySelectorAll('[data-toggle-act]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const actId = Number(btn.dataset.toggleAct);
          if (Number.isNaN(actId)) return;
          sound.playSwitch(!expandedActs.has(actId));
          if (expandedActs.has(actId)) {
            expandedActs.delete(actId);
          } else {
            expandedActs.add(actId);
          }
          renderModalContent();
        });
      });

      // Bind Level 2 Module pull-down headers
      this.bodyEl.querySelectorAll('[data-toggle-module]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const modId = btn.dataset.toggleModule;
          if (!modId) return;
          const willOpen = !expandedModules.has(modId);
          sound.playSwitch(willOpen);
          if (willOpen) {
            expandedModules.add(modId);
          } else {
            expandedModules.delete(modId);
          }
          renderModalContent(willOpen ? modId : null);
        });
      });

      // Bind CS History pull-down headers
      this.bodyEl.querySelectorAll('[data-toggle-codex]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const codexId = btn.dataset.toggleCodex;
          if (!codexId) return;
          const willOpen = !expandedCodexIds.has(codexId);
          sound.playSwitch(willOpen);
          if (willOpen) {
            expandedCodexIds.add(codexId);
          } else {
            expandedCodexIds.delete(codexId);
          }
          renderModalContent(willOpen ? codexId : null);
        });
      });

      // Bind Expand/Collapse All buttons
      this.bodyEl.querySelector('#btn-codex-toggle-all-mods')?.addEventListener('click', () => {
        sound.playSwitch(!allModsExpanded);
        if (allModsExpanded) {
          expandedModules.clear();
        } else {
          for (const m of unlockedModules) {
            expandedActs.add(m.act ?? 0);
            expandedModules.add(m.id);
          }
        }
        renderModalContent();
      });

      this.bodyEl.querySelector('#btn-codex-toggle-all-hist')?.addEventListener('click', () => {
        sound.playSwitch(!allHistoryExpanded);
        if (allHistoryExpanded) {
          expandedCodexIds.clear();
        } else {
          for (const e of unlockedHistoryEntries) {
            expandedCodexIds.add(e.id);
          }
        }
        renderModalContent();
      });

      // Bind Unified Cross-Tab "◀ ひとつ前の解説へ戻る" button
      this.bodyEl.querySelector('#btn-codex-history-back')?.addEventListener('click', () => {
        if (navHistory.length === 0) return;
        sound.playSwitch(false);
        const prev = navHistory.pop();
        activeTab = prev.tab;
        if (prev.tab === 'modules') {
          const prevTerm = getGlossaryTerm(prev.id);
          if (prevTerm) {
            expandedActs.add(prevTerm.act ?? 0);
            expandedModules.add(prevTerm.id);
          }
        } else {
          expandedCodexIds.add(prev.id);
        }
        renderModalContent(prev.id);
      });

      // Bind Cross-Link: Module -> CS History Codex ([data-jump-codex])
      this.bodyEl.querySelectorAll('[data-jump-codex]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const targetCodexId = btn.dataset.jumpCodex;
          const fromModuleId = btn.dataset.fromModule;
          if (!targetCodexId || !unlockedSet.has(targetCodexId)) return;
          sound.playSwitch(true);

          if (fromModuleId) {
            const fromTerm = getGlossaryTerm(fromModuleId);
            navHistory.push({
              tab: 'modules',
              id: fromModuleId,
              label: `⚡ ${fromTerm ? fromTerm.title.split('（')[0] : fromModuleId}`,
            });
          }
          activeTab = 'history';
          expandedCodexIds.add(targetCodexId);
          renderModalContent(targetCodexId);
        });
      });

      // Bind Cross-Link: CS History Codex -> Module ([data-jump-module])
      this.bodyEl.querySelectorAll('[data-jump-module]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const targetModuleId = btn.dataset.jumpModule;
          const fromCodexId = btn.dataset.fromCodex;
          const targetTerm = getGlossaryTerm(targetModuleId);
          if (!targetTerm || !isModuleUnlocked(targetTerm)) return;
          sound.playSwitch(true);

          if (fromCodexId) {
            const fromEntry = CODEX_ENTRIES[fromCodexId];
            navHistory.push({
              tab: 'history',
              id: fromCodexId,
              label: `📜 ${fromEntry ? fromEntry.term.split('（')[0] : fromCodexId}`,
            });
          }
          activeTab = 'modules';
          expandedActs.add(targetTerm.act ?? 0);
          expandedModules.add(targetTerm.id);
          renderModalContent(targetModuleId);
        });
      });

      // Bind Related Module / Glossary Term jump chips ([data-jump-term])
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
              const fromTerm = getGlossaryTerm(fromId);
              navHistory.push({
                tab: 'modules',
                id: fromId,
                label: `⚡ ${fromTerm ? fromTerm.title.split('（')[0] : fromId}`,
              });
            }
            activeTab = 'modules';
            expandedActs.add(targetTerm.act ?? 0);
            expandedModules.add(targetTerm.id);
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
          const fromModuleId = btn.dataset.fromModule;
          if (!chipId) return;
          sound.playSwitch(true);
          this.openChipInspector(chipId, customChips, {
            onBack: () => {
              this.openCodex(saveOrUnlockedIds, {
                highlightIds,
                initialTab: 'modules',
                initialModuleId: fromModuleId || null,
                onNextStage,
                nextStageLabel,
                onBackToVictory,
              });
            },
          });
        });
      });

      // Scroll to target module or CS history card (with golden highlight flash)
      if (activeTab === 'modules' && scrollTargetId) {
        const card = this.bodyEl.querySelector(`[data-module-id="${scrollTargetId}"]`);
        if (card) {
          card.classList.add('codex-jump-highlight');
          requestAnimationFrame(() => card.scrollIntoView({ behavior: 'smooth', block: 'start' }));
        }
      } else if (activeTab === 'history' && (scrollTargetId || highlightIds.length > 0)) {
        const targetId = scrollTargetId || highlightIds[0];
        const target = this.bodyEl.querySelector(`[data-codex-id="${targetId}"]`);
        if (target) {
          target.classList.add('codex-jump-highlight');
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
  // 7. WORKBENCH MODULE & CUSTOM CHIP INSPECTOR (LIVE DIAGRAM + LIVE INTERNAL CIRCUIT)
  // ===========================================================================
  openPhysicsPartInfo(part) {
    if (!part) return;
    const term = getGlossaryTermForChip(part.id);
    const animKey =
      term?.anim ||
      (['N_SILICON', 'P_SILICON', 'INSULATOR', 'METAL_GATE'].includes(part.id)
        ? 'mosfet_build'
        : ['VCC', 'RESISTOR', 'DRAIN_SW', 'GND'].includes(part.id)
          ? 'pullup_drain'
          : null);

    const diagramHtml = animKey
      ? `
        <div class="inspector-func-card">
          <div class="inspector-section-tag">⚡ この部品の働き（自動アニメーション図解）</div>
          <div class="vc-live-wrap codex-diagram-wrap">
            <canvas class="vc-live-canvas codex-live-canvas" data-anim="${esc(animKey)}" aria-label="${esc(part.name)} 動く図解"></canvas>
          </div>
        </div>
      `
      : '';

    this.open({
      title: `物理材料メモ · ${part.name}`,
      bodyHtml: `
        ${diagramHtml}
        <div class="callout callout-amber">
          <div class="callout-title">${esc(part.name)}（${esc(part.meta)}）</div>
          <div>${esc(part.rule)}</div>
        </div>
        <p class="spec-note">${esc(part.descJa || term?.summary || '')}</p>
        ${
          term?.analogy
            ? `<div class="gp-analogy-wrap" style="margin-top:8px;">
                <div class="gp-analogy-lbl">💡 たとえるなら</div>
                <div class="gp-analogy">${esc(term.analogy)}</div>
              </div>`
            : ''
        }
      `,
      footerHtml: `<button class="btn btn-primary" data-close-modal>閉じる</button>`,
    });
    this.diagramGroup.mountAll(this.bodyEl);
    this.footerEl.querySelector('[data-close-modal]')?.addEventListener('click', () => this.close());
  }

  openChipInspector(
    chipType,
    customChips,
    {
      onBack = null,
      backLabel = '◀ モジュール図鑑へ戻る',
      liveInputs = null,
      breadcrumb = [],
    } = {}
  ) {
    const def = getChipDef(chipType, customChips);
    if (!def) return;

    const term = getGlossaryTermForChip(chipType);
    const animKey = term?.anim || null;
    const customNandCircuit = chipType === 'NAND' ? customChips?.NAND?.circuit : null;
    const circuitToShow = customNandCircuit || def.circuit;
    const isProvisioned = Boolean(
      (chipType === 'NAND' ? customChips?.NAND?.provisioned : def.provisioned)
    );

    const trail = [...breadcrumb, def.name];
    const breadcrumbHtml =
      trail.length > 1
        ? `<div class="inspector-breadcrumb">🔍 配線調査経路: ${trail.map((t) => `<span>${esc(t)}</span>`).join(' ▸ ')}</div>`
        : '';

    const functionalSectionHtml = `
      ${breadcrumbHtml}
      <div class="inspector-func-card">
        <div class="inspector-section-tag">
          ⚡ このモジュールができること（自動で動く図解）
          ${
            isProvisioned
              ? '<span class="mod-status-badge provisioned" style="margin-left:6px;">📦 支給品（標準回路）</span>'
              : circuitToShow
                ? '<span class="mod-status-badge forged" style="margin-left:6px;">✔ 自作回路</span>'
                : ''
          }
        </div>
        ${
          animKey
            ? `
              <div class="vc-live-wrap codex-diagram-wrap">
                <canvas class="vc-live-canvas codex-live-canvas" data-anim="${esc(animKey)}" aria-label="${esc(def.name)} 動く図解"></canvas>
              </div>
            `
            : ''
        }
        <p class="inspector-summary-text">${esc(term?.summary || def.descJa || '')}</p>
        ${
          term?.analogy
            ? `
              <div class="gp-analogy-wrap" style="margin-top:8px;">
                <div class="gp-analogy-lbl">💡 たとえるなら</div>
                <div class="gp-analogy">${esc(term.analogy)}</div>
              </div>
            `
            : ''
        }
        <div class="chip-stats-row" style="margin-top:10px;margin-bottom:0;">
          <div class="stat-pill">入力: <b>${def.inputs.length}</b> (${esc(def.inputs.join(', ') || 'なし')})</div>
          <div class="stat-pill">出力: <b>${def.outputs.length}</b> (${esc(def.outputs.join(', '))})</div>
          <div class="stat-pill">実効NAND: <b>${def.nandCount ?? 0}</b></div>
          <div class="stat-pill">抽象階層: <b>Lv.${def.depth ?? 0}</b></div>
        </div>
      </div>
    `;

    let schematicHtml = '';
    if (circuitToShow) {
      const heading = isProvisioned
        ? `📦 標準支給回路の内部配線（${circuitToShow.nodes.length}チップ / 実効 ${def.nandCount} NAND）`
        : chipType === 'NAND'
          ? `🔧 あなたが物理スイッチから創り上げた NAND 原板（${circuitToShow.nodes.length}部品）`
          : `🔧 あなたが設計した内部回路（${circuitToShow.nodes.length}チップ / 実効 ${def.nandCount} NAND）`;

      // Sub-chip drill-down buttons so player can trace signals deeper into sub-modules!
      const drillableNodes = circuitToShow.nodes.filter((n) => {
        if (n.type === 'NAND') return Boolean(customChips?.NAND?.circuit);
        const subDef = getChipDef(n.type, customChips);
        return Boolean(subDef?.circuit);
      });

      const drillDownHtml =
        drillableNodes.length > 0
          ? `
            <div class="inspector-drilldown-box">
              <div class="codex-crosslink-lbl">🔍 内部で使われている下位チップの配線をさらに調べる（現在の信号状態を引き継ぎます）：</div>
              <div class="codex-crosslink-list">
                ${drillableNodes
                  .map((n, idx) => {
                    const subDef = getChipDef(n.type, customChips);
                    return `
                      <button
                        type="button"
                        class="codex-crosslink-btn to-module"
                        data-drill-node-id="${esc(n.id)}"
                        data-drill-chip-type="${esc(n.type)}"
                      >
                        🔧 ${esc(subDef?.name || n.type)} #${idx + 1} の内部配線を調べる ▶
                      </button>
                    `;
                  })
                  .join('')}
              </div>
            </div>
          `
          : '';

      schematicHtml = `
        <div class="inspector-schematic-card">
          <div class="inspector-schematic-head">
            <h4 class="section-heading" style="margin:0;">${heading}</h4>
            <div id="inspector-live-step-badge" class="inspector-live-step-badge">⚡ 自動稼働デモ中...</div>
          </div>
          ${this._renderMiniSchematicSvg(circuitToShow, customChips)}
          ${drillDownHtml}
        </div>
      `;
    } else if (def.isPrimitive) {
      schematicHtml = `
        <div class="callout callout-amber" style="margin-top:10px;">
          <b>基本物理素子（これ以上分解できません）</b><br>
          ${esc(def.descJa)}
        </div>
      `;
    }

    this.open({
      title: `モジュール解説・内部配線 · ${def.name}（${def.titleJa || term?.title || def.id}）`,
      bodyHtml: `
        ${functionalSectionHtml}
        ${schematicHtml}
      `,
      footerHtml: `
        ${onBack ? `<button class="btn btn-amber" id="btn-inspector-back">${esc(backLabel)}</button>` : ''}
        <button class="btn btn-primary" data-close-modal>作業台（調査状態）へ戻る</button>
      `,
    });

    // 1. Start the auto-playing functional diagram canvas at the top
    this.diagramGroup.mountAll(this.bodyEl);

    // 2. Start the live simulation on the internal circuit (locking onto liveInputs if provided!)
    let activeSim = null;
    if (circuitToShow) {
      activeSim = this._startMiniSchematicLoop(circuitToShow, customChips, chipType, liveInputs);
    }

    // 3. Wire sub-chip drill-down buttons with breadcrumb return!
    this.bodyEl.querySelectorAll('[data-drill-chip-type]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const subChipType = btn.dataset.drillChipType;
        const subNodeId = btn.dataset.drillNodeId;
        let subInputs = null;
        if (activeSim && subNodeId) {
          const pinVals = activeSim.getNodePinValues(subNodeId);
          if (Array.isArray(pinVals?.inputs) && pinVals.inputs.length > 0) {
            subInputs = [...pinVals.inputs];
          }
        }
        sound.playSwitch(true);
        this.openChipInspector(subChipType, customChips, {
          liveInputs: subInputs,
          breadcrumb: trail,
          backLabel: `◀ ${def.name} の内部配線へ戻る`,
          onBack: () => {
            this.openChipInspector(chipType, customChips, {
              onBack,
              backLabel,
              liveInputs,
              breadcrumb,
            });
          },
        });
      });
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
            <div class="audio-status-tip">※ 別アプリ（Spotify / Apple Music等）の音楽と同時再生できます。アプリを閉じたり裏へ回すと音は自動で停止します。</div>
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
    const maxNodeX = circuit.nodes.reduce((m, n) => Math.max(m, (n.x || 0) + 110), 540);
    const maxNodeY = circuit.nodes.reduce((m, n) => Math.max(m, (n.y || 0) + 100), 320);
    const w = Math.max(660, maxNodeX + 105);
    const maxPins = Math.max(circuit.inputs.length, circuit.outputs.length);
    const baseH = maxPins >= 8 ? 500 : maxPins >= 6 ? 430 : 360;
    const h = Math.max(baseH, maxNodeY + 36);

    const inPos = (idx) => {
      const n = circuit.inputs.length;
      const y = n <= 1 ? h / 2 : 36 + (idx * (h - 72)) / (n - 1);
      return { x: 86, y };
    };
    const outPos = (idx) => {
      const n = circuit.outputs.length;
      const y = n <= 1 ? h / 2 : 36 + (idx * (h - 72)) / (n - 1);
      return { x: w - 86, y };
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
        const pathD = `M${a.x},${a.y} C${a.x + c},${a.y} ${b.x - c},${b.y} ${b.x},${b.y}`;
        return `
          <path class="mini-wire-base" data-mini-wire="${esc(wire.id)}" d="${pathD}" fill="none" stroke="#33485c" stroke-width="2.6" opacity="0.88"/>
          <path class="mini-wire-flow" data-mini-wire-flow="${esc(wire.id)}" d="${pathD}" fill="none" stroke="#ffd166" stroke-width="2.8" opacity="0"/>
        `;
      })
      .join('');

    const nodesSvg = circuit.nodes
      .map((node) => {
        const { nw, nh, def } = nodePos(node);
        return `
          <g class="mini-node-group" data-mini-node-group="${esc(node.id)}">
            <rect data-mini-node="${esc(node.id)}" data-accent="${esc(def.accent || '#8aa')}" x="${node.x}" y="${node.y}" width="${nw}" height="${nh}" rx="6" fill="#1b2530" stroke="${esc(def.accent || '#8aa')}" stroke-width="2"/>
            <text x="${node.x + nw / 2}" y="${node.y + nh / 2 - 2}" text-anchor="middle" fill="#fff" font-size="12.5" font-family="monospace" font-weight="bold">${esc(def.name)}</text>
            <text data-mini-node-val="${esc(node.id)}" x="${node.x + nw / 2}" y="${node.y + nh / 2 + 13}" text-anchor="middle" fill="#88a2bc" font-size="10.5" font-family="monospace" font-weight="bold">OUT: -</text>
          </g>
        `;
      })
      .join('');

    const inSvg = circuit.inputs
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

    const outSvg = circuit.outputs
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

  _startMiniSchematicLoop(circuit, customChips, chipType, liveInputs = null) {
    this._stopMiniSchematicLoop();
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
      if (!this.bodyEl) return;
      const step = steps[idx];
      if (!step) return;

      if (isCombinational || idx === 0) {
        sim.reset();
      }
      if (Array.isArray(step.phases)) {
        for (const ph of step.phases) {
          sim.evaluate(ph);
        }
      } else if (Array.isArray(step.input)) {
        sim.evaluate(step.input);
      }

      const inBits = sim.getInputs();
      const outBits = sim.getOutputs();

      const badgeEl = this.bodyEl.querySelector('#inspector-live-step-badge');
      if (badgeEl) {
        badgeEl.textContent = step.isLiveBoardStep
          ? `${step.label}`
          : `⚡ 自動シミュレーション (${idx + 1}/${steps.length})：${step.label}`;
      }

      // 1. Update Input Terminals
      inBits.forEach((bit, i) => {
        const rect = this.bodyEl.querySelector(`[data-mini-in-rect="${i}"]`);
        const txt = this.bodyEl.querySelector(`[data-mini-in-text="${i}"]`);
        if (rect) {
          rect.setAttribute('fill', bit ? '#3b2a10' : '#1b2632');
          rect.setAttribute('stroke', bit ? '#ffd166' : '#486078');
        }
        if (txt) {
          const lbl = txt.getAttribute('data-lbl') || `IN${i}`;
          txt.textContent = `${lbl}=${bit}`;
          txt.setAttribute('fill', bit ? '#ffe599' : '#8fa6bc');
        }
      });

      // 2. Update Output Terminals
      outBits.forEach((bit, i) => {
        const rect = this.bodyEl.querySelector(`[data-mini-out-rect="${i}"]`);
        const txt = this.bodyEl.querySelector(`[data-mini-out-text="${i}"]`);
        if (rect) {
          rect.setAttribute('fill', bit ? '#123d2f' : '#16222d');
          rect.setAttribute('stroke', bit ? '#52e3b6' : '#3b5368');
        }
        if (txt) {
          const lbl = txt.getAttribute('data-lbl') || `OUT${i}`;
          txt.textContent = `${lbl}=${bit}`;
          txt.setAttribute('fill', bit ? '#8fffdc' : '#8fa6bc');
        }
      });

      // 3. Update Wires (glowing flowing current when carrying 1!)
      for (const wire of circuit.wires) {
        const val = sim.getWireValue(wire.id);
        const baseEl = this.bodyEl.querySelector(`[data-mini-wire="${wire.id}"]`);
        const flowEl = this.bodyEl.querySelector(`[data-mini-wire-flow="${wire.id}"]`);
        if (baseEl) {
          baseEl.setAttribute('stroke', val ? '#d98a2b' : '#2e4154');
          baseEl.setAttribute('opacity', val ? '0.95' : '0.65');
        }
        if (flowEl) {
          flowEl.setAttribute('opacity', val ? '0.95' : '0');
        }
      }

      // 4. Update Sub-Chip Nodes
      for (const node of circuit.nodes) {
        const pinVals = sim.getNodePinValues(node.id);
        const outs = pinVals.outputs || [];
        const anyHigh = outs.some((b) => b === 1);
        const rectEl = this.bodyEl.querySelector(`[data-mini-node="${node.id}"]`);
        const valEl = this.bodyEl.querySelector(`[data-mini-node-val="${node.id}"]`);
        if (rectEl) {
          const accent = rectEl.getAttribute('data-accent') || '#8aa';
          rectEl.setAttribute('fill', anyHigh ? '#1f2e3d' : '#17202a');
          rectEl.setAttribute('stroke', anyHigh ? accent : '#3e5368');
          rectEl.setAttribute('stroke-width', anyHigh ? '2.4' : '1.6');
        }
        if (valEl) {
          valEl.textContent = outs.length > 4 ? `OUT:${outs.join('')}` : `OUT: ${outs.join(',')}`;
          valEl.setAttribute('fill', anyHigh ? '#72f2c8' : '#7b93ab');
        }
      }
    };

    applyStep(0);
    if (steps.length > 1) {
      this._miniSimTimer = setInterval(() => {
        stepIdx = (stepIdx + 1) % steps.length;
        applyStep(stepIdx);
      }, 1600);
    }
    return sim;
  }
}
