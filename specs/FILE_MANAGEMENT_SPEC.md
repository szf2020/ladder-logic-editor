# File Management Simplification Spec

## Problem Statement

The current implementation conflates two concepts:

1. **Project** - A container that holds multiple programs, global variables, and configuration
2. **File** - A single `.st` file containing Structured Text code

This creates user confusion:
- "New" button creates a "New Project"
- "New Program" in the dropdown adds a program to the project
- But save/open operations work with individual `.st` files
- The source of truth is `.st` files, yet we wrap them in a "project" abstraction

**The fundamental issue:** We say ST files are the source of truth, but the UI and data model still revolve around "projects".

## Current Architecture

```
LadderProject (container)
├── meta: ProjectMetadata
├── programs: ProgramUnit[]     ← Multiple programs in one "project"
├── globalVariables: []
└── configuration?: {}

UI Flow:
- "New" → Creates new LadderProject with one empty program
- "Open" → Loads .st file, wraps it in a new LadderProject
- "Save" → Downloads the current program's ST code as .st file
- "New Program" (dropdown) → Adds program to current project
- ProgramSelector → Switches between programs in same project
```

The mismatch: We save/load individual `.st` files but the model supports multiple programs per project, leading to conceptual confusion.

## Proposed Architecture

**Principle:** The editor works with **files**, not projects. Each open file is independent.

```
FileStore (new)
├── openFiles: Map<fileId, OpenFile>
├── activeFileId: string | null
├── recentFiles: RecentFileEntry[]

OpenFile
├── id: string
├── name: string
├── filePath: string | null     ← null if unsaved
├── content: string             ← ST source code
├── isDirty: boolean
├── lastSaved: Date | null
└── derived: { nodes, edges, ast } ← Computed from content

UI Flow:
- "New" → Creates new unsaved file with template
- "Open" → Loads .st file as new OpenFile entry
- "Save" → Downloads active file as .st
- File Switcher → Switches between open files (tabs metaphor)
- Close file → Removes from openFiles (with unsaved warning)
```

## Implementation Plan

### Phase 1: Simplify Data Model

**Remove:**
- `LadderProject` type (or deprecate)
- `programs: ProgramUnit[]` concept
- `globalVariables` (can add back later if needed)
- `configuration` (can add back for specific templates)

**Add:**
- `OpenFile` type - represents a single open file
- `FileStore` - manages open files

```typescript
// models/file.ts
interface OpenFile {
  id: string;
  name: string;                    // Display name (from PROGRAM name or filename)
  filePath: string | null;         // null = never saved
  content: string;                 // ST source code
  isDirty: boolean;
  lastSaved: Date | null;
}

// store/file-store.ts
interface FileState {
  openFiles: Map<string, OpenFile>;
  activeFileId: string | null;
  recentFiles: RecentFileEntry[];   // For "Open Recent" feature

  // Actions
  newFile: () => void;
  openFile: (content: string, filePath?: string) => void;
  closeFile: (fileId: string) => void;
  setActiveFile: (fileId: string) => void;
  updateContent: (fileId: string, content: string) => void;
  saveFile: (fileId: string) => void;
  saveFileAs: (fileId: string) => void;
}
```

### Phase 2: Update UI Components

**Toolbar changes:**
| Before | After |
|--------|-------|
| "New" (creates project) | "New" (creates file) |
| "Open" | "Open" (same) |
| "Save" | "Save" (same) |

**ProgramSelector → FileSwitcher:**
| Before | After |
|--------|-------|
| Dropdown of programs in project | Tab-style file switcher |
| "New Program" adds to project | Removed (use "New" button) |
| Single project context | Multiple independent files |

```tsx
// components/file-switcher/FileSwitcher.tsx
function FileSwitcher() {
  const openFiles = useFileStore(s => s.openFiles);
  const activeFileId = useFileStore(s => s.activeFileId);
  const setActiveFile = useFileStore(s => s.setActiveFile);
  const closeFile = useFileStore(s => s.closeFile);

  return (
    <div className="file-switcher">
      {[...openFiles.values()].map(file => (
        <div
          key={file.id}
          className={`file-tab ${file.id === activeFileId ? 'active' : ''}`}
          onClick={() => setActiveFile(file.id)}
        >
          <span className="file-name">
            {file.name}{file.isDirty ? ' *' : ''}
          </span>
          <button
            className="close-btn"
            onClick={(e) => { e.stopPropagation(); closeFile(file.id); }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
```

### Phase 3: Update File Service

