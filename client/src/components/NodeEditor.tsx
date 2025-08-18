import { useEffect } from 'react';
import { Node } from 'reactflow';
import { Form, Input, InputNumber, Select, Drawer, Button, Space, Popconfirm, Checkbox } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import type { NodeType } from '@playwright-visual-builder/shared';

interface NodeEditorProps {
  node: Node | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (nodeId: string, data: any) => void;
  onDelete?: (nodeId: string) => void;
  variables?: Array<{ name: string; description?: string; type: string }>;
}

export default function NodeEditor({ node, isOpen, onClose, onUpdate, onDelete, variables = [] }: NodeEditorProps) {
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
      
      // カスタムコードノードの値設定
      if (node.data.customCode) {
        values.customCodeContent = node.data.customCode.code;
        values.customCodeDescription = node.data.customCode.description;
        values.customCodeWrapInTryCatch = node.data.customCode.wrapInTryCatch;
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
        case 'doubleClick':
        case 'rightClick':
        case 'hover':
          updatedData.action = { 
            selector: values.selector,
            value: values.value 
          };
          break;
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
        case 'getText':
        case 'getCount':
          updatedData.action = { 
            selector: values.selector,
            variableName: values.variableName 
          };
          break;
        case 'getAttribute':
          updatedData.action = { 
            selector: values.selector,
            attribute: values.attribute,
            variableName: values.variableName 
          };
          break;
        case 'uploadFile':
          updatedData.action = { 
            selector: values.selector,
            filePath: values.filePath 
          };
          break;
        case 'keyboard':
          updatedData.action = { key: values.key };
          break;
        case 'scroll':
          updatedData.action = { 
            selector: values.selector,
            amount: values.amount 
          };
          break;
        case 'dragAndDrop':
          updatedData.action = { 
            sourceSelector: values.sourceSelector,
            targetSelector: values.targetSelector 
          };
          break;
        case 'iframe':
          updatedData.action = { 
            iframeAction: values.iframeAction,
            selector: values.selector 
          };
          break;
        case 'dialog':
          updatedData.action = { dialogAction: values.dialogAction };
          break;
        case 'download':
          updatedData.action = { triggerSelector: values.triggerSelector };
          break;
        case 'newPage':
          updatedData.action = { url: values.url };
          break;
        case 'switchTab':
          updatedData.action = { index: values.index };
          break;
        case 'setCookie':
          updatedData.action = { 
            name: values.name,
            value: values.value,
            domain: values.domain 
          };
          break;
        case 'localStorage':
          updatedData.action = { 
            storageAction: values.storageAction,
            key: values.key,
            value: values.value 
          };
          break;
        case 'networkIntercept':
          updatedData.action = { 
            interceptAction: values.interceptAction,
            urlPattern: values.urlPattern,
            mockStatus: values.mockStatus,
            mockBody: values.mockBody 
          };
          break;
        case 'waitForURL':
          updatedData.action = { urlPattern: values.urlPattern };
          break;
        case 'waitForLoadState':
          updatedData.action = { state: values.state };
          break;
        case 'waitForResponse':
        case 'waitForRequest':
          updatedData.action = { urlPattern: values.urlPattern };
          break;
        case 'waitForFunction':
          updatedData.action = { expression: values.expression };
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
        case 'customCode':
          updatedData.customCode = {
            code: values.customCodeContent || '',
            description: values.customCodeDescription || '',
            wrapInTryCatch: values.customCodeWrapInTryCatch || false,
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

      case 'goBack':
      case 'goForward':
      case 'reload':
        return commonFields;

      case 'click':
      case 'doubleClick':
      case 'rightClick':
      case 'hover':
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
              <Input 
                placeholder="入力する値 (${変数名}で変数参照可能)" 
              />
            </Form.Item>
            {variables.length > 0 && (
              <Form.Item label="変数を挿入">
                <Select
                  placeholder="選択して値に追加"
                  value={undefined}
                  onChange={(varName) => {
                    const currentValue = form.getFieldValue('value') || '';
                    form.setFieldsValue({ value: currentValue + `\${${varName}}` });
                  }}
                  style={{ width: '100%' }}
                >
                  {variables.map(v => (
                    <Select.Option key={v.name} value={v.name}>
                      ${v.name} {v.description && `- ${v.description}`}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            )}
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
              <Select 
                placeholder="条件タイプを選択"
                onChange={() => {
                  // 条件タイプが変更されたら関連フィールドをクリア
                  form.setFieldsValue({
                    conditionSelector: undefined,
                    conditionComparison: undefined,
                    conditionValue: undefined,
                    conditionUrlPattern: undefined,
                    conditionExpression: undefined,
                  });
                }}
              >
                <Select.Option value="selector">要素の状態</Select.Option>
                <Select.Option value="url">URL判定</Select.Option>
                <Select.Option value="custom">カスタム条件</Select.Option>
              </Select>
            </Form.Item>
            
            <Form.Item shouldUpdate={(prevValues, currentValues) => prevValues.conditionType !== currentValues.conditionType}>
              {() => {
                const conditionType = form.getFieldValue('conditionType');
                
                if (conditionType === 'selector') {
                  return (
                    <>
                      <Form.Item name="conditionSelector" label="セレクタ" rules={[{ required: true }]}>
                        <Input placeholder="#element-id, .class-name" />
                      </Form.Item>
                      <Form.Item name="conditionComparison" label="条件" rules={[{ required: true }]}>
                        <Select placeholder="条件を選択">
                          <Select.Option value="exists">要素が存在する</Select.Option>
                          <Select.Option value="visible">要素が表示されている</Select.Option>
                          <Select.Option value="contains">テキストを含む</Select.Option>
                          <Select.Option value="equals">テキストと一致</Select.Option>
                        </Select>
                      </Form.Item>
                      <Form.Item 
                        shouldUpdate={(prevValues, currentValues) => 
                          prevValues.conditionComparison !== currentValues.conditionComparison
                        }
                      >
                        {() => {
                          const comparison = form.getFieldValue('conditionComparison');
                          if (comparison === 'contains' || comparison === 'equals') {
                            return (
                              <Form.Item name="conditionValue" label="期待値" rules={[{ required: true }]}>
                                <Input placeholder="期待するテキスト" />
                              </Form.Item>
                            );
                          }
                          return null;
                        }}
                      </Form.Item>
                    </>
                  );
                } else if (conditionType === 'url') {
                  return (
                    <Form.Item name="conditionUrlPattern" label="URLパターン" rules={[{ required: true }]}>
                      <Input placeholder="https://example.com/success または /success" />
                    </Form.Item>
                  );
                } else if (conditionType === 'custom') {
                  return (
                    <Form.Item name="conditionExpression" label="JavaScript式" rules={[{ required: true }]}>
                      <Input.TextArea 
                        placeholder="例: document.title === 'Success' または document.querySelector('.status').textContent === 'Complete'" 
                        rows={3} 
                      />
                    </Form.Item>
                  );
                }
                
                return null;
              }}
            </Form.Item>
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

      case 'uploadFile':
        return (
          <>
            {commonFields}
            <Form.Item name="selector" label="ファイル入力セレクタ" rules={[{ required: true }]}>
              <Input placeholder="input[type='file']" />
            </Form.Item>
            <Form.Item name="filePath" label="ファイルパス" rules={[{ required: true }]}>
              <Input placeholder="/path/to/file.pdf" />
            </Form.Item>
          </>
        );

      case 'keyboard':
        return (
          <>
            {commonFields}
            <Form.Item name="key" label="キー" rules={[{ required: true }]}>
              <Input placeholder="Enter, Escape, ArrowDown, Control+A" />
            </Form.Item>
          </>
        );

      case 'scroll':
        return (
          <>
            {commonFields}
            <Form.Item name="selector" label="セレクタ（オプション）">
              <Input placeholder="要素までスクロールする場合" />
            </Form.Item>
            <Form.Item name="amount" label="スクロール量（px）">
              <InputNumber placeholder="100" />
            </Form.Item>
          </>
        );

      case 'dragAndDrop':
        return (
          <>
            {commonFields}
            <Form.Item name="sourceSelector" label="ドラッグ元セレクタ" rules={[{ required: true }]}>
              <Input placeholder=".draggable-item" />
            </Form.Item>
            <Form.Item name="targetSelector" label="ドロップ先セレクタ" rules={[{ required: true }]}>
              <Input placeholder=".drop-zone" />
            </Form.Item>
          </>
        );

      case 'getText':
      case 'getCount':
        return (
          <>
            {commonFields}
            <Form.Item name="selector" label="セレクタ" rules={[{ required: true }]}>
              <Input placeholder=".text-element, .item" />
            </Form.Item>
            <Form.Item name="variableName" label="変数に保存 (オプション)">
              <Select
                placeholder="保存先の変数を選択..."
                allowClear
                showSearch
                dropdownRender={(menu) => (
                  <>
                    {menu}
                    {variables.length === 0 && (
                      <div style={{ padding: '8px', textAlign: 'center', color: '#999' }}>
                        変数パネルで変数を作成してください
                      </div>
                    )}
                  </>
                )}
              >
                {variables.map(v => (
                  <Select.Option key={v.name} value={v.name}>
                    ${v.name} {v.description && `- ${v.description}`}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </>
        );

      case 'getAttribute':
        return (
          <>
            {commonFields}
            <Form.Item name="selector" label="セレクタ" rules={[{ required: true }]}>
              <Input placeholder="#element-id" />
            </Form.Item>
            <Form.Item name="attribute" label="属性名" rules={[{ required: true }]}>
              <Input placeholder="href, src, data-id" />
            </Form.Item>
            <Form.Item name="variableName" label="変数に保存 (オプション)">
              <Select
                placeholder="保存先の変数を選択..."
                allowClear
                showSearch
                dropdownRender={(menu) => (
                  <>
                    {menu}
                    {variables.length === 0 && (
                      <div style={{ padding: '8px', textAlign: 'center', color: '#999' }}>
                        変数パネルで変数を作成してください
                      </div>
                    )}
                  </>
                )}
              >
                {variables.map(v => (
                  <Select.Option key={v.name} value={v.name}>
                    ${v.name} {v.description && `- ${v.description}`}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </>
        );

      case 'iframe':
        return (
          <>
            {commonFields}
            <Form.Item name="iframeAction" label="アクション" rules={[{ required: true }]}>
              <Select placeholder="アクションを選択">
                <Select.Option value="switch">iframe内に切り替え</Select.Option>
                <Select.Option value="exit">iframe外に戻る</Select.Option>
              </Select>
            </Form.Item>
            {form.getFieldValue('iframeAction') === 'switch' && (
              <Form.Item name="selector" label="iframeセレクタ">
                <Input placeholder="iframe#content, iframe[src*='embed']" />
              </Form.Item>
            )}
          </>
        );

      case 'dialog':
        return (
          <>
            {commonFields}
            <Form.Item name="dialogAction" label="ダイアログアクション" rules={[{ required: true }]}>
              <Select placeholder="アクションを選択">
                <Select.Option value="accept">承認（OK）</Select.Option>
                <Select.Option value="dismiss">キャンセル</Select.Option>
              </Select>
            </Form.Item>
          </>
        );

      case 'download':
        return (
          <>
            {commonFields}
            <Form.Item name="triggerSelector" label="ダウンロードトリガーセレクタ" rules={[{ required: true }]}>
              <Input placeholder=".download-button, a[download]" />
            </Form.Item>
          </>
        );

      case 'newPage':
        return (
          <>
            {commonFields}
            <Form.Item name="url" label="新しいページのURL">
              <Input placeholder="https://example.com (空の場合は空白ページ)" />
            </Form.Item>
          </>
        );

      case 'switchTab':
        return (
          <>
            {commonFields}
            <Form.Item name="index" label="タブインデックス" rules={[{ required: true }]}>
              <InputNumber min={0} placeholder="0 (最初のタブ)" />
            </Form.Item>
          </>
        );

      case 'setCookie':
        return (
          <>
            {commonFields}
            <Form.Item name="name" label="Cookie名" rules={[{ required: true }]}>
              <Input placeholder="session_id" />
            </Form.Item>
            <Form.Item name="value" label="値" rules={[{ required: true }]}>
              <Input placeholder="abc123" />
            </Form.Item>
            <Form.Item name="domain" label="ドメイン">
              <Input placeholder="example.com" />
            </Form.Item>
          </>
        );

      case 'localStorage':
        return (
          <>
            {commonFields}
            <Form.Item name="storageAction" label="アクション" rules={[{ required: true }]}>
              <Select placeholder="アクションを選択">
                <Select.Option value="set">値を設定</Select.Option>
                <Select.Option value="get">値を取得</Select.Option>
                <Select.Option value="remove">削除</Select.Option>
                <Select.Option value="clear">すべてクリア</Select.Option>
              </Select>
            </Form.Item>
            {(form.getFieldValue('storageAction') === 'set' || 
              form.getFieldValue('storageAction') === 'get' || 
              form.getFieldValue('storageAction') === 'remove') && (
              <Form.Item name="key" label="キー" rules={[{ required: true }]}>
                <Input placeholder="user_preference" />
              </Form.Item>
            )}
            {form.getFieldValue('storageAction') === 'set' && (
              <Form.Item name="value" label="値" rules={[{ required: true }]}>
                <Input placeholder="値を入力" />
              </Form.Item>
            )}
          </>
        );

      case 'networkIntercept':
        return (
          <>
            {commonFields}
            <Form.Item name="interceptAction" label="インターセプトアクション" rules={[{ required: true }]}>
              <Select placeholder="アクションを選択">
                <Select.Option value="mock">モックレスポンス</Select.Option>
                <Select.Option value="block">ブロック</Select.Option>
                <Select.Option value="modify">変更</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="urlPattern" label="URLパターン" rules={[{ required: true }]}>
              <Input placeholder="**/api/*, https://api.example.com/*" />
            </Form.Item>
            {form.getFieldValue('interceptAction') === 'mock' && (
              <>
                <Form.Item name="mockStatus" label="ステータスコード">
                  <InputNumber placeholder="200" />
                </Form.Item>
                <Form.Item name="mockBody" label="レスポンスボディ">
                  <Input.TextArea placeholder='{"result": "success"}' />
                </Form.Item>
              </>
            )}
          </>
        );

      case 'waitForURL':
        return (
          <>
            {commonFields}
            <Form.Item name="urlPattern" label="URLパターン" rules={[{ required: true }]}>
              <Input placeholder="https://example.com/success" />
            </Form.Item>
          </>
        );

      case 'waitForLoadState':
        return (
          <>
            {commonFields}
            <Form.Item name="state" label="待機状態" rules={[{ required: true }]}>
              <Select placeholder="状態を選択">
                <Select.Option value="load">load</Select.Option>
                <Select.Option value="domcontentloaded">domcontentloaded</Select.Option>
                <Select.Option value="networkidle">networkidle</Select.Option>
              </Select>
            </Form.Item>
          </>
        );

      case 'waitForResponse':
      case 'waitForRequest':
        return (
          <>
            {commonFields}
            <Form.Item name="urlPattern" label="URLパターン" rules={[{ required: true }]}>
              <Input placeholder="**/api/data" />
            </Form.Item>
          </>
        );

      case 'waitForFunction':
        return (
          <>
            {commonFields}
            <Form.Item name="expression" label="JavaScript式" rules={[{ required: true }]}>
              <Input.TextArea 
                placeholder="document.querySelector('.loaded')?.textContent === 'Complete'" 
                rows={3}
              />
            </Form.Item>
          </>
        );

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

      case 'customCode':
        return (
          <>
            {commonFields}
            <Form.Item name="customCodeDescription" label="説明（オプション）">
              <Input placeholder="このコードの説明を入力..." />
            </Form.Item>
            <Form.Item name="customCodeContent" label="Playwrightコード" rules={[{ required: true }]}>
              <Input.TextArea 
                rows={10} 
                placeholder="// カスタムPlaywrightコードを入力
// 例: await page.evaluate(() => { ... })
// 変数 'page' と 'expect' が利用可能です"
                style={{ fontFamily: 'monospace' }}
              />
            </Form.Item>
            <Form.Item name="customCodeWrapInTryCatch" valuePropName="checked">
              <Checkbox>try-catchでラップする（エラーハンドリング）</Checkbox>
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