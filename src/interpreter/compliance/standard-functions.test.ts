/**
 * IEC 61131-3 Standard Functions Tests
 *
 * Tests numeric functions defined in IEC 61131-3:
 * - ABS: Absolute value
 * - SQRT: Square root
 * - MIN: Minimum of two values
 * - MAX: Maximum of two values
 */

import { describe, it, expect } from 'vitest';
import { parseSTToAST } from '../../transformer/ast';
import { runScanCycle } from '../program-runner';
import { createRuntimeState, type SimulationStoreInterface } from '../execution-context';
import { initializeVariables } from '../variable-initializer';

// ============================================================================
// Test Store Factory
// ============================================================================

function createTestStore(): SimulationStoreInterface {
  const store = {
    booleans: {} as Record<string, boolean>,
    integers: {} as Record<string, number>,
    reals: {} as Record<string, number>,
    times: {} as Record<string, number>,
    timers: {} as Record<string, { IN: boolean; PT: number; Q: boolean; ET: number; running: boolean }>,
    counters: {} as Record<string, { CU: boolean; CD: boolean; R: boolean; LD: boolean; PV: number; QU: boolean; QD: boolean; CV: number }>,
    scanTime: 100,
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
    setTimerPT: (name: string, pt: number) => { const t = store.timers[name]; if (t) t.PT = pt; },
    setTimerInput: (name: string, input: boolean) => {
      const t = store.timers[name]; if (!t) return;
      if (input && !t.IN) { t.running = true; t.ET = 0; t.Q = false; }
      else if (!input && t.IN) { t.running = false; t.ET = 0; }
      t.IN = input;
    },
    updateTimer: (name: string, deltaMs: number) => {
      const t = store.timers[name]; if (!t || !t.running) return;
      t.ET = Math.min(t.ET + deltaMs, t.PT);
      if (t.ET >= t.PT) { t.Q = true; t.running = false; }
    },
    initCounter: (name: string, pv: number) => {
      store.counters[name] = { CU: false, CD: false, R: false, LD: false, PV: pv, QU: false, QD: false, CV: 0 };
    },
    getCounter: (name: string) => store.counters[name],
    pulseCountUp: (name: string) => { const c = store.counters[name]; if (c) { c.CV++; c.QU = c.CV >= c.PV; } },
    pulseCountDown: (name: string) => { const c = store.counters[name]; if (c) { c.CV = Math.max(0, c.CV - 1); c.QD = c.CV <= 0; } },
    resetCounter: (name: string) => { const c = store.counters[name]; if (c) { c.CV = 0; c.QU = false; c.QD = true; } },
    clearAll: () => { store.booleans = {}; store.integers = {}; store.reals = {}; store.times = {}; store.timers = {}; store.counters = {}; },
  });

  return store;
}

// ============================================================================
// ABS Function Tests
// ============================================================================

