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
} from '@playwright-visual-builder/shared';

export class TestRunner {
  private socket: Socket;
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private testResult: TestResult;
  private config: TestConfig;
  private screenshotDir: string;
  private debugMode: boolean = false;
  private screenshotInterval: NodeJS.Timeout | null = null;
  private retryCount: number = 3; // デフォルトのリトライ回数
  private retryDelay: number = 1000; // リトライ間の待機時間（ミリ秒）

  constructor(socket: Socket, config?: TestConfig) {
    this.socket = socket;
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

  async run(nodes: Node[], edges: Edge[]) {
    try {
      await this.setup();
      const sortedNodes = this.sortNodesByFlow(nodes, edges);

      this.testResult.steps = sortedNodes.map((node) => ({
        nodeId: node.id,
        status: 'pending',
      }));

      this.emitUpdate();

      for (let i = 0; i < sortedNodes.length; i++) {
        const node = sortedNodes[i];
        await this.executeNode(node);
        
        // ノード間の自動遅延（最後のノードの後は不要）
        if (this.config.nodeDelay && i < sortedNodes.length - 1) {
          console.log(`Applying node delay: ${this.config.nodeDelay}ms`);
          await new Promise(resolve => setTimeout(resolve, this.config.nodeDelay));
        }
      }

      this.testResult.status = 'passed';
      this.testResult.endTime = new Date().toISOString();
      this.emitUpdate();
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
          this.socket.emit('debug:screenshot', {
            image: `data:image/jpeg;base64,${base64Image}`,
            timestamp: Date.now()
          });
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
    const step = this.testResult.steps.find((s) => s.nodeId === node.id);
    if (!step || !this.page) return;

    step.status = 'running';
    step.startTime = new Date().toISOString();
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
    console.log(`Executing ${type}: ${data.label}`);

    try {
      switch (type as NodeType) {
        case 'navigate':
          const inputUrl = data.action?.url || '';
          console.log(`Navigate input URL: "${inputUrl}"`);
          const url = this.resolveUrl(inputUrl);
          console.log(`Navigating to: ${url}`);
          await this.retryOnNetworkError(async () => {
            await this.page!.goto(url, {
              waitUntil: 'networkidle',
              timeout: 30000,
            });
          }, `Navigate to ${url}`);
          console.log(`Navigation completed: ${url}`);
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
          const filePath = data.action?.filePath || '';
          await this.page.waitForSelector(fileSelector, {
            state: 'visible',
            timeout: 10000,
          });
          await this.page.setInputFiles(fileSelector, filePath);
          console.log(`File uploaded: ${filePath}`);
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
          const key = data.action?.key || '';
          console.log(`Pressing key: ${key}`);
          await this.page.keyboard.press(key);
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
          const urlPattern = data.action?.urlPattern || '';
          console.log(`Waiting for URL: ${urlPattern}`);
          await this.page.waitForURL(urlPattern, { timeout: 30000 });
          console.log(`URL matched: ${this.page.url()}`);
          break;

        case 'waitForLoadState':
          const state = data.action?.state || 'networkidle';
          console.log(`Waiting for load state: ${state}`);
          await this.page.waitForLoadState(state as 'load' | 'domcontentloaded' | 'networkidle');
          break;

        case 'waitForHidden':
          const selector = data.action?.selector;
          const timeout = data.action?.timeout || 10000;
          
          if (!selector) {
            throw new Error('waitForHidden requires a selector');
          }
          
          console.log(`Waiting for element to be hidden: ${selector} (timeout: ${timeout}ms)`);
          
          // 要素が非表示になるまで待機
          await this.page.waitForSelector(selector, {
            state: 'hidden',
            timeout: timeout,
          });
          
          console.log(`✓ Element is now hidden: ${selector}`);
          break;

        case 'assertion':
          await this.handleAssertion(data);
          break;

        case 'screenshot':
          const screenshotPath = path.join(
            this.screenshotDir,
            `screenshot-${Date.now()}.png`
          );
          await this.page.screenshot({ path: screenshotPath, fullPage: true });
          console.log(`Screenshot saved: ${screenshotPath}`);
          break;

        case 'getText':
          const textSelector = data.action?.selector || '';
          await this.page.waitForSelector(textSelector, {
            state: 'visible',
            timeout: 10000,
          });
          const textContent = await this.page.locator(textSelector).textContent();
          console.log(`Text content: ${textContent}`);
          // TODO: 変数に保存する機能を実装
          break;

        case 'getAttribute':
          const attrSelector = data.action?.selector || '';
          const attrName = data.action?.attribute || '';
          await this.page.waitForSelector(attrSelector, {
            state: 'visible',
            timeout: 10000,
          });
          const attrValue = await this.page.locator(attrSelector).getAttribute(attrName);
          console.log(`Attribute ${attrName}: ${attrValue}`);
          // TODO: 変数に保存する機能を実装
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

        case 'loop':
          await this.executeLoop(node);
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

  private async executeCondition(node: Node) {
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
          conditionMet = await this.page.evaluate((expr) => {
            try {
              // @ts-ignore
              return eval(expr);
            } catch (e) {
              return false;
            }
          }, conditionData.expression || '');
          break;
          
        default:
          throw new Error(`Unknown condition type: ${conditionData.type}`);
      }
      
      console.log(`Condition evaluated: ${conditionMet ? 'TRUE' : 'FALSE'}`);
      
      // 条件分岐の結果をメタデータとして保存（フロー制御用）
      // 注: 現在の実装では、条件分岐後のフロー制御は
      // React Flow側のエッジ接続（true/falseハンドル）で管理される想定
      
    } catch (error) {
      console.error('Error evaluating condition:', error);
      throw error;
    }
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

  private emitUpdate() {
    this.socket.emit('test:update', this.testResult);
  }
}