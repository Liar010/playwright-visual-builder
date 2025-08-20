import { Router } from 'express';
import multer from 'multer';
import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { TestRunner } from '../services/testRunner';
import { APIConverter } from '../services/apiConverter';
import { 
  APITestRequest, 
  APITestResponse, 
  APIReference 
} from '@playwright-visual-builder/shared';

const router = Router();
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.json', '.yaml', '.yml'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only JSON and YAML files are allowed'));
    }
  }
});

/**
 * POST /api/test/execute
 * JSONを直接POSTして実行
 */
router.post('/test/execute', async (req, res) => {
  try {
    const request: APITestRequest = req.body;
    
    // バリデーション
    if (!request.test || !request.test.steps || !Array.isArray(request.test.steps)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Invalid test request format',
          details: 'Request must contain test.steps array'
        }
      } as APITestResponse);
    }
    
    // 変換と実行
    const executionId = `exec-${uuidv4()}`;
    const converter = new APIConverter();
    const { nodes, edges, config } = converter.convertToFlow(request);
    
    // テスト実行
    const runner = new TestRunner(undefined, config);
    const startTime = Date.now();
    
    try {
      const result = await runner.run(nodes, edges);
      const duration = Date.now() - startTime;
      
      // レスポンス作成
      const response: APITestResponse = {
        success: true,
        executionId,
        duration,
        result: {
          passed: result.status === 'passed',
          total: result.steps.length,
          passedCount: result.steps.filter(s => s.status === 'passed').length,
          failed: result.steps.filter(s => s.status === 'failed').length,
          skipped: result.steps.filter(s => s.status === 'skipped').length,
          steps: result.steps.map(s => ({
            type: nodes.find(n => n.id === s.nodeId)?.type || 'unknown',
            status: s.status as 'passed' | 'failed' | 'skipped',
            error: s.error,
            duration: undefined
          })),
          screenshots: result.screenshots || [],
          errors: result.steps.filter(s => s.error).map(s => s.error!)
        }
      };
      
      res.json(response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({
        success: false,
        executionId,
        error: {
          code: 'EXECUTION_ERROR',
          message: 'Test execution failed',
          details: errorMessage
        }
      } as APITestResponse);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(400).json({
      success: false,
      error: {
        code: 'CONVERSION_ERROR',
        message: 'Failed to convert test definition',
        details: errorMessage
      }
    } as APITestResponse);
  }
});

/**
 * POST /api/test/execute/file
 * ファイルアップロードで実行
 */
router.post('/test/execute/file', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'NO_FILE',
        message: 'No file uploaded'
      }
    } as APITestResponse);
  }
  
  try {
    // ファイル読み込み
    const filePath = req.file.path;
    const content = fs.readFileSync(filePath, 'utf8');
    const ext = path.extname(req.file.originalname).toLowerCase();
    
    let request: APITestRequest;
    
    // パース
    if (ext === '.json') {
      request = JSON.parse(content);
    } else if (ext === '.yaml' || ext === '.yml') {
      request = yaml.load(content) as APITestRequest;
    } else {
      throw new Error('Unsupported file format');
    }
    
    // ファイル削除
    fs.unlinkSync(filePath);
    
    // バリデーション
    if (!request.test || !request.test.steps || !Array.isArray(request.test.steps)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FILE',
          message: 'Invalid test file format',
          details: 'File must contain test.steps array'
        }
      } as APITestResponse);
    }
    
    // 変換と実行
    const executionId = `exec-${uuidv4()}`;
    const converter = new APIConverter();
    const { nodes, edges, config } = converter.convertToFlow(request);
    
    // テスト実行
    const runner = new TestRunner(undefined, config);
    const startTime = Date.now();
    
    try {
      const result = await runner.run(nodes, edges);
      const duration = Date.now() - startTime;
      
      // レスポンス作成
      const response: APITestResponse = {
        success: true,
        executionId,
        duration,
        result: {
          passed: result.status === 'passed',
          total: result.steps.length,
          passedCount: result.steps.filter(s => s.status === 'passed').length,
          failed: result.steps.filter(s => s.status === 'failed').length,
          skipped: result.steps.filter(s => s.status === 'skipped').length,
          steps: result.steps.map(s => ({
            type: nodes.find(n => n.id === s.nodeId)?.type || 'unknown',
            status: s.status as 'passed' | 'failed' | 'skipped',
            error: s.error,
            duration: undefined
          })),
          screenshots: result.screenshots || [],
          errors: result.steps.filter(s => s.error).map(s => s.error!)
        }
      };
      
      res.json(response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({
        success: false,
        executionId,
        error: {
          code: 'EXECUTION_ERROR',
          message: 'Test execution failed',
          details: errorMessage
        }
      } as APITestResponse);
    }
  } catch (error) {
    // ファイルを削除
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch {}
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(400).json({
      success: false,
      error: {
        code: 'FILE_ERROR',
        message: 'Failed to process file',
        details: errorMessage
      }
    } as APITestResponse);
  }
});

