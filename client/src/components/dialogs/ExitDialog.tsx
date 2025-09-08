import React from 'react';
import { Modal, Form, Input, InputNumber, Typography } from 'antd';
import { Node } from 'reactflow';

const { TextArea } = Input;
const { Text } = Typography;

interface ExitDialogProps {
  node: Node | null;
  open: boolean;
  onOk: (values: any) => void;
  onCancel: () => void;
}

const ExitDialog: React.FC<ExitDialogProps> = ({ node, open, onOk, onCancel }) => {
  const [form] = Form.useForm();

  React.useEffect(() => {
    if (node) {
      form.setFieldsValue({
        label: node.data.label || '終了',
        message: node.data.action?.message || '',
        exitCode: node.data.action?.exitCode ?? 1,
      });
    }
  }, [node, form]);

  const handleOk = () => {
    form.validateFields().then((values) => {
      onOk({
        ...node,
        data: {
          ...node?.data,
          label: values.label,
          action: {
            message: values.message,
            exitCode: values.exitCode,
          },
        },
      });
      form.resetFields();
    });
  };

  return (
    <Modal
      title="終了ノードの設定"
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      width={500}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="label"
          label="ラベル"
          rules={[{ required: true, message: 'ラベルを入力してください' }]}
        >
          <Input placeholder="例: エラー終了" />
        </Form.Item>

        <Form.Item
          name="message"
          label="終了メッセージ"
          help="テスト終了時に表示されるメッセージです。終了理由を明確に記載してください。"
        >
          <TextArea 
            rows={3} 
            placeholder="例: ログインに失敗しました。認証情報を確認してください。"
          />
        </Form.Item>

        <Form.Item
          name="exitCode"
          label="終了コード"
          help="0: 正常終了, 1以上: エラー終了"
        >
          <InputNumber 
            min={0} 
            max={255}
            style={{ width: '100%' }}
          />
        </Form.Item>

        <div style={{ 
          padding: '12px',
          backgroundColor: '#fff7e6',
          border: '1px solid #ffd591',
          borderRadius: '4px',
          marginTop: '16px'
        }}>
          <Text type="warning" strong>注意事項:</Text>
          <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
            <li>このノードに到達すると、テストは即座に終了します</li>
            <li>終了メッセージはテスト結果に記録されます</li>
            <li>条件分岐と組み合わせて、エラー時の早期終了に使用できます</li>
          </ul>
        </div>
      </Form>
    </Modal>
  );
};

export default ExitDialog;