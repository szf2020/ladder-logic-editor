# Specs Index

> **Purpose:** This document serves as a searchable index of all specifications in the `specs/` folder. Use the tables below to quickly locate specs by category and keywords.

For project setup and usage, see the [Project README](../README.md).

---

## Feature Specifications

Specifications for planned or implemented application features.

| Spec | Description | Keywords |
|------|-------------|----------|
| [HMI_VISUALIZATION_SPEC](./HMI_VISUALIZATION_SPEC.md) | Visual hardware components (LEDs, motors, traffic lights) wired to ST variables | HMI, canvas, visualization, real-time, hardware |
| [CODE_VIS_SYNC_SPEC](./CODE_VIS_SYNC_SPEC.md) | Bidirectional sync between ST code editor and ladder diagram | cursor, highlight, sync, editor, diagram |
| [DOCUMENTATION_SPEC](./DOCUMENTATION_SPEC.md) | Documentation architecture and user onboarding experience | docs, help, tooltips, onboarding, autocomplete |
| [FILE_MANAGEMENT_SPEC](./FILE_MANAGEMENT_SPEC.md) | Simplified file model - one `.st` file at a time | save, load, file, project, new, open |
| [PANEL_MANAGEMENT_SPEC](./PANEL_MANAGEMENT_SPEC.md) | Desktop panel layout, visibility controls, and usability | panels, layout, resize, visibility, desktop |
| [MOBILE_SPEC](./MOBILE_SPEC.md) | Mobile support with touch-first interactions | mobile, touch, responsive, viewport, gestures |

---

## IEC 61131-3 Reference & Testing

Core interpreter compliance documentation and test specifications.

| Spec | Description | Keywords |
|------|-------------|----------|
| [IEC_61131_3_REFERENCE](./IEC_61131_3_REFERENCE.md) | Quick reference for IEC 61131-3 ST language (includes links to detailed specs in `testing/`) | IEC, standard, reference, data types, operators, timers, counters |
| [IMPLEMENTATION_STATUS](./IMPLEMENTATION_STATUS.md) | Progress tracker for IEC 61131-3 compliance | status, coverage, progress, implemented |
| [INTERPRETER_TEST_SPEC](./INTERPRETER_TEST_SPEC.md) | Master spec for interpreter compliance testing | testing, compliance, Vitest, fast-check |

---

## Examples

Specifications for example programs demonstrating real-world use cases.

| Spec | Description | Keywords |
|------|-------------|----------|
| [PUMP_EXAMPLE_SPEC](./PUMP_EXAMPLE_SPEC.md) | Dual pump control with lead/lag alternation | pump, lead/lag, 2oo3 voting, sensors, alarms |

---

## Visual & Styling

UI consistency and design system specifications.

| Spec | Description | Keywords |
|------|-------------|----------|
| [VISUAL_STYLE](./VISUAL_STYLE.md) | Visual system overhaul with Tailwind + shadcn/ui | Tailwind, shadcn, theme, dark mode, accent |
| [VISUAL_CONSISTENCY_FIXES](./VISUAL_CONSISTENCY_FIXES.md) | CSS inconsistencies and styling issues found | CSS, variables, colors, inconsistency |

---

## Bug Tracking & Maintenance

Bug reports and cleanup documentation.

| Spec | Description | Keywords |
|------|-------------|----------|
| [BUGS](./BUGS.md) | Known bugs (pause/resume, sequence, save) | bugs, pause, resume, save, sequence |
| [BUG_CLEANUP_1](./BUG_CLEANUP_1.md) | Systematic bug exploration with Playwright | bugs, Playwright, testing, exploration |

---

## Ideas & Backlog

Future feature ideas and brainstorming.

| Spec | Description | Keywords |
|------|-------------|----------|
| [IDEAS](./IDEAS.md) | Feature ideas (dual pump visualization, etc.) | ideas, future, brainstorm |

---

## Internal Development

Engineering notes and lessons learned (not feature specs).

| Spec | Description | Keywords |
|------|-------------|----------|
| [GUARDRAILS](./GUARDRAILS.md) | Failed approaches and lessons learned | guardrails, lessons, failed, internal |
| [DOCS_REFACTOR](./DOCS_REFACTOR.md) | Migration from hardcoded docs to markdown files | refactor, docs, markdown, migration |
