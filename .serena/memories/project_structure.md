# プロジェクト構造

```
playwright-visual-builder/
├── client/                 # Reactフロントエンド
│   ├── src/
│   │   ├── components/    # UIコンポーネント
│   │   │   ├── FlowEditor.tsx
│   │   │   ├── NodePanel.tsx
│   │   │   ├── VariablePanel.tsx
│   │   │   └── ...
│   │   ├── nodes/         # カスタムノード定義
│   │   │   ├── ActionNode.tsx
│   │   │   ├── ConditionNode.tsx
│   │   │   └── ...
│   │   ├── services/      # APIクライアント
│   │   ├── utils/         # ユーティリティ関数
│   │   ├── config/        # 設定ファイル
│   │   ├── App.tsx        # メインアプリ
│   │   └── main.tsx       # エントリーポイント
│   ├── dist/              # ビルド出力
│   └── package.json
│
├── server/                 # Expressバックエンド
│   ├── src/
│   │   ├── routes/        # APIエンドポイント
│   │   │   ├── test.ts
│   │   │   ├── flow.ts
│   │   │   └── selector.ts
│   │   ├── services/      # ビジネスロジック
│   │   │   ├── testRunner.ts
│   │   │   ├── selectorService.ts
│   │   │   └── ...
│   │   └── index.ts       # サーバーエントリー
│   ├── dist/              # ビルド出力
│   └── package.json
│
├── shared/                 # 共有型定義
│   ├── src/
│   │   └── types.ts       # TypeScript型定義
│   └── package.json
│
├── flows/                  # テストフロー保存（gitignore）
├── templates/              # テンプレート
├── downloads/              # ダウンロード保存
├── scripts/                # 管理スクリプト
│   ├── pm2-setup.sh
│   ├── pm2-start.sh
│   ├── pm2-reload.sh
│   ├── pm2-stop.sh
│   └── migrate-selectors.js
│
├── docs/                   # ドキュメント
├── .serena/                # Serena設定
├── .claude/                # Claude設定
├── package.json            # ルートパッケージ（workspaces設定）
├── ecosystem.config.js     # PM2設定
├── README.md
├── CONTRIBUTING.md
├── LICENSE
└── .gitignore
```

## 重要なファイル
- `shared/src/types.ts`: 全体で使用する型定義
- `client/src/App.tsx`: フロントエンドのメインコンポーネント
- `server/src/services/testRunner.ts`: Playwrightテスト実行ロジック
- `server/src/routes/test.ts`: テスト実行APIエンドポイント

## Git管理対象外
- flows/ - ユーザーのテストフロー（認証情報を含む可能性）
- .env - 環境変数
- dist/, build/ - ビルド成果物
- node_modules/ - 依存関係
- *.log - ログファイル