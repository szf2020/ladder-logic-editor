/**
 * Open Menu Component
 *
 * Dropdown menu for opening projects from examples or local files.
 */

import { useState, useRef, useEffect } from 'react';
import { useProjectStore } from '../../store';
import { openSTFile } from '../../services/file-service';
import './OpenMenu.css';

interface OpenMenuProps {
  isDirty: boolean;
}

export function OpenMenu({ isDirty }: OpenMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadFromSTCode = useProjectStore((state) => state.loadFromSTCode);
  const newTrafficControllerProject = useProjectStore((state) => state.newTrafficControllerProject);
  const newDualPumpControllerProject = useProjectStore((state) => state.newDualPumpControllerProject);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on escape
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen]);

  const confirmIfDirty = (): boolean => {
    if (isDirty) {
      return window.confirm(
        'You have unsaved changes. Are you sure you want to open a different file?'
      );
    }
    return true;
  };

  const handleLoadExample = (example: 'traffic' | 'dual-pump') => {
    if (!confirmIfDirty()) return;

    if (example === 'traffic') {
      newTrafficControllerProject('4-Way Intersection');
    } else if (example === 'dual-pump') {
      newDualPumpControllerProject('Dual Pump Controller');
    }

    setIsOpen(false);
  };

  const handleOpenLocalFile = async () => {
    if (!confirmIfDirty()) return;

    try {
      const { programName, stCode, fileName } = await openSTFile();
      loadFromSTCode(programName, stCode, fileName);
    } catch (error) {
      if ((error as Error).message !== 'File selection cancelled') {
        console.error('Error opening ST file:', error);
        alert(`Failed to open ST file: ${(error as Error).message}`);
      }
    }

    setIsOpen(false);
  };

  return (
    <div className="open-menu" ref={dropdownRef}>
      <button
        className="toolbar-btn"
        title="Open Project"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="toolbar-icon">📂</span>
        <span className="toolbar-label">Open</span>
        <span className="dropdown-caret">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="open-menu-dropdown">
          <div className="open-menu-section">
            <div className="open-menu-header">Examples</div>
            <button
              className="open-menu-option"
              onClick={() => handleLoadExample('dual-pump')}
            >
              <span className="option-icon">🔧</span>
              <span className="option-text">
                <span className="option-title">Dual Pump Controller</span>
                <span className="option-desc">Lead/lag with 2oo3 voting</span>
              </span>
            </button>
            <button
              className="open-menu-option"
              onClick={() => handleLoadExample('traffic')}
            >
              <span className="option-icon">🚦</span>
              <span className="option-text">
                <span className="option-title">4-Way Intersection</span>
                <span className="option-desc">Traffic light with safety flash</span>
              </span>
            </button>
          </div>

          <div className="open-menu-divider" />

          <button
            className="open-menu-option"
            onClick={handleOpenLocalFile}
          >
            <span className="option-icon">📁</span>
            <span className="option-text">
              <span className="option-title">Open Local File...</span>
              <span className="option-desc">Load .st file from disk</span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
