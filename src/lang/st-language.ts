/**
 * Structured Text Language Support for CodeMirror 6
 *
 * Provides syntax highlighting, indentation, folding, and autocomplete for ST.
 */

import {
  LRLanguage,
  LanguageSupport,
  indentNodeProp,
  foldNodeProp,
  foldInside,
} from '@codemirror/language';
import { completeFromList } from '@codemirror/autocomplete';
import { parser } from './st-parser';
import { stHighlighting } from './st-highlight';

// ============================================================================
// Configure Parser with Metadata
// ============================================================================

const stParserWithMetadata = parser.configure({
  props: [
    stHighlighting,

    // Indentation rules
    indentNodeProp.add({
      ProgramDecl: (context) => context.column(context.node.from) + context.unit,
      FunctionBlockDecl: (context) => context.column(context.node.from) + context.unit,
      VarBlock: (context) => context.column(context.node.from) + context.unit,
      IfStatement: (context) => context.column(context.node.from) + context.unit,
      ElsifClause: (context) => context.column(context.node.from) + context.unit,
      ElseClause: (context) => context.column(context.node.from) + context.unit,
      CaseStatement: (context) => context.column(context.node.from) + context.unit,
      CaseClause: (context) => context.column(context.node.from) + context.unit,
      ForStatement: (context) => context.column(context.node.from) + context.unit,
      WhileStatement: (context) => context.column(context.node.from) + context.unit,
      RepeatStatement: (context) => context.column(context.node.from) + context.unit,
    }),

    // Code folding rules
    foldNodeProp.add({
      ProgramDecl: foldInside,
      FunctionBlockDecl: foldInside,
      VarBlock: foldInside,
      IfStatement: foldInside,
      CaseStatement: foldInside,
      ForStatement: foldInside,
      WhileStatement: foldInside,
      RepeatStatement: foldInside,
    }),
  ],
});

// ============================================================================
// Language Definition
// ============================================================================

export const stLanguage = LRLanguage.define({
  name: 'structured-text',
  parser: stParserWithMetadata,
  languageData: {
    commentTokens: {
      line: '//',
      block: { open: '(*', close: '*)' },
    },
    closeBrackets: {
      brackets: ['(', '[', '"', "'"],
    },
  },
});

// ============================================================================
// Autocomplete Definitions
// ============================================================================

