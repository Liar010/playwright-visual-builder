# 推奨コマンド一覧

## 開発コマンド
```bash
# 開発サーバー起動（フロントエンド + バックエンド同時起動）
npm run dev

# 個別起動
npm run dev:server  # バックエンドのみ
npm run dev:client  # フロントエンドのみ
```

## ビルドコマンド
```bash
# 全体ビルド（shared → server → client の順）
npm run build

# プロダクションビルド
npm run build:prod
```

## 実行コマンド
```bash
# プロダクション実行
npm start

# プレビュー（クライアントのみ）
npm run preview
```

## PM2管理（scripts/内のスクリプト使用）
```bash
# PM2セットアップ
./scripts/pm2-setup.sh

# PM2で起動
./scripts/pm2-start.sh

# PM2でリロード
./scripts/pm2-reload.sh

# PM2で停止
./scripts/pm2-stop.sh
```

## システムコマンド（Linux環境）
```bash
# ファイル検索
find . -name "*.ts" -type f

# プロセス確認
ps aux | grep node
lsof -i :3002  # バックエンドポート確認
lsof -i :5173  # フロントエンドポート確認

# ログ確認
tail -f logs/*.log

# Git操作
git status
git branch
git diff
git log --oneline -10
```

## 依存関係管理
```bash
# インストール
npm install

# ワークスペース個別インストール
npm install -w client
npm install -w server
npm install -w shared

# パッケージ追加例
npm install express -w server
npm install react-flow -w client
```

## アクセスURL
- フロントエンド開発: http://localhost:5173
- バックエンドAPI: http://localhost:3002
- LAN内アクセス: http://<サーバーIP>:5173