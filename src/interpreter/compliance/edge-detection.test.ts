/**
 * IEC 61131-3 Edge Detection Compliance Tests
 *
 * Tests R_TRIG and F_TRIG behavior against the IEC 61131-3 standard (Section 2.5.3).
 * Edge detection function blocks detect transitions (edges) in boolean signals.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { type SimulationStoreInterface } from '../execution-context';

// ============================================================================
// Edge Detector State (IEC 61131-3)
// ============================================================================

interface EdgeDetectorState {
  CLK: boolean;   // Current input
  Q: boolean;     // Output (single-scan pulse)
  M: boolean;     // Memory (previous CLK value)
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
    edgeDetectors: {} as Record<string, EdgeDetectorState>,
    bistables: {} as Record<string, { Q1: boolean }>,
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
      // R_TRIG: Q = CLK AND NOT M (rising edge: current TRUE and previous FALSE)
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
      // F_TRIG: Q = NOT CLK AND M (falling edge: current FALSE and previous TRUE)
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
// R_TRIG (Rising Edge Trigger) - IEC 61131-3 Section 2.5.3
// ============================================================================

describe('R_TRIG Compliance (IEC 61131-3)', () => {
  let store: SimulationStoreInterface;

  beforeEach(() => {
    store = createTestStore(100);
  });

  describe('Basic R_TRIG Behavior', () => {
    it('Q is FALSE when CLK is FALSE', () => {
      store.initEdgeDetector('RisingEdge');

      // CLK stays FALSE
      store.updateRTrig('RisingEdge', false);
      expect(store.getEdgeDetector('RisingEdge')?.Q).toBe(false);

      // Still FALSE on next scan
      store.updateRTrig('RisingEdge', false);
      expect(store.getEdgeDetector('RisingEdge')?.Q).toBe(false);
    });

    it('Q is FALSE when CLK stays TRUE (no edge)', () => {
      store.initEdgeDetector('RisingEdge');

      // First TRUE - rising edge detected
      store.updateRTrig('RisingEdge', true);
      expect(store.getEdgeDetector('RisingEdge')?.Q).toBe(true);

      // CLK stays TRUE - no longer rising edge
      store.updateRTrig('RisingEdge', true);
      expect(store.getEdgeDetector('RisingEdge')?.Q).toBe(false);

      // Still TRUE - still no edge
      store.updateRTrig('RisingEdge', true);
      expect(store.getEdgeDetector('RisingEdge')?.Q).toBe(false);
    });

    it('Q is TRUE for exactly one scan when CLK goes FALSE → TRUE', () => {
      store.initEdgeDetector('RisingEdge');

      // Start with FALSE
      store.updateRTrig('RisingEdge', false);
      expect(store.getEdgeDetector('RisingEdge')?.Q).toBe(false);

      // Rising edge: FALSE → TRUE
      store.updateRTrig('RisingEdge', true);
      expect(store.getEdgeDetector('RisingEdge')?.Q).toBe(true);

      // Next scan: Q returns to FALSE even though CLK still TRUE
      store.updateRTrig('RisingEdge', true);
      expect(store.getEdgeDetector('RisingEdge')?.Q).toBe(false);
    });

    it('initial state: first TRUE is detected as rising edge', () => {
      store.initEdgeDetector('RisingEdge');

      // M starts as FALSE, so first TRUE counts as rising edge
      store.updateRTrig('RisingEdge', true);
      expect(store.getEdgeDetector('RisingEdge')?.Q).toBe(true);
    });
  });

  describe('R_TRIG Edge Sequences', () => {
    it('multiple rising edges detected correctly', () => {
      store.initEdgeDetector('RisingEdge');
      let pulseCount = 0;

      // Sequence: FALSE, TRUE, FALSE, TRUE, FALSE, TRUE
      const sequence = [false, true, false, true, false, true];

      for (const clk of sequence) {
        store.updateRTrig('RisingEdge', clk);
        if (store.getEdgeDetector('RisingEdge')?.Q) {
          pulseCount++;
        }
      }

      // Should detect 3 rising edges
      expect(pulseCount).toBe(3);
    });

    it('rapid toggle FALSE → TRUE → FALSE → TRUE detects 2 edges', () => {
      store.initEdgeDetector('RisingEdge');
      let pulseCount = 0;

      // Start with FALSE
      store.updateRTrig('RisingEdge', false);

      // First rising edge
      store.updateRTrig('RisingEdge', true);
      if (store.getEdgeDetector('RisingEdge')?.Q) pulseCount++;

      // Fall
      store.updateRTrig('RisingEdge', false);
      if (store.getEdgeDetector('RisingEdge')?.Q) pulseCount++;

      // Second rising edge
      store.updateRTrig('RisingEdge', true);
      if (store.getEdgeDetector('RisingEdge')?.Q) pulseCount++;

      expect(pulseCount).toBe(2);
    });
  });

  describe('R_TRIG State Persistence', () => {
    it('previous value survives across multiple scans', () => {
      store.initEdgeDetector('RisingEdge');

      // Set to TRUE
      store.updateRTrig('RisingEdge', true);
      expect(store.getEdgeDetector('RisingEdge')?.M).toBe(true);

      // Multiple scans with TRUE - M should stay TRUE
      for (let i = 0; i < 5; i++) {
        store.updateRTrig('RisingEdge', true);
        expect(store.getEdgeDetector('RisingEdge')?.M).toBe(true);
      }
    });

    it('multiple instances maintain separate state', () => {
      store.initEdgeDetector('Edge1');
      store.initEdgeDetector('Edge2');

      // Set Edge1 to TRUE (rising edge)
      store.updateRTrig('Edge1', true);
      expect(store.getEdgeDetector('Edge1')?.Q).toBe(true);
      expect(store.getEdgeDetector('Edge2')?.Q).toBe(false);

      // Update Edge1 again (stay TRUE) - Q should now be FALSE
      store.updateRTrig('Edge1', true);
      expect(store.getEdgeDetector('Edge1')?.Q).toBe(false);

      // Set Edge2 to TRUE (rising edge) - Edge2 should detect it, Edge1 unaffected
      store.updateRTrig('Edge2', true);
      expect(store.getEdgeDetector('Edge1')?.Q).toBe(false); // Edge1 unchanged
      expect(store.getEdgeDetector('Edge2')?.Q).toBe(true);   // Edge2 detects rising edge

      // Verify both have M=TRUE
      expect(store.getEdgeDetector('Edge1')?.M).toBe(true);
      expect(store.getEdgeDetector('Edge2')?.M).toBe(true);
    });
  });
});

// ============================================================================
// F_TRIG (Falling Edge Trigger) - IEC 61131-3 Section 2.5.3
// ============================================================================

describe('F_TRIG Compliance (IEC 61131-3)', () => {
  let store: SimulationStoreInterface;

  beforeEach(() => {
    store = createTestStore(100);
  });

  describe('Basic F_TRIG Behavior', () => {
    it('Q is FALSE when CLK is TRUE', () => {
      store.initEdgeDetector('FallingEdge');

      // Start with TRUE (no falling edge from FALSE initial)
      store.updateFTrig('FallingEdge', true);
      expect(store.getEdgeDetector('FallingEdge')?.Q).toBe(false);

      // Still TRUE on next scan
      store.updateFTrig('FallingEdge', true);
      expect(store.getEdgeDetector('FallingEdge')?.Q).toBe(false);
    });

    it('Q is FALSE when CLK stays FALSE (no edge)', () => {
      store.initEdgeDetector('FallingEdge');

      // Start with FALSE (M=FALSE, so no falling edge)
      store.updateFTrig('FallingEdge', false);
      expect(store.getEdgeDetector('FallingEdge')?.Q).toBe(false);

      // CLK stays FALSE - still no edge
      store.updateFTrig('FallingEdge', false);
      expect(store.getEdgeDetector('FallingEdge')?.Q).toBe(false);
    });

    it('Q is TRUE for exactly one scan when CLK goes TRUE → FALSE', () => {
      store.initEdgeDetector('FallingEdge');

      // Set M to TRUE first
      store.updateFTrig('FallingEdge', true);
      expect(store.getEdgeDetector('FallingEdge')?.Q).toBe(false);

      // Falling edge: TRUE → FALSE
      store.updateFTrig('FallingEdge', false);
      expect(store.getEdgeDetector('FallingEdge')?.Q).toBe(true);

      // Next scan: Q returns to FALSE
      store.updateFTrig('FallingEdge', false);
      expect(store.getEdgeDetector('FallingEdge')?.Q).toBe(false);
    });

    it('initial state: FALSE startup does NOT count as falling edge', () => {
      store.initEdgeDetector('FallingEdge');

      // M starts as FALSE, so first FALSE is NOT a falling edge (no transition from TRUE)
      store.updateFTrig('FallingEdge', false);
      expect(store.getEdgeDetector('FallingEdge')?.Q).toBe(false);
    });
  });

  describe('F_TRIG Edge Sequences', () => {
    it('multiple falling edges detected correctly', () => {
      store.initEdgeDetector('FallingEdge');
      let pulseCount = 0;

      // Sequence: TRUE, FALSE, TRUE, FALSE, TRUE, FALSE
      const sequence = [true, false, true, false, true, false];

      for (const clk of sequence) {
        store.updateFTrig('FallingEdge', clk);
        if (store.getEdgeDetector('FallingEdge')?.Q) {
          pulseCount++;
        }
      }

      // Should detect 3 falling edges
      expect(pulseCount).toBe(3);
    });

    it('rapid toggle TRUE → FALSE → TRUE → FALSE detects 2 falling edges', () => {
      store.initEdgeDetector('FallingEdge');
      let pulseCount = 0;

      // Start with TRUE
      store.updateFTrig('FallingEdge', true);

      // First falling edge
      store.updateFTrig('FallingEdge', false);
      if (store.getEdgeDetector('FallingEdge')?.Q) pulseCount++;

      // Rise
      store.updateFTrig('FallingEdge', true);
      if (store.getEdgeDetector('FallingEdge')?.Q) pulseCount++;

      // Second falling edge
      store.updateFTrig('FallingEdge', false);
      if (store.getEdgeDetector('FallingEdge')?.Q) pulseCount++;

      expect(pulseCount).toBe(2);
    });
  });
});

// ============================================================================
// Combined Edge Detection
// ============================================================================

describe('Combined Edge Detection', () => {
  let store: SimulationStoreInterface;

  beforeEach(() => {
    store = createTestStore(100);
  });

  it('both R_TRIG and F_TRIG on same signal work independently', () => {
    store.initEdgeDetector('Rising');
    store.initEdgeDetector('Falling');

    let risingCount = 0;
    let fallingCount = 0;

    // Sequence: FALSE, TRUE, TRUE, FALSE, TRUE, FALSE
    const sequence = [false, true, true, false, true, false];

    for (const clk of sequence) {
      store.updateRTrig('Rising', clk);
      store.updateFTrig('Falling', clk);

      if (store.getEdgeDetector('Rising')?.Q) risingCount++;
      if (store.getEdgeDetector('Falling')?.Q) fallingCount++;
    }

    // 2 rising edges (FALSE→TRUE at index 1 and 4)
    // 2 falling edges (TRUE→FALSE at index 3 and 5)
    expect(risingCount).toBe(2);
    expect(fallingCount).toBe(2);
  });

  it('change detection (either edge) using both triggers', () => {
    store.initEdgeDetector('Rising');
    store.initEdgeDetector('Falling');

    let changeCount = 0;

    // Sequence: FALSE, TRUE, TRUE, FALSE, FALSE, TRUE
    const sequence = [false, true, true, false, false, true];

    for (const clk of sequence) {
      store.updateRTrig('Rising', clk);
      store.updateFTrig('Falling', clk);

      const rising = store.getEdgeDetector('Rising')?.Q ?? false;
      const falling = store.getEdgeDetector('Falling')?.Q ?? false;
      if (rising || falling) changeCount++;
    }

    // 2 rising edges + 1 falling edge = 3 changes
    expect(changeCount).toBe(3);
  });
});

// ============================================================================
// Property-Based Tests
// ============================================================================

describe('Edge Detection Property-Based Tests', () => {
  // Count rising edges in a sequence
  function countRisingEdges(sequence: boolean[]): number {
    let count = 0;
    let prev = false;
    for (const curr of sequence) {
      if (curr && !prev) count++;
      prev = curr;
    }
    return count;
  }

  // Count falling edges in a sequence
  function countFallingEdges(sequence: boolean[]): number {
    let count = 0;
    let prev = false;
    for (const curr of sequence) {
      if (!curr && prev) count++;
      prev = curr;
    }
    return count;
  }

  // Run R_TRIG through a sequence and count Q pulses
  function runRTRIG(sequence: boolean[]): number {
    const store = createTestStore(100);
    store.initEdgeDetector('Test');
    let pulseCount = 0;
    for (const clk of sequence) {
      store.updateRTrig('Test', clk);
      if (store.getEdgeDetector('Test')?.Q) pulseCount++;
    }
    return pulseCount;
  }

  // Run F_TRIG through a sequence and count Q pulses
  function runFTRIG(sequence: boolean[]): number {
    const store = createTestStore(100);
    store.initEdgeDetector('Test');
    let pulseCount = 0;
    for (const clk of sequence) {
      store.updateFTrig('Test', clk);
      if (store.getEdgeDetector('Test')?.Q) pulseCount++;
    }
    return pulseCount;
  }

  // Get Q sequence from R_TRIG
  function getRTRIGSequence(clkSequence: boolean[]): boolean[] {
    const store = createTestStore(100);
    store.initEdgeDetector('Test');
    const qSequence: boolean[] = [];
    for (const clk of clkSequence) {
      store.updateRTrig('Test', clk);
      qSequence.push(store.getEdgeDetector('Test')?.Q ?? false);
    }
    return qSequence;
  }

  it('R_TRIG produces one pulse per rising edge', () => {
    fc.assert(fc.property(
      fc.array(fc.boolean(), { minLength: 2, maxLength: 100 }),
      (clkSequence) => {
        const risingEdges = countRisingEdges(clkSequence);
        const pulses = runRTRIG(clkSequence);
        return pulses === risingEdges;
      }
    ), { numRuns: 200 });
  });

  it('F_TRIG produces one pulse per falling edge', () => {
    fc.assert(fc.property(
      fc.array(fc.boolean(), { minLength: 2, maxLength: 100 }),
      (clkSequence) => {
        const fallingEdges = countFallingEdges(clkSequence);
        const pulses = runFTRIG(clkSequence);
        return pulses === fallingEdges;
      }
    ), { numRuns: 200 });
  });

  it('R_TRIG Q is never TRUE for more than one consecutive scan', () => {
    fc.assert(fc.property(
      fc.array(fc.boolean(), { minLength: 2, maxLength: 100 }),
      (clkSequence) => {
        const qSequence = getRTRIGSequence(clkSequence);
        // Check that no two consecutive Q values are both TRUE
        for (let i = 0; i < qSequence.length - 1; i++) {
          if (qSequence[i] && qSequence[i + 1]) {
            return false;
          }
        }
        return true;
      }
    ), { numRuns: 200 });
  });
});