const keywords = [
  // Program structure
  { label: 'PROGRAM', type: 'keyword', detail: 'Program declaration' },
  { label: 'END_PROGRAM', type: 'keyword' },
  { label: 'FUNCTION_BLOCK', type: 'keyword', detail: 'Function block declaration' },
  { label: 'END_FUNCTION_BLOCK', type: 'keyword' },

  // Variable declarations
  { label: 'VAR', type: 'keyword', detail: 'Local variables' },
  { label: 'VAR_INPUT', type: 'keyword', detail: 'Input variables' },
  { label: 'VAR_OUTPUT', type: 'keyword', detail: 'Output variables' },
  { label: 'VAR_IN_OUT', type: 'keyword', detail: 'In/Out variables' },
  { label: 'VAR_TEMP', type: 'keyword', detail: 'Temporary variables' },
  { label: 'END_VAR', type: 'keyword' },

  // Control flow
  { label: 'IF', type: 'keyword' },
  { label: 'THEN', type: 'keyword' },
  { label: 'ELSIF', type: 'keyword' },
  { label: 'ELSE', type: 'keyword' },
  { label: 'END_IF', type: 'keyword' },
  { label: 'CASE', type: 'keyword' },
  { label: 'OF', type: 'keyword' },
  { label: 'END_CASE', type: 'keyword' },
  { label: 'FOR', type: 'keyword' },
  { label: 'TO', type: 'keyword' },
  { label: 'BY', type: 'keyword' },
  { label: 'DO', type: 'keyword' },
  { label: 'END_FOR', type: 'keyword' },
  { label: 'WHILE', type: 'keyword' },
  { label: 'END_WHILE', type: 'keyword' },
  { label: 'REPEAT', type: 'keyword' },
  { label: 'UNTIL', type: 'keyword' },
  { label: 'END_REPEAT', type: 'keyword' },
  { label: 'RETURN', type: 'keyword' },
  { label: 'EXIT', type: 'keyword' },

  // Operators
  { label: 'AND', type: 'keyword', detail: 'Logical AND' },
  { label: 'OR', type: 'keyword', detail: 'Logical OR' },
  { label: 'NOT', type: 'keyword', detail: 'Logical NOT' },
  { label: 'XOR', type: 'keyword', detail: 'Logical XOR' },
  { label: 'MOD', type: 'keyword', detail: 'Modulo operator' },

  // Data types
  { label: 'BOOL', type: 'type', detail: 'Boolean type' },
  { label: 'INT', type: 'type', detail: '16-bit signed integer' },
  { label: 'DINT', type: 'type', detail: '32-bit signed integer' },
  { label: 'UINT', type: 'type', detail: '16-bit unsigned integer' },
  { label: 'REAL', type: 'type', detail: '32-bit floating point' },
  { label: 'TIME', type: 'type', detail: 'Duration type' },
  { label: 'STRING', type: 'type', detail: 'String type' },

  // Timer function blocks
  { label: 'TON', type: 'type', detail: 'On-delay timer' },
  { label: 'TOF', type: 'type', detail: 'Off-delay timer' },
  { label: 'TP', type: 'type', detail: 'Pulse timer' },

  // Counter function blocks
  { label: 'CTU', type: 'type', detail: 'Count up counter' },
  { label: 'CTD', type: 'type', detail: 'Count down counter' },
  { label: 'CTUD', type: 'type', detail: 'Count up/down counter' },

  // Constants
  { label: 'TRUE', type: 'constant', detail: 'Boolean true' },
  { label: 'FALSE', type: 'constant', detail: 'Boolean false' },

  // Array
  { label: 'ARRAY', type: 'keyword' },
];

// Snippets for common patterns
const snippets = [
  {
    label: 'IF-THEN-END_IF',
    type: 'snippet',
    detail: 'If statement',
    apply: 'IF ${condition} THEN\n    ${}\nEND_IF;',
  },
  {
    label: 'IF-THEN-ELSE-END_IF',
    type: 'snippet',
    detail: 'If-else statement',
    apply: 'IF ${condition} THEN\n    ${}\nELSE\n    ${}\nEND_IF;',
  },
  {
    label: 'CASE-OF-END_CASE',
    type: 'snippet',
    detail: 'Case statement',
    apply: 'CASE ${expression} OF\n    0:\n        ${}\n    1:\n        ${}\nEND_CASE;',
  },
  {
    label: 'FOR-DO-END_FOR',
    type: 'snippet',
    detail: 'For loop',
    apply: 'FOR ${i} := 0 TO 10 DO\n    ${}\nEND_FOR;',
  },
  {
    label: 'WHILE-DO-END_WHILE',
    type: 'snippet',
    detail: 'While loop',
    apply: 'WHILE ${condition} DO\n    ${}\nEND_WHILE;',
  },
  {
    label: 'VAR-END_VAR',
    type: 'snippet',
    detail: 'Variable block',
    apply: 'VAR\n    ${name} : ${BOOL};\nEND_VAR',
  },
  {
    label: 'TON-timer',
    type: 'snippet',
    detail: 'TON timer call',
    apply: '${TimerName}(IN := ${condition}, PT := T#${5}s);',
  },
];

const stCompletions = stLanguage.data.of({
  autocomplete: completeFromList([...keywords, ...snippets]),
});

// ============================================================================
// Language Support Export
// ============================================================================

export function structuredText(): LanguageSupport {
  return new LanguageSupport(stLanguage, [stCompletions]);
}

// Re-export parser for direct use
export { parser } from './st-parser';
