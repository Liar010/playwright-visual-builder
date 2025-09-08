import { Node, Edge } from 'reactflow';
import * as yaml from 'yaml';
import type { TestFlow, TestConfig, TestVariable } from '@playwright-visual-builder/shared';

export type ImportFormat = 'json' | 'yaml';

export interface ImportResult {
  nodes: Node[];
  edges: Edge[];
  variables?: TestVariable[];
  config?: TestConfig;
  metadata?: {
    name: string;
    description?: string;
    createdAt?: string;
    updatedAt?: string;
  };
}

/**
 * フローをインポート
 */
export async function importFlow(
  content: string,
  format: ImportFormat
): Promise<ImportResult> {
  try {
    let flow: TestFlow;

    switch (format) {
      case 'json':
        flow = JSON.parse(content);
        break;
      case 'yaml':
        flow = yaml.parse(content);
        break;
      default:
        throw new Error(`Unsupported import format: ${format}`);
    }

    // 検証
    validateFlow(flow);

    return {
      nodes: flow.nodes as Node[],
      edges: flow.edges,
      variables: flow.variables,
      config: flow.config,
      metadata: {
        name: flow.name,
        description: flow.description,
        createdAt: flow.createdAt,
        updatedAt: flow.updatedAt,
      },
    };
  } catch (error) {
    throw new Error(`Failed to import flow: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * フローの妥当性を検証
 */
function validateFlow(flow: any): asserts flow is TestFlow {
  if (!flow || typeof flow !== 'object') {
    throw new Error('Invalid flow: must be an object');
  }

  if (!Array.isArray(flow.nodes)) {
    throw new Error('Invalid flow: nodes must be an array');
  }

  if (!Array.isArray(flow.edges)) {
    throw new Error('Invalid flow: edges must be an array');
  }

  // ノードの検証
  for (const node of flow.nodes) {
    if (!node.id || !node.type) {
      throw new Error('Invalid node: must have id and type');
    }
    if (!node.position || typeof node.position.x !== 'number' || typeof node.position.y !== 'number') {
      throw new Error(`Invalid node ${node.id}: must have valid position`);
    }
  }

  // エッジの検証
  for (const edge of flow.edges) {
    if (!edge.id || !edge.source || !edge.target) {
      throw new Error('Invalid edge: must have id, source, and target');
    }
  }

  // 設定の検証（オプション）
  if (flow.config) {
    validateConfig(flow.config);
  }
}

/**
 * 設定の妥当性を検証
 */
function validateConfig(config: any): asserts config is TestConfig {
  if (typeof config !== 'object') {
    throw new Error('Invalid config: must be an object');
  }

  // ビューポートの検証
  if (config.viewport) {
    if (typeof config.viewport.width !== 'number' || typeof config.viewport.height !== 'number') {
      throw new Error('Invalid viewport: width and height must be numbers');
    }
  }

  // タイムアウトの検証
  if (config.timeout !== undefined && typeof config.timeout !== 'number') {
    throw new Error('Invalid timeout: must be a number');
  }

  // ヘッドレスモードの検証
  if (config.headless !== undefined && typeof config.headless !== 'boolean') {
    throw new Error('Invalid headless: must be a boolean');
  }
}

/**
 * ファイルを読み込み
 */
export function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result;
      if (typeof content === 'string') {
        resolve(content);
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * ファイル形式を推測
 */
export function guessFormat(filename: string): ImportFormat | null {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'json':
      return 'json';
    case 'yaml':
    case 'yml':
      return 'yaml';
    default:
      return null;
  }
}