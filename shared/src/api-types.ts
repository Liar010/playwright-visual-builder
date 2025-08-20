// API用のテスト定義型
export interface APITestRequest {
  test: {
    name?: string;
    description?: string;
    config?: {
      headless?: boolean;
      viewport?: {
        width: number;
        height: number;
      };
      timeout?: number;
      nodeDelay?: number;
      debug?: boolean;
    };
    variables?: Record<string, any>;
    steps: APIStep[];
  };
}

// ステップの型定義
export type APIStep = 
  | NavigateStep
  | ClickStep
  | InputStep
  | ScreenshotStep
  | WaitStep
  | GetTextStep
  | GetAttributeStep
  | ScrollStep
  | HoverStep
  | SelectStep
  | CheckStep
  | RadioStep
  | ConditionalStep
  | AssertStep
  | CustomCodeStep;

// 各ステップタイプの定義
interface NavigateStep {
  navigate: string;
}

interface ClickStep {
  click: string;
}

interface InputStep {
  input: {
    selector: string;
    value: string;
  };
}

interface ScreenshotStep {
  screenshot: string; // label
}

interface WaitStep {
  wait: number | string; // milliseconds or selector
}

interface GetTextStep {
  getText: {
    selector: string;
    variable: string;
  };
}

interface GetAttributeStep {
  getAttribute: {
    selector: string;
    attribute: string;
    variable: string;
  };
}

interface ScrollStep {
  scroll: {
    direction?: 'up' | 'down' | 'left' | 'right';
    amount?: number;
    selector?: string; // scroll to element
  };
}

interface HoverStep {
  hover: string;
}

interface SelectStep {
  select: {
    selector: string;
    value: string;
  };
}

interface CheckStep {
  check: string; // checkbox selector
  uncheck?: boolean;
}

interface RadioStep {
  radio: {
    name: string;
    value: string;
  };
}

interface ConditionalStep {
  if: string; // condition expression
  then: APIStep[];
  else?: APIStep[];
}

interface AssertStep {
  assert: {
    selector?: string;
    condition: string; // e.g., "exists", "visible", "contains:text"
    value?: any;
  };
}

interface CustomCodeStep {
  code: string; // JavaScript code to execute
}

// API レスポンス型
export interface APITestResponse {
  success: boolean;
  executionId: string;
  duration?: number;
  result?: {
    passed: boolean;
    total: number;
    passedCount: number;
    failed: number;
    skipped: number;
    steps: Array<{
      type: string;
      status: 'passed' | 'failed' | 'skipped';
      error?: string;
      duration?: number;
    }>;
    screenshots: Array<{
      label: string;
      data: string; // base64
      timestamp: number;
    }>;
    errors: string[];
  };
  error?: {
    code: string;
    message: string;
    details?: string;
  };
}

// リファレンス用の型
export interface APIReference {
  version: string;
  stepTypes: Array<{
    type: string;
    description: string;
    schema: any;
    examples: any[];
  }>;
}