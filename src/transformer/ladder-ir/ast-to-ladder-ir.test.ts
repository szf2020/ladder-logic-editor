/**
 * AST to Ladder IR Integration Tests
 *
 * TDD: Tests the transformation pipeline from ST code to Ladder IR.
 * These tests verify that timers, counters, CASE statements, and nested
 * control structures are correctly transformed into ladder diagram elements.
 */

import { describe, it, expect } from 'vitest';
import { astToLadderIR } from './ast-to-ladder-ir';
import { parseSTToAST } from '../ast';

describe('astToLadderIR', () => {
  describe('Timer function blocks', () => {
    it('generates timer nodes for TON function block calls', () => {
      const st = `
        PROGRAM Test
        VAR
          Timer1: TON;
        END_VAR
        Timer1(IN := TRUE, PT := T#5s);
        END_PROGRAM
      `;
      const ast = parseSTToAST(st);
      const ir = astToLadderIR(ast);

      expect(ir.rungs.length).toBe(1);
      expect(ir.rungs[0].output.type).toBe('timer');
      if (ir.rungs[0].output.type === 'timer') {
        expect(ir.rungs[0].output.instanceName).toBe('Timer1');
        expect(ir.rungs[0].output.timerType).toBe('TON');
        expect(ir.rungs[0].output.presetTime).toBe('T#5s');
      }
    });

    it('generates timer nodes for TOF function block calls', () => {
      const st = `
        PROGRAM Test
        VAR
          OffDelayTimer: TOF;
        END_VAR
        OffDelayTimer(IN := TRUE, PT := T#10s);
        END_PROGRAM
      `;
      const ast = parseSTToAST(st);
      const ir = astToLadderIR(ast);

      expect(ir.rungs.length).toBe(1);
      expect(ir.rungs[0].output.type).toBe('timer');
      if (ir.rungs[0].output.type === 'timer') {
        expect(ir.rungs[0].output.timerType).toBe('TOF');
      }
    });
  });

  describe('Counter function blocks', () => {
    it('generates counter nodes for CTU function block calls', () => {
      const st = `
        PROGRAM Test
        VAR
          Counter1: CTU;
          CountSignal: BOOL;
        END_VAR
        Counter1(CU := CountSignal, PV := 10);
        END_PROGRAM
      `;
      const ast = parseSTToAST(st);
      const ir = astToLadderIR(ast);

      expect(ir.rungs.length).toBe(1);
      expect(ir.rungs[0].output.type).toBe('counter');
      if (ir.rungs[0].output.type === 'counter') {
        expect(ir.rungs[0].output.instanceName).toBe('Counter1');
        expect(ir.rungs[0].output.counterType).toBe('CTU');
        expect(ir.rungs[0].output.presetValue).toBe(10);
      }
    });
  });

  describe('CASE statements', () => {
    it('generates comparator rungs for top-level CASE statements', () => {
      const st = `
        PROGRAM Test
        VAR
          Phase: INT;
          Output1: BOOL;
          Output2: BOOL;
        END_VAR
        CASE Phase OF
          0: Output1 := TRUE;
          1: Output2 := TRUE;
        END_CASE;
        END_PROGRAM
      `;
      const ast = parseSTToAST(st);
      const ir = astToLadderIR(ast);

      // Should have 2 rungs, one for each case
      expect(ir.rungs.length).toBe(2);

      // First rung should have comparator condition (Phase = 0)
      expect(ir.rungs[0].inputNetwork.type).toBe('comparator');
      if (ir.rungs[0].inputNetwork.type === 'comparator') {
        expect(ir.rungs[0].inputNetwork.operator).toBe('EQ');
        expect(ir.rungs[0].inputNetwork.leftOperand).toBe('Phase');
        expect(ir.rungs[0].inputNetwork.rightOperand).toBe('0');
      }
    });
  });

  describe('Nested control structures', () => {
    it('generates timer nodes for function blocks inside CASE inside IF', () => {
      const st = `
        PROGRAM Test
        VAR
          Running: BOOL;
          Phase: INT;
          Timer1: TON;
        END_VAR
        IF Running THEN
          CASE Phase OF
            0: Timer1(IN := TRUE, PT := T#5s);
          END_CASE;
        END_IF;
        END_PROGRAM
      `;
      const ast = parseSTToAST(st);
      const ir = astToLadderIR(ast);

      // Should have at least 1 rung with a timer output
      expect(ir.rungs.length).toBeGreaterThan(0);
      const timerRung = ir.rungs.find(r => r.output.type === 'timer');
      expect(timerRung).toBeDefined();
      if (timerRung && timerRung.output.type === 'timer') {
        expect(timerRung.output.instanceName).toBe('Timer1');
        expect(timerRung.output.timerType).toBe('TON');
      }
    });

    it('generates multiple timer nodes from traffic controller pattern', () => {
      const st = `
        PROGRAM TrafficController
        VAR
          Running: BOOL;
          CurrentPhase: INT;
          Phase1Timer: TON;
          Phase2Timer: TON;
          GreenTime: TIME := T#60s;
          YellowTime: TIME := T#5s;
        END_VAR
        IF Running THEN
          CASE CurrentPhase OF
            0: Phase1Timer(IN := TRUE, PT := GreenTime);
            1: Phase2Timer(IN := TRUE, PT := YellowTime);
          END_CASE;
        END_IF;
        END_PROGRAM
      `;
      const ast = parseSTToAST(st);
      const ir = astToLadderIR(ast);

      // Should have rungs for both timers
      const timerRungs = ir.rungs.filter(r => r.output.type === 'timer');
      expect(timerRungs.length).toBe(2);

      // Check that both timers are present
      const timerNames = timerRungs.map(r =>
        r.output.type === 'timer' ? r.output.instanceName : ''
      );
      expect(timerNames).toContain('Phase1Timer');
      expect(timerNames).toContain('Phase2Timer');
    });

    it('preserves IF condition in nested CASE statement rungs', () => {
      const st = `
        PROGRAM Test
        VAR
          Running: BOOL;
          Phase: INT;
          Output1: BOOL;
        END_VAR
        IF Running THEN
          CASE Phase OF
            0: Output1 := TRUE;
          END_CASE;
        END_IF;
        END_PROGRAM
      `;
      const ast = parseSTToAST(st);
      const ir = astToLadderIR(ast);

      expect(ir.rungs.length).toBe(1);

      // The input network should be a series of Running AND (Phase = 0)
      const network = ir.rungs[0].inputNetwork;
      expect(network.type).toBe('series');
      if (network.type === 'series') {
        expect(network.elements.length).toBe(2);
        // First element should be Running contact
        expect(network.elements[0].type).toBe('contact');
        // Second element should be comparator
        expect(network.elements[1].type).toBe('comparator');
      }
    });

    it('handles nested IF statements inside IF', () => {
      const st = `
        PROGRAM Test
        VAR
          Condition1: BOOL;
          Condition2: BOOL;
          Output1: BOOL;
        END_VAR
        IF Condition1 THEN
          IF Condition2 THEN
            Output1 := TRUE;
          END_IF;
        END_IF;
        END_PROGRAM
      `;
      const ast = parseSTToAST(st);
      const ir = astToLadderIR(ast);

      expect(ir.rungs.length).toBe(1);
      // Input should be series of both conditions
      const network = ir.rungs[0].inputNetwork;
      expect(network.type).toBe('series');
    });

    it('handles CASE statements with multiple statements per case', () => {
      const st = `
        PROGRAM Test
        VAR
          Phase: INT;
          Output1: BOOL;
          Output2: BOOL;
        END_VAR
        CASE Phase OF
          0:
            Output1 := TRUE;
            Output2 := FALSE;
        END_CASE;
        END_PROGRAM
      `;
      const ast = parseSTToAST(st);
      const ir = astToLadderIR(ast);

      // Should have 2 rungs for the 2 assignments
      expect(ir.rungs.length).toBe(2);
    });
  });

  describe('Function block registration', () => {
    it('registers timer function blocks from VAR declarations', () => {
      const st = `
        PROGRAM Test
        VAR
          MyTimer: TON;
        END_VAR
        MyTimer(IN := TRUE, PT := T#1s);
        END_PROGRAM
      `;
      const ast = parseSTToAST(st);
      const ir = astToLadderIR(ast);

      // Timer should be registered and create a timer output (not a fallback coil)
      expect(ir.rungs[0].output.type).toBe('timer');
    });

    it('falls back to coil for unregistered function blocks', () => {
      const st = `
        PROGRAM Test
        VAR
          (* No timer declared *)
        END_VAR
        UnknownTimer(IN := TRUE, PT := T#1s);
        END_PROGRAM
      `;
      const ast = parseSTToAST(st);
      const ir = astToLadderIR(ast);

      // Should fall back to coil since UnknownTimer is not declared
      expect(ir.rungs[0].output.type).toBe('coil');
    });
  });
});
