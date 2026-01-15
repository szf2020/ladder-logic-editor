/**
 * Simulation Store
 *
 * Manages the simulation state and variable values.
 * All behavior is determined exclusively by the ladder diagram and structured text.
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// ============================================================================
// Timer State (IEC 61131-3)
// ============================================================================

export interface TimerState {
  IN: boolean;      // Input
  PT: number;       // Preset time (ms)
  Q: boolean;       // Output
  ET: number;       // Elapsed time (ms)
  running: boolean; // Internal: is timer currently timing
}

// ============================================================================
// Counter State (IEC 61131-3)
// ============================================================================

export interface CounterState {
  CU: boolean;      // Count up input
  CD: boolean;      // Count down input
  R: boolean;       // Reset
  LD: boolean;      // Load
  PV: number;       // Preset value
  QU: boolean;      // Count up output (CV >= PV)
  QD: boolean;      // Count down output (CV <= 0)
  CV: number;       // Current value
}

// ============================================================================
// Edge Detector State (IEC 61131-3 Section 2.5.3)
// ============================================================================

export interface EdgeDetectorState {
  CLK: boolean;     // Current input
  Q: boolean;       // Output (single-scan pulse)
  M: boolean;       // Memory (previous CLK value)
}

// ============================================================================
// Bistable State (IEC 61131-3 Section 2.5.4)
// ============================================================================

export interface BistableState {
  Q1: boolean;      // Output state
}

// ============================================================================
// Simulation State
// ============================================================================

export type SimulationStatus = 'stopped' | 'running' | 'paused';

interface SimulationState {
  // Simulation control
  status: SimulationStatus;
  scanTime: number;       // Scan cycle time in ms
  elapsedTime: number;    // Total elapsed time in ms
  scanCount: number;      // Number of scan cycles completed

  // Variable values
  booleans: Record<string, boolean>;
  integers: Record<string, number>;
  reals: Record<string, number>;
  times: Record<string, number>; // Time values in ms

  // Timer instances
  timers: Record<string, TimerState>;

  // Counter instances
  counters: Record<string, CounterState>;

  // Edge detector instances (R_TRIG, F_TRIG)
  edgeDetectors: Record<string, EdgeDetectorState>;

  // Bistable instances (SR, RS)
  bistables: Record<string, BistableState>;

  // Actions
  start: () => void;
  pause: () => void;
  stop: () => void;
  reset: () => void;
  step: () => void; // Single scan cycle

  // Variable access
  setBool: (name: string, value: boolean) => void;
  getBool: (name: string) => boolean;
  setInt: (name: string, value: number) => void;
  getInt: (name: string) => number;
  setReal: (name: string, value: number) => void;
  getReal: (name: string) => number;
  setTime: (name: string, value: number) => void;
  getTime: (name: string) => number;

  // Timer operations
  initTimer: (name: string, pt: number) => void;
  updateTimer: (name: string, deltaMs: number) => void;
  getTimer: (name: string) => TimerState | undefined;
  setTimerInput: (name: string, input: boolean) => void;
  setTimerPT: (name: string, pt: number) => void;

  // Counter operations
  initCounter: (name: string, pv: number) => void;
  getCounter: (name: string) => CounterState | undefined;
  pulseCountUp: (name: string) => void;
  pulseCountDown: (name: string) => void;
  resetCounter: (name: string) => void;

  // Edge detector operations (R_TRIG, F_TRIG)
  initEdgeDetector: (name: string) => void;
  getEdgeDetector: (name: string) => EdgeDetectorState | undefined;
  updateRTrig: (name: string, clk: boolean) => void;
  updateFTrig: (name: string, clk: boolean) => void;

  // Bistable operations (SR, RS)
  initBistable: (name: string) => void;
  getBistable: (name: string) => BistableState | undefined;
  updateSR: (name: string, s1: boolean, r: boolean) => void;
  updateRS: (name: string, s: boolean, r1: boolean) => void;

  // Bulk operations
  setVariables: (vars: Record<string, boolean | number>) => void;
  clearAll: () => void;
}

// ============================================================================
// Default Timer State
// ============================================================================

function createDefaultTimerState(pt: number): TimerState {
  return {
    IN: false,
    PT: pt,
    Q: false,
    ET: 0,
    running: false,
  };
}

// ============================================================================
// Default Counter State
// ============================================================================

function createDefaultCounterState(pv: number): CounterState {
  return {
    CU: false,
    CD: false,
    R: false,
    LD: false,
    PV: pv,
    QU: false,
    QD: false,
    CV: 0,
  };
}

// ============================================================================
// Default Edge Detector State
// ============================================================================

function createDefaultEdgeDetectorState(): EdgeDetectorState {
  return {
    CLK: false,
    Q: false,
    M: false,
  };
}

// ============================================================================
// Default Bistable State
// ============================================================================

function createDefaultBistableState(): BistableState {
  return {
    Q1: false,
  };
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useSimulationStore = create<SimulationState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    status: 'stopped',
    scanTime: 100, // 100ms default scan cycle
    elapsedTime: 0,
    scanCount: 0,

    booleans: {},
    integers: {},
    reals: {},
    times: {},
    timers: {},
    counters: {},
    edgeDetectors: {},
    bistables: {},

    // Control actions
    start: () => set({ status: 'running' }),
    pause: () => set({ status: 'paused' }),
    stop: () => set({ status: 'stopped' }),

    reset: () => {
      set({
        status: 'stopped',
        elapsedTime: 0,
        scanCount: 0,
        booleans: {},
        integers: {},
        reals: {},
        times: {},
        timers: {},
        counters: {},
        edgeDetectors: {},
        bistables: {},
      });
    },

    step: () => {
      const state = get();
      set({
        elapsedTime: state.elapsedTime + state.scanTime,
        scanCount: state.scanCount + 1,
      });
    },

    // Boolean variables
    setBool: (name: string, value: boolean) => {
      set((state) => ({
        booleans: { ...state.booleans, [name]: value },
      }));
    },

    getBool: (name: string) => {
      return get().booleans[name] ?? false;
    },

    // Integer variables
    setInt: (name: string, value: number) => {
      set((state) => ({
        integers: { ...state.integers, [name]: Math.floor(value) },
      }));
    },

    getInt: (name: string) => {
      return get().integers[name] ?? 0;
    },

    // Real variables
    setReal: (name: string, value: number) => {
      set((state) => ({
        reals: { ...state.reals, [name]: value },
      }));
    },

    getReal: (name: string) => {
      return get().reals[name] ?? 0.0;
    },

    // Time variables
    setTime: (name: string, value: number) => {
      set((state) => ({
        times: { ...state.times, [name]: value },
      }));
    },

    getTime: (name: string) => {
      return get().times[name] ?? 0;
    },

    // Timer operations
    initTimer: (name: string, pt: number) => {
      set((state) => ({
        timers: {
          ...state.timers,
          [name]: createDefaultTimerState(pt),
        },
      }));
    },

    getTimer: (name: string) => {
      return get().timers[name];
    },

    setTimerInput: (name: string, input: boolean) => {
      const state = get();
      const timer = state.timers[name];
      if (!timer) return;

      // TON behavior: start timing when IN goes TRUE
      const wasOff = !timer.IN;
      const goingOn = input && wasOff;
      const goingOff = !input && timer.IN;
      const stayingOff = !input && !timer.IN;

      let newTimer = { ...timer, IN: input };

      if (goingOn) {
        // Rising edge - start timing
        newTimer.ET = 0;
        // Per IEC 61131-3: if PT=0, Q is immediately TRUE
        if (timer.PT <= 0) {
          newTimer.Q = true;
          newTimer.running = false;
        } else {
          newTimer.running = true;
          newTimer.Q = false;
        }
      } else if (goingOff) {
        // Falling edge - stop timer but DON'T reset Q immediately
        // This allows self-resetting patterns like: Timer(IN := condition AND NOT Timer.Q)
        // Q will be reset on the NEXT scan when IN stays FALSE
        newTimer.running = false;
        newTimer.ET = 0;
        // Keep Q as-is so user code can see it for one scan
      } else if (stayingOff && timer.Q) {
        // IN stayed FALSE for another scan - NOW reset Q
        // This gives user code one full scan to see Q=TRUE
        newTimer.Q = false;
      }

      set((s) => ({
        timers: { ...s.timers, [name]: newTimer },
      }));
    },

    setTimerPT: (name: string, pt: number) => {
      const state = get();
      const timer = state.timers[name];
      if (!timer) return;

      set((s) => ({
        timers: {
          ...s.timers,
          [name]: { ...timer, PT: pt },
        },
      }));
    },

    updateTimer: (name: string, deltaMs: number) => {
      const state = get();
      const timer = state.timers[name];
      if (!timer || !timer.running) return;

      const newET = Math.min(timer.ET + deltaMs, timer.PT);
      const newQ = newET >= timer.PT;

      set((s) => ({
        timers: {
          ...s.timers,
          [name]: {
            ...timer,
            ET: newET,
            Q: newQ,
            running: !newQ, // Stop running once Q is true
          },
        },
      }));
    },

    // Counter operations
    initCounter: (name: string, pv: number) => {
      set((state) => ({
        counters: {
          ...state.counters,
          [name]: createDefaultCounterState(pv),
        },
      }));
    },

    getCounter: (name: string) => {
      return get().counters[name];
    },

    pulseCountUp: (name: string) => {
      const state = get();
      const counter = state.counters[name];
      if (!counter) return;

      const newCV = counter.CV + 1;
      set((s) => ({
        counters: {
          ...s.counters,
          [name]: {
            ...counter,
            CV: newCV,
            QU: newCV >= counter.PV,
          },
        },
      }));
    },

    pulseCountDown: (name: string) => {
      const state = get();
      const counter = state.counters[name];
      if (!counter) return;

      const newCV = Math.max(0, counter.CV - 1);
      set((s) => ({
        counters: {
          ...s.counters,
          [name]: {
            ...counter,
            CV: newCV,
            QD: newCV <= 0,
          },
        },
      }));
    },

    resetCounter: (name: string) => {
      const state = get();
      const counter = state.counters[name];
      if (!counter) return;

      set((s) => ({
        counters: {
          ...s.counters,
          [name]: {
            ...counter,
            CV: 0,
            QU: false,
            QD: true,
          },
        },
      }));
    },

    // Edge detector operations (R_TRIG, F_TRIG)
    initEdgeDetector: (name: string) => {
      set((state) => ({
        edgeDetectors: {
          ...state.edgeDetectors,
          [name]: createDefaultEdgeDetectorState(),
        },
      }));
    },

    getEdgeDetector: (name: string) => {
      return get().edgeDetectors[name];
    },

    updateRTrig: (name: string, clk: boolean) => {
      const state = get();
      let ed = state.edgeDetectors[name];

      // Initialize if not exists
      if (!ed) {
        ed = createDefaultEdgeDetectorState();
      }

      // R_TRIG: Q = CLK AND NOT M (rising edge: current TRUE and previous FALSE)
      const newQ = clk && !ed.M;

      set((s) => ({
        edgeDetectors: {
          ...s.edgeDetectors,
          [name]: {
            CLK: clk,
            Q: newQ,
            M: clk,  // Remember current state for next scan
          },
        },
      }));
    },

    updateFTrig: (name: string, clk: boolean) => {
      const state = get();
      let ed = state.edgeDetectors[name];

      // Initialize if not exists
      if (!ed) {
        ed = createDefaultEdgeDetectorState();
      }

      // F_TRIG: Q = NOT CLK AND M (falling edge: current FALSE and previous TRUE)
      const newQ = !clk && ed.M;

      set((s) => ({
        edgeDetectors: {
          ...s.edgeDetectors,
          [name]: {
            CLK: clk,
            Q: newQ,
            M: clk,  // Remember current state for next scan
          },
        },
      }));
    },

    // Bistable operations (SR, RS)
    initBistable: (name: string) => {
      set((state) => ({
        bistables: {
          ...state.bistables,
          [name]: createDefaultBistableState(),
        },
      }));
    },

    getBistable: (name: string) => {
      return get().bistables[name];
    },

    updateSR: (name: string, s1: boolean, r: boolean) => {
      const state = get();
      let bs = state.bistables[name];

      // Initialize if not exists
      if (!bs) {
        bs = createDefaultBistableState();
      }

      // SR (Set Dominant): S1 wins if both active
      let newQ1 = bs.Q1;
      if (s1) {
        newQ1 = true;
      } else if (r) {
        newQ1 = false;
      }
      // else: maintain current state

      set((s) => ({
        bistables: {
          ...s.bistables,
          [name]: { Q1: newQ1 },
        },
      }));
    },

    updateRS: (name: string, s: boolean, r1: boolean) => {
      const state = get();
      let bs = state.bistables[name];

      // Initialize if not exists
      if (!bs) {
        bs = createDefaultBistableState();
      }

      // RS (Reset Dominant): R1 wins if both active
      let newQ1 = bs.Q1;
      if (r1) {
        newQ1 = false;
      } else if (s) {
        newQ1 = true;
      }
      // else: maintain current state

      set((s) => ({
        bistables: {
          ...s.bistables,
          [name]: { Q1: newQ1 },
        },
      }));
    },

    // Bulk operations
    setVariables: (vars: Record<string, boolean | number>) => {
      const state = get();
      const newBools = { ...state.booleans };
      const newInts = { ...state.integers };
      const newReals = { ...state.reals };

      for (const [name, value] of Object.entries(vars)) {
        if (typeof value === 'boolean') {
          newBools[name] = value;
        } else if (Number.isInteger(value)) {
          newInts[name] = value;
        } else {
          newReals[name] = value;
        }
      }

      set({
        booleans: newBools,
        integers: newInts,
        reals: newReals,
      });
    },

    clearAll: () => {
      set({
        booleans: {},
        integers: {},
        reals: {},
        times: {},
        timers: {},
        counters: {},
        edgeDetectors: {},
        bistables: {},
      });
    },
  }))
);
