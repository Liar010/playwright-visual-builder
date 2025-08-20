import { Node, Edge } from 'reactflow';

export interface NodeGroup {
  startNode: Node;
  endNode: Node;
  innerNodes: Node[];
  type: 'condition' | 'loop';
  trueNodes?: Node[];  // 条件分岐のTrueブランチのノード
  falseNodes?: Node[]; // 条件分岐のFalseブランチのノード
}

export interface IframeContext {
  switchNode: Node;
  exitNode?: Node;
  nodesInContext: Node[];
}

/**
 * フローを解析して、条件分岐やループのグループを識別
 */
export function analyzeFlowGroups(nodes: Node[], edges: Edge[]): NodeGroup[] {
  const groups: NodeGroup[] = [];
  const processedNodes = new Set<string>();

  // 条件分岐とループの開始ノードを探す
  const startNodes = nodes.filter(
    n => n.type === 'condition' || n.type === 'loop'
  );

  console.log('条件/ループ開始ノード:', startNodes.map(n => ({
    id: n.id,
    type: n.type,
    pairId: n.data?.pairId
  })));

  for (const startNode of startNodes) {
    if (processedNodes.has(startNode.id)) continue;

    // ペアのEndノードを探す
    const endNodeId = startNode.data.pairId;
    if (!endNodeId) {
      console.log(`ペアIDが見つかりません: ${startNode.id}`);
      continue;
    }

    const endNode = nodes.find(n => n.id === endNodeId);
    if (!endNode) {
      console.log(`終了ノードが見つかりません: ${endNodeId}`);
      continue;
    }

    // 開始ノードと終了ノードの間にあるノードを見つける
    if (startNode.type === 'condition') {
      // 条件分岐の場合、true/falseブランチを分けて収集
      const { trueNodes, falseNodes } = findConditionBranches(
        startNode,
        endNode,
        nodes,
        edges
      );
      
      groups.push({
        startNode,
        endNode,
        innerNodes: [...trueNodes, ...falseNodes],
        trueNodes,
        falseNodes,
        type: 'condition',
      });
    } else {
      // ループの場合
      const innerNodes = findNodesBetween(
        startNode,
        endNode,
        nodes,
        edges
      );
      
      groups.push({
        startNode,
        endNode,
        innerNodes,
        type: 'loop',
      });
    }

    // 処理済みとしてマーク（入れ子のグループは除外）
    processedNodes.add(startNode.id);
    processedNodes.add(endNode.id);
    // 内部ノードは処理済みとしてマークしない（入れ子グループの可能性があるため）
  }

  return groups;
}

/**
 * 条件分岐のtrue/falseブランチのノードを見つける
 */
function findConditionBranches(
  startNode: Node,
  endNode: Node,
  nodes: Node[],
  edges: Edge[]
): { trueNodes: Node[]; falseNodes: Node[] } {
  const trueNodes: Node[] = [];
  const falseNodes: Node[] = [];
  
  // 開始ノードから出ているエッジを取得
  const startEdges = edges.filter(e => e.source === startNode.id);
  
  // Trueブランチのノードを収集
  const trueEdge = startEdges.find(e => e.sourceHandle === 'true');
  if (trueEdge && trueEdge.target !== endNode.id) {
    collectBranchNodes(trueEdge.target, endNode.id, nodes, edges, trueNodes);
  }
  
  // Falseブランチのノードを収集
  const falseEdge = startEdges.find(e => e.sourceHandle === 'false');
  if (falseEdge && falseEdge.target !== endNode.id) {
    collectBranchNodes(falseEdge.target, endNode.id, nodes, edges, falseNodes);
  }
  
  return { trueNodes, falseNodes };
}

/**
 * 特定のブランチのノードを収集
 */