```typescript
// services/file-service.ts

// Simplified - no project wrapper
function saveSTFile(name: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain' });
  const filename = `${sanitizeFilename(name)}.st`;
  downloadBlob(blob, filename);
}

function openSTFile(): Promise<{ content: string; filename: string }> {
  // Returns raw content + filename, no project wrapping
}

// localStorage stores list of open files
interface LocalStorageState {
  openFiles: SerializedOpenFile[];
  activeFileId: string | null;
}
```

### Phase 4: Migration & Backwards Compatibility

For users with existing localStorage data:
1. Detect old format (`project.programs[]`)
2. Convert each program to an OpenFile
3. Clear old format, save new format
4. Show notification: "Your files have been migrated to the new format"

```typescript
function migrateFromLegacy(): OpenFile[] {
  const legacy = localStorage.getItem('ladder-logic-editor-project');
  if (!legacy) return [];

  const data = JSON.parse(legacy);
  if (!data.project?.programs) return [];

  return data.project.programs.map(program => ({
    id: crypto.randomUUID(),
    name: program.name,
    filePath: null,
    content: program.structuredText,
    isDirty: false,
    lastSaved: null,
  }));
}
```

## UI Mockups

### Desktop Toolbar (After)
```
┌─────────────────────────────────────────────────────────────────┐
│ [New] [Open] [Save]  │  [Main.st ×] [Pump.st ×] [+]  │  [▶ Run] │
└─────────────────────────────────────────────────────────────────┘
                            ↑ File tabs with close buttons
```

### Mobile Menu (After)
```
┌──────────────────┐
│ ☰ Menu           │
├──────────────────┤
│ 📄 New File      │  ← Was "New Project"
│ 📂 Open File     │
│ 💾 Save          │
│ 💾 Save As...    │  ← New option
├──────────────────┤
│ Recent Files     │  ← Future enhancement
│   └ Pump.st      │
│   └ Traffic.st   │
└──────────────────┘
```

### File Switcher (Mobile)
```
┌───────────────────────────────────┐
│ [Main.st ▼]                       │  ← Dropdown on mobile
└───────────────────────────────────┘

Dropdown expanded:
┌───────────────────────────────────┐
│ Main.st              ✓            │
│ PumpController.st                 │
│ TrafficLight.st *    [×]          │  ← * indicates unsaved
└───────────────────────────────────┘
```

## Future Enhancements (Out of Scope)

These are **not** part of this spec but noted for future consideration:

### Folder Organization
- Virtual folders in the file switcher
- Group related files together
- Persist folder structure in localStorage

### Download All (Zip Export)
```typescript
function downloadAllAsZip(): void {
  const zip = new JSZip();
  openFiles.forEach(file => {
    zip.file(`${file.name}.st`, file.content);
  });
  zip.generateAsync({ type: 'blob' }).then(blob => {
    downloadBlob(blob, 'ladder-programs.zip');
  });
}
```

### Project Files (Revisited)
If we need multi-file projects in the future:
- `.ladderproj` files become a manifest pointing to `.st` files
- Project = list of file paths + metadata
- ST files remain the source of truth

## Files to Modify

| File | Changes |
|------|---------|
| `src/store/project-store.ts` | Replace with `file-store.ts` |
| `src/models/project.ts` | Add `OpenFile` type, deprecate `LadderProject` |
| `src/services/file-service.ts` | Simplify to file-only operations |
| `src/components/program-selector/` | Replace with `file-switcher/` |
| `src/components/layout/MainLayout.tsx` | Update toolbar, use new store |
| `src/components/mobile/MobileLayout.tsx` | Update menu, use new store |
| `src/App.tsx` | Update initialization |

## Testing Checklist

- [ ] New file creates empty ST template
- [ ] Open file loads content correctly
- [ ] Save downloads .st file
- [ ] File switcher shows all open files
- [ ] Switching files preserves content
- [ ] Dirty indicator shows for unsaved changes
- [ ] Close file with unsaved changes shows warning
- [ ] localStorage persists open files across sessions
- [ ] Legacy localStorage data migrates correctly
- [ ] Simulation works with active file
- [ ] Mobile layout works with new architecture

## Success Criteria

1. **Clarity:** User understands they're working with files, not projects
2. **Simplicity:** "New" creates a file, "Open" opens a file, "Save" saves a file
3. **Independence:** Each open file is independent (no shared project state)
4. **Persistence:** Open files persist across browser sessions
5. **Migration:** Existing users' data is preserved

## Terminology Changes

| Before | After |
|--------|-------|
| Project | (removed) |
| Program | File |
| New Project | New File |
| Program Selector | File Switcher |
| Current Program | Active File |
