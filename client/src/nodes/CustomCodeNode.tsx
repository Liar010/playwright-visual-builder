import { memo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { CodeOutlined, EditOutlined } from '@ant-design/icons';
import { Modal, Input, Checkbox } from 'antd';

const { TextArea } = Input;

export default memo(({ data, selected }: NodeProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [code, setCode] = useState(data.customCode?.code || '');
  const [description, setDescription] = useState(data.customCode?.description || '');
  const [wrapInTryCatch, setWrapInTryCatch] = useState(data.customCode?.wrapInTryCatch || false);

  const handleSave = () => {
    // ノードのデータを更新
    data.customCode = {
      code,
      description,
      wrapInTryCatch,
    };
    setIsModalOpen(false);
  };

  return (
    <>
      <div
        style={{
          padding: '10px 20px',
          borderRadius: '8px',
          background: '#fff',
          border: selected ? '2px solid #1890ff' : '1px solid #d9d9d9',
          minWidth: '180px',
          cursor: 'pointer',
        }}
        onDoubleClick={() => setIsModalOpen(true)}
      >
        <Handle
          type="target"
          position={Position.Top}
          style={{ background: '#1890ff' }}
        />
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CodeOutlined style={{ color: '#eb2f96' }} />
          <span>{data.label}</span>
          <EditOutlined style={{ fontSize: '12px', color: '#999' }} />
        </div>
        
        {data.customCode?.description && (
          <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
            {data.customCode.description}
          </div>
        )}
        
        {data.customCode?.code && (
          <div style={{ 
            fontSize: '10px', 
            color: '#999', 
            marginTop: '4px',
            fontFamily: 'monospace',
            maxWidth: '200px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {data.customCode.code.split('\n')[0]}
          </div>
        )}
        
        <Handle
          type="source"
          position={Position.Bottom}
          style={{ background: '#1890ff' }}
        />
      </div>

      <Modal
        title="カスタムコード編集"
        open={isModalOpen}
        onOk={handleSave}
        onCancel={() => setIsModalOpen(false)}
        width={800}
        okText="保存"
        cancelText="キャンセル"
      >
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px' }}>説明（オプション）</label>
          <Input
            placeholder="このコードの説明を入力..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px' }}>Playwrightコード</label>
          <TextArea
            rows={15}
            placeholder="// カスタムPlaywrightコードを入力
// 例: await page.evaluate(() => { ... })
// 変数 'page' が利用可能です"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            style={{ fontFamily: 'monospace', fontSize: '12px' }}
          />
        </div>

        <div>
          <Checkbox
            checked={wrapInTryCatch}
            onChange={(e) => setWrapInTryCatch(e.target.checked)}
          >
            try-catchでラップする（エラーハンドリング）
          </Checkbox>
        </div>

        <div style={{ 
          marginTop: '16px', 
          padding: '12px', 
          background: '#f0f0f0', 
          borderRadius: '4px',
          fontSize: '12px'
        }}>
          <strong>注意:</strong> カスタムコードは生成されたコードにそのまま挿入されます。
          <br />
          利用可能な変数: <code>page</code>, <code>expect</code>
        </div>
      </Modal>
    </>
  );
});