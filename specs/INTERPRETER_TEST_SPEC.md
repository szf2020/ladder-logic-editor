# Interpreter Test Specification

This document defines comprehensive test coverage for the PLC interpreter engine.

## Test Categories

### 1. Unit Tests (per component)
### 2. Integration Tests (full scan cycles)
### 3. Regression Tests (bug reproductions)
### 4. Conformance Tests (IEC 61131-3 compliance)

---

## 1. Execution Context Tests (`execution-context.test.ts`)

### Variable Retrieval - CRITICAL (fixes current bug)
- [ ] `getVariable` returns `0` for INT initialized to 0
- [ ] `getVariable` returns `FALSE` for BOOL initialized to FALSE
- [ ] `getVariable` returns `0.0` for REAL initialized to 0.0
- [ ] `getVariable` returns `0` for TIME initialized to T#0ms
- [ ] `getVariable` returns correct value for non-zero INT
- [ ] `getVariable` returns correct value for TRUE BOOL
- [ ] `getVariable` returns correct value for non-zero REAL
- [ ] `getVariable` returns default (0/false) for undefined variable

### Timer Field Access
- [ ] `getTimerField` returns Q (output) correctly
- [ ] `getTimerField` returns ET (elapsed time) correctly
- [ ] `getTimerField` returns PT (preset time) correctly
- [ ] `getTimerField` returns IN (input) correctly
- [ ] `getTimerField` returns 0/false for non-existent timer

### Counter Field Access
- [ ] `getCounterField` returns CV (current value) correctly
- [ ] `getCounterField` returns QU (up output) correctly
- [ ] `getCounterField` returns QD (down output) correctly
- [ ] `getCounterField` returns PV (preset value) correctly

### Context Creation
- [ ] `createExecutionContext` creates valid context from store
- [ ] `createRuntimeState` extracts all variables from AST
- [ ] Runtime state tracks previous values for edge detection

---

## 2. Program Runner Tests (`program-runner.test.ts`)

### Scan Cycle Execution
- [ ] `runScanCycle` executes all statements in order
- [ ] `runScanCycle` updates timer elapsed times
- [ ] `runScanCycle` maintains state between calls
- [ ] `runScanCycle` handles empty program gracefully

### Variable Initialization
- [ ] `initializeVariables` sets all declared variables
- [ ] `initializeVariables` respects initial values
- [ ] `initializeVariables` creates timers with correct PT
- [ ] `initializeVariables` creates counters with correct PV
- [ ] `initializeVariables` clears previous state

### Multi-Scan Behavior
- [ ] State persists across multiple scan cycles
- [ ] Timer ET accumulates correctly over scans
- [ ] Counter CV persists across scans
- [ ] Boolean outputs maintain state between scans

---

## 3. Timer Behavior Tests (IEC 61131-3 Compliance)