function collectBranchNodes(
  startNodeId: string,
  endNodeId: string,
  nodes: Node[],
  edges: Edge[],
  result: Node[]
): void {
  const visited = new Set<string>();
  const queue: string[] = [startNodeId];
  
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    
    if (visited.has(nodeId) || nodeId === endNodeId) {
      continue;
    }
    
    visited.add(nodeId);
    const node = nodes.find(n => n.id === nodeId);
    
    if (node) {
      result.push(node);
      
      // このノードから出ているエッジを探す
      const outEdges = edges.filter(e => e.source === nodeId);
      outEdges.forEach(e => {
        if (!visited.has(e.target) && e.target !== endNodeId) {
          queue.push(e.target);
        }
      });
    }
  }
}

/**
 * 開始ノードと終了ノードの間にあるノードを見つける
 */
function findNodesBetween(
  startNode: Node,
  endNode: Node,
  nodes: Node[],
  edges: Edge[]
): Node[] {
  const innerNodes: Node[] = [];
  const visited = new Set<string>();
  const queue: string[] = [];

  // 開始ノードから直接つながっているノードを探す
  const startEdges = edges.filter(e => e.source === startNode.id);
  startEdges.forEach(e => {
    if (e.target !== endNode.id) {
      queue.push(e.target);
    }
  });

  // BFSで終了ノードまでのパスにあるノードを収集
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    
    if (visited.has(nodeId) || nodeId === endNode.id) {
      continue;
    }

    visited.add(nodeId);
    const node = nodes.find(n => n.id === nodeId);
    
    if (node) {
      innerNodes.push(node);

      // このノードから出ているエッジを探す
      const outEdges = edges.filter(e => e.source === nodeId);
      outEdges.forEach(e => {
        if (!visited.has(e.target) && e.target !== endNode.id) {
          queue.push(e.target);
        }
      });
    }
  }

  return innerNodes;
}

/**
 * フローをトポロジカルソートして、グループを考慮した順序で返す
 */
export function sortNodesWithGroups(
  nodes: Node[],
  edges: Edge[],
  groups: NodeGroup[]
): Node[] {
  const sorted: Node[] = [];
  const visited = new Set<string>();
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  
  // グループに属するノードのマップを作成
  const nodeToGroup = new Map<string, NodeGroup>();
  groups.forEach(group => {
    nodeToGroup.set(group.startNode.id, group);
    nodeToGroup.set(group.endNode.id, group);
    group.innerNodes.forEach(n => nodeToGroup.set(n.id, group));
  });

  function visit(nodeId: string) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    const node = nodeMap.get(nodeId);
    if (!node) return;

    // グループの開始ノードの場合
    const group = nodeToGroup.get(nodeId);
    if (group && node.id === group.startNode.id) {
      // グループ全体を処理
      sorted.push(group.startNode);
      
      // グループ内のノードを順序立てて追加
      const innerSorted = sortInnerNodes(group.innerNodes, edges);
      innerSorted.forEach(n => {
        visited.add(n.id);
        sorted.push(n);
      });
      
      visited.add(group.endNode.id);
      sorted.push(group.endNode);
      
      // グループの後のノードを処理
      const afterEdges = edges.filter(e => e.source === group.endNode.id);
      afterEdges.forEach(e => visit(e.target));
    }
    // グループに属さないノード、またはすでに処理済みのノード
    else if (!nodeToGroup.has(nodeId)) {
      sorted.push(node);
      
      // 次のノードを処理
      const outEdges = edges.filter(e => e.source === nodeId);
      outEdges.forEach(e => visit(e.target));
    }
  }

  // 開始ノードを見つける
  const startNodes = nodes.filter(
    n => !edges.some(e => e.target === n.id)
  );

  startNodes.forEach(node => visit(node.id));

  // 未訪問のノードを追加
  nodes.forEach(node => {
    if (!visited.has(node.id)) {
      sorted.push(node);
    }
  });

  return sorted;
}

/**
 * グループ内のノードをソート
 */
