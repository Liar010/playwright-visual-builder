import { useState } from 'react';
import { Modal, Form, Input, Select, message } from 'antd';
import { Node, Edge } from 'reactflow';

interface SaveFlowDialogProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: Node[];
  edges: Edge[];
  onSaveSuccess?: () => void;
}

export default function SaveFlowDialog({ 
  isOpen, 
  onClose, 
  nodes, 
  edges,
  onSaveSuccess 
}: SaveFlowDialogProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const apiUrl = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
        ? `http://${window.location.hostname}:3002/api/flows?format=${values.format}`
        : `/api/flows?format=${values.format}`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.name,
          description: values.description,
          nodes,
          edges,
          config: {
            baseUrl: values.baseUrl,
            headless: values.headless === 'true',
            viewport: {
              width: 1280,
              height: 720
            }
          }
        }),
      });

      if (response.ok) {
        message.success('フローを保存しました');
        form.resetFields();
        onClose();
        onSaveSuccess?.();
      } else {
        message.error('フローの保存に失敗しました');
      }
    } catch (error) {
      message.error('フローの保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="フローを保存"
      open={isOpen}
      onCancel={onClose}
      onOk={handleSave}
      confirmLoading={loading}
      okText="保存"
      cancelText="キャンセル"
      width={500}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          format: 'json',
          headless: 'false'
        }}
      >
        <Form.Item
          name="name"
          label="フロー名"
          rules={[{ required: true, message: 'フロー名を入力してください' }]}
        >
          <Input placeholder="例: ログインテスト" />
        </Form.Item>

        <Form.Item
          name="description"
          label="説明"
        >
          <Input.TextArea 
            rows={3} 
            placeholder="このテストフローの説明を入力してください（任意）" 
          />
        </Form.Item>

        <Form.Item
          name="format"
          label="保存形式"
          rules={[{ required: true }]}
        >
          <Select>
            <Select.Option value="json">JSON</Select.Option>
            <Select.Option value="yaml">YAML</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="baseUrl"
          label="ベースURL"
          tooltip="テスト対象のベースURL（オプション）"
        >
          <Input placeholder="例: https://example.com" />
        </Form.Item>

        <Form.Item
          name="headless"
          label="ヘッドレスモード"
          tooltip="ブラウザを表示せずにテストを実行"
        >
          <Select>
            <Select.Option value="false">表示する</Select.Option>
            <Select.Option value="true">表示しない（ヘッドレス）</Select.Option>
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
}