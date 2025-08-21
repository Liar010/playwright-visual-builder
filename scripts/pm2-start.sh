#!/bin/bash

# PVB PM2 起動スクリプト

set -e

echo "🚀 PVB Production Deployment Starting..."

# プロジェクトルートへ移動
cd /home/fukumoto/work/e2etest

# 環境変数ファイルを読み込む（存在する場合）
if [ -f .env.production ]; then
    echo "📋 Loading environment variables from .env.production"
    export $(cat .env.production | grep -v '^#' | xargs)
elif [ -f .env ]; then
    echo "📋 Loading environment variables from .env"
    export $(cat .env | grep -v '^#' | xargs)
fi

# logsディレクトリを作成
mkdir -p logs

# 依存関係のインストール（必要な場合のみ）
if [ "$1" == "--install" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# ビルド
echo "🔨 Building application..."
npm run build:prod

# PM2でアプリケーションを起動
echo "🏃 Starting PM2 processes..."
pm2 start ecosystem.config.js

# プロセスを保存（再起動時に自動復元）
pm2 save

# ステータス表示
pm2 status

echo "✅ PVB is now running in production mode!"
echo ""
echo "📊 Useful commands:"
echo "  pm2 status       - Show process status"
echo "  pm2 logs         - Show all logs"
echo "  pm2 logs pvb-server - Show server logs"
echo "  pm2 logs pvb-client - Show client logs"
echo "  pm2 monit        - Monitor in real-time"
echo "  pm2 restart all  - Restart all processes"
echo ""
echo "🌐 Access URLs:"
echo "  Application: http://$(hostname -I | awk '{print $1}'):${CLIENT_PORT:-5173}"
echo "  API Server:  http://$(hostname -I | awk '{print $1}'):${SERVER_PORT:-3002}"
echo ""
echo "📌 Current Port Configuration:"
echo "  SERVER_PORT: ${SERVER_PORT:-3002}"
echo "  CLIENT_PORT: ${CLIENT_PORT:-5173}"