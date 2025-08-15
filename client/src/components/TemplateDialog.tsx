import { Modal, Input, Form, message } from 'antd';
import { Node, Edge } from 'reactflow';

interface TemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: Node[];
  edges: Edge[];
  selectedNodes: Node[];
}

export default function TemplateDialog({ 
  isOpen, 
  onClose, 
  edges,
  selectedNodes 
}: TemplateDialogProps) {
  const [form] = Form.useForm();

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      
      // 選択されたノードとそれらを接続するエッジを抽出
      const selectedNodeIds = new Set(selectedNodes.map(n => n.id));
      const templateEdges = edges.filter(
        edge => selectedNodeIds.has(edge.source) && selectedNodeIds.has(edge.target)
      );
      
      const template = {
        name: values.name,
        description: values.description,
        nodes: selectedNodes,
        edges: templateEdges,
        createdAt: new Date().toISOString(),
      };
      
      // ローカルストレージに保存
      const existingTemplates = JSON.parse(
        localStorage.getItem('flowTemplates') || '[]'
      );
      existingTemplates.push(template);
      localStorage.setItem('flowTemplates', JSON.stringify(existingTemplates));
      
      message.success('テンプレートを保存しました');
      form.resetFields();
      onClose();
    } catch (error) {
      // バリデーションエラー
    }
  };

  return (
    <Modal
      title="テンプレートとして保存"
      open={isOpen}
      onCancel={onClose}
      onOk={handleSave}
      okText="保存"
      cancelText="キャンセル"
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="name"
          label="テンプレート名"
          rules={[{ required: true, message: 'テンプレート名を入力してください' }]}
        >
          <Input placeholder="例: ログインフロー" />
        </Form.Item>
        <Form.Item
          name="description"
          label="説明"
        >
          <Input.TextArea 
            placeholder="このテンプレートの説明を入力してください"
            rows={3}
          />
        </Form.Item>
      </Form>
      <div style={{ marginTop: '16px', color: '#888', fontSize: '12px' }}>
        {selectedNodes.length} 個のノードが選択されています
      </div>
    </Modal>
  );
}