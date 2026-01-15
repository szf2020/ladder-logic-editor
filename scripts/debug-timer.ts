/**
 * Debug script for timer execution
 */

import { parseSTToAST } from '../src/transformer/ast';
import { runScanCycle } from '../src/interpreter/program-runner';
import { createRuntimeState, type SimulationStoreInterface } from '../src/interpreter/execution-context';
import { initializeVariables } from '../src/interpreter/variable-initializer';

// Create test store
const store = {
  booleans: {} as Record<string, boolean>,
  integers: {} as Record<string, number>,
  reals: {} as Record<string, number>,
  times: {} as Record<string, number>,
  timers: {} as Record<string, { IN: boolean; PT: number; Q: boolean; ET: number; running: boolean }>,
  counters: {} as Record<string, any>,
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
    console.log('initTimer called:', name, pt);
    store.timers[name] = { IN: false, PT: pt, Q: false, ET: 0, running: false };
  },
  getTimer: (name: string) => store.timers[name],
  setTimerPT: (name: string, pt: number) => { const t = store.timers[name]; if (t) t.PT = pt; },
  setTimerInput: (name: string, input: boolean) => {
    console.log('setTimerInput called:', name, input);
    const timer = store.timers[name];
    if (!timer) { console.log('Timer not found!'); return; }
    if (input && !timer.IN) { timer.running = true; timer.ET = 0; timer.Q = false; }
    timer.IN = input;
  },
  updateTimer: (name: string, deltaMs: number) => {
    console.log('updateTimer called:', name, deltaMs);
    const timer = store.timers[name];
    if (!timer || !timer.running) return;
    timer.ET = Math.min(timer.ET + deltaMs, timer.PT);
    if (timer.ET >= timer.PT) { timer.Q = true; timer.running = false; }
  },
  initCounter: () => {},
  getCounter: () => undefined,
  pulseCountUp: () => {},
  pulseCountDown: () => {},
  resetCounter: () => {},
  clearAll: () => {},
});

const code = `
  PROGRAM TONTest
  VAR
    StartInput : BOOL := FALSE;
    Timer1 : TON;
    TimerDone : BOOL;
  END_VAR
  Timer1(IN := StartInput, PT := T#500ms);
  TimerDone := Timer1.Q;
  END_PROGRAM
`;

const ast = parseSTToAST(code);
console.log('AST programs:', ast.programs.length);
console.log('Statements:', ast.programs[0]?.statements.length);
console.log('Statement types:', ast.programs[0]?.statements.map(s => s.type));

initializeVariables(ast, store);
console.log('After init, booleans:', store.booleans);

store.setBool('StartInput', true);
console.log('StartInput set to true');

const runtimeState = createRuntimeState(ast);

for (let i = 1; i <= 7; i++) {
  console.log(`--- Running scan cycle ${i} ---`);
  runScanCycle(ast, store, runtimeState);
  const timer = store.timers['Timer1'];
  console.log(`Timer1: ET=${timer?.ET}, Q=${timer?.Q}, running=${timer?.running}`);
  console.log(`TimerDone: ${store.getBool('TimerDone')}`);
}
