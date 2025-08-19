import { useEffect, useState } from 'react';
import { Node, Edge } from 'reactflow';
import { Modal, Progress, List, Tag, Typography, Alert, Button, Space, Card } from 'antd';
import { 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  LoadingOutlined,
  ClockCircleOutlined,
  MinusCircleOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { io, Socket } from 'socket.io-client';
import type { TestResult, StepResult, TestConfig } from '@playwright-visual-builder/shared';

const { Text } = Typography;

interface TestRunnerProps {
  nodes: Node[];
  edges: Edge[];
  config?: TestConfig;
  onClose: () => void;
  onScreenshot?: (screenshot: any) => void;
  onLog?: (log: LogEntry) => void;
}

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: any;
}

export default function TestRunner({ nodes, edges, config, onClose, onScreenshot, onLog }: TestRunnerProps) {
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [debugScreenshot, setDebugScreenshot] = useState<string | null>(null);
  const [showDebugView, setShowDebugView] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    const socketUrl = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
      ? `http://${window.location.hostname}:3002`
      : undefined;
    
    const newSocket = io(socketUrl || '/', {
      transports: ['websocket', 'polling'],
    });
    setSocket(newSocket);

    newSocket.on('test:update', (result: TestResult) => {
      setTestResult(result);
      setError(null);
    });

    newSocket.on('test:error', (data: { message: string }) => {
      setError(data.message);
      setTestResult((prev) => prev ? { ...prev, status: 'failed' } : null);
    });
    
    // スクリーンショットイベントをリッスン
    newSocket.on('screenshot', (screenshot: any) => {
      if (onScreenshot) {
        onScreenshot(screenshot);
      }
    });

    // デバッグモードのスクリーンショット受信
    if (config?.debug) {
      setShowDebugView(true);
      newSocket.on('debug:screenshot', (data: { image: string; timestamp: number }) => {
        setDebugScreenshot(data.image);
      });
      
      // デバッグログの受信
      newSocket.on('test:log', (logEntry: LogEntry) => {
        setLogs(prev => [...prev, logEntry].slice(-100)); // 最新100件のログを保持
        // 親コンポーネントにもログを渡す
        if (onLog) {
          onLog(logEntry);
        }
      });
    }

    // 設定を含めてテストを開始
    const testConfig = config || {
      headless: true,  // Linuxサーバーではヘッドレスモード必須
      viewport: { width: 1280, height: 720 },
    };
    
    newSocket.emit('test:start', { nodes, edges, config: testConfig });

    return () => {
      newSocket.close();
      setSocket(null);
    };
  }, [nodes, edges]);

  const getStatusIcon = (status: StepResult['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'failed':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      case 'running':
        return <LoadingOutlined style={{ color: '#1890ff' }} />;
      case 'pending':
        return <ClockCircleOutlined style={{ color: '#8c8c8c' }} />;
      case 'skipped':
        return <MinusCircleOutlined style={{ color: '#d9d9d9' }} />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: StepResult['status']) => {
    switch (status) {
      case 'passed':
        return 'success';
      case 'failed':
        return 'error';
      case 'running':
        return 'processing';
      case 'skipped':
        return 'default';
      default:
        return 'default';
    }
  };

  const handleStop = () => {
    if (socket) {
      socket.emit('test:stop');
    }
    onClose();
  };

  const completedSteps =
    testResult?.steps.filter((s: StepResult) => s.status !== 'pending').length || 0;
  const totalSteps = testResult?.steps.length || 0;
  const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  return (
    <Modal
      title={
        <Space>
          <span>テスト実行</span>
          {testResult?.status === 'running' && <LoadingOutlined spin />}
          {testResult?.status === 'passed' && <CheckCircleOutlined style={{ color: '#52c41a' }} />}
          {testResult?.status === 'failed' && <CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
        </Space>
      }
      open={true}
      onCancel={handleStop}
      footer={[
        <Button key="stop" onClick={handleStop} danger={testResult?.status === 'running'}>
          {testResult?.status === 'running' ? '停止' : '閉じる'}
        </Button>
      ]}
      width={showDebugView ? 1400 : 700}
      bodyStyle={{ height: '600px', overflow: 'hidden' }}
    >
      <div style={{ display: 'flex', gap: '16px', height: '100%' }}>
        <div style={{ width: showDebugView ? '500px' : '100%', overflowY: 'auto', height: '100%' }}>
          {error && (
        <Alert
          message="エラー"
          description={error}
          type="error"
          showIcon
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: 16 }}
        />
      )}
      
      <div style={{ marginBottom: 16 }}>
        <Progress
          percent={Math.round(progress)}
          status={
            testResult?.status === 'failed'
              ? 'exception'
              : testResult?.status === 'passed'
              ? 'success'
              : 'active'
          }
          format={(percent) => (
            <span>
              {completedSteps}/{totalSteps} ({percent}%)
            </span>
          )}
        />
      </div>
      <List
        size="small"
        dataSource={testResult?.steps || []}
        renderItem={(step: StepResult) => {
          const node = nodes.find((n) => n.id === step.nodeId);
          return (
            <List.Item style={{ padding: '8px 0' }}>
              <div style={{ width: '100%' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Space size="small">
                    {getStatusIcon(step.status)}
                    <Text>{node?.data.label || '不明なステップ'}</Text>
                  </Space>
                  <Tag color={getStatusColor(step.status)}>
                    {step.status === 'running' ? '実行中' :
                     step.status === 'passed' ? '成功' :
                     step.status === 'failed' ? '失敗' :
                     step.status === 'pending' ? '待機中' : step.status}
                  </Tag>
                </div>
                {step.error && (
                  <>
                    <Text type="danger" style={{ fontSize: 12 }}>
                      {step.error}
                    </Text>
                    {step.debugInfo && (
                      <div style={{ marginTop: 4, padding: '4px 8px', background: '#fff1f0', borderRadius: 4 }}>
                        <Text style={{ fontSize: 11, color: '#595959' }}>
                          {step.debugInfo.url && <div>URL: {step.debugInfo.url}</div>}
                          {step.debugInfo.selector && (
                            <div>
                              セレクタ: {step.debugInfo.selector}
                              {step.debugInfo.elementFound !== undefined && (
                                <span> ({step.debugInfo.elementFound ? `${step.debugInfo.elementCount}個見つかりました` : '見つかりません'})</span>
                              )}
                            </div>
                          )}
                          {step.debugInfo.elementVisible !== undefined && (
                            <div>要素の表示: {step.debugInfo.elementVisible ? '表示' : '非表示'}</div>
                          )}
                          {step.debugInfo.elementDetails && (
                            <div>
                              要素: &lt;{step.debugInfo.elementDetails.tagName.toLowerCase()}
                              {step.debugInfo.elementDetails.id && ` id="${step.debugInfo.elementDetails.id}"`}
                              {step.debugInfo.elementDetails.className && ` class="${step.debugInfo.elementDetails.className}"`}&gt;
                            </div>
                          )}
                        </Text>
                      </div>
                    )}
                  </>
                )}
              </div>
            </List.Item>
          );
        }}
      />
        </div>
        {showDebugView && (
          <div style={{ flex: 1, minWidth: '600px', height: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Card 
              title={
                <Space>
                  <EyeOutlined />
                  <span>デバッグビュー</span>
                </Space>
              }
              size="small"
              style={{ flex: '1 1 60%' }}
              bodyStyle={{ padding: '12px', height: 'calc(100% - 45px)', overflow: 'hidden' }}
            >
              {debugScreenshot ? (
                <img 
                  src={debugScreenshot} 
                  alt="Debug view"
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'contain',
                    backgroundColor: '#f0f0f0'
                  }}
                />
              ) : (
                <div style={{ 
                  height: '100%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: '#999'
                }}>
                  <Space direction="vertical" align="center">
                    <LoadingOutlined style={{ fontSize: '24px' }} />
                    <span>画面の読み込み中...</span>
                  </Space>
                </div>
              )}
            </Card>
            <Card
              title={<span>デバッグログ</span>}
              size="small"
              style={{ flex: '1 1 40%' }}
              bodyStyle={{ padding: '8px', height: 'calc(100% - 45px)', overflow: 'auto' }}
            >
              <div style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                {logs.length === 0 ? (
                  <div style={{ color: '#999', padding: '8px' }}>ログがありません</div>
                ) : (
                  logs.map((log, index) => (
                    <div 
                      key={index} 
                      style={{ 
                        padding: '4px 8px',
                        borderBottom: '1px solid #f0f0f0',
                        color: log.level === 'error' ? '#ff4d4f' : 
                               log.level === 'warn' ? '#faad14' :
                               log.level === 'debug' ? '#999' : '#000',
                      }}
                    >
                      <span style={{ color: '#999', marginRight: '8px' }}>
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <Tag 
                        color={
                          log.level === 'error' ? 'error' :
                          log.level === 'warn' ? 'warning' :
                          log.level === 'debug' ? 'default' : 'success'
                        }
                        style={{ fontSize: '10px', margin: '0 8px 0 0' }}
                      >
                        {log.level.toUpperCase()}
                      </Tag>
                      <span>{log.message}</span>
                      {log.data && (
                        <pre style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#666' }}>
                          {typeof log.data === 'object' ? JSON.stringify(log.data, null, 2) : log.data}
                        </pre>
                      )}
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
    </Modal>
  );
}