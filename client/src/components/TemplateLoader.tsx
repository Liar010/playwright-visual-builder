import { useState, useEffect } from 'react';
import { Modal, List, Button, Empty, Popconfirm, message } from 'antd';
import { DeleteOutlined, FileTextOutlined } from '@ant-design/icons';
import { Node, Edge } from 'reactflow';

interface Template {
  name: string;
  description?: string;
  nodes: Node[];
  edges: Edge[];
  createdAt: string;
}

interface TemplateLoaderProps {
  isOpen: boolean;
  onClose: () => void;
  onLoad: (nodes: Node[], edges: Edge[]) => void;
  currentNodes: Node[];
  currentEdges: Edge[];
}

export default function TemplateLoader({ 
  isOpen, 
  onClose, 
  onLoad,
  currentNodes,
  currentEdges 
}: TemplateLoaderProps) {
  const [templates, setTemplates] = useState<Template[]>([]);

  useEffect(() => {
    if (isOpen) {
      const saved = JSON.parse(localStorage.getItem('flowTemplates') || '[]');
      setTemplates(saved);
    }
  }, [isOpen]);

  const handleLoad = (template: Template) => {
    // 新しいIDを生成してノードとエッジを複製
    const timestamp = Date.now();
    const idMap = new Map<string, string>();
    
    // 現在のノードの最大位置を取得
    const maxX = Math.max(...currentNodes.map(n => n.position.x), 0);
    const offsetX = maxX + 200; // 右側に配置
    
    const newNodes = template.nodes.map((node, index) => {
      const newId = `${node.id}-${timestamp}-${index}`;
      idMap.set(node.id, newId);
      return {
        ...node,
        id: newId,
        position: {
          x: node.position.x + offsetX,
          y: node.position.y,
        },
        selected: true, // 新しく追加したノードを選択状態にする
      };
    });
    
    const newEdges = template.edges.map((edge, index) => ({
      ...edge,
      id: `${edge.id}-${timestamp}-${index}`,
      source: idMap.get(edge.source) || edge.source,
      target: idMap.get(edge.target) || edge.target,
    }));
    
    // 既存のノード・エッジと結合
    onLoad(
      [...currentNodes, ...newNodes],
      [...currentEdges, ...newEdges]
    );
    
    message.success('テンプレートを追加しました');
    onClose();
  };

  const handleDelete = (index: number) => {
    const newTemplates = templates.filter((_, i) => i !== index);
    setTemplates(newTemplates);
    localStorage.setItem('flowTemplates', JSON.stringify(newTemplates));
    message.success('テンプレートを削除しました');
  };

  return (
    <Modal
      title="テンプレートから追加"
      open={isOpen}
      onCancel={onClose}
      footer={null}
      width={600}
    >
      {templates.length === 0 ? (
        <Empty description="保存されたテンプレートがありません" />
      ) : (
        <List
          dataSource={templates}
          renderItem={(template, index) => (
            <List.Item
              actions={[
                <Button
                  type="primary"
                  size="small"
                  onClick={() => handleLoad(template)}
                >
                  追加
                </Button>,
                <Popconfirm
                  title="削除確認"
                  description="このテンプレートを削除しますか？"
                  onConfirm={() => handleDelete(index)}
                  okText="削除"
                  cancelText="キャンセル"
                >
                  <Button
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                  />
                </Popconfirm>,
              ]}
            >
              <List.Item.Meta
                avatar={<FileTextOutlined style={{ fontSize: '24px' }} />}
                title={template.name}
                description={
                  <>
                    {template.description && <div>{template.description}</div>}
                    <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                      ノード数: {template.nodes.length} | 
                      作成日: {new Date(template.createdAt).toLocaleDateString()}
                    </div>
                  </>
                }
              />
            </List.Item>
          )}
        />
      )}
    </Modal>
  );
}