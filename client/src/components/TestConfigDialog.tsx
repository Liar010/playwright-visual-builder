import { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Switch, InputNumber, Tabs, Alert } from 'antd';
import { PlayCircleOutlined, SettingOutlined, LockOutlined } from '@ant-design/icons';
import type { TestConfig } from '@playwright-visual-builder/shared';

interface TestConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onRun: (config: TestConfig) => void;
  currentConfig?: TestConfig;
}

export default function TestConfigDialog({ isOpen, onClose, onRun, currentConfig }: TestConfigDialogProps) {
  const [form] = Form.useForm();
  const [authType, setAuthType] = useState<string>('none');

  // ダイアログが開かれたときに現在の設定を反映
  useEffect(() => {
    if (isOpen && currentConfig) {
      form.setFieldsValue({
        baseUrl: currentConfig.baseUrl,
        headless: currentConfig.headless,
        debug: currentConfig.debug,
        timeout: currentConfig.timeout,
        nodeDelay: currentConfig.nodeDelay || 0,
        viewportWidth: currentConfig.viewport?.width || 1280,
        viewportHeight: currentConfig.viewport?.height || 720,
        username: currentConfig.authentication?.credentials?.username,
        password: currentConfig.authentication?.credentials?.password,
      });
      
      if (currentConfig.authentication?.type) {
        setAuthType(currentConfig.authentication.type);
      } else {
        setAuthType('none');
      }
    }
  }, [isOpen, currentConfig, form]);

  const handleRun = async () => {
    try {
      const values = await form.validateFields();
      
      const config: TestConfig = {
        baseUrl: values.baseUrl,
        headless: values.headless,
        debug: values.debug,
        timeout: values.timeout,
        nodeDelay: values.nodeDelay || 0,
        viewport: {
          width: values.viewportWidth || 1280,
          height: values.viewportHeight || 720,
        },
      };

      // 認証設定
      if (authType !== 'none') {
        config.authentication = {
          type: authType as 'basic' | 'form' | 'token',
          credentials: {
            username: values.username,
            password: values.password,
          },
        };
      }

      onRun(config);
      onClose();
    } catch (error) {
      // バリデーションエラー
    }
  };

  return (
    <Modal
      title={
        <>
          <PlayCircleOutlined /> テスト実行設定
        </>
      }
      open={isOpen}
      onCancel={onClose}
      onOk={handleRun}
      okText="保存"
      cancelText="キャンセル"
      width={600}
    >
      <Alert
        message="ネットワーク機器のテスト向け設定"
        description="Linuxサーバー環境（X Serverなし）では自動的にヘッドレスモードで実行されます。デバッグビューはヘッドレスモードでも動作します。"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          headless: true,  // Linuxサーバーではデフォルトでヘッドレスモード
          timeout: 30000,
          viewportWidth: 1280,
          viewportHeight: 720,
        }}
      >
        <Tabs
          defaultActiveKey="general"
          items={[
            {
              key: 'general',
              label: (
                <>
                  <SettingOutlined /> 基本設定
                </>
              ),
              children: (
                <>
                  <Form.Item
                    name="baseUrl"
                    label="ベースURL"
                    tooltip="すべての相対URLの基準となるURL"
                  >
                    <Input 
                      placeholder="例: https://192.168.1.1" 
                      prefix="🌐"
                    />
                  </Form.Item>

                  <Form.Item
                    name="headless"
                    label="ヘッドレスモード"
                    valuePropName="checked"
                    tooltip="ブラウザを表示せずにテストを実行"
                  >
                    <Switch 
                      checkedChildren="ON" 
                      unCheckedChildren="OFF" 
                    />
                  </Form.Item>

                  <Form.Item
                    name="debug"
                    label="デバッグビュー"
                    valuePropName="checked"
                    tooltip="実行中の画面をリアルタイムで表示します（ヘッドレスモードでも動作）"
                  >
                    <Switch 
                      checkedChildren="ON" 
                      unCheckedChildren="OFF" 
                    />
                  </Form.Item>

                  <Form.Item
                    name="timeout"
                    label="タイムアウト (ms)"
                    tooltip="各操作の最大待機時間"
                  >
                    <InputNumber 
                      min={5000} 
                      max={60000} 
                      step={5000}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>

                  <Form.Item
                    name="nodeDelay"
                    label="ノード間遅延 (ms)"
                    tooltip="各ノード実行後に自動的に挿入される待機時間。タイミング問題を回避するために使用します。"
                  >
                    <InputNumber 
                      min={0} 
                      max={5000} 
                      step={100}
                      style={{ width: '100%' }}
                      placeholder="0 (遅延なし)"
                    />
                  </Form.Item>

                  <Form.Item label="ビューポートサイズ">
                    <Input.Group compact>
                      <Form.Item
                        name="viewportWidth"
                        noStyle
                      >
                        <InputNumber
                          style={{ width: '50%' }}
                          placeholder="幅"
                          min={320}
                          max={1920}
                        />
                      </Form.Item>
                      <Form.Item
                        name="viewportHeight"
                        noStyle
                      >
                        <InputNumber
                          style={{ width: '50%' }}
                          placeholder="高さ"
                          min={240}
                          max={1080}
                        />
                      </Form.Item>
                    </Input.Group>
                  </Form.Item>
                </>
              ),
            },
            {
              key: 'auth',
              label: (
                <>
                  <LockOutlined /> 認証
                </>
              ),
              children: (
                <>
                  <Alert
                    message="セキュリティに関する重要な注意事項"
                    description={
                      <>
                        <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
                          <li>パスワードは現在<strong>平文で保存</strong>されます</li>
                          <li>保存されたフローファイル（JSON/YAML）に認証情報が含まれます</li>
                          <li>本番環境での使用は推奨されません</li>
                          <li>機密情報を含むファイルはGitにコミットしないでください</li>
                        </ul>
                      </>
                    }
                    type="warning"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                  <Form.Item label="認証タイプ">
                    <Select
                      value={authType}
                      onChange={setAuthType}
                    >
                      <Select.Option value="none">なし</Select.Option>
                      <Select.Option value="basic">Basic認証</Select.Option>
                      <Select.Option value="form" disabled>
                        フォーム認証（今後実装）
                      </Select.Option>
                      <Select.Option value="token" disabled>
                        トークン認証（今後実装）
                      </Select.Option>
                    </Select>
                  </Form.Item>

                  {authType === 'basic' && (
                    <>
                      <Form.Item
                        name="username"
                        label="ユーザー名"
                        rules={[{ required: true, message: 'ユーザー名を入力してください' }]}
                      >
                        <Input placeholder="admin" />
                      </Form.Item>

                      <Form.Item
                        name="password"
                        label="パスワード"
                        rules={[{ required: true, message: 'パスワードを入力してください' }]}
                      >
                        <Input.Password placeholder="password" />
                      </Form.Item>
                    </>
                  )}
                </>
              ),
            },
          ]}
        />
      </Form>
    </Modal>
  );
}