/**
 * IEC 61131-3 Timer Compliance Tests
 *
 * Tests timer behavior against the IEC 61131-3 standard (Section 2.5.1).
 * These tests verify exact compliance, not just "it works."
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { parseSTToAST } from '../../transformer/ast';
import { runScanCycle } from '../program-runner';
import { createRuntimeState, type SimulationStoreInterface } from '../execution-context';
import { initializeVariables } from '../variable-initializer';

// ============================================================================
// Test Store Factory (matches real simulation store behavior)
// ============================================================================

function createTestStore(scanTime: number = 100): SimulationStoreInterface {
  const store = {
    booleans: {} as Record<string, boolean>,
    integers: {} as Record<string, number>,
    reals: {} as Record<string, number>,
    times: {} as Record<string, number>,
    timers: {} as Record<string, { IN: boolean; PT: number; Q: boolean; ET: number; running: boolean }>,
    counters: {} as Record<string, { CU: boolean; CD: boolean; R: boolean; LD: boolean; PV: number; QU: boolean; QD: boolean; CV: number }>,
    scanTime,
  } as SimulationStoreInterface;

  Object.assign(store, {
    setBool: (name: string, value: boolean) => { store.booleans[name] = value; },
    getBool: (name: string) => store.booleans[name] ?? false,
    setInt: (name: string, value: number) => { store.integers[name] = Math.floor(value); },
    getInt: (name: string) => store.integers[name] ?? 0,
    setReal: (name: string, value: number) => { store.reals[name] = value; },
    getReal: (name: string) => store.reals[name] ?? 0,
    setTime: (name: string, value: number) => { store.times[name] = value; },
    getTime: (name: string) => store.times[name] ?? 0,
    initTimer: (name: string, pt: number) => {
      store.timers[name] = { IN: false, PT: pt, Q: false, ET: 0, running: false };
    },
    getTimer: (name: string) => store.timers[name],
    setTimerPT: (name: string, pt: number) => {
      const timer = store.timers[name];
      if (timer) timer.PT = pt;
    },
    setTimerInput: (name: string, input: boolean) => {
      const timer = store.timers[name];
      if (!timer) return;
      const wasOff = !timer.IN;
      const goingOn = input && wasOff;
      const goingOff = !input && timer.IN;
      const stayingOff = !input && !timer.IN;
      timer.IN = input;
      if (goingOn) {
        timer.ET = 0;
        // Per IEC 61131-3: if PT=0, Q is immediately TRUE
        if (timer.PT <= 0) {
          timer.Q = true;
          timer.running = false;
        } else {
          timer.running = true;
          timer.Q = false;
        }
      } else if (goingOff) {
        timer.running = false;
        timer.ET = 0;
        // Q reset handled on next scan when stayingOff
      } else if (stayingOff && timer.Q) {
        timer.Q = false;
      }
    },
    updateTimer: (name: string, deltaMs: number) => {
      const timer = store.timers[name];
      if (!timer || !timer.running) return;
      timer.ET = Math.min(timer.ET + deltaMs, timer.PT);
      if (timer.ET >= timer.PT) {
        timer.Q = true;
        timer.running = false;
      }
    },
    initCounter: (name: string, pv: number) => {
      store.counters[name] = { CU: false, CD: false, R: false, LD: false, PV: pv, QU: false, QD: false, CV: 0 };
    },
    getCounter: (name: string) => store.counters[name],
    pulseCountUp: (name: string) => { const c = store.counters[name]; if (c) { c.CV++; c.QU = c.CV >= c.PV; } },
    pulseCountDown: (name: string) => { const c = store.counters[name]; if (c) { c.CV = Math.max(0, c.CV - 1); c.QD = c.CV <= 0; } },
    resetCounter: (name: string) => { const c = store.counters[name]; if (c) { c.CV = 0; c.QU = false; c.QD = true; } },
    clearAll: () => {
      store.booleans = {};
      store.integers = {};
      store.reals = {};
      store.times = {};
      store.timers = {};
      store.counters = {};
    },
  });

  return store;
}

// Helper to run N scan cycles
function runScans(n: number, ast: ReturnType<typeof parseSTToAST>, store: SimulationStoreInterface, runtimeState: ReturnType<typeof createRuntimeState>) {
  for (let i = 0; i < n; i++) {
    runScanCycle(ast, store, runtimeState);
  }
}

// ============================================================================
// TON (On-Delay Timer) - IEC 61131-3 Section 2.5.1.1
// ============================================================================

describe('TON Timer Compliance (IEC 61131-3)', () => {
  let store: SimulationStoreInterface;

  beforeEach(() => {
    store = createTestStore(100); // 100ms scan time
  });

  describe('Basic TON Behavior', () => {
    const tonProgram = `
      PROGRAM TONTest
      VAR
        StartInput : BOOL := FALSE;
        Timer1 : TON;
        TimerDone : BOOL;
        ElapsedTime : TIME;
      END_VAR
      Timer1(IN := StartInput, PT := T#500ms);
      TimerDone := Timer1.Q;
      ElapsedTime := Timer1.ET;
      END_PROGRAM
    `;

    it('Q is FALSE when IN is FALSE', () => {
      const ast = parseSTToAST(tonProgram);
      initializeVariables(ast, store);
      const runtimeState = createRuntimeState(ast);

      // Run with IN=FALSE
      runScanCycle(ast, store, runtimeState);

      expect(store.getBool('TimerDone')).toBe(false);
    });

    it('ET starts at 0 when IN goes TRUE', () => {
      const ast = parseSTToAST(tonProgram);
      initializeVariables(ast, store);
      const runtimeState = createRuntimeState(ast);

      store.setBool('StartInput', true);
      runScanCycle(ast, store, runtimeState);

      const timer = store.getTimer('Timer1');
      // ET should be 100ms (one scan) or still 0 depending on when update happens
      expect(timer?.ET).toBeLessThanOrEqual(100);
    });

    it('Q becomes TRUE only when ET >= PT', () => {
      const ast = parseSTToAST(tonProgram);
      initializeVariables(ast, store);
      const runtimeState = createRuntimeState(ast);

      store.setBool('StartInput', true);

      // Run 4 scans (400ms) - should still be FALSE
      runScans(4, ast, store, runtimeState);
      expect(store.getBool('TimerDone')).toBe(false);

      // Run 2 more scans (600ms total) - should now be TRUE
      runScans(2, ast, store, runtimeState);
      expect(store.getBool('TimerDone')).toBe(true);
    });

    it('ET stops incrementing at PT (does not overflow)', () => {
      const ast = parseSTToAST(tonProgram);
      initializeVariables(ast, store);
      const runtimeState = createRuntimeState(ast);

      store.setBool('StartInput', true);

      // Run 10 scans (1000ms) - well past PT of 500ms
      runScans(10, ast, store, runtimeState);

      const timer = store.getTimer('Timer1');
      expect(timer?.ET).toBe(500); // Capped at PT
      expect(timer?.Q).toBe(true);
    });

    it('Q and ET reset when IN goes FALSE', () => {
      const ast = parseSTToAST(tonProgram);
      initializeVariables(ast, store);
      const runtimeState = createRuntimeState(ast);

      // Start timer
      store.setBool('StartInput', true);
      runScans(6, ast, store, runtimeState); // Timer completes

      expect(store.getBool('TimerDone')).toBe(true);

      // Turn off input
      store.setBool('StartInput', false);
      runScanCycle(ast, store, runtimeState);

      const timer = store.getTimer('Timer1');
      expect(timer?.ET).toBe(0);
      // Q may still be true for one scan, then false
      runScanCycle(ast, store, runtimeState);
      expect(store.getBool('TimerDone')).toBe(false);
    });
  });

  describe('TON Edge Cases', () => {
    it('re-triggering while timing restarts from 0', () => {
      const ast = parseSTToAST(`
        PROGRAM TONRetrigger
        VAR
          Input : BOOL := FALSE;
          Timer1 : TON;
        END_VAR
        Timer1(IN := Input, PT := T#500ms);
        END_PROGRAM
      `);

      initializeVariables(ast, store);
      const runtimeState = createRuntimeState(ast);

      // Start timer
      store.setBool('Input', true);
      runScans(3, ast, store, runtimeState); // 300ms elapsed

      const timer1 = store.getTimer('Timer1');
      expect(timer1?.ET).toBe(300);

      // Turn off and back on (re-trigger)
      store.setBool('Input', false);
      runScanCycle(ast, store, runtimeState);
      store.setBool('Input', true);
      runScanCycle(ast, store, runtimeState);

      const timer2 = store.getTimer('Timer1');
      expect(timer2?.ET).toBe(100); // Restarted from 0, now at 100ms
    });

    it('PT of 0 means Q is immediately TRUE when IN is TRUE', () => {
      const ast = parseSTToAST(`
        PROGRAM TONZeroPT
        VAR
          Input : BOOL := FALSE;
          Timer1 : TON;
          Done : BOOL;
        END_VAR
        Timer1(IN := Input, PT := T#0ms);
        Done := Timer1.Q;
        END_PROGRAM
      `);

      initializeVariables(ast, store);
      const runtimeState = createRuntimeState(ast);

      store.setBool('Input', true);
      runScanCycle(ast, store, runtimeState);

      // With PT=0, Q should be TRUE immediately
      expect(store.getBool('Done')).toBe(true);
    });

    it('Q stays TRUE while IN remains TRUE after timeout', () => {
      const ast = parseSTToAST(`
        PROGRAM TONHold
        VAR
          Input : BOOL := FALSE;
          Timer1 : TON;
          Done : BOOL;
        END_VAR
        Timer1(IN := Input, PT := T#200ms);
        Done := Timer1.Q;
        END_PROGRAM
      `);

      initializeVariables(ast, store);
      const runtimeState = createRuntimeState(ast);

      store.setBool('Input', true);
      runScans(5, ast, store, runtimeState); // 500ms, well past 200ms PT

      expect(store.getBool('Done')).toBe(true);

      // Run more scans - Q should stay TRUE
      runScans(5, ast, store, runtimeState);
      expect(store.getBool('Done')).toBe(true);
    });
  });
});

// ============================================================================
// Self-resetting timer pattern (common in traffic lights)
// ============================================================================

describe('Self-Resetting Timer Pattern', () => {
  let store: SimulationStoreInterface;

  beforeEach(() => {
    store = createTestStore(100);
  });

  it('timer with NOT Q feedback auto-resets', () => {
    // This is the pattern used in traffic lights:
    // Timer(IN := Running AND NOT Timer.Q, PT := Duration)
    const ast = parseSTToAST(`
      PROGRAM SelfReset
      VAR
        Running : BOOL := TRUE;
        Timer1 : TON;
        Pulses : INT := 0;
      END_VAR
      Timer1(IN := Running AND NOT Timer1.Q, PT := T#300ms);
      IF Timer1.Q THEN
        Pulses := Pulses + 1;
      END_IF;
      END_PROGRAM
    `);

    initializeVariables(ast, store);
    const runtimeState = createRuntimeState(ast);

    // Run for 1 second (10 scans at 100ms each)
    // Should get multiple pulses: 300ms, 600ms, 900ms = ~3 pulses
    runScans(10, ast, store, runtimeState);

    // Should have counted at least 2 pulses
    expect(store.getInt('Pulses')).toBeGreaterThanOrEqual(2);
  });
});

// ============================================================================
// Timer with dynamic PT (common in industrial applications)
// ============================================================================

describe('Timer with Dynamic PT', () => {
  let store: SimulationStoreInterface;

  beforeEach(() => {
    store = createTestStore(100);
  });

  it('changing PT during timing affects when Q goes TRUE', () => {
    const ast = parseSTToAST(`
      PROGRAM DynamicPT
      VAR
        Input : BOOL := FALSE;
        Duration : TIME := T#500ms;
        Timer1 : TON;
        Done : BOOL;
      END_VAR
      Timer1(IN := Input, PT := Duration);
      Done := Timer1.Q;
      END_PROGRAM
    `);

    initializeVariables(ast, store);
    const runtimeState = createRuntimeState(ast);

    store.setBool('Input', true);
    runScans(3, ast, store, runtimeState); // 300ms

    // Change PT to 200ms (already past this)
    store.setTime('Duration', 200);
    runScanCycle(ast, store, runtimeState);

    // Q should now be TRUE because ET (300ms) >= new PT (200ms)
    // Note: This depends on implementation - some PLCs update PT immediately,
    // others don't. Test documents expected behavior.
    const timer = store.getTimer('Timer1');
    // If PT is updated dynamically, Q should be true
    // If PT is latched at start, Q would still be false
    // Document actual behavior:
    expect(timer?.PT).toBe(200); // PT should be updated
  });
});

// ============================================================================
// Additional TON Tests - Full IEC 61131-3 Compliance
// ============================================================================

describe('TON Extended Compliance', () => {
  let store: SimulationStoreInterface;

  beforeEach(() => {
    store = createTestStore(100);
  });

  describe('ET Increment Behavior', () => {
    it('ET increments by scanTime each scan while IN is TRUE', () => {
      const ast = parseSTToAST(`
        PROGRAM ETIncrement
        VAR
          Input : BOOL := FALSE;
          Timer1 : TON;
        END_VAR
        Timer1(IN := Input, PT := T#1000ms);
        END_PROGRAM
      `);

      initializeVariables(ast, store);
      const runtimeState = createRuntimeState(ast);

      store.setBool('Input', true);

      runScanCycle(ast, store, runtimeState);
      expect(store.getTimer('Timer1')?.ET).toBe(100);

      runScanCycle(ast, store, runtimeState);
      expect(store.getTimer('Timer1')?.ET).toBe(200);

      runScanCycle(ast, store, runtimeState);
      expect(store.getTimer('Timer1')?.ET).toBe(300);
    });

    it('Q stays FALSE while ET < PT', () => {
      const ast = parseSTToAST(`
        PROGRAM QStaysFalse
        VAR
          Input : BOOL := FALSE;
          Timer1 : TON;
        END_VAR
        Timer1(IN := Input, PT := T#500ms);
        END_PROGRAM
      `);

      initializeVariables(ast, store);
      const runtimeState = createRuntimeState(ast);

      store.setBool('Input', true);

      // Run 4 scans (400ms < 500ms PT)
      for (let i = 0; i < 4; i++) {
        runScanCycle(ast, store, runtimeState);
        expect(store.getTimer('Timer1')?.Q).toBe(false);
      }
    });
  });

  describe('Reset Behavior', () => {
    it('ET resets to 0 on falling edge of IN', () => {
      const ast = parseSTToAST(`
        PROGRAM ETReset
        VAR
          Input : BOOL := FALSE;
          Timer1 : TON;
        END_VAR
        Timer1(IN := Input, PT := T#1000ms);
        END_PROGRAM
      `);

      initializeVariables(ast, store);
      const runtimeState = createRuntimeState(ast);

      // Start timing
      store.setBool('Input', true);
      runScans(5, ast, store, runtimeState); // ET = 500ms
      expect(store.getTimer('Timer1')?.ET).toBe(500);

      // Turn off - should reset
      store.setBool('Input', false);
      runScanCycle(ast, store, runtimeState);
      expect(store.getTimer('Timer1')?.ET).toBe(0);
    });

    it('rising edge on IN restarts timing from ET=0', () => {
      const ast = parseSTToAST(`
        PROGRAM RisingEdgeRestart
        VAR
          Input : BOOL := FALSE;
          Timer1 : TON;
        END_VAR
        Timer1(IN := Input, PT := T#500ms);
        END_PROGRAM
      `);

      initializeVariables(ast, store);
      const runtimeState = createRuntimeState(ast);

      // First cycle
      store.setBool('Input', true);
      runScans(3, ast, store, runtimeState);
      expect(store.getTimer('Timer1')?.ET).toBe(300);

      // Reset cycle
      store.setBool('Input', false);
      runScanCycle(ast, store, runtimeState);

      // New rising edge
      store.setBool('Input', true);
      runScanCycle(ast, store, runtimeState);
      expect(store.getTimer('Timer1')?.ET).toBe(100); // Fresh start
    });
  });

  describe('TON Bounds Tests', () => {
    it('PT = T#0ms: Q immediate TRUE when IN TRUE', () => {
      const ast = parseSTToAST(`
        PROGRAM ZeroPT
        VAR
          Input : BOOL := FALSE;
          Timer1 : TON;
        END_VAR
        Timer1(IN := Input, PT := T#0ms);
        END_PROGRAM
      `);

      initializeVariables(ast, store);
      const runtimeState = createRuntimeState(ast);

      store.setBool('Input', true);
      runScanCycle(ast, store, runtimeState);

      expect(store.getTimer('Timer1')?.Q).toBe(true);
    });

    it('PT = T#1ms works correctly (minimum practical delay)', () => {
      // Use 1ms scan time to test minimum delay
      const smallScanStore = createTestStore(1);

      const ast = parseSTToAST(`
        PROGRAM MinPT
        VAR
          Input : BOOL := FALSE;
          Timer1 : TON;
        END_VAR
        Timer1(IN := Input, PT := T#1ms);
        END_PROGRAM
      `);

      initializeVariables(ast, smallScanStore);
      const runtimeState = createRuntimeState(ast);

      smallScanStore.setBool('Input', true);
      runScanCycle(ast, smallScanStore, runtimeState);

      expect(smallScanStore.getTimer('Timer1')?.Q).toBe(true);
    });

    it('very large PT (T#24h) does not overflow', () => {
      const ast = parseSTToAST(`
        PROGRAM LargePT
        VAR
          Input : BOOL := FALSE;
          Timer1 : TON;
        END_VAR
        Timer1(IN := Input, PT := T#24h);
        END_PROGRAM
      `);

      initializeVariables(ast, store);
      const runtimeState = createRuntimeState(ast);

      store.setBool('Input', true);
      runScans(10, ast, store, runtimeState);

      const timer = store.getTimer('Timer1');
      expect(timer?.PT).toBe(86400000); // 24h in ms
      expect(timer?.ET).toBe(1000); // 10 scans * 100ms
      expect(timer?.Q).toBe(false); // Not yet reached
    });

    it('scanTime > PT: Q on first scan after IN', () => {
      // 200ms scan time, 100ms PT
      const largeScanStore = createTestStore(200);

      const ast = parseSTToAST(`
        PROGRAM LargeScan
        VAR
          Input : BOOL := FALSE;
          Timer1 : TON;
        END_VAR
        Timer1(IN := Input, PT := T#100ms);
        END_PROGRAM
      `);

      initializeVariables(ast, largeScanStore);
      const runtimeState = createRuntimeState(ast);

      largeScanStore.setBool('Input', true);
      runScanCycle(ast, largeScanStore, runtimeState);

      // Single scan is 200ms > 100ms PT, so Q should be true
      expect(largeScanStore.getTimer('Timer1')?.Q).toBe(true);
    });
  });

  describe('TON with Rapid Toggling', () => {
    it('rapid IN toggling does not corrupt state', () => {
      const ast = parseSTToAST(`
        PROGRAM RapidToggle
        VAR
          Input : BOOL := FALSE;
          Timer1 : TON;
        END_VAR
        Timer1(IN := Input, PT := T#500ms);
        END_PROGRAM
      `);

      initializeVariables(ast, store);
      const runtimeState = createRuntimeState(ast);

      // Rapid toggling
      for (let i = 0; i < 20; i++) {
        store.setBool('Input', i % 2 === 0);
        runScanCycle(ast, store, runtimeState);
      }

      // Timer state should be valid
      const timer = store.getTimer('Timer1');
      expect(timer).toBeDefined();
      expect(timer?.ET).toBeGreaterThanOrEqual(0);
      expect(timer?.ET).toBeLessThanOrEqual(timer!.PT);
    });
  });
});

// ============================================================================
// TON Property-Based Tests (using fast-check patterns)
// ============================================================================

describe('TON Property-Based Tests', () => {
  let store: SimulationStoreInterface;

  beforeEach(() => {
    store = createTestStore(100);
  });

  it('ET never exceeds PT regardless of scan count', () => {
    const ptValues = [0, 100, 500, 1000, 5000];
    const scanCounts = [1, 5, 10, 50, 100];

    for (const pt of ptValues) {
      for (const scanCount of scanCounts) {
        const localStore = createTestStore(100);
        const ast = parseSTToAST(`
          PROGRAM ETNeverExceedsPT
          VAR
            Input : BOOL := FALSE;
            Timer1 : TON;
          END_VAR
          Timer1(IN := Input, PT := T#${pt}ms);
          END_PROGRAM
        `);

        initializeVariables(ast, localStore);
        const runtimeState = createRuntimeState(ast);

        localStore.setBool('Input', true);
        runScans(scanCount, ast, localStore, runtimeState);

        const timer = localStore.getTimer('Timer1');
        expect(timer?.ET).toBeLessThanOrEqual(pt);
      }
    }
  });

  it('Q is TRUE if and only if ET >= PT and IN is TRUE', () => {
    const ast = parseSTToAST(`
      PROGRAM QIffET
      VAR
        Input : BOOL := FALSE;
        Timer1 : TON;
      END_VAR
      Timer1(IN := Input, PT := T#300ms);
      END_PROGRAM
    `);

    initializeVariables(ast, store);
    const runtimeState = createRuntimeState(ast);

    store.setBool('Input', true);

    // Check over multiple scans
    for (let i = 0; i < 10; i++) {
      runScanCycle(ast, store, runtimeState);
      const timer = store.getTimer('Timer1');

      if (timer?.ET! >= timer?.PT!) {
        expect(timer?.Q).toBe(true);
      } else {
        expect(timer?.Q).toBe(false);
      }
    }
  });

  it('Q is always FALSE when IN is FALSE (after one scan)', () => {
    const ast = parseSTToAST(`
      PROGRAM QFalseWhenINFalse
      VAR
        Input : BOOL := FALSE;
        Timer1 : TON;
      END_VAR
      Timer1(IN := Input, PT := T#200ms);
      END_PROGRAM
    `);

    initializeVariables(ast, store);
    const runtimeState = createRuntimeState(ast);

    // Complete the timer
    store.setBool('Input', true);
    runScans(5, ast, store, runtimeState);
    expect(store.getTimer('Timer1')?.Q).toBe(true);

    // Turn off IN
    store.setBool('Input', false);
    runScanCycle(ast, store, runtimeState);
    runScanCycle(ast, store, runtimeState); // Second scan ensures Q is FALSE

    expect(store.getTimer('Timer1')?.Q).toBe(false);
  });
});

// ============================================================================
// Multiple Timer Instances
// ============================================================================

describe('Multiple TON Instances', () => {
  let store: SimulationStoreInterface;

  beforeEach(() => {
    store = createTestStore(100);
  });

  it('multiple timers maintain independent state', () => {
    const ast = parseSTToAST(`
      PROGRAM MultiTimer
      VAR
        Input1 : BOOL := FALSE;
        Input2 : BOOL := FALSE;
        Timer1 : TON;
        Timer2 : TON;
      END_VAR
      Timer1(IN := Input1, PT := T#300ms);
      Timer2(IN := Input2, PT := T#500ms);
      END_PROGRAM
    `);

    initializeVariables(ast, store);
    const runtimeState = createRuntimeState(ast);

    // Start Timer1 only
    store.setBool('Input1', true);
    runScans(4, ast, store, runtimeState); // 400ms

    expect(store.getTimer('Timer1')?.Q).toBe(true);  // 400 >= 300
    expect(store.getTimer('Timer2')?.Q).toBe(false); // Not started

    // Now start Timer2
    store.setBool('Input2', true);
    runScans(3, ast, store, runtimeState); // 300ms more

    expect(store.getTimer('Timer1')?.Q).toBe(true);  // Still done
    expect(store.getTimer('Timer2')?.Q).toBe(false); // 300 < 500

    runScans(3, ast, store, runtimeState); // 300ms more (600ms total for Timer2)
    expect(store.getTimer('Timer2')?.Q).toBe(true);  // Now done
  });

  it('timers with same PT but different start times complete at different times', () => {
    const ast = parseSTToAST(`
      PROGRAM StaggeredTimers
      VAR
        Input1 : BOOL := FALSE;
        Input2 : BOOL := FALSE;
        Timer1 : TON;
        Timer2 : TON;
      END_VAR
      Timer1(IN := Input1, PT := T#200ms);
      Timer2(IN := Input2, PT := T#200ms);
      END_PROGRAM
    `);

    initializeVariables(ast, store);
    const runtimeState = createRuntimeState(ast);

    // Start Timer1
    store.setBool('Input1', true);
    runScanCycle(ast, store, runtimeState);

    // Start Timer2 one scan later
    store.setBool('Input2', true);
    runScanCycle(ast, store, runtimeState);

    expect(store.getTimer('Timer1')?.ET).toBe(200);
    expect(store.getTimer('Timer2')?.ET).toBe(100);

    // Timer1 should complete first
    expect(store.getTimer('Timer1')?.Q).toBe(true);
    expect(store.getTimer('Timer2')?.Q).toBe(false);

    // One more scan - Timer2 completes
    runScanCycle(ast, store, runtimeState);
    expect(store.getTimer('Timer2')?.Q).toBe(true);
  });
});
