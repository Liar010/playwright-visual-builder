# 技術スタック

## フロントエンド (client/)
- **フレームワーク**: React 18.2.0 + TypeScript
- **ビルドツール**: Vite 5.1.0
- **UIライブラリ**: Ant Design 5.14.0
- **フローエディタ**: React Flow 11.10.4
- **コードエディタ**: Monaco Editor 4.6.0
- **通信**: Axios 1.6.7, Socket.io-client 4.7.4
- **その他**: file-saver, jszip, yaml

## バックエンド (server/)
- **フレームワーク**: Express 4.19.2 + TypeScript
- **E2Eテスト**: Playwright 1.42.0, @playwright/test 1.54.2
- **リアルタイム通信**: Socket.io 4.7.4
- **CORS**: cors 2.8.5
- **開発ツール**: tsc-watch, tsx

## 共通 (shared/)
- TypeScript型定義を共有
- インターフェース定義（TestFlow, TestNode, TestConfig等）

## 開発ツール
- **パッケージ管理**: npm workspaces
- **並行実行**: concurrently 8.2.2
- **プロセス管理**: PM2（scripts/内にセットアップスクリプト有り）
- **その他**: dotenv, multer, uuid, js-yaml