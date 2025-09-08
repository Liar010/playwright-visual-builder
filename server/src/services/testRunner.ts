import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { Socket } from 'socket.io';
import { Node, Edge } from 'reactflow';
import * as fs from 'fs/promises';
import * as path from 'path';
import type {
  TestResult,
  StepResult,
  NodeType,
  TestConfig,
  TestNode,
} from '@playwright-visual-builder/shared';

export class TestRunner {
  private socket: Socket | null;
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private pages: Map<string, Page> = new Map(); // 複数ページ管理
  private screenshots: Array<{ id: string; data: string; timestamp: number; nodeId: string; label?: string }> = [];
  private currentPageId: string = 'main'; // 現在のページID
  private testResult: TestResult;
  private config: TestConfig;
  private screenshotDir: string;
  private debugMode: boolean = false;
  private screenshotInterval: NodeJS.Timeout | null = null;
  private retryCount: number = 3; // デフォルトのリトライ回数
  private retryDelay: number = 1000; // リトライ間の待機時間（ミリ秒）
  private executionOrder: string[] = []; // 実行順序を記録
  private variables: Map<string, any> = new Map(); // 変数ストレージ
  private flowId: string | null = null; // フローのID

  constructor(socket?: Socket, config?: TestConfig) {
    this.socket = socket || null;
    this.config = config || {};
    this.debugMode = config?.debug || false;
    this.screenshotDir = path.join(process.cwd(), '../screenshots');
    this.testResult = {
      flowId: '',
      status: 'running',
      startTime: new Date().toISOString(),
      steps: [],
    };
  }

