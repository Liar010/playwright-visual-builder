# Playwright Visual Builder (PVB) プロジェクト概要

## プロジェクトの目的
PlaywrightによるE2Eテストを視覚的に構築できるGUIツール。ドラッグ&ドロップでテストフローを作成し、Webアプリケーションのテストを簡単に作成・実行できる。

## 主な機能
- React Flowベースのビジュアルフローエディタ
- 豊富なノードタイプ（ナビゲーション、クリック、入力、アサーション、条件分岐、ループなど）
- JSON/YAML形式でのファイルベースストレージ
- リアルタイムデバッグビュー
- 日本語対応UI
- テンプレート機能
- エラーハンドリングと自動リトライ
- LAN内アクセス対応

## アーキテクチャ
モノレポ構成（npm workspaces使用）:
- `client/`: React + TypeScript フロントエンド (Vite使用)
- `server/`: Express + TypeScript バックエンド
- `shared/`: 共有型定義

## 主要ディレクトリ
- `flows/`: テストフローファイル保存場所（gitignore済み）
- `templates/`: テンプレート保存場所
- `downloads/`: ダウンロードファイル保存場所
- `scripts/`: PM2管理用スクリプト
- `docs/`: ドキュメント

## 環境
- Node.js 18.0.0以上
- npm 9.0.0以上
- TypeScript 5.3.3
- React 18.2.0
- Playwright 1.42.0