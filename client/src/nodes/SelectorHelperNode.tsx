import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Card, Select, Input, Space, Typography } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

const { Text } = Typography;
const { Option } = Select;

interface SelectorHelperNodeData {
  label: string;
  searchType: 'text' | 'label' | 'placeholder' | 'testid' | 'role';
  searchValue: string;
  variableName?: string;
}

export const SelectorHelperNode = memo(({ data, selected }: { 
  data: SelectorHelperNodeData; 
  selected: boolean;
}) => {
  return (
    <>
      <Handle type="target" position={Position.Top} />
      <Card
        size="small"
        bordered={selected}
        style={{ 
          borderColor: selected ? '#1890ff' : '#d9d9d9',
          minWidth: 200
        }}
        title={
          <Space>
            <SearchOutlined />
            <span>{data.label || 'セレクタ探索'}</span>
          </Space>
        }
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text type="secondary">検索方法:</Text>
            <Select 
              value={data.searchType || 'text'} 
              style={{ width: '100%', marginTop: 4 }}
              disabled
            >
              <Option value="text">テキスト</Option>
              <Option value="label">ラベル</Option>
              <Option value="placeholder">プレースホルダー</Option>
              <Option value="testid">data-testid</Option>
              <Option value="role">role属性</Option>
            </Select>
          </div>
          
          <div>
            <Text type="secondary">検索値:</Text>
            <Input 
              value={data.searchValue} 
              placeholder="例: ログイン"
              disabled
              style={{ marginTop: 4 }}
            />
          </div>

          {data.variableName && (
            <div>
              <Text type="secondary">保存先変数:</Text>
              <Input 
                value={data.variableName} 
                disabled
                style={{ marginTop: 4 }}
              />
            </div>
          )}
        </Space>
      </Card>
      <Handle type="source" position={Position.Bottom} />
    </>
  );
});

SelectorHelperNode.displayName = 'SelectorHelperNode';