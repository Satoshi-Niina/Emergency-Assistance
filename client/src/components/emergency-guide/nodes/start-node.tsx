import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

const StartNode = ({ data }: NodeProps) => {
  return (
    <div className="px-4 py-2 shadow-md rounded-full bg-green-500 text-white min-w-[100px] text-center">
      <div className="font-bold">{data.label || '髢句ｧ・}</div>
      
      {/* 蜃ｺ蜉帙ワ繝ｳ繝峨Ν縺ｮ縺ｿ */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#555' }}
        isConnectable={true}
      />
    </div>
  );
};

export default memo(StartNode);