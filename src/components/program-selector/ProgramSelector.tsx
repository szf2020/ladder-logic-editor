/**
 * Program Selector Component
 *
 * Dropdown for switching between programs in the project.
 */

import { useState, useRef, useEffect } from 'react';
import { useProjectStore } from '../../store';
import { v4 as uuidv4 } from 'uuid';
import type { ProgramUnit } from '../../models/project';
import './ProgramSelector.css';

export function ProgramSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newProgramName, setNewProgramName] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const programs = useProjectStore((state) => state.project?.programs ?? []);
  const currentProgramId = useProjectStore((state) => state.currentProgramId);
  const setCurrentProgram = useProjectStore((state) => state.setCurrentProgram);
  const addProgram = useProjectStore((state) => state.addProgram);

  const currentProgram = programs.find((p) => p.id === currentProgramId);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsCreating(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when creating new program
  useEffect(() => {
    if (isCreating && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreating]);

  const handleSelectProgram = (programId: string) => {
    setCurrentProgram(programId);
    setIsOpen(false);
  };

  const handleNewProgram = () => {
    setIsCreating(true);
  };

  const handleCreateProgram = () => {
    if (!newProgramName.trim()) return;

    const newProgram: ProgramUnit = {
      id: uuidv4(),
      name: newProgramName.trim(),
      type: 'PROGRAM',
      structuredText: `// ${newProgramName.trim()}\n// Add your ST code here\n`,
      syncValid: true,
      lastSyncSource: 'st',
      variables: [],
    };

    addProgram(newProgram);
    setCurrentProgram(newProgram.id);
    setNewProgramName('');
    setIsCreating(false);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateProgram();
    } else if (e.key === 'Escape') {
      setIsCreating(false);
      setNewProgramName('');
    }
  };

  return (
    <div className="program-selector" ref={dropdownRef}>
      <button
        className="program-selector-button"
        onClick={() => setIsOpen(!isOpen)}
        title="Select Program"
      >
        <span className="program-icon">📋</span>
        <span className="program-name">{currentProgram?.name ?? 'No Program'}</span>
        <span className="dropdown-arrow">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="program-dropdown">
          {programs.map((program) => (
            <button
              key={program.id}
              className={`program-option ${program.id === currentProgramId ? 'active' : ''}`}
              onClick={() => handleSelectProgram(program.id)}
            >
              {program.name}
              {program.id === currentProgramId && <span className="check-mark">✓</span>}
            </button>
          ))}

          <div className="dropdown-divider" />

          {isCreating ? (
            <div className="new-program-input">
              <input
                ref={inputRef}
                type="text"
                placeholder="Program name..."
                value={newProgramName}
                onChange={(e) => setNewProgramName(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button className="create-btn" onClick={handleCreateProgram}>
                Create
              </button>
            </div>
          ) : (
            <button className="program-option new-program" onClick={handleNewProgram}>
              + New Program
            </button>
          )}
        </div>
      )}
    </div>
  );
}
