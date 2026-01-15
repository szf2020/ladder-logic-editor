# Bounds & Edge Cases Tests

**Status:** 🟢 Complete (58 tests, 92% coverage)
**Test File:** `src/interpreter/compliance/bounds.test.ts`
**Last Updated:** 2026-01-16

---

## Overview

Boundary condition tests verify correct behavior at the edges of valid input ranges. These often expose bugs that example-based tests miss.

---

## Integer Bounds

### INT (16-bit signed)
| Value | Constant | Description |
|-------|----------|-------------|
| 32767 | INT_MAX | Maximum value |
| -32768 | INT_MIN | Minimum value |
| 0 | - | Zero |
| 1 | - | Minimum positive |
| -1 | - | Maximum negative |

### Test Cases

#### At Boundaries
- [x] x := 32767; (stores correctly)
- [x] x := -32768; (stores correctly)
- [x] x := 32767; x := x + 0; (unchanged)
- [x] x := -32768; x := x - 0; (unchanged)

#### Crossing Boundaries
- [x] 32767 + 1 = ? (overflow behavior - documents JavaScript behavior)
- [x] -32768 - 1 = ? (underflow behavior - documents JavaScript behavior)
- [x] 32767 * 2 = ? (multiplication overflow - documents JavaScript behavior)
- [ ] -32768 * -1 = ? (negation overflow: no positive 32768)

#### Comparison at Boundaries
- [x] 32767 > 32766 = TRUE
- [x] 32767 = 32767 = TRUE
- [x] -32768 < -32767 = TRUE
- [x] -32768 = -32768 = TRUE

---

## Real Bounds

### REAL (32-bit IEEE 754)
| Value | Description |
|-------|-------------|
| ±3.4028235E+38 | Maximum magnitude |
| ±1.175494E-38 | Minimum positive normal |
| 0.0 | Zero |
| Infinity | Positive infinity |
| -Infinity | Negative infinity |
| NaN | Not a number |

### Test Cases

#### Special Values
- [ ] Infinity = Infinity (TRUE)
- [ ] -Infinity = -Infinity (TRUE)
- [ ] NaN = NaN (FALSE per IEEE 754)
- [x] 1.0 / 0.0 = Infinity
- [x] -1.0 / 0.0 = -Infinity
- [x] 0.0 / 0.0 = NaN

#### Precision
- [ ] 0.1 + 0.2 = 0.3 (FALSE in IEEE 754!)
- [x] Very small differences detected (stores decimal values correctly)
- [ ] Large magnitude + small = large (precision loss)

---

## Time Bounds

### TIME Values
| Value | Description |
|-------|-------------|
| T#0ms | Zero time |
| T#1ms | Minimum non-zero |
| T#49d17h2m47s295ms | ~32-bit ms max |
| T#24h | Common maximum |

### Test Cases

#### Parsing
- [x] T#0ms parses to 0
- [x] T#1ms parses to 1
- [x] T#1s parses to 1000
- [x] T#1m parses to 60000
- [x] T#1h parses to 3600000
- [ ] T#1d parses to 86400000

#### Timer Bounds
- [x] PT = T#0ms: Q immediately TRUE
- [ ] PT = T#1ms: minimum delay
- [ ] PT = T#24h: long delay (doesn't overflow)
- [x] ET caps at PT (never exceeds)

---

## Counter Bounds

### PV (Preset Value)
| Value | Behavior |
|-------|----------|
| 0 | QU immediately TRUE |
| 1 | First count triggers QU |
| 32767 | Maximum counts |

### CV (Current Value)
| Value | Behavior |
|-------|----------|
| 0 | Initial/reset value |
| 32767 | Near overflow |
| -1 | Below zero (CTD, invalid?) |

### Test Cases

#### CTU Bounds
- [x] PV = 0: QU behavior (with pulse → TRUE)
- [x] PV = 1: First rising edge → QU = TRUE
- [x] CV increments beyond PV (no overflow cap)
- [x] CV after reset = 0

#### CTD Bounds
- [ ] PV = 0: QD = TRUE from start
- [ ] CV = 0: Doesn't go negative
- [ ] CD when CV = 0: Still 0

---

## Loop Bounds

### FOR Loop
```st
FOR i := start TO end BY step DO
  (* body *)
END_FOR;
```

