/**
 * Program Selector Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProgramSelector } from './ProgramSelector';

// Mock the project store
const mockSetCurrentProgram = vi.fn();
const mockAddProgram = vi.fn();

vi.mock('../../store', () => ({
  useProjectStore: vi.fn((selector) => {
    const state = {
      project: {
        programs: [
          { id: 'prog-1', name: 'Main Program', structuredText: '' },
          { id: 'prog-2', name: 'Traffic Controller', structuredText: '' },
        ],
      },
      currentProgramId: 'prog-1',
      setCurrentProgram: mockSetCurrentProgram,
      addProgram: mockAddProgram,
    };
    return selector(state);
  }),
}));

describe('ProgramSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders current program name', () => {
    render(<ProgramSelector />);
    expect(screen.getByText('Main Program')).toBeInTheDocument();
  });

  it('shows dropdown with all programs when clicked', () => {
    render(<ProgramSelector />);

    // Click to open dropdown
    fireEvent.click(screen.getByRole('button'));

    // Both programs should be visible in dropdown (use getAllByText since Main Program appears twice)
    expect(screen.getAllByText('Main Program')).toHaveLength(2); // button + dropdown
    expect(screen.getByText('Traffic Controller')).toBeInTheDocument();
  });

  it('calls setCurrentProgram when selecting a different program', () => {
    render(<ProgramSelector />);

    // Open dropdown
    fireEvent.click(screen.getByRole('button'));

    // Select the other program
    fireEvent.click(screen.getByText('Traffic Controller'));

    expect(mockSetCurrentProgram).toHaveBeenCalledWith('prog-2');
  });

  it('shows "New Program" option in dropdown', () => {
    render(<ProgramSelector />);

    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByText('+ New Program')).toBeInTheDocument();
  });
});
