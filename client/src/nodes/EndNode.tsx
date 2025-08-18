import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card, Tag } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';

const EndNode: React.FC<NodeProps> = ({ data, selected }) => {
  return (
    <>
      <Handle type="target" position={Position.Top} />
      <Card
        size="small"
        bordered={selected}
        style={{
          minWidth: '180px',
          borderColor: selected ? '#1890ff' : '#d9d9d9',
          borderWidth: selected ? 2 : 1,
          backgroundColor: '#f0f0f0',
        }}
        bodyStyle={{ padding: '8px 12px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircleOutlined style={{ color: '#52c41a' }} />
          <span style={{ fontWeight: 500 }}>{data.label}</span>
        </div>
        {data.pairId && (
          <Tag color="blue" style={{ marginTop: '4px', fontSize: '10px' }}>
            Paired
          </Tag>
        )}
      </Card>
      <Handle type="source" position={Position.Bottom} />
    </>
  );
};

export default EndNode;