describe('ABS Function', () => {
  describe('INT arguments', () => {
    it('ABS(5) = 5 (positive unchanged)', () => {
      const store = createTestStore();
      const ast = parseSTToAST(`
        PROGRAM Test
        VAR
          Result : INT;
        END_VAR
        Result := ABS(5);
        END_PROGRAM
      `);

      initializeVariables(ast, store);
      runScanCycle(ast, store, createRuntimeState(ast));

      expect(store.getInt('Result')).toBe(5);
    });

    it('ABS(-5) = 5 (negative becomes positive)', () => {
      const store = createTestStore();
      const ast = parseSTToAST(`
        PROGRAM Test
        VAR
          Result : INT;
        END_VAR
        Result := ABS(-5);
        END_PROGRAM
      `);

      initializeVariables(ast, store);
      runScanCycle(ast, store, createRuntimeState(ast));

      expect(store.getInt('Result')).toBe(5);
    });

    it('ABS(0) = 0', () => {
      const store = createTestStore();
      const ast = parseSTToAST(`
        PROGRAM Test
        VAR
          Result : INT;
        END_VAR
        Result := ABS(0);
        END_PROGRAM
      `);

      initializeVariables(ast, store);
      runScanCycle(ast, store, createRuntimeState(ast));

      expect(store.getInt('Result')).toBe(0);
    });

    it('ABS with variable', () => {
      const store = createTestStore();
      const ast = parseSTToAST(`
        PROGRAM Test
        VAR
          x : INT := -42;
          Result : INT;
        END_VAR
        Result := ABS(x);
        END_PROGRAM
      `);

      initializeVariables(ast, store);
      runScanCycle(ast, store, createRuntimeState(ast));

      expect(store.getInt('Result')).toBe(42);
    });
  });

  describe('REAL arguments', () => {
    it('ABS(-3.14) = 3.14', () => {
      const store = createTestStore();
      const ast = parseSTToAST(`
        PROGRAM Test
        VAR
          Result : REAL;
        END_VAR
        Result := ABS(-3.14);
        END_PROGRAM
      `);

      initializeVariables(ast, store);
      runScanCycle(ast, store, createRuntimeState(ast));

      expect(store.getReal('Result')).toBeCloseTo(3.14, 5);
    });

    it('ABS(2.718) = 2.718 (positive unchanged)', () => {
      const store = createTestStore();
      const ast = parseSTToAST(`
        PROGRAM Test
        VAR
          Result : REAL;
        END_VAR
        Result := ABS(2.718);
        END_PROGRAM
      `);

      initializeVariables(ast, store);
      runScanCycle(ast, store, createRuntimeState(ast));

      expect(store.getReal('Result')).toBeCloseTo(2.718, 5);
    });
  });

  describe('Edge cases', () => {
    it('ABS(-32768) = 32768 (INT minimum boundary)', () => {
      const store = createTestStore();
      const ast = parseSTToAST(`
        PROGRAM Test
        VAR
          Result : INT;
        END_VAR
        Result := ABS(-32768);
        END_PROGRAM
      `);

      initializeVariables(ast, store);
      runScanCycle(ast, store, createRuntimeState(ast));

      expect(store.getInt('Result')).toBe(32768);
    });
  });
});

// ============================================================================
// SQRT Function Tests
// ============================================================================

