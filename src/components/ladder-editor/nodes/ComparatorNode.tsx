/**
 * Comparator Node Component
 *
 * Represents comparison operations in ladder logic (=, <>, >, >=, <, <=).
 * Compares two operands and outputs TRUE if the condition is met.
 */

import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import type { ComparatorNodeData } from '../../../models/ladder-elements';

import './LadderNodes.css';

export const ComparatorNode = memo(function ComparatorNode({
  data,
  selected,
}: NodeProps<ComparatorNodeData>) {
  const { operator, leftOperand, rightOperand } = data;

  // Get display symbol for operator
  const getOperatorSymbol = () => {
    switch (operator) {
      case 'EQ':
        return '=';
      case 'NE':
        return '<>';
      case 'GT':
        return '>';
      case 'GE':
        return '>=';
      case 'LT':
        return '<';
      case 'LE':
        return '<=';
      default:
        return '?';
    }
  };

  return (
    <div
      className={`ladder-node comparator-node ${selected ? 'selected' : ''}`}
    >
      {/* Input handle (left side - receives power) */}
      <Handle
        type="target"
        position={Position.Left}
        id="power-in"
        className="ladder-handle"
      />

      {/* Comparator body */}
      <div className="comparator-body">
        <div className="comparator-operand left">{leftOperand}</div>
        <div className="comparator-operator">{getOperatorSymbol()}</div>
        <div className="comparator-operand right">{rightOperand}</div>
      </div>

      {/* Output handle (right side - passes power if condition met) */}
      <Handle
        type="source"
        position={Position.Right}
        id="power-out"
        className="ladder-handle"
      />
    </div>
  );
});
