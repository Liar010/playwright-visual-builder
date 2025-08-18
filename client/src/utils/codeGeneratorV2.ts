import { Node, Edge } from 'reactflow';
import type { NodeType } from '@playwright-visual-builder/shared';
import { analyzeFlowGroups, sortNodesWithGroups, NodeGroup, detectIframeContexts, IframeContext } from './flowAnalyzer';

export function generatePlaywrightCodeV2(nodes: Node[], edges: Edge[], variables?: Array<{ name: string; description?: string; type: string }>): string {
  if (nodes.length === 0) {
    return '// テストステップが定義されていません';
  }

  // フローのグループを解析
  const groups = analyzeFlowGroups(nodes, edges);
  const sortedNodes = sortNodesWithGroups(nodes, edges, groups);
  
  // iframeコンテキストを検出（元のnodesを使用）
  const iframeContexts = detectIframeContexts(nodes, edges);

  const lines: string[] = [
    "import { test, expect } from '@playwright/test';",
    '',
    "test('Generated Test', async ({ page }) => {",
  ];
  
  // 変数の宣言
  const declaredVars = new Set<string>();
  
  // iframe変数の宣言（複数のiframeがある場合）
  const iframeVars = new Set<string>();
  iframeContexts.forEach((_, index) => {
    const varName = `frame${index + 1}`;
    iframeVars.add(varName);
  });
  
  if (iframeVars.size > 0) {
    lines.push(`  // iframe variables`);
    iframeVars.forEach(varName => {
      lines.push(`  let ${varName};`);
      declaredVars.add(varName);
    });
    lines.push('');
  }
  
  // ユーザー定義変数の宣言
  if (variables && variables.length > 0) {
    lines.push(`  // User-defined variables`);
    variables.forEach(v => {
      lines.push(`  let ${v.name};${v.description ? ` // ${v.description}` : ''}`);
      declaredVars.add(v.name);
    });
    lines.push('');
  }

  // コード生成（インデントレベルを管理）
  const generatedLines = generateNodesCode(sortedNodes, groups, iframeContexts, 1, declaredVars);
  lines.push(...generatedLines);

  lines.push('});');
  return lines.join('\n');
}

function generateNodesCode(
  nodes: Node[],
  groups: NodeGroup[],
  iframeContexts: IframeContext[],
  indentLevel: number,
  declaredVars?: Set<string>
): string[] {
  const lines: string[] = [];
  const processedNodes = new Set<string>();

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    
    // すでに処理済みの場合はスキップ
    if (processedNodes.has(node.id)) continue;
    processedNodes.add(node.id);
    
    // どのiframeコンテキストに属するかチェック
    let frameVarToUse = 'page';
    
    // すべてのiframeコンテキストをチェック
    for (let ctxIndex = 0; ctxIndex < iframeContexts.length; ctxIndex++) {
      const ctx = iframeContexts[ctxIndex];
      if (ctx.nodesInContext.some(n => n.id === node.id)) {
        frameVarToUse = `frame${ctxIndex + 1}`;
        break;
      }
    }
    
    // iframe switchノードの場合
    if (node.type === 'iframe' && node.data.action?.iframeAction === 'switch') {
      const contextIndex = iframeContexts.findIndex(ctx => ctx.switchNode.id === node.id);
      if (contextIndex >= 0) {
        const frameVar = `frame${contextIndex + 1}`;
        // iframe switchノード自体を処理
        const code = generateNodeCode(node, indentLevel, false, frameVar, declaredVars);
        if (code) {
          lines.push(code);
        }
        continue;
      }
    }
    
    // iframe exitノードの場合
    if (node.type === 'iframe' && node.data.action?.iframeAction === 'exit') {
      const code = generateNodeCode(node, indentLevel, false, null, declaredVars);
      if (code) {
        lines.push(code);
      }
      continue;
    }

    // グループの開始ノードの場合
    const group = groups.find(g => g.startNode.id === node.id);
    if (group) {
      // グループの開始コード
      const startCode = generateGroupStartCode(group, indentLevel);
      lines.push(...startCode);

      // グループ内のノードを処理
      if (group.type === 'condition' && group.trueNodes && group.falseNodes) {
        // Trueブランチのノードを処理
        group.trueNodes.forEach(innerNode => {
          processedNodes.add(innerNode.id);
          // このノードがどのiframeコンテキストに属するかチェック
          let innerFrameVar = null;
          for (let ctxIndex = 0; ctxIndex < iframeContexts.length; ctxIndex++) {
            const ctx = iframeContexts[ctxIndex];
            if (ctx.nodesInContext.some(n => n.id === innerNode.id)) {
              innerFrameVar = `frame${ctxIndex + 1}`;
              break;
            }
          }
          const innerCode = generateNodeCode(innerNode, indentLevel + 1, !!innerFrameVar, innerFrameVar, declaredVars);
          if (innerCode) {
            lines.push(innerCode);
          }
        });
        // Falseブランチのノードも処理済みとしてマーク（後でelseブロックで処理）
        group.falseNodes.forEach(innerNode => {
          processedNodes.add(innerNode.id);
        });
      } else {
        // ループまたは通常のグループ内のノードを処理
        group.innerNodes.forEach(innerNode => {
          processedNodes.add(innerNode.id);
          // このノードがどのiframeコンテキストに属するかチェック
          let innerFrameVar = null;
          for (let ctxIndex = 0; ctxIndex < iframeContexts.length; ctxIndex++) {
            const ctx = iframeContexts[ctxIndex];
            if (ctx.nodesInContext.some(n => n.id === innerNode.id)) {
              innerFrameVar = `frame${ctxIndex + 1}`;
              break;
            }
          }
          const innerCode = generateNodeCode(innerNode, indentLevel + 1, !!innerFrameVar, innerFrameVar, declaredVars);
          if (innerCode) {
            lines.push(innerCode);
          }
        });
      }

      // グループの終了コード
      const endCode = generateGroupEndCode(group, indentLevel, declaredVars);
      lines.push(...endCode);

      // EndNodeも処理済みとしてマーク
      processedNodes.add(group.endNode.id);
    }
    // 終了ノードの場合はスキップ（すでに処理済み）
    else if (node.type === 'conditionEnd' || node.type === 'loopEnd') {
      continue;
    }
    // 通常のノード
    else {
      const isInIframe = frameVarToUse !== 'page';
      const code = generateNodeCode(node, indentLevel, isInIframe, isInIframe ? frameVarToUse : null, declaredVars);
      if (code) {
        lines.push(code);
      }
    }
  }

  return lines;
}

