# File Management Simplification

## Problem

"Project" vs "File" concepts are muddled. We have "New Project", "New Program", and a ProgramSelector - but we only ever save/load single `.st` files.

## Solution

**One file at a time. That's it.**

```typescript
// The entire state model
interface EditorState {
  fileName: string;      // e.g., "Main" or "PumpController"
  content: string;       // ST source code
  isDirty: boolean;
}
```

## UI Changes

| Before | After |
|--------|-------|
| "New Project" | "New" |
| "Open" (file picker) | "Open" (shows examples + local option) |
| "Save" | "Save" (same) |
| ProgramSelector dropdown with "New Program" | **Remove entirely** |

The "Open" button/menu now shows:
```
┌─────────────────────────┐
│ Examples                │
│   Traffic Controller    │
│   Dual Pump Controller  │
├─────────────────────────┤
│ Open Local File...      │
└─────────────────────────┘
```

## That's All

- No multi-file tabs
- No file switcher component
- No project wrapper
- No programs array

Just: **name**, **content**, **dirty flag**.

"New" clears to template. "Open" loads something else. "Save" downloads.

## Files to Change

1. `store/project-store.ts` → simplify to above 3 fields
2. `components/program-selector/` → delete
3. `models/project.ts` → gut it
4. Toolbar/menu → remove program selector, update "Open" to show examples

## Migration

If localStorage has old format, extract `programs[0].structuredText` and ignore the rest.
