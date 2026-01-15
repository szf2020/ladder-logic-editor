# Testing Gaps Analysis

## Current State: Foundation Only

The existing tests provide basic coverage but **do not provide confidence** in IEC 61131-3 compliance or production readiness.

---

## CRITICAL GAPS

### 1. Timer Compliance Tests (IEC 61131-3 Section 2.5.1)

**TON (On-Delay Timer)** - We have minimal tests
```
Required behavior per standard:
- Q := FALSE when IN := FALSE
- When IN goes TRUE: ET starts at 0, counts up
- When ET >= PT: Q := TRUE, ET stops at PT
- When IN goes FALSE: Q := FALSE, ET := 0 immediately
- Re-triggering while timing restarts from 0
```

**TOF (Off-Delay Timer)** - NO TESTS
```
Required behavior:
- Q := TRUE immediately when IN := TRUE
- When IN goes FALSE: ET starts at 0, counts up
- When ET >= PT: Q := FALSE
- Q stays TRUE for PT duration after IN goes FALSE
```

**TP (Pulse Timer)** - NO TESTS
```
Required behavior:
- Rising edge on IN: Q := TRUE, ET := 0
- Q stays TRUE for exactly PT duration
- Q := FALSE after PT regardless of IN state
- Re-triggering during pulse has NO effect (key difference!)
```

### 2. Counter Compliance Tests (IEC 61131-3 Section 2.5.2)

**Edge Detection** - Minimal tests
```
Required behavior:
- Count ONLY on rising edge (FALSE→TRUE transition)
- Must NOT count on:
  - Falling edge
  - Sustained TRUE
  - Sustained FALSE
```

**CTU bounds** - NO TESTS
```
- What happens at INT max value?
- Does CV wrap or clamp?
```

**CTUD simultaneous inputs** - NO TESTS
```
- What if CU and CD are both TRUE on same scan?
- Priority rules per standard
```

### 3. Data Type Compliance (IEC 61131-3 Section 2.3)

**Integer overflow** - NO TESTS
```
- INT range: -32768 to 32767
- DINT range: -2147483648 to 2147483647
- Overflow behavior: wrap? clamp? error?
```

**REAL precision** - NO TESTS
```
- Floating point comparison edge cases
- Division by near-zero
- NaN/Infinity handling
```

**TIME arithmetic** - NO TESTS
```
- TIME + TIME
- TIME - TIME
- Negative time handling
```

**Type coercion rules** - MINIMAL TESTS
```
- INT + REAL = ?
- BOOL in arithmetic context
- Implicit vs explicit conversion
```

### 4. Operator Precedence (IEC 61131-3 Section 3.3.1)

**NO TESTS for precedence**
```
Standard precedence (high to low):
1. () parentheses
2. ** exponentiation
3. - NOT (unary)
4. * / MOD
5. + -
6. < > <= >= = <>
7. AND &
8. XOR
9. OR
```

Example test needed:
```st
(* Should equal 14, not 20 *)
Result := 2 + 3 * 4;
```

### 5. Control Flow Edge Cases

**Nested loops** - NO TESTS
```st
FOR i := 0 TO 10 DO
  FOR j := 0 TO 10 DO
    (* 121 iterations total *)
  END_FOR;
END_FOR;
```

**EXIT statement** - NO TESTS
```st
FOR i := 0 TO 100 DO
  IF condition THEN
    EXIT; (* Should exit only inner loop *)
  END_IF;
END_FOR;
```

**RETURN statement** - NO TESTS
```st
IF error THEN
  RETURN; (* Should exit program/function *)
END_IF;
```

### 6. Parser Coverage

**NO PARSER-SPECIFIC TESTS for:**
- Comments (* nested (* comments *) *)
- String literals with escapes
- Time literal formats (T#1d2h3m4s5ms)
- Hexadecimal literals (16#FF)
- Binary literals (2#1010)
- Scientific notation (1.5E-10)
- Array declarations
- Struct/UDT declarations
- CASE with enumerated types

### 7. End-to-End Integration

**NO TESTS for:**
- Full ST → AST → Ladder IR → ReactFlow pipeline
- Simulation start/stop/pause/resume
- Variable watch panel updates
- Ladder diagram visual state
- Browser timing accuracy
- Large program performance

### 8. Real Industrial Patterns

**Only traffic light tested. Missing:**
- Motor starter with thermal overload
- Dual pump alternation
- PID control loop
- Batch sequencing
- Alarm annunciation
- Conveyor control
- Valve interlock logic

---

## RECOMMENDED TEST STRUCTURE

```
src/interpreter/
├── __tests__/
│   ├── compliance/           # IEC 61131-3 spec tests
│   │   ├── timers.test.ts    # TON, TOF, TP full behavior
│   │   ├── counters.test.ts  # CTU, CTD, CTUD edge cases
│   │   ├── datatypes.test.ts # Overflow, precision, coercion
│   │   └── operators.test.ts # Precedence, all operators
│   │
│   ├── integration/          # Full program tests
│   │   ├── traffic-light.test.ts
│   │   ├── motor-starter.test.ts
│   │   ├── pump-control.test.ts
│   │   └── alarm-handler.test.ts
│   │
│   ├── parser/               # ST parsing edge cases
│   │   ├── literals.test.ts
│   │   ├── expressions.test.ts
│   │   └── statements.test.ts
│   │
│   └── regression/           # Bug reproduction tests
│       └── phase-zero-bug.test.ts
```

---

## MINIMUM VIABLE CONFIDENCE

To claim "IEC 61131-3 compliant", you need at minimum:

1. **Timer compliance suite** - 50+ tests covering all timer types
2. **Counter compliance suite** - 30+ tests with edge detection
3. **Data type tests** - 40+ tests for all types and conversions
4. **Operator precedence** - 20+ tests for expression evaluation
5. **3+ real industrial programs** - Tested end-to-end

Current state: ~175 tests
Recommended minimum: ~400 tests

---

## QUICK WINS (High Value, Low Effort)

1. Add TON timer edge case tests (timing accuracy, reset behavior)
2. Add operator precedence tests (catches subtle bugs)
3. Add 2 more industrial program tests (pump, motor)
4. Add parser literal tests (catches syntax edge cases)

These 4 additions would roughly double confidence level.