  async run(nodes: Node[], edges: Edge[], flowId?: string): Promise<TestResult & { screenshots?: any[] }> {
    try {
      this.flowId = flowId || 'default';
      await this.setup();
      
      // ノードマップとエッジマップを作成
      const nodeMap = new Map(nodes.map((n) => [n.id, n]));
      const edgesBySource = new Map<string, Edge[]>();
      edges.forEach(edge => {
        if (!edgesBySource.has(edge.source)) {
          edgesBySource.set(edge.source, []);
        }
        edgesBySource.get(edge.source)!.push(edge);
      });

      // コメントノードを除外してstepsを初期化
      this.testResult.steps = nodes
        .filter((node) => node.type !== 'comment')
        .map((node) => ({
          nodeId: node.id,
          status: 'pending',
        }));

      this.emitUpdate();

      // 開始ノードを見つける
      const startNodes = nodes.filter(
        (n) => !edges.some((e) => e.target === n.id)
      );

      // ノードを実行済みとして記録
      const executedNodes = new Set<string>();
      
      // ノードを再帰的に実行
      const executeNodeRecursive = async (nodeId: string): Promise<void> => {
        if (executedNodes.has(nodeId)) return;
        executedNodes.add(nodeId);
        
        const node = nodeMap.get(nodeId);
        if (!node) return;
        
        // 条件分岐ノードの特別処理
        if (node.type === 'condition') {
          // 条件分岐開始を実行順序に記録
          this.executionOrder.push(node.id);
          
          // 実行順序情報を含めて送信
          if (this.socket) {
            this.socket.emit('test:step:start', {
              nodeId: node.id,
              order: this.executionOrder.length,
              type: node.type,
              label: node.data.label || 'If/Else'
            });
          }
          
          // ステータスを更新
          const step = this.testResult.steps.find((s) => s.nodeId === node.id);
          if (step) {
            step.status = 'running';
            step.startTime = new Date().toISOString();
            this.emitUpdate();
          }
          
          console.log(`Executing condition: ${node.data.label || 'If/Else'}`);
          const conditionResult = await this.evaluateCondition(node);
          
          // デバッグモードの場合、条件評価の詳細をログ出力
          if (this.debugMode) {
            console.log(`[DEBUG] Condition Evaluation`);
            console.log(`  Node ID: ${node.id}`);
            console.log(`  Result: ${conditionResult ? 'TRUE' : 'FALSE'}`);
            console.log(`  Condition Type: ${node.data.condition?.type}`);
            if (node.data.condition?.expression) {
              console.log(`  Expression: ${node.data.condition.expression}`);
            }
            // 変数が使用されている場合は現在の変数状態も出力
            if (node.data.condition?.expression?.includes('${') || node.data.condition?.expression?.includes('{{')) {
              this.logAllVariables();
            }
            
            // デバッグログをファイルに保存
            await this.saveDebugLog('condition', {
              nodeId: node.id,
              result: conditionResult,
              condition: node.data.condition,
              variables: Object.fromEntries(this.variables)
            });
          } else {
            console.log(`Condition evaluated: ${conditionResult ? 'TRUE' : 'FALSE'}`);
          }
          
          // 条件評価後にステータスを更新
          if (step) {
            step.status = 'passed';
            step.endTime = new Date().toISOString();
            this.emitUpdate();
          }
          
          // 条件に基づいて適切なパスのエッジを取得
          const outgoingEdges = edgesBySource.get(nodeId) || [];
          for (const edge of outgoingEdges) {
            // sourceHandleでTRUE/FALSEパスを判定
            const isTruePath = edge.sourceHandle === 'true';
            const isFalsePath = edge.sourceHandle === 'false';
            
            if ((conditionResult && isTruePath) || (!conditionResult && isFalsePath)) {
              // 条件に合致するパスのノードを実行
              await executeNodeRecursive(edge.target);
            } else if (!isTruePath && !isFalsePath) {
              // ハンドルが指定されていない場合は両方のパスを実行（後方互換性）
              await executeNodeRecursive(edge.target);
            }
          }
        } else if (node.type === 'comment') {
          // コメントノードは完全にスキップして次のノードへ進む
          const outgoingEdges = edgesBySource.get(nodeId) || [];
          for (const edge of outgoingEdges) {
            await executeNodeRecursive(edge.target);
          }
        } else {
          // 通常のノードを実行
          await this.executeNode(node);
          
          // ノード間の自動遅延
          if (this.config.nodeDelay) {
            await new Promise(resolve => setTimeout(resolve, this.config.nodeDelay));
          }
          
          // 次のノードへ進む
          const outgoingEdges = edgesBySource.get(nodeId) || [];
          for (const edge of outgoingEdges) {
            await executeNodeRecursive(edge.target);
          }
        }
      };
      
      // 各開始ノードから実行を開始
      for (const startNode of startNodes) {
        await executeNodeRecursive(startNode.id);
      }

      this.testResult.status = 'passed';
      this.testResult.endTime = new Date().toISOString();
      this.emitUpdate();
      return { ...this.testResult, screenshots: this.screenshots };
    } catch (error) {
      this.testResult.status = 'failed';
      this.testResult.endTime = new Date().toISOString();
      this.testResult.error =
        error instanceof Error ? error.message : 'Unknown error';
      this.emitUpdate();
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  private async setup() {
    // スクリーンショットディレクトリの作成
    try {
      await fs.access(this.screenshotDir);
    } catch {
      await fs.mkdir(this.screenshotDir, { recursive: true });
    }

    // ブラウザの起動設定（Linuxサーバーではヘッドレスモード必須）
    // Linuxサーバー環境を検出（DISPLAYが設定されていない場合）
    const isLinuxServer = process.platform === 'linux' && !process.env.DISPLAY;
    const isHeadless = isLinuxServer || this.config.headless !== false;
    
    if (isLinuxServer && this.config.headless === false) {
      console.log('Linux server detected without DISPLAY. Forcing headless mode.');
    }
    console.log(`Launching browser in ${isHeadless ? 'headless' : 'headed'} mode`);
    
    this.browser = await chromium.launch({
      headless: isHeadless,
      downloadsPath: path.join(process.cwd(), '../downloads'),
      args: [
        '--ignore-certificate-errors',
        '--disable-web-security',
        '--allow-insecure-localhost',
        '--no-sandbox',  // Linuxサーバー環境用
        '--disable-setuid-sandbox'  // Linuxサーバー環境用
      ],
    });

    // コンテキストの設定（認証情報を含む）
    const contextOptions: any = {
      ignoreHTTPSErrors: true,
      viewport: this.config.viewport || { width: 1280, height: 720 },
      acceptDownloads: true,  // ダウンロードを自動的に許可
    };

    // Basic認証の設定
    if (this.config.authentication?.type === 'basic' && this.config.authentication.credentials) {
      contextOptions.httpCredentials = {
        username: this.config.authentication.credentials.username || '',
        password: this.config.authentication.credentials.password || '',
      };
    }

    this.context = await this.browser.newContext(contextOptions);
    this.page = await this.context.newPage();
    
    // メインページを登録
    this.pages.set('main', this.page);
    this.currentPageId = 'main';

    // ベースURLの設定
    if (this.config.baseUrl) {
      this.page.setDefaultNavigationTimeout(30000);
    }
    
    // デバッグモードの場合、スクリーンショットを定期送信
    if (this.debugMode && this.page) {
      this.startScreenshotStreaming();
    }
  }

  private async cleanup() {
    this.stopScreenshotStreaming();
    if (this.page) await this.page.close();
    if (this.context) await this.context.close();
    if (this.browser) await this.browser.close();
  }
  
  private startScreenshotStreaming() {
    if (!this.page) return;
    
    // 300ms間隔でスクリーンショットを送信（よりスムーズに）
    this.screenshotInterval = setInterval(async () => {
      try {
        if (this.page && !this.page.isClosed()) {
          const screenshot = await this.page.screenshot({ 
            type: 'jpeg', 
            quality: 70,  // 画質を少し上げて見やすく
            fullPage: false
          });
          
          // Base64エンコードして送信
          const base64Image = screenshot.toString('base64');
          if (this.socket) {
            this.socket.emit('debug:screenshot', {
              image: `data:image/jpeg;base64,${base64Image}`,
              timestamp: Date.now()
            });
          }
        }
      } catch (error) {
        // ページが閉じられた場合などのエラーは無視
      }
    }, 300);
  }
  
  private stopScreenshotStreaming() {
    if (this.screenshotInterval) {
      clearInterval(this.screenshotInterval);
      this.screenshotInterval = null;
    }
  }

  private async executeNode(node: Node) {
    // コメントノードの場合は何もしない
    if (node.type === 'comment') {
      return;
    }
    
    const step = this.testResult.steps.find((s) => s.nodeId === node.id);
    if (!step || !this.page) return;

    // 実行順序を記録
    this.executionOrder.push(node.id);
    
    step.status = 'running';
    step.startTime = new Date().toISOString();
    
    // 実行順序情報を含めて送信
    if (this.socket) {
      this.socket.emit('test:step:start', {
        nodeId: node.id,
        order: this.executionOrder.length,
        type: node.type,
        label: node.data.label
      });
    }
    
    this.emitUpdate();

    try {
      await this.executeNodeAction(node);
      step.status = 'passed';
      step.endTime = new Date().toISOString();
    } catch (error) {
      step.status = 'failed';
      step.endTime = new Date().toISOString();
      
      // 詳細なエラー情報を収集
      const debugInfo = await this.collectDebugInfo(node, error);
      step.error = debugInfo.message;
      step.debugInfo = debugInfo;
      
      // エラー時にスクリーンショットを自動保存
      if (this.page && !this.page.isClosed()) {
        try {
          const screenshotPath = path.join(
            this.screenshotDir,
            `error-${node.id}-${Date.now()}.png`
          );
          await this.page.screenshot({ 
            path: screenshotPath, 
            fullPage: true 
          });
          step.screenshot = screenshotPath;
          console.log(`Error screenshot saved: ${screenshotPath}`);
        } catch (screenshotError) {
          console.error('Failed to capture error screenshot:', screenshotError);
        }
      }
      
      throw error;
    } finally {
      this.emitUpdate();
    }
  }

  private async executeNodeAction(node: Node) {
    if (!this.page) throw new Error('Page not initialized');

    const { type, data } = node;
    this.emitLog('info', `Executing ${type}: ${data.label}`);

    try {
      switch (type as NodeType) {
        case 'navigate':
          const inputUrl = data.action?.url || '';
          this.emitLog('debug', `Navigate input URL: "${inputUrl}"`);
          const url = this.resolveUrl(inputUrl);
          this.emitLog('info', `Navigating to: ${url}`);
          await this.retryOnNetworkError(async () => {
            await this.page!.goto(url, {
              waitUntil: 'networkidle',
              timeout: 30000,
            });
          }, `Navigate to ${url}`);
          this.emitLog('info', `Navigation completed: ${url}`);
          break;

        case 'goBack':
          console.log('Going back');
          await this.page.goBack();
          break;

        case 'goForward':
          console.log('Going forward');
          await this.page.goForward();
          break;

        case 'reload':
          console.log('Reloading page');
          await this.retryOnNetworkError(async () => {
            await this.page!.reload({ waitUntil: 'networkidle' });
          }, 'Reload page');
          break;

        case 'click':
          await this.page.waitForSelector(data.action?.selector || '', {
            state: 'visible',
            timeout: 10000,
          });
          await this.page.click(data.action?.selector || '');
          break;

        case 'doubleClick':
          await this.page.waitForSelector(data.action?.selector || '', {
            state: 'visible',
            timeout: 10000,
          });
          await this.page.dblclick(data.action?.selector || '');
          break;

        case 'rightClick':
          await this.page.waitForSelector(data.action?.selector || '', {
            state: 'visible',
            timeout: 10000,
          });
          await this.page.click(data.action?.selector || '', { button: 'right' });
          break;

        case 'hover':
          await this.page.waitForSelector(data.action?.selector || '', {
            state: 'visible',
            timeout: 10000,
          });
          await this.page.hover(data.action?.selector || '');
          break;

        case 'fill':
          await this.page.waitForSelector(data.action?.selector || '', {
            state: 'visible',
            timeout: 10000,
          });
          await this.page.fill(
            data.action?.selector || '',
            data.action?.value || ''
          );
          break;

        case 'select':
          await this.page.waitForSelector(data.action?.selector || '', {
            state: 'visible',
            timeout: 10000,
          });
          await this.page.selectOption(
            data.action?.selector || '',
            data.action?.value || ''
          );
          break;

        case 'check':
          await this.page.waitForSelector(data.action?.selector || '', {
            state: 'visible',
            timeout: 10000,
          });
          await this.page.check(data.action?.selector || '');
          break;

        case 'uploadFile':
          const fileSelector = data.action?.selector || '';
          const uploadFilePath = data.action?.filePath || '';
          await this.page.waitForSelector(fileSelector, {
            state: 'visible',
            timeout: 10000,
          });
          await this.page.setInputFiles(fileSelector, uploadFilePath);
          console.log(`File uploaded: ${uploadFilePath}`);
          break;

        case 'focus':
          const focusSelector = data.action?.selector || '';
          await this.page.waitForSelector(focusSelector, {
            state: 'visible',
            timeout: 10000,
          });
          await this.page.focus(focusSelector);
          console.log(`Focused on: ${focusSelector}`);
          break;

        case 'blur':
          const blurSelector = data.action?.selector || '';
          await this.page.waitForSelector(blurSelector, {
            state: 'visible',
            timeout: 10000,
          });
          await this.page.locator(blurSelector).blur();
          console.log(`Blurred: ${blurSelector}`);
          break;

        case 'keyboard':
          const keyboardKey = data.action?.key || '';
          console.log(`Pressing key: ${keyboardKey}`);
          await this.page.keyboard.press(keyboardKey);
          break;

        case 'scroll':
          const scrollSelector = data.action?.selector;
          const direction = data.action?.direction || 'down';
          const amount = data.action?.amount || 100;
          
          if (scrollSelector) {
            await this.page.locator(scrollSelector).scrollIntoViewIfNeeded();
          } else {
            // ページ全体をスクロール
            await this.page.evaluate(({ dir, amt }) => {
              // @ts-ignore - windowはブラウザコンテキストで利用可能
              if (dir === 'down') {
                window.scrollBy(0, amt);
              } else if (dir === 'up') {
                // @ts-ignore
                window.scrollBy(0, -amt);
              } else if (dir === 'right') {
                // @ts-ignore
                window.scrollBy(amt, 0);
              } else if (dir === 'left') {
                // @ts-ignore
                window.scrollBy(-amt, 0);
              }
            }, { dir: direction, amt: amount });
          }
          break;

        case 'wait':
          await this.page.waitForTimeout(data.action?.timeout || 1000);
          break;

        case 'waitForURL':
          const waitUrlPattern = data.action?.urlPattern || '';
          console.log(`Waiting for URL: ${waitUrlPattern}`);
          await this.page.waitForURL(waitUrlPattern, { timeout: 30000 });
          console.log(`URL matched: ${this.page.url()}`);
          break;

        case 'waitForLoadState':
          const state = data.action?.state || 'networkidle';
          console.log(`Waiting for load state: ${state}`);
          await this.page.waitForLoadState(state as 'load' | 'domcontentloaded' | 'networkidle');
          break;

        case 'waitForHidden':
          const selector = data.action?.selector;
          const waitHiddenTimeout = data.action?.timeout || 10000;
          
          if (!selector) {
            throw new Error('waitForHidden requires a selector');
          }
          
          console.log(`Waiting for element to be hidden: ${selector} (timeout: ${waitHiddenTimeout}ms)`);
          
          // 要素が非表示になるまで待機
          await this.page.waitForSelector(selector, {
            state: 'hidden',
            timeout: waitHiddenTimeout,
          });
          
          console.log(`✓ Element is now hidden: ${selector}`);
          break;

        case 'assertion':
          await this.handleAssertion(data);
          break;

        case 'screenshot': {
          const timestamp = Date.now();
          const nodeId = node.id || 'unknown';  // node.idを使用（dataではなく）
          const screenshotId = `screenshot-${nodeId.replace(/[^a-zA-Z0-9]/g, '-')}-${timestamp}`;
          const screenshotPath = path.join(
            this.screenshotDir,
            `${screenshotId}.png`
          );
          
          // スクリーンショットを取得
          const screenshotBuffer = await this.page.screenshot({ 
            path: screenshotPath, 
            fullPage: true 
          });
          
          // Base64エンコード
          const base64Image = screenshotBuffer.toString('base64');
          
          // スクリーンショットデータを保存
          const screenshotData = {
            id: screenshotId,
            data: `data:image/png;base64,${base64Image}`,
            timestamp: timestamp,
            nodeId: nodeId,
            label: data.label || 'Screenshot'
          };
          
          this.screenshots.push(screenshotData);
          
          // クライアントにスクリーンショットを送信
          if (this.socket) {
            this.socket.emit('screenshot', screenshotData);
          }
          console.log(`Screenshot saved: ${screenshotPath}`);
          break;
        }

        case 'getText':
          const textSelector = data.action?.selector || '';
          await this.page.waitForSelector(textSelector, {
            state: 'visible',
            timeout: 10000,
          });
          const textContent = await this.page.locator(textSelector).textContent();
          
          // 変数名が指定されていれば保存、なければnode.idをキーとして保存
          const varName = data.action?.variableName || data.action?.variable || `text_${node.id}`;
          this.variables.set(varName, textContent);
          
          // ログシステムに変数の値を送信
          const textLogMessage = `Variable stored: ${varName} = "${textContent?.substring(0, 100)}${textContent && textContent.length > 100 ? '...' : ''}"`;
          this.emitLog('info', textLogMessage, {
            variableName: varName,
            value: textContent,
            nodeId: node.id,
            selector: textSelector
          });
          
          // デバッグモードの場合、詳細情報も出力
          if (this.debugMode) {
            console.log(`[DEBUG] Variable Set - getText`);
            console.log(`  Node ID: ${node.id}`);
            console.log(`  Selector: ${textSelector}`);
            console.log(`  Variable Name: ${varName}`);
            console.log(`  Value: "${textContent}"`);
            console.log(`  Type: ${typeof textContent}`);
            console.log(`  Length: ${textContent?.length || 0} characters`);
            
            // 全変数の現在の状態をログ出力
            this.logAllVariables();
          }
          break;

        case 'getAttribute':
          const attrSelector = data.action?.selector || '';
          const attrName = data.action?.attribute || '';
          await this.page.waitForSelector(attrSelector, {
            state: 'visible',
            timeout: 10000,
          });
          const attrValue = await this.page.locator(attrSelector).getAttribute(attrName);
          
          // 変数名が指定されていれば保存、なければnode.idをキーとして保存
          const attrVarName = data.action?.variableName || data.action?.variable || `attr_${node.id}`;
          this.variables.set(attrVarName, attrValue);
          
          // ログシステムに変数の値を送信
          const attrLogMessage = `Variable stored: ${attrVarName} = "${attrValue}"`;
          this.emitLog('info', attrLogMessage, {
            variableName: attrVarName,
            value: attrValue,
            attribute: attrName,
            nodeId: node.id,
            selector: attrSelector
          });
          
          // デバッグモードの場合、詳細情報も出力
          if (this.debugMode) {
            console.log(`[DEBUG] Variable Set - getAttribute`);
            console.log(`  Node ID: ${node.id}`);
            console.log(`  Selector: ${attrSelector}`);
            console.log(`  Attribute: ${attrName}`);
            console.log(`  Variable Name: ${attrVarName}`);
            console.log(`  Value: "${attrValue}"`);
            console.log(`  Type: ${typeof attrValue}`);
            
            // 全変数の現在の状態をログ出力
            this.logAllVariables();
          }
          break;

        case 'isEnabled':
          const enabledSelector = data.action?.selector || '';
          await this.page.waitForSelector(enabledSelector, {
            state: 'attached',
            timeout: 10000,
          });
          const isEnabled = await this.page.locator(enabledSelector).isEnabled();
          if (!isEnabled) {
            throw new Error(`Element is not enabled: ${enabledSelector}`);
          }
          console.log(`✓ Element is enabled: ${enabledSelector}`);
          break;

        case 'isDisabled':
          const disabledSelector = data.action?.selector || '';
          await this.page.waitForSelector(disabledSelector, {
            state: 'attached',
            timeout: 10000,
          });
          const isDisabled = await this.page.locator(disabledSelector).isDisabled();
          if (!isDisabled) {
            throw new Error(`Element is not disabled: ${disabledSelector}`);
          }
          console.log(`✓ Element is disabled: ${disabledSelector}`);
          break;

        case 'isChecked':
          const checkedSelector = data.action?.selector || '';
          await this.page.waitForSelector(checkedSelector, {
            state: 'attached',
            timeout: 10000,
          });
          const isChecked = await this.page.locator(checkedSelector).isChecked();
          if (!isChecked) {
            throw new Error(`Element is not checked: ${checkedSelector}`);
          }
          console.log(`✓ Element is checked: ${checkedSelector}`);
          break;

        case 'isVisible':
          const visibleSelector = data.action?.selector || '';
          await this.page.waitForSelector(visibleSelector, {
            state: 'attached',
            timeout: 10000,
          });
          const isVisible = await this.page.locator(visibleSelector).isVisible();
          if (!isVisible) {
            throw new Error(`Element is not visible: ${visibleSelector}`);
          }
          console.log(`✓ Element is visible: ${visibleSelector}`);
          break;

        case 'condition':
          await this.executeCondition(node);
          break;

        case 'conditionEnd':
          // conditionEndは制御フロー管理のマーカーノードなので何もしない
          console.log('Condition block ended');
          break;

        case 'loop':
          await this.executeLoop(node);
          break;

        case 'loopEnd':
          // loopEndは制御フロー管理のマーカーノードなので何もしない
          console.log('Loop block ended');
          break;

        case 'iframe':
          const iframeSelector = data.action?.selector || 'iframe';
          const iframeAction = data.action?.iframeAction || 'switch';
          
          if (iframeAction === 'switch') {
            // iframe内に切り替え
            const frameElement = await this.page.waitForSelector(iframeSelector, {
              state: 'attached',
              timeout: 10000,
            });
            const frame = await frameElement.contentFrame();
            if (!frame) {
              throw new Error(`Could not get frame from selector: ${iframeSelector}`);
            }
            // フレーム内で操作を実行するために一時的にpageを置き換え
            // 注: 実際の実装では、フレームコンテキストを管理する必要がある
            console.log(`Switched to iframe: ${iframeSelector}`);
          } else if (iframeAction === 'exit') {
            // メインフレームに戻る
            console.log('Exited iframe context');
          }
          break;

        case 'dialog':
          const dialogAction = data.action?.dialogAction || 'accept';
          const dialogMessage = data.action?.message || '';
          const waitForDialog = data.action?.waitForDialog !== false; // デフォルトはtrue
          
          // ダイアログの処理を準備
          const dialogPromise = new Promise<void>((resolve) => {
            const handler = async (dialog: any) => {
              console.log(`Dialog appeared: ${dialog.type()} - "${dialog.message()}"`);
              
              try {
                if (dialogAction === 'accept') {
                  if (dialog.type() === 'prompt') {
                    await dialog.accept(dialogMessage || '');
                    console.log(`Dialog accepted with: "${dialogMessage}"`);
                  } else {
                    await dialog.accept();
                    console.log('Dialog accepted');
                  }
                } else if (dialogAction === 'dismiss') {
                  await dialog.dismiss();
                  console.log('Dialog dismissed');
                }
              } catch (error) {
                console.error('Error handling dialog:', error);
              }
              
              // ハンドラーを削除
              if (this.page) {
                this.page.off('dialog', handler);
              }
              resolve();
            };
            
            if (this.page) {
              this.page.on('dialog', handler);
            }
          });
          
          // ダイアログトリガーアクションがある場合は実行
          if (data.action?.triggerSelector) {
            console.log(`Clicking trigger: ${data.action.triggerSelector}`);
            await this.page.click(data.action.triggerSelector);
            
            // ダイアログが表示されるのを待つ
            if (waitForDialog) {
              try {
                await Promise.race([
                  dialogPromise,
                  new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Dialog timeout')), 5000)
                  )
                ]);
              } catch (error) {
                console.warn('Dialog did not appear within 5 seconds');
              }
            }
          } else {
            console.log('Dialog handler set, waiting for dialog to appear...');
          }
          break;

        case 'download':
          const downloadPath = data.action?.downloadPath || './downloads';
          
          // ダウンロードイベントを待機
          const downloadPromise = this.page.waitForEvent('download');
          
          // ダウンロードをトリガーするアクション
          if (data.action?.triggerSelector) {
            await this.page.click(data.action.triggerSelector);
          }
          
          const download = await downloadPromise;
          const suggestedFilename = download.suggestedFilename();
          const downloadFilePath = path.join(downloadPath, suggestedFilename);
          
          // ファイルを保存
          await download.saveAs(downloadFilePath);
          console.log(`File downloaded: ${downloadFilePath}`);
          break;

        case 'dragAndDrop':
          const sourceSelector = data.action?.sourceSelector || '';
          const targetSelector = data.action?.targetSelector || '';
          
          if (!sourceSelector || !targetSelector) {
            throw new Error('dragAndDrop requires both sourceSelector and targetSelector');
          }
          
          await this.page.waitForSelector(sourceSelector, {
            state: 'visible',
            timeout: 10000,
          });
          await this.page.waitForSelector(targetSelector, {
            state: 'visible',
            timeout: 10000,
          });
          
          await this.page.dragAndDrop(sourceSelector, targetSelector);
          console.log(`Dragged from ${sourceSelector} to ${targetSelector}`);
          break;

        case 'getCount':
          const countSelector = data.action?.selector || '';
          await this.page.waitForSelector(countSelector, {
            state: 'attached',
            timeout: 10000,
          });
          const count = await this.page.locator(countSelector).count();
          
          // 変数名が指定されていれば保存、なければnode.idをキーとして保存
          const countVarName = data.action?.variableName || data.action?.variable || `count_${node.id}`;
          this.variables.set(countVarName, count);
          
          // ログシステムに要素数の結果を送信
          const countLogMessage = `Element count: ${count} (stored in ${countVarName})`;
          this.emitLog('info', countLogMessage, {
            variableName: countVarName,
            value: count,
            nodeId: node.id,
            selector: countSelector
          });
          
          console.log(`Element count for "${countSelector}": ${count}`);
          break;

        case 'waitForResponse':
          const responseUrlPattern = data.action?.urlPattern || '';
          const statusCode = data.action?.statusCode;
          const responseTimeout = data.action?.timeout || 30000;
          
          console.log(`Waiting for response: ${responseUrlPattern}`);
          const response = await this.page.waitForResponse(
            response => {
              const matchesUrl = response.url().includes(responseUrlPattern);
              const matchesStatus = statusCode ? response.status() === statusCode : true;
              return matchesUrl && matchesStatus;
            },
            { timeout: responseTimeout }
          );
          console.log(`Response received: ${response.url()} (${response.status()})`);
          break;

        case 'waitForRequest':
          const requestUrlPattern = data.action?.urlPattern || '';
          const requestMethod = data.action?.method;
          const requestTimeout = data.action?.timeout || 30000;
          
          console.log(`Waiting for request: ${requestUrlPattern}`);
          const request = await this.page.waitForRequest(
            request => {
              const matchesUrl = request.url().includes(requestUrlPattern);
              const matchesMethod = requestMethod ? request.method() === requestMethod : true;
              return matchesUrl && matchesMethod;
            },
            { timeout: requestTimeout }
          );
          console.log(`Request made: ${request.url()} (${request.method()})`);
          break;

        case 'waitForFunction':
          const expression = data.action?.expression || '';
          const functionTimeout = data.action?.timeout || 30000;
          
          if (!expression) {
            throw new Error('waitForFunction requires an expression');
          }
          
          console.log(`Waiting for function: ${expression}`);
          await this.page.waitForFunction(expression, { timeout: functionTimeout });
          console.log('Function condition met');
          break;

        case 'newPage':
          const pageId = data.action?.pageId || `page-${Date.now()}`;
          const newPageUrl = data.action?.url;
          
          // 新しいページを作成
          const newPage = await this.context!.newPage();
          this.pages.set(pageId, newPage);
          
          // URLが指定されていれば遷移
          if (newPageUrl) {
            await newPage.goto(this.resolveUrl(newPageUrl));
          }
          
          // 現在のページを新しいページに切り替え
          this.currentPageId = pageId;
          this.page = newPage;
          
          console.log(`New page created with ID: ${pageId}`);
          break;

        case 'switchTab':
          const targetPageId = data.action?.pageId;
          const targetIndex = data.action?.index;
          
          if (targetPageId && this.pages.has(targetPageId)) {
            // ページIDで切り替え
            this.page = this.pages.get(targetPageId)!;
            this.currentPageId = targetPageId;
            console.log(`Switched to page: ${targetPageId}`);
          } else if (targetIndex !== undefined) {
            // インデックスで切り替え
            const allPages = this.context!.pages();
            if (targetIndex >= 0 && targetIndex < allPages.length) {
              this.page = allPages[targetIndex];
              console.log(`Switched to page at index: ${targetIndex}`);
            } else {
              throw new Error(`Invalid page index: ${targetIndex}`);
            }
          } else {
            // 最後のページに切り替え
            const allPages = this.context!.pages();
            this.page = allPages[allPages.length - 1];
            console.log('Switched to last page');
          }
          break;

        case 'setCookie':
          const cookies = data.action?.cookies || [];
          
          if (cookies.length > 0) {
            await this.context!.addCookies(cookies);
            console.log(`Set ${cookies.length} cookie(s)`);
          } else {
            // 単一のCookie設定
            const cookie = {
              name: data.action?.name || '',
              value: data.action?.value || '',
              domain: data.action?.domain,
              path: data.action?.path || '/',
              expires: data.action?.expires,
              httpOnly: data.action?.httpOnly,
              secure: data.action?.secure,
              sameSite: data.action?.sameSite as 'Strict' | 'Lax' | 'None' | undefined,
            };
            await this.context!.addCookies([cookie]);
            console.log(`Set cookie: ${cookie.name}`);
          }
          break;

        case 'localStorage':
          const storageAction = data.action?.storageAction || 'set';
          const storageKey = data.action?.key || '';
          const value = data.action?.value;
          
          if (storageAction === 'set') {
            // LocalStorageに値を設定
            await this.page.evaluate(({ k, v }) => {
              localStorage.setItem(k, v);
            }, { k: storageKey, v: value });
            console.log(`Set localStorage: ${storageKey}`);
          } else if (storageAction === 'get') {
            // LocalStorageから値を取得
            const storedValue = await this.page.evaluate((k) => {
              return localStorage.getItem(k);
            }, storageKey);
            console.log(`Got localStorage ${storageKey}: ${storedValue}`);
            // TODO: 変数に保存する機能を実装
          } else if (storageAction === 'remove') {
            // LocalStorageから削除
            await this.page.evaluate((k) => {
              localStorage.removeItem(k);
            }, storageKey);
            console.log(`Removed localStorage: ${storageKey}`);
          } else if (storageAction === 'clear') {
            // LocalStorageをクリア
            await this.page.evaluate(() => {
              localStorage.clear();
            });
            console.log('Cleared localStorage');
          }
          break;

        case 'networkIntercept':
          const interceptAction = data.action?.interceptAction || 'mock';
          const urlPatternIntercept = data.action?.urlPattern || '';
          const interceptMethod = data.action?.method;
          
          if (interceptAction === 'mock') {
            // リクエストをモック
            const mockResponse = data.action?.mockResponse || {};
            const mockStatus = data.action?.mockStatus || 200;
            const mockHeaders = data.action?.mockHeaders || {};
            const mockBody = data.action?.mockBody || '';
            
            await this.page.route(urlPatternIntercept, async (route, request) => {
              const matchesMethod = interceptMethod ? request.method() === interceptMethod : true;
              
              if (matchesMethod) {
                console.log(`Mocking request: ${request.url()}`);
                await route.fulfill({
                  status: mockStatus,
                  headers: mockHeaders,
                  body: typeof mockBody === 'object' ? JSON.stringify(mockBody) : mockBody,
                });
              } else {
                await route.continue();
              }
            });
            console.log(`Set up mock for: ${urlPatternIntercept}`);
            
          } else if (interceptAction === 'block') {
            // リクエストをブロック
            await this.page.route(urlPatternIntercept, async (route, request) => {
              const matchesMethod = interceptMethod ? request.method() === interceptMethod : true;
              
              if (matchesMethod) {
                console.log(`Blocking request: ${request.url()}`);
                await route.abort();
              } else {
                await route.continue();
              }
            });
            console.log(`Set up block for: ${urlPatternIntercept}`);
            
          } else if (interceptAction === 'modify') {
            // リクエスト/レスポンスを修正
            const modifyHeaders = data.action?.modifyHeaders || {};
            const modifyPostData = data.action?.modifyPostData;
            
            await this.page.route(urlPatternIntercept, async (route, request) => {
              const matchesMethod = interceptMethod ? request.method() === interceptMethod : true;
              
              if (matchesMethod) {
                console.log(`Modifying request: ${request.url()}`);
                const headers = {
                  ...request.headers(),
                  ...modifyHeaders,
                };
                
                await route.continue({
                  headers,
                  postData: modifyPostData,
                });
              } else {
                await route.continue();
              }
            });
            console.log(`Set up modification for: ${urlPatternIntercept}`);
            
          } else if (interceptAction === 'delay') {
            // リクエストに遅延を追加
            const delay = data.action?.delay || 1000;
            
            await this.page.route(urlPatternIntercept, async (route, request) => {
              const matchesMethod = interceptMethod ? request.method() === interceptMethod : true;
              
              if (matchesMethod) {
                console.log(`Delaying request by ${delay}ms: ${request.url()}`);
                await new Promise(resolve => setTimeout(resolve, delay));
                await route.continue();
              } else {
                await route.continue();
              }
            });
            console.log(`Set up delay for: ${urlPatternIntercept}`);
            
          } else if (interceptAction === 'clear') {
            // インターセプトをクリア
            await this.page.unroute(urlPatternIntercept);
            console.log(`Cleared intercept for: ${urlPatternIntercept}`);
          }
          break;

        case 'comment':
          // コメントノードは完全にスキップ（ログも出力しない）
          break;

        case 'customCode':
          // カスタムコードの実行
          if (data.customCode?.code) {
            try {
              console.log('Executing custom code...');
              // page変数をコンテキストとして渡してeval実行
              const page = this.page;
              await eval(`(async () => { ${data.customCode.code} })()`);
              console.log('Custom code executed successfully');
            } catch (error) {
              if (!data.customCode.wrapInTryCatch) {
                throw error;
              }
              console.error('Custom code error:', error);
            }
          }
          break;
          
        case 'start':
          // 開始ノードは何もしない
          console.log('Starting test flow...');
          break;
          
        case 'end':
          // 終了ノードは何もしない
          console.log('Test flow completed.');
          break;
          
        case 'discoverSelectors':
          // セレクタ探索ノード
          await this.executeDiscoverSelectors(node as any);
          break;
          
        default:
          throw new Error(`Unknown node type: ${type}`);
      }
    } catch (error) {
      console.error(`Error executing ${type}:`, error);
      throw error;
    }
  }

  private resolveUrl(url: string): string {
    if (!url) {
      throw new Error('URLが指定されていません。ノードにURLを入力してください。');
    }
    
    // 完全なURLの場合（http:// または https:// で始まる）
    if (url.startsWith('http://') || url.startsWith('https://')) {
      console.log(`Using absolute URL: ${url}`);
      return url;
    }
    
    // IPアドレスの場合（例: 192.168.1.1）
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(url)) {
      const fullUrl = `http://${url}`;
      console.log(`Converting IP to URL: ${fullUrl}`);
      return fullUrl;
    }
    
    // ベースURLが設定されている場合
    if (this.config.baseUrl) {
      const resolvedUrl = new URL(url, this.config.baseUrl).toString();
      console.log(`Using base URL: ${this.config.baseUrl}, resolved to: ${resolvedUrl}`);
      return resolvedUrl;
    }
    
    // それ以外の場合はhttpを付加
    const fullUrl = `http://${url}`;
    console.log(`Adding http:// prefix: ${fullUrl}`);
    return fullUrl;
  }