function generateGroupStartCode(group: NodeGroup, indentLevel: number): string[] {
  const lines: string[] = [];
  const indent = '  '.repeat(indentLevel);
  const { startNode } = group;

  if (group.type === 'condition') {
    const condition = startNode.data.condition;
    
    if (condition?.type === 'selector') {
      const selector = condition.selector || '';
      const comparison = condition.comparison || 'exists';
      
      switch (comparison) {
        case 'exists':
          lines.push(`${indent}// Check if element exists`);
          lines.push(`${indent}const elementExists = await page.locator('${selector}').count() > 0;`);
          lines.push(`${indent}if (elementExists) {`);
          break;
        case 'visible':
          lines.push(`${indent}// Check if element is visible`);
          lines.push(`${indent}const isVisible = await page.locator('${selector}').isVisible();`);
          lines.push(`${indent}if (isVisible) {`);
          break;
        case 'contains':
          lines.push(`${indent}// Check if element contains text`);
          lines.push(`${indent}const text = await page.locator('${selector}').textContent();`);
          lines.push(`${indent}if (text && text.includes('${condition.value || ''}')) {`);
          break;
        case 'equals':
          lines.push(`${indent}// Check if element text equals`);
          lines.push(`${indent}const text = await page.locator('${selector}').textContent();`);
          lines.push(`${indent}if (text === '${condition.value || ''}') {`);
          break;
        default:
          lines.push(`${indent}if (true) { // TODO: Add condition`);
      }
    } else if (condition?.type === 'url') {
      lines.push(`${indent}// Check URL condition`);
      lines.push(`${indent}if (page.url().includes('${condition.value || ''}')) {`);
    } else if (condition?.type === 'custom' && condition.expression) {
      lines.push(`${indent}// Custom condition`);
      lines.push(`${indent}const result = await page.evaluate(() => ${condition.expression});`);
      lines.push(`${indent}if (result) {`);
    } else {
      lines.push(`${indent}if (true) { // TODO: Configure condition`);
    }
  } else if (group.type === 'loop') {
    const loop = startNode.data.loop;
    
    if (loop?.type === 'count') {
      lines.push(`${indent}// Loop ${loop.count} times`);
      lines.push(`${indent}for (let i = 0; i < ${loop.count || 1}; i++) {`);
      lines.push(`${indent}  console.log(\`Loop iteration \${i + 1} of ${loop.count}\`);`);
    } else if (loop?.type === 'while') {
      lines.push(`${indent}// While loop`);
      lines.push(`${indent}let loopCount = 0;`);
      lines.push(`${indent}const maxIterations = ${loop.maxIterations || 100};`);
      lines.push(`${indent}while (loopCount < maxIterations) {`);
      if (loop.condition && loop.condition !== 'true') {
        lines.push(`${indent}  // Check loop condition`);
        lines.push(`${indent}  const shouldContinue = await page.evaluate(() => ${loop.condition});`);
        lines.push(`${indent}  if (!shouldContinue) break;`);
      }
      lines.push(`${indent}  console.log(\`While loop iteration \${loopCount + 1}\`);`);
    } else if (loop?.type === 'forEach') {
      if (loop.selector) {
        lines.push(`${indent}// ForEach element loop`);
        lines.push(`${indent}const elements = await page.locator('${loop.selector}').all();`);
        lines.push(`${indent}console.log(\`Found \${elements.length} elements\`);`);
        lines.push(`${indent}for (const element of elements) {`);
      } else if (loop.items) {
        const items = loop.items.split(',').map((item: string) => item.trim());
        lines.push(`${indent}// ForEach items loop`);
        lines.push(`${indent}const items = ${JSON.stringify(items)};`);
        lines.push(`${indent}for (const item of items) {`);
        lines.push(`${indent}  console.log(\`Processing item: \${item}\`);`);
      } else {
        lines.push(`${indent}// ForEach loop`);
        lines.push(`${indent}for (const item of []) { // TODO: Define items`);
      }
    } else {
      lines.push(`${indent}// Loop`);
      lines.push(`${indent}for (let i = 0; i < 1; i++) { // TODO: Configure loop`);
    }
  }

  return lines;
}

