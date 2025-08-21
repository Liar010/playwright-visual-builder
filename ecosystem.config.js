module.exports = {
  apps: [
    {
      name: 'pvb-server',
      script: 'npm',
      args: 'run start:server',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        SERVER_PORT: process.env.SERVER_PORT || 3002,
        SERVER_HOST: process.env.SERVER_HOST || '0.0.0.0'
      },
      error_file: './logs/pvb-server-error.log',
      out_file: './logs/pvb-server-out.log',
      log_file: './logs/pvb-server-combined.log',
      time: true,
      // 再起動戦略
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      // クラッシュ時の自動再起動
      exp_backoff_restart_delay: 100
    },
    {
      name: 'pvb-client',
      script: 'npm',
      args: 'run preview',
      cwd: __dirname + '/client',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        CLIENT_PORT: process.env.CLIENT_PORT || 5173,
        CLIENT_HOST: process.env.CLIENT_HOST || '0.0.0.0',
        VITE_API_URL: process.env.VITE_API_URL || 'http://localhost:3002'
      },
      error_file: '../logs/pvb-client-error.log',
      out_file: '../logs/pvb-client-out.log',
      log_file: '../logs/pvb-client-combined.log',
      time: true,
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      exp_backoff_restart_delay: 100
    }
  ],

  // デプロイ設定（将来的な拡張用）
  deploy: {
    production: {
      user: 'deploy',
      host: 'localhost',
      ref: 'origin/main',
      repo: 'git@github.com:username/pvb.git',
      path: '/var/www/pvb',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production'
    }
  }
};