// 環境に応じたバックエンドURLの設定
export const getBackendUrl = () => {
  // 本番環境や外部アクセス時は、現在のホストを使用
  if (import.meta.env.PROD) {
    return `${window.location.protocol}//${window.location.hostname}:3001`;
  }
  
  // 開発環境でLAN内の別PCからアクセスする場合
  // viteのプロキシが効かないので、直接バックエンドのURLを指定
  const hostname = window.location.hostname;
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    return `${window.location.protocol}//${hostname}:3001`;
  }
  
  // ローカル開発時はプロキシを使用
  return '';
};

export const API_BASE_URL = getBackendUrl() + '/api';
export const SOCKET_URL = getBackendUrl();