import { useState, useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  ReactFlowProvider,
} from 'reactflow';
import { Layout, Button, Space, message } from 'antd';
import {
  PlayCircleOutlined,
  SaveOutlined,
  FolderOpenOutlined,
  CodeOutlined,
  SettingOutlined,
  CopyOutlined,
  FileAddOutlined,
  RobotOutlined,
  ExportOutlined,
  ImportOutlined,
  FunctionOutlined
} from '@ant-design/icons';
import NodePanel from './components/NodePanel';
import VariablePanel from './components/VariablePanel';
import CodePreview from './components/CodePreview';
import TestRunner from './components/TestRunner';
import NodeEditor from './components/NodeEditor';
import FlowLoader from './components/FlowLoader';
import SaveFlowDialog from './components/SaveFlowDialog';
import TestConfigDialog from './components/TestConfigDialog';
import TemplateDialog from './components/TemplateDialog';
import TemplateLoader from './components/TemplateLoader';
import ExportFlowDialog from './components/ExportFlowDialog';
import ImportFlowDialog from './components/ImportFlowDialog';
import { nodeTypes } from './nodes';
import type { TestFlow, TestConfig } from '@playwright-visual-builder/shared';
import type { Variable } from './components/VariablePanel';
import './App.css';

const { Header, Sider, Content } = Layout;

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

