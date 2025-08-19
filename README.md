# Playwright Visual Builder (PVB)

![PVB Logo](https://img.shields.io/badge/PVB-Playwright%20Visual%20Builder-blue)
![Version](https://img.shields.io/badge/version-1.0.0-green)
![License](https://img.shields.io/badge/license-MIT-yellow)

PlaywrightによるE2Eテストを視覚的に構築できるGUIツールです。ドラッグ&ドロップでテストフローを作成し、ネットワーク機器のWebインターフェースなど、様々なWebアプリケーションのテストを簡単に作成・実行できます。

ClaudeCode君が書き忘れてるので追記。
これらはすべてClaudeCodeで作られてます。幾ばくかの問題がある可能性がありますので、使用する際はご自身で責任を取ってください。


## 🌟 主な機能

- 📐 **ビジュアルフローエディタ** - React Flowベースの直感的なノードエディタ
- 🔄 **豊富なノードタイプ** - ナビゲーション、クリック、入力、アサーション、条件分岐、ループなど
- 💾 **ファイルベースストレージ** - JSON/YAML形式でGit管理可能
- 🔍 **デバッグビュー** - リアルタイムでテスト実行を可視化
- 🌐 **日本語対応** - 完全日本語UI
- 🔁 **テンプレート機能** - 再利用可能なフローパーツを保存
- 🛡️ **エラーハンドリング** - 自動リトライと詳細なエラー情報
- 📱 **レスポンシブ対応** - LAN内の別端末からもアクセス可能

## 📋 前提条件

- Node.js 18.0.0以上
- npm 9.0.0以上
- Chrome/Chromium（Playwrightが自動インストール）

## 🚀 クイックスタート

### 1. リポジトリのクローン

```bash
git clone https://github.com/Liar010/playwright-visual-builder.git
cd playwright-visual-builder
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 開発サーバーの起動

```bash
npm run dev
```

以下のURLでアクセス可能になります：
- フロントエンド: http://localhost:5173
- バックエンド: http://localhost:3002

### 4. プロダクションビルド

```bash
npm run build
npm start
```

## 🖥️ LAN内アクセス設定

別のPCからアクセスする場合：

1. サーバー側のIPアドレスを確認
```bash
# Linux/Mac
ip addr show
# または
ifconfig

# Windows
ipconfig
```

2. クライアント側から `http://<サーバーIP>:5173` にアクセス

## 📚 使い方

### 基本的なワークフロー

1. **ノードの追加**
   - 左サイドバーからノードをクリックして追加
   - ダブルクリックでノードの詳細を編集

2. **フローの接続**
   - ノードの下部の点から別ノードの上部にドラッグして接続
   - 条件分岐は「True」「False」の出力を持つ
   - ループは「ループ内」「次へ」の出力を持つ

3. **テスト設定**
   - ヘッダーの⚙️ボタンから設定
   - ベースURL、ヘッドレスモード、認証情報などを設定

4. **テスト実行**
   - ヘッダーの「実行」ボタンでテスト開始
   - デバッグビューで実行状況をリアルタイム確認

5. **フローの保存/読み込み**
   - 💾ボタンでフローを保存
   - 📁ボタンで保存したフローを読み込み

### ノードタイプ一覧

#### ナビゲーション
- `navigate` - URLへ移動
- `reload` - ページ再読み込み
- `goBack` - 戻る
- `goForward` - 進む

#### マウス操作
- `click` - クリック
- `doubleClick` - ダブルクリック
- `rightClick` - 右クリック
- `hover` - ホバー

#### 入力操作
- `fill` - テキスト入力
- `select` - ドロップダウン選択
- `check` - チェックボックス
- `focus` - フォーカス
- `blur` - フォーカス解除

#### 待機
- `wait` - 指定時間待機
- `waitForHidden` - 要素が非表示になるまで待機
- `waitForURL` - URL変更を待機

#### アサーション
- `assertion` - 要素の状態を検証
- `isVisible` - 表示確認
- `isEnabled` - 有効確認
- `isChecked` - チェック確認

#### データ取得と変数
- `getText` - テキスト取得して変数に保存
- `getAttribute` - 属性値を取得して変数に保存

#### 制御フロー
- `condition` - 条件分岐（TRUE/FALSEパスで分岐）
- `conditionEnd` - 条件分岐の終了マーカー
- `loop` - ループ処理

## ⚠️ セキュリティに関する注意

- **認証情報は平文で保存されます**
- 本番環境での使用は推奨されません
- フローファイル（.json/.yaml）をGitにコミットする際は認証情報を含まないよう注意してください
- `.gitignore`に`flows/`ディレクトリが追加済みです

## 🔧 設定

### 環境変数

`.env`ファイルを作成して設定をカスタマイズできます：

```env
# サーバー設定
PORT=3002
HOST=0.0.0.0

# デバッグ
DEBUG=true
```

### テスト設定

テスト実行時に以下の設定が可能：

- **ベースURL**: すべての相対URLの基準
- **ヘッドレスモード**: ブラウザ表示の有無
- **ビューポートサイズ**: 画面サイズ
- **タイムアウト**: 操作の最大待機時間
- **ノード間遅延**: 各ノード実行後の自動待機時間
- **認証**: Basic認証対応

## 🏗️ アーキテクチャ

```
playwright-visual-builder/
├── client/          # React + TypeScript フロントエンド
│   ├── src/
│   │   ├── components/   # UIコンポーネント
│   │   ├── nodes/        # カスタムノード定義
│   │   └── App.tsx       # メインアプリケーション
│   └── package.json
├── server/          # Express + TypeScript バックエンド
│   ├── src/
│   │   ├── routes/       # APIエンドポイント
│   │   └── services/     # ビジネスロジック
│   └── package.json
├── shared/          # 共有型定義
│   └── src/
│       └── types.ts      # TypeScript型定義
└── package.json     # モノレポ設定
```

## 🤝 コントリビューション

プルリクエストを歓迎します！

1. このリポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/AmazingFeature`)
3. 変更をコミット (`git commit -m 'Add some AmazingFeature'`)
4. ブランチにプッシュ (`git push origin feature/AmazingFeature`)
5. プルリクエストを作成

## 📝 ライセンス

MIT License - 詳細は[LICENSE](LICENSE)ファイルを参照してください。

## 💡 高度な機能

### 変数システムと条件分岐

1. **変数の使用**
   - 変数パネルで任意の変数を定義
   - `getText`ノードで取得したテキストを変数に保存
   - `getAttribute`ノードで属性値を変数に保存

2. **条件分岐の設定**
   - 条件ノードから2つの出力（TRUE/FALSE）を接続
   - カスタム条件で変数を参照：`${変数名} === '比較値'`
   - セレクタ条件やURL条件も利用可能

3. **実行フロー**
   - 条件がTRUEの場合：TRUEパスのノードのみ実行
   - 条件がFALSEの場合：FALSEパスのノードのみ実行
   - `conditionEnd`ノードで分岐を合流

## 🐛 既知の問題

- ループのフロー制御は基本実装のみ
- 一部の高度なPlaywright機能は未対応

## 🚧 今後の予定

- [x] 変数システムの実装
- [x] 条件分岐の完全サポート
- [ ] ループ処理の完全実装
- [ ] CI/CD統合
- [ ] テストレポート生成
- [ ] プラグインシステム
- [ ] クラウドストレージ対応

## 💬 サポート

問題が発生した場合は、[Issues](https://github.com/Liar010/playwright-visual-builder/issues)に報告してください。
