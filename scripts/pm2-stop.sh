#!/bin/bash

# PVB PM2 停止スクリプト

echo "🛑 Stopping PVB..."

# PM2プロセスを停止
pm2 stop pvb-server pvb-client

# 完全に削除する場合は --delete オプションを使用
if [ "$1" == "--delete" ]; then
    echo "🗑️  Deleting PM2 processes..."
    pm2 delete pvb-server pvb-client
fi

echo "✅ PVB has been stopped"
pm2 status