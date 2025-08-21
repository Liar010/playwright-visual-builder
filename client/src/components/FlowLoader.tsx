import { useState, useEffect } from 'react';
import { Modal, List, Button, Empty, Spin, message, Tag, Space, Popconfirm } from 'antd';
import { 
  ClockCircleOutlined, 
  DeleteOutlined,
  FileTextOutlined,
  CodeOutlined 
} from '@ant-design/icons';
import type { TestFlow } from '@playwright-visual-builder/shared';
import { API_ENDPOINTS } from '../config/api';

interface FlowLoaderProps {
  isOpen: boolean;
  onClose: () => void;
  onLoad: (flow: TestFlow) => void;
}

export default function FlowLoader({ isOpen, onClose, onLoad }: FlowLoaderProps) {
  const [flows, setFlows] = useState<TestFlow[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFlows = async () => {
    setLoading(true);
    try {
      const apiUrl = API_ENDPOINTS.flows;
      
      const response = await fetch(apiUrl);
      if (response.ok) {
        const data = await response.json();
        setFlows(data);
      } else {
        message.error('フローの読み込みに失敗しました');
      }
    } catch (error) {
      message.error('フローの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (flowId: string, event?: React.MouseEvent) => {
    event?.stopPropagation();
    try {
      const apiUrl = `${API_ENDPOINTS.flows}/${flowId}`;
      
      const response = await fetch(apiUrl, { method: 'DELETE' });
      if (response.ok) {
        message.success('フローを削除しました');
        fetchFlows();
      } else {
        message.error('フローの削除に失敗しました');
      }
    } catch (error) {
      message.error('フローの削除に失敗しました');
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchFlows();
    }
  }, [isOpen]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP') + ' ' + date.toLocaleTimeString('ja-JP');
  };

  const getFileIcon = (flowId: string) => {
    // ファイル拡張子を判定（実際のファイル名がない場合は仮定）
    if (flowId.endsWith('.yaml')) {
      return <FileTextOutlined style={{ color: '#1890ff' }} />;
    }
    return <CodeOutlined style={{ color: '#52c41a' }} />;
  };

  return (
    <Modal
      title="フローを読み込み"
      open={isOpen}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          キャンセル
        </Button>,
        <Button key="refresh" onClick={fetchFlows}>
          更新
        </Button>
      ]}
      width={700}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
        </div>
      ) : flows.length === 0 ? (
        <Empty 
          description="保存されたフローがありません"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <List
          dataSource={flows}
          renderItem={(flow) => (
            <List.Item
              onClick={() => {
                onLoad(flow);
                onClose();
                message.success('フローを読み込みました');
              }}
              style={{ 
                cursor: 'pointer',
                padding: '12px',
                transition: 'background-color 0.3s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f0f0f0';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              actions={[
                <Popconfirm
                  title="フローを削除"
                  description="このフローを削除してもよろしいですか？"
                  onConfirm={(e) => handleDelete(flow.id, e)}
                  okText="削除"
                  cancelText="キャンセル"
                  placement="left"
                >
                  <Button
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={(e) => e.stopPropagation()}
                  />
                </Popconfirm>
              ]}
            >
              <List.Item.Meta
                avatar={getFileIcon(flow.id)}
                title={
                  <Space>
                    <span>{flow.name}</span>
                    <Tag color="blue">{flow.nodes?.length || 0} ノード</Tag>
                    <Tag color="green">{flow.edges?.length || 0} 接続</Tag>
                  </Space>
                }
                description={
                  <Space direction="vertical" size={0}>
                    {flow.description && <span>{flow.description}</span>}
                    <Space size="small" style={{ fontSize: '12px', color: '#999' }}>
                      <ClockCircleOutlined />
                      <span>作成: {formatDate(flow.createdAt)}</span>
                      {flow.updatedAt && (
                        <>
                          <span>|</span>
                          <span>更新: {formatDate(flow.updatedAt)}</span>
                        </>
                      )}
                    </Space>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      )}
    </Modal>
  );
}