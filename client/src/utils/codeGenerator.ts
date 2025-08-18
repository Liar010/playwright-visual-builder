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
    // Navigation
    case 'navigate':
      return `await page.goto('${data.action?.url || ''}');`;
    
    case 'goBack':
      return `await page.goBack();`;
    
    case 'goForward':
      return `await page.goForward();`;
    
    case 'reload':
      return `await page.reload();`;

    // Mouse Actions
    case 'click':
      return `await page.click('${data.action?.selector || ''}');`;
    
    case 'doubleClick':
      return `await page.dblclick('${data.action?.selector || ''}');`;
    
    case 'rightClick':
      return `await page.click('${data.action?.selector || ''}', { button: 'right' });`;
    
    case 'hover':
      return `await page.hover('${data.action?.selector || ''}');`;
    
    case 'dragAndDrop':
      return `await page.dragAndDrop('${data.action?.sourceSelector || ''}', '${data.action?.targetSelector || ''}');`;

    // Input Actions
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
    
    case 'uploadFile':
      return `await page.setInputFiles('${data.action?.selector || ''}', '${data.action?.filePath || ''}');`;
    
    case 'focus':
      return `await page.focus('${data.action?.selector || ''}');`;

    case 'blur':
      return `await page.locator('${data.action?.selector || ''}').blur();`;
    
    case 'keyboard':
      return `await page.keyboard.press('${data.action?.key || ''}');`;
    
    case 'scroll':
      if (data.action?.selector) {
        return `await page.locator('${data.action.selector}').scrollIntoViewIfNeeded();`;
      } else {
        return `await page.evaluate(() => window.scrollBy(0, ${data.action?.amount || 100}));`;
      }

    // Wait Actions
    case 'wait':
      return `await page.waitForTimeout(${data.action?.timeout || 1000});`;

    case 'waitForHidden':
      return `await page.waitForSelector('${data.action?.selector || ''}', { state: 'hidden', timeout: ${data.action?.timeout || 10000} });`;
    
    case 'waitForURL':
      return `await page.waitForURL('${data.action?.urlPattern || ''}');`;
    
    case 'waitForLoadState':
      return `await page.waitForLoadState('${data.action?.state || 'networkidle'}');`;
    
    case 'waitForResponse':
      return `await page.waitForResponse(response => response.url().includes('${data.action?.urlPattern || ''}'));`;
    
    case 'waitForRequest':
      return `await page.waitForRequest(request => request.url().includes('${data.action?.urlPattern || ''}'));`;
    
    case 'waitForFunction':
      return `await page.waitForFunction(${data.action?.expression || 'true'});`;

    // Assertions & Get
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
    
    case 'getText':
      return `const text = await page.locator('${data.action?.selector || ''}').textContent();\nconsole.log(text);`;
    
    case 'getAttribute':
      return `const attr = await page.locator('${data.action?.selector || ''}').getAttribute('${data.action?.attribute || ''}');\nconsole.log(attr);`;
    
    case 'getCount':
      return `const count = await page.locator('${data.action?.selector || ''}').count();\nconsole.log('Count:', count);`;

    // Browser Actions
    case 'newPage':
      return `const newPage = await page.context().newPage();\nawait newPage.goto('${data.action?.url || ''}');`;
    
    case 'switchTab':
      return `// Switch to tab at index ${data.action?.index || 0}\nconst pages = page.context().pages();\nawait pages[${data.action?.index || 0}].bringToFront();`;
    
    case 'setCookie':
      return `await page.context().addCookies([{ name: '${data.action?.name || ''}', value: '${data.action?.value || ''}', domain: '${data.action?.domain || location.hostname}', path: '/' }]);`;
    
    case 'localStorage':
      if (data.action?.storageAction === 'set') {
        return `await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: '${data.action?.key}', value: '${data.action?.value}' });`;
      } else if (data.action?.storageAction === 'get') {
        return `const value = await page.evaluate(key => localStorage.getItem(key), '${data.action?.key}');\nconsole.log(value);`;
      } else if (data.action?.storageAction === 'remove') {
        return `await page.evaluate(key => localStorage.removeItem(key), '${data.action?.key}');`;
      } else if (data.action?.storageAction === 'clear') {
        return `await page.evaluate(() => localStorage.clear());`;
      }
      return `// localStorage action: ${data.action?.storageAction}`;

    // Advanced
    case 'screenshot':
      return `await page.screenshot({ path: 'screenshot-${Date.now()}.png', fullPage: true });`;
    
    case 'iframe':
      if (data.action?.iframeAction === 'switch') {
        return `// Switch to iframe\nconst frame = page.frameLocator('${data.action?.selector || 'iframe'}');`;
      } else {
        return `// Exit iframe context`;
      }
    
    case 'dialog':
      return `// Handle dialog\npage.on('dialog', async dialog => {\n  console.log(dialog.message());\n  await dialog.${data.action?.dialogAction || 'accept'}();\n});`;
    
    case 'download':
      return `// Handle download\nconst downloadPromise = page.waitForEvent('download');\nawait page.click('${data.action?.triggerSelector || ''}');\nconst download = await downloadPromise;\nawait download.saveAs('./downloads/' + download.suggestedFilename());`;
    
    case 'networkIntercept':
      if (data.action?.interceptAction === 'mock') {
        return `await page.route('${data.action?.urlPattern}', route => route.fulfill({ status: ${data.action?.mockStatus || 200}, body: '${data.action?.mockBody || ''}' }));`;
      } else if (data.action?.interceptAction === 'block') {
        return `await page.route('${data.action?.urlPattern}', route => route.abort());`;
      }
      return `// Network intercept: ${data.action?.interceptAction}`;

    case 'condition':
      // 条件分岐の簡易実装
      if (data.condition?.type === 'selector') {
        return `// Check if element exists\nif (await page.locator('${data.condition?.selector || ''}').count() > 0) {\n  // True branch\n} else {\n  // False branch\n}`;
      } else if (data.condition?.type === 'url') {
        return `// Check URL\nif (page.url().includes('${data.condition?.value || ''}')) {\n  // True branch\n} else {\n  // False branch\n}`;
      }
      return `// Conditional logic: ${data.condition?.expression || ''}`;
    
    case 'loop':
      // ループの簡易実装
      if (data.loop?.type === 'count') {
        return `// Loop ${data.loop.count} times\nfor (let i = 0; i < ${data.loop.count || 1}; i++) {\n  // Loop body\n  console.log(\`Iteration \${i + 1}\`);\n}`;
      } else if (data.loop?.type === 'while') {
        return `// While loop\nlet loopCount = 0;\nwhile (${data.loop?.condition || 'true'} && loopCount < ${data.loop?.maxIterations || 100}) {\n  // Loop body\n  loopCount++;\n}`;
      } else if (data.loop?.type === 'forEach') {
        if (data.loop?.selector) {
          return `// ForEach element\nconst elements = await page.locator('${data.loop.selector}').all();\nfor (const element of elements) {\n  // Process each element\n  await element.click();\n}`;
        }
        return `// ForEach loop\nconst items = [/* items */];\nfor (const item of items) {\n  // Process each item\n}`;
      }
      return `// Loop: ${data.loop?.type || 'unknown'}`;

    default:
      return `// Unknown node type: ${type}`;
  }
}