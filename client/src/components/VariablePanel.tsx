import { useState } from 'react';
import { Typography, Button, List, Input, Space, Popconfirm, Empty, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, SaveOutlined, CloseOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export interface Variable {
  name: string;
  description?: string;
  type: 'string' | 'number' | 'boolean' | 'any';
  value?: any;
}

interface VariablePanelProps {
  variables: Variable[];
  onVariablesChange: (variables: Variable[]) => void;
}

export default function VariablePanel({ variables, onVariablesChange }: VariablePanelProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newVariable, setNewVariable] = useState<Partial<Variable>>({
    name: '',
    type: 'string',
    description: ''
  });
  const [editVariable, setEditVariable] = useState<Partial<Variable>>({});

  const handleAdd = () => {
    if (newVariable.name && !variables.some(v => v.name === newVariable.name)) {
      onVariablesChange([...variables, newVariable as Variable]);
      setNewVariable({ name: '', type: 'string', description: '' });
      setIsAdding(false);
    }
  };

  const handleDelete = (index: number) => {
    const updated = variables.filter((_, i) => i !== index);
    onVariablesChange(updated);
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setEditVariable({ ...variables[index] });
  };

  const handleSaveEdit = () => {
    if (editingIndex !== null && editVariable.name) {
      const updated = [...variables];
      updated[editingIndex] = editVariable as Variable;
      onVariablesChange(updated);
      setEditingIndex(null);
      setEditVariable({});
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'string': return 'blue';
      case 'number': return 'green';
      case 'boolean': return 'orange';
      default: return 'default';
    }
  };

  return (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <div style={{ 
        padding: '16px', 
        borderBottom: '1px solid #f0f0f0'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={5} style={{ margin: 0 }}>変数管理</Title>
          {!isAdding && (
            <Button 
              size="small" 
              icon={<PlusOutlined />} 
              onClick={() => setIsAdding(true)}
            >
              追加
            </Button>
          )}
        </div>
      </div>

      <div style={{ 
        flex: 1,
        overflowY: 'auto',
        padding: '16px'
      }}>
        {isAdding && (
          <div style={{ 
            marginBottom: '16px', 
            padding: '12px',
            border: '1px solid #d9d9d9',
            borderRadius: '4px',
            backgroundColor: '#fafafa'
          }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Input
                placeholder="変数名 (例: userName)"
                value={newVariable.name}
                onChange={(e) => setNewVariable({ ...newVariable, name: e.target.value })}
                onPressEnter={handleAdd}
              />
              <Input
                placeholder="説明 (オプション)"
                value={newVariable.description}
                onChange={(e) => setNewVariable({ ...newVariable, description: e.target.value })}
                onPressEnter={handleAdd}
              />
              <Space>
                <Button size="small" type="primary" onClick={handleAdd}>
                  保存
                </Button>
                <Button size="small" onClick={() => {
                  setIsAdding(false);
                  setNewVariable({ name: '', type: 'string', description: '' });
                }}>
                  キャンセル
                </Button>
              </Space>
            </Space>
          </div>
        )}

        {variables.length === 0 ? (
          <Empty 
            description="変数がありません"
            style={{ marginTop: '48px' }}
          />
        ) : (
          <List
            dataSource={variables}
            renderItem={(variable, index) => (
              <List.Item
                style={{ 
                  padding: '8px 12px',
                  borderRadius: '4px',
                  marginBottom: '8px',
                  backgroundColor: editingIndex === index ? '#f0f8ff' : '#fafafa'
                }}
                actions={editingIndex === index ? [
                  <Button
                    key="save"
                    size="small"
                    type="link"
                    icon={<SaveOutlined />}
                    onClick={handleSaveEdit}
                  />,
                  <Button
                    key="cancel"
                    size="small"
                    type="link"
                    icon={<CloseOutlined />}
                    onClick={() => {
                      setEditingIndex(null);
                      setEditVariable({});
                    }}
                  />
                ] : [
                  <Button
                    key="edit"
                    size="small"
                    type="link"
                    icon={<EditOutlined />}
                    onClick={() => handleEdit(index)}
                  />,
                  <Popconfirm
                    key="delete"
                    title="この変数を削除しますか？"
                    onConfirm={() => handleDelete(index)}
                    okText="削除"
                    cancelText="キャンセル"
                  >
                    <Button
                      size="small"
                      type="link"
                      danger
                      icon={<DeleteOutlined />}
                    />
                  </Popconfirm>
                ]}
              >
                {editingIndex === index ? (
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Input
                      value={editVariable.name}
                      onChange={(e) => setEditVariable({ ...editVariable, name: e.target.value })}
                      placeholder="変数名"
                    />
                    <Input
                      value={editVariable.description}
                      onChange={(e) => setEditVariable({ ...editVariable, description: e.target.value })}
                      placeholder="説明"
                    />
                  </Space>
                ) : (
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Text strong style={{ fontFamily: 'monospace' }}>
                        ${variable.name}
                      </Text>
                      <Tag color={getTypeColor(variable.type)}>
                        {variable.type}
                      </Tag>
                    </div>
                    {variable.description && (
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {variable.description}
                      </Text>
                    )}
                  </div>
                )}
              </List.Item>
            )}
          />
        )}

        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #f0f0f0' }}>
          <Title level={5}>変数の使い方</Title>
          <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
            1. getText/getAttributeノードで変数に値を保存
            <br />
            2. ${'{'}変数名{'}'}の形式で他のノードで参照
            <br />
            3. 条件分岐やアサーションで変数を使用可能
          </Typography.Text>
        </div>
      </div>
    </div>
  );
}