/**
 * POST /api/test/validate
 * テスト定義の検証（実行せずに構造チェック）
 */
router.post('/test/validate', async (req, res) => {
  try {
    const request: APITestRequest = req.body;
    
    // バリデーション
    if (!request.test || !request.test.steps || !Array.isArray(request.test.steps)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Invalid test request format',
          details: 'Request must contain test.steps array'
        }
      });
    }
    
    // 変換を試みる
    const converter = new APIConverter();
    const { nodes, edges } = converter.convertToFlow(request);
    
    res.json({
      success: true,
      message: 'Test definition is valid',
      stats: {
        totalSteps: request.test.steps.length,
        totalNodes: nodes.length,
        totalEdges: edges.length
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Test definition validation failed',
        details: errorMessage
      }
    });
  }
});

/**
 * GET /api/test/reference
 * 利用可能なステップタイプのリファレンス
 */
router.get('/test/reference', (req, res) => {
  const reference: APIReference = {
    version: '1.0.0',
    stepTypes: [
      {
        type: 'navigate',
        description: 'Navigate to a URL',
        schema: { navigate: 'string' },
        examples: [
          { navigate: 'https://example.com' }
        ]
      },
      {
        type: 'click',
        description: 'Click an element',
        schema: { click: 'string (selector)' },
        examples: [
          { click: '#submit-button' },
          { click: 'button.primary' }
        ]
      },
      {
        type: 'input',
        description: 'Input text into a field',
        schema: { 
          input: {
            selector: 'string',
            value: 'string'
          }
        },
        examples: [
          { input: { selector: '#email', value: 'test@example.com' }}
        ]
      },
      {
        type: 'screenshot',
        description: 'Take a screenshot',
        schema: { screenshot: 'string (label)' },
        examples: [
          { screenshot: 'dashboard' },
          { screenshot: 'login-page' }
        ]
      },
      {
        type: 'wait',
        description: 'Wait for time or element',
        schema: { wait: 'number (ms) | string (selector)' },
        examples: [
          { wait: 2000 },
          { wait: '.loading-complete' }
        ]
      },
      {
        type: 'getText',
        description: 'Get text from an element and store in variable',
        schema: {
          getText: {
            selector: 'string',
            variable: 'string'
          }
        },
        examples: [
          { getText: { selector: 'h1', variable: 'pageTitle' }}
        ]
      },
      {
        type: 'getAttribute',
        description: 'Get attribute from an element and store in variable',
        schema: {
          getAttribute: {
            selector: 'string',
            attribute: 'string',
            variable: 'string'
          }
        },
        examples: [
          { getAttribute: { selector: '#status', attribute: 'data-value', variable: 'statusValue' }}
        ]
      },
      {
        type: 'scroll',
        description: 'Scroll the page or to an element',
        schema: {
          scroll: {
            direction: 'up | down | left | right',
            amount: 'number',
            selector: 'string (optional)'
          }
        },
        examples: [
          { scroll: { direction: 'down', amount: 500 }},
          { scroll: { selector: '#footer' }}
        ]
      },
      {
        type: 'hover',
        description: 'Hover over an element',
        schema: { hover: 'string (selector)' },
        examples: [
          { hover: '.menu-item' }
        ]
      },
      {
        type: 'select',
        description: 'Select an option from a dropdown',
        schema: {
          select: {
            selector: 'string',
            value: 'string'
          }
        },
        examples: [
          { select: { selector: '#country', value: 'JP' }}
        ]
      },
      {
        type: 'check',
        description: 'Check or uncheck a checkbox',
        schema: { 
          check: 'string (selector)',
          uncheck: 'boolean (optional)'
        },
        examples: [
          { check: '#agree-terms' },
          { check: '#newsletter', uncheck: true }
        ]
      },
      {
        type: 'radio',
        description: 'Select a radio button',
        schema: {
          radio: {
            name: 'string',
            value: 'string'
          }
        },
        examples: [
          { radio: { name: 'plan', value: 'premium' }}
        ]
      },
      {
        type: 'if',
        description: 'Conditional branching',
        schema: {
          if: 'string (condition)',
          then: 'array of steps',
          else: 'array of steps (optional)'
        },
        examples: [
          {
            if: '{{pageTitle}} === "Dashboard"',
            then: [
              { screenshot: 'logged-in' }
            ],
            else: [
              { click: '#login' }
            ]
          }
        ]
      },
      {
        type: 'assert',
        description: 'Assert a condition',
        schema: {
          assert: {
            selector: 'string (optional)',
            condition: 'string',
            value: 'any (optional)'
          }
        },
        examples: [
          { assert: { selector: 'h1', condition: 'contains', value: 'Welcome' }},
          { assert: { condition: '{{total}} > 0' }}
        ]
      },
      {
        type: 'code',
        description: 'Execute custom JavaScript code',
        schema: { code: 'string' },
        examples: [
          { code: 'console.log("Custom code execution")' }
        ]
      }
    ]
  };
  
  res.json(reference);
});

export default router;