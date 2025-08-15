import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { BranchesOutlined } from '@ant-design/icons';

export default memo(({ data, selected }: NodeProps) => {
  return (
    <div
      style={{
        padding: '10px 20px',
        borderRadius: '8px',
        background: '#fff',
        border: selected ? '2px solid #1890ff' : '1px solid #d9d9d9',
        minWidth: '150px',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#1890ff' }}
      />
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <BranchesOutlined style={{ color: '#722ed1' }} />
        <span>{data.label}</span>
      </div>
      
      {data.condition?.expression && (
        <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
          {data.condition.expression}
        </div>
      )}
      
      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        style={{ 
          left: '30%', 
          background: '#52c41a',
        }}
      />
      <div style={{
        position: 'absolute',
        bottom: '-20px',
        left: '30%',
        transform: 'translateX(-50%)',
        fontSize: '10px',
        color: '#52c41a',
      }}>
        True
      </div>
      
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        style={{ 
          left: '70%', 
          background: '#ff4d4f',
        }}
      />
      <div style={{
        position: 'absolute',
        bottom: '-20px',
        left: '70%',
        transform: 'translateX(-50%)',
        fontSize: '10px',
        color: '#ff4d4f',
      }}>
        False
      </div>
    </div>
  );
});