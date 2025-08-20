import { Node, Edge } from 'reactflow';
import { APITestRequest, APIStep } from '@playwright-visual-builder/shared';
import { v4 as uuidv4 } from 'uuid';

export class APIConverter {
  private nodeIdCounter = 0;
  private nodes: Node[] = [];
  private edges: Edge[] = [];
  
  /**
   * APIリクエストを内部のノード/エッジ形式に変換
   */
  convertToFlow(request: APITestRequest): { nodes: Node[], edges: Edge[], config: any } {
    this.nodes = [];
    this.edges = [];
    this.nodeIdCounter = 0;
    
    const startNodeId = this.generateNodeId();
    this.nodes.push({
      id: startNodeId,
      type: 'start',
      position: { x: 0, y: 0 },
      data: { label: 'Start' }
    });
    
    let previousNodeId = startNodeId;
    
    // ステップを順次変換
    for (const step of request.test.steps) {
      const result = this.convertStep(step, previousNodeId);
      previousNodeId = result.lastNodeId;
    }
    
    // 終了ノードを追加
    const endNodeId = this.generateNodeId();
    this.nodes.push({
      id: endNodeId,
      type: 'end',
      position: { x: 0, y: this.nodeIdCounter * 100 },
      data: { label: 'End' }
    });
    
    this.edges.push({
      id: `${previousNodeId}-${endNodeId}`,
      source: previousNodeId,
      target: endNodeId
    });
    
    return {
      nodes: this.nodes,
      edges: this.edges,
      config: request.test.config || {}
    };
  }
  
