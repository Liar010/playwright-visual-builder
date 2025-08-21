import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';

const API_BASE = API_ENDPOINTS.selectors;

// セレクタデータの基本構造
export interface SelectorData {
  url: string;
  lastUpdated: string;
  selectors: Record<string, string>;
}

// 旧形式（v1）のセレクタ構造
export interface LegacySelectors {
  [label: string]: SelectorData;
}

// 新形式（v2）のセレクタ構造
export interface CategorizedSelectors {
  version: '2.0';
  categories: {
    [category: string]: {
      [label: string]: SelectorData;
    };
  };
}

// 統合型（移行期間中の互換性のため）
export type SavedSelectors = LegacySelectors | CategorizedSelectors;

// 型ガード関数
export const isCategorizedFormat = (data: any): data is CategorizedSelectors => {
  return data?.version === '2.0' && typeof data?.categories === 'object';
};

export const isLegacyFormat = (data: any): data is LegacySelectors => {
  if (!data || typeof data !== 'object') return false;
  if (isCategorizedFormat(data)) return false;
  
  // 旧形式の場合、各プロパティがSelectorData形式であることを確認
  return Object.values(data).every(item => 
    item && typeof item === 'object' && 
    'url' in item && 
    'lastUpdated' in item && 
    'selectors' in item
  );
};

// データ移行ヘルパー
export const migrateToCategorized = (data: SavedSelectors): CategorizedSelectors => {
  if (isCategorizedFormat(data)) {
    return data;
  }
  
  // 旧形式を新形式に変換
  return {
    version: '2.0',
    categories: {
      default: data as LegacySelectors
    }
  };
};

// セレクタデータアクセスヘルパー
export const getSelectorsByCategory = (data: SavedSelectors): Map<string, Map<string, SelectorData>> => {
  const result = new Map<string, Map<string, SelectorData>>();
  
  if (isCategorizedFormat(data)) {
    Object.entries(data.categories).forEach(([category, labels]) => {
      const labelMap = new Map<string, SelectorData>();
      Object.entries(labels).forEach(([label, selectorData]) => {
        labelMap.set(label, selectorData);
      });
      result.set(category, labelMap);
    });
  } else if (isLegacyFormat(data)) {
    // 旧形式はdefaultカテゴリとして扱う
    const labelMap = new Map<string, SelectorData>();
    Object.entries(data).forEach(([label, selectorData]) => {
      labelMap.set(label, selectorData);
    });
    result.set('default', labelMap);
  }
  
  return result;
};

export const selectorService = {
  // 特定フローのセレクタを取得
  async getFlowSelectors(flowId: string): Promise<SavedSelectors> {
    try {
      const response = await axios.get(`${API_BASE}/${flowId}`);
      const data = response.data;
      
      // データ形式を確認して必要に応じて移行
      if (!isCategorizedFormat(data) && !isLegacyFormat(data)) {
        console.warn('Invalid selector data format, returning empty');
        return { version: '2.0', categories: {} };
      }
      
      return data;
    } catch (error) {
      console.error('Failed to fetch selectors:', error);
      return { version: '2.0', categories: {} };
    }
  },

  // すべてのセレクタを取得
  async getAllSelectors(): Promise<Record<string, SavedSelectors>> {
    try {
      const response = await axios.get(API_BASE);
      const allData = response.data;
      
      // 各フローのデータを検証
      const result: Record<string, SavedSelectors> = {};
      Object.entries(allData).forEach(([flowId, data]) => {
        if (isCategorizedFormat(data) || isLegacyFormat(data)) {
          result[flowId] = data as SavedSelectors;
        } else {
          console.warn(`Invalid selector data format for flow ${flowId}`);
          result[flowId] = { version: '2.0', categories: {} };
        }
      });
      
      return result;
    } catch (error) {
      console.error('Failed to fetch all selectors:', error);
      return {};
    }
  },

  // 現在のフローのセレクタを取得（デフォルトはdefault）
  async getCurrentFlowSelectors(): Promise<SavedSelectors> {
    // TODO: 実際のフローIDを取得する方法を実装
    const flowId = 'default';
    return this.getFlowSelectors(flowId);
  },

  // セレクタを更新（自動的に新形式に移行）
  async updateSelectors(flowId: string, selectors: SavedSelectors): Promise<void> {
    try {
      // 常に新形式で保存
      const categorized = migrateToCategorized(selectors);
      await axios.put(`${API_BASE}/${flowId}`, categorized);
    } catch (error) {
      console.error('Failed to update selectors:', error);
      throw error;
    }
  },

  // セレクタを削除
  async deleteSelector(flowId: string, label: string, selectorName?: string): Promise<void> {
    try {
      const url = selectorName 
        ? `${API_BASE}/${flowId}/${label}/${selectorName}`
        : `${API_BASE}/${flowId}/${label}`;
      await axios.delete(url);
    } catch (error) {
      console.error('Failed to delete selector:', error);
      throw error;
    }
  },

  // エクスポート（全セレクタ）
  async exportAll(): Promise<Blob> {
    try {
      const response = await axios.get(`${API_BASE}/export/all`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Failed to export selectors:', error);
      throw error;
    }
  },

  // エクスポート（カテゴリ別）
  async exportCategory(category: string): Promise<Blob> {
    try {
      const response = await axios.get(`${API_BASE}/export/category/${encodeURIComponent(category)}`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Failed to export category selectors:', error);
      throw error;
    }
  },

  // インポート（安全モードのみ）
  async import(data: any): Promise<{ success: boolean; backupTimestamp: string; stats: { added: number; skipped: number } }> {
    try {
      const response = await axios.post(`${API_BASE}/import`, {
        data,
        mode: 'safe'
      });
      return response.data;
    } catch (error) {
      console.error('Failed to import selectors:', error);
      throw error;
    }
  },

  // バックアップ一覧を取得
  async getBackups(): Promise<Array<{ timestamp: string; date: string; displayDate: string }>> {
    try {
      const response = await axios.get(`${API_BASE}/backups`);
      return response.data;
    } catch (error) {
      console.error('Failed to get backups:', error);
      return [];
    }
  },

  // バックアップから復元
  async restoreFromBackup(timestamp: string): Promise<{ success: boolean; restoredFrom: string; newBackupTimestamp: string }> {
    try {
      const response = await axios.post(`${API_BASE}/restore/${timestamp}`);
      return response.data;
    } catch (error) {
      console.error('Failed to restore from backup:', error);
      throw error;
    }
  }
};