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

### 次にやること（Phase 2以降）
- 動作確認・バグ修正
- ボタン数・グリッドサイズのカスタマイズ
- 複数同時再生の可否設定
- 設定のエクスポート・インポート