  private async handleAssertion(data: any) {
    if (!this.page) throw new Error('Page not initialized');

    const { selector, comparison, expected } = data.assertion || {};
    
    if (!selector) {
      throw new Error('Assertion selector is required');
    }

    // セレクタが存在するまで待機
    await this.page.waitForSelector(selector, {
      state: 'attached',
      timeout: 10000,
    });

    const locator = this.page.locator(selector);

    switch (comparison) {
      case 'exists':
        // 要素が表示されているか確認
        const isVisible = await locator.isVisible();
        if (!isVisible) {
          throw new Error(`Element is not visible: ${selector}`);
        }
        console.log(`✓ Element is visible: ${selector}`);
        break;
        
      case 'hidden':
        // display:none, visibility:hidden, または存在しない要素を検知
        const isHidden = await locator.isHidden();
        if (!isHidden) {
          // 要素が表示されている場合はエラー
          throw new Error(`Element is not hidden: ${selector}`);
        }
        console.log(`✓ Element is hidden: ${selector}`);
        break;
        
      case 'contains':
        const contentText = await locator.textContent();
        if (!contentText?.includes(expected || '')) {
          throw new Error(`Text "${expected}" not found in element: ${selector}`);
        }
        console.log(`✓ Element contains text: "${expected}"`);
        break;
        
      case 'equals':
        const exactText = await locator.textContent();
        if (exactText?.trim() !== expected?.trim()) {
          throw new Error(`Text mismatch. Expected: "${expected}", Got: "${exactText}"`);
        }
        console.log(`✓ Element text equals: "${expected}"`);
        break;
        
      case 'matches':
        const text = await locator.textContent();
        const regex = new RegExp(expected || '');
        if (!regex.test(text || '')) {
          throw new Error(`Text "${text}" does not match pattern "${expected}"`);
        }
        console.log(`✓ Element text matches pattern: "${expected}"`);
        break;
        
      case 'hasClass':
        // クラスの存在を確認（例: loader-bg）
        const className = expected || '';
        const classes = await locator.getAttribute('class');
        if (!classes || !classes.split(' ').includes(className)) {
          throw new Error(`Element does not have class "${className}". Classes: ${classes}`);
        }
        console.log(`✓ Element has class: "${className}"`);
        break;
        
      case 'hasAttribute':
        // 属性の存在を確認
        const attrName = expected || '';
        const attrValue = await locator.getAttribute(attrName);
        if (attrValue === null) {
          throw new Error(`Element does not have attribute: "${attrName}"`);
        }
        console.log(`✓ Element has attribute: "${attrName}" with value: "${attrValue}"`);
        break;
        
      default:
        throw new Error(`Unknown comparison: ${comparison}`);
    }
  }

