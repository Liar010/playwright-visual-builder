# コードスタイルと規約

## TypeScript規約
- TypeScript 5.3.3を使用
- strict modeで開発
- 型定義は`shared/src/types.ts`に集約
- インターフェース名は大文字始まり（例: TestFlow, NodeData）

## 命名規則
- **変数・関数**: camelCase（例: `getUserData`, `testConfig`）
- **型・インターフェース**: PascalCase（例: `TestFlow`, `NodeType`）
- **ファイル名**: 
  - コンポーネント: PascalCase（例: `FlowEditor.tsx`）
  - その他: camelCase（例: `testRunner.ts`）
- **定数**: UPPER_SNAKE_CASE（例: `DEFAULT_TIMEOUT`）

## ディレクトリ構造
- 機能別に整理（components/, services/, routes/, nodes/, utils/）
- 共有型定義は`shared/`ワークスペースに配置
- テストフローは`flows/`に保存（gitignore済み）

## コメント
- 日本語コメント可（UIが日本語のため）
- JSDocコメントを関数に追加
- 複雑なロジックには説明コメントを追加

## import規約
- 絶対パスより相対パス優先
- 共有型は`@playwright-visual-builder/shared`から
- React関連は最上部にグループ化

## Gitコミット規約
- Conventional Commits形式
- `feat:` 新機能
- `fix:` バグ修正
- `docs:` ドキュメント
- `style:` フォーマット
- `refactor:` リファクタリング
- `test:` テスト
- `chore:` ビルドタスクなど

## 注意事項
- ESLint/Prettierの設定は現在なし（今後追加予定）
- テストファイルは現在なし（今後追加予定）