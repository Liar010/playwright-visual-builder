import React, { useState } from 'react';
import { Modal, Checkbox, Button, Space, message, Divider } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { Node, Edge } from 'reactflow';
import type { TestConfig, TestVariable } from '@playwright-visual-builder/shared';
import { exportFlow, downloadFile, ExportFormat } from '../utils/exportFlow';

interface ExportFlowDialogProps {
  open: boolean;
  onClose: () => void;
  nodes: Node[];
  edges: Edge[];
  variables?: TestVariable[];
  config: TestConfig;
}

const ExportFlowDialog: React.FC<ExportFlowDialogProps> = ({
  open,
  onClose,
  nodes,
  edges,
  variables,
  config,
}) => {
  const [selectedFormats, setSelectedFormats] = useState<Set<ExportFormat>>(new Set(['json']));
  const [includeConfig, setIncludeConfig] = useState(true);
  const [prettyPrint, setPrettyPrint] = useState(true);

  const handleFormatToggle = (format: ExportFormat) => {
    const newFormats = new Set(selectedFormats);
    if (newFormats.has(format)) {
      newFormats.delete(format);
    } else {
      newFormats.add(format);
    }
    setSelectedFormats(newFormats);
  };

  const handleExport = () => {
    try {
      if (nodes.length === 0) {
        message.warning('エクスポートするノードがありません');
        return;
      }

      if (selectedFormats.size === 0) {
        message.warning('少なくとも1つの形式を選択してください');
        return;
      }

      let exportCount = 0;
      const timestamp = Date.now();

      selectedFormats.forEach(format => {
        try {
          const content = exportFlow(nodes, edges, variables, config, {
            format,
            includeConfig,
            prettyPrint,
          });

          let filename: string;
          let mimeType: string;

          switch (format) {
            case 'json':
              filename = `flow-${timestamp}.json`;
              mimeType = 'application/json';
              break;
            case 'yaml':
              filename = `flow-${timestamp}.yaml`;
              mimeType = 'text/yaml';
              break;
            case 'playwright-js':
              filename = `test-${timestamp}.spec.js`;
              mimeType = 'text/javascript';
              break;
            case 'playwright-ts':
              filename = `test-${timestamp}.spec.ts`;
              mimeType = 'text/typescript';
              break;
            default:
              throw new Error('Unknown format');
          }

          downloadFile(content, filename, mimeType);
          exportCount++;
        } catch (error) {
          console.error(`Export error for ${format}:`, error);
          message.error(`${format}形式のエクスポートに失敗しました`);
        }
      });

      if (exportCount > 0) {
        message.success(`${exportCount}個のファイルをエクスポートしました`);
        onClose();
      }
    } catch (error) {
      message.error('エクスポートに失敗しました');
      console.error('Export error:', error);
    }
  };

  const isDataFormat = (format: ExportFormat) => format === 'json' || format === 'yaml';
  const hasDataFormat = Array.from(selectedFormats).some(isDataFormat);

  return (
    <Modal
      title="フローのエクスポート"
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          キャンセル
        </Button>,
        <Button
          key="export"
          type="primary"
          icon={<DownloadOutlined />}
          onClick={handleExport}
          disabled={selectedFormats.size === 0}
        >
          エクスポート ({selectedFormats.size}形式)
        </Button>,
      ]}
      width={600}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <div>
          <h4>エクスポート形式（複数選択可）</h4>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Checkbox
              checked={selectedFormats.has('json')}
              onChange={() => handleFormatToggle('json')}
            >
              <strong>JSON</strong> - Playwright Visual Builder形式（再インポート可能）
            </Checkbox>
            <Checkbox
              checked={selectedFormats.has('yaml')}
              onChange={() => handleFormatToggle('yaml')}
            >
              <strong>YAML</strong> - 人間が読みやすい形式（再インポート可能）
            </Checkbox>
            <Divider style={{ margin: '10px 0' }} />
            <Checkbox
              checked={selectedFormats.has('playwright-js')}
              onChange={() => handleFormatToggle('playwright-js')}
            >
              <strong>Playwright JavaScript</strong> - 実行可能なテストコード
            </Checkbox>
            <Checkbox
              checked={selectedFormats.has('playwright-ts')}
              onChange={() => handleFormatToggle('playwright-ts')}
            >
              <strong>Playwright TypeScript</strong> - 型付きテストコード
            </Checkbox>
          </Space>
        </div>

        {hasDataFormat && (
          <div>
            <h4>データ形式オプション（JSON/YAML）</h4>
            <Space direction="vertical">
              <Checkbox
                checked={includeConfig}
                onChange={(e) => setIncludeConfig(e.target.checked)}
              >
                テスト設定を含める
              </Checkbox>
              {selectedFormats.has('json') && (
                <Checkbox
                  checked={prettyPrint}
                  onChange={(e) => setPrettyPrint(e.target.checked)}
                >
                  JSONを整形して出力
                </Checkbox>
              )}
            </Space>
          </div>
        )}

        <div style={{ padding: '10px', background: '#f0f0f0', borderRadius: '4px' }}>
          <strong>形式別の特徴：</strong>
          <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
            <li><strong>JSON/YAML</strong>: 後でインポートして編集を続けることができます</li>
            <li><strong>Playwright JS/TS</strong>: 独立して実行可能なテストコードを生成します</li>
          </ul>
          {(selectedFormats.has('playwright-js') || selectedFormats.has('playwright-ts')) && (
            <>
              <strong style={{ color: '#ff4d4f' }}>注意事項：</strong>
              <ul style={{ margin: '5px 0', paddingLeft: '20px', color: '#ff4d4f' }}>
                <li>条件分岐とループは基本構造とTODOコメント付きで生成されます</li>
                <li>フロー内の分岐やループ内のアクションは手動で追加が必要です</li>
                <li>複雑なフローは生成後に調整が必要な場合があります</li>
              </ul>
            </>
          )}
        </div>
      </Space>
    </Modal>
  );
};

export default ExportFlowDialog;