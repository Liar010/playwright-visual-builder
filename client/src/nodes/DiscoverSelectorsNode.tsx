import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Card, Input, Space, Typography, Checkbox } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface DiscoverSelectorsNodeData {
  label: string;
  storageLabel?: string;  // 保存時のラベル（省略時はノードID使用）
  category?: string;      // カテゴリ（例: "login", "admin/settings"）
  description?: string;
  options?: {
    inputs?: boolean;
    buttons?: boolean;
    links?: boolean;
    images?: boolean;
    tables?: boolean;
    selects?: boolean;
    checkboxes?: boolean;
    radios?: boolean;
    textareas?: boolean;
    dataAttributes?: boolean;
  };
}

export const DiscoverSelectorsNode = memo(({ data, selected }: { 
  data: DiscoverSelectorsNodeData; 
  selected: boolean;
}) => {
  const options = data.options || { inputs: true, buttons: true, links: true };
  
  return (
    <>
      <Handle type="target" position={Position.Top} />
      <Card
        size="small"
        bordered={selected}
        style={{ 
          borderColor: selected ? '#1890ff' : '#d9d9d9',
          minWidth: 250,
          backgroundColor: '#f0f8ff'  // 探索ノードは色分け
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
            <Text type="secondary">カテゴリ:</Text>
            <Input 
              value={data.category || 'default'} 
              placeholder="例: login, admin/settings"
              disabled
              style={{ marginTop: 4 }}
            />
          </div>
          
          <div>
            <Text type="secondary">保存ラベル:</Text>
            <Input 
              value={data.storageLabel || '(ノードIDを使用)'} 
              placeholder="例: login-page"
              disabled
              style={{ marginTop: 4 }}
            />
          </div>
          
          {data.description && (
            <div>
              <Text type="secondary">説明:</Text>
              <div>{data.description}</div>
            </div>
          )}
          
          <div>
            <Text type="secondary">収集対象:</Text>
            <Space direction="vertical" style={{ marginTop: 4, fontSize: '12px' }}>
              <Checkbox checked={options.inputs} disabled>入力フィールド</Checkbox>
              <Checkbox checked={options.buttons} disabled>ボタン</Checkbox>
              <Checkbox checked={options.links} disabled>リンク</Checkbox>
              <Checkbox checked={options.selects !== false} disabled>セレクトボックス</Checkbox>
              <Checkbox checked={options.checkboxes !== false} disabled>チェックボックス</Checkbox>
              <Checkbox checked={options.radios !== false} disabled>ラジオボタン</Checkbox>
              <Checkbox checked={options.textareas !== false} disabled>テキストエリア</Checkbox>
              <Checkbox checked={options.tables === true} disabled>テーブル要素</Checkbox>
              <Checkbox checked={options.images !== false} disabled>画像</Checkbox>
            </Space>
          </div>
        </Space>
      </Card>
      <Handle type="source" position={Position.Bottom} />
    </>
  );
});

DiscoverSelectorsNode.displayName = 'DiscoverSelectorsNode';