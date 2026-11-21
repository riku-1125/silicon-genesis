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

  let counterexampleError = null;

  // Stage 07 (4-Bit Ripple Carry Adder): show representative examples on screen,
  // and verify ALL 512 combinations of A(0..15) x B(0..15) x CIN(0..1) before forging ADD_4B!
  if ((stage.id === 'stage_07' || stage.exhaustiveCheck === 'add4_512') && !anyUnstable) {
    let foundCounterexample = null;
    for (let cin = 0; cin <= 1 && !foundCounterexample; cin++) {
      for (let a = 0; a < 16 && !foundCounterexample; a++) {
        for (let b = 0; b < 16 && !foundCounterexample; b++) {
          const input = [
            a & 1, (a >> 1) & 1, (a >> 2) & 1, (a >> 3) & 1,
            b & 1, (b >> 1) & 1, (b >> 2) & 1, (b >> 3) & 1,
            cin,
          ];
          const sum = a + b + cin;
          const expected = [
            sum & 1,
            (sum >> 1) & 1,
            (sum >> 2) & 1,
            (sum >> 3) & 1,
            (sum >> 4) & 1,
          ];
          sim.reset();
          const res = sim.evaluate(input);
          if (res.unstable) {
            anyUnstable = true;
            foundCounterexample = { a, b, cin, sum, input, expected, actual: res.outputs, unstable: true };
          } else if (!outputsMatch(res.outputs, expected)) {
            foundCounterexample = { a, b, cin, sum, input, expected, actual: res.outputs, unstable: false };
          }
        }
      }
    }

    if (foundCounterexample) {
      allPassed = false;
      const { a, b, cin, sum, input, expected, actual, unstable } = foundCounterexample;
      const alreadyInRep = results.some(
        (r) => !r.passed && r.input && r.input.every((v, i) => v === input[i])
      );
      if (!alreadyInRep) {
        results.push({
          index: results.length,
          label: `反例発見 (全512通り検証): A=${a} + B=${b} + CIN=${cin} (期待=${sum})`,
          input,
          expected,
          actual,
          passed: false,
          unstable,
          isCounterexample: true,
        });
      }
      const actSum =
        (actual[0] ? 1 : 0) +
        (actual[1] ? 2 : 0) +
        (actual[2] ? 4 : 0) +
        (actual[3] ? 8 : 0) +
        (actual[4] ? 16 : 0);
      counterexampleError = `全512通り（A:0〜15 × B:0〜15 × CIN:0〜1）の網羅検査で反例が見つかりました：A=${a}, B=${b}, CIN=${cin} のとき 期待値=${sum} に対して 実測値=${actSum} が出力されています。`;
    }
  }

  return {
    passed: allPassed && !anyUnstable && results.length > 0,
    unstable: anyUnstable,
    error: anyUnstable
      ? '回路内で発振（無限ループ）を検出しました。配線を見直してください。'
      : counterexampleError,
    results,
    metrics: computeCircuitMetrics(circuit, customChips),
    passedCount: results.filter((r) => r.passed).length,
    totalCount: results.length,
  };
}

/**
 * Reconstructs the exact simulator state and workbench inputBits for any test
 * case (including sequential history + clock phases, or an exhaustive counterexample).
 */
export function reproduceDiagnosticState(stage, circuit, customChips, evalResult, caseIdx) {
  const sim = compileCircuit(circuit, customChips);
  sim.reset();

  const steps = evalResult?.results?.length ? evalResult.results : stage.tests || [];
  const target = steps[caseIdx] || stage.tests?.[caseIdx];
  if (!target) {
    return { simulator: sim, inputBits: new Array(stage.inputs.length).fill(0), step: null };
  }

  let inputBits = new Array(stage.inputs.length).fill(0);

  if (stage.mode === 'sequential') {
    if (Array.isArray(stage.initSteps)) {
      for (const initInput of stage.initSteps) {
        inputBits = [...initInput];
        sim.evaluate(inputBits);
      }
    }
    for (let i = 0; i <= caseIdx && i < steps.length; i++) {
      const st = steps[i];
      const rawTest = stage.tests?.[i];
      const phases = st.phases || rawTest?.phases;
      if (Array.isArray(phases)) {
        for (const ph of phases) {
          inputBits = [...ph];
          sim.evaluate(inputBits);
        }
      } else {
        inputBits = [...(st.input || rawTest?.input || inputBits)];
        sim.evaluate(inputBits);
      }
    }
  } else {
    inputBits = [...target.input];
    sim.evaluate(inputBits);
  }

  return {
    simulator: sim,
    inputBits,
    step: target,
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