describe('SQRT Function', () => {
  describe('Perfect squares', () => {
    it('SQRT(4) = 2', () => {
      const store = createTestStore();
      const ast = parseSTToAST(`
        PROGRAM Test
        VAR
          Result : REAL;
        END_VAR
        Result := SQRT(4.0);
        END_PROGRAM
      `);

      initializeVariables(ast, store);
      runScanCycle(ast, store, createRuntimeState(ast));

      expect(store.getReal('Result')).toBeCloseTo(2.0, 5);
    });

    it('SQRT(9) = 3', () => {
      const store = createTestStore();
      const ast = parseSTToAST(`
        PROGRAM Test
        VAR
          Result : REAL;
        END_VAR
        Result := SQRT(9.0);
        END_PROGRAM
      `);

      initializeVariables(ast, store);
      runScanCycle(ast, store, createRuntimeState(ast));

      expect(store.getReal('Result')).toBeCloseTo(3.0, 5);
    });

    it('SQRT(16) = 4', () => {
      const store = createTestStore();
      const ast = parseSTToAST(`
        PROGRAM Test
        VAR
          Result : REAL;
        END_VAR
        Result := SQRT(16.0);
        END_PROGRAM
      `);

      initializeVariables(ast, store);
      runScanCycle(ast, store, createRuntimeState(ast));

      expect(store.getReal('Result')).toBeCloseTo(4.0, 5);
    });

    it('SQRT(100) = 10', () => {
      const store = createTestStore();
      const ast = parseSTToAST(`
        PROGRAM Test
        VAR
          Result : REAL;
        END_VAR
        Result := SQRT(100.0);
        END_PROGRAM
      `);

      initializeVariables(ast, store);
      runScanCycle(ast, store, createRuntimeState(ast));

      expect(store.getReal('Result')).toBeCloseTo(10.0, 5);
    });
  });

  describe('Non-perfect squares', () => {
    it('SQRT(2) ≈ 1.414', () => {
      const store = createTestStore();
      const ast = parseSTToAST(`
        PROGRAM Test
        VAR
          Result : REAL;
        END_VAR
        Result := SQRT(2.0);
        END_PROGRAM
      `);

      initializeVariables(ast, store);
      runScanCycle(ast, store, createRuntimeState(ast));

      expect(store.getReal('Result')).toBeCloseTo(1.41421356, 5);
    });

    it('SQRT(3) ≈ 1.732', () => {
      const store = createTestStore();
      const ast = parseSTToAST(`
        PROGRAM Test
        VAR
          Result : REAL;
        END_VAR
        Result := SQRT(3.0);
        END_PROGRAM
      `);

      initializeVariables(ast, store);
      runScanCycle(ast, store, createRuntimeState(ast));

      expect(store.getReal('Result')).toBeCloseTo(1.73205081, 5);
    });
  });

  describe('Edge cases', () => {
    it('SQRT(0) = 0', () => {
      const store = createTestStore();
      const ast = parseSTToAST(`
        PROGRAM Test
        VAR
          Result : REAL;
        END_VAR
        Result := SQRT(0.0);
        END_PROGRAM
      `);

      initializeVariables(ast, store);
      runScanCycle(ast, store, createRuntimeState(ast));

      expect(store.getReal('Result')).toBe(0.0);
    });

    it('SQRT(1) = 1', () => {
      const store = createTestStore();
      const ast = parseSTToAST(`
        PROGRAM Test
        VAR
          Result : REAL;
        END_VAR
        Result := SQRT(1.0);
        END_PROGRAM
      `);

      initializeVariables(ast, store);
      runScanCycle(ast, store, createRuntimeState(ast));

      expect(store.getReal('Result')).toBe(1.0);
    });

    it('SQRT of negative returns NaN', () => {
      const store = createTestStore();
      const ast = parseSTToAST(`
        PROGRAM Test
        VAR
          Result : REAL;
        END_VAR
        Result := SQRT(-1.0);
        END_PROGRAM
      `);

      initializeVariables(ast, store);
      runScanCycle(ast, store, createRuntimeState(ast));

      expect(store.getReal('Result')).toBeNaN();
    });
  });

  describe('With expressions', () => {
    it('SQRT(x + y) computes correctly', () => {
      const store = createTestStore();
      const ast = parseSTToAST(`
        PROGRAM Test
        VAR
          x : REAL := 9.0;
          y : REAL := 16.0;
          Result : REAL;
        END_VAR
        Result := SQRT(x + y);
        END_PROGRAM
      `);

      initializeVariables(ast, store);
      runScanCycle(ast, store, createRuntimeState(ast));

      expect(store.getReal('Result')).toBeCloseTo(5.0, 5); // sqrt(25) = 5
    });
  });
});

// ============================================================================
// MIN Function Tests
// ============================================================================

describe('MIN Function', () => {
  describe('INT arguments', () => {
    it('MIN(5, 3) = 3', () => {
      const store = createTestStore();
      const ast = parseSTToAST(`
        PROGRAM Test
        VAR
          Result : INT;
        END_VAR
        Result := MIN(5, 3);
        END_PROGRAM
      `);

      initializeVariables(ast, store);
      runScanCycle(ast, store, createRuntimeState(ast));

      expect(store.getInt('Result')).toBe(3);
    });

    it('MIN(3, 5) = 3 (order independent)', () => {
      const store = createTestStore();
      const ast = parseSTToAST(`
        PROGRAM Test
        VAR
          Result : INT;
        END_VAR
        Result := MIN(3, 5);
        END_PROGRAM
      `);

      initializeVariables(ast, store);
      runScanCycle(ast, store, createRuntimeState(ast));

      expect(store.getInt('Result')).toBe(3);
    });

    it('MIN(5, 5) = 5 (equal values)', () => {
      const store = createTestStore();
      const ast = parseSTToAST(`
        PROGRAM Test
        VAR
          Result : INT;
        END_VAR
        Result := MIN(5, 5);
        END_PROGRAM
      `);

      initializeVariables(ast, store);
      runScanCycle(ast, store, createRuntimeState(ast));

      expect(store.getInt('Result')).toBe(5);
    });

    it('MIN(-5, 3) = -5 (negative value)', () => {
      const store = createTestStore();
      const ast = parseSTToAST(`
        PROGRAM Test
        VAR
          Result : INT;
        END_VAR
        Result := MIN(-5, 3);
        END_PROGRAM
      `);

      initializeVariables(ast, store);
      runScanCycle(ast, store, createRuntimeState(ast));

      expect(store.getInt('Result')).toBe(-5);
    });

    it('MIN(-5, -3) = -5 (both negative)', () => {
      const store = createTestStore();
      const ast = parseSTToAST(`
        PROGRAM Test
        VAR
          Result : INT;
        END_VAR
        Result := MIN(-5, -3);
        END_PROGRAM
      `);

      initializeVariables(ast, store);
      runScanCycle(ast, store, createRuntimeState(ast));

      expect(store.getInt('Result')).toBe(-5);
    });
  });

  describe('REAL arguments', () => {
    it('MIN(3.14, 2.718) = 2.718', () => {
      const store = createTestStore();
      const ast = parseSTToAST(`
        PROGRAM Test
        VAR
          Result : REAL;
        END_VAR
        Result := MIN(3.14, 2.718);
        END_PROGRAM
      `);

      initializeVariables(ast, store);
      runScanCycle(ast, store, createRuntimeState(ast));

      expect(store.getReal('Result')).toBeCloseTo(2.718, 5);
    });
  });

  describe('With variables', () => {
    it('MIN(x, y) with variables', () => {
      const store = createTestStore();
      const ast = parseSTToAST(`
        PROGRAM Test
        VAR
          x : INT := 10;
          y : INT := 5;
          Result : INT;
        END_VAR
        Result := MIN(x, y);
        END_PROGRAM
      `);

      initializeVariables(ast, store);
      runScanCycle(ast, store, createRuntimeState(ast));

      expect(store.getInt('Result')).toBe(5);
    });
  });
});

