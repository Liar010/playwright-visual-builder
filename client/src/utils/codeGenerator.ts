import { Node, Edge } from 'reactflow';
import type { NodeType } from '@playwright-visual-builder/shared';

export function generatePlaywrightCode(nodes: Node[], edges: Edge[]): string {
  if (nodes.length === 0) {
    return '// テストステップが定義されていません';
  }

  const sortedNodes = sortNodesByFlow(nodes, edges);
  const lines: string[] = [
    "import { test, expect } from '@playwright/test';",
    '',
    "test('Generated Test', async ({ page }) => {",
  ];

  for (const node of sortedNodes) {
    const codeLine = generateNodeCode(node);
    if (codeLine) {
      lines.push(`  ${codeLine}`);
    }
  }

  lines.push('});');
  return lines.join('\n');
}

function sortNodesByFlow(nodes: Node[], edges: Edge[]): Node[] {
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

function generateNodeCode(node: Node): string {
  const { type, data } = node;

  switch (type as NodeType) {
    case 'navigate':
      return `await page.goto('${data.action?.url || ''}');`;

    case 'click':
      return `await page.click('${data.action?.selector || ''}');`;

    case 'fill':
      return `await page.fill('${data.action?.selector || ''}', '${
        data.action?.value || ''
      }');`;

    case 'select':
      return `await page.selectOption('${data.action?.selector || ''}', '${
        data.action?.value || ''
      }');`;

    case 'check':
      return `await page.check('${data.action?.selector || ''}');`;

    case 'wait':
      return `await page.waitForTimeout(${data.action?.timeout || 1000});`;

    case 'waitForHidden':
      return `await page.waitForSelector('${data.action?.selector || ''}', { state: 'hidden', timeout: ${data.action?.timeout || 10000} });`;

    case 'focus':
      return `await page.focus('${data.action?.selector || ''}');`;

    case 'blur':
      return `await page.locator('${data.action?.selector || ''}').blur();`;

    case 'isEnabled':
      return `await expect(page.locator('${data.action?.selector || ''}')).toBeEnabled();`;

    case 'isDisabled':
      return `await expect(page.locator('${data.action?.selector || ''}')).toBeDisabled();`;

    case 'isChecked':
      return `await expect(page.locator('${data.action?.selector || ''}')).toBeChecked();`;

    case 'isVisible':
      return `await expect(page.locator('${data.action?.selector || ''}')).toBeVisible();`;

    case 'assertion':
      if (data.assertion?.comparison === 'exists') {
        return `await expect(page.locator('${
          data.assertion?.selector || ''
        }')).toBeVisible();`;
      } else if (data.assertion?.comparison === 'contains') {
        return `await expect(page.locator('${
          data.assertion?.selector || ''
        }')).toContainText('${data.assertion?.expected || ''}');`;
      } else if (data.assertion?.comparison === 'equals') {
        return `await expect(page.locator('${
          data.assertion?.selector || ''
        }')).toHaveText('${data.assertion?.expected || ''}');`;
      }
      return '';

    case 'screenshot':
      return `await page.screenshot({ path: 'screenshot-${Date.now()}.png' });`;

    case 'condition':
      return `// Conditional logic: ${data.condition?.expression || ''}`;

    default:
      return `// Unknown node type: ${type}`;
  }
}