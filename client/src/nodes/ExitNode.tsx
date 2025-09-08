import React from 'react';
import { Handle, Position } from 'reactflow';
import { Card, Typography, Tag } from 'antd';
import { StopOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface ExitNodeData {
  label: string;
  action?: {
    message?: string;
    exitCode?: number;
  };
}

const ExitNode: React.FC<{ data: ExitNodeData }> = ({ data }) => {
  return (
    <Card
      size="small"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <StopOutlined style={{ color: '#ff4d4f' }} />
          <span>{data.label || '終了'}</span>
          <Tag color="error">終了</Tag>
        </div>
      }
      style={{ 
        width: 280, 
        border: '2px solid #ff4d4f',
        backgroundColor: '#fff1f0'
      }}
      bodyStyle={{ padding: '8px' }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#ff4d4f' }}
      />
      
      <div style={{ marginTop: 4 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>終了メッセージ:</Text>
        <div style={{ 
          marginTop: 4, 
          padding: '4px 8px',
          backgroundColor: '#fff',
          border: '1px solid #ffccc7',
          borderRadius: 4,
          minHeight: 24
        }}>
          <Text strong style={{ color: '#ff4d4f', fontSize: 12 }}>
            {data.action?.message || '(メッセージなし)'}
          </Text>
        </div>
      </div>

      {data.action?.exitCode !== undefined && (
        <div style={{ marginTop: 8 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>終了コード: </Text>
          <Tag color={data.action.exitCode === 0 ? 'success' : 'error'}>
            {data.action.exitCode}
          </Tag>
        </div>
      )}
    </Card>
  );
};

export default ExitNode;