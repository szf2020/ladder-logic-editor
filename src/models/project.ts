/**
 * Project File Structure
 *
 * Source of Truth: Structured Text (ST)
 * The visual editor renders from ST, and edits are saved back to ST.
 */

import type { VariableDeclaration } from './plc-types';
import type { LadderDiagram } from './ladder-elements';
import type { IntersectionNetwork } from './traffic-controller';

// ============================================================================
// Project Metadata
// ============================================================================

export interface ProjectMetadata {
  version: string;
  name: string;
  description?: string;
  author?: string;
  created: string;  // ISO date string
  modified: string; // ISO date string
  editorVersion: string;
}

// ============================================================================
// Program Unit
// ============================================================================

export interface ProgramUnit {
  id: string;
  name: string;
  type: 'PROGRAM' | 'FUNCTION_BLOCK' | 'FUNCTION';

  // ST is source of truth
  structuredText: string;

  // Ladder representation (derived from ST)
  ladder?: LadderDiagram;

  // Sync state
  lastSyncSource: 'ladder' | 'st';
  syncValid: boolean;

  // Local variables
  variables: VariableDeclaration[];
}

// ============================================================================
// Project Configuration
// ============================================================================

export interface TrafficControllerConfig {
  type: 'traffic-controller';
  network: IntersectionNetwork;
}

export type ProjectConfiguration = TrafficControllerConfig;

// ============================================================================
// Complete Project
// ============================================================================

export interface LadderProject {
  meta: ProjectMetadata;
  programs: ProgramUnit[];
  globalVariables: VariableDeclaration[];
  configuration?: ProjectConfiguration;
}

// ============================================================================
// Project File Format (JSON)
// ============================================================================

export const PROJECT_FILE_EXTENSION = '.ladderproj';
export const EDITOR_VERSION = '1.0.0';

export interface ProjectFile {
  $schema: string;
  project: LadderProject;
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createNewProject(name: string): LadderProject {
  const now = new Date().toISOString();

  return {
    meta: {
      version: '1.0',
      name,
      created: now,
      modified: now,
      editorVersion: EDITOR_VERSION,
    },
    programs: [
      createNewProgram('Main', 'PROGRAM'),
    ],
    globalVariables: [],
  };
}

export function createNewProgram(
  name: string,
  type: 'PROGRAM' | 'FUNCTION_BLOCK' | 'FUNCTION'
): ProgramUnit {
  return {
    id: `program_${Date.now()}`,
    name,
    type,
    structuredText: getDefaultProgramTemplate(name, type),
    lastSyncSource: 'st',
    syncValid: true,
    variables: [],
  };
}

function getDefaultProgramTemplate(
  name: string,
  type: 'PROGRAM' | 'FUNCTION_BLOCK' | 'FUNCTION'
): string {
  return `${type} ${name}

VAR_INPUT
    (* Input variables *)
END_VAR

VAR_OUTPUT
    (* Output variables *)
END_VAR

VAR
    (* Local variables *)
END_VAR

(* Program logic *)

END_${type}
`;
}

/**
 * Create a traffic controller program with default ST code
 */
export function createTrafficControllerProgram(): ProgramUnit {
  const st = `PROGRAM TrafficController

VAR_INPUT
    START_BTN : BOOL;   (* Start button *)
    STOP_BTN : BOOL;    (* Stop button *)
    ESTOP : BOOL;       (* Emergency stop *)
END_VAR

VAR_OUTPUT
    (* North Direction *)
    N_RED : BOOL;
    N_YEL : BOOL;
    N_GRN : BOOL;
    (* South Direction *)
    S_RED : BOOL;
    S_YEL : BOOL;
    S_GRN : BOOL;
    (* East Direction *)
    E_RED : BOOL;
    E_YEL : BOOL;
    E_GRN : BOOL;
    (* West Direction *)
    W_RED : BOOL;
    W_YEL : BOOL;
    W_GRN : BOOL;
END_VAR

VAR
    (* State machine *)
    CurrentPhase : INT := 0;
    Running : BOOL := FALSE;

    (* Phase timers *)
    Phase1Timer : TON;
    Phase2Timer : TON;
    Phase3Timer : TON;
    Phase4Timer : TON;

    (* Timing constants *)
    GreenTime : TIME := T#60s;
    YellowTime : TIME := T#5s;
END_VAR

(* Start/Stop Logic *)
IF START_BTN AND NOT ESTOP THEN
    Running := TRUE;
END_IF;

IF STOP_BTN OR ESTOP THEN
    Running := FALSE;
    CurrentPhase := 0;
END_IF;

(* Phase State Machine *)
IF Running THEN
    CASE CurrentPhase OF
        0: (* North-South Green *)
            Phase1Timer(IN := TRUE, PT := GreenTime);
            IF Phase1Timer.Q THEN
                Phase1Timer(IN := FALSE);
                CurrentPhase := 1;
            END_IF;

        1: (* North-South Yellow *)
            Phase2Timer(IN := TRUE, PT := YellowTime);
            IF Phase2Timer.Q THEN
                Phase2Timer(IN := FALSE);
                CurrentPhase := 2;
            END_IF;

        2: (* East-West Green *)
            Phase3Timer(IN := TRUE, PT := GreenTime);
            IF Phase3Timer.Q THEN
                Phase3Timer(IN := FALSE);
                CurrentPhase := 3;
            END_IF;

        3: (* East-West Yellow *)
            Phase4Timer(IN := TRUE, PT := YellowTime);
            IF Phase4Timer.Q THEN
                Phase4Timer(IN := FALSE);
                CurrentPhase := 0;
            END_IF;
    END_CASE;
END_IF;

(* Output Logic - North/South *)
N_GRN := Running AND (CurrentPhase = 0);
N_YEL := Running AND (CurrentPhase = 1);
N_RED := Running AND (CurrentPhase = 2 OR CurrentPhase = 3);

S_GRN := Running AND (CurrentPhase = 0);
S_YEL := Running AND (CurrentPhase = 1);
S_RED := Running AND (CurrentPhase = 2 OR CurrentPhase = 3);

(* Output Logic - East/West *)
E_GRN := Running AND (CurrentPhase = 2);
E_YEL := Running AND (CurrentPhase = 3);
E_RED := Running AND (CurrentPhase = 0 OR CurrentPhase = 1);

W_GRN := Running AND (CurrentPhase = 2);
W_YEL := Running AND (CurrentPhase = 3);
W_RED := Running AND (CurrentPhase = 0 OR CurrentPhase = 1);

(* Safety: All red if not running *)
IF NOT Running THEN
    N_RED := TRUE; S_RED := TRUE; E_RED := TRUE; W_RED := TRUE;
    N_YEL := FALSE; S_YEL := FALSE; E_YEL := FALSE; W_YEL := FALSE;
    N_GRN := FALSE; S_GRN := FALSE; E_GRN := FALSE; W_GRN := FALSE;
END_IF;

END_PROGRAM
`;

  return {
    id: 'traffic_controller_main',
    name: 'TrafficController',
    type: 'PROGRAM',
    structuredText: st,
    lastSyncSource: 'st',
    syncValid: true,
    variables: [],
  };
}

// ============================================================================
// Model Index Export
// ============================================================================

export * from './plc-types';
export * from './ladder-elements';
export * from './traffic-controller';
