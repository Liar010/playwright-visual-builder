import { useEffect } from 'react';
import { Node } from 'reactflow';
import { Form, Input, InputNumber, Select, Drawer, Button, Space, Popconfirm } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import type { NodeType } from '@playwright-visual-builder/shared';

interface NodeEditorProps {
  node: Node | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (nodeId: string, data: any) => void;
  onDelete?: (nodeId: string) => void;
}

export default function NodeEditor({ node, isOpen, onClose, onUpdate, onDelete }: NodeEditorProps) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (node) {
      const values: any = {
        label: node.data.label,
        ...node.data.action,
        ...node.data.assertion,
      };
      
      // 条件分岐ノードの値設定
      if (node.data.condition) {
        values.conditionType = node.data.condition.type;
        values.conditionSelector = node.data.condition.selector;
        values.conditionComparison = node.data.condition.comparison;
        values.conditionValue = node.data.condition.value;
        values.conditionExpression = node.data.condition.expression;
        values.conditionUrlPattern = node.data.condition.expression;
      }
      
      // ループノードの値設定
      if (node.data.loop) {
        values.loopType = node.data.loop.type;
        values.loopCount = node.data.loop.count;
        values.loopSelector = node.data.loop.selector;
        values.loopCondition = node.data.loop.condition;
        values.loopMaxIterations = node.data.loop.maxIterations;
      }
      
      form.setFieldsValue(values);
    }
  }, [node, form]);

  const handleSave = () => {
    const values = form.getFieldsValue();
    if (node) {
      const updatedData = { ...node.data };
      updatedData.label = values.label;

      switch (node.type as NodeType) {
        case 'navigate':
          updatedData.action = { url: values.url };
          break;
        case 'click':
        case 'fill':
        case 'select':
        case 'check':
          updatedData.action = { 
            selector: values.selector,
            value: values.value 
          };
          break;
        case 'wait':
          updatedData.action = { timeout: values.timeout };
          break;
        case 'waitForHidden':
          updatedData.action = { 
            selector: values.selector,
            timeout: values.timeout || 10000
          };
          break;
        case 'focus':
        case 'blur':
        case 'isEnabled':
        case 'isDisabled':
        case 'isChecked':
        case 'isVisible':
          updatedData.action = { selector: values.selector };
          break;
        case 'assertion':
          updatedData.assertion = {
            selector: values.selector,
            comparison: values.comparison,
            expected: values.expected,
            attribute: values.attribute,
          };
          break;
        case 'condition':
          updatedData.condition = {
            type: values.conditionType,
            selector: values.conditionSelector,
            comparison: values.conditionComparison,
            value: values.conditionValue,
            expression: values.conditionExpression || values.conditionUrlPattern,
          };
          break;
        case 'loop':
          updatedData.loop = {
            type: values.loopType,
            count: values.loopCount,
            selector: values.loopSelector,
            condition: values.loopCondition,
            maxIterations: values.loopMaxIterations || 100,
          };
          break;
      }

      onUpdate(node.id, updatedData);
      onClose();
    }
  };

  const handleDelete = () => {
    if (node && onDelete) {
      onDelete(node.id);
      onClose();
    }
  };

  const renderFields = () => {
    if (!node) return null;

    const nodeType = node.type as NodeType;
    const commonFields = (
      <Form.Item name="label" label="ラベル" rules={[{ required: true }]}>
        <Input placeholder="ステップの説明" />
      </Form.Item>
    );

    switch (nodeType) {
      case 'navigate':
        return (
          <>
            {commonFields}
            <Form.Item name="url" label="URL" rules={[{ required: true }]}>
              <Input placeholder="https://example.com" />
            </Form.Item>
          </>
        );

      case 'click':
        return (
          <>
            {commonFields}
            <Form.Item name="selector" label="セレクタ" rules={[{ required: true }]}>
              <Input placeholder="#button-id, .class-name, xpath=//button" />
            </Form.Item>
          </>
        );

      case 'fill':
      case 'select':
        return (
          <>
            {commonFields}
            <Form.Item name="selector" label="セレクタ" rules={[{ required: true }]}>
              <Input placeholder="#input-id, .class-name" />
            </Form.Item>
            <Form.Item name="value" label="値" rules={[{ required: true }]}>
              <Input placeholder="入力する値" />
            </Form.Item>
          </>
        );

      case 'check':
        return (
          <>
            {commonFields}
            <Form.Item name="selector" label="セレクタ" rules={[{ required: true }]}>
              <Input placeholder="#checkbox-id" />
            </Form.Item>
          </>
        );

      case 'wait':
        return (
          <>
            {commonFields}
            <Form.Item name="timeout" label="待機時間 (ms)" rules={[{ required: true }]}>
              <InputNumber min={100} max={30000} step={100} />
            </Form.Item>
          </>
        );

      case 'waitForHidden':
        return (
          <>
            {commonFields}
            <Form.Item name="selector" label="セレクタ" rules={[{ required: true }]}>
              <Input placeholder="#loader, .loading-spinner" />
            </Form.Item>
            <Form.Item name="timeout" label="最大待機時間 (ms)">
              <InputNumber min={1000} max={30000} step={1000} placeholder="10000" />
            </Form.Item>
          </>
        );

      case 'assertion':
        return (
          <>
            {commonFields}
            <Form.Item name="selector" label="セレクタ" rules={[{ required: true }]}>
              <Input placeholder="#element-id, .class-name" />
            </Form.Item>
            <Form.Item name="comparison" label="比較方法" rules={[{ required: true }]}>
              <Select>
                <Select.Option value="exists">要素が表示されている</Select.Option>
                <Select.Option value="hidden">要素が非表示（display:none等）</Select.Option>
                <Select.Option value="contains">テキストを含む</Select.Option>
                <Select.Option value="equals">テキストと一致</Select.Option>
                <Select.Option value="matches">正規表現に一致</Select.Option>
                <Select.Option value="hasClass">クラスを持つ</Select.Option>
                <Select.Option value="hasAttribute">属性を持つ</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item 
              name="expected" 
              label={
                node.data.assertion?.comparison === 'hasClass' ? 'クラス名' :
                node.data.assertion?.comparison === 'hasAttribute' ? '属性名' :
                '期待値'
              }
              rules={[{ 
                required: node.data.assertion?.comparison !== 'exists' && 
                         node.data.assertion?.comparison !== 'hidden'
              }]}
            >
              <Input placeholder={
                node.data.assertion?.comparison === 'hasClass' ? 'loader-bg' :
                node.data.assertion?.comparison === 'hasAttribute' ? 'disabled, checked等' :
                '期待するテキストまたは正規表現'
              } />
            </Form.Item>
          </>
        );

      case 'condition':
        return (
          <>
            {commonFields}
            <Form.Item name="conditionType" label="条件タイプ" rules={[{ required: true }]}>
              <Select placeholder="条件タイプを選択">
                <Select.Option value="selector">要素の状態</Select.Option>
                <Select.Option value="url">URL判定</Select.Option>
                <Select.Option value="custom">カスタム条件</Select.Option>
              </Select>
            </Form.Item>
            
            {form.getFieldValue('conditionType') === 'selector' && (
              <>
                <Form.Item name="conditionSelector" label="セレクタ" rules={[{ required: true }]}>
                  <Input placeholder="#element-id, .class-name" />
                </Form.Item>
                <Form.Item name="conditionComparison" label="条件" rules={[{ required: true }]}>
                  <Select>
                    <Select.Option value="exists">要素が存在する</Select.Option>
                    <Select.Option value="visible">要素が表示されている</Select.Option>
                    <Select.Option value="contains">テキストを含む</Select.Option>
                    <Select.Option value="equals">テキストと一致</Select.Option>
                  </Select>
                </Form.Item>
                {(form.getFieldValue('conditionComparison') === 'contains' || 
                  form.getFieldValue('conditionComparison') === 'equals') && (
                  <Form.Item name="conditionValue" label="期待値" rules={[{ required: true }]}>
                    <Input placeholder="期待するテキスト" />
                  </Form.Item>
                )}
              </>
            )}
            
            {form.getFieldValue('conditionType') === 'url' && (
              <Form.Item name="conditionUrlPattern" label="URLパターン" rules={[{ required: true }]}>
                <Input placeholder="https://example.com/success" />
              </Form.Item>
            )}
            
            {form.getFieldValue('conditionType') === 'custom' && (
              <Form.Item name="conditionExpression" label="条件式" rules={[{ required: true }]}>
                <Input.TextArea placeholder="JavaScript式 (例: document.title === 'Success')" rows={3} />
              </Form.Item>
            )}
          </>
        );

      case 'focus':
      case 'blur':
        return (
          <>
            {commonFields}
            <Form.Item name="selector" label="セレクタ" rules={[{ required: true }]}>
              <Input placeholder="#input-id, .form-field" />
            </Form.Item>
          </>
        );

      case 'isEnabled':
      case 'isDisabled':
      case 'isChecked':
      case 'isVisible':
        return (
          <>
            {commonFields}
            <Form.Item name="selector" label="セレクタ" rules={[{ required: true }]}>
              <Input placeholder="#button-id, input[type='checkbox']" />
            </Form.Item>
          </>
        );

      case 'screenshot':
        return commonFields;

      case 'loop':
        return (
          <>
            {commonFields}
            <Form.Item name="loopType" label="ループタイプ" rules={[{ required: true }]}>
              <Select placeholder="ループタイプを選択">
                <Select.Option value="count">回数指定</Select.Option>
                <Select.Option value="forEach">要素ごと</Select.Option>
                <Select.Option value="while">条件付き</Select.Option>
              </Select>
            </Form.Item>
            
            {form.getFieldValue('loopType') === 'count' && (
              <Form.Item name="loopCount" label="繰り返し回数" rules={[{ required: true }]}>
                <InputNumber min={1} max={100} placeholder="5" />
              </Form.Item>
            )}
            
            {form.getFieldValue('loopType') === 'forEach' && (
              <Form.Item name="loopSelector" label="要素セレクタ" rules={[{ required: true }]}>
                <Input placeholder=".item, tr.data-row" />
              </Form.Item>
            )}
            
            {form.getFieldValue('loopType') === 'while' && (
              <Form.Item name="loopCondition" label="継続条件" rules={[{ required: true }]}>
                <Input.TextArea placeholder="JavaScript式 (例: document.querySelector('.next-button'))" rows={2} />
              </Form.Item>
            )}
            
            <Form.Item name="loopMaxIterations" label="最大繰り返し回数" tooltip="無限ループ防止のため">
              <InputNumber min={1} max={1000} placeholder="100" />
            </Form.Item>
          </>
        );

      default:
        return commonFields;
    }
  };

  return (
    <Drawer
      title="ノード編集"
      placement="right"
      onClose={onClose}
      open={isOpen}
      width={400}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            {onDelete && (
              <Popconfirm
                title="ノードを削除"
                description="このノードを削除してもよろしいですか？"
                onConfirm={handleDelete}
                okText="削除"
                cancelText="キャンセル"
                placement="topLeft"
              >
                <Button danger icon={<DeleteOutlined />}>
                  削除
                </Button>
              </Popconfirm>
            )}
          </div>
          <Space>
            <Button onClick={onClose}>
              キャンセル
            </Button>
            <Button onClick={handleSave} type="primary">
              保存
            </Button>
          </Space>
        </div>
      }
    >
      <Form form={form} layout="vertical">
        {renderFields()}
      </Form>
    </Drawer>
  );
}