  private async collectDebugInfo(node: Node, error: any) {
    const debugInfo: any = {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    };
    
    if (!this.page || this.page.isClosed()) {
      return debugInfo;
    }
    
    try {
      // 現在のURLを取得
      debugInfo.url = this.page.url();
      
      // ページタイトルを取得
      debugInfo.pageTitle = await this.page.title();
      
      // セレクタ関連のエラーの場合、要素の状態を確認
      const selector = node.data.action?.selector || node.data.assertion?.selector;
      if (selector) {
        debugInfo.selector = selector;
        
        try {
          const element = this.page.locator(selector);
          debugInfo.elementCount = await element.count();
          debugInfo.elementFound = debugInfo.elementCount > 0;
          
          if (debugInfo.elementFound) {
            debugInfo.elementVisible = await element.first().isVisible();
            
            // 要素の詳細情報を取得
            const elementInfo = await element.first().evaluate((el) => {
              const rect = el.getBoundingClientRect();
              return {
                tagName: el.tagName,
                id: el.id,
                className: el.className,
                innerText: (el as HTMLElement).innerText?.substring(0, 100),
                isDisabled: (el as HTMLInputElement).disabled,
                position: {
                  x: rect.x,
                  y: rect.y,
                  width: rect.width,
                  height: rect.height,
                },
              };
            });
            debugInfo.elementDetails = elementInfo;
          }
        } catch (selectorError) {
          debugInfo.selectorError = `Failed to query selector: ${selectorError}`;
        }
      }
      
      // コンソールログを取得（最新のもの）
      debugInfo.consoleLogs = [];
      this.page.on('console', (msg) => {
        debugInfo.consoleLogs.push({
          type: msg.type(),
          text: msg.text(),
        });
      });
      
    } catch (debugError) {
      console.error('Error collecting debug info:', debugError);
    }
    
    return debugInfo;
  }

