# UPDATES

## 2026-04-01 Phase 1 実装

### やったこと
- Express サーバー構築（`server/index.js`）
- 音声ファイルアップロード・配信・削除 API（`server/routes/audio.js`、multer使用）
- ボタン設定 CRUD API（`server/routes/buttons.js`、JSON永続化）
- iPad操作用メイン画面（`frontend/index.html` + `app.js`）
  - 4×4グリッド、2btnモード（タップ再生/停止）、1btnモード（長押し）実装済み
- 設定画面（`frontend/settings.html` + `settings.js`）
  - 曲アサイン・ラベル・再生モード・フェードイン/アウト設定UI
- Web Audio API ラッパー（`frontend/js/audio.js`）
  - フェードイン/アウト対応、iPad Safari AudioContext unlock対応
- FastClick 導入済み（CDN経由）
- `install.bat`（npm install）、`start.bat`（サーバー起動）
- `.gitignore`（node_modules / 音声ファイル / buttons.json を除外）

## 2026-04-02 1btnバグ修正 & AllKill実装

### やったこと
- 1btnモードの多重再生バグを修正（`Symbol`による非同期ロードの競合防止）
- All Killボタン（緊急停止）を実装
  - 既存のフェード設定を活かしつつ、最大1秒に制限して停止
  - ヘッダーを `fixed` 化し、スクロール中も常にアクセス可能に
  - 停止時にフロントエンドの全ボタンUI状態をリセット
- `README.md` の進捗状況更新

### 次にやること
- ボタン数・グリッドサイズのカスタマイズ機能
- 同時再生の排他・多重制御設定（現在は多重再生可能）
- 設定のエクスポート・インポート
