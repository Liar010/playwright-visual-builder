import { useCallback, useState } from 'react';
import { Node } from 'reactflow';
import { Typography, Space, Collapse } from 'antd';
import {
  GlobalOutlined,
  EditOutlined,
  CheckCircleOutlined,
  BranchesOutlined,
  ClockCircleOutlined,
  CameraOutlined,
  FileSearchOutlined,
  DoubleRightOutlined,
  DoubleLeftOutlined,
  ReloadOutlined,
  UploadOutlined,
  DragOutlined,
  EnterOutlined,
  MenuOutlined,
  VerticalAlignMiddleOutlined,
  ApiOutlined,
  FileTextOutlined,
  TagOutlined,
  SettingOutlined,
  DownloadOutlined,
  FileAddOutlined,
  SwitcherOutlined,
  DatabaseOutlined,
  CodeOutlined,
  SearchOutlined
} from '@ant-design/icons';
import type { NodeType } from '@playwright-visual-builder/shared';

const { Title } = Typography;

interface NodePanelProps {
  nodes: Node[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  reactFlowInstance?: any;
}

const nodeTemplates = [
  // Navigation
  {
    type: 'navigate' as NodeType,
    label: 'ページ遷移',
    icon: <GlobalOutlined />,
    defaultData: { label: 'Navigate', action: { url: '' } },
    category: 'navigation',
  },
  {
    type: 'goBack' as NodeType,
    label: '戻る',
    icon: <DoubleLeftOutlined />,
    defaultData: { label: 'Go Back', action: {} },
    category: 'navigation',
  },
  {
    type: 'goForward' as NodeType,
    label: '進む',
    icon: <DoubleRightOutlined />,
    defaultData: { label: 'Go Forward', action: {} },
    category: 'navigation',
  },
  {
    type: 'reload' as NodeType,
    label: 'リロード',
    icon: <ReloadOutlined />,
    defaultData: { label: 'Reload', action: {} },
    category: 'navigation',
  },
  // Mouse Actions
  {
    type: 'click' as NodeType,
    label: 'クリック',
    icon: <FileSearchOutlined />,
    defaultData: { label: 'Click', action: { selector: '' } },
    category: 'mouse',
  },
  {
    type: 'doubleClick' as NodeType,
    label: 'ダブルクリック',
    icon: <DoubleRightOutlined />,
    defaultData: { label: 'Double Click', action: { selector: '' } },
    category: 'mouse',
  },
  {
    type: 'rightClick' as NodeType,
    label: '右クリック',
    icon: <MenuOutlined />,
    defaultData: { label: 'Right Click', action: { selector: '' } },
    category: 'mouse',
  },
  {
    type: 'hover' as NodeType,
    label: 'ホバー',
    icon: <DragOutlined />,
    defaultData: { label: 'Hover', action: { selector: '' } },
    category: 'mouse',
  },
  {
    type: 'dragAndDrop' as NodeType,
    label: 'ドラッグ&ドロップ',
    icon: <DragOutlined />,
    defaultData: { label: 'Drag & Drop', action: { sourceSelector: '', targetSelector: '' } },
    category: 'mouse',
  },
  // Input Actions
  {
    type: 'fill' as NodeType,
    label: 'テキスト入力',
    icon: <EditOutlined />,
    defaultData: { label: 'Fill', action: { selector: '', value: '' } },
    category: 'input',
  },
  {
    type: 'select' as NodeType,
    label: 'セレクト選択',
    icon: <MenuOutlined />,
    defaultData: { label: 'Select', action: { selector: '', value: '' } },
    category: 'input',
  },
  {
    type: 'check' as NodeType,
    label: 'チェックボックス',
    icon: <CheckCircleOutlined />,
    defaultData: { label: 'Check', action: { selector: '' } },
    category: 'input',
  },
  {
    type: 'uploadFile' as NodeType,
    label: 'ファイルアップロード',
    icon: <UploadOutlined />,
    defaultData: { label: 'Upload File', action: { selector: '', filePath: '' } },
    category: 'input',
  },
  {
    type: 'focus' as NodeType,
    label: 'フォーカス',
    icon: <EnterOutlined />,
    defaultData: { label: 'Focus', action: { selector: '' } },
    category: 'input',
  },
  {
    type: 'blur' as NodeType,
    label: 'フォーカス解除',
    icon: <EnterOutlined style={{ transform: 'rotate(180deg)' }} />,
    defaultData: { label: 'Blur', action: { selector: '' } },
    category: 'input',
  },
  {
    type: 'keyboard' as NodeType,
    label: 'キーボード入力',
    icon: <EnterOutlined />,
    defaultData: { label: 'Keyboard', action: { key: '' } },
    category: 'input',
  },
  {
    type: 'scroll' as NodeType,
    label: 'スクロール',
    icon: <VerticalAlignMiddleOutlined />,
    defaultData: { label: 'Scroll', action: { selector: '', direction: 'down', amount: 100 } },
    category: 'input',
  },
  // Wait Actions
  {
    type: 'waitForResponse' as NodeType,
    label: 'レスポンス待機',
    icon: <ApiOutlined />,
    defaultData: { label: 'Wait for Response', action: { urlPattern: '', statusCode: 200 } },
    category: 'wait',
  },
  {
    type: 'waitForRequest' as NodeType,
    label: 'リクエスト待機',
    icon: <ApiOutlined />,
    defaultData: { label: 'Wait for Request', action: { urlPattern: '', method: 'GET' } },
    category: 'wait',
  },
  {
    type: 'waitForFunction' as NodeType,
    label: '関数待機',
    icon: <ClockCircleOutlined />,
    defaultData: { label: 'Wait for Function', action: { expression: 'true' } },
    category: 'wait',
  },
  {
    type: 'wait' as NodeType,
    label: '待機',
    icon: <ClockCircleOutlined />,
    defaultData: { label: 'Wait', action: { timeout: 1000 } },
    category: 'wait',
  },
  {
    type: 'waitForHidden' as NodeType,
    label: '要素が消えるまで待機',
    icon: <ClockCircleOutlined />,
    defaultData: { label: 'Wait for Hidden', action: { selector: '' } },
    category: 'wait',
  },
  {
    type: 'waitForURL' as NodeType,
    label: 'URL変更待機',
    icon: <ApiOutlined />,
    defaultData: { label: 'Wait for URL', action: { urlPattern: '' } },
    category: 'wait',
  },
  {
    type: 'waitForLoadState' as NodeType,
    label: 'ページ読込待機',
    icon: <ReloadOutlined />,
    defaultData: { label: 'Wait for Load', action: { state: 'networkidle' } },
    category: 'wait',
  },
  // Assertions
  {
    type: 'getCount' as NodeType,
    label: '要素数取得',
    icon: <TagOutlined />,
    defaultData: { label: 'Get Count', action: { selector: '' } },
    category: 'assertion',
  },
  {
    type: 'assertion' as NodeType,
    label: 'アサーション',
    icon: <CheckCircleOutlined />,
    defaultData: {
      label: 'Assert',
      assertion: { selector: '', comparison: 'exists' },
    },
    category: 'assertion',
  },
  {
    type: 'getText' as NodeType,
    label: 'テキスト取得',
    icon: <FileTextOutlined />,
    defaultData: { label: 'Get Text', action: { selector: '' } },
    category: 'assertion',
  },
  {
    type: 'getAttribute' as NodeType,
    label: '属性取得',
    icon: <TagOutlined />,
    defaultData: { label: 'Get Attribute', action: { selector: '', attribute: '' } },
    category: 'assertion',
  },
  {
    type: 'isEnabled' as NodeType,
    label: '有効状態確認',
    icon: <CheckCircleOutlined />,
    defaultData: { label: 'Is Enabled', action: { selector: '' } },
    category: 'assertion',
  },
  {
    type: 'isDisabled' as NodeType,
    label: '無効状態確認',
    icon: <CheckCircleOutlined style={{ opacity: 0.5 }} />,
    defaultData: { label: 'Is Disabled', action: { selector: '' } },
    category: 'assertion',
  },
  {
    type: 'isChecked' as NodeType,
    label: 'チェック状態確認',
    icon: <CheckCircleOutlined />,
    defaultData: { label: 'Is Checked', action: { selector: '' } },
    category: 'assertion',
  },
  {
    type: 'isVisible' as NodeType,
    label: '表示状態確認',
    icon: <CheckCircleOutlined />,
    defaultData: { label: 'Is Visible', action: { selector: '' } },
    category: 'assertion',
  },
  // Advanced
  {
    type: 'screenshot' as NodeType,
    label: 'スクリーンショット',
    icon: <CameraOutlined />,
    defaultData: { label: 'Screenshot', action: {} },
    category: 'advanced',
  },
  {
    type: 'iframe' as NodeType,
    label: 'iframe操作',
    icon: <FileTextOutlined />,
    defaultData: { label: 'iFrame', action: { selector: 'iframe', iframeAction: 'switch' } },
    category: 'advanced',
  },
  {
    type: 'dialog' as NodeType,
    label: 'ダイアログ処理',
    icon: <ApiOutlined />,
    defaultData: { label: 'Dialog', action: { dialogAction: 'accept' } },
    category: 'advanced',
  },
  {
    type: 'download' as NodeType,
    label: 'ダウンロード',
    icon: <DownloadOutlined />,
    defaultData: { label: 'Download', action: { triggerSelector: '' } },
    category: 'advanced',
  },
  {
    type: 'newPage' as NodeType,
    label: '新規ページ',
    icon: <FileAddOutlined />,
    defaultData: { label: 'New Page', action: { url: '' } },
    category: 'advanced',
  },
  {
    type: 'switchTab' as NodeType,
    label: 'タブ切替',
    icon: <SwitcherOutlined />,
    defaultData: { label: 'Switch Tab', action: { index: 0 } },
    category: 'advanced',
  },
  {
    type: 'setCookie' as NodeType,
    label: 'Cookie設定',
    icon: <SettingOutlined />,
    defaultData: { label: 'Set Cookie', action: { name: '', value: '' } },
    category: 'advanced',
  },
  {
    type: 'localStorage' as NodeType,
    label: 'LocalStorage',
    icon: <DatabaseOutlined />,
    defaultData: { label: 'LocalStorage', action: { storageAction: 'set', key: '', value: '' } },
    category: 'advanced',
  },
  {
    type: 'networkIntercept' as NodeType,
    label: 'ネットワーク制御',
    icon: <ApiOutlined />,
    defaultData: { label: 'Network Intercept', action: { interceptAction: 'mock', urlPattern: '' } },
    category: 'advanced',
  },
  {
    type: 'condition' as NodeType,
    label: '条件分岐',
    icon: <BranchesOutlined />,
    defaultData: {
      label: 'If/Else',
      condition: { expression: '' },
    },
    category: 'advanced',
  },
  {
    type: 'loop' as NodeType,
    label: 'ループ',
    icon: <ReloadOutlined />,
    defaultData: {
      label: 'Loop',
      loop: { type: 'count', count: 3 },
    },
    category: 'advanced',
  },
  {
    type: 'customCode' as NodeType,
    label: 'カスタムコード',
    icon: <CodeOutlined />,
    defaultData: {
      label: 'Custom Code',
      customCode: { 
        code: '// カスタムコードを入力', 
        description: '',
        wrapInTryCatch: false 
      },
    },
    category: 'advanced',
  },
  {
    type: 'comment' as NodeType,
    label: 'コメント',
    icon: <EditOutlined />,
    defaultData: {
      label: 'コメント',
      comment: 'ここにコメントを入力\n\nテストの説明や注意事項を記載できます',
    },
    category: 'advanced',
  },
  {
    type: 'discoverSelectors' as NodeType,
    label: 'セレクタ探索',
    icon: <SearchOutlined />,
    defaultData: {
      label: 'セレクタ探索',
      storageLabel: '',  // 空の場合はノードIDを使用
      description: '',
      options: {
        inputs: true,
        buttons: true,
        links: true,
      },
    },
    category: 'advanced',
  },
];

const categories = [
  { key: 'navigation', label: 'ナビゲーション', icon: <GlobalOutlined /> },
  { key: 'mouse', label: 'マウス操作', icon: <FileSearchOutlined /> },
  { key: 'input', label: '入力', icon: <EditOutlined /> },
  { key: 'wait', label: '待機', icon: <ClockCircleOutlined /> },
  { key: 'assertion', label: '検証', icon: <CheckCircleOutlined /> },
  { key: 'advanced', label: '高度な機能', icon: <SettingOutlined /> },
];

export default function NodePanel({ setNodes, reactFlowInstance }: NodePanelProps) {
  const [activeKeys, setActiveKeys] = useState<string[]>(['navigation', 'mouse', 'input']);
  
  const addNode = useCallback(
    (template: typeof nodeTemplates[0]) => {
      let position = { x: 100, y: 100 };
      
      if (reactFlowInstance) {
        // ビューポートの中心を取得
        const { x, y, zoom } = reactFlowInstance.getViewport();
        const flowWrapper = document.querySelector('.react-flow');
        
        if (flowWrapper) {
          const bounds = flowWrapper.getBoundingClientRect();
          
          // ビューポート中心のスクリーン座標
          const centerX = bounds.width / 2;
          const centerY = bounds.height / 2;
          
          // スクリーン座標をフロー座標に変換
          position = {
            x: (centerX - x) / zoom - 100,
            y: (centerY - y) / zoom - 40,
          };
        }
      }
      
      const timestamp = Date.now();
      const newNode: Node = {
        id: `node-${timestamp}`,
        type: template.type,
        position,
        data: { ...template.defaultData },
        zIndex: 1000,
      };
      
      // 条件分岐の場合、自動的にEndノードも追加
      if (template.type === 'condition') {
        const endNode: Node = {
          id: `node-${timestamp}-end`,
          type: 'conditionEnd' as NodeType,
          position: { x: position.x, y: position.y + 200 },
          data: { label: 'End If', pairId: newNode.id },
          zIndex: 999,
        };
        
        setNodes((nds) => {
          const updatedNodes = nds.map(node => ({ ...node, zIndex: node.zIndex ? node.zIndex - 1 : 0 }));
          // データに相互参照を追加
          newNode.data.pairId = endNode.id;
          return [...updatedNodes, newNode, endNode];
        });
      }
      // ループの場合、自動的にEndノードも追加
      else if (template.type === 'loop') {
        const endNode: Node = {
          id: `node-${timestamp}-end`,
          type: 'loopEnd' as NodeType,
          position: { x: position.x, y: position.y + 200 },
          data: { label: 'End Loop', pairId: newNode.id },
          zIndex: 999,
        };
        
        setNodes((nds) => {
          const updatedNodes = nds.map(node => ({ ...node, zIndex: node.zIndex ? node.zIndex - 1 : 0 }));
          // データに相互参照を追加
          newNode.data.pairId = endNode.id;
          return [...updatedNodes, newNode, endNode];
        });
      }
      // その他のノード
      else {
        setNodes((nds) => {
          const updatedNodes = nds.map(node => ({ ...node, zIndex: node.zIndex ? node.zIndex - 1 : 0 }));
          return [...updatedNodes, newNode];
        });
      }
    },
    [setNodes, reactFlowInstance]
  );

  return (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <div style={{ 
        padding: '16px', 
        overflowY: 'auto',
        flex: 1
      }}>
        <Title level={5}>テストアクション</Title>
        <Collapse 
          activeKey={activeKeys}
          onChange={(keys) => setActiveKeys(keys as string[])}
          style={{ marginBottom: '16px' }}
        >
          {categories.map((category) => (
            <Collapse.Panel
              key={category.key}
              header={
                <span>
                  {category.icon} {category.label}
                </span>
              }
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                {nodeTemplates
                  .filter((template) => template.category === category.key)
                  .map((template) => (
                    <div
                      key={template.type}
                      onClick={() => addNode(template)}
                      style={{
                        padding: '8px 12px',
                        border: '1px solid #e8e8e8',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.3s',
                        backgroundColor: 'white',
                        fontSize: '13px',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f0f0f0';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'white';
                      }}
                    >
                      {template.icon}
                      <span>{template.label}</span>
                    </div>
                  ))}
              </Space>
            </Collapse.Panel>
          ))}
        </Collapse>
        <div style={{ marginTop: '24px', paddingBottom: '16px' }}>
          <Title level={5}>使い方</Title>
          <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
            1. 上のアクションをクリックしてテストフローを構築
            <br />
            2. ノードを接続して実行順序を定義
            <br />
            3. ノードをダブルクリックしてプロパティを編集
            <br />
            4. Shiftキー + ドラッグで複数選択
            <br />
            5. 選択したノードをテンプレート保存可能
            <br />
            6. 実行ボタンでテストを実行
          </Typography.Text>
        </div>
      </div>
    </div>
  );
}