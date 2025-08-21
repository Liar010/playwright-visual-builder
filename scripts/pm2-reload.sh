#!/bin/bash

# PVB PM2 リロードスクリプト（ゼロダウンタイム）

set -e

echo "🔄 Reloading PVB with zero downtime..."

cd /home/fukumoto/work/e2etest

# ビルド
echo "🔨 Building application..."
npm run build:prod

# PM2でリロード（ゼロダウンタイム）
echo "♻️  Reloading PM2 processes..."
pm2 reload ecosystem.config.js

echo "✅ PVB has been reloaded successfully!"
pm2 status