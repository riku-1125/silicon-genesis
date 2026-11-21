/**
 * SILICON GENESIS — Persistent Save Data (localStorage)
 * Saves cleared stages, player-forged custom chips (with actual circuits!),
 * per-stage workbench drafts, unlocked CS codex entries, and preferences.
 */

import { STAGES } from '../data/stages.js';

const STORAGE_KEY = 'silicon_genesis_save_v1';

export function createDefaultSave() {
  return {
    version: 1,
    currentStageId: 'stage_00a',
    clearedStages: [],        // array of stage IDs
    customChips: {},          // chipId -> { id, name, shortName, titleJa, descJa, color, accent, inputs, outputs, circuit, nandCount, depth, stageId, createdAt }
    drafts: {},               // stageId -> circuit
    physicsDrafts: {},        // stageId -> { slotId: partId }
    bestNandCounts: {},       // stageId -> number
    unlockedCodex: [],
    discoveredTerms: [],      // glossary term IDs actually encountered in dialogue so far
    seenPrologue: false,
    chapter2Unlocked: false,  // true when player launched Chapter 2 directly from Home screen
    seenIntroStages: [],      // legacy
    seenTheaterStages: [],    // stage IDs whose full-screen Story Theater has been shown at least once
    soundEnabled: true,
    soundVolume: 0.8,
    bgmEnabled: true,
    bgmVolume: 0.55,
    droneEnabled: false,
    sceneCollapsed: false,
  };
}

export function loadSaveData() {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return createDefaultSave();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return createDefaultSave();
    const merged = {
      ...createDefaultSave(),
      ...parsed,
      customChips: parsed.customChips && typeof parsed.customChips === 'object' ? parsed.customChips : {},
      drafts: parsed.drafts && typeof parsed.drafts === 'object' ? parsed.drafts : {},
      physicsDrafts: parsed.physicsDrafts && typeof parsed.physicsDrafts === 'object' ? parsed.physicsDrafts : {},
      bestNandCounts: parsed.bestNandCounts && typeof parsed.bestNandCounts === 'object' ? parsed.bestNandCounts : {},
      clearedStages: Array.isArray(parsed.clearedStages) ? parsed.clearedStages : [],
      unlockedCodex: Array.isArray(parsed.unlockedCodex) ? parsed.unlockedCodex : [],
      discoveredTerms: Array.isArray(parsed.discoveredTerms) ? parsed.discoveredTerms : [],
      seenIntroStages: Array.isArray(parsed.seenIntroStages) ? parsed.seenIntroStages : [],
      seenTheaterStages: Array.isArray(parsed.seenTheaterStages) ? parsed.seenTheaterStages : [],
    };
    // Auto-migrate pre-ACT-0 saves that haven't cleared any stage yet to start at Stage 00-A
    if (merged.clearedStages.length === 0 && !isStageUnlocked(merged, merged.currentStageId)) {
      merged.currentStageId = 'stage_00a';
    }
    return merged;
  } catch {
    return createDefaultSave();
  }
}

export function persistSaveData(save) {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
}

export function resetSaveData() {
  try {
    globalThis.localStorage?.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  return createDefaultSave();
}

/**
 * Determines whether a stage is unlocked.
 * Stage 00 is always unlocked; stage N unlocks once stage N-1 is cleared.
 */
export function isStageUnlocked(save, stageId) {
  const cleared = Array.isArray(save?.clearedStages) ? save.clearedStages : [];
  if (stageId === 'sandbox') return cleared.length > 0 || Boolean(save?.chapter2Unlocked);
  const idx = STAGES.findIndex((s) => s.id === stageId);
  if (idx <= 0) return true;
  const stage = STAGES[idx];
  // When Chapter 2 was launched directly, Stage 18 is unlocked and all Chapter 1 stages are available to play!
  if (save?.chapter2Unlocked) {
    if (stage.chapter !== 2 || stageId === 'stage_18') return true;
  }
  // Backwards-compatible: existing saves with prior clears keep stage_00 / stage_01 accessible
  if ((stageId === 'stage_00' || stageId === 'stage_01') && cleared.length > 0) return true;
  const prevStage = STAGES[idx - 1];
  return cleared.includes(prevStage.id) || cleared.includes(stageId);
}
