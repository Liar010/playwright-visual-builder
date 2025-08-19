import { useState, useEffect, useRef } from 'react';
import { 
  Modal, 
  Table, 
  Button, 
  Space, 
  Input, 
  Form, 
  message, 
  Popconfirm,
  Upload,
  Tooltip,
  Tag,
  Typography,
  Select,
  Empty
} from 'antd';
import { 
  EditOutlined, 
  DeleteOutlined, 
  DownloadOutlined,
  UploadOutlined,
  FolderOpenOutlined,
  FolderOutlined,
  SaveOutlined,
  PlusOutlined,
  FileTextOutlined,
  ExportOutlined,
  ImportOutlined,
  CopyOutlined,
  RightOutlined,
  DownOutlined,
  AppstoreOutlined,
  CloudDownloadOutlined
} from '@ant-design/icons';
import { Node, Edge } from 'reactflow';
import type { UploadProps } from 'antd';
import { templateService } from '../services/templateService';

const { TextArea } = Input;
const { Text } = Typography;

// カテゴリのアイコンと色
const categoryConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  'default': { icon: <FolderOutlined />, color: '#faad14' },
  '認証': { icon: <FolderOutlined />, color: '#52c41a' },
  'ナビゲーション': { icon: <FolderOutlined />, color: '#1890ff' },
  'フォーム': { icon: <FolderOutlined />, color: '#722ed1' },
  'テスト': { icon: <FolderOutlined />, color: '#fa541c' },
  'UI操作': { icon: <FolderOutlined />, color: '#13c2c2' },
  'データ': { icon: <FolderOutlined />, color: '#eb2f96' },
};

export interface Template {
  id: string;
  name: string;
  description?: string;
  nodes: Node[];
  edges: Edge[];
  createdAt: string;
  updatedAt: string;
  category?: string;
  tags?: string[];
}

interface TemplateManagerProps {
  visible: boolean;
  onClose: () => void;
  onLoad?: (nodes: Node[], edges: Edge[]) => void;
  selectedNodes?: Node[];
  selectedEdges?: Edge[];
  mode?: 'manage' | 'save' | 'load';
}

