/**
 * Error Panel Component
 *
 * Displays transform errors and warnings in an expandable panel.
 */

import { useState } from 'react';
import type { TransformError, TransformWarning } from '../../transformer';
import './ErrorPanel.css';

interface ErrorPanelProps {
  errors: TransformError[];
  warnings: TransformWarning[];
  onErrorClick?: (error: TransformError) => void;
}

export function ErrorPanel({ errors, warnings, onErrorClick }: ErrorPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasErrors = errors.length > 0;
  const hasWarnings = warnings.length > 0;

  if (!hasErrors && !hasWarnings) {
    return null;
  }

  const errorText = errors.length === 1 ? '1 error' : `${errors.length} errors`;
  const warningText = warnings.length === 1 ? '1 warning' : `${warnings.length} warnings`;

  return (
    <div className={`error-panel ${isExpanded ? 'expanded' : ''}`}>
      <button
        className="error-panel-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="error-panel-icon">{isExpanded ? '▼' : '▶'}</span>
        <span className="error-panel-summary">
          {hasErrors && <span className="error-count">{errorText}</span>}
          {hasErrors && hasWarnings && <span className="separator"> · </span>}
          {hasWarnings && <span className="warning-count">{warningText}</span>}
        </span>
      </button>

      {isExpanded && (
        <div className="error-panel-content">
          {errors.length > 0 && (
            <div className="error-section">
              <div className="section-header">Errors</div>
              {errors.map((error, index) => (
                <div
                  key={index}
                  className="error-item"
                  onClick={() => onErrorClick?.(error)}
                >
                  <span className="error-icon">✕</span>
                  <span className="error-message">{error.message}</span>
                  {error.line && (
                    <span className="error-location">
                      Line {error.line}
                      {error.column && `:${error.column}`}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {warnings.length > 0 && (
            <div className="warning-section">
              <div className="section-header">Warnings</div>
              {warnings.map((warning, index) => (
                <div key={index} className="warning-item">
                  <span className="warning-icon">⚠</span>
                  <span className="warning-message">{warning.message}</span>
                  {warning.line && (
                    <span className="warning-location">Line {warning.line}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