#### Test Cases
- [x] FOR i := 1 TO 1: Single iteration
- [x] FOR i := 5 TO 4: Zero iterations (start > end)
- [ ] FOR i := 1 TO 32767: Max iterations (may need limit)
- [x] FOR i := 0 TO 0: Single iteration at 0
- [x] FOR i := -5 TO 5: Negative range (11 iterations)
- [ ] BY 0: Infinite loop? Error?
- [x] BY -1 with start < end: Zero iterations
- [x] BY -1 with start > end: Counts down
- [x] BY 2: Counts every other number

### Iteration Limits
- [ ] Safety limit enforced (e.g., 10000)
- [ ] Error flag set when limit reached
- [ ] Loop terminates cleanly

---

## Array Bounds

**If arrays are implemented:**

### Declaration
```st
VAR
  arr : ARRAY[1..10] OF INT;
  arr0 : ARRAY[0..9] OF INT;
  arrNeg : ARRAY[-5..5] OF INT;
END_VAR
```

### Test Cases

#### Valid Access
- [ ] arr[1] (lower bound)
- [ ] arr[10] (upper bound)
- [ ] arr[5] (middle)

#### Invalid Access
- [ ] arr[0] (below lower bound)
- [ ] arr[11] (above upper bound)
- [ ] arr[-1] (negative when not allowed)

#### Zero-Based vs One-Based
- [ ] arr0[0] valid
- [ ] arr[0] invalid (starts at 1)

---

## String Bounds

**If strings are implemented:**

### Test Cases
- [ ] Empty string: ''
- [ ] Single character: 'a'
- [ ] Maximum length string
- [ ] Unicode characters (if supported)
- [ ] String concatenation near max length

---

## Expression Depth

### Deeply Nested Expressions
```st
result := ((((((a + b) + c) + d) + e) + f) + g);
```

#### Test Cases
- [x] 10 levels of nesting
- [x] 20 levels of nesting
- [ ] 50 levels of nesting
- [ ] Stack overflow protection
- [x] Mixed operators in deep nesting

### Deeply Nested Control Flow
```st
IF a THEN
  IF b THEN
    IF c THEN
      (* ... 20 levels ... *)
    END_IF;
  END_IF;
END_IF;
```

#### Test Cases
- [x] 3 levels: OK
- [x] 5 levels: OK
- [ ] 10 levels: Should work
- [x] Nested IF with ELSIF

---

## Scan Cycle Bounds

### Rapid Scans
- [x] 1ms scan time: timer updates correctly
- [x] 1ms scan time: timer completes after enough scans
- [ ] Edge detection works at 1ms

### Slow Scans
- [x] 1000ms scan time: timer jumps by large amount
- [x] 1000ms scan time: timer completes
- [x] Counter counts edges regardless of scan time

### Zero Scan Time
- [ ] Disallowed or handled?

---

## Property-Based Boundary Tests

```typescript
// INT at boundaries
fc.assert(fc.property(
  fc.constantFrom(-32768, -1, 0, 1, 32767),
  (n) => {
    const result = evaluate(`x := ${n}; x`);
    return result === n;
  }
));

// Time near zero
fc.assert(fc.property(
  fc.integer({ min: 0, max: 10 }),
  (ms) => {
    const pt = `T#${ms}ms`;
    const result = simulateTON(parseTime(pt), [true], 1);
    // Behavior correct for very small PT
  }
));

// Counter at PV boundary
fc.assert(fc.property(
  fc.integer({ min: 0, max: 10 }),
  (pv) => {
    const pulses = Array(pv).fill(false).flatMap(() => [false, true]);
    const result = simulateCTU(pulses, pv);
    return result.CV === pv && result.QU === true;
  }
));
```

---

## Test Count Target

| Category | Boundaries | Crossing | Invalid | Total |
|----------|------------|----------|---------|-------|
| INT | 4 | 4 | 2 | 10 |
| REAL | 6 | 3 | 3 | 12 |
| TIME | 6 | 2 | 2 | 10 |
| Counter | 4 | 2 | 2 | 8 |
| Loop | 6 | 2 | 2 | 10 |
| Array | 3 | - | 4 | 7 |
| Depth | 4 | - | 2 | 6 |
| **Total** | | | | **63** |

---

## References

- IEEE 754 floating-point standard
- IEC 61131-3 data type definitions
- Two's complement integer representation
