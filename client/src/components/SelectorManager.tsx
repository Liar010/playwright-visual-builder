import { useState, useEffect } from 'react';
import { Modal, Table, Button, Space, Typography, Tag, Popconfirm, Input, message, Card, Empty, Tooltip, Tree, TreeDataNode, Upload, Select, List, Alert } from 'antd';
import { DeleteOutlined, EditOutlined, ReloadOutlined, SearchOutlined, FolderOutlined, FileOutlined, ExportOutlined, ImportOutlined, HistoryOutlined } from '@ant-design/icons';
import { 
  selectorService, 
  SavedSelectors, 
  SelectorData,
  migrateToCategorized,
  getSelectorsByCategory
} from '../services/selectorService';

const { Title, Text } = Typography;
const { Search } = Input;

interface SelectorManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectorSelect?: (selector: string) => void;
}

export default function SelectorManager({ isOpen, onClose, onSelectorSelect }: SelectorManagerProps) {
  const [selectors, setSelectors] = useState<SavedSelectors>({});
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [showImportExport, setShowImportExport] = useState(false);
  const [exportCategory, setExportCategory] = useState<string>('all');
  const [backups, setBackups] = useState<Array<{ timestamp: string; date: string; displayDate: string }>>([]);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSelectors();
      loadBackups();
    }
  }, [isOpen]);

  const loadSelectors = async () => {
    setLoading(true);
    try {
      const data = await selectorService.getCurrentFlowSelectors();
      setSelectors(data);
    } catch (error) {
      message.error('セレクタの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const loadBackups = async () => {
    try {
      const data = await selectorService.getBackups();
      setBackups(data);
    } catch (error) {
      console.error('Failed to load backups:', error);
    }
  };

  const handleDelete = async (category: string, label: string, selectorName?: string) => {
    try {
      const categorized = migrateToCategorized(selectors);
      
      // categoriesが存在しない場合は初期化
      if (!categorized.categories) {
        categorized.categories = {};
      }
      
      if (selectorName) {
        // 特定のセレクタを削除
        if (categorized.categories[category]?.[label]?.selectors) {
          delete categorized.categories[category][label].selectors[selectorName];
          // セレクタが空になったらラベル全体を削除
          if (Object.keys(categorized.categories[category][label].selectors).length === 0) {
            delete categorized.categories[category][label];
            // カテゴリが空になったらカテゴリを削除
            if (Object.keys(categorized.categories[category]).length === 0) {
              delete categorized.categories[category];
            }
          }
        }
        setSelectors(categorized);
        await selectorService.updateSelectors('default', categorized);
        message.success('セレクタを削除しました');
      } else {
        // ラベル全体を削除
        if (categorized.categories[category]) {
          delete categorized.categories[category][label];
          // カテゴリが空になったらカテゴリを削除
          if (Object.keys(categorized.categories[category]).length === 0) {
            delete categorized.categories[category];
          }
        }
        setSelectors(categorized);
        await selectorService.updateSelectors('default', categorized);
        message.success('ラベルグループを削除しました');
      }
    } catch (error) {
      console.error('削除エラー:', error);
      message.error('削除に失敗しました');
    }
  };

  const handleEdit = async (category: string, label: string, selectorName: string) => {
    const editKey = `${category}/${label}/${selectorName}`;
    
    if (editingKey === editKey) {
      // 保存処理
      try {
        const categorized = migrateToCategorized(selectors);
        
        // categoriesが存在しない場合は初期化
        if (!categorized.categories) {
          categorized.categories = {};
        }
        if (!categorized.categories[category]) {
          categorized.categories[category] = {};
        }
        if (!categorized.categories[category][label]) {
          categorized.categories[category][label] = {
            url: '',
            lastUpdated: new Date().toISOString(),
            selectors: {}
          };
        }
        
        categorized.categories[category][label].selectors[selectorName] = editingValue;
        setSelectors(categorized);
        await selectorService.updateSelectors('default', categorized);
        message.success('セレクタを更新しました');
        setEditingKey(null);
        setEditingValue('');
      } catch (error) {
        console.error('更新エラー:', error);
        message.error('更新に失敗しました');
      }
    } else {
      // 編集開始
      setEditingKey(editKey);
      const categoryMap = getSelectorsByCategory(selectors);
      const labelMap = categoryMap.get(category);
      const data = labelMap?.get(label);
      if (data?.selectors) {
        setEditingValue(data.selectors[selectorName] || '');
      }
    }
  };


  const handleSelectSelector = (selector: string) => {
    if (onSelectorSelect) {
      onSelectorSelect(selector);
      onClose();
    }
  };

  const handleExport = async () => {
    try {
      const blob = exportCategory === 'all' 
        ? await selectorService.exportAll()
        : await selectorService.exportCategory(exportCategory);
      
      // ダウンロード処理
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = exportCategory === 'all' 
        ? `selectors_export_${timestamp}.json`
        : `selectors_${exportCategory}_${timestamp}.json`;
      
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      message.success('セレクタをエクスポートしました');
    } catch (error) {
      message.error('エクスポートに失敗しました');
    }
  };

  const handleImport = async (file: File) => {
    setImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      const result = await selectorService.import(data);
      
      if (result.success) {
        message.success(
          `インポート完了: ${result.stats.added}件追加、${result.stats.skipped}件スキップ\n` +
          `バックアップ: ${result.backupTimestamp}`
        );
        loadSelectors();
        loadBackups();
      }
    } catch (error) {
      message.error('インポートに失敗しました。ファイル形式を確認してください。');
    } finally {
      setImporting(false);
    }
    
    return false; // Prevent default upload behavior
  };

  const handleRestore = async (timestamp: string) => {
    try {
      const result = await selectorService.restoreFromBackup(timestamp);
      if (result.success) {
        message.success(`バックアップ（${timestamp}）から復元しました`);
        loadSelectors();
        loadBackups();
      }
    } catch (error) {
      message.error('復元に失敗しました');
    }
  };

  const renderSelectorTable = (category: string, label: string, data: SelectorData) => {
    const selectorData = Object.entries(data.selectors || {})
      .filter(([name, selector]) => {
        const searchLower = searchText.toLowerCase();
        return name.toLowerCase().includes(searchLower) || 
               (selector as string).toLowerCase().includes(searchLower);
      })
      .map(([name, selector]) => ({
        key: `${category}/${label}/${name}`,
        name,
        selector: selector as string,
        category,
        label
      }));

    if (selectorData.length === 0 && searchText) {
      return <Empty description="検索結果がありません" />;
    }

    return (
      <Table
        size="small"
        dataSource={selectorData}
        pagination={false}
        columns={[
          {
            title: '名前',
            dataIndex: 'name',
            key: 'name',
            width: '30%',
            render: (text: string) => (
              <Text strong style={{ fontSize: '12px' }}>{text}</Text>
            )
          },
          {
            title: 'セレクタ',
            dataIndex: 'selector',
            key: 'selector',
            render: (text: string, record: any) => {
              const isEditing = editingKey === record.key;
              return isEditing ? (
                <Input
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  onPressEnter={() => handleEdit(record.category, record.label, record.name)}
                  size="small"
                  autoFocus
                />
              ) : (
                <Tooltip title={text}>
                  <Text 
                    code 
                    style={{ 
                      fontSize: '11px',
                      maxWidth: '300px',
                      display: 'inline-block',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                    onClick={() => onSelectorSelect && handleSelectSelector(text)}
                    className="selector-text"
                  >
                    {text}
                  </Text>
                </Tooltip>
              );
            }
          },
          {
            title: '操作',
            key: 'actions',
            width: '120px',
            render: (_: any, record: any) => {
              const isEditing = editingKey === record.key;
              return (
                <Space size="small">
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => handleEdit(record.category, record.label, record.name)}
                  >
                    {isEditing ? '保存' : '編集'}
                  </Button>
                  <Popconfirm
                    title="このセレクタを削除しますか？"
                    onConfirm={() => handleDelete(record.category, record.label, record.name)}
                    okText="削除"
                    cancelText="キャンセル"
                  >
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              );
            }
          }
        ]}
      />
    );
  };

  // カテゴリ構造を構築
  const buildCategoryTree = (): TreeDataNode[] => {
    const tree: TreeDataNode[] = [];
    const nodeMap = new Map<string, TreeDataNode>();
    const categoryData = getSelectorsByCategory(selectors);
    
    categoryData.forEach((labels, category) => {
      const categoryParts = category.split('/');
      let currentLevel = tree;
      let currentPath = '';
      
      categoryParts.forEach((part, index) => {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        
        let node = nodeMap.get(currentPath);
        if (!node) {
          node = {
            title: (
              <Space>
                <FolderOutlined />
                <span>{part}</span>
              </Space>
            ),
            key: currentPath,
            children: [],
          };
          nodeMap.set(currentPath, node);
          currentLevel.push(node);
        }
        
        if (index === categoryParts.length - 1) {
          // 最後のレベルにアイテムを追加
          labels.forEach((data, label) => {
            node!.children!.push({
              title: (
                <Space>
                  <FileOutlined />
                  <span>{label}</span>
                  <Tag color="blue">{Object.keys(data.selectors || {}).length}</Tag>
                </Space>
              ),
              key: `${currentPath}/${label}`,
              isLeaf: true,
            });
          });
        }
        
        currentLevel = node.children!;
      });
    });
    
    return tree;
  };
  
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  
  const treeData = buildCategoryTree();
  
  // カテゴリリストを取得
  const categories = Array.from(getSelectorsByCategory(selectors).keys());
  
  // 選択されたカテゴリ/ラベルのデータを取得
  const getSelectedData = (): { category: string; label: string; data: SelectorData } | null => {
    if (!selectedCategory) return null;
    
    const parts = selectedCategory.split('/');
    const label = parts[parts.length - 1];
    const category = parts.slice(0, -1).join('/') || 'default';
    
    const categoryMap = getSelectorsByCategory(selectors);
    const labelMap = categoryMap.get(category);
    const data = labelMap?.get(label);
    
    if (data) {
      return { category, label, data };
    }
    
    return null;
  };
  
  const selectedData = getSelectedData();

  return (
    <Modal
      title={
        <Space>
          <Title level={4} style={{ margin: 0 }}>セレクタ管理</Title>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={loadSelectors}
            loading={loading}
            size="small"
          />
          <Button
            icon={showImportExport ? <FolderOutlined /> : <ImportOutlined />}
            onClick={() => setShowImportExport(!showImportExport)}
            size="small"
          >
            {showImportExport ? '管理画面' : 'インポート/エクスポート'}
          </Button>
        </Space>
      }
      open={isOpen}
      onCancel={onClose}
      width={900}
      footer={null}
    >
      {showImportExport ? (
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Alert
            message="セレクタのインポート/エクスポート"
            description="セレクタをエクスポートしてバックアップを作成したり、他の環境からインポートしたりできます。インポートは安全モードで動作し、既存のセレクタは上書きされません。"
            type="info"
            showIcon
          />
          
          <Card title="エクスポート" size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Space>
                <span>エクスポート範囲:</span>
                <Select
                  value={exportCategory}
                  onChange={setExportCategory}
                  style={{ width: 200 }}
                >
                  <Select.Option value="all">すべてのセレクタ</Select.Option>
                  {categories.map(cat => (
                    <Select.Option key={cat} value={cat}>
                      カテゴリ: {cat}
                    </Select.Option>
                  ))}
                </Select>
                <Button
                  type="primary"
                  icon={<ExportOutlined />}
                  onClick={handleExport}
                >
                  エクスポート
                </Button>
              </Space>
            </Space>
          </Card>
          
          <Card title="インポート（安全モード）" size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Upload
                accept=".json"
                beforeUpload={handleImport}
                showUploadList={false}
                disabled={importing}
              >
                <Button
                  icon={<ImportOutlined />}
                  loading={importing}
                >
                  JSONファイルを選択してインポート
                </Button>
              </Upload>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                ※ 既存のセレクタは上書きされません。新しいセレクタのみが追加されます。
              </Text>
            </Space>
          </Card>
          
          <Card title="バックアップから復元" size="small">
            {backups.length > 0 ? (
              <List
                size="small"
                dataSource={backups.slice(0, 5)}
                renderItem={backup => (
                  <List.Item
                    actions={[
                      <Button
                        size="small"
                        icon={<HistoryOutlined />}
                        onClick={() => handleRestore(backup.timestamp)}
                      >
                        復元
                      </Button>
                    ]}
                  >
                    <List.Item.Meta
                      title={backup.displayDate}
                      description={`タイムスタンプ: ${backup.timestamp}`}
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="バックアップがありません" />
            )}
          </Card>
        </Space>
      ) : (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Search
            placeholder="セレクタを検索..."
            allowClear
            enterButton={<SearchOutlined />}
            size="middle"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          
          {Object.keys(selectors).length === 0 ? (
          <Empty 
            description="保存されたセレクタがありません"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Text type="secondary">
              セレクタ探索ノードを実行してセレクタを収集してください
            </Text>
          </Empty>
        ) : (
          <div style={{ display: 'flex', gap: '16px', height: '500px' }}>
            {/* カテゴリツリー */}
            <div style={{ width: '30%', borderRight: '1px solid #f0f0f0', paddingRight: '16px', overflowY: 'auto' }}>
              <Title level={5} style={{ marginBottom: '12px' }}>カテゴリ</Title>
              <Tree
                treeData={treeData}
                onSelect={(selectedKeys) => {
                  if (selectedKeys.length > 0) {
                    setSelectedCategory(selectedKeys[0] as string);
                  }
                }}
                onExpand={(keys) => setExpandedKeys(keys as string[])}
                expandedKeys={expandedKeys}
                selectedKeys={selectedCategory ? [selectedCategory] : []}
                style={{ background: 'transparent' }}
              />
            </div>
            
            {/* セレクタ詳細 */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {selectedData ? (
                <Card 
                  size="small"
                  title={selectedCategory?.split('/').pop()}
                  extra={
                    <Space>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        最終更新: {new Date(selectedData.data.lastUpdated).toLocaleString('ja-JP')}
                      </Text>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        URL: {selectedData.data.url}
                      </Text>
                      <Popconfirm
                        title="このグループのセレクタをすべて削除しますか？"
                        onConfirm={() => {
                          handleDelete(selectedData!.category, selectedData!.label);
                          setSelectedCategory(null);
                        }}
                        okText="削除"
                        cancelText="キャンセル"
                      >
                        <Button size="small" danger icon={<DeleteOutlined />}>
                          グループ削除
                        </Button>
                      </Popconfirm>
                    </Space>
                  }
                >
                  {renderSelectorTable(selectedData.category, selectedData.label, selectedData.data)}
                </Card>
              ) : (
                <Empty 
                  description="カテゴリまたはセレクタグループを選択してください"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )}
            </div>
          </div>
          )}
        </Space>
      )}
      
      <style>{`
        .selector-text {
          cursor: pointer;
        }
        .selector-text:hover {
          background-color: #f0f0f0;
          text-decoration: underline;
        }
      `}</style>
    </Modal>
  );
}