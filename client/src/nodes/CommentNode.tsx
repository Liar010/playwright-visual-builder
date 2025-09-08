import { memo } from 'react';
import { NodeProps } from 'reactflow';
import { Card, Typography } from 'antd';
import { EditOutlined } from '@ant-design/icons';

const { Text } = Typography;

const CommentNode = memo(({ data, selected }: NodeProps) => {
  return (
    <>
      <Card
        size="small"
        bodyStyle={{
          padding: '12px',
          background: '#fffbe6',
          border: '2px dashed #fadb14',
          borderRadius: '4px',
          minWidth: '200px',
          maxWidth: '300px',
        }}
        style={{
          boxShadow: selected ? '0 0 0 2px #faad14' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <EditOutlined style={{ color: '#faad14' }} />
          <Text strong style={{ color: '#d48806' }}>{data.label || 'コメント'}</Text>
        </div>
        <Text style={{ 
          display: 'block',
          whiteSpace: 'pre-wrap',
          color: '#8c6800',
          fontSize: '12px',
          lineHeight: '1.5'
        }}>
          {data.comment || 'ダブルクリックでコメントを編集'}
        </Text>
      </Card>
    </>
  );
});

CommentNode.displayName = 'CommentNode';

export default CommentNode;