### TON (On-Delay Timer)
- [ ] Q stays FALSE until ET >= PT
- [ ] Q becomes TRUE when ET reaches PT
- [ ] ET increments while IN is TRUE
- [ ] ET resets to 0 when IN goes FALSE
- [ ] Q resets when IN goes FALSE
- [ ] Rising edge on IN restarts timing
- [ ] ET caps at PT (doesn't exceed)

### TOF (Off-Delay Timer) - if implemented
- [ ] Q is TRUE immediately when IN goes TRUE
- [ ] Q stays TRUE for PT duration after IN goes FALSE
- [ ] ET counts while IN is FALSE and Q is TRUE
- [ ] Q goes FALSE when ET reaches PT

### TP (Pulse Timer) - if implemented
- [ ] Q goes TRUE on rising edge of IN
- [ ] Q stays TRUE for exactly PT duration
- [ ] Q goes FALSE after PT regardless of IN
- [ ] Re-triggering during pulse has no effect

---

## 4. Counter Behavior Tests (IEC 61131-3 Compliance)

### CTU (Count Up)
- [ ] CV increments on rising edge of CU
- [ ] QU becomes TRUE when CV >= PV
- [ ] Reset (R) sets CV to 0
- [ ] CV does not increment when R is TRUE
- [ ] No increment on falling edge

### CTD (Count Down)
- [ ] CV decrements on rising edge of CD
- [ ] QD becomes TRUE when CV <= 0
- [ ] Load (LD) sets CV to PV
- [ ] CV does not go negative

### CTUD (Up/Down Counter)
- [ ] CU increments CV
- [ ] CD decrements CV
- [ ] QU and QD work correctly
- [ ] R resets to 0, LD loads PV

---

## 5. Data Type Tests

### Integer Operations
- [ ] INT comparison with 0 works correctly
- [ ] INT arithmetic preserves sign
- [ ] INT overflow behavior (wrap or clamp)
- [ ] INT division truncates toward zero

### Boolean Operations
- [ ] FALSE compared to FALSE equals TRUE
- [ ] NOT FALSE equals TRUE
- [ ] AND/OR/XOR truth tables correct

### Real Operations
- [ ] REAL comparison with 0.0 works
- [ ] REAL arithmetic precision
- [ ] REAL to INT conversion (truncation)

### Time Operations
- [ ] TIME comparison works
- [ ] TIME arithmetic (addition/subtraction)
- [ ] TIME literal parsing (T#1s, T#100ms, T#1m30s)

---

## 6. Control Flow Tests

### IF Statement
- [ ] Simple IF/THEN executes when TRUE
- [ ] IF/THEN skips when FALSE
- [ ] IF/ELSIF chains work correctly
- [ ] IF/ELSE executes else branch
- [ ] Nested IF statements work

### CASE Statement
- [ ] Single value match
- [ ] Range match (1..10)
- [ ] Multiple labels (1, 2, 3:)
- [ ] ELSE clause when no match
- [ ] First match wins (no fallthrough)

### FOR Loop
- [ ] Correct iteration count
- [ ] Loop variable accessible in body
- [ ] BY clause (step) works
- [ ] Negative step works
- [ ] Max iteration safety limit

### WHILE Loop
- [ ] Executes while condition TRUE
- [ ] Exits when condition FALSE
- [ ] Never executes if initially FALSE
- [ ] Max iteration safety limit

---

## 7. Integration Tests (Real Programs)

### Traffic Light Controller
- [ ] Lights correct in phase 0 (N/S green, E/W red)
- [ ] Lights correct in phase 1 (N/S yellow, E/W red)
- [ ] Lights correct in phase 2 (N/S red, E/W green)
- [ ] Lights correct in phase 3 (N/S red, E/W yellow)
- [ ] Phase transitions at correct intervals
- [ ] Full cycle completes and wraps
- [ ] START button initiates operation
- [ ] STOP button halts operation
- [ ] Emergency stop overrides all

### Motor Starter (simple)
- [ ] Start button sets motor ON
- [ ] Stop button sets motor OFF
- [ ] Interlock prevents conflicting states
- [ ] Status outputs reflect motor state

### Pump with Level Control
- [ ] Pump starts when level low
- [ ] Pump stops when level high
- [ ] Hysteresis prevents rapid cycling
- [ ] Alarm when level critical

---

## 8. Edge Cases and Error Handling

### Invalid Inputs
- [ ] Unknown variable returns default
- [ ] Unknown timer returns undefined/default
- [ ] Unknown counter returns undefined/default
- [ ] Malformed AST doesn't crash

### Boundary Conditions
- [ ] Timer with PT = 0
- [ ] Counter with PV = 0
- [ ] Division by zero
- [ ] Very large numbers
- [ ] Negative time values

### State Consistency
- [ ] Interrupted scan cycle doesn't corrupt state
- [ ] Re-initialization clears all state
- [ ] Concurrent access (if applicable)

---

## Test Priority

### P0 - Critical (blocking bugs)
1. execution-context.test.ts - getVariable zero/false handling
2. program-runner.test.ts - basic scan cycle

### P1 - High (core functionality)
3. Timer behavior compliance
4. Counter behavior compliance
5. Integration tests for traffic light

### P2 - Medium (completeness)
6. All control flow paths
7. All data types
8. Error handling

### P3 - Low (nice to have)
9. Performance tests
10. Stress tests
11. Edge cases

---

## Running Tests

```bash
# All interpreter tests
npm test -- src/interpreter/

# Specific test file
npm test -- src/interpreter/execution-context.test.ts

# With coverage
npm test -- --coverage src/interpreter/

# Watch mode during development
npm test -- --watch src/interpreter/
```