export default function TemplateManager({ 
  visible, 
  onClose, 
  onLoad,
  selectedNodes,
  selectedEdges,
  mode = 'manage'
}: TemplateManagerProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form] = Form.useForm();
  const [saveForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['default']));
  const [selectedCategory, setSelectedCategory] = useState<string>('default');
  const hasInitialized = useRef(false);

  // テンプレートを読み込む
  useEffect(() => {
    if (visible) {
      loadTemplates();
    }
  }, [visible]);

  // 初回起動時にLocalStorageから移行
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      const migrated = localStorage.getItem('templates_migrated');
      if (!migrated) {
        templateService.migrateFromLocalStorage().then((count) => {
          if (count > 0) {
            message.info(`${count}個のテンプレートをファイルベースに移行しました`);
          }
        });
      }
    }
  }, []);
  
  // 既存のカテゴリを取得
  const getExistingCategories = (): string[] => {
    const categories = new Set<string>();
    templates.forEach(t => {
      if (t.category) {
        categories.add(t.category);
      }
    });
    return Array.from(categories);
  };

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const templates = await templateService.getAllTemplates();
      // 古い形式から新しい形式への変換
      const updatedTemplates = templates.map((t: any) => ({
        id: t.id || `template-${Date.now()}-${Math.random()}`,
        name: t.name,
        description: t.description || '',
        nodes: t.nodes,
        edges: t.edges,
        createdAt: t.createdAt || new Date().toISOString(),
        updatedAt: t.updatedAt || t.createdAt || new Date().toISOString(),
        category: t.category || 'default',
        tags: t.tags || []
      }));
      setTemplates(updatedTemplates);
    } catch (error) {
      console.error('Failed to load templates:', error);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const saveTemplates = async (newTemplates: Template[]) => {
    // ファイルベースの保存は個別に行うため、ここでは状態更新のみ
    setTemplates(newTemplates);
  };

  // 新規テンプレート保存
  const handleSaveNew = async () => {
    if (!selectedNodes || selectedNodes.length === 0) {
      message.warning('保存するノードを選択してください');
      return;
    }

    try {
      const values = await saveForm.validateFields();
      
      const selectedNodeIds = new Set(selectedNodes.map(n => n.id));
      const templateEdges = selectedEdges?.filter(
        edge => selectedNodeIds.has(edge.source) && selectedNodeIds.has(edge.target)
      ) || [];
      
      const newTemplate: Template = {
        id: `template-${Date.now()}`,
        name: values.name,
        description: values.description || '',
        nodes: selectedNodes,
        edges: templateEdges,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        category: Array.isArray(values.category) ? values.category[0] : (values.category || 'default'),
        tags: values.tags ? values.tags.split(',').map((t: string) => t.trim()) : []
      };
      
      // ファイルとして保存
      await templateService.saveTemplate(newTemplate);
      
      // 状態を更新
      const updatedTemplates = [...templates, newTemplate];
      setTemplates(updatedTemplates);
      
      message.success('テンプレートを保存しました');
      saveForm.resetFields();
      if (mode === 'save') {
        onClose();
      }
    } catch (error) {
      console.error('Failed to save template:', error);
    }
  };

  // テンプレート編集
  const handleEdit = async (template: Template) => {
    try {
      const values = await form.validateFields();
      
      const updatedTemplate = {
        ...template,
        name: values.name,
        description: values.description || '',
        updatedAt: new Date().toISOString(),
        category: values.category || template.category,
        tags: values.tags ? values.tags.split(',').map((t: string) => t.trim()) : template.tags
      };
      
      // ファイルを更新
      await templateService.updateTemplate(template.id, {
        name: values.name,
        description: values.description || '',
        category: values.category || template.category,
        tags: values.tags ? values.tags.split(',').map((t: string) => t.trim()) : template.tags
      });
      
      // 状態を更新
      const updatedTemplates = templates.map(t => 
        t.id === template.id ? updatedTemplate : t
      );
      setTemplates(updatedTemplates);
      
      message.success('テンプレートを更新しました');
      setEditingId(null);
      form.resetFields();
    } catch (error) {
      console.error('Failed to update template:', error);
    }
  };

  // テンプレート削除
  const handleDelete = async (id: string) => {
    try {
      // ファイルから削除
      await templateService.deleteTemplate(id);
      
      // 状態を更新
      const updatedTemplates = templates.filter(t => t.id !== id);
      setTemplates(updatedTemplates);
      
      message.success('テンプレートを削除しました');
    } catch (error) {
      message.error('テンプレートの削除に失敗しました');
    }
  };

  // テンプレート読み込み
  const handleLoadTemplate = (template: Template) => {
    if (!onLoad) return;
    
    // 新しいIDを生成してノードとエッジを複製
    const timestamp = Date.now();
    const idMap = new Map<string, string>();
    
    const newNodes = template.nodes.map((node, index) => {
      const newId = `${node.id}-${timestamp}-${index}`;
      idMap.set(node.id, newId);
      return {
        ...node,
        id: newId,
        position: {
          x: node.position.x + 50,
          y: node.position.y + 50
        }
      };
    });
    
    const newEdges = template.edges.map((edge, index) => ({
      ...edge,
      id: `${edge.id}-${timestamp}-${index}`,
      source: idMap.get(edge.source) || edge.source,
      target: idMap.get(edge.target) || edge.target,
    }));
    
    onLoad(newNodes, newEdges);
    message.success(`テンプレート「${template.name}」を読み込みました`);
    if (mode === 'load') {
      onClose();
    }
  };

  // 単一テンプレートのエクスポート
  const handleExportTemplate = (template: Template) => {
    const dataStr = JSON.stringify(template, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `template-${template.name.replace(/\s+/g, '-')}-${Date.now()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    message.success('テンプレートをエクスポートしました');
  };

  // 全テンプレートのエクスポート
  const handleExportAll = () => {
    const dataStr = JSON.stringify(templates, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `templates-all-${Date.now()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    message.success(`${templates.length}個のテンプレートをエクスポートしました`);
  };

  // テンプレートの再読み込み
  const handleReloadTemplates = async () => {
    await loadTemplates();
    message.success('テンプレートを再読み込みしました');
  };

  // テンプレートのインポート
  const handleImport: UploadProps['customRequest'] = async (options) => {
    const { file } = options;
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const imported = JSON.parse(content);
        
        let newTemplates: Template[] = [];
        
        // 配列か単一オブジェクトかを判定
        if (Array.isArray(imported)) {
          newTemplates = imported.map((t: any) => ({
            ...t,
            id: t.id || `template-${Date.now()}-${Math.random()}`,
            updatedAt: new Date().toISOString()
          }));
        } else {
          newTemplates = [{
            ...imported,
            id: imported.id || `template-${Date.now()}`,
            updatedAt: new Date().toISOString()
          }];
        }
        
        // 各テンプレートをファイルとして保存
        for (const template of newTemplates) {
          await templateService.saveTemplate(template);
        }
        
        // テンプレートを再読み込み
        await loadTemplates();
        
        message.success(`${newTemplates.length}個のテンプレートをインポートしました`);
      } catch (error) {
        message.error('ファイルの読み込みに失敗しました');
        console.error('Import error:', error);
      }
    };
    
    reader.readAsText(file as File);
  };

  // カテゴリごとにテンプレートをグループ化
  const groupedTemplates = templates.reduce((acc, template) => {
    const category = template.category || 'default';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(template);
    return acc;
  }, {} as Record<string, Template[]>);

  // カテゴリの展開/折りたたみ
  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const columns = [
    {
      title: '名前',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Template) => {
        if (editingId === record.id) {
          return (
            <Form.Item name="name" rules={[{ required: true }]} style={{ margin: 0 }}>
              <Input placeholder="テンプレート名" />
            </Form.Item>
          );
        }
        return (
          <Space>
            <FileTextOutlined style={{ color: '#1890ff' }} />
            <Text strong>{text}</Text>
          </Space>
        );
      }
    },
    {
      title: '説明',
      dataIndex: 'description',
      key: 'description',
      width: '30%',
      render: (text: string, record: Template) => {
        if (editingId === record.id) {
          return (
            <Form.Item name="description" style={{ margin: 0 }}>
              <TextArea rows={2} placeholder="説明（オプション）" />
            </Form.Item>
          );
        }
        return <Text type="secondary">{text || '-'}</Text>;
      }
    },
    {
      title: 'ノード数',
      key: 'nodeCount',
      width: 100,
      render: (record: Template) => (
        <Tag color="blue">{record.nodes.length}個</Tag>
      )
    },
    {
      title: '更新日時',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 180,
      render: (text: string) => new Date(text).toLocaleString('ja-JP')
    },
    {
      title: 'アクション',
      key: 'actions',
      width: 200,
      render: (record: Template) => {
        if (editingId === record.id) {
          return (
            <Space>
              <Button
                size="small"
                type="primary"
                icon={<SaveOutlined />}
                onClick={() => handleEdit(record)}
              >
                保存
              </Button>
              <Button
                size="small"
                onClick={() => {
                  setEditingId(null);
                  form.resetFields();
                }}
              >
                キャンセル
              </Button>
            </Space>
          );
        }
        
        return (
          <Space>
            {mode === 'load' && (
              <Tooltip title="読み込み">
                <Button
                  size="small"
                  type="primary"
                  icon={<ImportOutlined />}
                  onClick={() => handleLoadTemplate(record)}
                />
              </Tooltip>
            )}
            <Tooltip title="編集">
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => {
                  setEditingId(record.id);
                  form.setFieldsValue({
                    name: record.name,
                    description: record.description,
                    category: record.category,
                    tags: record.tags?.join(', ')
                  });
                }}
              />
            </Tooltip>
            <Tooltip title="エクスポート">
              <Button
                size="small"
                icon={<DownloadOutlined />}
                onClick={() => handleExportTemplate(record)}
              />
            </Tooltip>
            <Popconfirm
              title="削除確認"
              description="このテンプレートを削除しますか？"
              onConfirm={() => handleDelete(record.id)}
              okText="削除"
              cancelText="キャンセル"
            >
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
              />
            </Popconfirm>
          </Space>
        );
      }
    }
  ];

  return (
    <Modal
      title={
        <Space>
          {mode === 'save' ? <SaveOutlined /> : 
           mode === 'load' ? <FolderOpenOutlined /> : 
           <AppstoreOutlined />}
          {mode === 'save' ? '選択したノードをテンプレートとして保存' : 
           mode === 'load' ? 'テンプレートから読み込み' : 
           'テンプレート管理（編集・エクスポート・インポート）'}
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={900}
      footer={
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <Button 
              icon={<CloudDownloadOutlined />} 
              onClick={handleReloadTemplates}
              loading={loading}
              title="テンプレートを再読み込み"
            >
              再読み込み
            </Button>
            <Upload
              accept=".json"
              showUploadList={false}
              customRequest={handleImport}
            >
              <Button icon={<UploadOutlined />}>
                インポート
              </Button>
            </Upload>
            {templates.length > 0 && (
              <Button icon={<ExportOutlined />} onClick={handleExportAll}>
                すべてエクスポート
              </Button>
            )}
          </Space>
          <Button onClick={onClose}>
            閉じる
          </Button>
        </Space>
      }
    >
      {mode === 'save' && (
        selectedNodes && selectedNodes.length > 0 ? (
        <Form
          form={saveForm}
          layout="vertical"
          onFinish={handleSaveNew}
          style={{ marginBottom: 24 }}
        >
          <Form.Item
            name="name"
            label="テンプレート名"
            rules={[{ required: true, message: 'テンプレート名を入力してください' }]}
          >
            <Input placeholder="例：ログインフロー" />
          </Form.Item>
          <Form.Item name="description" label="説明">
            <TextArea rows={3} placeholder="このテンプレートの説明を入力..." />
          </Form.Item>
          <Form.Item name="category" label="カテゴリ（フォルダ）">
            <Select
              placeholder="カテゴリを選択または入力"
              mode="tags"
              maxCount={1}
              defaultValue={["default"]}
              options={[
                { label: 'デフォルト', value: 'default' },
                { label: '認証', value: '認証' },
                { label: 'ナビゲーション', value: 'ナビゲーション' },
                { label: 'フォーム', value: 'フォーム' },
                { label: 'テスト', value: 'テスト' },
                { label: 'UI操作', value: 'UI操作' },
                { label: 'データ', value: 'データ' },
                ...getExistingCategories()
                  .filter(cat => !['default', '認証', 'ナビゲーション', 'フォーム', 'テスト', 'UI操作', 'データ'].includes(cat))
                  .map(cat => ({ label: cat, value: cat }))
              ]}
            />
          </Form.Item>
          <Form.Item name="tags" label="タグ（カンマ区切り）">
            <Input placeholder="例：login, form, validation" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
              新規保存
            </Button>
          </Form.Item>
        </Form>
        ) : (
          <Empty 
            description="テンプレートとして保存するノードを選択してください" 
            style={{ margin: '40px 0' }}
          />
        )
      )}

      <Form form={form}>
        {mode === 'load' ? (
          // 読み込みモードの場合はフォルダツリー表示
          <div style={{ 
            border: '1px solid #f0f0f0', 
            borderRadius: '4px',
            maxHeight: '500px',
            overflowY: 'auto'
          }}>
            {Object.keys(groupedTemplates).length === 0 ? (
              <Empty description="テンプレートがありません" style={{ margin: '40px 0' }} />
            ) : (
              Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
                <div key={category} style={{ marginBottom: '1px' }}>
                  <div
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#fafafa',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      borderBottom: '1px solid #f0f0f0',
                      transition: 'background-color 0.3s'
                    }}
                    onClick={() => toggleCategory(category)}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fafafa'}
                  >
                    {expandedCategories.has(category) ? 
                      <DownOutlined style={{ fontSize: '10px' }} /> : 
                      <RightOutlined style={{ fontSize: '10px' }} />}
                    <span style={{ color: categoryConfig[category]?.color || '#faad14' }}>
                      {categoryConfig[category]?.icon || <FolderOutlined />}
                    </span>
                    <Text strong>{category}</Text>
                    <Tag size="small" style={{ marginLeft: 'auto' }}>
                      {categoryTemplates.length}
                    </Tag>
                  </div>
                  {expandedCategories.has(category) && (
                    <div style={{ backgroundColor: 'white' }}>
                      {categoryTemplates.map(template => (
                        <div
                          key={template.id}
                          style={{
                            padding: '12px 16px 12px 48px',
                            borderBottom: '1px solid #f0f0f0',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            transition: 'background-color 0.3s'
                          }}
                          onClick={() => handleLoadTemplate(template)}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f8ff'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                        >
                          <Space>
                            <FileTextOutlined style={{ color: '#1890ff' }} />
                            <div>
                              <Text strong>{template.name}</Text>
                              {template.description && (
                                <div>
                                  <Text type="secondary" style={{ fontSize: '12px' }}>
                                    {template.description}
                                  </Text>
                                </div>
                              )}
                            </div>
                          </Space>
                          <Space>
                            <Tag color="blue" size="small">{template.nodes.length}ノード</Tag>
                            <Button
                              size="small"
                              type="primary"
                              ghost
                              icon={<ImportOutlined />}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLoadTemplate(template);
                              }}
                            >
                              読み込み
                            </Button>
                          </Space>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          // 管理モードの場合は従来のテーブル表示
          <Table
            dataSource={templates}
            columns={columns}
            rowKey="id"
            pagination={false}
            scroll={{ y: 400 }}
            locale={{
              emptyText: 'テンプレートがありません'
            }}
          />
        )}
      </Form>
    </Modal>
  );
}