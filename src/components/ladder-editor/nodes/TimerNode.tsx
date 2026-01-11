/**
 * Timer Node Component
 *
 * Represents IEC 61131-3 timer function blocks: TON, TOF, TP.
 * - TON: On-delay timer (Q goes TRUE after PT when IN is TRUE)
 * - TOF: Off-delay timer (Q stays TRUE for PT after IN goes FALSE)
 * - TP: Pulse timer (Q is TRUE for PT duration when IN rising edge)
 */

import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import type { TimerNodeData } from '../../../models/ladder-elements';

import './LadderNodes.css';

export const TimerNode = memo(function TimerNode({
  data,
  selected,
}: NodeProps<TimerNodeData>) {
  const { instanceName, timerType, presetTime } = data;

  return (
    <div
      className={`ladder-node timer-node ${timerType.toLowerCase()} ${
        selected ? 'selected' : ''
      }`}
    >
      {/* Input handles (left side) */}
      <Handle
        type="target"
        position={Position.Left}
        id="IN"
        className="ladder-handle timer-handle"
        style={{ top: '30%' }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="PT"
        className="ladder-handle timer-handle"
        style={{ top: '70%' }}
      />

      {/* Timer block body */}
      <div className="timer-body">
        <div className="timer-header">{timerType}</div>
        <div className="timer-instance">{instanceName || 'Timer'}</div>
        <div className="timer-params">
          <div className="timer-row">
            <span className="timer-pin-label">IN</span>
            <span className="timer-pin-label right">Q</span>
          </div>
          <div className="timer-row">
            <span className="timer-pin-label">PT</span>
            <span className="timer-pin-label right">ET</span>
          </div>
        </div>
        <div className="timer-preset">PT: {presetTime}</div>
      </div>

      {/* Output handles (right side) */}
      <Handle
        type="source"
        position={Position.Right}
        id="Q"
        className="ladder-handle timer-handle"
        style={{ top: '30%' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="ET"
        className="ladder-handle timer-handle"
        style={{ top: '70%' }}
      />
    </div>
  );
});
