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
import { computeCircuitMetrics, getTotalPinBits, packBusVector, unpackBusVector } from './circuit.js';

function resolveTestInput(stage, rawInput, rawBusInput) {
  if (Array.isArray(rawBusInput)) return packBusVector(stage.inputs, rawBusInput);
  return rawInput || [];
}

function resolveTestExpected(stage, rawExpected, rawBusExpected) {
  if (Array.isArray(rawBusExpected)) return packBusVector(stage.outputs, rawBusExpected);
  return rawExpected || [];
}

export function evaluateStage(stage, circuit, customChips = {}) {
  // Verify all placed chips are allowed in this stage
  const allowed = new Set(stage.allowedPrimitives || ['NAND']);
  if (stage.busMode) {
    allowed.add('SPLIT4');
    allowed.add('JOIN4');
    allowed.add('SPLIT8');
    allowed.add('JOIN8');
  }
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
        const flatInit =
          initInput && !Array.isArray(initInput) && Array.isArray(initInput.busInput)
            ? packBusVector(stage.inputs, initInput.busInput)
            : initInput;
        sim.evaluate(flatInit);
      }
    }

    for (let idx = 0; idx < stage.tests.length; idx++) {
      const test = stage.tests[idx];
      const expected = resolveTestExpected(stage, test.expected, test.busExpected);
      // Support optional multi-phase step (e.g., setup CLK=0 then rising edge CLK=1)
      const rawPhases = Array.isArray(test.busPhases)
        ? test.busPhases.map((bp) => packBusVector(stage.inputs, bp))
        : test.phases;
      if (Array.isArray(rawPhases)) {
        let lastRes = null;
        for (const phaseInput of rawPhases) {
          lastRes = sim.evaluate(phaseInput);
        }
        const actual = lastRes.outputs;
        const unstable = lastRes.unstable;
        if (unstable) anyUnstable = true;

        const match = !unstable && outputsMatch(actual, expected);
        if (!match) allPassed = false;
        const dispIn = test.busDisplayInput
          ? packBusVector(stage.inputs, test.busDisplayInput)
          : test.displayInput || rawPhases[rawPhases.length - 1];
        results.push({
          index: idx,
          label: test.label || `Step ${idx + 1}`,
          input: dispIn,
          busInput: unpackBusVector(stage.inputs, dispIn),
          phases: rawPhases,
          expected,
          busExpected: Array.isArray(test.busExpected) ? test.busExpected : unpackBusVector(stage.outputs, expected),
          actual,
          busActual: unpackBusVector(stage.outputs, actual),
          passed: match,
          unstable,
        });
      } else {
        const flatIn = resolveTestInput(stage, test.input, test.busInput);
        const res = sim.evaluate(flatIn);
        if (res.unstable) anyUnstable = true;
        const match = !res.unstable && outputsMatch(res.outputs, expected);
        if (!match) allPassed = false;
        results.push({
          index: idx,
          label: test.label || `Step ${idx + 1}`,
          input: flatIn,
          busInput: Array.isArray(test.busInput) ? test.busInput : unpackBusVector(stage.inputs, flatIn),
          expected,
          busExpected: Array.isArray(test.busExpected) ? test.busExpected : unpackBusVector(stage.outputs, expected),
          actual: res.outputs,
          busActual: unpackBusVector(stage.outputs, res.outputs),
          passed: match,
          unstable: res.unstable,
        });
      }
    }
  } else {
    // Combinational mode: test every vector cleanly
    for (let idx = 0; idx < stage.tests.length; idx++) {
      const test = stage.tests[idx];
      const flatIn = resolveTestInput(stage, test.input, test.busInput);
      const expected = resolveTestExpected(stage, test.expected, test.busExpected);
      sim.reset();
      const res = sim.evaluate(flatIn);
      if (res.unstable) anyUnstable = true;
      const match = !res.unstable && outputsMatch(res.outputs, expected);
      if (!match) allPassed = false;
      results.push({
        index: idx,
        label: test.label || `Case ${idx + 1}`,
        input: flatIn,
        busInput: Array.isArray(test.busInput) ? test.busInput : unpackBusVector(stage.inputs, flatIn),
        expected,
        busExpected: Array.isArray(test.busExpected) ? test.busExpected : unpackBusVector(stage.outputs, expected),
        actual: res.outputs,
        busActual: unpackBusVector(stage.outputs, res.outputs),
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

  const totalInBits = getTotalPinBits(stage.inputs);
  const steps = evalResult?.results?.length ? evalResult.results : stage.tests || [];
  const target = steps[caseIdx] || stage.tests?.[caseIdx];
  if (!target) {
    return { simulator: sim, inputBits: new Array(totalInBits).fill(0), step: null };
  }

  let inputBits = new Array(totalInBits).fill(0);

  if (stage.mode === 'sequential') {
    if (Array.isArray(stage.initSteps)) {
      for (const initInput of stage.initSteps) {
        inputBits =
          initInput && !Array.isArray(initInput) && Array.isArray(initInput.busInput)
            ? packBusVector(stage.inputs, initInput.busInput)
            : [...initInput];
        sim.evaluate(inputBits);
      }
    }
    for (let i = 0; i <= caseIdx && i < steps.length; i++) {
      const st = steps[i];
      const rawTest = stage.tests?.[i];
      const phases =
        st.phases ||
        (Array.isArray(rawTest?.busPhases)
          ? rawTest.busPhases.map((bp) => packBusVector(stage.inputs, bp))
          : rawTest?.phases);
      if (Array.isArray(phases)) {
        for (const ph of phases) {
          inputBits = [...ph];
          sim.evaluate(inputBits);
        }
      } else {
        inputBits = [
          ...(st.input ||
            (Array.isArray(rawTest?.busInput)
              ? packBusVector(stage.inputs, rawTest.busInput)
              : rawTest?.input) ||
            inputBits),
        ];
        sim.evaluate(inputBits);
      }
    }
  } else {
    inputBits = [
      ...(target.input ||
        (Array.isArray(target.busInput) ? packBusVector(stage.inputs, target.busInput) : inputBits)),
    ];
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