function generateGroupEndCode(group: NodeGroup, indentLevel: number, declaredVars?: Set<string>): string[] {
  const lines: string[] = [];
  const indent = '  '.repeat(indentLevel);

  if (group.type === 'condition') {
    // Falseブランチにノードがある場合
    if (group.falseNodes && group.falseNodes.length > 0) {
      lines.push(`${indent}} else {`);
      // Falseブランチのノードを処理
      group.falseNodes.forEach(node => {
        // TODO: iframeコンテキストのチェックが必要
        const code = generateNodeCode(node, indentLevel + 1, false, null, declaredVars);
        if (code) {
          lines.push(code);
        }
      });
      lines.push(`${indent}}`);
    } else {
      // Falseブランチが空の場合
      lines.push(`${indent}} else {`);
      lines.push(`${indent}  // No else branch actions`);
      lines.push(`${indent}}`);
    }
  } else if (group.type === 'loop') {
    const loop = group.startNode.data.loop;
    if (loop?.type === 'while') {
      lines.push(`${indent}  loopCount++;`);
      lines.push(`${indent}}`);
    } else {
      lines.push(`${indent}}`);
    }
  }

  return lines;
}

function generateNodeCode(node: Node, indentLevel: number, isInIframeContext: boolean = false, frameVar?: string | null, declaredVars?: Set<string>): string {
  const { type, data } = node;
  const indent = '  '.repeat(indentLevel);
  
  // iframeコンテキスト内の場合は該当のframe変数を使用
  const locator = isInIframeContext && frameVar ? frameVar : 'page';

  // 基本的なコード生成（既存のロジックを再利用）
  let code = '';

  switch (type as NodeType) {
    // Navigation
    case 'navigate':
      code = `await ${locator}.goto('${data.action?.url || ''}');`;
      break;
    
    case 'goBack':
      code = `await ${locator}.goBack();`;
      break;
    
    case 'goForward':
      code = `await ${locator}.goForward();`;
      break;
    
    case 'reload':
      code = `await ${locator}.reload();`;
      break;

    // Mouse Actions
    case 'click':
      code = `await ${locator}.click('${data.action?.selector || ''}');`;
      break;
    
    case 'doubleClick':
      code = `await ${locator}.dblclick('${data.action?.selector || ''}');`;
      break;
    
    case 'rightClick':
      code = `await ${locator}.click('${data.action?.selector || ''}', { button: 'right' });`;
      break;
    
    case 'hover':
      code = `await ${locator}.hover('${data.action?.selector || ''}');`;
      break;
    
    case 'dragAndDrop':
      code = `await ${locator}.dragAndDrop('${data.action?.sourceSelector || ''}', '${data.action?.targetSelector || ''}');`;
      break;

    // Input Actions
    case 'fill': {
      const value = processVariableReferences(data.action?.value || '', declaredVars);
      code = `await ${locator}.fill('${data.action?.selector || ''}', ${value});`;
      break;
    }

    case 'select': {
      const value = processVariableReferences(data.action?.value || '', declaredVars);
      code = `await ${locator}.selectOption('${data.action?.selector || ''}', ${value});`;
      break;
    }

    case 'check':
      code = `await ${locator}.check('${data.action?.selector || ''}');`;
      break;
    
    case 'uploadFile':
      code = `await ${locator}.setInputFiles('${data.action?.selector || ''}', '${data.action?.filePath || ''}');`;
      break;
    
    case 'focus':
      code = `await ${locator}.focus('${data.action?.selector || ''}');`;
      break;

    case 'blur':
      code = `await ${locator}.locator('${data.action?.selector || ''}').blur();`;
      break;
    
    case 'keyboard':
      code = `await ${locator}.keyboard.press('${data.action?.key || ''}');`;
      break;
    
    case 'scroll':
      if (data.action?.selector) {
        code = `await ${locator}.locator('${data.action.selector}').scrollIntoViewIfNeeded();`;
      } else {
        code = `await ${locator}.evaluate(() => window.scrollBy(0, ${data.action?.amount || 100}));`;
      }
      break;

    // Wait Actions
    case 'wait':
      code = `await ${locator}.waitForTimeout(${data.action?.timeout || 1000});`;
      break;

    case 'waitForHidden':
      code = `await ${locator}.waitForSelector('${data.action?.selector || ''}', { state: 'hidden', timeout: ${data.action?.timeout || 10000} });`;
      break;
    
    case 'waitForURL':
      code = `await ${locator}.waitForURL('${data.action?.urlPattern || ''}');`;
      break;
    
    case 'waitForLoadState':
      code = `await ${locator}.waitForLoadState('${data.action?.state || 'networkidle'}');`;
      break;
    
    case 'waitForResponse':
      code = `await ${locator}.waitForResponse(response => response.url().includes('${data.action?.urlPattern || ''}'));`;
      break;
    
    case 'waitForRequest':
      code = `await ${locator}.waitForRequest(request => request.url().includes('${data.action?.urlPattern || ''}'));`;
      break;
    
    case 'waitForFunction':
      code = `await ${locator}.waitForFunction(${data.action?.expression || 'true'});`;
      break;

    // その他のノードタイプも同様に実装...
    case 'screenshot':
      code = `await ${locator}.screenshot({ path: 'screenshot-${Date.now()}.png', fullPage: true });`;
      break;

    case 'assertion':
      if (data.assertion?.comparison === 'exists') {
        code = `await expect(${locator}.locator('${data.assertion?.selector || ''}')).toBeVisible();`;
      } else if (data.assertion?.comparison === 'contains') {
        code = `await expect(${locator}.locator('${data.assertion?.selector || ''}')).toContainText('${data.assertion?.expected || ''}');`;
      } else if (data.assertion?.comparison === 'equals') {
        code = `await expect(${locator}.locator('${data.assertion?.selector || ''}')).toHaveText('${data.assertion?.expected || ''}');`;
      }
      break;

    // Get Actions
    case 'getText': {
      const varName = data.action?.variableName;
      if (varName && declaredVars?.has(varName)) {
        code = `${varName} = await ${locator}.locator('${data.action?.selector || ''}').textContent();\nconsole.log('${varName}:', ${varName});`;
      } else {
        code = `const text = await ${locator}.locator('${data.action?.selector || ''}').textContent();\nconsole.log(text);`;
      }
      break;
    }
    
    case 'getAttribute': {
      const varName = data.action?.variableName;
      if (varName && declaredVars?.has(varName)) {
        code = `${varName} = await ${locator}.locator('${data.action?.selector || ''}').getAttribute('${data.action?.attribute || ''}');\nconsole.log('${varName}:', ${varName});`;
      } else {
        code = `const attr = await ${locator}.locator('${data.action?.selector || ''}').getAttribute('${data.action?.attribute || ''}');\nconsole.log(attr);`;
      }
      break;
    }
    
    case 'getCount': {
      const varName = data.action?.variableName;
      if (varName && declaredVars?.has(varName)) {
        code = `${varName} = await ${locator}.locator('${data.action?.selector || ''}').count();\nconsole.log('${varName}:', ${varName});`;
      } else {
        code = `const count = await ${locator}.locator('${data.action?.selector || ''}').count();\nconsole.log('Count:', count);`;
      }
      break;
    }

    // Assertion State Checks
    case 'isEnabled':
      code = `await expect(${locator}.locator('${data.action?.selector || ''}')).toBeEnabled();`;
      break;

    case 'isDisabled':
      code = `await expect(${locator}.locator('${data.action?.selector || ''}')).toBeDisabled();`;
      break;

    case 'isChecked':
      code = `await expect(${locator}.locator('${data.action?.selector || ''}')).toBeChecked();`;
      break;

    case 'isVisible':
      code = `await expect(${locator}.locator('${data.action?.selector || ''}')).toBeVisible();`;
      break;

    // Frame Actions
    case 'iframe':
      if (data.action?.iframeAction === 'switch') {
        // frame変数名を取得（frameVarが渡されていれば使用）
        const frameName = frameVar || 'frame';
        code = `// Switch to iframe\n${frameName} = page.frameLocator('${data.action?.selector || 'iframe'}');`;
      } else {
        code = `// Exit iframe context\n// Following actions will use 'page' again`;
      }
      break;
    
    // Dialog Actions
    case 'dialog':
      code = `// Handle dialog\npage.on('dialog', async dialog => {\n  console.log(dialog.message());\n  await dialog.${data.action?.dialogAction || 'accept'}();\n});`;
      break;
    
    // Download Actions
    case 'download':
      code = `// Handle download\nconst downloadPromise = page.waitForEvent('download');\nawait page.click('${data.action?.triggerSelector || ''}');\nconst download = await downloadPromise;\nawait download.saveAs('./downloads/' + download.suggestedFilename());`;
      break;

    // Browser Actions
    case 'newPage':
      code = `const newPage = await page.context().newPage();\nawait newPage.goto('${data.action?.url || ''}');`;
      break;
    
    case 'switchTab':
      code = `// Switch to tab at index ${data.action?.index || 0}\nconst pages = page.context().pages();\nawait pages[${data.action?.index || 0}].bringToFront();`;
      break;
    
    // Storage Actions
    case 'setCookie':
      code = `await page.context().addCookies([{ name: '${data.action?.name || ''}', value: '${data.action?.value || ''}', domain: '${data.action?.domain || location.hostname}', path: '/' }]);`;
      break;
    
    case 'localStorage':
      if (data.action?.storageAction === 'set') {
        code = `await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: '${data.action?.key}', value: '${data.action?.value}' });`;
      } else if (data.action?.storageAction === 'get') {
        code = `const value = await page.evaluate(key => localStorage.getItem(key), '${data.action?.key}');\nconsole.log(value);`;
      } else if (data.action?.storageAction === 'remove') {
        code = `await page.evaluate(key => localStorage.removeItem(key), '${data.action?.key}');`;
      } else {
        code = `await page.evaluate(() => localStorage.clear());`;
      }
      break;
    
    // Network Actions
    case 'networkIntercept':
      if (data.action?.interceptAction === 'mock') {
        code = `await page.route('${data.action?.urlPattern}', route => route.fulfill({ status: ${data.action?.mockStatus || 200}, body: '${data.action?.mockBody || ''}' }));`;
      } else if (data.action?.interceptAction === 'block') {
        code = `await page.route('${data.action?.urlPattern}', route => route.abort());`;
      } else {
        code = `// Network intercept: ${data.action?.interceptAction}`;
      }
      break;

    // Custom Code
    case 'customCode':
      if (data.customCode?.code) {
        const customCode = data.customCode.code;
        const codeLines = customCode.split('\n');
        
        if (data.customCode.wrapInTryCatch) {
          // try-catchでラップする場合
          const wrappedLines = [
            'try {',
            ...codeLines.map((line: string) => line ? `  ${line}` : ''),
            '} catch (error) {',
            '  console.error(\'Custom code error:\', error);',
            '}'
          ];
          
          if (data.customCode.description) {
            code = `// ${data.customCode.description}\n${wrappedLines.join('\n')}`;
          } else {
            code = wrappedLines.join('\n');
          }
        } else {
          // そのまま使用する場合
          if (data.customCode.description) {
            code = `// ${data.customCode.description}\n${customCode}`;
          } else {
            code = customCode;
          }
        }
      } else {
        code = `// No custom code defined`;
      }
      break;

    default:
      code = `// ${type}: Not implemented`;
  }

  // 複数行のコードの場合、各行にインデントを適用
  if (code) {
    const lines = code.split('\n');
    return lines.map(line => line ? `${indent}${line}` : '').join('\n');
  }
  return '';
}

/**
 * 変数参照を処理する
 */
function processVariableReferences(value: string, declaredVars?: Set<string>): string {
  if (!value) return "''";
  
  // ${variableName}形式の変数参照を探す
  const variablePattern = /\$\{([^}]+)\}/g;
  const matches = value.match(variablePattern);
  
  if (!matches) {
    // 変数参照がない場合は通常の文字列として返す
    return `'${value.replace(/'/g, "\\'")}''`;
  }
  
  // 変数参照がある場合はテンプレートリテラルを使用
  let processedValue = value;
  matches.forEach(match => {
    const varName = match.slice(2, -1); // ${} を除去
    if (declaredVars?.has(varName)) {
      processedValue = processedValue.replace(match, `\${${varName}}`);
    } else {
      // 未宣言の変数はそのまま文字列として扱う
      console.warn(`Variable '${varName}' is not declared`);
    }
  });
  
  return '`' + processedValue + '`';
}