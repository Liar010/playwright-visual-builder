export type NodeType = 
  // Navigation
  | 'navigate'
  | 'goBack'
  | 'goForward'
  | 'reload'
  // Mouse Actions
  | 'click'
  | 'doubleClick'
  | 'rightClick'
  | 'hover'
  | 'dragAndDrop'
  // Input Actions
  | 'fill'
  | 'select'
  | 'check'
  | 'uploadFile'
  | 'focus'
  | 'blur'
  // Keyboard & Scroll
  | 'keyboard'
  | 'scroll'
  // Wait Actions
  | 'wait'
  | 'waitForHidden'
  | 'waitForURL'
  | 'waitForLoadState'
  | 'waitForResponse'
  | 'waitForRequest'
  | 'waitForFunction'
  // Assertions & Get
  | 'assertion'
  | 'getText'
  | 'getAttribute'
  | 'getCount'
  | 'isEnabled'
  | 'isDisabled'
  | 'isChecked'
  | 'isVisible'
  // Browser Actions
  | 'newPage'
  | 'switchTab'
  | 'setCookie'
  | 'localStorage'
  // Advanced
  | 'screenshot'
  | 'iframe'
  | 'dialog'
  | 'download'
  | 'condition'
  | 'conditionEnd'
  | 'loop'
  | 'loopEnd'
  // Network
  | 'networkIntercept'
  // Custom
  | 'customCode';

export interface TestNode {
  id: string;
  type: NodeType;
  data: NodeData;
  position: { x: number; y: number };
}

export interface NodeData {
  label: string;
  action?: ActionData;
  assertion?: AssertionData;
  condition?: ConditionData;
  loop?: LoopData;
  customCode?: CustomCodeData;
  [key: string]: any;
}

export interface CustomCodeData {
  code: string;
  description?: string;
  // エラーハンドリングの有無
  wrapInTryCatch?: boolean;
}

export interface ActionData {
  selector?: string;
  value?: string;
  url?: string;
  timeout?: number;
  options?: Record<string, any>;
}

export interface AssertionData {
  selector?: string;
  attribute?: string;
  expected?: string;
  comparison?: 'equals' | 'contains' | 'matches' | 'exists';
}

export interface ConditionData {
  type: 'selector' | 'url' | 'custom';
  selector?: string;
  comparison?: 'exists' | 'visible' | 'contains' | 'equals';
  value?: string;
  expression?: string; // カスタム条件式
}

export interface LoopData {
  type: 'count' | 'while' | 'forEach';
  count?: number; // countタイプの場合の繰り返し回数
  maxIterations?: number; // 最大繰り返し回数（無限ループ防止）
  selector?: string; // forEachタイプの場合のセレクタ
  condition?: string; // whileタイプの場合の条件式
  items?: string; // forEach用の項目リスト
}

export interface TestFlow {
  id: string;
  name: string;
  description?: string;
  nodes: TestNode[];
  edges: Edge[];
  config?: TestConfig;
  createdAt: string;
  updatedAt: string;
}

export interface Edge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
}

export interface TestConfig {
  baseUrl?: string;
  timeout?: number;
  viewport?: { width: number; height: number };
  headless?: boolean;
  debug?: boolean;
  nodeDelay?: number; // ノード間の自動待機時間（ミリ秒）
  authentication?: {
    type: 'basic' | 'form' | 'token';
    credentials?: Record<string, string>;
  };
}

export interface TestResult {
  flowId: string;
  status: 'running' | 'passed' | 'failed' | 'stopped';
  startTime: string;
  endTime?: string;
  steps: StepResult[];
  error?: string;
}

export interface StepResult {
  nodeId: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  startTime?: string;
  endTime?: string;
  error?: string;
  screenshot?: string;
  debugInfo?: {
    message: string;
    url?: string;
    selector?: string;
    elementFound?: boolean;
    elementVisible?: boolean;
    elementCount?: number;
    pageTitle?: string;
    stack?: string;
    elementDetails?: {
      tagName: string;
      id: string;
      className: string;
      innerText?: string;
      isDisabled?: boolean;
      position?: {
        x: number;
        y: number;
        width: number;
        height: number;
      };
    };
    selectorError?: string;
    consoleLogs?: Array<{
      type: string;
      text: string;
    }>;
  };
}