  private convertStep(step: APIStep, previousNodeId: string): { lastNodeId: string } {
    // navigateステップ
    if ('navigate' in step) {
      const nodeId = this.generateNodeId();
      this.nodes.push({
        id: nodeId,
        type: 'navigate',
        position: { x: 0, y: this.nodeIdCounter * 100 },
        data: { action: { url: step.navigate } }
      });
      this.edges.push({
        id: `${previousNodeId}-${nodeId}`,
        source: previousNodeId,
        target: nodeId
      });
      return { lastNodeId: nodeId };
    }
    
    // clickステップ
    if ('click' in step) {
      const nodeId = this.generateNodeId();
      this.nodes.push({
        id: nodeId,
        type: 'click',
        position: { x: 0, y: this.nodeIdCounter * 100 },
        data: { selector: step.click }
      });
      this.edges.push({
        id: `${previousNodeId}-${nodeId}`,
        source: previousNodeId,
        target: nodeId
      });
      return { lastNodeId: nodeId };
    }
    
    // inputステップ
    if ('input' in step) {
      const nodeId = this.generateNodeId();
      this.nodes.push({
        id: nodeId,
        type: 'input',
        position: { x: 0, y: this.nodeIdCounter * 100 },
        data: {
          selector: step.input.selector,
          value: step.input.value
        }
      });
      this.edges.push({
        id: `${previousNodeId}-${nodeId}`,
        source: previousNodeId,
        target: nodeId
      });
      return { lastNodeId: nodeId };
    }
    
    // screenshotステップ
    if ('screenshot' in step) {
      const nodeId = this.generateNodeId();
      this.nodes.push({
        id: nodeId,
        type: 'screenshot',
        position: { x: 0, y: this.nodeIdCounter * 100 },
        data: { label: step.screenshot }
      });
      this.edges.push({
        id: `${previousNodeId}-${nodeId}`,
        source: previousNodeId,
        target: nodeId
      });
      return { lastNodeId: nodeId };
    }
    
    // waitステップ
    if ('wait' in step) {
      const nodeId = this.generateNodeId();
      const isSelector = typeof step.wait === 'string';
      this.nodes.push({
        id: nodeId,
        type: 'wait',
        position: { x: 0, y: this.nodeIdCounter * 100 },
        data: isSelector 
          ? { selector: step.wait }
          : { delay: step.wait }
      });
      this.edges.push({
        id: `${previousNodeId}-${nodeId}`,
        source: previousNodeId,
        target: nodeId
      });
      return { lastNodeId: nodeId };
    }
    
    // getTextステップ
    if ('getText' in step) {
      const nodeId = this.generateNodeId();
      this.nodes.push({
        id: nodeId,
        type: 'getText',
        position: { x: 0, y: this.nodeIdCounter * 100 },
        data: {
          selector: step.getText.selector,
          variableName: step.getText.variable
        }
      });
      this.edges.push({
        id: `${previousNodeId}-${nodeId}`,
        source: previousNodeId,
        target: nodeId
      });
      return { lastNodeId: nodeId };
    }
    
    // getAttributeステップ
    if ('getAttribute' in step) {
      const nodeId = this.generateNodeId();
      this.nodes.push({
        id: nodeId,
        type: 'getAttribute',
        position: { x: 0, y: this.nodeIdCounter * 100 },
        data: {
          selector: step.getAttribute.selector,
          attribute: step.getAttribute.attribute,
          variableName: step.getAttribute.variable
        }
      });
      this.edges.push({
        id: `${previousNodeId}-${nodeId}`,
        source: previousNodeId,
        target: nodeId
      });
      return { lastNodeId: nodeId };
    }
    
    // scrollステップ
    if ('scroll' in step) {
      const nodeId = this.generateNodeId();
      this.nodes.push({
        id: nodeId,
        type: 'scroll',
        position: { x: 0, y: this.nodeIdCounter * 100 },
        data: step.scroll
      });
      this.edges.push({
        id: `${previousNodeId}-${nodeId}`,
        source: previousNodeId,
        target: nodeId
      });
      return { lastNodeId: nodeId };
    }
    
    // hoverステップ
    if ('hover' in step) {
      const nodeId = this.generateNodeId();
      this.nodes.push({
        id: nodeId,
        type: 'hover',
        position: { x: 0, y: this.nodeIdCounter * 100 },
        data: { selector: step.hover }
      });
      this.edges.push({
        id: `${previousNodeId}-${nodeId}`,
        source: previousNodeId,
        target: nodeId
      });
      return { lastNodeId: nodeId };
    }
    
    // selectステップ
    if ('select' in step) {
      const nodeId = this.generateNodeId();
      this.nodes.push({
        id: nodeId,
        type: 'select',
        position: { x: 0, y: this.nodeIdCounter * 100 },
        data: {
          selector: step.select.selector,
          value: step.select.value
        }
      });
      this.edges.push({
        id: `${previousNodeId}-${nodeId}`,
        source: previousNodeId,
        target: nodeId
      });
      return { lastNodeId: nodeId };
    }
    
    // checkステップ
    if ('check' in step) {
      const nodeId = this.generateNodeId();
      this.nodes.push({
        id: nodeId,
        type: 'checkbox',
        position: { x: 0, y: this.nodeIdCounter * 100 },
        data: {
          selector: step.check,
          action: step.uncheck ? 'uncheck' : 'check'
        }
      });
      this.edges.push({
        id: `${previousNodeId}-${nodeId}`,
        source: previousNodeId,
        target: nodeId
      });
      return { lastNodeId: nodeId };
    }
    
    // radioステップ
    if ('radio' in step) {
      const nodeId = this.generateNodeId();
      this.nodes.push({
        id: nodeId,
        type: 'radio',
        position: { x: 0, y: this.nodeIdCounter * 100 },
        data: {
          name: step.radio.name,
          value: step.radio.value
        }
      });
      this.edges.push({
        id: `${previousNodeId}-${nodeId}`,
        source: previousNodeId,
        target: nodeId
      });
      return { lastNodeId: nodeId };
    }
    
    // 条件分岐ステップ
    if ('if' in step) {
      const conditionId = this.generateNodeId();
      const conditionEndId = this.generateNodeId();
      
      // 条件ノードを追加
      this.nodes.push({
        id: conditionId,
        type: 'condition',
        position: { x: 0, y: this.nodeIdCounter * 100 },
        data: {
          label: 'Condition',
          condition: 'custom',
          customCondition: step.if
        }
      });
      
      // 前のノードから条件ノードへ接続
      this.edges.push({
        id: `${previousNodeId}-${conditionId}`,
        source: previousNodeId,
        target: conditionId
      });
      
      // then分岐を処理
      let thenLastNodeId = conditionId;
      if (step.then && step.then.length > 0) {
        for (const thenStep of step.then) {
          const result = this.convertStep(thenStep, thenLastNodeId);
          if (thenLastNodeId === conditionId) {
            // 最初のthenステップへの接続にはsourceHandle='true'を設定
            const edge = this.edges[this.edges.length - 1];
            edge.sourceHandle = 'true';
          }
          thenLastNodeId = result.lastNodeId;
        }
      }
      
      // else分岐を処理
      let elseLastNodeId = conditionId;
      if (step.else && step.else.length > 0) {
        for (const elseStep of step.else) {
          const result = this.convertStep(elseStep, elseLastNodeId);
          if (elseLastNodeId === conditionId) {
            // 最初のelseステップへの接続にはsourceHandle='false'を設定
            const edge = this.edges[this.edges.length - 1];
            edge.sourceHandle = 'false';
          }
          elseLastNodeId = result.lastNodeId;
        }
      }
      
      // 条件終了ノードを追加
      this.nodes.push({
        id: conditionEndId,
        type: 'conditionEnd',
        position: { x: 0, y: (this.nodeIdCounter + 1) * 100 },
        data: { label: 'End Condition' }
      });
      
      // 両分岐から条件終了ノードへ接続
      if (thenLastNodeId !== conditionId) {
        this.edges.push({
          id: `${thenLastNodeId}-${conditionEndId}`,
          source: thenLastNodeId,
          target: conditionEndId
        });
      }
      
      if (elseLastNodeId !== conditionId) {
        this.edges.push({
          id: `${elseLastNodeId}-${conditionEndId}`,
          source: elseLastNodeId,
          target: conditionEndId
        });
      }
      
      // 分岐がない場合は直接接続
      if (thenLastNodeId === conditionId && elseLastNodeId === conditionId) {
        this.edges.push({
          id: `${conditionId}-${conditionEndId}`,
          source: conditionId,
          target: conditionEndId
        });
      }
      
      return { lastNodeId: conditionEndId };
    }
    
    // assertステップ
    if ('assert' in step) {
      const nodeId = this.generateNodeId();
      this.nodes.push({
        id: nodeId,
        type: 'assert',
        position: { x: 0, y: this.nodeIdCounter * 100 },
        data: step.assert
      });
      this.edges.push({
        id: `${previousNodeId}-${nodeId}`,
        source: previousNodeId,
        target: nodeId
      });
      return { lastNodeId: nodeId };
    }
    
    // codeステップ
    if ('code' in step) {
      const nodeId = this.generateNodeId();
      this.nodes.push({
        id: nodeId,
        type: 'customCode',
        position: { x: 0, y: this.nodeIdCounter * 100 },
        data: { code: step.code }
      });
      this.edges.push({
        id: `${previousNodeId}-${nodeId}`,
        source: previousNodeId,
        target: nodeId
      });
      return { lastNodeId: nodeId };
    }
    
    // 未知のステップタイプ
    throw new Error(`Unknown step type: ${JSON.stringify(step)}`);
  }
  
  private generateNodeId(): string {
    this.nodeIdCounter++;
    return `node-${this.nodeIdCounter}`;
  }
}