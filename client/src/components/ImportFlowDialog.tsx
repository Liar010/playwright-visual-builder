import React, { useState } from 'react';
import { Modal, Upload, Button, message, Alert, Space } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { Node, Edge } from 'reactflow';
import type { TestConfig, TestVariable } from '@playwright-visual-builder/shared';
import { importFlow, readFile, guessFormat, ImportResult } from '../utils/importFlow';

const { Dragger } = Upload;

interface ImportFlowDialogProps {
  open: boolean;
  onClose: () => void;
  onImport: (nodes: Node[], edges: Edge[], variables?: TestVariable[], config?: TestConfig) => void;
}

const ImportFlowDialog: React.FC<ImportFlowDialogProps> = ({
  open,
  onClose,
  onImport,
}) => {
  const [_loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState<any[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const handleImport = async (file: File) => {
    setLoading(true);
    try {
      const content = await readFile(file);
      const format = guessFormat(file.name);
      
      if (!format) {
        throw new Error('サポートされていないファイル形式です。JSONまたはYAMLファイルを選択してください。');
      }

      const result = await importFlow(content, format);
      setImportResult(result);
      
      message.success('ファイルの読み込みに成功しました');
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'インポートに失敗しました');
      console.error('Import error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = () => {
    if (importResult) {
      onImport(importResult.nodes, importResult.edges, importResult.variables, importResult.config);
      message.success('フローをインポートしました');
      handleClose();
    }
  };

  const handleClose = () => {
    setFileList([]);
    setImportResult(null);
    onClose();
  };

  const uploadProps: UploadProps = {
    accept: '.json,.yaml,.yml',
    fileList,
    beforeUpload: (file) => {
      setFileList([file]);
      handleImport(file);
      return false; // 自動アップロードを防ぐ
    },
    onRemove: () => {
      setFileList([]);
      setImportResult(null);
    },
  };

  return (
    <Modal
      title="フローのインポート"
      open={open}
      onCancel={handleClose}
      footer={[
        <Button key="cancel" onClick={handleClose}>
          キャンセル
        </Button>,
        <Button
          key="import"
          type="primary"
          disabled={!importResult}
          onClick={handleConfirmImport}
        >
          インポート
        </Button>,
      ]}
      width={600}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Alert
          message="サポートされている形式"
          description={
            <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
              <li><strong>JSON</strong> - Playwright Visual Builderでエクスポートされたファイル</li>
              <li><strong>YAML</strong> - YAMLフォーマットのフローファイル</li>
            </ul>
          }
          type="info"
          showIcon
        />

        <Dragger {...uploadProps} style={{ padding: '20px' }}>
          <p className="ant-upload-drag-icon">
            <InboxOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
          </p>
          <p className="ant-upload-text">
            クリックまたはドラッグしてファイルを選択
          </p>
          <p className="ant-upload-hint">
            JSON または YAML ファイルをアップロードしてください
          </p>
        </Dragger>

        {importResult && (
          <Alert
            message="インポート内容の確認"
            description={
              <div>
                <p><strong>ノード数:</strong> {importResult.nodes.length}</p>
                <p><strong>エッジ数:</strong> {importResult.edges.length}</p>
                {importResult.metadata?.name && (
                  <p><strong>フロー名:</strong> {importResult.metadata.name}</p>
                )}
                {importResult.metadata?.description && (
                  <p><strong>説明:</strong> {importResult.metadata.description}</p>
                )}
                {importResult.config && (
                  <p><strong>設定:</strong> 含まれています</p>
                )}
              </div>
            }
            type="success"
            showIcon
          />
        )}

        <Alert
          message="注意"
          description="インポートすると現在のフローは上書きされます。必要に応じて事前にエクスポートしてください。"
          type="warning"
          showIcon
        />
      </Space>
    </Modal>
  );
};

export default ImportFlowDialog;