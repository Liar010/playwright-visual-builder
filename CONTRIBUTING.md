# Contributing to Playwright Visual Builder

プロジェクトへの貢献ありがとうございます！

## 開発環境のセットアップ

1. リポジトリをフォーク
2. ローカルにクローン
```bash
git clone https://github.com/Liar010/playwright-visual-builder.git
cd playwright-visual-builder
```

3. 依存関係をインストール
```bash
npm install
```

4. 開発サーバーを起動
```bash
npm run dev
```

## 開発ワークフロー

### ブランチ戦略

- `main` - 安定版
- `develop` - 開発版
- `feature/*` - 新機能
- `fix/*` - バグ修正
- `docs/*` - ドキュメント

### コミットメッセージ

以下の形式を使用してください：

```
<type>: <subject>

<body>

<footer>
```

Type:
- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント
- `style`: フォーマット
- `refactor`: リファクタリング
- `test`: テスト
- `chore`: ビルドタスクなど

### コード規約

- TypeScriptを使用
- ESLint/Prettierの設定に従う
- 関数にはJSDocコメントを追加
- 日本語UIの場合は日本語でコメント可

### テスト

```bash
# テストの実行
npm test

# 型チェック
npm run type-check

# リント
npm run lint
```

## プルリクエスト

1. 機能ブランチを作成
```bash
git checkout -b feature/amazing-feature
```

2. 変更をコミット
```bash
git commit -m 'feat: Add amazing feature'
```

3. ブランチをプッシュ
```bash
git push origin feature/amazing-feature
```

4. プルリクエストを作成

### PRチェックリスト

- [ ] コードがビルドできる
- [ ] 型チェックが通る
- [ ] 新機能の場合はドキュメント更新
- [ ] 破壊的変更の場合は明記

## 報告

### バグ報告

以下の情報を含めてください：

- 環境（OS、Node.jsバージョン）
- 再現手順
- 期待される動作
- 実際の動作
- スクリーンショット（可能であれば）

### 機能リクエスト

以下を説明してください：

- 解決したい問題
- 提案する解決策
- 代替案の検討

## 質問

[Discussions](https://github.com/Liar010/playwright-visual-builder/discussions)で質問してください。

## ライセンス

貢献することで、あなたのコードがMITライセンスの下で配布されることに同意したものとみなされます。