  private async retryOnNetworkError<T>(
    fn: () => Promise<T>, 
    operation: string
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.retryCount; attempt++) {
      try {
        console.log(`${operation}: Attempt ${attempt}/${this.retryCount}`);
        return await fn();
      } catch (error: any) {
        lastError = error;
        
        // ネットワーク関連のエラーかチェック
        const isNetworkError = 
          error.message?.includes('net::') ||
          error.message?.includes('NS_ERROR') ||
          error.message?.includes('ERR_') ||
          error.message?.includes('timeout') ||
          error.message?.includes('Navigation failed') ||
          error.message?.includes('Target page') ||
          error.message?.includes('Protocol error');
        
        if (isNetworkError && attempt < this.retryCount) {
          console.warn(`${operation} failed (attempt ${attempt}/${this.retryCount}): ${error.message}`);
          console.log(`Retrying in ${this.retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        } else {
          throw error;
        }
      }
    }
    
    throw lastError || new Error(`${operation} failed after ${this.retryCount} attempts`);
  }

  private async evaluateCondition(node: Node): Promise<boolean> {
    if (!this.page) throw new Error('Page not initialized');
    
    const conditionData = node.data.condition;
    if (!conditionData) {
      throw new Error('Condition data is missing');
    }
    
    let conditionMet = false;
    
    try {
      switch (conditionData.type) {
        case 'selector':
          const selector = conditionData.selector;
          if (!selector) throw new Error('Selector is required for selector condition');
          
          const element = this.page.locator(selector);
          
          switch (conditionData.comparison) {
            case 'exists':
              conditionMet = await element.count() > 0;
              break;
            case 'visible':
              conditionMet = await element.isVisible();
              break;
            case 'contains':
              const text = await element.textContent();
              conditionMet = text?.includes(conditionData.value || '') || false;
              break;
            case 'equals':
              const exactText = await element.textContent();
              conditionMet = exactText?.trim() === conditionData.value?.trim();
              break;
            default:
              throw new Error(`Unknown comparison: ${conditionData.comparison}`);
          }
          break;
          
        case 'url':
          const currentUrl = this.page.url();
          const pattern = conditionData.expression || '';
          conditionMet = currentUrl.includes(pattern);
          break;
          
        case 'custom':
          // カスタムJavaScript式の評価
          // 変数を置換してから評価
          let expression = conditionData.expression || '';
          
          // 変数の置換処理
          // ${variable_name} または {{variable_name}} 形式の変数を置換
          expression = expression.replace(/\$\{([^}]+)\}|\{\{([^}]+)\}\}/g, (match: string, p1: string, p2: string) => {
            const varName = p1 || p2;
            const value = this.variables.get(varName);
            if (value !== undefined) {
              // 文字列の場合はエスケープして引用符で囲む
              if (typeof value === 'string') {
                return JSON.stringify(value);
              }
              return String(value);
            }
            return match; // 変数が見つからない場合は元のまま
          });
          
          // text_nodeId形式の変数も置換（後方互換性のため）
          this.variables.forEach((value, key) => {
            if (expression.includes(key)) {
              const replacement = typeof value === 'string' ? JSON.stringify(value) : String(value);
              expression = expression.replace(new RegExp(`\\b${key}\\b`, 'g'), replacement);
            }
          });
          
          console.log(`Evaluating expression: ${expression}`);
          
          // 式を評価
          try {
            // Function constructorを使って安全に評価
            const func = new Function('return ' + expression);
            conditionMet = func();
          } catch (e) {
            console.error(`Failed to evaluate expression: ${e}`);
            // ブラウザコンテキストでも試す（互換性のため）
            conditionMet = await this.page.evaluate((expr) => {
              try {
                // @ts-ignore
                return eval(expr);
              } catch (e) {
                return false;
              }
            }, expression);
          }
          break;
          
        default:
          throw new Error(`Unknown condition type: ${conditionData.type}`);
      }
      
      console.log(`Condition evaluated: ${conditionMet ? 'TRUE' : 'FALSE'}`);
      
      return conditionMet;
      
    } catch (error) {
      console.error('Error evaluating condition:', error);
      throw error;
    }
  }
  
  private async executeCondition(node: Node) {
    // 条件の評価のみ行う（実際のフロー制御はrun()メソッドで行う）
    // この関数は executeNode から呼ばれる場合のみ使用される
    const result = await this.evaluateCondition(node);
    return result;
  }
  
  private async executeLoop(node: Node) {
    if (!this.page) throw new Error('Page not initialized');
    
    const loopData = node.data.loop;
    if (!loopData) {
      throw new Error('Loop data is missing');
    }
    
    const maxIterations = loopData.maxIterations || 100;
    let iterations = 0;
    
    console.log(`Starting loop: ${loopData.type}`);
    
    try {
      switch (loopData.type) {
        case 'count':
          const count = loopData.count || 1;
          console.log(`Executing loop ${count} times`);
          
          for (let i = 0; i < count && i < maxIterations; i++) {
            console.log(`Loop iteration ${i + 1}/${count}`);
            // ループ内のノードを実行
            // 注: 現在の実装では、ループ内のノードは
            // React Flow側のエッジ接続（loopハンドル）で管理される想定
            iterations++;
          }
          break;
          
        case 'forEach':
          const selector = loopData.selector;
          if (!selector) throw new Error('Selector is required for forEach loop');
          
          const elements = await this.page.locator(selector).all();
          console.log(`Found ${elements.length} elements to iterate`);
          
          for (let i = 0; i < elements.length && i < maxIterations; i++) {
            console.log(`Processing element ${i + 1}/${elements.length}`);
            // 各要素に対してループ内のノードを実行
            iterations++;
          }
          break;
          
        case 'while':
          const condition = loopData.condition;
          if (!condition) throw new Error('Condition is required for while loop');
          
          while (iterations < maxIterations) {
            const shouldContinue = await this.page.evaluate((expr) => {
              try {
                // @ts-ignore
                return eval(expr);
              } catch (e) {
                return false;
              }
            }, condition);
            
            if (!shouldContinue) {
              console.log('While loop condition is false, exiting');
              break;
            }
            
            console.log(`While loop iteration ${iterations + 1}`);
            // ループ内のノードを実行
            iterations++;
          }
          break;
          
        default:
          throw new Error(`Unknown loop type: ${loopData.type}`);
      }
      
      console.log(`Loop completed after ${iterations} iterations`);
      
      if (iterations >= maxIterations) {
        console.warn(`Loop reached maximum iterations limit (${maxIterations})`);
      }
      
    } catch (error) {
      console.error('Error executing loop:', error);
      throw error;
    }
  }

  private sortNodesByFlow(nodes: Node[], edges: Edge[]): Node[] {
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const visited = new Set<string>();
    const sorted: Node[] = [];

    function visit(nodeId: string) {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      const node = nodeMap.get(nodeId);
      if (!node) return;

      const outgoingEdges = edges.filter((e) => e.source === nodeId);
      for (const edge of outgoingEdges) {
        visit(edge.target);
      }

      sorted.unshift(node);
    }

    const startNodes = nodes.filter(
      (n) => !edges.some((e) => e.target === n.id)
    );

    for (const node of startNodes) {
      visit(node.id);
    }

    for (const node of nodes) {
      if (!visited.has(node.id)) {
        sorted.push(node);
      }
    }

    return sorted;
  }

  // デバッグ用：全変数の現在の状態をログ出力
  private logAllVariables(): void {
    if (this.variables.size === 0) {
      console.log('[DEBUG] No variables currently stored');
      return;
    }
    
    console.log('[DEBUG] Current Variables State:');
    console.log('================================');
    this.variables.forEach((value, key) => {
      const valueStr = typeof value === 'string' 
        ? `"${value.length > 100 ? value.substring(0, 100) + '...' : value}"`
        : JSON.stringify(value);
      console.log(`  ${key}: ${valueStr} (type: ${typeof value})`);
    });
    console.log('================================');
  }

  // デバッグログをファイルに保存
  private async saveDebugLog(logType: string, data: any): Promise<void> {
    if (!this.debugMode) return;
    
    try {
      const fs = require('fs').promises;
      const logDir = path.join(process.cwd(), '../logs');
      
      // ログディレクトリが存在しない場合は作成
      await fs.mkdir(logDir, { recursive: true });
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const logFile = path.join(logDir, `debug_${this.flowId}_${timestamp}.log`);
      
      const logEntry = {
        timestamp: new Date().toISOString(),
        flowId: this.flowId,
        type: logType,
        data: data,
        variables: Object.fromEntries(this.variables)
      };
      
      await fs.appendFile(logFile, JSON.stringify(logEntry, null, 2) + '\n\n');
    } catch (error) {
      console.error('Failed to save debug log:', error);
    }
  }

  private emitUpdate() {
    if (this.socket) {
      this.socket.emit('test:update', this.testResult);
    }
  }

  private emitLog(level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: any) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
    };
    
    // INFOレベル以上のログは常に送信、DEBUGレベルはデバッグモードの場合のみ
    if (this.socket && (level !== 'debug' || this.debugMode)) {
      this.socket.emit('test:log', logEntry);
    }
    
    // コンソールにも出力
    if (level === 'error') {
      console.error(message, data || '');
    } else if (level === 'warn') {
      console.warn(message, data || '');
    } else if (level === 'debug') {
      console.debug(message, data || '');
    } else {
      console.log(message, data || '');
    }
  }
  
  getScreenshots() {
    return this.screenshots;
  }
  
  clearScreenshots() {
    this.screenshots = [];
    if (this.socket) {
      this.socket.emit('screenshots-cleared');
    }
  }

  private async executeDiscoverSelectors(node: TestNode) {
    try {
      if (!this.page) throw new Error('Page not initialized');

      const data = node.data;
      const currentUrl = await this.page.url();
      const category = data.category || 'default';
      const storageLabel = data.storageLabel || node.id;
      const options = data.options || { inputs: true, buttons: true, links: true };

      console.log(`🔍 Discovering selectors at ${currentUrl} (category: ${category}, label: ${storageLabel})`);

      // ページ上のセレクタを収集
      const discoveredSelectors = await this.page.evaluate((opts) => {
      const selectors: Record<string, string> = {};
      const seenLabels = new Set<string>();

      // ユニークなラベルを生成する関数
      const makeUniqueLabel = (baseLabel: string, attributes: Record<string, string>): string => {
        if (!seenLabels.has(baseLabel)) {
          seenLabels.add(baseLabel);
          return baseLabel;
        }
        
        // 属性を追加して一意にする
        for (const [key, value] of Object.entries(attributes)) {
          const labelWithAttr = `${baseLabel}[${key}=${value}]`;
          if (!seenLabels.has(labelWithAttr)) {
            seenLabels.add(labelWithAttr);
            return labelWithAttr;
          }
        }
        
        // それでも重複する場合は連番
        let counter = 1;
        let uniqueLabel = `${baseLabel}_${counter}`;
        while (seenLabels.has(uniqueLabel)) {
          counter++;
          uniqueLabel = `${baseLabel}_${counter}`;
        }
        seenLabels.add(uniqueLabel);
        return uniqueLabel;
      };

      // 入力フィールドを収集
      if (opts.inputs) {
        document.querySelectorAll('input:not([type="hidden"]), textarea, select').forEach((el) => {
          const input = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
          const label = 
            input.getAttribute('placeholder') ||
            input.getAttribute('aria-label') ||
            input.name ||
            input.type ||
            'input';
          
          const attributes = {
            name: input.name || '',
            type: input.getAttribute('type') || '',
            id: input.id || ''
          };
          
          const uniqueLabel = makeUniqueLabel(label, attributes);
          
          // セレクタの優先順位
          let selector = '';
          if (input.id) {
            selector = `#${input.id}`;
          } else if (input.name) {
            selector = input.tagName.toLowerCase() === 'input' 
              ? `input[name="${input.name}"]`
              : `${input.tagName.toLowerCase()}[name="${input.name}"]`;
          } else if (input.getAttribute('placeholder')) {
            selector = `[placeholder="${input.getAttribute('placeholder')}"]`;
          } else {
            selector = input.className ? `.${input.className.split(' ')[0]}` : input.tagName.toLowerCase();
          }
          
          selectors[uniqueLabel] = selector;
        });
      }

