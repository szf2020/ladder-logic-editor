/**
 * Property Drawer Component
 *
 * A slide-in panel that displays properties of the selected ladder element.
 * Appears from the right edge when a node is selected.
 * Can be dismissed via close button, clicking outside, or pressing Escape.
 */

import { useEffect, useCallback, memo } from 'react';
import type { LadderNode, LadderNodeData } from '../../models/ladder-elements';

import './PropertyDrawer.css';

interface PropertyDrawerProps {
  selectedNode: LadderNode | null;
  onClose: () => void;
}

export const PropertyDrawer = memo(function PropertyDrawer({
  selectedNode,
  onClose,
}: PropertyDrawerProps) {
  const isOpen = selectedNode !== null;

  // Handle Escape key to close
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    },
    [isOpen, onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  return (
    <>
      {/* Backdrop - clickable to close */}
      <div
        className={`property-drawer-backdrop ${isOpen ? 'visible' : ''}`}
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <aside
        className={`property-drawer ${isOpen ? 'open' : ''}`}
        role="complementary"
        aria-label="Element Properties"
        aria-hidden={!isOpen}
      >
        {/* Header */}
        <header className="drawer-header">
          <div className="drawer-title-group">
            <div className="drawer-icon">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M4 2.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm3 0a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm0 4a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm0 4a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm-3-4a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm0 4a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1z"/>
              </svg>
            </div>
            <h2 className="drawer-title">Properties</h2>
          </div>
          <button
            className="drawer-close"
            onClick={onClose}
            aria-label="Close properties panel"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        {/* Content */}
        <div className="drawer-content">
          {selectedNode ? (
            <PropertyContent node={selectedNode} />
          ) : (
            <div className="drawer-empty">
              <span>No selection</span>
            </div>
          )}
        </div>

        {/* Decorative circuit lines */}
        <div className="drawer-circuit-lines" aria-hidden="true">
          <div className="circuit-line circuit-line--1" />
          <div className="circuit-line circuit-line--2" />
          <div className="circuit-line circuit-line--3" />
        </div>
      </aside>
    </>
  );
});

// =============================================================================
// Property Content
// =============================================================================

interface PropertyContentProps {
  node: LadderNode;
}

const PropertyContent = memo(function PropertyContent({ node }: PropertyContentProps) {
  const typeLabel = getNodeTypeLabel(node.type);
  const typeIcon = getNodeTypeIcon(node.type);

  return (
    <div className="property-content">
      {/* Type badge */}
      <div className="property-type-section">
        <div className="type-badge">
          <span className="type-badge-icon">{typeIcon}</span>
          <span className="type-badge-label">{typeLabel}</span>
        </div>
      </div>

      {/* Properties list */}
      <div className="property-list">
        <PropertyRow label="ID" value={node.id} mono dimmed />
        {node.data && renderNodeSpecificProperties(node.data)}
      </div>
    </div>
  );
});

// =============================================================================
// Property Row
// =============================================================================

interface PropertyRowProps {
  label: string;
  value: string | number;
  mono?: boolean;
  dimmed?: boolean;
  accent?: boolean;
}

function PropertyRow({ label, value, mono = false, dimmed = false, accent = false }: PropertyRowProps) {
  return (
    <div className={`property-row ${dimmed ? 'dimmed' : ''}`}>
      <dt className="property-label">{label}</dt>
      <dd className={`property-value ${mono ? 'mono' : ''} ${accent ? 'accent' : ''}`}>
        {value}
      </dd>
    </div>
  );
}

// =============================================================================
// Helpers
// =============================================================================

function getNodeTypeLabel(type: string | undefined): string {
  switch (type) {
    case 'contact':
      return 'Contact';
    case 'coil':
      return 'Coil';
    case 'timer':
      return 'Timer';
    case 'counter':
      return 'Counter';
    case 'comparator':
      return 'Comparator';
    case 'powerRail':
      return 'Power Rail';
    default:
      return type || 'Unknown';
  }
}

function getNodeTypeIcon(type: string | undefined): string {
  switch (type) {
    case 'contact':
      return '┤├';
    case 'coil':
      return '( )';
    case 'timer':
      return '⏱';
    case 'counter':
      return '#';
    case 'comparator':
      return '≷';
    case 'powerRail':
      return '│';
    default:
      return '◇';
  }
}

function renderNodeSpecificProperties(data: LadderNodeData) {
  switch (data.elementType) {
    case 'contact':
      return (
        <>
          <PropertyRow label="Variable" value={data.variable || '—'} mono accent />
          <PropertyRow label="Contact Type" value={formatContactType(data.contactType)} />
        </>
      );

    case 'coil':
      return (
        <>
          <PropertyRow label="Variable" value={data.variable || '—'} mono accent />
          <PropertyRow label="Coil Type" value={formatCoilType(data.coilType)} />
        </>
      );

    case 'timer':
      return (
        <>
          <PropertyRow label="Instance" value={data.instanceName || '—'} mono accent />
          <PropertyRow label="Timer Type" value={data.timerType || 'TON'} />
          <PropertyRow label="Preset (PT)" value={data.presetTime || '—'} />
        </>
      );

    case 'counter':
      return (
        <>
          <PropertyRow label="Instance" value={data.instanceName || '—'} mono accent />
          <PropertyRow label="Counter Type" value={data.counterType || 'CTU'} />
          <PropertyRow label="Preset (PV)" value={data.presetValue ?? '—'} />
        </>
      );

    case 'comparator':
      return (
        <>
          <PropertyRow label="Left Operand" value={data.leftOperand || '—'} mono />
          <PropertyRow label="Operator" value={data.operator || '—'} accent />
          <PropertyRow label="Right Operand" value={data.rightOperand || '—'} mono />
        </>
      );

    case 'powerRail':
      return (
        <PropertyRow
          label="Rail Type"
          value={data.railType === 'left' ? 'Left Rail (L+)' : 'Right Rail (L−)'}
        />
      );

    default:
      return null;
  }
}

function formatContactType(type: string | undefined): string {
  switch (type) {
    case 'NO':
      return 'Normally Open (NO)';
    case 'NC':
      return 'Normally Closed (NC)';
    case 'P':
      return 'Positive Edge (P)';
    case 'N':
      return 'Negative Edge (N)';
    default:
      return type || 'Normally Open (NO)';
  }
}

function formatCoilType(type: string | undefined): string {
  switch (type) {
    case 'standard':
      return 'Standard';
    case 'negated':
      return 'Negated';
    case 'set':
      return 'Set (Latch)';
    case 'reset':
      return 'Reset (Unlatch)';
    default:
      return type || 'Standard';
  }
}