// ============================================================================
// MAX Function Tests
// ============================================================================

describe('MAX Function', () => {
  describe('INT arguments', () => {
    it('MAX(5, 3) = 5', () => {
      const store = createTestStore();
      const ast = parseSTToAST(`
        PROGRAM Test
        VAR
          Result : INT;
        END_VAR
        Result := MAX(5, 3);
        END_PROGRAM
      `);

      initializeVariables(ast, store);
      runScanCycle(ast, store, createRuntimeState(ast));

      expect(store.getInt('Result')).toBe(5);
    });

    it('MAX(3, 5) = 5 (order independent)', () => {
      const store = createTestStore();
      const ast = parseSTToAST(`
        PROGRAM Test
        VAR
          Result : INT;
        END_VAR
        Result := MAX(3, 5);
        END_PROGRAM
      `);

      initializeVariables(ast, store);
      runScanCycle(ast, store, createRuntimeState(ast));

      expect(store.getInt('Result')).toBe(5);
    });

    it('MAX(5, 5) = 5 (equal values)', () => {
      const store = createTestStore();
      const ast = parseSTToAST(`
        PROGRAM Test
        VAR
          Result : INT;
        END_VAR
        Result := MAX(5, 5);
        END_PROGRAM
      `);

      initializeVariables(ast, store);
      runScanCycle(ast, store, createRuntimeState(ast));

      expect(store.getInt('Result')).toBe(5);
    });

    it('MAX(-5, 3) = 3 (with negative)', () => {
      const store = createTestStore();
      const ast = parseSTToAST(`
        PROGRAM Test
        VAR
          Result : INT;
        END_VAR
        Result := MAX(-5, 3);
        END_PROGRAM
      `);

      initializeVariables(ast, store);
      runScanCycle(ast, store, createRuntimeState(ast));

      expect(store.getInt('Result')).toBe(3);
    });

    it('MAX(-5, -3) = -3 (both negative)', () => {
      const store = createTestStore();
      const ast = parseSTToAST(`
        PROGRAM Test
        VAR
          Result : INT;
        END_VAR
        Result := MAX(-5, -3);
        END_PROGRAM
      `);

      initializeVariables(ast, store);
      runScanCycle(ast, store, createRuntimeState(ast));

      expect(store.getInt('Result')).toBe(-3);
    });
  });

  describe('REAL arguments', () => {
    it('MAX(3.14, 2.718) = 3.14', () => {
      const store = createTestStore();
      const ast = parseSTToAST(`
        PROGRAM Test
        VAR
          Result : REAL;
        END_VAR
        Result := MAX(3.14, 2.718);
        END_PROGRAM
      `);

      initializeVariables(ast, store);
      runScanCycle(ast, store, createRuntimeState(ast));

      expect(store.getReal('Result')).toBeCloseTo(3.14, 5);
    });
  });

  describe('With variables', () => {
    it('MAX(x, y) with variables', () => {
      const store = createTestStore();
      const ast = parseSTToAST(`
        PROGRAM Test
        VAR
          x : INT := 10;
          y : INT := 5;
          Result : INT;
        END_VAR
        Result := MAX(x, y);
        END_PROGRAM
      `);

      initializeVariables(ast, store);
      runScanCycle(ast, store, createRuntimeState(ast));

      expect(store.getInt('Result')).toBe(10);
    });
  });
});

