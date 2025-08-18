import { Node, Edge } from 'reactflow';
import * as yaml from 'yaml';
import type { TestFlow, TestConfig } from '@playwright-visual-builder/shared';
import { generatePlaywrightCodeV2 } from './codeGeneratorV2';

export type ExportFormat = 'json' | 'yaml' | 'playwright-js' | 'playwright-ts';

export interface ExportOptions {
  format: ExportFormat;
  includeConfig?: boolean;
  prettyPrint?: boolean;
}

/**
 * フローをエクスポート
 */
export function exportFlow(
  nodes: Node[],
  edges: Edge[],
  config: TestConfig,
  options: ExportOptions
): string {
  switch (options.format) {
    case 'json':
      return exportAsJSON(nodes, edges, config, options);
    case 'yaml':
      return exportAsYAML(nodes, edges, config, options);
    case 'playwright-js':
    case 'playwright-ts':
      return exportAsPlaywright(nodes, edges, config, options.format === 'playwright-ts');
    default:
      throw new Error(`Unsupported export format: ${options.format}`);
  }
}

/**
 * JSON形式でエクスポート
 */
function exportAsJSON(
  nodes: Node[],
  edges: Edge[],
  config: TestConfig,
  options: ExportOptions
): string {
  const flow: TestFlow = {
    id: `flow-${Date.now()}`,
    name: 'Exported Flow',
    description: 'Exported from Playwright Visual Builder',
    nodes: nodes as any,
    edges: edges as any,
    config: options.includeConfig ? config : undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return options.prettyPrint
    ? JSON.stringify(flow, null, 2)
    : JSON.stringify(flow);
}

/**
 * YAML形式でエクスポート
 */
function exportAsYAML(
  nodes: Node[],
  edges: Edge[],
  config: TestConfig,
  options: ExportOptions
): string {
  const flow: TestFlow = {
    id: `flow-${Date.now()}`,
    name: 'Exported Flow',
    description: 'Exported from Playwright Visual Builder',
    nodes: nodes as any,
    edges: edges as any,
    config: options.includeConfig ? config : undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return yaml.stringify(flow);
}

/**
 * Playwrightコードとしてエクスポート
 */
function exportAsPlaywright(
  nodes: Node[],
  edges: Edge[],
  _config: TestConfig,
  _isTypeScript: boolean
): string {
  // V2のコードジェネレーターを使用（ネストされた構造に対応）
  // TypeScript/JavaScript の違いは現在の実装では同じ
  return generatePlaywrightCodeV2(nodes, edges);
}

/**
 * ファイルをダウンロード
 */
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}