// フローIDの管理
const FLOW_ID_KEY = 'pvb_flow_id';
const FLOW_SESSION_KEY = 'pvb_flow_session';

export const flowIdManager = {
  // 現在のフローIDを取得（なければ生成）
  getCurrentFlowId(): string {
    // セッションストレージから取得を優先（タブごとに分離）
    let flowId = sessionStorage.getItem(FLOW_SESSION_KEY);
    
    if (!flowId) {
      // なければlocalStorageから取得（永続化）
      flowId = localStorage.getItem(FLOW_ID_KEY);
      
      if (!flowId) {
        // それでもなければ新規生成
        flowId = this.generateFlowId();
        this.setFlowId(flowId);
      }
    }
    
    return flowId;
  },
  
  // 新しいフローIDを生成
  generateFlowId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `flow_${timestamp}_${random}`;
  },
  
  // フローIDを設定
  setFlowId(flowId: string, persistent: boolean = false): void {
    sessionStorage.setItem(FLOW_SESSION_KEY, flowId);
    
    if (persistent) {
      localStorage.setItem(FLOW_ID_KEY, flowId);
    }
  },
  
  // 新しいフローを開始（新しいIDを生成）
  startNewFlow(): string {
    const newFlowId = this.generateFlowId();
    this.setFlowId(newFlowId);
    return newFlowId;
  },
  
  // フローIDをクリア
  clearFlowId(): void {
    sessionStorage.removeItem(FLOW_SESSION_KEY);
    localStorage.removeItem(FLOW_ID_KEY);
  },
  
  // 特定のフローIDに切り替え
  switchToFlow(flowId: string): void {
    this.setFlowId(flowId);
  }
};