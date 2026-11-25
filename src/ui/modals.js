/**
 * SILICON GENESIS — Industrial CRT Modals
 * Spec/Truth Table, Progressive Hints, Test Debugger, Chip Forging Victory,
 * Campaign Map, CS History Codex, and Custom Chip Internal Schematic Inspector.
 */

import { ACTS, STAGES, SANDBOX_STAGE } from '../data/stages.js?v=39';
import { CODEX_ENTRIES } from '../data/codex.js?v=39';
import {
  ARK4_ISA_TABLE,
  ARK8_ISA_TABLE,
  getStageSymbolReferences,
  stageUsesIsaTable,
  stageUsesArk8IsaTable,
} from '../data/symbolReference.js?v=39';
import {
  GLOSSARY_TERMS,
  MODULE_ENCYCLOPEDIA_IDS,
  getGlossaryTerm,
  getGlossaryTermForChip,
  getModulesForCodexId,
  isGlossaryTermUnlocked,
  isModuleEncyclopediaUnlocked,
} from '../data/glossary.js?v=39';
import { PRIMITIVE_CHIPS, getChipDef, computeCircuitMetrics, parsePinSpec } from '../engine/circuit.js';
import { exportSiliconBlueprint } from '../engine/siliconExport.js?v=39';
import {
  isStageUnlocked,
  isChapter1Cleared,
  isChapter2Unlocked,
  isChapter2Cleared,
  isChapter3Unlocked,
  isChapter3Cleared,
} from '../state/storage.js?v=39';
import { sound } from '../audio/sound.js?v=39';
import { StoryDiagramGroup } from './storyDiagram.js?v=39';
import { glossaryPopover } from './glossaryPopover.js?v=39';
import { renderMiniSchematicSvg, startMiniSchematicLoop } from './miniSchematic.js?v=39';

function resolveSiliconStats(defOrMetrics, circuit = null, customChips = {}) {
  const calc = circuit ? computeCircuitMetrics(circuit, customChips) : null;
  const nandCount = defOrMetrics?.nandCount ?? calc?.nandCount ?? 0;
  const isNandChip = defOrMetrics?.id === 'NAND';
  const swCount =
    defOrMetrics?.swCount ??
    calc?.swCount ??
    (isNandChip ? 2 : nandCount * 2);
  const pullCount =
    defOrMetrics?.pullCount ??
    calc?.pullCount ??
    (isNandChip ? 1 : nandCount);
  return { nandCount, swCount, pullCount };
}

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

function formatBusRow(vals, pinSpecs = []) {
  if (!Array.isArray(vals)) return '-';
  return vals
    .map((v, i) => {
      if (v === null || v === undefined) return '×';
      const spec = pinSpecs[i] ? parsePinSpec(pinSpecs[i]) : null;
      return spec && spec.width > 1 ? `${spec.base}=${v}` : String(v);
    })
    .join(', ');
}