function sortInnerNodes(nodes: Node[], edges: Edge[]): Node[] {
  if (nodes.length === 0) return [];
  
  const nodeIds = new Set(nodes.map(n => n.id));
  const relevantEdges = edges.filter(
    e => nodeIds.has(e.source) && nodeIds.has(e.target)
  );
  
  const sorted: Node[] = [];
  const visited = new Set<string>();
  
  function visit(node: Node) {
    if (visited.has(node.id)) return;
    visited.add(node.id);
    
    const nextEdges = relevantEdges.filter(e => e.source === node.id);
    nextEdges.forEach(e => {
      const nextNode = nodes.find(n => n.id === e.target);
      if (nextNode) visit(nextNode);
    });
    
    sorted.unshift(node);
  }
  
  // グループ内の開始ノードを見つける
  const startNodes = nodes.filter(
    n => !relevantEdges.some(e => e.target === n.id)
  );
  
  if (startNodes.length === 0 && nodes.length > 0) {
    // サイクルがある場合は、最初のノードから開始
    visit(nodes[0]);
  } else {
    startNodes.forEach(visit);
  }
  
  // 未訪問のノードを追加
  nodes.forEach(node => {
    if (!visited.has(node.id)) {
      sorted.push(node);
    }
  });
  
  return sorted.reverse();
}

/**
 * iframeコンテキストを検出
 */
export function detectIframeContexts(nodes: Node[], edges: Edge[]): IframeContext[] {
  const contexts: IframeContext[] = [];
  const sortedNodes = sortNodesByFlow(nodes, edges);
  
  console.log('Sorted nodes order:', sortedNodes.map(n => `${n.type}(${n.id})`));
  
  for (let i = 0; i < sortedNodes.length; i++) {
    const node = sortedNodes[i];
    
    // iframe switchノードを発見
    if (node.type === 'iframe' && node.data.action?.iframeAction === 'switch') {
      const context: IframeContext = {
        switchNode: node,
        nodesInContext: []
      };
      
      console.log(`Found iframe switch at index ${i}`);
      
      // 後続のノードを収集（exitまたは別のswitchまで）
      for (let j = i + 1; j < sortedNodes.length; j++) {
        const nextNode = sortedNodes[j];
        
        // iframe exitノードを発見
        if (nextNode.type === 'iframe' && nextNode.data.action?.iframeAction === 'exit') {
          context.exitNode = nextNode;
          console.log(`Found iframe exit at index ${j}`);
          break;
        }
        
        // 別のiframe switchノードを発見（ネストしたiframe）
        if (nextNode.type === 'iframe' && nextNode.data.action?.iframeAction === 'switch') {
          // 現在のコンテキストを終了
          break;
        }
        
        // このノードはiframeコンテキスト内
        console.log(`Adding to context: ${nextNode.type}(${nextNode.id})`);
        context.nodesInContext.push(nextNode);
      }
      
      contexts.push(context);
    }
  }
  
  console.log('Final contexts:', contexts);
  return contexts;
}

/**
 * トポロジカルソートでノードを並べる
 */
function sortNodesByFlow(nodes: Node[], edges: Edge[]): Node[] {
  const sorted: Node[] = [];
  const visited = new Set<string>();
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  
  function visit(nodeId: string) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    
    const node = nodeMap.get(nodeId);
    if (!node) return;
    
    // 現在のノードを追加（訪問済みとしてマーク後）
    sorted.push(node);
    
    // 次のノードを処理
    const outEdges = edges.filter(e => e.source === nodeId);
    outEdges.forEach(e => visit(e.target));
  }
  
  // 開始ノードを見つける
  const startNodes = nodes.filter(
    n => !edges.some(e => e.target === n.id)
  );
  
  startNodes.forEach(node => visit(node.id));
  
  // 未訪問のノードを追加
  nodes.forEach(node => {
    if (!visited.has(node.id)) {
      sorted.push(node);
    }
  });
  
  return sorted;
}