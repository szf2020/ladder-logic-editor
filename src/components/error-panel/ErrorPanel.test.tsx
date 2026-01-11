/**
 * Error Panel Tests
 */

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorPanel } from './ErrorPanel';

describe('ErrorPanel', () => {
  const mockErrors = [
    { message: 'Unexpected token', line: 5, column: 10 },
    { message: 'Undefined variable: foo', line: 12 },
  ];

  const mockWarnings = [
    { message: 'Unused variable: bar', line: 3 },
  ];

  it('renders nothing when no errors or warnings', () => {
    const { container } = render(<ErrorPanel errors={[]} warnings={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders error count', () => {
    render(<ErrorPanel errors={mockErrors} warnings={[]} />);
    expect(screen.getByText(/2 errors/i)).toBeInTheDocument();
  });

  it('shows error messages when expanded', () => {
    render(<ErrorPanel errors={mockErrors} warnings={[]} />);

    // Click to expand
    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByText('Unexpected token')).toBeInTheDocument();
    expect(screen.getByText('Undefined variable: foo')).toBeInTheDocument();
  });

  it('shows line numbers for errors', () => {
    render(<ErrorPanel errors={mockErrors} warnings={[]} />);

    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByText(/Line 5/)).toBeInTheDocument();
    expect(screen.getByText(/Line 12/)).toBeInTheDocument();
  });

  it('renders warnings separately', () => {
    render(<ErrorPanel errors={[]} warnings={mockWarnings} />);

    expect(screen.getByText(/1 warning/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Unused variable: bar')).toBeInTheDocument();
  });

  it('shows both errors and warnings', () => {
    render(<ErrorPanel errors={mockErrors} warnings={mockWarnings} />);

    expect(screen.getByText(/2 errors/i)).toBeInTheDocument();
    expect(screen.getByText(/1 warning/i)).toBeInTheDocument();
  });
});
