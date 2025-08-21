#!/bin/bash

# PM2 初期セットアップスクリプト

set -e

echo "🔧 PM2 Initial Setup"
echo "===================="

# PM2がインストールされているか確認
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2 globally..."
    npm install -g pm2
else
    echo "✅ PM2 is already installed"
fi

# PM2のバージョン確認
echo "📌 PM2 version: $(pm2 --version)"

# OS起動時の自動起動設定
echo ""
echo "🚀 Setting up PM2 startup script..."
echo "You may need to enter your sudo password:"
pm2 startup systemd -u $USER --hp $HOME

echo ""
echo "✅ PM2 setup completed!"
echo ""
echo "📝 Next steps:"
echo "1. Run './scripts/pm2-start.sh' to start the application"
echo "2. After starting, run 'pm2 save' to save the process list"
echo "3. The application will now auto-start on system boot"