      // ボタンを収集
      if (opts.buttons) {
        // ボタンの位置情報を含むマップを作成
        const buttonGroups = new Map<string, Array<{element: HTMLElement, index: number}>>();
        
        document.querySelectorAll('button, input[type="submit"], input[type="button"], [role="button"]').forEach((el, index) => {
          const button = el as HTMLElement;
          const label = 
            button.textContent?.trim() ||
            button.getAttribute('aria-label') ||
            button.getAttribute('value') ||
            'button';
          
          // 同じラベルのボタンをグループ化
          if (!buttonGroups.has(label)) {
            buttonGroups.set(label, []);
          }
          buttonGroups.get(label)!.push({element: button, index});
        });
        
        // 各ボタンのセレクタを生成
        buttonGroups.forEach((buttons, label) => {
          buttons.forEach((btnInfo, groupIndex) => {
            const button = btnInfo.element;
            const attributes = {
              type: button.getAttribute('type') || '',
              id: button.id || '',
              name: button.getAttribute('name') || '',
              class: button.className || ''
            };
            
            let uniqueLabel = label;
            let selector = '';
            
            // セレクタの優先順位（より具体的なものを優先）
            if (button.id) {
              // IDがある場合は最優先
              selector = `#${button.id}`;
            } else if (button.getAttribute('name')) {
              // name属性がある場合
              const tagName = button.tagName.toLowerCase();
              selector = `${tagName}[name="${button.getAttribute('name')}"]`;
              if (buttons.length > 1) {
                uniqueLabel = `${label}[name=${button.getAttribute('name')}]`;
              }
            } else if (button.getAttribute('onclick')) {
              // onclick属性で識別（一部のみ使用）
              const onclick = button.getAttribute('onclick') || '';
              const funcMatch = onclick.match(/^(\w+)\(/);
              if (funcMatch) {
                uniqueLabel = `${label}[${funcMatch[1]}]`;
                selector = button.className ? `.${button.className.split(' ')[0]}` : button.tagName.toLowerCase();
              }
            } else if (buttons.length === 1 && button.textContent?.trim()) {
              // 同じテキストのボタンが1つだけの場合
              // テキストを含むボタンを特定するXPath風のセレクタ
              // ただし、Playwrightではtext=を使うのが推奨
              selector = `text="${button.textContent.trim()}"`;
            } else if (button.className) {
              // クラス名での識別を改善
              const classes = button.className.split(' ').filter(c => c && !c.startsWith('btn-'));
              if (classes.length > 1) {
                // 複数のクラスを組み合わせてより具体的に
                selector = `.${classes.join('.')}`;
              } else if (classes.length === 1) {
                selector = `.${classes[0]}`;
                // 同じクラスを持つボタンが複数ある場合は、インデックスを付与
                if (buttons.length > 1 && groupIndex > 0) {
                  uniqueLabel = `${label}[${groupIndex + 1}]`;
                  // nth-childやnth-of-typeは使わず、PlaywrightのnthセレクタとしてUIで処理
                }
              } else {
                selector = button.tagName.toLowerCase();
              }
            } else {
              // 最後の手段：タグ名
              selector = button.tagName.toLowerCase();
              if (buttons.length > 1 && groupIndex > 0) {
                uniqueLabel = `${label}[${groupIndex + 1}]`;
              }
            }
            
            // 属性情報を追加してユニークなラベルを作成
            if (!uniqueLabel.includes('[')) {
              const extraAttrs: string[] = [];
              if (attributes.type && attributes.type !== 'button') {
                extraAttrs.push(`type=${attributes.type}`);
              }
              if (attributes.id) {
                extraAttrs.push(`id=${attributes.id}`);
              }
              if (extraAttrs.length > 0 && buttons.length > 1) {
                uniqueLabel = `${uniqueLabel}[${extraAttrs[0]}]`;
              }
            }
            
            // 同じセレクタが既に存在する場合の処理
            const existingLabel = Object.keys(selectors).find(k => selectors[k] === selector);
            if (existingLabel && existingLabel !== uniqueLabel) {
              // より具体的なセレクタを生成
              if (button.parentElement && button.parentElement.id) {
                selector = `#${button.parentElement.id} ${selector}`;
              } else if (button.closest('form') && (button.closest('form') as HTMLFormElement).id) {
                selector = `#${(button.closest('form') as HTMLFormElement).id} ${selector}`;
              }
            }
            
            selectors[uniqueLabel] = selector;
          });
        });
      }

      // リンクを収集
      if (opts.links) {
        // 通常のリンクとli内のリンクを分けて収集
        const linkGroups = new Map<string, Array<{element: HTMLAnchorElement, context: string}>>();
        
        // href属性がある、またはdata-href属性がある、またはIDがあるa要素を収集
        document.querySelectorAll('a[href], a[data-href], a[id]').forEach((el) => {
          const link = el as HTMLAnchorElement;
          const label = 
            link.textContent?.trim() ||
            link.getAttribute('aria-label') ||
            'link';
          
          // li内のリンクかどうかチェック
          const isInListItem = link.closest('li') !== null;
          const context = isInListItem ? 'li' : 'general';
          
          const groupKey = `${label}::${context}`;
          if (!linkGroups.has(groupKey)) {
            linkGroups.set(groupKey, []);
          }
          linkGroups.get(groupKey)!.push({element: link, context});
        });
        
        // 各リンクのセレクタを生成
        linkGroups.forEach((links, groupKey) => {
          const [baseLabel, context] = groupKey.split('::');
          
          links.forEach((linkInfo, index) => {
            const link = linkInfo.element;
            let label = baseLabel;
            let selector = '';
            
            // li内のリンクの場合、ラベルにプレフィックスを追加
            if (linkInfo.context === 'li') {
              label = `[リスト] ${baseLabel}`;
            }
            
            const attributes = {
              href: link.getAttribute('href') || '',
              dataHref: link.getAttribute('data-href') || '',
              id: link.id || '',
              class: link.className.split(' ')[0] || ''
            };
            
            // セレクタの優先順位（li内の場合は特別な処理）
            if (link.id) {
              selector = `#${link.id}`;
            } else if (linkInfo.context === 'li') {
              // li内のリンクの場合、より具体的なセレクタを生成
              const listItem = link.closest('li');
              if (listItem) {
                // リストアイテムにIDがある場合
                if (listItem.id) {
                  selector = `#${listItem.id} a`;
                }
                // 親のul/olにIDがある場合
                else if (listItem.parentElement?.id) {
                  const parentId = listItem.parentElement.id;
                  // 何番目のliかを特定
                  const listItems = Array.from(listItem.parentElement.children);
                  const itemIndex = listItems.indexOf(listItem);
                  if (itemIndex >= 0) {
                    selector = `#${parentId} li:nth-child(${itemIndex + 1}) a`;
                  }
                }
                // ナビゲーションメニューの場合（nav要素内）
                else if (link.closest('nav')) {
                  const nav = link.closest('nav');
                  if (nav && nav.id) {
                    selector = `#${nav.id} li a:text("${link.textContent?.trim()}")`;
                  } else if (nav && nav.className) {
                    selector = `.${nav.className.split(' ')[0]} li a:text("${link.textContent?.trim()}")`;
                  } else {
                    // テキストでの識別
                    selector = `li a:text("${link.textContent?.trim()}")`;
                  }
                }
                // その他の場合はテキストで識別
                else if (link.textContent?.trim()) {
                  selector = `li a:text("${link.textContent.trim()}")`;
                }
                // data-href属性で識別
                else if (link.getAttribute('data-href')) {
                  selector = `li a[data-href="${link.getAttribute('data-href')}"]`;
                }
                // href属性で識別
                else if (link.href) {
                  selector = `li a[href="${link.getAttribute('href')}"]`;
                }
                else {
                  selector = 'li a';
                }
              }
            } else if (link.getAttribute('data-href')) {
              // data-href属性がある場合
              selector = `a[data-href="${link.getAttribute('data-href')}"]`;
            } else if (link.href) {
              selector = `a[href="${link.getAttribute('href')}"]`;
            } else if (link.textContent?.trim()) {
              selector = `a:text("${link.textContent.trim()}")`;
            } else if (link.className) {
              selector = `a.${link.className.split(' ')[0]}`;
            } else {
              selector = 'a';
            }
            
            // 同じラベルが既に存在する場合は番号を付与
            if (selectors[label]) {
              let counter = 2;
              let uniqueLabel = `${label}_${counter}`;
              while (selectors[uniqueLabel]) {
                counter++;
                uniqueLabel = `${label}_${counter}`;
              }
              label = uniqueLabel;
            }
            
            selectors[label] = selector;
          });
        });
      }

      // セレクトボックスを収集
      if (opts.selects !== false) {
        document.querySelectorAll('select').forEach((el) => {
          const select = el as HTMLSelectElement;
          const label = 
            select.getAttribute('aria-label') ||
            select.name ||
            'select';
          
          const uniqueLabel = makeUniqueLabel(label, {
            id: select.id,
            name: select.name
          });
          
          let selector = '';
          if (select.id) {
            selector = `#${select.id}`;
          } else if (select.name) {
            selector = `select[name="${select.name}"]`;
          } else if (select.className) {
            selector = `select.${select.className.split(' ').join('.')}`;
          } else {
            selector = 'select';
          }
          
          selectors[uniqueLabel] = selector;
        });
      }

      // チェックボックスを収集
      if (opts.checkboxes !== false) {
        document.querySelectorAll('input[type="checkbox"]').forEach((el) => {
          const checkbox = el as HTMLInputElement;
          const label = 
            checkbox.getAttribute('aria-label') ||
            checkbox.name ||
            checkbox.id ||
            'checkbox';
          
          const uniqueLabel = makeUniqueLabel(label, {
            id: checkbox.id,
            name: checkbox.name,
            value: checkbox.value
          });
          
          let selector = '';
          if (checkbox.id) {
            selector = `#${checkbox.id}`;
          } else if (checkbox.name && checkbox.value) {
            selector = `input[type="checkbox"][name="${checkbox.name}"][value="${checkbox.value}"]`;
          } else if (checkbox.name) {
            selector = `input[type="checkbox"][name="${checkbox.name}"]`;
          } else {
            selector = 'input[type="checkbox"]';
          }
          
          selectors[uniqueLabel] = selector;
        });
      }

      // ラジオボタンを収集
      if (opts.radios !== false) {
        document.querySelectorAll('input[type="radio"]').forEach((el) => {
          const radio = el as HTMLInputElement;
          const label = 
            radio.getAttribute('aria-label') ||
            radio.value ||
            radio.id ||
            'radio';
          
          const uniqueLabel = makeUniqueLabel(label, {
            name: radio.name,
            value: radio.value
          });
          
          let selector = '';
          if (radio.id) {
            selector = `#${radio.id}`;
          } else if (radio.name && radio.value) {
            selector = `input[type="radio"][name="${radio.name}"][value="${radio.value}"]`;
          } else if (radio.name) {
            selector = `input[type="radio"][name="${radio.name}"]`;
          } else {
            selector = 'input[type="radio"]';
          }
          
          selectors[uniqueLabel] = selector;
        });
      }

      // テキストエリアを収集
      if (opts.textareas !== false) {
        document.querySelectorAll('textarea').forEach((el) => {
          const textarea = el as HTMLTextAreaElement;
          const label = 
            textarea.getAttribute('aria-label') ||
            textarea.name ||
            textarea.getAttribute('placeholder') ||
            'textarea';
          
          const uniqueLabel = makeUniqueLabel(label, {
            id: textarea.id,
            name: textarea.name
          });
          
          let selector = '';
          if (textarea.id) {
            selector = `#${textarea.id}`;
          } else if (textarea.name) {
            selector = `textarea[name="${textarea.name}"]`;
          } else if (textarea.getAttribute('placeholder')) {
            selector = `textarea[placeholder="${textarea.getAttribute('placeholder')}"]`;
          } else {
            selector = 'textarea';
          }
          
          selectors[uniqueLabel] = selector;
        });
      }

      // テーブル要素を収集（行やセルの識別）
      if (opts.tables === true) {
        // テーブルヘッダー
        document.querySelectorAll('table').forEach((table, tableIndex) => {
          const tableId = table.id || `table-${tableIndex}`;
          
          // ヘッダー行
          table.querySelectorAll('thead th, thead td').forEach((th, index) => {
            const headerText = (th as HTMLElement).textContent?.trim() || `header-${index}`;
            const uniqueLabel = `${tableId}-header-${headerText}`;
            
            let selector = '';
            if (table.id) {
              selector = `#${table.id} thead th:nth-child(${index + 1})`;
            } else {
              selector = `table:nth-of-type(${tableIndex + 1}) thead th:nth-child(${index + 1})`;
            }
            
            selectors[uniqueLabel] = selector;
          });
          
          // データ行（最初の数行のみ）
          table.querySelectorAll('tbody tr').forEach((tr, rowIndex) => {
            if (rowIndex < 3) { // 最初の3行のみ
              const rowId = (tr as HTMLElement).id || `row-${rowIndex}`;
              const uniqueLabel = `${tableId}-${rowId}`;
              
              let selector = '';
              if ((tr as HTMLElement).id) {
                selector = `#${(tr as HTMLElement).id}`;
              } else if (table.id) {
                selector = `#${table.id} tbody tr:nth-child(${rowIndex + 1})`;
              } else {
                selector = `table:nth-of-type(${tableIndex + 1}) tbody tr:nth-child(${rowIndex + 1})`;
              }
              
              selectors[uniqueLabel] = selector;
            }
          });
        });
      }

      // 画像を収集
      if (opts.images === true) {
        document.querySelectorAll('img').forEach((img, index) => {
          const label = 
            img.alt ||
            img.title ||
            img.getAttribute('aria-label') ||
            `image-${index}`;
          
          const uniqueLabel = makeUniqueLabel(label, {
            id: img.id,
            src: img.src.split('/').pop() || ''
          });
          
          let selector = '';
          if (img.id) {
            selector = `#${img.id}`;
          } else if (img.alt) {
            selector = `img[alt="${img.alt}"]`;
          } else if (img.src) {
            const srcPart = img.src.split('/').pop();
            selector = `img[src*="${srcPart}"]`;
          } else {
            selector = `img:nth-of-type(${index + 1})`;
          }
          
          selectors[uniqueLabel] = selector;
        });
      }

      // iframeを収集
      if (opts.iframes === true) {
        document.querySelectorAll('iframe').forEach((iframe, index) => {
          const label = 
            iframe.title ||
            iframe.name ||
            iframe.id ||
            `iframe-${index}`;
          
          const uniqueLabel = makeUniqueLabel(label, {
            id: iframe.id,
            name: iframe.name
          });
          
          let selector = '';
          if (iframe.id) {
            selector = `#${iframe.id}`;
          } else if (iframe.name) {
            selector = `iframe[name="${iframe.name}"]`;
          } else if (iframe.title) {
            selector = `iframe[title="${iframe.title}"]`;
          } else {
            selector = `iframe:nth-of-type(${index + 1})`;
          }
          
          selectors[uniqueLabel] = selector;
        });
      }

      // エラー要素を収集（一般的なエラークラス）
      if (opts.errors === true) {
        const errorSelectors = [
          '.error', '.alert-danger', '.alert-error', '.has-error',
          '.invalid', '.validation-error', '[role="alert"]',
          '.message-error', '.form-error', '.field-error'
        ];
        
        errorSelectors.forEach(errorSelector => {
          document.querySelectorAll(errorSelector).forEach((el, index) => {
            const errorText = (el as HTMLElement).textContent?.trim()?.substring(0, 30) || 'error';
            const uniqueLabel = `error-${errorText}-${index}`;
            
            let selector = '';
            if ((el as HTMLElement).id) {
              selector = `#${(el as HTMLElement).id}`;
            } else {
              selector = errorSelector;
              if (index > 0) {
                // 複数ある場合はインデックスを追加
                selectors[`${uniqueLabel}[${index + 1}]`] = `${errorSelector}:nth-of-type(${index + 1})`;
              } else {
                selectors[uniqueLabel] = selector;
              }
            }
          });
        });
        
        // ローダー/スピナー要素
        const loaderSelectors = [
          '.loader', '.spinner', '.loading', '.progress',
          '[role="progressbar"]', '.spinner-border', '.spinner-grow'
        ];
        
        loaderSelectors.forEach(loaderSelector => {
          const elements = document.querySelectorAll(loaderSelector);
          if (elements.length > 0) {
            const el = elements[0];
            const uniqueLabel = `loader-${loaderSelector.replace('.', '')}`;
            
            if ((el as HTMLElement).id) {
              selectors[uniqueLabel] = `#${(el as HTMLElement).id}`;
            } else {
              selectors[uniqueLabel] = loaderSelector;
            }
          }
        });
      }

      return selectors;
      }, options);

      // セレクタをファイルに保存（カテゴリも含める）
      await this.saveDiscoveredSelectors(this.flowId || 'default', category, storageLabel, discoveredSelectors, currentUrl);

      const count = Object.keys(discoveredSelectors).length;
      console.log(`✅ Discovered ${count} selectors and saved with label: ${storageLabel} in category: ${category}`);
      
      // UIに通知
      if (this.socket) {
        this.socket.emit('selectors:discovered', {
          nodeId: node.id,
          label: storageLabel,
          url: currentUrl,
          count,
          selectors: discoveredSelectors
        });
      }
    } catch (error) {
      console.error('Error in executeDiscoverSelectors:', error);
      throw error;
    }
  }

  private async saveDiscoveredSelectors(
    flowId: string,
    category: string,
    label: string, 
    selectors: Record<string, string>,
    url: string
  ) {
    // fs/promisesとpathは既にインポート済み
    
    // フローごとのディレクトリを作成
    const baseDir = process.env.NODE_ENV === 'production' 
      ? path.resolve(process.cwd(), 'flows')
      : path.resolve(process.cwd(), '../flows');
    const flowDir = path.join(baseDir, flowId);
    await fs.mkdir(flowDir, { recursive: true });
    
    const selectorsFile = path.join(flowDir, 'selectors.json');
    
    let existingData: any = {};
    try {
      const content = await fs.readFile(selectorsFile, 'utf-8');
      existingData = JSON.parse(content);
    } catch (error) {
      // ファイルが存在しない場合は新規作成
      existingData = {
        flowId,
        selectors: {}
      };
    }
    
    // 新形式（v2.0）への移行
    if (!existingData.version || existingData.version !== '2.0') {
      // 旧形式のデータを新形式に変換
      const oldSelectors = existingData.selectors || {};
      existingData = {
        version: '2.0',
        flowId: existingData.flowId || flowId,
        categories: {
          default: oldSelectors
        }
      };
      console.log('Migrated selectors to v2.0 format');
    }
    
    // カテゴリ構造を初期化
    if (!existingData.categories) {
      existingData.categories = {};
    }
    
    // カテゴリが存在しない場合は作成
    if (!existingData.categories[category]) {
      existingData.categories[category] = {};
    }
    
    // セレクタを更新（カテゴリ内に保存）
    existingData.categories[category][label] = {
      url,
      lastUpdated: new Date().toISOString(),
      selectors
    };
    
    console.log(`Saved selectors to category: "${category}", label: "${label}"`);
    console.log(`Total categories: ${Object.keys(existingData.categories).length}`);
    console.log(`Categories: ${Object.keys(existingData.categories).join(', ')}`);
    
    // ファイルに保存
    await fs.writeFile(selectorsFile, JSON.stringify(existingData, null, 2));
  }
}