function formatComparedBusActual(actual, expected, pinSpecs = []) {
  if (!Array.isArray(actual)) return '-';
  return actual
    .map((v, i) => {
      const spec = pinSpecs[i] ? parsePinSpec(pinSpecs[i]) : null;
      const lbl = spec && spec.width > 1 ? `${spec.base}=${v ?? '?'}` : String(v ?? '×');
      const exp = expected ? expected[i] : undefined;
      const isDiff = exp !== null && exp !== undefined && v !== exp;
      if (!isDiff) return `<span>${esc(lbl)}</span>`;
      const pinName = pinSpecs[i] || `OUT${i}`;
      return `<span class="bit-diff-badge" title="${esc(pinName)}: 期待=${exp} / 実測=${v ?? '?'}">${esc(lbl)}</span>`;
    })
    .join(', ');
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
    this._miniSimHandle = null;

    this.closeBtn.addEventListener('click', () => this.close());
    this.backdrop.addEventListener('click', (e) => {
      if (e.target === this.backdrop) this.close();
    });
  }

  _stopMiniSchematicLoop() {
    if (this._miniSimHandle) {
      this._miniSimHandle.stop();
      this._miniSimHandle = null;
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

  /**
   * Industrial CRT in-app confirmation modal (replaces jarring native window.confirm()).
   */
  openConfirm({
    title = '確認',
    message = '',
    subMessage = '',
    confirmLabel = '実行する',
    cancelLabel = 'キャンセル',
    danger = false,
    onConfirm = null,
    onCancel = null,
  }) {
    this.open({
      title,
      bodyHtml: `
        <div class="callout ${danger ? 'callout-crimson' : 'callout-amber'}">
          <div style="font-weight:800;font-size:13.5px;line-height:1.55;">${esc(message)}</div>
          ${subMessage ? `<div style="margin-top:6px;font-size:12px;opacity:0.88;line-height:1.5;">${esc(subMessage)}</div>` : ''}
        </div>
      `,
      footerHtml: `
        <button class="btn btn-ghost" id="btn-confirm-cancel">${esc(cancelLabel)}</button>
        <button class="btn ${danger ? 'btn-danger-solid' : 'btn-amber'}" id="btn-confirm-ok">${esc(confirmLabel)}</button>
      `,
    });
    this.footerEl.querySelector('#btn-confirm-cancel')?.addEventListener('click', () => {
      sound.playSwitch(false);
      this.close();
      onCancel?.();
    });
    this.footerEl.querySelector('#btn-confirm-ok')?.addEventListener('click', () => {
      this.close();
      onConfirm?.();
    });
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
        const isBusRow = Boolean(stage.busMode && (t.busDisplayInput || t.busInput || t.busExpected));
        const inpStr = isBusRow
          ? formatBusRow(t.busDisplayInput || t.busInput, stage.inputs)
          : formatBits(t.displayInput || t.input);
        const expStr = isBusRow
          ? formatBusRow(t.busExpected, stage.outputs)
          : formatBits(t.expected);
        return `
          <tr>
            <td class="mono dim">${idx + 1}</td>
            <td>${esc(t.label)}</td>
            <td class="mono amber">${esc(inpStr)}</td>
            <td class="mono emerald">${esc(expStr)}</td>
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
                : '0番地で初期値「3」をセットし、1〜2番地の自作ループ（SUB 1 → JNZ 1）で ACC を「3 → 2 → 1 → 0」と1ずつ減らし、ACC=0 (Z=1) の瞬間に2番地の JNZ 1 が不発となって3番地へ脱出すること'
          )}</li>
          <li><b>成功条件</b>：${esc(
            stage.id === 'stage_22'
              ? '3命令完了時に最終気圧 ACC=8 (1000)、次PC=3番地に到達していること'
              : stage.id === 'stage_23'
                ? '4番地の JNZ 0 を通過（ACC=0 なので Z=1 → ジャンプ不発！）し、ACC=0 のまま次PC=5番地（開錠承認）へ進んでいること'
                : 'ループ脱出後に3番地で地上大ハッチ全開信号 ACC=15 (1111)、次PC=4番地を出力すること'
          )}</li>
        </ul>
      </div>
    `
        : stage.kind === 'ark8_program' && stage.asmProgramSpec
          ? `
      <div class="callout callout-emerald" style="margin-bottom:10px;">
        <div class="callout-title">🎯 ミッション採点仕様（あなたの自作8bit計算機 [ARK8_SYS] で実機検証）</div>
        <ul style="margin:4px 0 0;padding-left:16px;font-size:12px;line-height:1.6;">
          <li><b>開始状態</b>：ハードウェア同期リセット（<code>RST=1</code>）により <code>PC=0, R0〜R3=0</code> となり、初期データが <code>SRAM[0], SRAM[1]</code> に実機書き込みされた状態からスタート</li>
          <li><b>汎用検証ルール</b>：${esc(
            stage.id === 'stage_41'
              ? 'SRAM[0]=180, SRAM[1]=115 → RAM[2]=65 に加え、別データ（210 − 90 ＝ 120）でも合格する本物の LOAD → SUB → STOR 手順であること'
              : 'SRAM[0]=22, SRAM[1]=11 → RAM[2]=242 に加え、別データ（15 × 6 ＝ 90）でも合格する本物の LOAD → JNZループ加算 → STOR 手順であること'
          )}</li>
          <li><b>最終条件</b>：結果を <code>RAM[2]</code> へ保存し、<code>HALT</code> 命令で安全停止すること</li>
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
        : asmSpecCard;

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

    const showArk8Isa = stageUsesArk8IsaTable(stage);
    const showIsa = !showArk8Isa && stageUsesIsaTable(stage);
    const activeIsaRows = showArk8Isa ? ARK8_ISA_TABLE : showIsa ? ARK4_ISA_TABLE : null;
    const isaCardHtml = activeIsaRows
      ? `
        <div class="spec-ref-card isa">
          <div class="spec-ref-title">${showArk8Isa ? '📜 ARK-8 16ビット命令一覧（8命令・Load/Store）' : '📜 命令一覧（ニモニック・英語の意味）'}</div>
          <div class="spec-ref-sub">※ 命令の意味は仕様です（どの順番で並べるか・どう配線するかが課題です）</div>
          <div class="table-wrap">
            <table class="crt-table spec-isa-table">
              <thead>
                <tr>
                  <th>命令</th>
                  <th>英語の元の意味</th>
                  <th>はたらき</th>
                  <th>機械語</th>
                </tr>
              </thead>
              <tbody>
                ${activeIsaRows
                  .map(
                    (row) => `
                  <tr>
                    <td class="mono amber bold">${esc(row.mnemonic)}</td>
                    <td class="spec-en-cell">${esc(row.en)}</td>
                    <td>${esc(row.effect)}</td>
                    <td class="mono emerald">${esc(row.bits)}</td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        </div>
      `
      : '';

    const isaKeys = new Set(
      showArk8Isa ? ['LDI', 'ADD', 'SUB', 'JNZ', 'LOAD', 'STOR', 'ADDI', 'HALT'] : ['LDI', 'ADD', 'SUB', 'JNZ']
    );
    const symRefs = getStageSymbolReferences(stage).filter(
      (item) => !((showIsa || showArk8Isa) && isaKeys.has(item.key))
    );
    const symbolRefHtml =
      symRefs.length > 0
        ? `
        <div class="spec-ref-card">
          <div class="spec-ref-title">📖 このステージの略語・記号リファレンス</div>
          <div class="spec-ref-list">
            ${symRefs
              .map(
                (item) => `
              <div class="spec-ref-row">
                <span class="spec-ref-sym">${esc(item.key)}</span>
                <div class="spec-ref-body">
                  <div class="spec-ref-en">${esc(item.en)}</div>
                  <div class="spec-ref-ja">${esc(item.ja)}</div>
                </div>
              </div>
            `
              )
              .join('')}
          </div>
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
        ${isaCardHtml}
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
        ${symbolRefHtml}
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
    const inNames = stage?.inputs || [];
    const rowsHtml = evalResult.results
      .map((r) => {
        const cls = r.passed ? 'row-pass' : 'row-fail';
        const status = r.unstable ? '⚠ 発振' : r.passed ? '✔ OK' : '✘ NG';
        const isBus = Boolean(stage?.busMode && Array.isArray(r.busExpected));
        const pinDiffHtml =
          !r.passed && !r.unstable
            ? isBus
              ? buildPinDiffSummary(r.busActual, r.busExpected, outNames)
              : buildPinDiffSummary(r.actual, r.expected, outNames)
            : '';
        const inputStr = isBus ? esc(formatBusRow(r.busInput, inNames)) : formatBits(r.input);
        const expStr = isBus ? esc(formatBusRow(r.busExpected, outNames)) : formatBits(r.expected);
        const actualHtml = r.unstable
          ? 'ERR'
          : isBus
            ? r.passed
              ? esc(formatBusRow(r.busActual, outNames))
              : formatComparedBusActual(r.busActual, r.busExpected, outNames)
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
            <td class="mono">${inputStr}</td>
            <td class="mono emerald">${expStr}</td>
            <td class="mono ${r.passed ? 'emerald' : 'crimson'}">${actualHtml}</td>
            <td class="mono bold">${status}</td>
          </tr>
        `;
      })
      .join('');

    const diagTip =
      stage?.kind === 'ark8_program'
        ? '不合格の行にある <b>「🔍 この入力を盤面で調べる」</b> を押すと、その拍の R0〜R3 と SRAM[0..15] が実機モニタに再現されます。実機パネルの <b>🔍ENC8 / 🔍SRAM / 🔍CPU</b> から内部配線もいつでも調べられます！'
        : stage?.kind === 'assembly_program'
          ? '不合格の行にある <b>「🔍 この入力を盤面で調べる」</b> を押すと、そのステップの実行状態が実機モニタに再現されます。実機パネルの <b>🔍ENC / 🔍ROM / 🔍CPU</b> から内部配線もいつでも調べられます！'
          : stage?.mode === 'physics'
            ? '不合格の行にある <b>「🔍 この入力を盤面で調べる」</b> を押すと、その条件のスイッチ状態が実験台に再現されます。枠をタップして材料を入れ替えてみよう！'
            : '不合格の行にある <b>「🔍 この入力を盤面で調べる」</b> を押すと、そのステップの入力と記憶状態がそのまま作業台に再現されます（赤枠の数字が期待値と異なる出力ビットです）。盤面上のチップを選んで <b>「📖 解説・内部」</b> を開けば、内部配線もそのまま調べられます！';

    this.open({
      title: `ハコ診断レポート：${evalResult.passedCount} / ${evalResult.totalCount} 合格`,
      bodyHtml: `
        ${
          evalResult.error
            ? `<div class="callout callout-crimson">⚠ ${esc(evalResult.error)}</div>`
            : ''
        }
        <div class="callout callout-amber">
          ${diagTip}
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
  openVictory(
    stage,
    chipDef,
    metrics,
    hasNextStage,
    { onNext, onOpenCodex, onStay, onReplayEnding, onExportSilicon = null, journeyStats = null }
  ) {
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

    const metricSw = metrics?.swCount ?? (stage.id === 'stage_00' ? 2 : (metrics?.nandCount || 0) * 2);
    const metricPull = metrics?.pullCount ?? (stage.id === 'stage_00' ? 1 : metrics?.nandCount || 0);

    let finaleBanner = '';
    if (stage.isChapter3Finale) {
      const sysNand = journeyStats?.ark8SysNandCount ?? metrics.nandCount ?? 7403;
      const sysSw = journeyStats?.ark8SysSwCount ?? sysNand * 2;
      const sysPull = journeyStats?.ark8SysPullCount ?? sysNand;
      const forgedCount = journeyStats?.forgedChipCount ?? 35;
      const clearedCount = journeyStats?.clearedCount ?? STAGES.length;
      finaleBanner = `
        <div class="victory-cert-card horizon">
          <div class="vcert-eyebrow">📡 SILICON GENESIS // CHAPTER III COMPLETE</div>
          <div class="vcert-title">第三章完結 — 記憶の大地と8ビット汎用計算機！！</div>
          <p class="vcert-desc">1万4千個超の自作MOSFETからなる新世代8ビット計算機 <code>ARK8_SYS</code> と書き換え可能な <code>SRAM_16B</code> 上で、真の汎用ループ乗算（22×11＝242）が完全動作しました！ 次はいよいよ第4章の統一RAM・スタック・MMIO・MMU、第5章のカーネル、第6章のUNIX系OS『ARK-OS』へ（全6章）！</p>
          <div class="vcert-grid">
            <div class="vcert-stat"><span class="vcert-lbl">最終称号</span><strong>ホライズン 総括設計主任</strong></div>
            <div class="vcert-stat"><span class="vcert-lbl">8bit自作機</span><strong>${sysNand.toLocaleString()} NAND</strong><small>MOSFET ${sysSw.toLocaleString()}個 ＋ 抵抗 ${sysPull.toLocaleString()}本</small></div>
            <div class="vcert-stat"><span class="vcert-lbl">復元レコード</span><strong>${clearedCount} / ${STAGES.length}</strong><small>自作チップ ${forgedCount}種</small></div>
          </div>
          <div class="vcert-chain">砂(MOSFET) → NAND → 4bit → 8bit ALU/SRAM → ARK8_SYS → 統一RAM・MMU → カーネル → ARK-OS</div>
          ${
            onExportSilicon
              ? `<div class="vcert-export-row">
                  <button type="button" class="btn-silicon-pill cert" id="btn-victory-cert-verilog">💾 8bit実シリコン設計図 (Verilog HDL) を書き出す</button>
                </div>`
              : ''
          }
        </div>`;
    } else if (stage.isChapter2Finale) {
      const sysNand = journeyStats?.ark4SysNandCount ?? metrics.nandCount ?? 480;
      const sysSw = journeyStats?.ark4SysSwCount ?? sysNand * 2;
      const sysPull = journeyStats?.ark4SysPullCount ?? sysNand;
      const forgedCount = journeyStats?.forgedChipCount ?? 21;
      const clearedCount = journeyStats?.clearedCount ?? STAGES.length;
      finaleBanner = `
        <div class="victory-cert-card sky">
          <div class="vcert-eyebrow">☀ SILICON GENESIS // CHAPTER II COMPLETE</div>
          <div class="vcert-title">第二章完結 — 42年ぶりの青空への帰還！！</div>
          <p class="vcert-desc">砂（シリコン）から鍛えた <code>ARK4_SYS</code> と純粋4命令アセンブリが地上大ハッチを開き、118人全員を青空へ導きました！ <b>📡 第三章「記憶の大地」（STAGE 27〜42）</b> が解放されました！</p>
          <div class="vcert-grid">
            <div class="vcert-stat"><span class="vcert-lbl">昇格称号</span><strong>アーク7 最高主任技師</strong></div>
            <div class="vcert-stat"><span class="vcert-lbl">自作計算機</span><strong>${sysNand} NAND</strong><small>MOSFET ${sysSw}個 ＋ 抵抗 ${sysPull}本</small></div>
            <div class="vcert-stat"><span class="vcert-lbl">復元レコード</span><strong>${clearedCount} / ${STAGES.length}</strong><small>自作チップ ${forgedCount}種</small></div>
          </div>
          <div class="vcert-chain">砂(MOSFET) → NAND → 加算器 → ラッチ → CPU → ENC＋ROM → アセンブリ → ☀青空</div>
          ${
            onExportSilicon
              ? `<div class="vcert-export-row">
                  <button type="button" class="btn-silicon-pill cert" id="btn-victory-cert-verilog">💾 実シリコン設計図 (Verilog HDL) を書き出す</button>
                </div>`
              : ''
          }
        </div>`;
    } else if (stage.isFinale) {
      const cpuNand = journeyStats?.ark4NandCount ?? metrics.nandCount ?? 240;
      const cpuSw = journeyStats?.ark4SwCount ?? cpuNand * 2;
      const cpuPull = journeyStats?.ark4PullCount ?? cpuNand;
      const forgedCount = journeyStats?.forgedChipCount ?? 18;
      finaleBanner = `
        <div class="victory-cert-card">
          <div class="vcert-eyebrow">★ CHAPTER I COMPLETE // HELLO, WORLD.</div>
          <div class="vcert-title">第一章完結 — 自作CPU『ARK-4』稼働開始！</div>
          <p class="vcert-desc">地上ビーコンから <code>"HELLO, WORLD."</code> が届き、生存シェルター『アーク3』と繋がりました！ <b>☀ 第二章「青空への帰還」（STAGE 18〜26）</b> が解放されました！</p>
          <div class="vcert-grid">
            <div class="vcert-stat"><span class="vcert-lbl">昇格称号</span><strong>アーク7 主任技師</strong></div>
            <div class="vcert-stat"><span class="vcert-lbl">自作CPU規模</span><strong>${cpuNand} NAND</strong><small>MOSFET ${cpuSw}個 ＋ 抵抗 ${cpuPull}本</small></div>
            <div class="vcert-stat"><span class="vcert-lbl">鍛えたチップ</span><strong>${forgedCount} 種</strong><small>全${MODULE_ENCYCLOPEDIA_IDS.length}図鑑連動</small></div>
          </div>
          <div class="vcert-chain">砂(MOSFET) → NAND → 論理ゲート → 4bit加算器 → 記憶回路 → 🧠ARK-4</div>
        </div>`;
    }

    const metaText =
      stage.id === 'stage_00a'
        ? `半導体構造：<b>N型×2 ＋ ガラス ＋ 金属電極</b>`
        : stage.id === 'stage_00b'
          ? `物理回路：<b>プルアップ抵抗 ＋ 接地スイッチ</b>`
          : stage.id === 'stage_00'
            ? `物理シリコン：<b>MOSFET ${metricSw}個 ＋ 抵抗 ${metricPull}本</b>`
            : stage.kind === 'ark8_program'
              ? `16bit ROM命令数: <b>${metrics.nodeCount}行</b> <span class="dim">(ARK8_SYS ${metrics.nandCount.toLocaleString()}N · MOSFET ${metricSw.toLocaleString()}個＋抵抗 ${metricPull.toLocaleString()}本)</span>`
              : stage.kind === 'assembly_program'
                ? `ROM命令数: <b>${metrics.nodeCount}行</b> <span class="dim">(ARK4_SYS ${metrics.nandCount}N · MOSFET ${metricSw}個＋抵抗 ${metricPull}本)</span>`
                : `実効NAND: <b>${metrics.nandCount.toLocaleString()}</b>個 <span class="dim">(MOSFET ${metricSw.toLocaleString()}個 ＋ 抵抗 ${metricPull.toLocaleString()}本)</span>`;

    const forgedCaption =
      stage.id === 'stage_00a'
        ? `砂から創り上げた物理スイッチ <b>[じゃぐち（トランジスタ）]</b> の製法を習得しました！`
        : stage.id === 'stage_00b'
          ? `ショートを防ぎ安全に反転する <b>[はいすい（プルアップ抵抗）]</b> の製法を習得しました！ いよいよNANDを組もう！`
          : stage.id === 'stage_00'
            ? `物理スイッチから組み上げた原板 <b>[NAND]</b> をB4焼付け機へセットしました！ これ以降はこの <b>NAND</b> だけを量産して上位回路を創り上げます。`
            : stage.kind === 'ark8_program'
              ? `あなたの8ビット汎用計算機 <b>[ARK8_SYS]</b> と書き換え可能な <b>[SRAM_16B]</b> の上で、16ビットアセンブリ <b>[${esc(chipDef.name)}]</b> が完全動作しました！`
              : stage.kind === 'assembly_program'
                ? `あなたのノイマン型計算機 <b>[ARK4_SYS]</b> の上で、アセンブリ言語プログラム <b>[${esc(chipDef.name)}]</b> が完全動作しました！`
                : `あなたの回路をカスタムICチップ <b>[${esc(chipDef.name)}]</b> としてパレットに永続登録しました！`;

    const nextBtnLabel =
      stage.id === 'stage_17'
        ? '☀ 第二章「青空への帰還」(STAGE 18) へ進む ▶'
        : stage.id === 'stage_24'
          ? '📡 第三章「記憶の大地」(STAGE 27) へ進む ▶'
          : '次のミッションへ進む ▶';

    this.open({
      title: stage.isChapter3Finale
        ? '📡 SILICON GENESIS — 第三章・記憶の大地 完結！！'
        : stage.isChapter2Finale
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
        ${
          onReplayEnding
            ? `<button class="btn btn-sky" id="btn-victory-ending">${
                stage.isChapter3Finale
                  ? '📡 第三章エンディングをもう一度観る'
                  : stage.isChapter2Finale
                    ? '☀ 第二章エンディングをもう一度観る'
                    : '🎬 第一章エンディングをもう一度観る'
              }</button>`
            : ''
        }
        ${
          onExportSilicon
            ? `<button class="btn btn-silicon" id="btn-victory-verilog">💾 設計図(Verilog)</button>`
            : ''
        }
        <button class="btn btn-amber" id="btn-victory-codex">📖 CS図鑑を読む</button>
        <button class="btn btn-ghost" id="btn-victory-stay">この回路に留まる</button>
      `,
    });

    this.bodyEl.querySelector('#btn-victory-cert-verilog')?.addEventListener('click', () => {
      sound.playSwitch(true);
      onExportSilicon?.();
    });
    this.footerEl.querySelector('#btn-victory-verilog')?.addEventListener('click', () => {
      sound.playSwitch(true);
      onExportSilicon?.();
    });
    this.footerEl.querySelector('#btn-victory-next')?.addEventListener('click', () => {
      this.close();
      onNext();
    });
    this.footerEl.querySelector('#btn-victory-sandbox')?.addEventListener('click', () => {
      this.close();
      onNext('sandbox');
    });
    this.footerEl.querySelector('#btn-victory-ending')?.addEventListener('click', () => {
      this.close();
      onReplayEnding?.();
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
  openMap(
    save,
    currentStageId,
    {
      onSelectStage,
      onReplayPrologue,
      onReplayEnding1,
      onReplayEnding2,
      onReplayEnding3,
      onGoHome,
      onResetSave,
    }
  ) {
    const ch2Open = isChapter2Unlocked(save);
    const ch3Open = isChapter3Unlocked(save);
    const actsHtml = ACTS.map((act) => {
      const stagesInAct = STAGES.filter((s) => s.act === act.id);
      const chapterBannerHtml =
        act.id === 6
          ? `<div id="map-ch2-anchor" class="map-chapter-banner ${ch2Open ? '' : 'locked'}">
              <span>${ch2Open ? '☀' : '🔒'} 第二章：青空への帰還（ノイマン型計算機＆アセンブリ編）</span>
              <span class="mono" style="font-size:11px;opacity:0.9;">${ch2Open ? 'STAGE 18〜26' : '第一章クリアで解放'}</span>
            </div>`
          : act.id === 8
            ? `<div id="map-ch3-anchor" class="map-chapter-banner ch3 ${ch3Open ? '' : 'locked'}">
                <span>${ch3Open ? '📡' : '🔒'} 第三章：記憶の大地（SRAM・8ビット汎用計算機編）</span>
                <span class="mono" style="font-size:11px;opacity:0.9;">${ch3Open ? 'STAGE 27〜42' : '第二章クリアで解放'}</span>
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
                            : st.kind === 'ark8_program'
                              ? `✔ 16bitプログラム稼働済 [${st.rewardChip?.name || 'ARK8'}] · SRAM実機`
                              : st.kind === 'assembly_program'
                                ? `✔ プログラム稼働済 [${st.rewardChip?.name || 'ASM'}] · ROM制御`
                                : `✔ 自作チップ登録済 [${st.rewardChip?.name || st.code}] · ${(nandBest ?? chipObj?.nandCount ?? '?').toLocaleString()} NAND`
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
    const ch1Ended = isChapter1Cleared(save);
    const ch2Ended = isChapter2Cleared(save);
    const ch3Ended = isChapter3Cleared(save);
    const clearedTotal = save.clearedStages.length;
    const progressPct = Math.round((clearedTotal / Math.max(1, STAGES.length)) * 100);

    this.open({
      title: `ミッションマップ（進捗 ${clearedTotal} / ${STAGES.length}）`,
      bodyHtml: `
        <div class="map-progress-wrap">
          <div class="map-progress-meta">
            <span>復興進捗 <b>${clearedTotal} / ${STAGES.length}</b> ステージ</span>
            <span class="mono emerald bold">${progressPct}%</span>
          </div>
          <div class="map-progress-track"><div class="map-progress-fill" style="width:${progressPct}%"></div></div>
        </div>

        <div class="map-quick-grid">
          <button type="button" class="map-quick-btn" id="btn-map-home">🏠 タイトル</button>
          <button type="button" class="map-quick-btn" id="btn-map-prologue">🎬 プロローグ</button>
          <button type="button" class="map-quick-btn lab ${currentStageId === 'sandbox' ? 'active' : ''} ${!sandboxUnlocked ? 'locked' : ''}" data-stage-id="sandbox" ${!sandboxUnlocked ? 'disabled' : ''}>
            ${sandboxUnlocked ? '🧪 自由実験室' : '🔒 自由実験室 (01後)'}
          </button>
          ${ch1Ended ? `<button type="button" class="map-quick-btn ed1" id="btn-map-end1">🎬 第一章ED</button>` : ''}
          ${ch2Ended ? `<button type="button" class="map-quick-btn ed2" id="btn-map-end2">☀ 第二章ED</button>` : ''}
          ${ch3Ended ? `<button type="button" class="map-quick-btn ed3" id="btn-map-end3">📡 第三章ED</button>` : ''}
        </div>

        <div class="map-jump-strip">
          <button type="button" class="map-jump-pill" id="btn-map-jump-cur">📍 現在</button>
          <button type="button" class="map-jump-pill" id="btn-map-jump-ch1">第一章 (00〜17)</button>
          <button type="button" class="map-jump-pill ch2" id="btn-map-jump-ch2">☀ 第二章 (18〜26)</button>
          <button type="button" class="map-jump-pill ch3" id="btn-map-jump-ch3">📡 第三章 (27〜42)</button>
        </div>

        <div id="map-ch1-anchor"></div>
        ${actsHtml}
        <div class="danger-zone">
          <button class="btn btn-danger-outline" id="btn-reset-save">セーブデータを初期化</button>
        </div>
      `,
      footerHtml: `<button class="btn btn-ghost" data-close-modal>閉じる</button>`,
    });

    this.bodyEl.querySelector('#btn-map-jump-cur')?.addEventListener('click', () => {
      sound.playSwitch(true);
      this.bodyEl.querySelector('.map-stage-btn.active')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    this.bodyEl.querySelector('#btn-map-jump-ch1')?.addEventListener('click', () => {
      sound.playSwitch(true);
      this.bodyEl.querySelector('#map-ch1-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    this.bodyEl.querySelector('#btn-map-jump-ch2')?.addEventListener('click', () => {
      sound.playSwitch(true);
      this.bodyEl.querySelector('#map-ch2-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    this.bodyEl.querySelector('#btn-map-jump-ch3')?.addEventListener('click', () => {
      sound.playSwitch(true);
      this.bodyEl.querySelector('#map-ch3-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    // Auto-scroll to current active stage when player is deeper in the campaign!
    const activeStageIdx = STAGES.findIndex((s) => s.id === currentStageId);
    if (activeStageIdx >= 4) {
      requestAnimationFrame(() => {
        this.bodyEl.querySelector('.map-stage-btn.active')?.scrollIntoView({ behavior: 'auto', block: 'center' });
      });
    }

    this.bodyEl.querySelector('#btn-map-home')?.addEventListener('click', () => {
      this.close();
      onGoHome?.();
    });

    this.bodyEl.querySelector('#btn-map-prologue')?.addEventListener('click', () => {
      this.close();
      onReplayPrologue?.();
    });

    this.bodyEl.querySelector('#btn-map-end1')?.addEventListener('click', () => {
      this.close();
      onReplayEnding1?.();
    });

    this.bodyEl.querySelector('#btn-map-end2')?.addEventListener('click', () => {
      this.close();
      onReplayEnding2?.();
    });

    this.bodyEl.querySelector('#btn-map-end3')?.addEventListener('click', () => {
      this.close();
      onReplayEnding3?.();
    });

    this.bodyEl.querySelectorAll('[data-stage-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const sid = btn.dataset.stageId;
        this.close();
        onSelectStage(sid);
      });
    });

    this.bodyEl.querySelector('#btn-reset-save')?.addEventListener('click', () => {
      sound.playSwitch(false);
      this.openConfirm({
        title: '⚠ セーブデータの初期化',
        message: '進行状況と自作チップをすべて初期化して最初から始めますか？',
        subMessage: 'この操作は元に戻せません。プロローグから再スタートします。',
        confirmLabel: '🗑 初期化する',
        cancelLabel: 'やめる',
        danger: true,
        onConfirm: () => onResetSave(),
      });
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
      onExportSilicon = null,
      onToast = null,
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

    const renderModalContent = (scrollTargetId = null, { preserveScroll = false } = {}) => {
      const prevScrollTop = preserveScroll ? this.bodyEl.scrollTop : 0;
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
            const isProvisionedOnly = Boolean(!cleared && forged?.provisioned);
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

            const forgedSilicon = forged
              ? resolveSiliconStats(forged, forged.circuit || null, customChips)
              : null;
            const siliconBadgeStr = forgedSilicon
              ? term.chipId === 'NAND'
                ? `MOSFET ${forgedSilicon.swCount}個＋抵抗 ${forgedSilicon.pullCount}本`
                : `実効 ${forgedSilicon.nandCount} NAND（MOSFET ${forgedSilicon.swCount}個＋抵抗 ${forgedSilicon.pullCount}本）`
              : '';
            const detailBadge = isProvisionedOnly
              ? `<span class="mod-status-badge provisioned">📦 標準支給品（未自作）${siliconBadgeStr ? ` · ${siliconBadgeStr}` : ''}</span>`
              : forged
                ? `<span class="mod-status-badge forged">✔ 自作チップ登録済 · ${siliconBadgeStr}</span>`
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
                    <span class="codex-act">${esc(term.category)}${term.reading ? ` · ${esc(term.reading)}` : ''}</span>
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

      const canExportSilicon = Boolean(
        isChapter1Cleared(save) ||
          clearedSet.has('stage_21') ||
          clearedSet.has('stage_40') ||
          customChips?.ARK4_CORE ||
          customChips?.ARK4_SYS ||
          customChips?.ARK8_SYS
      );
      const siliconHeaderBarHtml = canExportSilicon
        ? `
          <div class="codex-silicon-bar">
            <div class="codex-silicon-info">
              <span class="codex-silicon-title">🔬 シリコン設計図・実ネットリスト</span>
              <span class="codex-silicon-sub">自作チップをそのまま Verilog HDL (.v) で出力</span>
            </div>
            <button type="button" id="btn-codex-export-silicon" class="btn-silicon-pill">💾 設計図(Verilog)</button>
          </div>
        `
        : '';

      const bodyHtml = `
        <div class="codex-tabs-bar">
          <button type="button" class="codex-tab-btn ${activeTab === 'modules' ? 'active' : ''}" data-codex-tab="modules">
            ⚡ モジュール図鑑 (${unlockedModuleCount}/${moduleEntries.length})
          </button>
          <button type="button" class="codex-tab-btn ${activeTab === 'history' ? 'active' : ''}" data-codex-tab="history">
            📜 CS歴史図鑑 (${unlockedHistoryCount}/${allHistoryEntries.length})
          </button>
        </div>

        ${siliconHeaderBarHtml}

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

      // Bind Silicon Blueprint Verilog export button in Codex header
      this.bodyEl.querySelector('#btn-codex-export-silicon')?.addEventListener('click', () => {
        sound.playSwitch(true);
        if (onExportSilicon) {
          onExportSilicon();
        } else {
          this.openSiliconExport(customChips, {
            onToast,
            backLabel: '◀ 図鑑へ戻る',
            onBack: () => {
              this.openCodex(saveOrUnlockedIds, {
                highlightIds,
                initialTab: activeTab,
                onNextStage,
                nextStageLabel,
                onBackToVictory,
                onExportSilicon,
                onToast,
              });
            },
          });
        }
      });

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
          renderModalContent(null, { preserveScroll: true });
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
          renderModalContent(willOpen ? modId : null, { preserveScroll: !willOpen });
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
          renderModalContent(willOpen ? codexId : null, { preserveScroll: !willOpen });
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
        renderModalContent(null, { preserveScroll: true });
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
        renderModalContent(null, { preserveScroll: true });
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
                onExportSilicon,
                onToast,
              });
            },
          });
        });
      });

      // Scroll to target module or CS history card (with golden highlight flash), or preserve scroll!
      if (preserveScroll && !scrollTargetId) {
        this.bodyEl.scrollTop = prevScrollTop;
      } else if (activeTab === 'modules' && scrollTargetId) {
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
      (['N_SILICON', 'P_SILICON', 'INSULATOR', 'GATE_METAL', 'METAL_GATE'].includes(part.id)
        ? 'mosfet_bridge'
        : part.id === 'WIRE'
          ? 'short_spark'
          : ['VCC', 'RESISTOR', 'DRAIN_VALVE', 'DRAIN_SW', 'GND'].includes(part.id)
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

    const siliconStats = resolveSiliconStats(
      chipType === 'NAND' ? { ...def, id: 'NAND' } : def,
      circuitToShow || null,
      customChips
    );
    const hasSiliconCount = siliconStats.swCount > 0 || siliconStats.pullCount > 0;

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
          <div class="stat-pill">実効NAND: <b>${siliconStats.nandCount}</b></div>
          ${
            hasSiliconCount
              ? `<div class="stat-pill silicon">物理素子: <b>MOSFET ${siliconStats.swCount}個 ＋ 抵抗 ${siliconStats.pullCount}本</b></div>`
              : ''
          }
          <div class="stat-pill">抽象階層: <b>Lv.${def.depth ?? 0}</b></div>
        </div>
      </div>
    `;

    let schematicHtml = '';
    if (circuitToShow) {
      const heading = isProvisioned
        ? `📦 標準支給回路の内部配線（${circuitToShow.nodes.length}チップ / ${siliconStats.nandCount}N · MOSFET ${siliconStats.swCount}個＋抵抗 ${siliconStats.pullCount}本）`
        : chipType === 'NAND'
          ? `🔧 あなたが物理スイッチから創り上げた NAND 原板（MOSFET ${siliconStats.swCount}個 ＋ 抵抗 ${siliconStats.pullCount}本）`
          : `🔧 あなたが設計した内部回路（${circuitToShow.nodes.length}チップ / ${siliconStats.nandCount}N · MOSFET ${siliconStats.swCount}個＋抵抗 ${siliconStats.pullCount}本）`;

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
        <button class="btn btn-primary" data-close-modal>${Array.isArray(liveInputs) ? '作業台（調査状態）へ戻る' : '閉じる'}</button>
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
  // 8. REAL SILICON BLUEPRINT / VERILOG HDL EXPORT MODAL
  // ===========================================================================
  openSiliconExport(
    customChips = {},
    {
      romCircuit = null,
      romRows = null,
      romArch = 'auto',
      stageTitle = '',
      onToast = null,
      onBack = null,
      backLabel = '◀ 戻る',
    } = {}
  ) {
    let exported = null;
    try {
      exported = exportSiliconBlueprint(customChips, { romCircuit, romRows, romArch, stageTitle });
    } catch (err) {
      exported = {
        verilog: `// Verilog HDL Export Error: ${err?.message || 'unknown'}\n`,
        summaryJa: '設計図の生成中にエラーが発生しました。',
        stats: {
          cpuNandCount: 0,
          cpuSwCount: 0,
          cpuPullCount: 0,
          encNandCount: 0,
          encSwCount: 0,
          encPullCount: 0,
          romNandCount: 0,
          romSwCount: 0,
          romPullCount: 0,
          totalNandCount: 0,
          totalSwCount: 0,
          totalPullCount: 0,
          moduleCount: 0,
        },
      };
    }

    const verilog = String(exported?.verilog || '');
    const summaryJa = String(exported?.summaryJa || '');
    const stats = exported?.stats || {};
    const totalNand = stats.totalNandCount ?? 0;
    const totalSw = stats.totalSwCount ?? 0;
    const totalPull = stats.totalPullCount ?? 0;
    const moduleCount = stats.moduleCount ?? 0;
    const lineCount = verilog ? verilog.split('\n').length : 0;
    const sizeKb = (new Blob([verilog]).size / 1024).toFixed(1);
    const verilogFilename =
      romArch === 'ark8' || Boolean(customChips?.ARK8_SYS)
        ? 'ark8_silicon_genesis.v'
        : 'ark4_silicon_genesis.v';

    const subPills = [];
    if ((stats.cpuNandCount ?? 0) > 0) {
      subPills.push(
        `<span class="silicon-sub-pill cpu">CPU: <b>${stats.cpuNandCount}N</b> (${stats.cpuSwCount}FET + ${stats.cpuPullCount}抵抗)</span>`
      );
    }
    if ((stats.encNandCount ?? 0) > 0) {
      subPills.push(
        `<span class="silicon-sub-pill enc">ENC: <b>${stats.encNandCount}N</b> (${stats.encSwCount}FET)</span>`
      );
    }
    if ((stats.romNandCount ?? 0) > 0) {
      subPills.push(
        `<span class="silicon-sub-pill rom">ROM: <b>${stats.romNandCount}N</b> (${stats.romSwCount}FET)</span>`
      );
    }

    this.open({
      title: '💾 シリコン設計図（Verilog HDL ネットリスト）',
      bodyHtml: `
        <div class="silicon-bom-hero">
          <div class="silicon-bom-eyebrow">PHOTOLITHOGRAPHY &amp; FPGA READY // REAL VERILOG HDL</div>
          <div class="silicon-bom-tagline">このまま半導体露光・FPGA合成に持ち込める実ネットリスト</div>
          ${summaryJa ? `<p class="silicon-bom-summary">${esc(summaryJa)}</p>` : ''}
          <div class="silicon-bom-grid">
            <div class="silicon-bom-cell">
              <span class="bom-lbl">合計 NAND</span>
              <strong class="bom-val amber">${totalNand}</strong>
              <span class="bom-unit">ゲート</span>
            </div>
            <div class="silicon-bom-cell">
              <span class="bom-lbl">MOSFET (SW)</span>
              <strong class="bom-val emerald">${totalSw}</strong>
              <span class="bom-unit">個</span>
            </div>
            <div class="silicon-bom-cell">
              <span class="bom-lbl">プルアップ抵抗</span>
              <strong class="bom-val sky">${totalPull}</strong>
              <span class="bom-unit">本</span>
            </div>
            <div class="silicon-bom-cell">
              <span class="bom-lbl">モジュール階層</span>
              <strong class="bom-val">${moduleCount}</strong>
              <span class="bom-unit">種</span>
            </div>
          </div>
          ${subPills.length > 0 ? `<div class="silicon-sub-row">${subPills.join('')}</div>` : ''}
        </div>

        <div class="verilog-preview-wrap">
          <div class="verilog-preview-head">
            <span class="verilog-file-name">📄 ${verilogFilename}</span>
            <span class="verilog-file-meta">${lineCount}行 · ${sizeKb} KB</span>
          </div>
          <pre class="verilog-code-pre" id="verilog-code-pre"><code>${esc(verilog)}</code></pre>
        </div>
      `,
      footerHtml: `
        <button type="button" class="btn btn-amber" id="btn-verilog-copy">📋 Verilogコピー</button>
        <button type="button" class="btn btn-emerald" id="btn-verilog-download">⬇ .v ファイル保存</button>
        ${onBack ? `<button type="button" class="btn btn-ghost" id="btn-verilog-back">${esc(backLabel)}</button>` : ''}
        <button type="button" class="btn btn-ghost" data-close-modal>閉じる</button>
      `,
    });

    const copyBtn = this.footerEl.querySelector('#btn-verilog-copy');
    copyBtn?.addEventListener('click', async () => {
      let copied = false;
      try {
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
          await navigator.clipboard.writeText(verilog);
          copied = true;
        }
      } catch {
        copied = false;
      }
      if (!copied) {
        try {
          const ta = document.createElement('textarea');
          ta.value = verilog;
          ta.setAttribute('readonly', '');
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          copied = document.execCommand('copy');
          ta.remove();
        } catch {
          copied = false;
        }
      }
      sound.playSwitch(copied);
      if (copied) {
        copyBtn.textContent = '✔ コピー完了！';
        copyBtn.classList.add('is-copied');
        onToast?.('Verilog HDL 設計図をクリップボードにコピーしました！');
        setTimeout(() => {
          if (copyBtn.isConnected) {
            copyBtn.textContent = '📋 Verilogコピー';
            copyBtn.classList.remove('is-copied');
          }
        }, 2000);
      } else {
        onToast?.('コピーできませんでした。下のコードを選択してコピーしてください。');
      }
    });

    this.footerEl.querySelector('#btn-verilog-download')?.addEventListener('click', () => {
      try {
        const blob = new Blob([verilog], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = verilogFilename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        sound.playSwitch(true);
        onToast?.(`${verilogFilename} を保存しました！`);
      } catch {
        sound.playSwitch(false);
        onToast?.('ファイル保存に失敗しました。コピーボタンをお試しください。');
      }
    });

    this.footerEl.querySelector('#btn-verilog-back')?.addEventListener('click', () => {
      sound.playSwitch(false);
      onBack?.();
    });
    this.footerEl.querySelector('[data-close-modal]')?.addEventListener('click', () => this.close());
  }

  // ===========================================================================
  // 9. SETTINGS MODAL (AUDIO, VOLUME SLIDER, SOUND TEST, RESET SAVE)
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
      if (chkSound) chkSound.checked = true;
      if (status && statusEl) statusEl.textContent = `音声エンジン: ${status}`;
    });

    chkDrone?.addEventListener('change', () => {
      onChangeDrone?.(chkDrone.checked);
    });

    this.bodyEl.querySelector('#btn-sound-test')?.addEventListener('click', () => {
      const status = onTestSound?.();
      if (chkSound) chkSound.checked = true;
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
      sound.playSwitch(false);
      this.openConfirm({
        title: '⚠ セーブデータの完全初期化',
        message: 'セーブデータと自作チップをすべて消去して、最初から（プロローグから）やり直しますか？',
        subMessage: 'この操作は取り消せません。',
        confirmLabel: '🗑 消去して最初から',
        cancelLabel: 'キャンセル',
        danger: true,
        onConfirm: () => onResetSave?.(),
      });
    });

    this.footerEl.querySelector('[data-close-modal]')?.addEventListener('click', () => this.close());
  }

  _renderMiniSchematicSvg(circuit, customChips) {
    return renderMiniSchematicSvg(circuit, customChips);
  }

  _startMiniSchematicLoop(circuit, customChips, chipType, liveInputs = null) {
    this._stopMiniSchematicLoop();
    const handle = startMiniSchematicLoop(this.bodyEl, circuit, customChips, chipType, {
      liveInputs,
      badgeSelector: '#inspector-live-step-badge',
    });
    this._miniSimHandle = handle;
    return handle?.sim || null;
  }
}
