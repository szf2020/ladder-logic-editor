/**
 * Program Runner
 *
 * Orchestrates the execution of ST programs in scan cycles.
 * This is the main entry point for running the interpreter.
 */

import type { STAST } from '../transformer/ast/st-ast-types';
import { executeStatements } from './statement-executor';
import { createExecutionContext, type SimulationStoreInterface, type RuntimeState } from './execution-context';

// ============================================================================
// Main Run Function
// ============================================================================

/**
 * Run a single scan cycle of the ST program.
 *
 * This executes all statements in all programs in the AST,
 * then updates timer elapsed times.
 *
 * @param ast - The AST to execute
 * @param store - The simulation store
 * @param runtimeState - Runtime state for edge detection
 */
export function runScanCycle(
  ast: STAST,
  store: SimulationStoreInterface,
  runtimeState: RuntimeState
): void {
  // Create execution context
  const context = createExecutionContext(store, runtimeState);

  // Execute each program's statements
  for (const program of ast.programs) {
    executeStatements(program.statements, context);
  }

  // Execute top-level statements (if any)
  if (ast.topLevelStatements.length > 0) {
    executeStatements(ast.topLevelStatements, context);
  }

  // Update all timer elapsed times
  const scanTime = store.scanTime;
  for (const timerName of Object.keys(store.timers)) {
    store.updateTimer(timerName, scanTime);
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Execute a single statement from an AST (useful for debugging/stepping).
 *
 * @param ast - The AST containing the program
 * @param store - The simulation store
 * @param runtimeState - Runtime state
 * @param programIndex - Which program to execute (default: 0)
 * @param statementIndex - Which statement to execute
 */
export function executeOneStatement(
  ast: STAST,
  store: SimulationStoreInterface,
  runtimeState: RuntimeState,
  programIndex: number = 0,
  statementIndex: number
): void {
  const context = createExecutionContext(store, runtimeState);

  const program = ast.programs[programIndex];
  if (!program) return;

  const stmt = program.statements[statementIndex];
  if (!stmt) return;

  executeStatements([stmt], context);
}

/**
 * Get the total number of statements across all programs.
 *
 * @param ast - The AST
 * @returns Total statement count
 */
export function getTotalStatementCount(ast: STAST): number {
  let count = 0;
  for (const program of ast.programs) {
    count += program.statements.length;
  }
  count += ast.topLevelStatements.length;
  return count;
}
