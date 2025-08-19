import { Template } from '../components/TemplateManager';

// デフォルトテンプレートのURL（本番環境では適切なURLに変更）
const DEFAULT_TEMPLATES_URL = '/templates/default-templates.json';

/**
 * デフォルトテンプレートを読み込む
 */
export async function loadDefaultTemplates(): Promise<Template[]> {
  try {
    const response = await fetch(DEFAULT_TEMPLATES_URL);
    if (!response.ok) {
      console.warn('Default templates not found');
      return [];
    }
    
    const templates = await response.json();
    return templates;
  } catch (error) {
    console.error('Failed to load default templates:', error);
    return [];
  }
}

/**
 * LocalStorageのテンプレートを初期化
 * 初回アクセス時のみデフォルトテンプレートを追加
 */
export async function initializeTemplates(): Promise<void> {
  const INITIALIZED_KEY = 'templates_initialized';
  const TEMPLATES_KEY = 'flowTemplates';
  
  // すでに初期化済みかチェック
  const initialized = localStorage.getItem(INITIALIZED_KEY);
  
  if (!initialized) {
    // デフォルトテンプレートを読み込み
    const defaultTemplates = await loadDefaultTemplates();
    
    if (defaultTemplates.length > 0) {
      // 既存のテンプレートを取得
      const existingTemplates = JSON.parse(localStorage.getItem(TEMPLATES_KEY) || '[]');
      
      // デフォルトテンプレートを追加（重複を避ける）
      const existingIds = new Set(existingTemplates.map((t: Template) => t.id));
      const newTemplates = defaultTemplates.filter(t => !existingIds.has(t.id));
      
      // マージして保存
      const mergedTemplates = [...existingTemplates, ...newTemplates];
      localStorage.setItem(TEMPLATES_KEY, JSON.stringify(mergedTemplates));
      
      // 初期化フラグを設定
      localStorage.setItem(INITIALIZED_KEY, 'true');
      
      console.log(`Loaded ${newTemplates.length} default templates`);
    }
  }
}

/**
 * デフォルトテンプレートを強制的に再読み込み
 */
export async function reloadDefaultTemplates(): Promise<number> {
  const TEMPLATES_KEY = 'flowTemplates';
  
  // デフォルトテンプレートを読み込み
  const defaultTemplates = await loadDefaultTemplates();
  
  if (defaultTemplates.length > 0) {
    // 既存のテンプレートを取得
    const existingTemplates = JSON.parse(localStorage.getItem(TEMPLATES_KEY) || '[]');
    
    // デフォルトテンプレートのIDセット
    const defaultIds = new Set(defaultTemplates.map(t => t.id));
    
    // 既存のカスタムテンプレート（デフォルト以外）を保持
    const customTemplates = existingTemplates.filter((t: Template) => !defaultIds.has(t.id));
    
    // デフォルトテンプレートとカスタムテンプレートをマージ
    const mergedTemplates = [...defaultTemplates, ...customTemplates];
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(mergedTemplates));
    
    return defaultTemplates.length;
  }
  
  return 0;
}