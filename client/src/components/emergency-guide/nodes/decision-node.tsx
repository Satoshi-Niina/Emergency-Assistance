import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

const DecisionNode = ({ data }: NodeProps) => {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-yellow-100 border-2 border-yellow-500 min-w-[150px]" style={{ 
      transform: 'rotate(45deg)',
      transformOrigin: 'center',
      width: '140px',
      height: '140px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    }}>
      <div style={{ transform: 'rotate(-45deg)' }} className="text-center">
        <div className="font-bold text-yellow-800">{data.label || '蛻､譁ｭ'}</div>
        {data.message && (
          <div className="mt-2 text-sm text-gray-700">{data.message}</div>
        )}
      </div>
      
      {/* 蜈･蜉帙→隍・焚縺ｮ蜃ｺ蜉帙ワ繝ｳ繝峨Ν - 隗偵↓驟咲ｽｮ */}
      {/* 荳企Κ縺ｮ隗抵ｼ亥・蜉幢ｼ・*/}
      <Handle
        type="target"
        position={Position.Top}
        style={{ 
          background: '#555',
          width: '12px',
          height: '12px',
          border: '2px solid #333',
          transform: 'rotate(-45deg) translateY(-41px)' 
        }}
        isConnectable={true}
      />
      
      {/* 蜿ｳ蛛ｴ縺ｮ隗抵ｼ・es蜃ｺ蜉幢ｼ・*/}
      <Handle
        type="source"
        position={Position.Right}
        style={{ 
          background: '#6c0',
          width: '12px',
          height: '12px',
          border: '2px solid #360',
          transform: 'rotate(-45deg) translateX(41px)' 
        }}
        id="yes"
        isConnectable={true}
      />
      
      {/* 荳句・縺ｮ隗抵ｼ・o蜃ｺ蜉幢ｼ・*/}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ 
          background: '#f00',
          width: '12px',
          height: '12px',
          border: '2px solid #900',
          transform: 'rotate(-45deg) translateY(41px)' 
        }}
        id="no"
        isConnectable={true}
      />
      
      {/* 蟾ｦ蛛ｴ縺ｮ隗抵ｼ亥挨縺ｮ蜃ｺ蜉幢ｼ・*/}
      <Handle
        type="source"
        position={Position.Left}
        style={{ 
          background: '#09f',
          width: '12px',
          height: '12px',
          border: '2px solid #06c',
          transform: 'rotate(-45deg) translateX(-41px)' 
        }}
        id="other"
        isConnectable={true}
      />
    </div>
  );
};

export default memo(DecisionNode);