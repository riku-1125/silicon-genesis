/**
 * SILICON GENESIS — Persistent Save Data (localStorage, v2 Physical Silicon)
 * Saves cleared stages, player-forged custom chips (with actual circuits!),
 * per-stage workbench drafts, unlocked CS codex entries, and preferences.
 */

import { STAGES } from '../data/stages.js';

export const STORAGE_KEY = 'silicon_genesis_save_v2';

export function createDefaultSave() {
  return {
    version: 2,
    currentStageId: 'stage_00a',
    clearedStages: [],        // array of stage IDs
    customChips: {},          // chipId -> { id, name, shortName, titleJa, descJa, color, accent, inputs, outputs, circuit, nandCount, swCount, pullCount, depth, stageId, createdAt }
    drafts: {},               // stageId -> circuit
    physicsDrafts: {},        // stageId -> { slotId: partId }
    bestNandCounts: {},       // stageId -> number
    unlockedCodex: [],
    discoveredTerms: [],      // glossary term IDs actually encountered in dialogue so far
    seenPrologue: false,
    chapter2Unlocked: false,
    chapter3Unlocked: false,
    chapter4Unlocked: false,
    seenIntroStages: [],
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
    if (parsed.version !== undefined && parsed.version < 2) {
      return createDefaultSave();
    }
    const merged = {
      ...createDefaultSave(),
      ...parsed,
      version: 2,
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
    // Ensure currentStageId always points to an unlocked stage
    if (!isStageUnlocked(merged, merged.currentStageId)) {
      const nextPlayable =
        STAGES.find((s) => isStageUnlocked(merged, s.id) && !merged.clearedStages.includes(s.id)) ||
        STAGES[0];
      merged.currentStageId = nextPlayable.id;
    }
    return merged;
  } catch {
    return createDefaultSave();
  }
}

export function persistSaveData(save) {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify({ ...save, version: 2 }));
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
 * Returns true once the player has cleared Chapter 1 (STAGE 17: ARK-4 CPU).
 */
export function isChapter1Cleared(save) {
  const cleared = Array.isArray(save?.clearedStages) ? save.clearedStages : [];
  return cleared.includes('stage_17');
}

/**
 * Chapter 2 unlocks upon clearing Chapter 1 (STAGE 17).
 * Also stays unlocked if the save already contains any cleared Chapter 2/3 stage.
 */
export function isChapter2Unlocked(save) {
  if (isChapter1Cleared(save)) return true;
  const cleared = Array.isArray(save?.clearedStages) ? save.clearedStages : [];
  return cleared.some((id) => (STAGES.find((s) => s.id === id)?.chapter || 1) >= 2);
}

/**
 * Returns true once the player has cleared Chapter 2 (STAGE 26 / id: stage_24).
 */
export function isChapter2Cleared(save) {
  const cleared = Array.isArray(save?.clearedStages) ? save.clearedStages : [];
  return cleared.includes('stage_24');
}

/**
 * Chapter 3 unlocks upon clearing Chapter 2 (STAGE 26) or if any Chapter 3 stage is cleared.
 */
export function isChapter3Unlocked(save) {
  if (isChapter2Cleared(save)) return true;
  const cleared = Array.isArray(save?.clearedStages) ? save.clearedStages : [];
  return cleared.some((id) => (STAGES.find((s) => s.id === id)?.chapter || 1) >= 3);
}

/**
 * Returns true once the player has cleared Chapter 3 (STAGE 42 / id: stage_42).
 */
export function isChapter3Cleared(save) {
  const cleared = Array.isArray(save?.clearedStages) ? save.clearedStages : [];
  return cleared.includes('stage_42');
}

/**
 * Chapter 4 unlocks upon clearing Chapter 3 (STAGE 42) or if any Chapter 4 stage is cleared.
 */
export function isChapter4Unlocked(save) {
  if (isChapter3Cleared(save)) return true;
  const cleared = Array.isArray(save?.clearedStages) ? save.clearedStages : [];
  return cleared.some((id) => (STAGES.find((s) => s.id === id)?.chapter || 1) >= 4);
}

/**
 * Returns true once the player has cleared Chapter 4 (STAGE 54 / id: stage_54).
 */
export function isChapter4Cleared(save) {
  const cleared = Array.isArray(save?.clearedStages) ? save.clearedStages : [];
  return cleared.includes('stage_54');
}

/**
 * Determines whether a stage is unlocked.
 * Stage 00-A is always unlocked; stage N unlocks once stage N-1 is cleared.
 * Therefore Stage 18 (Chapter 2) strictly unlocks upon clearing Stage 17 (Chapter 1).
 */
export function isStageUnlocked(save, stageId) {
  const cleared = Array.isArray(save?.clearedStages) ? save.clearedStages : [];
  if (stageId === 'sandbox') return cleared.length > 0;
  const idx = STAGES.findIndex((s) => s.id === stageId);
  if (idx <= 0) return true;
  const prevStage = STAGES[idx - 1];
  return cleared.includes(prevStage.id) || cleared.includes(stageId);
}
