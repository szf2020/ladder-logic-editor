/**
 * IEC 61131-3 Bistable Compliance Tests
 *
 * Tests SR (Set Dominant) and RS (Reset Dominant) behavior against the IEC 61131-3 standard (Section 2.5.4).
 * Bistables are latching elements that maintain their state until actively changed.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { type SimulationStoreInterface } from '../execution-context';

// ============================================================================
// Bistable State (IEC 61131-3)
// ============================================================================

interface BistableState {
  Q1: boolean;   // Output state
}

// ============================================================================
// Test Store Factory
// ============================================================================

function createTestStore(scanTime: number = 100): SimulationStoreInterface {
  const store = {
    booleans: {} as Record<string, boolean>,
    integers: {} as Record<string, number>,
    reals: {} as Record<string, number>,
    times: {} as Record<string, number>,
    timers: {} as Record<string, { IN: boolean; PT: number; Q: boolean; ET: number; running: boolean }>,
    counters: {} as Record<string, { CU: boolean; CD: boolean; R: boolean; LD: boolean; PV: number; QU: boolean; QD: boolean; CV: number }>,
    edgeDetectors: {} as Record<string, { CLK: boolean; Q: boolean; M: boolean }>,
    bistables: {} as Record<string, BistableState>,
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
      timer.IN = input;
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

    // Edge detector operations
    initEdgeDetector: (name: string) => {
      store.edgeDetectors[name] = { CLK: false, Q: false, M: false };
    },
    getEdgeDetector: (name: string) => store.edgeDetectors[name],
    updateRTrig: (name: string, clk: boolean) => {
      let ed = store.edgeDetectors[name];
      if (!ed) {
        store.edgeDetectors[name] = { CLK: false, Q: false, M: false };
        ed = store.edgeDetectors[name];
      }
      ed.Q = clk && !ed.M;
      ed.M = clk;
      ed.CLK = clk;
    },
    updateFTrig: (name: string, clk: boolean) => {
      let ed = store.edgeDetectors[name];
      if (!ed) {
        store.edgeDetectors[name] = { CLK: false, Q: false, M: false };
        ed = store.edgeDetectors[name];
      }
      ed.Q = !clk && ed.M;
      ed.M = clk;
      ed.CLK = clk;
    },

    // Bistable operations
    initBistable: (name: string) => {
      store.bistables[name] = { Q1: false };
    },
    getBistable: (name: string) => store.bistables[name],
    updateSR: (name: string, s1: boolean, r: boolean) => {
      let bs = store.bistables[name];
      if (!bs) {
        store.bistables[name] = { Q1: false };
        bs = store.bistables[name];
      }
      // SR (Set Dominant): S1 wins if both active
      if (s1) {
        bs.Q1 = true;
      } else if (r) {
        bs.Q1 = false;
      }
      // else: maintain current state
    },
    updateRS: (name: string, s: boolean, r1: boolean) => {
      let bs = store.bistables[name];
      if (!bs) {
        store.bistables[name] = { Q1: false };
        bs = store.bistables[name];
      }
      // RS (Reset Dominant): R1 wins if both active
      if (r1) {
        bs.Q1 = false;
      } else if (s) {
        bs.Q1 = true;
      }
      // else: maintain current state
    },

    clearAll: () => {
      store.booleans = {};
      store.integers = {};
      store.reals = {};
      store.times = {};
      store.timers = {};
      store.counters = {};
      store.edgeDetectors = {};
      store.bistables = {};
    },
  });

  return store;
}

// ============================================================================
// SR Bistable (Set Dominant) - IEC 61131-3 Section 2.5.4
// ============================================================================

describe('SR Bistable Compliance (IEC 61131-3)', () => {
  let store: SimulationStoreInterface;

  beforeEach(() => {
    store = createTestStore(100);
  });

  describe('Basic SR Behavior', () => {
    it('initially Q1 is FALSE', () => {
      store.initBistable('Latch');
      expect(store.getBistable('Latch')?.Q1).toBe(false);
    });

    it('S1=TRUE sets Q1 to TRUE', () => {
      store.initBistable('Latch');

      store.updateSR('Latch', true, false);
      expect(store.getBistable('Latch')?.Q1).toBe(true);
    });

    it('R=TRUE resets Q1 to FALSE (when S1=FALSE)', () => {
      store.initBistable('Latch');

      // Set first
      store.updateSR('Latch', true, false);
      expect(store.getBistable('Latch')?.Q1).toBe(true);

      // Reset
      store.updateSR('Latch', false, true);
      expect(store.getBistable('Latch')?.Q1).toBe(false);
    });

    it('Q1 holds state when both S1 and R are FALSE', () => {
      store.initBistable('Latch');

      // Set to TRUE
      store.updateSR('Latch', true, false);
      expect(store.getBistable('Latch')?.Q1).toBe(true);

      // Both FALSE - should stay TRUE
      store.updateSR('Latch', false, false);
      expect(store.getBistable('Latch')?.Q1).toBe(true);

      // Still FALSE - should stay TRUE
      store.updateSR('Latch', false, false);
      expect(store.getBistable('Latch')?.Q1).toBe(true);
    });

    it('S1 dominates when both S1 and R are TRUE (Set Dominant)', () => {
      store.initBistable('Latch');

      // Start with Q1=FALSE
      expect(store.getBistable('Latch')?.Q1).toBe(false);

      // Both TRUE - S1 wins, Q1 becomes TRUE
      store.updateSR('Latch', true, true);
      expect(store.getBistable('Latch')?.Q1).toBe(true);
    });

    it('S1 keeps Q1 TRUE even when R is also TRUE', () => {
      store.initBistable('Latch');

      // Set Q1 to TRUE first
      store.updateSR('Latch', true, false);
      expect(store.getBistable('Latch')?.Q1).toBe(true);

      // Both TRUE - S1 dominates, stays TRUE
      store.updateSR('Latch', true, true);
      expect(store.getBistable('Latch')?.Q1).toBe(true);
    });
  });

  describe('SR State Transitions', () => {
    it('transitions: FALSE → TRUE via S1', () => {
      store.initBistable('Latch');

      expect(store.getBistable('Latch')?.Q1).toBe(false);
      store.updateSR('Latch', true, false);
      expect(store.getBistable('Latch')?.Q1).toBe(true);
    });

    it('transitions: TRUE → FALSE via R', () => {
      store.initBistable('Latch');

      store.updateSR('Latch', true, false);  // Set
      expect(store.getBistable('Latch')?.Q1).toBe(true);

      store.updateSR('Latch', false, true);  // Reset
      expect(store.getBistable('Latch')?.Q1).toBe(false);
    });

    it('multiple set/reset cycles work correctly', () => {
      store.initBistable('Latch');

      // Cycle 1
      store.updateSR('Latch', true, false);
      expect(store.getBistable('Latch')?.Q1).toBe(true);
      store.updateSR('Latch', false, true);
      expect(store.getBistable('Latch')?.Q1).toBe(false);

      // Cycle 2
      store.updateSR('Latch', true, false);
      expect(store.getBistable('Latch')?.Q1).toBe(true);
      store.updateSR('Latch', false, true);
      expect(store.getBistable('Latch')?.Q1).toBe(false);

      // Cycle 3
      store.updateSR('Latch', true, false);
      expect(store.getBistable('Latch')?.Q1).toBe(true);
    });
  });

  describe('SR Multiple Instances', () => {
    it('multiple SR instances maintain separate state', () => {
      store.initBistable('Latch1');
      store.initBistable('Latch2');

      // Set only Latch1
      store.updateSR('Latch1', true, false);
      expect(store.getBistable('Latch1')?.Q1).toBe(true);
      expect(store.getBistable('Latch2')?.Q1).toBe(false);

      // Set Latch2, reset Latch1
      store.updateSR('Latch1', false, true);
      store.updateSR('Latch2', true, false);
      expect(store.getBistable('Latch1')?.Q1).toBe(false);
      expect(store.getBistable('Latch2')?.Q1).toBe(true);
    });
  });
});

// ============================================================================
// RS Bistable (Reset Dominant) - IEC 61131-3 Section 2.5.4
// ============================================================================

describe('RS Bistable Compliance (IEC 61131-3)', () => {
  let store: SimulationStoreInterface;

  beforeEach(() => {
    store = createTestStore(100);
  });

  describe('Basic RS Behavior', () => {
    it('initially Q1 is FALSE', () => {
      store.initBistable('Latch');
      expect(store.getBistable('Latch')?.Q1).toBe(false);
    });

    it('S=TRUE sets Q1 to TRUE (when R1=FALSE)', () => {
      store.initBistable('Latch');

      store.updateRS('Latch', true, false);
      expect(store.getBistable('Latch')?.Q1).toBe(true);
    });

    it('R1=TRUE resets Q1 to FALSE', () => {
      store.initBistable('Latch');

      // Set first
      store.updateRS('Latch', true, false);
      expect(store.getBistable('Latch')?.Q1).toBe(true);

      // Reset with R1
      store.updateRS('Latch', false, true);
      expect(store.getBistable('Latch')?.Q1).toBe(false);
    });

    it('Q1 holds state when both S and R1 are FALSE', () => {
      store.initBistable('Latch');

      // Set to TRUE
      store.updateRS('Latch', true, false);
      expect(store.getBistable('Latch')?.Q1).toBe(true);

      // Both FALSE - should stay TRUE
      store.updateRS('Latch', false, false);
      expect(store.getBistable('Latch')?.Q1).toBe(true);

      // Still FALSE - should stay TRUE
      store.updateRS('Latch', false, false);
      expect(store.getBistable('Latch')?.Q1).toBe(true);
    });

    it('R1 dominates when both S and R1 are TRUE (Reset Dominant)', () => {
      store.initBistable('Latch');

      // Set Q1 to TRUE first
      store.updateRS('Latch', true, false);
      expect(store.getBistable('Latch')?.Q1).toBe(true);

      // Both TRUE - R1 wins, Q1 becomes FALSE
      store.updateRS('Latch', true, true);
      expect(store.getBistable('Latch')?.Q1).toBe(false);
    });

    it('R1 resets Q1 to FALSE even when S is also TRUE', () => {
      store.initBistable('Latch');

      // Try to set when R1 is also TRUE
      store.updateRS('Latch', true, true);
      expect(store.getBistable('Latch')?.Q1).toBe(false);  // R1 dominates
    });
  });

  describe('RS State Transitions', () => {
    it('transitions: FALSE → TRUE via S', () => {
      store.initBistable('Latch');

      expect(store.getBistable('Latch')?.Q1).toBe(false);
      store.updateRS('Latch', true, false);
      expect(store.getBistable('Latch')?.Q1).toBe(true);
    });

    it('transitions: TRUE → FALSE via R1', () => {
      store.initBistable('Latch');

      store.updateRS('Latch', true, false);  // Set
      expect(store.getBistable('Latch')?.Q1).toBe(true);

      store.updateRS('Latch', false, true);  // Reset
      expect(store.getBistable('Latch')?.Q1).toBe(false);
    });

    it('multiple set/reset cycles work correctly', () => {
      store.initBistable('Latch');

      // Cycle 1
      store.updateRS('Latch', true, false);
      expect(store.getBistable('Latch')?.Q1).toBe(true);
      store.updateRS('Latch', false, true);
      expect(store.getBistable('Latch')?.Q1).toBe(false);

      // Cycle 2
      store.updateRS('Latch', true, false);
      expect(store.getBistable('Latch')?.Q1).toBe(true);
      store.updateRS('Latch', false, true);
      expect(store.getBistable('Latch')?.Q1).toBe(false);

      // Cycle 3
      store.updateRS('Latch', true, false);
      expect(store.getBistable('Latch')?.Q1).toBe(true);
    });
  });

  describe('RS Multiple Instances', () => {
    it('multiple RS instances maintain separate state', () => {
      store.initBistable('Latch1');
      store.initBistable('Latch2');

      // Set only Latch1
      store.updateRS('Latch1', true, false);
      expect(store.getBistable('Latch1')?.Q1).toBe(true);
      expect(store.getBistable('Latch2')?.Q1).toBe(false);

      // Set Latch2, reset Latch1
      store.updateRS('Latch1', false, true);
      store.updateRS('Latch2', true, false);
      expect(store.getBistable('Latch1')?.Q1).toBe(false);
      expect(store.getBistable('Latch2')?.Q1).toBe(true);
    });
  });
});

// ============================================================================
// SR vs RS Comparison
// ============================================================================

describe('SR vs RS Dominance Comparison', () => {
  let store: SimulationStoreInterface;

  beforeEach(() => {
    store = createTestStore(100);
  });

  it('SR and RS behave differently when both inputs are TRUE', () => {
    store.initBistable('SR_Latch');
    store.initBistable('RS_Latch');

    // Both inputs TRUE
    store.updateSR('SR_Latch', true, true);
    store.updateRS('RS_Latch', true, true);

    // SR is Set Dominant - Q1 is TRUE
    expect(store.getBistable('SR_Latch')?.Q1).toBe(true);
    // RS is Reset Dominant - Q1 is FALSE
    expect(store.getBistable('RS_Latch')?.Q1).toBe(false);
  });

  it('SR and RS behave the same when only one input is TRUE', () => {
    store.initBistable('SR_Latch');
    store.initBistable('RS_Latch');

    // Only Set
    store.updateSR('SR_Latch', true, false);
    store.updateRS('RS_Latch', true, false);
    expect(store.getBistable('SR_Latch')?.Q1).toBe(true);
    expect(store.getBistable('RS_Latch')?.Q1).toBe(true);

    // Only Reset
    store.updateSR('SR_Latch', false, true);
    store.updateRS('RS_Latch', false, true);
    expect(store.getBistable('SR_Latch')?.Q1).toBe(false);
    expect(store.getBistable('RS_Latch')?.Q1).toBe(false);
  });
});

// ============================================================================
// Property-Based Tests
// ============================================================================

describe('Bistable Property-Based Tests', () => {
  it('SR: S1=TRUE always results in Q1=TRUE', () => {
    fc.assert(fc.property(
      fc.boolean(),  // Initial state doesn't matter when S1=TRUE
      fc.boolean(),  // R value
      (initialState, r) => {
        const store = createTestStore(100);
        store.initBistable('Test');

        // Set initial state
        if (initialState) {
          store.updateSR('Test', true, false);
        }

        // Apply S1=TRUE with any R
        store.updateSR('Test', true, r);

        // S1 dominates, so Q1 should be TRUE
        return store.getBistable('Test')?.Q1 === true;
      }
    ), { numRuns: 100 });
  });

  it('RS: R1=TRUE always results in Q1=FALSE', () => {
    fc.assert(fc.property(
      fc.boolean(),  // Initial state
      fc.boolean(),  // S value
      (initialState, s) => {
        const store = createTestStore(100);
        store.initBistable('Test');

        // Set initial state
        if (initialState) {
          store.updateRS('Test', true, false);
        }

        // Apply R1=TRUE with any S
        store.updateRS('Test', s, true);

        // R1 dominates, so Q1 should be FALSE
        return store.getBistable('Test')?.Q1 === false;
      }
    ), { numRuns: 100 });
  });

  it('Both SR and RS: state is preserved when both inputs are FALSE', () => {
    fc.assert(fc.property(
      fc.boolean(),
      (initialState) => {
        const srStore = createTestStore(100);
        const rsStore = createTestStore(100);
        srStore.initBistable('Test');
        rsStore.initBistable('Test');

        // Set initial state
        if (initialState) {
          srStore.updateSR('Test', true, false);
          rsStore.updateRS('Test', true, false);
        }

        const srBefore = srStore.getBistable('Test')?.Q1;
        const rsBefore = rsStore.getBistable('Test')?.Q1;

        // Apply both=FALSE
        srStore.updateSR('Test', false, false);
        rsStore.updateRS('Test', false, false);

        // State should be preserved
        return srStore.getBistable('Test')?.Q1 === srBefore &&
               rsStore.getBistable('Test')?.Q1 === rsBefore;
      }
    ), { numRuns: 100 });
  });

  it('Bistable sequence maintains consistency', () => {
    fc.assert(fc.property(
      fc.array(fc.tuple(fc.boolean(), fc.boolean()), { minLength: 1, maxLength: 50 }),
      (inputSequence) => {
        const srStore = createTestStore(100);
        const rsStore = createTestStore(100);
        srStore.initBistable('Test');
        rsStore.initBistable('Test');

        for (const [s, r] of inputSequence) {
          srStore.updateSR('Test', s, r);
          rsStore.updateRS('Test', s, r);
        }

        // Both should have valid boolean states
        const srQ1 = srStore.getBistable('Test')?.Q1;
        const rsQ1 = rsStore.getBistable('Test')?.Q1;

        return typeof srQ1 === 'boolean' && typeof rsQ1 === 'boolean';
      }
    ), { numRuns: 100 });
  });
});
