/**
 * SILICON GENESIS — Stage Test Evaluator
 *
 * Evaluates a player's circuit against a stage's test suite:
 *   - mode: 'combinational' -> resets or tests all truth-table / vector cases independently
 *   - mode: 'sequential'    -> preserves internal memory state across steps (for latches, flip-flops, registers, counters, CPU!)
 *
 * Also checks allowed chip constraints (bottom-up rule: only NAND + unlocked chips!).
 */

import { compileCircuit } from './simulator.js';
import { computeCircuitMetrics } from './circuit.js';

export function evaluateStage(stage, circuit, customChips = {}) {
  // Verify all placed chips are allowed in this stage
  const allowed = new Set(stage.allowedPrimitives || ['NAND']);
  for (const chipId of Object.keys(customChips)) {
    // Allow all custom chips unlocked prior to this stage (or any custom chip in sandbox)
    if (!stage.allowedCustomChips || stage.allowedCustomChips.includes(chipId)) {
      allowed.add(chipId);
    }
  }

  const forbiddenNodes = circuit.nodes.filter((n) => !allowed.has(n.type));
  if (forbiddenNodes.length > 0) {
    return {
      passed: false,
      error: `このステージでは使用できない部品が含まれています: ${forbiddenNodes.map((n) => n.type).join(', ')}`,
      results: [],
      metrics: computeCircuitMetrics(circuit, customChips),
    };
  }

  let sim;
  try {
    sim = compileCircuit(circuit, customChips);
  } catch (err) {
    return {
      passed: false,
      error: `回路コンパイルエラー: ${err.message}`,
      results: [],
      metrics: computeCircuitMetrics(circuit, customChips),
    };
  }

  const results = [];
  let allPassed = true;
  let anyUnstable = false;

  if (stage.mode === 'sequential') {
    sim.reset();
    // Optional pre-steps (e.g. silent initialization before checked steps)
    if (Array.isArray(stage.initSteps)) {
      for (const initInput of stage.initSteps) {
        sim.evaluate(initInput);
      }
    }

    for (let idx = 0; idx < stage.tests.length; idx++) {
      const test = stage.tests[idx];
      // Support optional multi-phase step (e.g., setup CLK=0 then rising edge CLK=1)
      if (Array.isArray(test.phases)) {
        let lastRes = null;
        for (const phaseInput of test.phases) {
          lastRes = sim.evaluate(phaseInput);
        }
        const actual = lastRes.outputs;
        const unstable = lastRes.unstable;
        if (unstable) anyUnstable = true;

        const match = !unstable && outputsMatch(actual, test.expected);
        if (!match) allPassed = false;
        results.push({
          index: idx,
          label: test.label || `Step ${idx + 1}`,
          input: test.displayInput || test.phases[test.phases.length - 1],
          phases: test.phases,
          expected: test.expected,
          actual,
          passed: match,
          unstable,
        });
      } else {
        const res = sim.evaluate(test.input);
        if (res.unstable) anyUnstable = true;
        const match = !res.unstable && outputsMatch(res.outputs, test.expected);
        if (!match) allPassed = false;
        results.push({
          index: idx,
          label: test.label || `Step ${idx + 1}`,
          input: test.input,
          expected: test.expected,
          actual: res.outputs,
          passed: match,
          unstable: res.unstable,
        });
      }
    }
  } else {
    // Combinational mode: test every vector cleanly
    for (let idx = 0; idx < stage.tests.length; idx++) {
      const test = stage.tests[idx];
      sim.reset();
      const res = sim.evaluate(test.input);
      if (res.unstable) anyUnstable = true;
      const match = !res.unstable && outputsMatch(res.outputs, test.expected);
      if (!match) allPassed = false;
      results.push({
        index: idx,
        label: test.label || `Case ${idx + 1}`,
        input: test.input,
        expected: test.expected,
        actual: res.outputs,
        passed: match,
        unstable: res.unstable,
      });
    }
  }

  return {
    passed: allPassed && !anyUnstable && results.length > 0,
    unstable: anyUnstable,
    error: anyUnstable ? '回路内で発振（無限ループ）を検出しました。配線を見直してください。' : null,
    results,
    metrics: computeCircuitMetrics(circuit, customChips),
    passedCount: results.filter((r) => r.passed).length,
    totalCount: results.length,
  };
}

/**
 * Compares actual output bits against expected pattern.
 * `null` in expected acts as a don't-care wildcard (useful for initial unreset pins).
 */
export function outputsMatch(actual, expected) {
  if (!actual || !expected || actual.length !== expected.length) return false;
  for (let i = 0; i < expected.length; i++) {
    if (expected[i] === null || expected[i] === undefined) continue;
    if (actual[i] !== expected[i]) return false;
  }
  return true;
}
