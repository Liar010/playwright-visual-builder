import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { ReloadOutlined } from '@ant-design/icons';

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
        <ReloadOutlined style={{ color: '#fa8c16' }} />
        <span>{data.label}</span>
      </div>
      
      {data.loop && (
        <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
          {data.loop.type === 'count' && `${data.loop.count}回繰り返し`}
          {data.loop.type === 'while' && `条件: ${data.loop.condition}`}
          {data.loop.type === 'forEach' && `要素: ${data.loop.items}`}
        </div>
      )}
      
      <Handle
        type="source"
        position={Position.Bottom}
        id="loop"
        style={{ 
          left: '30%', 
          background: '#fa8c16',
        }}
      />
      <div style={{
        position: 'absolute',
        bottom: '-20px',
        left: '30%',
        transform: 'translateX(-50%)',
        fontSize: '10px',
        color: '#fa8c16',
      }}>
        ループ内
      </div>
      
      <Handle
        type="source"
        position={Position.Bottom}
        id="next"
        style={{ 
          left: '70%', 
          background: '#1890ff',
        }}
      />
      <div style={{
        position: 'absolute',
        bottom: '-20px',
        left: '70%',
        transform: 'translateX(-50%)',
        fontSize: '10px',
        color: '#1890ff',
      }}>
        次へ
      </div>
    </div>
  );
});