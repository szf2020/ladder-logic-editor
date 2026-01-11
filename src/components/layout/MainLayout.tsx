/**
 * Main Layout Component
 *
 * Split-pane layout with ladder diagram editor and ST code editor.
 * Integrates the ST -> Ladder transformer for bidirectional sync.
 */

import { useEffect, useCallback, useState } from 'react';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { LadderCanvas } from '../ladder-editor/LadderCanvas';
import { STEditor } from '../st-editor/STEditor';
import { useProjectStore } from '../../store';

import './MainLayout.css';

export function MainLayout() {
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');
  const [errorCount, setErrorCount] = useState(0);

  const currentProgram = useProjectStore((state) => {
    const project = state.project;
    const currentId = state.currentProgramId;
    if (!project || !currentId) return null;
    return project.programs.find((p) => p.id === currentId) || null;
  });

  const transformCurrentProgram = useProjectStore((state) => state.transformCurrentProgram);
  const transformedNodes = useProjectStore((state) => state.transformedNodes);
  const transformedEdges = useProjectStore((state) => state.transformedEdges);

  // Transform when ST code changes
  useEffect(() => {
    if (!currentProgram) return;

    setSyncStatus('syncing');

    // Debounce transformation
    const timer = setTimeout(() => {
      const result = transformCurrentProgram();
      if (result) {
        if (result.success) {
          setSyncStatus('synced');
          setErrorCount(0);
        } else {
          setSyncStatus('error');
          setErrorCount(result.errors.length);
        }
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [currentProgram?.structuredText, transformCurrentProgram]);

  // Handle node changes from the ladder editor
  const handleNodesChange = useCallback((nodes: typeof transformedNodes) => {
    // Future: implement ladder -> ST conversion
    console.log('Nodes changed:', nodes.length);
  }, []);

  // Handle edge changes from the ladder editor
  const handleEdgesChange = useCallback((edges: typeof transformedEdges) => {
    // Future: implement ladder -> ST conversion
    console.log('Edges changed:', edges.length);
  }, []);

  const getStatusText = () => {
    switch (syncStatus) {
      case 'syncing':
        return 'Syncing...';
      case 'error':
        return `${errorCount} error${errorCount !== 1 ? 's' : ''}`;
      default:
        return 'Synced';
    }
  };

  const getStatusClass = () => {
    switch (syncStatus) {
      case 'syncing':
        return 'syncing';
      case 'error':
        return 'error';
      default:
        return 'ready';
    }
  };

  return (
    <div className="main-layout">
      {/* Toolbar */}
      <div className="toolbar">
        <div className="toolbar-group">
          <button className="toolbar-btn" title="New Project">
            <span className="toolbar-icon">📄</span>
            <span className="toolbar-label">New</span>
          </button>
          <button className="toolbar-btn" title="Open Project">
            <span className="toolbar-icon">📂</span>
            <span className="toolbar-label">Open</span>
          </button>
          <button className="toolbar-btn" title="Save Project">
            <span className="toolbar-icon">💾</span>
            <span className="toolbar-label">Save</span>
          </button>
        </div>

        <div className="toolbar-separator" />

        <div className="toolbar-group">
          <button className="toolbar-btn" title="Run Simulation">
            <span className="toolbar-icon">▶️</span>
            <span className="toolbar-label">Run</span>
          </button>
          <button className="toolbar-btn" title="Pause Simulation">
            <span className="toolbar-icon">⏸️</span>
            <span className="toolbar-label">Pause</span>
          </button>
          <button className="toolbar-btn" title="Stop Simulation">
            <span className="toolbar-icon">⏹️</span>
            <span className="toolbar-label">Stop</span>
          </button>
        </div>

        <div className="toolbar-spacer" />

        <div className="toolbar-status">
          <span className={`status-indicator ${getStatusClass()}`} />
          <span className="status-text">{getStatusText()}</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="workspace">
        <PanelGroup orientation="vertical">
          {/* Top: Ladder Diagram */}
          <Panel defaultSize={50} minSize={25}>
            <LadderCanvas
              initialNodes={transformedNodes}
              initialEdges={transformedEdges}
              onNodesChange={handleNodesChange}
              onEdgesChange={handleEdgesChange}
            />
          </Panel>

          <PanelResizeHandle className="resize-handle horizontal" />

          {/* Bottom: ST Editor */}
          <Panel defaultSize={50} minSize={25}>
            <STEditor />
          </Panel>
        </PanelGroup>
      </div>

      {/* Status Bar */}
      <div className="status-bar">
        <span className="status-bar-item">
          Ladder Logic Editor v1.0.0
        </span>
        <span className="status-bar-spacer" />
        <span className="status-bar-item">
          Source: Structured Text
        </span>
      </div>
    </div>
  );
}
