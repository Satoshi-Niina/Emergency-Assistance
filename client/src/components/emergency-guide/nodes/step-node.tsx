import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

const StepNode = ({ data }: NodeProps) => {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-blue-100 border border-blue-500 min-w-[150px]">
      <div className="font-bold text-blue-800">{data.label || '繧ｹ繝・ャ繝・}</div>
      {data.message && (
        <div className="mt-2 text-sm text-gray-700">{data.message}</div>
      )}
      
      {/* 蜈･蜉帙→蜃ｺ蜉帙・繝上Φ繝峨Ν */}
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#555' }}
        isConnectable={true}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#555' }}
        isConnectable={true}
      />
    </div>
  );
};

export default memo(StepNode);