function FlowBuilder() {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [showVariables, setShowVariables] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isLoaderOpen, setIsLoaderOpen] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isTemplateLoaderOpen, setIsTemplateLoaderOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [selectedNodes, setSelectedNodes] = useState<Node[]>([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [variables, setVariables] = useState<Variable[]>([]);
  const [testConfig, setTestConfig] = useState<TestConfig>({
    headless: true,
    viewport: { width: 1280, height: 720 },
    timeout: 30000,
    nodeDelay: 0
  });

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      setNodes((nds) => {
        const updatedNodes = applyNodeChanges(changes, nds);
        // 選択されたノードを追跡
        setSelectedNodes(updatedNodes.filter(node => node.selected));
        return updatedNodes;
      });
    },
    []
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect: OnConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    []
  );

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onNodeDoubleClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setIsEditorOpen(true);
  }, []);

  const handleSave = () => {
    if (nodes.length === 0) {
      message.warning('保存するノードがありません');
      return;
    }
    setIsSaveDialogOpen(true);
  };

  const handleRun = () => {
    if (nodes.length === 0) {
      message.warning('実行するノードがありません');
      return;
    }
    // 保存された設定ですぐに実行
    setIsRunning(true);
  };

  const handleConfigOpen = () => {
    setIsConfigDialogOpen(true);
  };

  const handleRunWithConfig = (config: TestConfig) => {
    setTestConfig(config);
    message.success('テスト設定を保存しました');
  };

  const handleNodeUpdate = (nodeId: string, data: any) => {
    setNodes((nds) =>
      nds.map((node) => (node.id === nodeId ? { ...node, data } : node))
    );
  };

  const handleLoadFlow = (flow: TestFlow) => {
    setNodes(flow.nodes || []);
    setEdges(flow.edges || []);
  };

  const handleNodeDelete = (nodeId: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    message.success('ノードを削除しました');
  };

  const handleSaveAsTemplate = () => {
    if (selectedNodes.length === 0) {
      message.warning('テンプレートとして保存するノードを選択してください');
      return;
    }
    setIsTemplateDialogOpen(true);
  };

  const handleLoadTemplate = () => {
    setIsTemplateLoaderOpen(true);
  };

  const handleTemplateLoad = (newNodes: Node[], newEdges: Edge[]) => {
    setNodes(newNodes);
    setEdges(newEdges);
  };

  const handleImport = (importedNodes: Node[], importedEdges: Edge[], importedConfig?: TestConfig) => {
    setNodes(importedNodes);
    setEdges(importedEdges);
    if (importedConfig) {
      setTestConfig(importedConfig);
    }
    message.success('フローをインポートしました');
  };

  return (
    <Layout style={{ height: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', padding: '0 24px' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          marginRight: 'auto',
          color: 'white'
        }}>
          <RobotOutlined style={{ fontSize: '24px' }} />
          <span style={{ 
            fontSize: '16px', 
            fontWeight: 600,
            display: 'inline-block',
            whiteSpace: 'nowrap'
          }}>
            PVB
          </span>
        </div>
        <Space>
          <Button
            icon={<SettingOutlined />}
            onClick={handleConfigOpen}
            title="テスト実行設定"
            size="middle"
          />
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={handleRun}
            disabled={isRunning || nodes.length === 0}
            title="テスト実行"
            size="middle"
          >
            実行
          </Button>
          <Button 
            icon={<SaveOutlined />} 
            onClick={handleSave}
            title="フローを保存"
            size="middle"
          />
          <Button 
            icon={<FolderOpenOutlined />} 
            onClick={() => setIsLoaderOpen(true)}
            title="フローを読み込み"
            size="middle"
          />
          <Button 
            icon={<ImportOutlined />} 
            onClick={() => setIsImportDialogOpen(true)}
            title="フローをインポート"
            size="middle"
          />
          <Button 
            icon={<ExportOutlined />} 
            onClick={() => setIsExportDialogOpen(true)}
            title="フローをエクスポート"
            size="middle"
          />
          <Button 
            icon={<CopyOutlined />} 
            onClick={handleSaveAsTemplate}
            disabled={selectedNodes.length === 0}
            title={selectedNodes.length > 0 ? `${selectedNodes.length}個のノードをテンプレート化` : 'ノードを選択してください'}
            size="middle"
          />
          <Button 
            icon={<FileAddOutlined />} 
            onClick={handleLoadTemplate}
            title="テンプレートから追加"
            size="middle"
          />
          <Button
            icon={<CodeOutlined />}
            onClick={() => setShowCode(!showCode)}
            title={showCode ? 'コードを非表示' : 'コードを表示'}
            type={showCode ? 'default' : 'text'}
            size="middle"
          />
        </Space>
      </Header>
      <Layout>
        <Sider width={280} theme="light">
          <div style={{ 
            display: 'flex',
            borderBottom: '1px solid #f0f0f0',
            backgroundColor: '#fafafa'
          }}>
            <Button 
              type={!showVariables ? 'primary' : 'text'}
              style={{ 
                flex: 1,
                borderRadius: 0,
                border: 'none'
              }}
              onClick={() => setShowVariables(false)}
            >
              ノード
            </Button>
            <Button 
              type={showVariables ? 'primary' : 'text'}
              icon={<FunctionOutlined />}
              style={{ 
                flex: 1,
                borderRadius: 0,
                border: 'none',
                borderLeft: '1px solid #f0f0f0'
              }}
              onClick={() => setShowVariables(true)}
            >
              変数
            </Button>
          </div>
          {showVariables ? (
            <VariablePanel 
              variables={variables} 
              onVariablesChange={setVariables} 
            />
          ) : (
            <NodePanel 
              nodes={nodes} 
              setNodes={setNodes} 
              reactFlowInstance={reactFlowInstance} 
            />
          )}
        </Sider>
        <Content>
          <div style={{ height: '100%', display: 'flex' }}>
            <div style={{ flex: showCode ? '1' : '1 0 100%', height: '100%' }}>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                onNodeDoubleClick={onNodeDoubleClick}
                nodeTypes={nodeTypes}
                onInit={setReactFlowInstance}
                multiSelectionKeyCode="Shift"
                selectionOnDrag
                selectNodesOnDrag
                fitView
              >
                <Background />
                <Controls />
              </ReactFlow>
            </div>
            {showCode && (
              <div style={{ width: '400px', borderLeft: '1px solid #e8e8e8' }}>
                <CodePreview nodes={nodes} edges={edges} variables={variables} />
              </div>
            )}
          </div>
        </Content>
      </Layout>
      {isRunning && (
        <TestRunner
          nodes={nodes}
          edges={edges}
          config={testConfig}
          onClose={() => setIsRunning(false)}
        />
      )}
      <NodeEditor
        node={selectedNode}
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onUpdate={handleNodeUpdate}
        onDelete={handleNodeDelete}
        variables={variables}
      />
      <FlowLoader
        isOpen={isLoaderOpen}
        onClose={() => setIsLoaderOpen(false)}
        onLoad={handleLoadFlow}
      />
      <SaveFlowDialog
        isOpen={isSaveDialogOpen}
        onClose={() => setIsSaveDialogOpen(false)}
        nodes={nodes}
        edges={edges}
      />
      <TestConfigDialog
        isOpen={isConfigDialogOpen}
        onClose={() => setIsConfigDialogOpen(false)}
        onRun={handleRunWithConfig}
        currentConfig={testConfig}
      />
      <TemplateDialog
        isOpen={isTemplateDialogOpen}
        onClose={() => setIsTemplateDialogOpen(false)}
        nodes={nodes}
        edges={edges}
        selectedNodes={selectedNodes}
      />
      <TemplateLoader
        isOpen={isTemplateLoaderOpen}
        onClose={() => setIsTemplateLoaderOpen(false)}
        onLoad={handleTemplateLoad}
        currentNodes={nodes}
        currentEdges={edges}
      />
      <ExportFlowDialog
        open={isExportDialogOpen}
        onClose={() => setIsExportDialogOpen(false)}
        nodes={nodes}
        edges={edges}
        config={testConfig}
      />
      <ImportFlowDialog
        open={isImportDialogOpen}
        onClose={() => setIsImportDialogOpen(false)}
        onImport={handleImport}
      />
    </Layout>
  );
}

function App() {
  return (
    <ReactFlowProvider>
      <FlowBuilder />
    </ReactFlowProvider>
  );
}

export default App;