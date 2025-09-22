// API設定の一元管理
export const getApiUrl = () => {
  // 環境変数から取得（VITE_API_URL）
  if (import.meta.env.VITE_API_URL) {
    // 環境変数のlocalhostを実際のホスト名に置換
    const envUrl = import.meta.env.VITE_API_URL as string;
    if (envUrl.includes('localhost') && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return envUrl.replace('localhost', window.location.hostname);
    }
    return envUrl;
  }
  
  // 環境変数がない場合のフォールバック
  if (import.meta.env.PROD) {
    return `http://${window.location.hostname}:53002`;
  }
  // 開発環境の場合
  // localhostまたは127.0.0.1以外からアクセスしている場合は、直接サーバーに接続
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return `http://${window.location.hostname}:3002`;
  }
  // localhost/127.0.0.1からの場合はViteプロキシ経由
  return '';
};

export const API_URL = getApiUrl();
export const API_ENDPOINTS = {
  flows: `${API_URL}/api/flows`,
  selectors: `${API_URL}/api/selectors`,
  templates: `${API_URL}/api/templates`,
  test: `${API_URL}/api/test`,
};