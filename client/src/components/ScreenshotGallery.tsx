import { useState } from 'react';
import { Modal, Card, Empty, Button, Space, Image, Badge, Tooltip, message, Tabs, Tag, Typography } from 'antd';
import { 
  CameraOutlined, 
  DeleteOutlined, 
  DownloadOutlined,
  ExpandOutlined,
  CloseOutlined,
  EyeOutlined,
  FileZipOutlined
} from '@ant-design/icons';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const { Text } = Typography;

interface Screenshot {
  id: string;
  data: string; // Base64 encoded image
  timestamp: number;
  nodeId: string;
  label?: string;
}

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: any;
}

interface ScreenshotGalleryProps {
  visible: boolean;
  onClose: () => void;
  screenshots: Screenshot[];
  logs?: LogEntry[];
  debugMode?: boolean;
  onClear?: () => void;
}

export type { Screenshot, LogEntry };

export default function ScreenshotGallery({ visible, onClose, screenshots, logs = [], debugMode = false, onClear }: ScreenshotGalleryProps) {
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const handleDownload = (screenshot: Screenshot) => {
    const link = document.createElement('a');
    link.href = screenshot.data;
    link.download = `${screenshot.label || 'screenshot'}-${screenshot.timestamp}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success('スクリーンショットをダウンロードしました');
  };

  const handleDownloadAll = async () => {
    if (screenshots.length === 0) return;
    
    const zip = new JSZip();
    const folder = zip.folder('screenshots');
    
    if (!folder) return;
    
    // 各スクリーンショットをZIPに追加
    for (const screenshot of screenshots) {
      // Base64データからプレフィックスを除去
      const base64Data = screenshot.data.replace(/^data:image\/\w+;base64,/, '');
      const fileName = `${screenshot.label || 'screenshot'}-${screenshot.timestamp}.png`;
      folder.file(fileName, base64Data, { base64: true });
    }
    
    // ZIPファイルを生成してダウンロード
    try {
      const content = await zip.generateAsync({ type: 'blob' });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      saveAs(content, `screenshots-${timestamp}.zip`);
      message.success(`${screenshots.length}枚のスクリーンショットをZIPでダウンロードしました`);
    } catch (error) {
      message.error('ZIPファイルの作成に失敗しました');
      console.error('ZIP generation error:', error);
    }
  };

  const handleClear = () => {
    if (onClear) {
      onClear();
      message.info('ギャラリーをクリアしました');
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ja-JP', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  return (
    <>
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Space>
              <CameraOutlined />
              <span>スクリーンショットギャラリー</span>
              <Badge count={screenshots.length} style={{ backgroundColor: '#52c41a' }} />
            </Space>
            <Space>
              {screenshots.length > 0 && (
                <>
                  <Button 
                    size="small" 
                    icon={<FileZipOutlined />}
                    onClick={handleDownloadAll}
                  >
                    ZIPでダウンロード
                  </Button>
                  <Button 
                    size="small" 
                    danger 
                    icon={<DeleteOutlined />}
                    onClick={handleClear}
                  >
                    クリア
                  </Button>
                </>
              )}
            </Space>
          </div>
        }
        open={visible}
        onCancel={onClose}
        width={900}
        footer={null}
        bodyStyle={{ 
          padding: 0
        }}
      >
        <Tabs 
          defaultActiveKey="screenshots"
          items={[
            {
              key: 'screenshots',
              label: (
                <Space>
                  <CameraOutlined />
                  スクリーンショット
                  <Badge count={screenshots.length} size="small" />
                </Space>
              ),
              children: (
                <div style={{ 
                  maxHeight: '70vh', 
                  overflowY: 'auto',
                  padding: '16px'
                }}>
                  {screenshots.length === 0 ? (
          <Empty 
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="まだスクリーンショットがありません"
            style={{ marginTop: '48px', marginBottom: '48px' }}
          >
            <p style={{ color: '#999', fontSize: '12px' }}>
              テスト実行中にスクリーンショットノードが実行されると、
              <br />
              ここにリアルタイムで表示されます
            </p>
          </Empty>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: '16px'
          }}>
            {screenshots.map((screenshot) => (
              <Card
                key={screenshot.id}
                hoverable
                cover={
                  <div style={{ position: 'relative', paddingTop: '56.25%', overflow: 'hidden', backgroundColor: '#f0f0f0' }}>
                    <img
                      src={screenshot.data}
                      alt={screenshot.label}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain'
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0)',
                        transition: 'background 0.3s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                      className="screenshot-overlay"
                      onClick={() => setPreviewImage(screenshot.data)}
                    >
                      <Button
                        type="primary"
                        shape="circle"
                        icon={<EyeOutlined />}
                        size="large"
                        style={{ 
                          opacity: 0,
                          transition: 'opacity 0.3s'
                        }}
                        className="preview-button"
                      />
                    </div>
                  </div>
                }
                actions={[
                  <Tooltip title="プレビュー">
                    <ExpandOutlined key="preview" onClick={() => setPreviewImage(screenshot.data)} />
                  </Tooltip>,
                  <Tooltip title="ダウンロード">
                    <DownloadOutlined key="download" onClick={() => handleDownload(screenshot)} />
                  </Tooltip>
                ]}
              >
                <Card.Meta
                  title={screenshot.label || 'Screenshot'}
                  description={
                    <Space direction="vertical" size={0}>
                      <span style={{ fontSize: '12px', color: '#999' }}>
                        {formatTimestamp(screenshot.timestamp)}
                      </span>
                      <span style={{ fontSize: '11px', color: '#ccc' }}>
                        Node: {screenshot.nodeId}
                      </span>
                    </Space>
                  }
                />
              </Card>
            ))}
          </div>
        )}
                </div>
              )
            },
            ...(debugMode ? [{
              key: 'logs',
              label: (
                <Space>
                  <Badge dot={logs.length > 0}>
                    <span>ログ</span>
                  </Badge>
                  <Badge count={logs.length} size="small" />
                </Space>
              ),
              children: (
                <div style={{ 
                  maxHeight: '70vh', 
                  overflowY: 'auto',
                  padding: '8px',
                  backgroundColor: '#fafafa'
                }}>
                  {logs.length === 0 ? (
                    <Empty 
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="ログがありません"
                      style={{ marginTop: '48px', marginBottom: '48px' }}
                    />
                  ) : (
                    <div style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                      {logs.map((log, index) => (
                        <div 
                          key={index} 
                          style={{ 
                            padding: '8px 12px',
                            borderBottom: '1px solid #e8e8e8',
                            backgroundColor: 'white',
                            marginBottom: '2px',
                            borderRadius: '4px',
                            color: log.level === 'error' ? '#ff4d4f' : 
                                   log.level === 'warn' ? '#faad14' :
                                   log.level === 'debug' ? '#999' : '#000',
                          }}
                        >
                          <Space style={{ width: '100%' }}>
                            <Text style={{ color: '#999', fontSize: '11px', minWidth: '80px' }}>
                              {new Date(log.timestamp).toLocaleTimeString('ja-JP')}
                            </Text>
                            <Tag 
                              color={
                                log.level === 'error' ? 'error' :
                                log.level === 'warn' ? 'warning' :
                                log.level === 'debug' ? 'default' : 'success'
                              }
                              style={{ fontSize: '10px', margin: 0 }}
                            >
                              {log.level.toUpperCase()}
                            </Tag>
                            <Text style={{ flex: 1 }}>{log.message}</Text>
                          </Space>
                          {log.data && (
                            <pre style={{ 
                              margin: '8px 0 0 0', 
                              padding: '8px',
                              fontSize: '11px', 
                              color: '#666',
                              backgroundColor: '#f5f5f5',
                              borderRadius: '4px',
                              overflow: 'auto'
                            }}>
                              {typeof log.data === 'object' ? JSON.stringify(log.data, null, 2) : log.data}
                            </pre>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            }] : [])
          ]}
        />
      </Modal>

      {/* プレビューモーダル */}
      <Modal
        visible={!!previewImage}
        footer={null}
        onCancel={() => setPreviewImage(null)}
        width="90%"
        centered
        bodyStyle={{ padding: 0 }}
        closeIcon={<CloseOutlined style={{ color: 'white', fontSize: '20px' }} />}
        style={{ top: 20 }}
      >
        <Image
          src={previewImage || ''}
          style={{ width: '100%' }}
          preview={false}
        />
      </Modal>

      <style>{`
        .screenshot-overlay:hover {
          background: rgba(0, 0, 0, 0.5) !important;
        }
        .screenshot-overlay:hover .preview-button {
          opacity: 1 !important;
        }
      `}</style>
    </>
  );
}