// ============================================================================
// Nested Function Calls
// ============================================================================

describe('Nested Function Calls', () => {
  it('ABS(MIN(-5, -3)) = 5', () => {
    const store = createTestStore();
    const ast = parseSTToAST(`
      PROGRAM Test
      VAR
        Result : INT;
      END_VAR
      Result := ABS(MIN(-5, -3));
      END_PROGRAM
    `);

    initializeVariables(ast, store);
    runScanCycle(ast, store, createRuntimeState(ast));

    expect(store.getInt('Result')).toBe(5); // MIN(-5, -3) = -5, ABS(-5) = 5
  });

  it('MAX(ABS(-3), ABS(-5)) = 5', () => {
    const store = createTestStore();
    const ast = parseSTToAST(`
      PROGRAM Test
      VAR
        Result : INT;
      END_VAR
      Result := MAX(ABS(-3), ABS(-5));
      END_PROGRAM
    `);

    initializeVariables(ast, store);
    runScanCycle(ast, store, createRuntimeState(ast));

    expect(store.getInt('Result')).toBe(5);
  });

  it('SQRT(MAX(4.0, 9.0)) = 3', () => {
    const store = createTestStore();
    const ast = parseSTToAST(`
      PROGRAM Test
      VAR
        Result : REAL;
      END_VAR
      Result := SQRT(MAX(4.0, 9.0));
      END_PROGRAM
    `);

    initializeVariables(ast, store);
    runScanCycle(ast, store, createRuntimeState(ast));

    expect(store.getReal('Result')).toBeCloseTo(3.0, 5);
  });
});

// ============================================================================
// Functions in Expressions
// ============================================================================

describe('Functions in Expressions', () => {
  it('ABS(-5) + 3 = 8', () => {
    const store = createTestStore();
    const ast = parseSTToAST(`
      PROGRAM Test
      VAR
        Result : INT;
      END_VAR
      Result := ABS(-5) + 3;
      END_PROGRAM
    `);

    initializeVariables(ast, store);
    runScanCycle(ast, store, createRuntimeState(ast));

    expect(store.getInt('Result')).toBe(8);
  });

  it('2 * SQRT(16.0) = 8', () => {
    const store = createTestStore();
    const ast = parseSTToAST(`
      PROGRAM Test
      VAR
        Result : REAL;
      END_VAR
      Result := 2.0 * SQRT(16.0);
      END_PROGRAM
    `);

    initializeVariables(ast, store);
    runScanCycle(ast, store, createRuntimeState(ast));

    expect(store.getReal('Result')).toBeCloseTo(8.0, 5);
  });

  it('MIN(5, 3) * MAX(2, 4) = 12', () => {
    const store = createTestStore();
    const ast = parseSTToAST(`
      PROGRAM Test
      VAR
        Result : INT;
      END_VAR
      Result := MIN(5, 3) * MAX(2, 4);
      END_PROGRAM
    `);

    initializeVariables(ast, store);
    runScanCycle(ast, store, createRuntimeState(ast));

    expect(store.getInt('Result')).toBe(12); // 3 * 4 = 12
  });

  it('Function in comparison: ABS(-5) > 3 is TRUE', () => {
    const store = createTestStore();
    const ast = parseSTToAST(`
      PROGRAM Test
      VAR
        Result : BOOL;
      END_VAR
      Result := ABS(-5) > 3;
      END_PROGRAM
    `);

    initializeVariables(ast, store);
    runScanCycle(ast, store, createRuntimeState(ast));

    expect(store.getBool('Result')).toBe(true);
  });
});
