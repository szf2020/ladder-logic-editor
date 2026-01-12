#!/usr/bin/env npx tsx
/**
 * Quick debug script to test simulation logic without browser
 * Run with: npx tsx scripts/debug-simulation.ts
 */

import { parseSTToAST } from '../src/transformer/ast';
import { runScanCycle } from '../src/interpreter/program-runner';
import { createRuntimeState } from '../src/interpreter/execution-context';
import { initializeVariables } from '../src/interpreter/variable-initializer';

// Minimal store implementation for testing
function createTestStore() {
  // These need to be directly on the returned object for runScanCycle to access them
  const store = {
    booleans: {} as Record<string, boolean>,
    integers: {} as Record<string, number>,
    reals: {} as Record<string, number>,
    times: {} as Record<string, number>,
    timers: {} as Record<string, { IN: boolean; PT: number; Q: boolean; ET: number; running: boolean }>,
    counters: {} as Record<string, { CU: boolean; CD: boolean; R: boolean; LD: boolean; PV: number; QU: boolean; QD: boolean; CV: number }>,
    scanTime: 100,
  } as any;

  // Add methods
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
        timer.running = true;
        timer.ET = 0;
        timer.Q = false;
      } else if (goingOff) {
        timer.running = false;
        timer.ET = 0;
        // Don't reset Q yet - allow user code to see it for one scan
      } else if (stayingOff && timer.Q) {
        // Reset Q on the scan AFTER falling edge
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

// Simple ST code for testing flash timer
const stCode = `
PROGRAM Test
VAR
  Running : BOOL := FALSE;
  FlashState : BOOL := FALSE;
  FlashTimer : TON;
  FlashTime : TIME := T#500ms;
  N_YEL : BOOL := FALSE;
END_VAR

(* Flash Timer *)
FlashTimer(IN := NOT Running AND NOT FlashTimer.Q, PT := FlashTime);
IF FlashTimer.Q THEN
    FlashState := NOT FlashState;
END_IF;

(* Output *)
IF NOT Running THEN
    N_YEL := FlashState;
END_IF;

END_PROGRAM
`;

console.log('=== Simulation Debug Script ===\n');

// Parse and initialize
const ast = parseSTToAST(stCode);
console.log(`Parsed: ${ast.programs.length} program(s), ${ast.programs[0]?.statements.length} statements\n`);

const store = createTestStore();
initializeVariables(ast, store as any);
const runtimeState = createRuntimeState(ast);

console.log('Initial state:');
console.log(`  FlashTime: ${store.getTime('FlashTime')}ms`);
console.log(`  Running: ${store.getBool('Running')}`);
console.log(`  FlashState: ${store.getBool('FlashState')}`);
console.log('');

// Run scan cycles
const numScans = 20;
console.log(`Running ${numScans} scan cycles (100ms each = ${numScans * 100}ms total):\n`);

for (let i = 0; i < numScans; i++) {
  runScanCycle(ast, store as any, runtimeState);

  const timer = store.getTimer('FlashTimer');
  const flashState = store.getBool('FlashState');
  const nYel = store.getBool('N_YEL');

  // Only print when something interesting happens
  if (i === 0 || timer?.Q || flashState !== store.getBool('FlashState')) {
    console.log(`Scan ${i.toString().padStart(2)}: FlashTimer(IN=${timer?.IN}, ET=${timer?.ET}ms, Q=${timer?.Q}) | FlashState=${flashState} | N_YEL=${nYel}`);
  } else if (i % 5 === 0) {
    console.log(`Scan ${i.toString().padStart(2)}: FlashTimer(IN=${timer?.IN}, ET=${timer?.ET}ms, Q=${timer?.Q}) | FlashState=${flashState} | N_YEL=${nYel}`);
  }
}

console.log('\n=== Done ===');
